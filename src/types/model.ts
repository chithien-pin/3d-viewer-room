import type { Facing, WallSide } from "./apartment";

export interface ZoneRect {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floor: string;
  kind: "closed" | "open" | "outdoor";
  openSides: WallSide[];
}

export interface FloorRect {
  id: string;
  material: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

export type WallKind = "exterior" | "interior" | "railing" | "parapet" | "lintel";

/** Hộp tường / lan can đã cắt lỗ cửa. Tâm tại (x, y, z), kích thước đầy đủ. */
export interface WallBox {
  id: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  kind: WallKind;
  /** Pháp tuyến hướng ra ngoài. Tường trong để (0, 0). */
  nx: number;
  nz: number;
  axis: "x" | "z";
}

export interface ColliderBox {
  id: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

export type OpeningKind = "door" | "sliding" | "window";

export interface Opening {
  id: string;
  kind: OpeningKind;
  axis: "x" | "z";
  fixed: number;
  from: number;
  to: number;
  y0: number;
  y1: number;
  hingeX: number;
  hingeZ: number;
  /** Hướng vào trong phòng. */
  inX: number;
  inZ: number;
  /** Bề dày tường tại lỗ, để khung cửa nhô đúng. */
  wallThickness: number;
  style?: string;
  frame?: string;
  curtain?: string;
  lock?: string;
}

export type SolidShape = "box" | "cylinder";

export interface Solid {
  id: string;
  shape: SolidShape;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  material: string;
  /** Không chặn tia click sàn. */
  transparent?: boolean;
}

export interface NavGrid {
  originX: number;
  originZ: number;
  cell: number;
  cols: number;
  rows: number;
  walkable: Uint8Array;
}

export interface ApartmentModel {
  name: string;
  ceilingHeight: number;
  zones: ZoneRect[];
  floors: FloorRect[];
  walls: WallBox[];
  colliders: ColliderBox[];
  openings: Opening[];
  solids: Solid[];
  nav: NavGrid;
  spawn: { x: number; y: number; z: number; rotY: number; facing: Facing };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}
