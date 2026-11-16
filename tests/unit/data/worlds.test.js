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
  it("validates the shipped worlds against every rule", () => {
    // No filtering: an unknown stat name or length tell must fail the build.
    expect(validateContent(WORLDS)).toEqual([]);
  });
  it("has 11 unique worlds with at least 3 scenarios each and a byId map", () => {
    expect(WORLDS).toHaveLength(11);
    expect(new Set(WORLDS.map((w) => w.id)).size).toBe(11);
    expect(byId.moon.name).toBe("The Moon");
    for (const w of WORLDS) expect(w.scenarios.length).toBeGreaterThanOrEqual(3);
  });
  it("gives every world at least 5 scenarios", () => {
    for (const w of WORLDS) {
      expect(w.scenarios.length).toBeGreaterThanOrEqual(5);
    }
  });
  it("covers all three stats in every pool", () => {
    for (const w of WORLDS) {
      const stats = new Set(w.scenarios.map((s) => s.stat));
      expect(stats.has("hull"), `${w.id} hull`).toBe(true);
      expect(stats.has("air"), `${w.id} air`).toBe(true);
      expect(stats.has("power"), `${w.id} power`).toBe(true);
    }
  });
});
