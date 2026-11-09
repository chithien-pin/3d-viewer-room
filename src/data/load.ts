import type {
  ApartmentFile,
  BuiltIn,
  ClosedRoom,
  DoorDef,
  Facing,
  OpenZone,
  StartMode,
  WallSide,
  WindowDef,
} from "../types/apartment";
import type { CatalogFile, CatalogItem } from "../types/catalog";
import type { LayoutFile, PlacedItem } from "../types/layout";
import apartmentRaw from "./apartment.json";
import catalogRaw from "./catalog.json";
import sampleLayoutRaw from "./sample-layout.json";

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function asRect(value: unknown, label: string): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isNum)) {
    fail(`${label} phải là [x, z, rộng, sâu].`);
  }
  const [x, z, w, d] = value;
  if (w <= 0 || d <= 0) fail(`${label} có kích thước không hợp lệ.`);
  return [x, z, w, d];
}

function asWall(value: unknown, label: string): WallSide {
  if (value === "north" || value === "south" || value === "east" || value === "west") return value;
  fail(`${label} phải là north | south | east | west.`);
}

function asFacing(value: unknown): Facing {
  if (value === "north" || value === "south" || value === "east" || value === "west") return value;
  fail("spawn.facing phải là north | south | east | west.");
}

function parseRoom(value: unknown, index: number, closed: boolean): ClosedRoom | OpenZone {
  if (!isRecord(value)) fail(`Phòng #${index} không phải object.`);
  const id = isString(value.id) ? value.id : fail(`Phòng #${index} thiếu id.`);
  const name = isString(value.name) ? value.name : id;
  const rect = asRect(value.rect, `Phòng ${id}`);
  const floor = isString(value.floor) ? value.floor : fail(`Phòng ${id} thiếu floor.`);
  if (!closed) return { id, name, rect, floor };
  const room: ClosedRoom = { id, name, rect, floor };
  if (value.outdoor === true) room.outdoor = true;
  if (Array.isArray(value.openSides)) {
    room.openSides = value.openSides.map((side, i) => asWall(side, `${id}.openSides[${i}]`));
  }
  return room;
}

function parseDoor(value: unknown, index: number): DoorDef {
  if (!isRecord(value)) fail(`Cửa #${index} không phải object.`);
  const id = isString(value.id) ? value.id : `door_${index}`;
  const room = isString(value.room) ? value.room : fail(`Cửa ${id} thiếu room.`);
  const wall = asWall(value.wall, `Cửa ${id}`);
  if (!isNum(value.offset) || !isNum(value.width) || !isNum(value.height)) {
    fail(`Cửa ${id} thiếu offset / width / height.`);
  }
  const door: DoorDef = {
    id,
    room,
    wall,
    offset: value.offset,
    width: value.width,
    height: value.height,
  };
  if (value.swing === "in" || value.swing === "out") door.swing = value.swing;
  if (isString(value.style)) door.style = value.style;
  if (isString(value.lock)) door.lock = value.lock;
  if (value.type === "sliding_glass" || value.type === "swing") door.type = value.type;
  if (isString(value.frame)) door.frame = value.frame;
  return door;
}

function parseWindow(value: unknown, index: number): WindowDef {
  if (!isRecord(value)) fail(`Cửa sổ #${index} không phải object.`);
  const room = isString(value.room) ? value.room : fail(`Cửa sổ #${index} thiếu room.`);
  const wall = asWall(value.wall, `Cửa sổ ${room}`);
  if (!isNum(value.offset) || !isNum(value.width) || !isNum(value.sill) || !isNum(value.height)) {
    fail(`Cửa sổ ${room}/${wall} thiếu kích thước.`);
  }
  const windowDef: WindowDef = {
    room,
    wall,
    offset: value.offset,
    width: value.width,
    sill: value.sill,
    height: value.height,
  };
  if (isString(value.frame)) windowDef.frame = value.frame;
  if (isString(value.curtain)) windowDef.curtain = value.curtain;
  return windowDef;
}

function parseBuiltIn(value: unknown, index: number): BuiltIn {
  if (!isRecord(value)) fail(`Built-in #${index} không phải object.`);
  const id = isString(value.id) ? value.id : `builtin_${index}`;
  const type = isString(value.type) ? value.type : fail(`Built-in ${id} thiếu type.`);
  if (type === "kitchen_counter_L") {
    if (!Array.isArray(value.rects) || !isNum(value.height)) fail(`Built-in ${id} thiếu rects/height.`);
    return {
      id,
      type,
      rects: value.rects.map((rect, i) => asRect(rect, `${id}.rects[${i}]`)),
      height: value.height,
      cabinet: isString(value.cabinet) ? value.cabinet : "walnut",
      countertop: isString(value.countertop) ? value.countertop : "granite_black",
      backsplash: isString(value.backsplash) ? value.backsplash : "glass_lime",
    };
  }
  if (type === "kitchen_upper") {
    if (!Array.isArray(value.rects) || !isNum(value.bottomY) || !isNum(value.topY)) {
      fail(`Built-in ${id} thiếu rects/bottomY/topY.`);
    }
    const doors = Array.isArray(value.doors) ? value.doors.filter(isString) : ["cream_gloss"];
    return {
      id,
      type,
      rects: value.rects.map((rect, i) => asRect(rect, `${id}.rects[${i}]`)),
      bottomY: value.bottomY,
      topY: value.topY,
      doors,
    };
  }
  if (type === "tall_cabinet_with_niche") {
    if (!isNum(value.height) || !isRecord(value.niche) || !isNum(value.niche.width) || !isNum(value.niche.height)) {
      fail(`Built-in ${id} thiếu height hoặc niche.`);
    }
    return {
      id,
      type,
      rect: asRect(value.rect, id),
      height: value.height,
      cabinet: isString(value.cabinet) ? value.cabinet : "walnut",
      niche: { width: value.niche.width, height: value.niche.height },
    };
  }
  if (type === "wall_panel") {
    if (!Array.isArray(value.z) || value.z.length !== 2 || !value.z.every(isNum) || !isNum(value.height)) {
      fail(`Built-in ${id} thiếu z/height.`);
    }
    const zone = isString(value.zone) ? value.zone : fail(`Built-in ${id} thiếu zone.`);
    return {
      id,
      type,
      wall: asWall(value.wall, id),
      zone,
      z: [value.z[0], value.z[1]],
      height: value.height,
      material: isString(value.material) ? value.material : "walnut",
    };
  }
  console.warn(`[Glory Heights] Chưa hỗ trợ built-in type "${type}" (${id}). Bỏ qua.`);
  return { id, type: "unknown", rawType: type };
}

export function loadApartment(raw: unknown = apartmentRaw): ApartmentFile {
  if (!isRecord(raw)) fail("apartment.json không phải object.");
  if (!isRecord(raw.meta)) fail("apartment.json thiếu meta.");
  const meta = raw.meta;
  if (!isString(meta.name)) fail("meta.name thiếu.");
  if (!isNum(meta.ceilingHeight) || meta.ceilingHeight < 2) fail("meta.ceilingHeight không hợp lệ.");
  if (!isRecord(meta.wallThickness) || !isNum(meta.wallThickness.exterior) || !isNum(meta.wallThickness.interior)) {
    fail("meta.wallThickness thiếu exterior/interior.");
  }
  if (!isRecord(meta.bounds) || !isNum(meta.bounds.width) || !isNum(meta.bounds.depth)) {
    fail("meta.bounds thiếu width/depth.");
  }
  if (!Array.isArray(raw.closedRooms) || !Array.isArray(raw.openZones)) {
    fail("Cần closedRooms và openZones.");
  }
  const startMode: StartMode = raw.startMode === "empty" ? "empty" : "furnished_sample";
  if (!isRecord(raw.spawn) || !Array.isArray(raw.spawn.position) || raw.spawn.position.length !== 3) {
    fail("spawn.position phải là [x, y, z].");
  }
  const [sx, sy, sz] = raw.spawn.position;
  if (!isNum(sx) || !isNum(sy) || !isNum(sz)) fail("spawn.position không phải số.");
  return {
    meta: {
      name: meta.name,
      type: isString(meta.type) ? meta.type : "",
      netArea_m2: isNum(meta.netArea_m2) ? meta.netArea_m2 : 0,
      grossArea_m2: isNum(meta.grossArea_m2) ? meta.grossArea_m2 : 0,
      unit: isString(meta.unit) ? meta.unit : "m",
      coordinateSystem: isString(meta.coordinateSystem) ? meta.coordinateSystem : "",
      bounds: { width: meta.bounds.width, depth: meta.bounds.depth },
      ceilingHeight: meta.ceilingHeight,
      wallThickness: {
        exterior: meta.wallThickness.exterior,
        interior: meta.wallThickness.interior,
      },
    },
    closedRooms: raw.closedRooms.map((room, i) => parseRoom(room, i, true) as ClosedRoom),
    openZones: raw.openZones.map((room, i) => parseRoom(room, i, false) as OpenZone),
    doors: Array.isArray(raw.doors) ? raw.doors.map(parseDoor) : [],
    windows: Array.isArray(raw.windows) ? raw.windows.map(parseWindow) : [],
    builtIns: Array.isArray(raw.builtIns) ? raw.builtIns.map(parseBuiltIn) : [],
    spawn: { position: [sx, sy, sz], facing: asFacing(raw.spawn.facing) },
    startMode,
  };
}

function parseCatalogItem(value: unknown, index: number): CatalogItem {
  if (!isRecord(value)) fail(`Catalog item #${index} không phải object.`);
  const id = isString(value.id) ? value.id : fail(`Catalog item #${index} thiếu id.`);
  const name = isString(value.name) ? value.name : id;
  const category = isString(value.category) ? value.category : "decor";
  if (!Array.isArray(value.size) || value.size.length !== 3 || !value.size.every(isNum)) {
    fail(`Catalog ${id} thiếu size [W, D, H].`);
  }
  const item: CatalogItem = {
    id,
    name,
    category,
    size: [value.size[0], value.size[1], value.size[2]],
  };
  if (isString(value.color)) item.color = value.color;
  if (value.model === null || isString(value.model)) item.model = value.model;
  if (Array.isArray(value.stackableOn)) item.stackableOn = value.stackableOn.filter(isString);
  if (value.isFlat === true) item.isFlat = true;
  if (Array.isArray(value.placeOn)) item.placeOn = value.placeOn.filter(isString);
  if (Array.isArray(value.snapTo)) item.snapTo = value.snapTo.filter(isString);
  if (value.mount === "wall" || value.mount === "floor") item.mount = value.mount;
  if (isNum(value.mountHeight)) item.mountHeight = value.mountHeight;
  if (isNum(value.price)) item.price = value.price;
  if (Array.isArray(value.variants)) {
    item.variants = value.variants.flatMap((variant) => {
      if (!isRecord(variant) || !isString(variant.id) || !isString(variant.color)) return [];
      return [{ id: variant.id, color: variant.color }];
    });
  }
  return item;
}

export function loadCatalog(raw: unknown = catalogRaw): CatalogFile {
  if (!isRecord(raw) || !Array.isArray(raw.items)) fail("catalog.json thiếu items.");
  const categories = Array.isArray(raw.categories) ? raw.categories.filter(isString) : [];
  return { categories, items: raw.items.map(parseCatalogItem) };
}

function parsePlaced(value: unknown, index: number): PlacedItem {
  if (!isRecord(value)) fail(`Layout item #${index} không phải object.`);
  const uid = isString(value.uid) ? value.uid : fail(`Layout item #${index} thiếu uid.`);
  const itemId = isString(value.itemId) ? value.itemId : fail(`${uid} thiếu itemId.`);
  if (!Array.isArray(value.position) || value.position.length !== 2 || !value.position.every(isNum)) {
    fail(`${uid} cần position [x, z].`);
  }
  if (!isNum(value.rotY)) fail(`${uid} thiếu rotY.`);
  const placed: PlacedItem = {
    uid,
    itemId,
    position: [value.position[0], value.position[1]],
    rotY: value.rotY,
  };
  if (isString(value.variantId)) placed.variantId = value.variantId;
  if (isString(value.stackedOn)) placed.stackedOn = value.stackedOn;
  if (isString(value.placeOn)) placed.placeOn = value.placeOn;
  if (value.locked === true) placed.locked = true;
  return placed;
}

export function loadSampleLayout(raw: unknown = sampleLayoutRaw): LayoutFile {
  if (!isRecord(raw) || !Array.isArray(raw.items)) fail("sample-layout.json thiếu items.");
  return { items: raw.items.map(parsePlaced) };
}
