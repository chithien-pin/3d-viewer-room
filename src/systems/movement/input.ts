export interface XZ {
  x: number;
  z: number;
}

export type ViewMode = "first" | "third";

type InputListener = () => void;
type ViewBridge = (mode: ViewMode) => void;

const listeners = new Set<InputListener>();
let viewBridge: ViewBridge | null = null;

export function subscribeInput(listener: InputListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitInput(): void {
  listeners.forEach((listener) => listener());
}

export function bindViewBridge(bridge: ViewBridge): () => void {
  viewBridge = bridge;
  return () => {
    if (viewBridge === bridge) viewBridge = null;
  };
}

export function toggleView(): void {
  input.view = input.view === "first" ? "third" : "first";
  if (input.view === "first") input.lookPitch = 0.08;
  viewBridge?.(input.view);
  emitInput();
}

export function toggleHelp(): void {
  input.help = !input.help;
  emitInput();
}

export function toggleLabels(): void {
  input.showLabels = !input.showLabels;
  emitInput();
}

/**
 * Input sống ngoài React để không render lại HUD mỗi frame.
 * yaw = 0 đặt camera ở phía +Z (nam), nhìn về nhân vật.
 */
export const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
  yaw: 0.62,
  pitch: 0.96,
  distance: 13.5,
  cutaway: true,
  showCeiling: false,
  view: "third" as ViewMode,
  lookPitch: 0.08,
  stickForward: 0,
  stickStrafe: 0,
  help: false,
  showLabels: true,
  editing: false,
  path: null as XZ[] | null,
  destination: null as XZ | null,
};

const held = new Set<string>();

function syncHeld(): void {
  input.forward = held.has("KeyW") || held.has("ArrowUp");
  input.back = held.has("KeyS") || held.has("ArrowDown");
  input.left = held.has("KeyA") || held.has("ArrowLeft");
  input.right = held.has("KeyD") || held.has("ArrowRight");
  input.run = held.has("ShiftLeft") || held.has("ShiftRight");
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function bindKeyboard(target: Window): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (isTyping(event)) return;
    if (event.code === "KeyN" && !event.repeat) {
      event.preventDefault();
      toggleLabels();
    }
    if (event.code === "KeyC" && !event.repeat) input.showCeiling = !input.showCeiling;
    if (event.code === "KeyH" && !event.repeat) input.cutaway = !input.cutaway;
    if (event.code === "KeyV" && !event.repeat) {
      event.preventDefault();
      toggleView();
    }
    if ((event.key === "?" || (event.code === "Slash" && event.shiftKey)) && !event.repeat) {
      event.preventDefault();
      toggleHelp();
    }
    if (event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "Space") {
      event.preventDefault();
    }
    held.add(event.code);
    syncHeld();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    held.delete(event.code);
    syncHeld();
  };
  const onBlur = () => {
    held.clear();
    syncHeld();
  };
  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);
  return () => {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
    target.removeEventListener("blur", onBlur);
    held.clear();
    syncHeld();
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const PITCH_MIN = 0.22;
export const PITCH_MAX = 1.5;

export function orbitBy(dx: number, dy: number, gain = 1): void {
  input.yaw -= dx * 0.005 * gain;
  input.pitch = clamp(input.pitch + dy * 0.0032 * gain, PITCH_MIN, PITCH_MAX);
}
