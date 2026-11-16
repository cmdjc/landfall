import { describe, expect, it } from "vitest";
import { rngf } from "../../../src/core/rng.js";
import {
  advance, answerOrders, choose, createMission, currentScenario, isLastStep,
} from "../../../src/game/mission.js";

const opt = (t, r) => ({ t, fb: `${t}-fb`, r });
const scenario = (stat, tag = "T") => ({
  tag, stat, text: `q-${tag}`,
  opts: [opt("best answer text", "best"), opt("ok answer wording", "ok"), opt("bad answer phrasing", "bad")],
});
const world = (scenarios) => ({ id: "mars", scenarios });

describe("createMission", () => {
  it("draws 3 distinct scenarios from the pool", () => {
    const pool = [scenario("hull", "a"), scenario("air", "b"), scenario("power", "c"), scenario("hull", "d"), scenario("air", "e"), scenario("power", "f")];
    const m = createMission(world(pool), rngf(3));
    expect(m.scenarios).toHaveLength(3);
    expect(new Set(m.scenarios).size).toBe(3);
    expect(m.meters).toEqual({ hull: 100, air: 100, power: 100 });
    expect(m.flawless).toBe(true);
    expect(m.picked).toBeNull();
  });
  it("is deterministic for a given random source", () => {
    const pool = Array.from({ length: 6 }, (_, i) => scenario(["hull", "air", "power"][i % 3], `t${i}`));
    const a = createMission(world(pool), rngf(11));
    const b = createMission(world(pool), rngf(11));
    expect(a.scenarios.map((s) => s.text)).toEqual(b.scenarios.map((s) => s.text));
  });
  it("caps draws at the pool size", () => {
    expect(createMission(world([scenario("hull"), scenario("air")]), rngf(1)).scenarios).toHaveLength(2);
  });
});

describe("answerOrders", () => {
  it("places the best answer in each display position exactly once", () => {
    for (let seed = 1; seed < 30; seed++) {
      const orders = answerOrders(rngf(seed));
      const bestSlots = orders.map((o) => o.indexOf(0));
      expect([...bestSlots].sort()).toEqual([0, 1, 2]);
      orders.forEach((o) => expect([...o].sort()).toEqual([0, 1, 2]));
    }
  });
});

describe("choose/advance", () => {
  it("scores, records the pick, and ignores double picks", () => {
    const m0 = createMission(world([scenario("hull"), scenario("air"), scenario("power")]), rngf(5));
    const m = choose(m0, 0); // best
    expect(m.picked).toBe(0);
    expect(m.points).toBe(10);
    expect(choose(m, 2)).toBe(m); // already answered
  });
  it("advances the step and clears the pick", () => {
    let m = createMission(world([scenario("hull"), scenario("air"), scenario("power")]), rngf(6));
    m = choose(m, 1);
    m = advance(m);
    expect(m.step).toBe(1);
    expect(m.picked).toBeNull();
  });
  it("does not advance past the last step", () => {
    let m = createMission(world([scenario("hull"), scenario("air"), scenario("power")]), rngf(7));
    m = choose(m, 0); m = advance(m);
    m = choose(m, 0); m = advance(m);
    m = choose(m, 0);
    expect(isLastStep(m)).toBe(true);
    expect(advance(m)).toBe(m);
    expect(currentScenario(m)).toBe(m.scenarios[2]);
  });
  it("flags failure when one meter is hit twice", () => {
    const pool = [scenario("hull", "h1"), scenario("hull", "h2"), scenario("hull", "h3")];
    let m = createMission(world(pool), rngf(9));
    m = choose(m, 2); // bad: hull 100 -> 40
    expect(m.failed).toBe(false);
    m = advance(m);
    m = choose(m, 2); // bad: hull 40 -> 0
    expect(m.meters.hull).toBe(0);
    expect(m.failed).toBe(true);
  });
});
