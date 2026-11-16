// Best scores per world, kept in localStorage. Storage can be missing
// (private mode), full, or blocked, so nothing here is allowed to throw.
import { WORLD_COUNT, byId } from "../data/worlds.js";
import { MAX_WORLD_POINTS } from "../game/rules.js";

const KEY = "landfall.v1.best";

export function loadBest(storage) {
  try {
    const raw = storage?.getItem?.(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const best = {};
    for (const [id, value] of Object.entries(data)) {
      if (byId[id] && Number.isInteger(value) && value >= 0 && value <= MAX_WORLD_POINTS) best[id] = value;
    }
    return best;
  } catch {
    return {};
  }
}

export function saveBest(storage, best) {
  try {
    storage?.setItem?.(KEY, JSON.stringify(best));
  } catch {
    // Quota or blocked storage: scores stay in memory for this session.
  }
}

export const MAX_STAMPS = WORLD_COUNT;
