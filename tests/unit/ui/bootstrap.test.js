// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { boot } from "../../../src/main.js";

// jsdom keeps one document per file: reset it so ids stay unique.
const freshBoot = () => {
  document.body.innerHTML = '<div id="app"></div>';
  return boot();
};

// Clicks the option whose text matches the scenario's best answer, the
// way a player who knows the material would (no injected randomness).
const answerByRating = (app, ratingIndex) => {
  const m = app.store.get().mission;
  const text = m.scenarios[m.step].opts[ratingIndex].t;
  const btn = [...document.querySelectorAll("[data-option]")].find((b) => b.textContent === text);
  btn.click();
};

const next = () => document.querySelector('[data-action="next"]').click();

const winWorld = (app, worldId) => {
  document.querySelector('[data-action="open-map"]').click();
  document.querySelector(`button[data-world-id="${worldId}"]`).click();
  document.querySelector('[data-action="launch"]').click();
  for (let i = 0; i < 3; i++) {
    answerByRating(app, 0);
    next();
  }
};

beforeEach(() => {
  localStorage.clear();
});

describe("bootstrap", () => {
  it("mounts the intro screen into #app without an e2e hook", () => {
    const app = freshBoot();
    expect(app.store.get().screen).toBe("intro");
    expect(document.querySelector("#app h1").textContent).toBe("Landfall");
    expect(window.__landfall).toBeUndefined();
  });

  it("boots even when localStorage access throws", () => {
    const desc = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("denied");
      },
    });
    document.body.innerHTML = '<div id="app"></div>';
    expect(() => boot()).not.toThrow();
    if (desc) Object.defineProperty(window, "localStorage", desc);
    else delete window.localStorage;
  });

  it("arms the e2e hook only for the exact ?e2e=1 query", () => {
    for (const query of ["?e2e=0", "?e2e=false", "?e2e", "?e2e=2", "?debug=1&e2e=true"]) {
      window.history.replaceState(null, "", `/${query}`);
      freshBoot();
      expect(window.__landfall, query).toBeUndefined();
    }
    window.history.replaceState(null, "", "/?e2e=1");
    freshBoot();
    expect(typeof window.__landfall).toBe("object");
    expect(typeof window.__landfall.bestDisplay).toBe("function");
    delete window.__landfall;
    window.history.replaceState(null, "", "/");
  });

  it("shares best scores between app instances through storage", () => {
    const app1 = freshBoot();
    winWorld(app1, "mars");
    expect(app1.store.get().best.mars).toBe(40);

    freshBoot();
    document.querySelector('[data-action="open-map"]').click();
    document.querySelector('button[data-world-id="mars"]').click();
    expect(document.querySelector('button[data-world-id="mars"] .tick')).not.toBeNull();
    expect(document.querySelector("#dossier").textContent).toContain("Best run: 40 of 40");
  });

  it("keeps the higher score when a later run is worse", () => {
    const app1 = freshBoot();
    winWorld(app1, "mars");

    const app2 = freshBoot();
    document.querySelector('[data-action="open-map"]').click();
    document.querySelector('button[data-world-id="mars"]').click();
    document.querySelector('[data-action="launch"]').click();
    answerByRating(app2, 1); // ok: 5 points, −20 meter
    next();
    answerByRating(app2, 0);
    next();
    answerByRating(app2, 0);
    next();
    expect(app2.store.get().lastResult.score).toBe(25);

    const app3 = freshBoot();
    document.querySelector('[data-action="open-map"]').click();
    document.querySelector('button[data-world-id="mars"]').click();
    expect(app3.store.get().best.mars).toBe(40);
    expect(document.querySelector("#dossier").textContent).toContain("Best run: 40 of 40");
  });
});
