// Building and stepping through a mission. Pure; the random source is
// injected (a function returning [0,1)) so tests and e2e can be deterministic.
import { shuffle } from "../core/rng.js";
import { DECISIONS_PER_MISSION, START_METER, applyChoice } from "./rules.js";

// orders[step] maps a display position to the option's rating index
// (0 = best). Each mission shows the best answer at the top, middle,
// and bottom exactly once, in random order, so position never gives it away.
export function answerOrders(random) {
  const bestSlots = shuffle([0, 1, 2], random);
  return bestSlots.map((bestSlot) => {
    const others = shuffle([1, 2], random);
    const order = [];
    let next = 0;
    for (let i = 0; i < 3; i++) order[i] = i === bestSlot ? 0 : others[next++];
    return order;
  });
}

export function createMission(world, random = Math.random) {
  const scenarios = shuffle(world.scenarios, random)
    .slice(0, Math.min(DECISIONS_PER_MISSION, world.scenarios.length));
  return {
    worldId: world.id,
    step: 0,
    scenarios,
    orders: answerOrders(random),
    meters: { hull: START_METER, air: START_METER, power: START_METER },
    points: 0,
    flawless: true,
    failed: false,
    picked: null,
  };
}

export const currentScenario = (m) => m.scenarios[m.step];
export const isAnswered = (m) => m.picked !== null;
export const isLastStep = (m) => m.step === m.scenarios.length - 1;

export function choose(m, ratingIndex) {
  if (isAnswered(m)) return m;
  const scenario = currentScenario(m);
  return { ...applyChoice(m, scenario.stat, scenario.opts[ratingIndex].r), picked: ratingIndex };
}

export function advance(m) {
  if (!isAnswered(m) || isLastStep(m)) return m;
  return { ...m, step: m.step + 1, picked: null };
}
