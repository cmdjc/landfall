import "./ui/style.css";
import { createApp } from "./ui/app.js";

// Some privacy modes throw on mere access to localStorage.
const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export function boot(root = document.getElementById("app")) {
  if (!root) return undefined;
  const app = createApp(root, { storage: safeStorage() });

  // E2E hook: only present when the page is opened with ?e2e=1.
  if (new URLSearchParams(window.location.search).has("e2e")) {
    window.__landfall = {
      bestDisplay: () => {
        const m = app.store.get().mission;
        return m ? m.orders[m.step].indexOf(0) : null;
      },
      state: () => app.store.get(),
    };
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const view = document.querySelector("#view");
      const hero = document.querySelector("#hero");
      if (view && app.store.get().mission) view.dispatchEvent(new Event("landfall:redraw"));
      if (hero && app.store.get().screen === "intro") hero.dispatchEvent(new Event("landfall:redraw"));
    }, 150);
  });
  return app;
}

boot();
