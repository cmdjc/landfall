// @vitest-environment jsdom
// Accessibility hardening: locks focus behaviour, live regions, labels, and
// the stylesheet's motion/hover guards. Root must live in document.body so
// document.activeElement behaves like the real page.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rngf } from "../../../src/core/rng.js";
import { byId } from "../../../src/data/worlds.js";
import { createMission } from "../../../src/game/mission.js";
import { STAT_NAMES } from "../../../src/game/rules.js";
import { createApp } from "../../../src/ui/app.js";

const css = readFileSync(resolve(process.cwd(), "src/ui/style.css"), "utf8");

const storage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

// jsdom keeps one document per file: clear it so ids stay unique.
const boot = () => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  document.body.appendChild(root);
  const app = createApp(root, { storage: storage(), random: rngf(4) });
  return { root, app };
};

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

const displayOf = (app, ratingIndex) => {
  const m = app.store.get().mission;
  return m.orders[m.step].indexOf(ratingIndex);
};

const answer = (root, app, ratingIndex) => {
  root.querySelector(`[data-option="${displayOf(app, ratingIndex)}"]`).click();
};

const sameStatSeed = (worldId) => {
  for (let s = 1; s <= 500; s += 1) {
    const m = createMission(byId[worldId], rngf(s));
    if (m.scenarios[0].stat === m.scenarios[1].stat) return s;
  }
  throw new Error("no same-stat seed");
};

describe("focus management", () => {
  it("focuses the screen title only when the screen changes", () => {
    const { root, app } = boot();
    expect(document.activeElement).toBe(root.querySelector(".intro h1"));

    root.querySelector('[data-action="open-map"]').click();
    expect(document.activeElement).toBe(root.querySelector("#dossier h3"));

    root.querySelector('button[data-world-id="moon"]').click();
    // Same screen: the title must not be re-focused; the re-render replaced
    // the clicked chip, so focus returns to that world's chip.
    expect(document.activeElement).not.toBe(root.querySelector("#dossier h2"));
    expect(document.activeElement).toBe(root.querySelector('button[data-world-id="moon"]'));

    root.querySelector('[data-action="launch"]').click();
    expect(document.activeElement).toBe(root.querySelector(".mtop h2"));
    const title = document.activeElement;

    // Answering is not a screen change: focus follows the destroyed option
    // to the reveal's next control, never back to the title.
    answer(root, app, 0);
    expect(document.activeElement).not.toBe(title);
    expect(document.activeElement).toBe(root.querySelector('.fb [data-action="next"]'));

    // Continuing to the next decision keeps focus inside the scene.
    document.activeElement.click();
    expect(document.activeElement).toBe(root.querySelector(".opts [data-option]"));

    // Finishing lands on the end screen's title (a real transition).
    answer(root, app, 0);
    root.querySelector('.fb [data-action="next"]').click();
    answer(root, app, 0);
    root.querySelector('.fb [data-action="next"]').click();
    const titles = root.querySelectorAll("[data-screen-title]");
    expect(titles).toHaveLength(1);
    expect(document.activeElement).toBe(titles[0]);
  });

  it("keeps focus on the matching chip when a world is picked with the keyboard", () => {
    const { root } = boot();
    root.querySelector('[data-action="open-map"]').click();
    const group = root.querySelector('g[data-world-id="mars"]');
    group.focus();
    group.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(root.querySelector("#dossier h2").textContent).toBe("Mars");
    expect(document.activeElement).toBe(root.querySelector('button[data-world-id="mars"]'));
  });
});

describe("live region", () => {
  it("persists across renders and receives reveal summaries", () => {
    const { root, app } = launch("mars");
    const live = root.querySelector("#live");
    expect(live.getAttribute("aria-live")).toBe("polite");
    answer(root, app, 0);
    // Same node survived the re-render, now carrying the announcement.
    expect(document.getElementById("live")).toBe(live);
    expect(live.textContent).toMatch(/^Best choice\./);
  });
});

describe("screen titles", () => {
  it("has exactly one focusable screen title per screen state", () => {
    const { root, app } = boot();
    const one = () => {
      const titles = root.querySelectorAll("[data-screen-title]");
      expect(titles).toHaveLength(1);
      expect(titles[0].getAttribute("tabindex")).toBe("-1");
    };
    one(); // intro
    root.querySelector('[data-action="open-map"]').click();
    one(); // map, no selection
    root.querySelector('button[data-world-id="belt"]').click();
    one(); // map, dossier open
    root.querySelector('[data-action="launch"]').click();
    one(); // mission
    answer(root, app, 0);
    root.querySelector('.fb [data-action="next"]').click();
    one(); // mission, later step
  });

  it("gives the loss end screen a single focusable title too", () => {
    const seed = sameStatSeed("neptune");
    const { root, app } = launch("neptune", seed);
    answer(root, app, 2);
    root.querySelector('.fb [data-action="next"]').click();
    answer(root, app, 2);
    root.querySelector('.fb [data-action="next"]').click();
    const titles = root.querySelectorAll("[data-screen-title]");
    expect(titles).toHaveLength(1);
    expect(titles[0].getAttribute("tabindex")).toBe("-1");
    expect(titles[0].textContent).toContain("didn't make it");
  });
});

describe("labels and roles", () => {
  it("exposes map world groups and chips as buttons with names", () => {
    const { root } = boot();
    root.querySelector('[data-action="open-map"]').click();
    const groups = root.querySelectorAll("g[data-world-id]");
    expect(groups.length).toBe(11);
    for (const g of groups) {
      expect(g.getAttribute("role")).toBe("button");
      expect(g.getAttribute("tabindex")).toBe("0");
      expect(g.getAttribute("aria-label")).toBe(byId[g.dataset.worldId].name);
    }
    const chips = root.querySelectorAll("button[data-world-id]");
    expect(chips.length).toBe(11);
    for (const c of chips) expect(c.tagName).toBe("BUTTON");
  });

  it("labels meters with their value and the view canvas as an image", () => {
    const { root, app } = launch("mars");
    for (const k of ["hull", "air", "power"]) {
      expect(root.querySelector(`#m-${k}`).getAttribute("aria-label"))
        .toBe(`${STAT_NAMES[k]} 100 of 100`);
    }
    const view = root.querySelector("#view");
    expect(view.getAttribute("role")).toBe("img");
    expect(view.getAttribute("aria-label")).toBe("View from your lander window");

    answer(root, app, 2); // bad answer: 60 damage to the scenario's stat
    const stat = app.store.get().mission.scenarios[0].stat;
    expect(root.querySelector(`#m-${stat}`).getAttribute("aria-label"))
      .toBe(`${STAT_NAMES[stat]} 40 of 100`);
  });
});

describe("stylesheet guards", () => {
  it("respects reduced motion and confines hover styles to hover-capable devices", () => {
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
    const hoverLines = css.split("\n").filter((l) => l.includes(":hover"));
    expect(hoverLines.length).toBeGreaterThan(0);
    for (const line of hoverLines) expect(line).toContain("(hover:hover)");
  });
});
