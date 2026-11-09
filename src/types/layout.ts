export interface PlacedItem {
  uid: string;
  itemId: string;
  variantId?: string;
  /** Tâm đồ vật [x, z]. */
  position: [number, number];
  /** Độ, quanh trục Y. */
  rotY: number;
  /** Hệ số [rộng, sâu, cao] so với kích thước mẫu. */
  scale?: [number, number, number];
  stackedOn?: string;
  placeOn?: string;
  locked?: boolean;
}

export interface LayoutFile {
  items: PlacedItem[];
}
