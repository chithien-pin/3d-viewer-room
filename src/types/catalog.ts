export interface CatalogVariant {
  id: string;
  color: string;
  name?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  /** [rộng, sâu, cao] mét. */
  size: [number, number, number];
  color?: string;
  model?: string | null;
  stackableOn?: string[];
  isFlat?: boolean;
  placeOn?: string[];
  variants?: CatalogVariant[];
  snapTo?: string[];
  mount?: "wall" | "floor";
  mountHeight?: number;
  price?: number;
}

export interface CatalogFile {
  categories: string[];
  items: CatalogItem[];
}
