import { describe, expect, it } from "vitest";
import { drawView } from "../../../src/gfx/scenery.js";
import { WORLDS } from "../../../src/data/worlds.js";

const gradient = { addColorStop: () => {} };
const recorder = () => {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (target, prop) => {
      if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
      return (...args) => calls.push(`${String(prop)}(${args.join(",")})`);
    },
    set: (target, prop, value) => {
      target[prop] = value;
      calls.push(`set:${String(prop)}=${String(value)}`);
      return true;
    },
  });
  return { ctx, calls };
};
const canvas = (w = 300, h = 190, ctx = null) => ({
  clientWidth: w, clientHeight: h, width: 0, height: 0,
  getContext: () => ctx,
});

describe("drawView", () => {
  it("paints every world at every step", () => {
    for (const world of WORLDS) for (let step = 0; step < 3; step++) {
      const rec = recorder();
      expect(() => drawView(canvas(300, 190, rec.ctx), world, step)).not.toThrow();
      expect(rec.calls.length, `${world.id} step ${step}`).toBeGreaterThan(0);
    }
  });
  it("is deterministic for the same world and step", () => {
    const a = recorder(), b = recorder(), c = recorder();
    drawView(canvas(300, 190, a.ctx), WORLDS[0], 2);
    drawView(canvas(300, 190, b.ctx), WORLDS[0], 2);
    drawView(canvas(300, 190, c.ctx), WORLDS[0], 1);
    expect(a.calls.length).toBeGreaterThan(0);
    expect(a.calls).toEqual(b.calls);
    expect(a.calls).not.toEqual(c.calls);
  });
  it("uses the dark fallback for worlds with no sky (gas giants)", () => {
    const rec = recorder();
    const jupiter = WORLDS.find((w) => w.id === "jupiter");
    drawView(canvas(300, 190, rec.ctx), jupiter, 1);
    expect(rec.calls.some((c) => c.startsWith("set:fillStyle="))).toBe(true);
  });
  it("skips silently when the canvas has no size or no context", () => {
    expect(() => drawView(canvas(0, 0), WORLDS[0], 0)).not.toThrow();
    expect(() => drawView({ clientWidth: 100, clientHeight: 100, getContext: () => null }, WORLDS[0], 0)).not.toThrow();
  });
});
