import { WORLD_COUNT } from "../data/worlds.js";

export const totalPoints = (best) => Object.values(best).reduce((a, b) => a + b, 0);

export function headerHtml(state) {
  const stamps = Object.keys(state.best).length;
  return `<header class="top"><div class="brand">Landfall</div>
    <div class="hud"><span>Score <b>${totalPoints(state.best)}</b></span>
    <span>Stamps <b>${stamps}/${WORLD_COUNT}</b></span></div></header>`;
}
