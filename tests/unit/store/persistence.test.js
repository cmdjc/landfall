import { describe, expect, it } from "vitest";
import { loadBest, saveBest } from "../../../src/store/persistence.js";

const memoryStorage = ({ readFails = false, writeFails = false } = {}) => {
  const map = new Map();
  return {
    getItem: (k) => {
      if (readFails) throw new Error("storage blocked");
      return map.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (writeFails) throw new Error("quota");
      map.set(k, v);
    },
    dump: (k, v) => map.set(k, v),
  };
};

describe("loadBest", () => {
  it("returns {} when empty", () => {
    expect(loadBest(memoryStorage())).toEqual({});
  });
  it("round-trips saved scores", () => {
    const s = memoryStorage();
    saveBest(s, { mars: 40, moon: 25 });
    expect(loadBest(s)).toEqual({ mars: 40, moon: 25 });
  });
  it("drops corrupt JSON, unknown worlds, and out-of-range scores", () => {
    const s = memoryStorage();
    s.dump("landfall.v1.best", "{oops");
    expect(loadBest(s)).toEqual({});
    s.dump("landfall.v1.best", JSON.stringify({ mars: 40, tatooine: 40, sun: 99, moon: -3, belt: 12.5, earth: "30" }));
    expect(loadBest(s)).toEqual({ mars: 40 });
  });
  it("drops inherited property names like constructor and toString", () => {
    const s = memoryStorage();
    s.dump("landfall.v1.best", JSON.stringify({ constructor: 40, toString: 20, valueOf: 30, mars: 25 }));
    expect(loadBest(s)).toEqual({ mars: 25 });
  });
  it("never throws when storage reads or writes fail", () => {
    expect(loadBest(memoryStorage({ readFails: true }))).toEqual({});
    expect(() => saveBest(memoryStorage({ writeFails: true }), { mars: 40 })).not.toThrow();
  });
  it("tolerates missing storage entirely", () => {
    expect(loadBest(undefined)).toEqual({});
    expect(() => saveBest(undefined, {})).not.toThrow();
  });
});
