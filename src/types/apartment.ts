export type WallSide = "north" | "south" | "east" | "west";

export type FloorMaterialId = "marble_white" | "wood_laminate" | "slate_dark";

export type Facing = "north" | "south" | "east" | "west";

export type StartMode = "empty" | "furnished_sample";

/** [x, z, width, depth] — góc là đỉnh có x và z nhỏ nhất. */
export type Rect = [number, number, number, number];

export interface ApartmentMeta {
  name: string;
  type: string;
  netArea_m2: number;
  grossArea_m2: number;
  unit: string;
  coordinateSystem: string;
  bounds: { width: number; depth: number };
  ceilingHeight: number;
  wallThickness: { exterior: number; interior: number };
}

export interface ClosedRoom {
  id: string;
  name: string;
  rect: Rect;
  floor: string;
  openSides?: WallSide[];
  outdoor?: boolean;
}

export interface OpenZone {
  id: string;
  name: string;
  rect: Rect;
  floor: string;
}

export interface DoorDef {
  id: string;
  room: string;
  wall: WallSide;
  offset: number;
  width: number;
  height: number;
  swing?: "in" | "out";
  style?: string;
  lock?: string;
  type?: "sliding_glass" | "swing";
  frame?: string;
}

export interface WindowDef {
  room: string;
  wall: WallSide;
  offset: number;
  width: number;
  sill: number;
  height: number;
  frame?: string;
  curtain?: string;
}

export interface KitchenCounterBuiltIn {
  id: string;
  type: "kitchen_counter_L";
  rects: Rect[];
  height: number;
  cabinet: string;
  countertop: string;
  backsplash: string;
}

export interface KitchenUpperBuiltIn {
  id: string;
  type: "kitchen_upper";
  rects: Rect[];
  bottomY: number;
  topY: number;
  doors: string[];
}

export interface TallCabinetBuiltIn {
  id: string;
  type: "tall_cabinet_with_niche";
  rect: Rect;
  height: number;
  cabinet: string;
  niche: { width: number; height: number };
}

export interface WallPanelBuiltIn {
  id: string;
  type: "wall_panel";
  wall: WallSide;
  zone: string;
  z: [number, number];
  height: number;
  material: string;
}

export interface UnknownBuiltIn {
  id: string;
  type: "unknown";
  rawType: string;
}

export type BuiltIn =
  | KitchenCounterBuiltIn
  | KitchenUpperBuiltIn
  | TallCabinetBuiltIn
  | WallPanelBuiltIn
  | UnknownBuiltIn;

export interface ApartmentFile {
  meta: ApartmentMeta;
  closedRooms: ClosedRoom[];
  openZones: OpenZone[];
  doors: DoorDef[];
  windows: WindowDef[];
  builtIns: BuiltIn[];
  spawn: { position: [number, number, number]; facing: Facing };
  startMode: StartMode;
}
