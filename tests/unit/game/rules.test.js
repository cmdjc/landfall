import { describe, expect, it } from "vitest";
import {
  DMG, FLAWLESS_BONUS, MAX_WORLD_POINTS, PTS, STAT_KEYS, STAT_NAMES,
  applyChoice, clampMeter, finalScore, rankFor,
} from "../../../src/game/rules.js";

describe("constants", () => {
  it("keeps the original damage, points, and bonus table", () => {
    expect(DMG).toEqual({ best: 0, ok: 20, bad: 60 });
    expect(PTS).toEqual({ best: 10, ok: 5, bad: 0 });
    expect(FLAWLESS_BONUS).toBe(10);
    expect(MAX_WORLD_POINTS).toBe(40);
    expect(STAT_KEYS).toEqual(["hull", "air", "power"]);
    expect(STAT_NAMES.hull).toBe("Hull");
  });
});

describe("clampMeter", () => {
  it("clamps to [0,100]", () => {
    expect(clampMeter(-5)).toBe(0);
    expect(clampMeter(120)).toBe(100);
    expect(clampMeter(40)).toBe(40);
  });
});

describe("applyChoice", () => {
  const m = () => ({ meters: { hull: 100, air: 100, power: 100 }, points: 0, flawless: true, failed: false });
  it("applies damage only to the target stat and adds points", () => {
    const out = applyChoice(m(), "air", "ok");
    expect(out.meters).toEqual({ hull: 100, air: 80, power: 100 });
    expect(out.points).toBe(5);
    expect(out.flawless).toBe(false);
  });
  it("keeps flawless on best choices", () => {
    const out = applyChoice(m(), "hull", "best");
    expect(out.flawless).toBe(true);
    expect(out.points).toBe(10);
  });
  it("floors meters at zero and flags failure", () => {
    let st = m();
    st = applyChoice(st, "power", "bad");   // 40
    st = applyChoice(st, "power", "bad");   // 0 -> failed
    expect(st.meters.power).toBe(0);
    expect(st.failed).toBe(true);
  });
  it("does not mutate the input mission", () => {
    const before = m();
    applyChoice(before, "hull", "bad");
    expect(before.meters.hull).toBe(100);
    expect(before.points).toBe(0);
  });
});

describe("finalScore", () => {
  it("adds the bonus only for a flawless run", () => {
    expect(finalScore({ points: 30, flawless: true })).toBe(40);
    expect(finalScore({ points: 30, flawless: false })).toBe(30);
  });
});

describe("rankFor", () => {
  it("matches the original thresholds at and just below each boundary", () => {
    expect(rankFor(440, 11)).toBe("Grand navigator");
    expect(rankFor(396, 11)).toBe("Grand navigator"); // exactly 90%
    expect(rankFor(395, 11)).toBe("Commander");
    expect(rankFor(308, 11)).toBe("Commander");       // exactly 70%
    expect(rankFor(307, 11)).toBe("Pilot");
    expect(rankFor(176, 11)).toBe("Pilot");           // exactly 40%
    expect(rankFor(175, 11)).toBe("Trainee");
    expect(rankFor(0, 11)).toBe("Trainee");
  });
});
