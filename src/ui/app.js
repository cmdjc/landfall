// App shell: owns the store, the action vocabulary, and one delegated
// click/keydown listener. Screens are pure renderers of state.
import { byId } from "../data/worlds.js";
import { finalScore } from "../game/rules.js";
import { advance as advanceStep, choose as chooseStep, createMission, isLastStep } from "../game/mission.js";
import { loadBest, saveBest } from "../store/persistence.js";
import { createStore } from "../store/store.js";
import { endScreen } from "./screens/end.js";
import { introScreen } from "./screens/intro.js";
import { mapScreen } from "./screens/map.js";
import { missionScreen } from "./screens/mission.js";

const SCREENS = { intro: introScreen, map: mapScreen, mission: missionScreen, end: endScreen };

export function createApp(root, { storage, random = Math.random } = {}) {
  const store = createStore({
    screen: "intro", selectedWorldId: null, best: loadBest(storage), mission: null, lastResult: null,
  });

  root.innerHTML = `<div id="live" aria-live="polite" class="sr-only"></div><div id="screen"></div>`;
  const screenEl = root.querySelector("#screen");
  const liveEl = root.querySelector("#live");
  let lastScreen = null;
  let chipToFocus = null;

  const render = () => {
    const state = store.get();
    SCREENS[state.screen].render(screenEl, state);
    if (state.screen !== lastScreen) {
      lastScreen = state.screen;
      const heading = screenEl.querySelector("[data-screen-title]");
      if (heading instanceof HTMLElement) heading.focus();
      return;
    }
    // Same-screen re-render: every control was replaced, so focus would drop
    // back to the document. Keep keyboard users oriented — back on the world
    // they just picked, or on the next control inside the mission scene.
    if (chipToFocus && state.screen === "map") {
      const chip = screenEl.querySelector(`button[data-world-id="${chipToFocus}"]`);
      chipToFocus = null;
      if (chip instanceof HTMLElement) chip.focus();
      return;
    }
    if (state.screen === "mission" && state.mission) {
      const target = state.mission.picked !== null
        ? screenEl.querySelector('.fb [data-action="next"]')
        : screenEl.querySelector(".opts [data-option]");
      if (target instanceof HTMLElement) target.focus();
    }
  };

  const say = (text) => { liveEl.textContent = text; };

  const finishMission = () => {
    const s = store.get();
    if (s.mission.failed) {
      store.set({ screen: "end", mission: null, lastResult: { win: false, mission: s.mission } });
      return;
    }
    const world = byId[s.mission.worldId];
    const score = finalScore(s.mission);
    const best = { ...s.best, [world.id]: Math.max(s.best[world.id] ?? 0, score) };
    saveBest(storage, best);
    store.set({ screen: "end", best, mission: null, lastResult: { win: true, score, mission: s.mission } });
  };

  const startMission = () => {
    const world = byId[store.get().selectedWorldId];
    if (!world) return;
    store.set({ screen: "mission", mission: createMission(world, random), lastResult: null });
  };

  const actions = {
    "open-map": () => store.set({ screen: "map" }),
    launch: startMission,
    abort: () => store.set({ screen: "map", mission: null }),
    next: () => {
      const s = store.get();
      if (s.screen !== "mission" || s.mission.picked === null) return;
      if (s.mission.failed || isLastStep(s.mission)) finishMission();
      else store.set({ mission: advanceStep(s.mission) });
    },
  };

  const chooseDisplay = (display) => {
    const s = store.get();
    if (s.screen !== "mission" || s.mission.picked !== null) return;
    const ratingIndex = s.mission.orders[s.mission.step][display];
    store.set({ mission: chooseStep(s.mission, ratingIndex) });
    const scenario = s.mission.scenarios[s.mission.step];
    const chosen = scenario.opts[ratingIndex];
    const labels = { best: "Best choice", ok: "Partly right", bad: "That went badly" };
    say(`${labels[chosen.r]}. ${chosen.fb}`);
  };

  root.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]");
    if (action) {
      const run = actions[action.dataset.action];
      if (run) run();
      return;
    }
    const option = e.target.closest("[data-option]");
    if (option) return chooseDisplay(Number(option.dataset.option));
    const world = e.target.closest("[data-world-id]");
    if (world && store.get().screen === "map") {
      chipToFocus = world.dataset.worldId;
      store.set({ selectedWorldId: world.dataset.worldId });
    }
  });

  root.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.closest("[data-world-id]")) {
      e.preventDefault();
      const world = e.target.closest("[data-world-id]");
      if (store.get().screen === "map") {
        chipToFocus = world.dataset.worldId;
        store.set({ selectedWorldId: world.dataset.worldId });
      }
    }
  });

  store.subscribe(render);
  render();
  return { store, actions };
}
