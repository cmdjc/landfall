// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApp } from "../../../src/ui/app.js";

const storage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

describe("createApp", () => {
  it("renders the intro screen into the root", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    createApp(root, { storage: storage(), random: () => 0.5 });
    expect(root.querySelector("h1").textContent).toBe("Landfall");
    expect(root.querySelector('[data-action="open-map"]')).not.toBeNull();
  });
  it("starts in intro state with empty best scores", () => {
    const root = document.createElement("div");
    const app = createApp(root, { storage: storage(), random: () => 0.5 });
    expect(app.store.get().screen).toBe("intro");
    expect(app.store.get().best).toEqual({});
  });
  it("keeps a persistent live region outside the screen container", () => {
    const root = document.createElement("div");
    createApp(root, { storage: storage(), random: () => 0.5 });
    const live = root.querySelector("#live");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(root.querySelector("#screen")).not.toBeNull();
  });
  it("works without injected storage", () => {
    const root = document.createElement("div");
    expect(() => createApp(root, {})).not.toThrow();
  });
});
