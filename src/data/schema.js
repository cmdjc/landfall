// Shape rules for worlds and scenarios. Content is data; these checks
// keep the pool coherent, educational, and free of answer-length tells.
import { STAT_KEYS } from "../game/rules.js";

export const RATINGS = ["best", "ok", "bad"];
const MAX_LENGTH_RATIO = 1.75;

export function validateScenario(scenario) {
  const errors = [];
  if (typeof scenario.tag !== "string" || !scenario.tag.trim()) errors.push("tag");
  if (!STAT_KEYS.includes(scenario.stat)) errors.push(`stat:${scenario.stat}`);
  if (typeof scenario.text !== "string" || !scenario.text.trim()) errors.push("text");
  const opts = scenario.opts;
  if (!Array.isArray(opts) || opts.length !== 3) {
    errors.push("opts: need exactly 3");
    return errors;
  }
  const ratings = opts.map((o) => o.r).join(",");
  if (ratings !== RATINGS.join(",")) errors.push(`ratings:${ratings}`);
  for (const o of opts) {
    if (typeof o.t !== "string" || !o.t.trim()) errors.push("option text");
    if (typeof o.fb !== "string" || !o.fb.trim()) errors.push("option feedback");
  }
  const lengths = opts.map((o) => o.t.trim().length);
  if (Math.max(...lengths) / Math.min(...lengths) > MAX_LENGTH_RATIO) errors.push("length tell");
  return errors;
}

export function validateWorld(world) {
  const errors = [];
  if (typeof world.id !== "string" || !/^[a-z]+$/.test(world.id)) errors.push("id");
  for (const f of ["name", "to", "type", "color", "stamp", "atm", "temp", "land", "grav", "day", "fact"]) {
    if (typeof world[f] !== "string" || !world[f].trim()) errors.push(f);
  }
  if (world.note !== undefined && (typeof world.note !== "string" || !world.note.trim())) errors.push("note");
  if (!world.v || typeof world.v !== "object") errors.push("v");
  if (!Array.isArray(world.scenarios) || world.scenarios.length < 3) {
    errors.push("scenarios: need >= 3");
  } else {
    world.scenarios.forEach((s, i) => errors.push(...validateScenario(s).map((e) => `scenario ${i}: ${e}`)));
  }
  return errors;
}

export function validateContent(worlds) {
  const errors = [];
  const ids = new Set();
  for (const w of worlds) {
    if (ids.has(w.id)) errors.push(`duplicate id ${w.id}`);
    ids.add(w.id);
    errors.push(...validateWorld(w).map((e) => `${w.id ?? "?"}: ${e}`));
  }
  return errors;
}
