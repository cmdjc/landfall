// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { rngf } from "../../../src/core/rng.js";
import { byId } from "../../../src/data/worlds.js";
import { createMission } from "../../../src/game/mission.js";
import { STAT_NAMES } from "../../../src/game/rules.js";
import { saveBest } from "../../../src/store/persistence.js";
import { createApp } from "../../../src/ui/app.js";

const storage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

// Boots the app, opens the map, selects a world, launches a mission.
// jsdom keeps one document per file: clear it so ids stay unique.
const launch = (worldId, seed = 4, best = null) => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  document.body.appendChild(root);
  const s = storage();
  if (best) saveBest(s, best);
  const app = createApp(root, { storage: s, random: rngf(seed) });
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

// Answers best three times and finishes the mission.
const playWin = (root, app) => {
  for (let i = 0; i < 3; i++) {
    root.querySelector(`[data-option="${displayOf(app, 0)}"]`).click();
    root.querySelector('[data-action="next"]').click();
  }
};

// A seed whose first two drawn scenarios hit the same stat, so two
// bad answers (−60 each) kill that meter deterministically. Requires a
// world whose pool repeats a stat (e.g. neptune: hull, hull, power).
const sameStatSeed = (worldId) => {
  for (let s = 1; s < 500; s++) {
    const m = createMission(byId[worldId], rngf(s));
    if (m.scenarios[0].stat === m.scenarios[1].stat) return s;
  }
  throw new Error(`no same-stat seed found for ${worldId}`);
};

describe("end screen (win)", () => {
  it("stamps the landing, scores the run, and counts what is left", () => {
    const { root, app } = launch("mars");
    playWin(root, app);
    const state = app.store.get();
    expect(state.screen).toBe("end");
    expect(state.lastResult).toMatchObject({ win: true, score: 40 });
    expect(state.best).toEqual({ mars: 40 });
    const text = root.textContent;
    const stamp = root.querySelector(".stamp");
    expect(stamp.textContent).toContain("Landed");
    expect(stamp.textContent).toContain("Mars");
    expect(root.querySelector("h2").textContent).toBe("You landed on Mars");
    expect(root.querySelector(".score").textContent).toContain("40");
    expect(root.querySelector(".score").textContent).toContain("of 40");
    expect(text).toContain("30 from decisions");
    expect(text).toContain("flawless");
    expect(root.querySelector(".did").textContent).toContain("Take home:");
    expect(text).toContain("10 worlds left to visit");
    expect(text).not.toContain("Rank:");
    expect(text).not.toContain("All 11 stamps");
  });

  it("phrases the stamp line by stamp value", () => {
    const belt = launch("belt");
    playWin(belt.root, belt.app);
    expect(belt.root.querySelector("h2").textContent).toBe("You crossed the asteroid belt");
    expect(belt.root.querySelector(".stamp").textContent).toContain("Crossed");

    const jupiter = launch("jupiter");
    playWin(jupiter.root, jupiter.app);
    expect(jupiter.root.querySelector("h2").textContent).toBe("You descended into Jupiter");
    expect(jupiter.root.querySelector(".stamp").textContent).toContain("Descended");
  });

  it("shows the rank line only when all stamps are collected", () => {
    const ten = Object.fromEntries(
      Object.keys(byId).filter((id) => id !== "mars").map((id) => [id, 40]),
    );
    const { root, app } = launch("mars", 4, ten);
    playWin(root, app);
    expect(app.store.get().best).toEqual({ ...ten, mars: 40 });
    const text = root.textContent;
    expect(text).toContain("All 11 stamps collected");
    expect(text).toContain("Rank: Grand navigator");
  });

  it("restarts a fresh mission with Fly it again", () => {
    const { root, app } = launch("mars");
    playWin(root, app);
    root.querySelectorAll('[data-action="launch"]')[0].click();
    const state = app.store.get();
    expect(state.screen).toBe("mission");
    expect(state.mission.step).toBe(0);
    expect(state.mission.meters).toEqual({ hull: 100, air: 100, power: 100 });
    expect(state.lastResult).toBeNull();
  });
});

describe("end screen (loss)", () => {
  it("reports the lost meter and keeps best empty", () => {
    const seed = sameStatSeed("neptune");
    const { root, app } = launch("neptune", seed);
    const stat = app.store.get().mission.scenarios[0].stat;
    for (let i = 0; i < 2; i++) {
      root.querySelector(`[data-option="${displayOf(app, 2)}"]`).click();
      root.querySelector('[data-action="next"]').click();
    }
    const state = app.store.get();
    expect(state.screen).toBe("end");
    expect(state.lastResult.win).toBe(false);
    expect(state.best).toEqual({});
    const text = root.textContent;
    expect(text).toContain("Mission lost");
    expect(text).toContain(`${STAT_NAMES[stat]} reached zero`);
    expect(root.querySelector("h2").textContent).toContain("didn't make it");
  });
});
