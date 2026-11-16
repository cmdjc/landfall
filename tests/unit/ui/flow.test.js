// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { rngf } from "../../../src/core/rng.js";
import { createApp } from "../../../src/ui/app.js";

const storage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

// Boots the app, opens the map, selects a world, launches a mission.
// jsdom keeps one document per file: clear it so ids stay unique.
const launch = (worldId, seed = 4) => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  document.body.appendChild(root);
  const app = createApp(root, { storage: storage(), random: rngf(seed) });
  root.querySelector('[data-action="open-map"]').click();
  root.querySelector(`button[data-world-id="${worldId}"]`).click();
  root.querySelector('[data-action="launch"]').click();
  return { root, app };
};

// Display position of a rating index (0=best, 1=ok, 2=bad) for the
// current step, so tests can click what a player would see.
const displayOf = (app, ratingIndex) => {
  const m = app.store.get().mission;
  return m.orders[m.step].indexOf(ratingIndex);
};

const meters = (root) =>
  ["hull", "air", "power"].map((k) => Number(root.querySelector(`#m-${k} b`).textContent));

describe("mission screen", () => {
  it("shows the world, three fresh meters, a labeled view canvas, and three options", () => {
    const { root, app } = launch("mars");
    expect(app.store.get().screen).toBe("mission");
    expect(root.querySelector("h2").textContent).toBe("Mars");
    expect(meters(root)).toEqual([100, 100, 100]);
    const view = root.querySelector("#view");
    expect(view.getAttribute("role")).toBe("img");
    expect(view.getAttribute("aria-label")).toBe("View from your lander window");
    const options = root.querySelectorAll(".opts [data-option]");
    expect(options).toHaveLength(3);
    const scenario = app.store.get().mission.scenarios[0];
    const texts = [...options].map((o) => o.textContent);
    expect(texts).toContain(scenario.opts[0].t);
    expect(texts).toContain(scenario.opts[1].t);
    expect(texts).toContain(scenario.opts[2].t);
  });

  it("aborts back to the map", () => {
    const { root, app } = launch("mars");
    root.querySelector('[data-action="abort"]').click();
    expect(app.store.get().screen).toBe("map");
    expect(app.store.get().mission).toBeNull();
  });

  it("reveals feedback and keeps meters on a best answer", () => {
    const { root, app } = launch("mars");
    root.querySelector(`[data-option="${displayOf(app, 0)}"]`).click();
    const state = app.store.get();
    expect(state.mission.picked).toBe(0);
    expect(meters(root)).toEqual([100, 100, 100]);
    for (const o of root.querySelectorAll(".opts [data-option]")) {
      expect(o.disabled).toBe(true);
    }
    const fb = root.querySelector(".fb");
    expect(fb.textContent).toContain("Best choice");
    expect(fb.textContent).toContain("No damage. 10 points");
    expect(root.querySelector(".opt.best")).not.toBeNull();
    expect(root.querySelector("#live").textContent).toContain("Best choice");
  });

  it("damages the target meter and announces a bad answer", () => {
    const { root, app } = launch("mars");
    const scenario = app.store.get().mission.scenarios[0];
    root.querySelector(`[data-option="${displayOf(app, 2)}"]`).click();
    const expected = [...meters(root)];
    expect(expected[[scenario.stat === "hull" ? 0 : scenario.stat === "air" ? 1 : 2]]).toBe(40);
    expect(root.querySelector("#live").textContent).toContain("That went badly");
    expect(root.querySelector(".fb").textContent).toContain("−60");
  });

  it("advances to the next decision and re-enables options", () => {
    const { root, app } = launch("mars");
    root.querySelector(`[data-option="${displayOf(app, 0)}"]`).click();
    root.querySelector('[data-action="next"]').click();
    const m = app.store.get().mission;
    expect(m.step).toBe(1);
    expect(m.picked).toBeNull();
    expect(root.querySelector(".fb")).toBeNull();
    for (const o of root.querySelectorAll(".opts [data-option]")) {
      expect(o.disabled).toBe(false);
    }
  });

  it("finishes to the end screen after the third decision", () => {
    const { root, app } = launch("mars");
    for (let i = 0; i < 3; i++) {
      root.querySelector(`[data-option="${displayOf(app, 0)}"]`).click();
      root.querySelector('[data-action="next"]').click();
    }
    expect(app.store.get().screen).toBe("end");
  });
});
