// Browser e2e against the built bundle in dist/. The e2e=1 query arms a
// test-only hook (__landfall.bestDisplay) that reveals the best option so
// the suite can play perfectly through real buttons; the shipped page never
// defines it.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WORLDS, byId } from "../../src/data/worlds.js";
import { connectBrowser } from "./cdp.js";
import { startServer } from "./server.js";

let server;
let browser;

beforeAll(async () => {
  server = await startServer();
  browser = await connectBrowser();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const withPage = async (query, run, opts = {}) => {
  const page = await browser.openPage(`${server.url}/${query}`, opts);
  try {
    await run(page);
    if (page.errors.length > 0) console.error("PAGE ERRORS:", JSON.stringify(page.errors));
    expect(page.errors).toEqual([]);
  } catch (e) {
    console.error("TEST ERROR:", e.message, "| PAGE ERRORS:", JSON.stringify(page.errors));
    throw e;
  } finally {
    await page.close();
  }
};

// One perfect run: map → dossier → launch → three best answers → stamp,
// every interaction a real click. Leaves the app back on the map screen.
// Call it mid-tour: if a world was just finished, the app is already there.
const playWorld = async (page, worldId) => {
  if (await page.evaluate(`document.querySelector('[data-action="open-map"]') !== null`)) {
    await page.click('[data-action="open-map"]');
  }
  await page.waitFor(`document.querySelector('button[data-world-id="${worldId}"]')`);
  await page.click(`button[data-world-id="${worldId}"]`);
  await page.waitFor('document.querySelector(\'[data-action="launch"]\')');
  await page.click('[data-action="launch"]');
  for (let step = 0; step < 3; step += 1) {
    await page.waitFor('document.querySelector(".opts [data-option]:not([disabled])")');
    const best = await page.evaluate("window.__landfall.bestDisplay()");
    await page.click(`[data-option="${best}"]`);
    await page.waitFor('document.querySelector(\'.fb [data-action="next"]\')');
    await page.click('.fb [data-action="next"]');
  }
  await page.waitFor('document.querySelector(".stamp")');
  const stamp = await page.evaluate('document.querySelector(".stamp").textContent');
  await page.click('[data-action="open-map"]');
  await page.waitFor('document.querySelector(".chips")');
  return stamp;
};

describe("landing page", () => {
  it("renders the intro with no debug hook and no console errors", async () => {
    await withPage("", async (page) => {
      await page.waitFor('document.querySelector(".intro h1")');
      expect(await page.evaluate('document.querySelector(".intro h1").textContent')).toBe("Landfall");
      expect(await page.evaluate("typeof window.__landfall")).toBe("undefined");
    });
  });
});

describe("persistence", () => {
  it("keeps the best score across a reload", async () => {
    await withPage("?e2e=1", async (page) => {
      await playWorld(page, "moon");
      await page.reload();
      await page.waitFor('document.querySelector(".intro h1")');
      await page.click('[data-action="open-map"]');
      await page.waitFor(`document.querySelector('button[data-world-id="moon"] .tick')`);
      await page.click('button[data-world-id="moon"]');
      await page.waitFor('document.querySelector("#dossier h2")');
      const dossier = await page.evaluate('document.querySelector("#dossier").textContent');
      expect(dossier).toContain("Best run: 40 of 40");
    });
  });
});

describe("grand tour", () => {
  it("plays all eleven worlds through real buttons and earns the top rank", async () => {
    await withPage("?e2e=1", async (page) => {
      for (const world of WORLDS) {
        const stamp = await playWorld(page, world.id);
        expect(stamp).toContain(world.stamp);
        expect(stamp).toContain(world.name);
      }
      await page.waitFor('document.querySelector(".banner")');
      const banner = await page.evaluate('document.querySelector(".banner").textContent');
      expect(banner).toContain("Grand tour complete");
      expect(banner).toContain("Rank: Grand navigator");
    });
  });
});

describe("keyboard", () => {
  it("opens a dossier with Tab and Enter", async () => {
    await withPage("?e2e=1", async (page) => {
      await page.click('[data-action="open-map"]');
      await page.waitFor('document.querySelector(".chips")');
      // The map screen holds focus on its title (tabindex -1). Chrome's first
      // Tab from there lands on the body; the next reaches the first world
      // control, the asteroid belt's SVG group. Tab must be sent as
      // rawKeyDown for Chrome to apply its default focus behaviour.
      for (let tab = 0; tab < 5; tab += 1) {
        await page.key("rawKeyDown", "Tab", "Tab", 9);
        await page.key("keyUp", "Tab", "Tab", 9);
        if (await page.evaluate(
          'document.activeElement && document.activeElement.matches("[data-world-id]")',
        )) break;
      }
      await page.key("keyDown", "Enter", "Enter", 13);
      await page.key("keyUp", "Enter", "Enter", 13);
      await page.waitFor('document.querySelector("#dossier h2")');
      expect(await page.evaluate('document.querySelector("#dossier h2").textContent')).toBe("Asteroid belt");
      // Focus follows the selection onto the matching chip.
      expect(await page.evaluate("document.activeElement.dataset.worldId")).toBe("belt");
      expect(byId.belt.name).toBe("Asteroid belt");
    });
  });
});

describe("mobile", () => {
  it("plays a full mission on a phone-sized viewport", async () => {
    await withPage("?e2e=1", async (page) => {
      const stamp = await playWorld(page, "venus");
      expect(stamp).toContain("Venus");
    }, { width: 400, height: 800 });
  });
});
