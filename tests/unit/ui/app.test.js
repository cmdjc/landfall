// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createApp } from "../../../src/ui/app.js";

const storage = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

const freshRoot = () => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  document.body.appendChild(root);
  return root;
};

describe("createApp", () => {
  it("renders the intro screen into the root", () => {
    const root = freshRoot();
    createApp(root, { storage: storage(), random: () => 0.5 });
    expect(root.querySelector("h1").textContent).toBe("Landfall");
    expect(root.querySelector('[data-action="open-map"]')).not.toBeNull();
  });
  it("shows the lede, three how-to bullets, a muted note, and a hidden hero canvas", () => {
    const root = freshRoot();
    createApp(root, { storage: storage(), random: () => 0.5 });
    const section = root.querySelector(".intro");
    expect(section.querySelector(".lede").textContent).toContain("every world in the solar system");
    expect(section.querySelectorAll("ul li")).toHaveLength(3);
    expect(section.querySelector(".muted").textContent).toContain("no ground at all");
    const hero = section.querySelector("canvas.hero");
    expect(hero.getAttribute("aria-hidden")).toBe("true");
  });
  it("gives the intro heading focus management attributes", () => {
    const root = freshRoot();
    createApp(root, { storage: storage(), random: () => 0.5 });
    const h1 = root.querySelector("h1");
    expect(h1.getAttribute("tabindex")).toBe("-1");
    expect(h1.hasAttribute("data-screen-title")).toBe(true);
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
    const root = freshRoot();
    expect(() => createApp(root, {})).not.toThrow();
  });
});
