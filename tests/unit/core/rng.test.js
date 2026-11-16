import { describe, expect, it } from "vitest";
import { hashString, pick, rngf, shuffle } from "../../../src/core/rng.js";

describe("rngf", () => {
  it("is deterministic for the same seed", () => {
    expect(rngf(42)()).toBe(rngf(42)());
  });
  it("differs between seeds", () => {
    expect(rngf(1)()).not.toBe(rngf(2)());
  });
  it("returns numbers in [0,1)", () => {
    const r = rngf(99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashString", () => {
  it("is stable and 32-bit unsigned", () => {
    const h = hashString("saturn");
    expect(h).toBe(hashString("saturn"));
    expect(h).toBeLessThan(2 ** 32);
    expect(hashString("saturn")).not.toBe(hashString("uranus"));
  });
});

describe("shuffle", () => {
  it("keeps all elements", () => {
    const out = shuffle([1, 2, 3, 4, 5], () => 0);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("does not mutate the input", () => {
    const input = [1, 2, 3];
    shuffle(input, () => 0.5);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("pick", () => {
  it("returns an element of the list", () => {
    const items = ["a", "b", "c"];
    expect(items).toContain(pick(items, () => 0.99));
  });
});
