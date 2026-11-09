import { create } from "zustand";
import { loadApartment, loadCatalog, loadSampleLayout } from "../data/load";
import { getModel } from "../data/model";
import { draft } from "../systems/edit/draft";
import { catalogMap, clampAxis, itemColor, nudgeItem, unitScale } from "../systems/edit/placement";
import { input, toggleView } from "../systems/movement/input";
import type { StartMode } from "../types/apartment";
import type { CatalogFile } from "../types/catalog";
import type { PlacedItem } from "../types/layout";

const STORAGE_KEY = "glory-heights-layout-v5";
const HISTORY_LIMIT = 40;

const apartment = loadApartment();
const catalog = loadCatalog();
const sample = loadSampleLayout();

export const catalogFile: CatalogFile = catalog;
export const catalogById = catalogMap(catalog.items);

export interface ArmedItem {
  itemId: string;
  variantId?: string;
  rotY: number;
}

interface LayoutSnapshot {
  items: PlacedItem[];
  startMode: StartMode;
}

interface LayoutState {
  apartmentName: string;
  startMode: StartMode;
  items: PlacedItem[];
  past: LayoutSnapshot[];
  future: LayoutSnapshot[];
  editing: boolean;
  selectedUid: string | null;
  armed: ArmedItem | null;
  snap: boolean;
  toggleEditing: () => void;
  arm: (itemId: string, variantId?: string) => void;
  clearArmed: () => void;
  rotateArmed: (degrees: number) => void;
  select: (uid: string | null) => void;
  place: (item: PlacedItem) => void;
  commitMove: (uid: string, next: PlacedItem) => void;
  rotateSelected: (degrees: number) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  resizeSelected: (axis: 0 | 1 | 2 | "all", factor: number) => void;
  resetSelectedScale: () => void;
  toggleLock: () => void;
  toggleSnap: () => void;
  undo: () => void;
  redo: () => void;
  loadSample: () => void;
  loadEmpty: () => void;
  importItems: (items: PlacedItem[]) => void;
}

function cloneItems(items: PlacedItem[]): PlacedItem[] {
  return items.map((item) => ({
    ...item,
    position: [item.position[0], item.position[1]] as [number, number],
    scale: item.scale ? ([item.scale[0], item.scale[1], item.scale[2]] as [number, number, number]) : undefined,
  }));
}

function readScale(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    return undefined;
  }
  const scale: [number, number, number] = [
    clampAxis(1, value[0], false),
    clampAxis(1, value[1], false),
    clampAxis(1, value[2], false),
  ];
  if (scale[0] === 1 && scale[1] === 1 && scale[2] === 1) return undefined;
  return scale;
}

function knownIds(): Set<string> {
  return new Set(catalog.items.map((item) => item.id));
}

export function sanitizeItems(value: unknown): PlacedItem[] {
  if (!Array.isArray(value)) return [];
  const known = knownIds();
  const items: PlacedItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.uid !== "string" || typeof row.itemId !== "string" || !known.has(row.itemId)) continue;
    if (!Array.isArray(row.position) || row.position.length < 2) continue;
    const x = row.position[0];
    const z = row.position[1];
    if (typeof x !== "number" || typeof z !== "number" || typeof row.rotY !== "number") continue;
    const item: PlacedItem = { uid: row.uid, itemId: row.itemId, position: [x, z], rotY: row.rotY };
    const scale = readScale(row.scale);
    if (scale) item.scale = scale;
    if (typeof row.variantId === "string") item.variantId = row.variantId;
    if (typeof row.stackedOn === "string") item.stackedOn = row.stackedOn;
    if (typeof row.placeOn === "string") item.placeOn = row.placeOn;
    if (row.locked === true) item.locked = true;
    items.push(item);
  }
  return items;
}

function withSample(items: PlacedItem[]): PlacedItem[] {
  const { model } = getModel();
  if (!model) return cloneItems(items);
  const placed: PlacedItem[] = [];
  for (const item of items) {
    placed.push(nudgeItem({ ...item, position: [item.position[0], item.position[1]] }, placed, catalogById, model));
  }
  return placed;
}

function readStored(): { startMode: StartMode; items: PlacedItem[] } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { startMode?: unknown; items?: unknown };
    const startMode: StartMode = data.startMode === "empty" ? "empty" : "furnished_sample";
    return { startMode, items: sanitizeItems(data.items) };
  } catch {
    return null;
  }
}

function initialLayout(): { startMode: StartMode; items: PlacedItem[] } {
  const stored = readStored();
  if (stored) return stored;
  if (apartment.startMode === "furnished_sample") return { startMode: "furnished_sample", items: withSample(sample.items) };
  return { startMode: "empty", items: [] };
}

const initial = initialLayout();

function snapshotOf(state: LayoutState): LayoutSnapshot {
  return { items: cloneItems(state.items), startMode: state.startMode };
}

function remember(state: LayoutState): Pick<LayoutState, "past" | "future"> {
  const past = [...state.past, snapshotOf(state)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, future: [] };
}

let uidSeq = 1;

export function nextUid(prefix: string): string {
  uidSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidSeq}`;
}

export function variantColor(itemId: string, variantId?: string): string {
  const def = catalogById.get(itemId);
  return def ? itemColor(def, variantId) : "#c8c2b8";
}

export const useLayoutStore = create<LayoutState>((set) => ({
  apartmentName: apartment.meta.name,
  startMode: initial.startMode,
  items: initial.items,
  past: [],
  future: [],
  editing: false,
  selectedUid: null,
  armed: null,
  snap: true,
  toggleEditing: () =>
    set((state) => {
      const editing = !state.editing;
      input.editing = editing;
      draft.active = false;
      if (editing && input.view === "first") toggleView();
      return { editing, armed: null, selectedUid: editing ? state.selectedUid : null };
    }),
  arm: (itemId, variantId) =>
    set(() => {
      const def = catalogById.get(itemId);
      const variant = variantId ?? def?.variants?.[0]?.id;
      return { armed: { itemId, variantId: variant, rotY: 0 }, selectedUid: null };
    }),
  clearArmed: () => set({ armed: null }),
  rotateArmed: (degrees) =>
    set((state) => (state.armed ? { armed: { ...state.armed, rotY: state.armed.rotY + degrees } } : state)),
  select: (uid) => set({ selectedUid: uid, armed: null }),
  place: (item) =>
    set((state) => ({
      ...remember(state),
      items: [...state.items, item],
      selectedUid: item.uid,
      startMode: "furnished_sample",
    })),
  commitMove: (uid, next) =>
    set((state) => {
      const current = state.items.find((item) => item.uid === uid);
      if (!current || current.locked) return state;
      const same =
        current.position[0] === next.position[0] &&
        current.position[1] === next.position[1] &&
        current.rotY === next.rotY &&
        current.placeOn === next.placeOn &&
        current.stackedOn === next.stackedOn;
      if (same) return state;
      return {
        ...remember(state),
        items: state.items.map((item) => (item.uid === uid ? next : item)),
      };
    }),
  rotateSelected: (degrees) =>
    set((state) => {
      const current = state.items.find((item) => item.uid === state.selectedUid);
      if (!current || current.locked) return state;
      return {
        ...remember(state),
        items: state.items.map((item) => (item.uid === current.uid ? { ...item, rotY: item.rotY + degrees } : item)),
      };
    }),
  removeSelected: () =>
    set((state) => {
      const current = state.items.find((item) => item.uid === state.selectedUid);
      if (!current || current.locked) return state;
      return {
        ...remember(state),
        items: state.items.filter((item) => item.uid !== current.uid),
        selectedUid: null,
      };
    }),
  resizeSelected: (axis, factor) =>
    set((state) => {
      const current = state.items.find((item) => item.uid === state.selectedUid);
      const def = current ? catalogById.get(current.itemId) : undefined;
      if (!current || !def || current.locked) return state;
      const prev = unitScale(current.scale);
      const next = prev.map((value, index) => {
        if (axis !== "all" && index !== axis) return value;
        return clampAxis(def.size[index], value * factor, index === 2);
      }) as [number, number, number];
      if (next[0] === prev[0] && next[1] === prev[1] && next[2] === prev[2]) return state;
      const scale = next[0] === 1 && next[1] === 1 && next[2] === 1 ? undefined : next;
      return {
        ...remember(state),
        items: state.items.map((item) => (item.uid === current.uid ? { ...item, scale } : item)),
      };
    }),
  resetSelectedScale: () =>
    set((state) => {
      const current = state.items.find((item) => item.uid === state.selectedUid);
      if (!current || current.locked || !current.scale) return state;
      return {
        ...remember(state),
        items: state.items.map((item) => (item.uid === current.uid ? { ...item, scale: undefined } : item)),
      };
    }),
  duplicateSelected: () =>
    set((state) => {
      const current = state.items.find((item) => item.uid === state.selectedUid);
      if (!current) return state;
      const copy: PlacedItem = {
        ...current,
        uid: nextUid(current.itemId),
        position: [current.position[0] + 0.3, current.position[1] + 0.3],
        locked: false,
      };
      return { ...remember(state), items: [...state.items, copy], selectedUid: copy.uid };
    }),
  toggleLock: () =>
    set((state) => {
      const current = state.items.find((item) => item.uid === state.selectedUid);
      if (!current) return state;
      return {
        ...remember(state),
        items: state.items.map((item) => (item.uid === current.uid ? { ...item, locked: !item.locked } : item)),
      };
    }),
  toggleSnap: () => set((state) => ({ snap: !state.snap })),
  undo: () =>
    set((state) => {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        past: state.past.slice(0, -1),
        future: [...state.future, snapshotOf(state)],
        items: cloneItems(previous.items),
        startMode: previous.startMode,
        selectedUid: null,
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[state.future.length - 1];
      if (!next) return state;
      return {
        future: state.future.slice(0, -1),
        past: [...state.past, snapshotOf(state)],
        items: cloneItems(next.items),
        startMode: next.startMode,
        selectedUid: null,
      };
    }),
  loadSample: () =>
    set((state) => ({
      ...remember(state),
      items: withSample(sample.items),
      startMode: "furnished_sample",
      selectedUid: null,
      armed: null,
    })),
  loadEmpty: () =>
    set((state) => ({
      ...remember(state),
      items: [],
      startMode: "empty",
      selectedUid: null,
      armed: null,
    })),
  importItems: (items) =>
    set((state) => ({
      ...remember(state),
      items: sanitizeItems(items),
      startMode: "furnished_sample",
      selectedUid: null,
      armed: null,
    })),
}));

useLayoutStore.subscribe((state, previous) => {
  if (state.items === previous.items && state.startMode === previous.startMode) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ startMode: state.startMode, items: state.items }));
});
