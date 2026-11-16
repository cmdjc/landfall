// Mission rules: meters, damage, points, rank. Pure — no DOM, no storage.

export const STAT_NAMES = { hull: "Hull", air: "Air", power: "Power" };
export const STAT_KEYS = ["hull", "air", "power"];
export const DMG = { best: 0, ok: 20, bad: 60 };
export const PTS = { best: 10, ok: 5, bad: 0 };
export const FLAWLESS_BONUS = 10;
export const START_METER = 100;
export const DECISIONS_PER_MISSION = 3;
export const MAX_WORLD_POINTS = DECISIONS_PER_MISSION * PTS.best + FLAWLESS_BONUS; // 40

export const clampMeter = (v) => Math.max(0, Math.min(START_METER, v));

const failedMeters = (meters) => STAT_KEYS.some((k) => meters[k] <= 0);

export function applyChoice(mission, stat, rating) {
  const meters = { ...mission.meters, [stat]: clampMeter(mission.meters[stat] - DMG[rating]) };
  return {
    ...mission,
    meters,
    points: mission.points + PTS[rating],
    flawless: mission.flawless && rating === "best",
    failed: failedMeters(meters),
  };
}

export const finalScore = (mission) =>
  mission.points + (mission.flawless ? FLAWLESS_BONUS : 0);

export function rankFor(totalPoints, worldCount) {
  const share = totalPoints / (worldCount * MAX_WORLD_POINTS);
  if (share >= 0.9) return "Grand navigator";
  if (share >= 0.7) return "Commander";
  if (share >= 0.4) return "Pilot";
  return "Trainee";
}
