import { buildApartment } from "../systems/layout/buildApartment";
import { placePlayer } from "../systems/movement/player";
import type { ApartmentModel } from "../types/model";
import { loadApartment } from "./load";

let cached: ApartmentModel | null = null;
let failure: string | null = null;

export function getModel(): { model: ApartmentModel | null; error: string | null } {
  if (cached || failure) return { model: cached, error: failure };
  try {
    cached = buildApartment(loadApartment());
    placePlayer(cached.spawn.x, cached.spawn.z, cached.spawn.rotY);
    return { model: cached, error: null };
  } catch (error) {
    failure = error instanceof Error ? error.message : "Không đọc được mặt bằng.";
    return { model: null, error: failure };
  }
}
