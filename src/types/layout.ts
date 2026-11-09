export interface PlacedItem {
  uid: string;
  itemId: string;
  variantId?: string;
  /** Tâm đồ vật [x, z]. */
  position: [number, number];
  /** Độ, quanh trục Y. */
  rotY: number;
  stackedOn?: string;
  placeOn?: string;
  locked?: boolean;
}

export interface LayoutFile {
  items: PlacedItem[];
}
