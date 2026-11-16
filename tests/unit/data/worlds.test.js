import { describe, expect, it } from "vitest";
import { WORLDS, byId } from "../../../src/data/worlds.js";
import { validateContent, validateScenario, validateWorld } from "../../../src/data/schema.js";

const good = (over = {}) => ({
  tag: "T", stat: "hull", text: "Question?",
  opts: [
    { t: "A reasonably long answer", fb: "Right.", r: "best" },
    { t: "Another answer of length", fb: "Partly.", r: "ok" },
    { t: "One more similar answer", fb: "No.", r: "bad" },
  ],
  ...over,
});

describe("validateScenario", () => {
  it("accepts a well-formed scenario", () => {
    expect(validateScenario(good())).toEqual([]);
  });
  it("rejects unknown stats, wrong option counts, and rating sets", () => {
    expect(validateScenario(good({ stat: "fuel" }))).toContain("stat:fuel");
    expect(validateScenario(good({ opts: good().opts.slice(0, 2) })).length).toBeGreaterThan(0);
    const dup = good();
    dup.opts[1] = { ...dup.opts[1], r: "best" };
    expect(validateScenario(dup).join(" ")).toMatch(/ratings/);
  });
  it("flags answer lengths that give away the best option", () => {
    const tell = good();
    tell.opts[0] = { ...tell.opts[0], t: "A very long and detailed correct answer explaining everything" };
    expect(validateScenario(tell).join(" ")).toMatch(/length/);
  });
});

describe("validateWorld / validateContent", () => {
  it("requires the dossier fields", () => {
    expect(validateWorld({ id: "x", scenarios: [good(), good(), good()] }).length).toBeGreaterThan(0);
  });
  it("validates the shipped worlds on every rule except length parity and stat spread", () => {
    // Parity is enforced from Task 13; per-stat pool coverage from Task 15.
    const errors = validateContent(WORLDS)
      .filter((e) => !e.includes("length") && !e.includes("stat:"));
    expect(errors).toEqual([]);
  });
  it("has 11 unique worlds with at least 3 scenarios each and a byId map", () => {
    expect(WORLDS).toHaveLength(11);
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(11);
    expect(byId.moon.name).toBe("The Moon");
    for (const w of WORLDS) expect(w.scenarios.length).toBeGreaterThanOrEqual(3);
  });
  it.todo("covers all three stats in every pool (enabled in Task 15)");
});
