// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { WORLDS } from "../../../src/data/worlds.js";
import { mapSVG } from "../../../src/gfx/map.js";
import { createApp } from "../../../src/ui/app.js";
import { mapScreen } from "../../../src/ui/screens/map.js";

const parse = (html) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.firstChild;
};

describe("mapSVG", () => {
  it("renders every world as a labeled, focusable button group", () => {
    const svg = parse(mapSVG({ selectedId: null, best: {} }));
    for (const w of WORLDS) {
      const node = svg.querySelector(`[data-world-id="${w.id}"]`);
      expect(node).not.toBeNull();
      expect(node.getAttribute("role")).toBe("button");
      expect(node.getAttribute("tabindex")).toBe("0");
      expect(node.getAttribute("aria-label")).toBe(w.name);
    }
    expect(svg.getAttribute("role")).toBe("group");
  });
  it("marks the selected and visited worlds", () => {
    const svg = parse(mapSVG({ selectedId: "mars", best: { mars: 40 } }));
    expect(svg.querySelector('[data-world-id="mars"]').getAttribute("class")).toContain("sel");
    expect(svg.querySelector('[data-world-id="mars"]').getAttribute("class")).toContain("vis");
  });
  it("never emits NaN or undefined coordinates", () => {
    expect(mapSVG({ selectedId: null, best: {} })).not.toMatch(/NaN|undefined/);
  });
});

describe("map screen", () => {
  const el = () => {
    const div = document.createElement("div");
    div.innerHTML = '<div id="screen"></div>';
    return div.querySelector("#screen");
  };
  it("shows a placeholder dossier when nothing is selected", () => {
    const screen = el();
    mapScreen.render(screen, { screen: "map", selectedWorldId: null, best: {} });
    expect(screen.textContent).toContain("Choose a destination");
  });
  it("shows the dossier and launch button for the selection", () => {
    const screen = el();
    mapScreen.render(screen, { screen: "map", selectedWorldId: "mars", best: { mars: 25 } });
    const dossier = screen.querySelector("#dossier");
    expect(dossier.textContent).toContain("Mars");
    expect(dossier.textContent).toContain("Best run: 25 of 40");
    for (const key of ["Atmosphere", "Temperature", "Landscape", "Gravity", "Day length", "Did you know"]) {
      expect(dossier.textContent).toContain(key);
    }
    expect(screen.querySelector('[data-action="launch"]').textContent).toBe("Launch to Mars");
  });
  it("shows the grand-tour banner when every world has a stamp", () => {
    const screen = el();
    const best = Object.fromEntries(WORLDS.map((w) => [w.id, 40]));
    mapScreen.render(screen, { screen: "map", selectedWorldId: null, best });
    expect(screen.textContent).toContain("Grand tour complete");
  });
  it("marks visited chips", () => {
    const screen = el();
    mapScreen.render(screen, { screen: "map", selectedWorldId: "sun", best: { sun: 40 } });
    const chip = screen.querySelector('button[data-world-id="sun"]');
    expect(chip.textContent).toContain("✓");
  });
});

describe("map integration through the app", () => {
  const storage = () => {
    const map = new Map();
    return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
  };
  const boot = () => {
    document.body.innerHTML = "";
    const root = document.createElement("div");
    document.body.appendChild(root);
    return { root, app: createApp(root, { storage: storage(), random: () => 0.5 }) };
  };

  it("opens the map from the intro and selects a world via its chip", () => {
    const { root, app } = boot();
    root.querySelector('[data-action="open-map"]').click();
    expect(app.store.get().screen).toBe("map");
    root.querySelector('button[data-world-id="mars"]').click();
    expect(app.store.get().selectedWorldId).toBe("mars");
    expect(root.querySelector("#dossier").textContent).toContain("Mars");
  });
  it("selects a world via keyboard on the SVG group", () => {
    const { root, app } = boot();
    root.querySelector('[data-action="open-map"]').click();
    const group = root.querySelector('g[data-world-id="venus"]');
    group.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(app.store.get().selectedWorldId).toBe("venus");
  });
  it("launches the selected world into a mission", () => {
    const { root, app } = boot();
    root.querySelector('[data-action="open-map"]').click();
    root.querySelector('button[data-world-id="mars"]').click();
    root.querySelector('[data-action="launch"]').click();
    expect(app.store.get().screen).toBe("mission");
    expect(app.store.get().mission.worldId).toBe("mars");
  });
});
