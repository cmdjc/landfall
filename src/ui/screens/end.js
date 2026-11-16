import { WORLD_COUNT, byId } from "../../data/worlds.js";
import { FLAWLESS_BONUS, MAX_WORLD_POINTS, STAT_KEYS, STAT_NAMES, rankFor } from "../../game/rules.js";
import { headerHtml, totalPoints } from "../header.js";

const landedLine = (d) =>
  d.stamp === "Landed" ? "You landed on"
    : d.stamp === "Crossed" ? "You crossed"
      : d.stamp === "Reached" ? "You reached"
        : "You descended into";

export const endScreen = {
  render(el, state) {
    const r = state.lastResult;
    if (!r) return;
    const d = byId[r.mission.worldId];
    const m = r.mission;
    let h = headerHtml(state);

    if (r.win) {
      const stamps = Object.keys(state.best).length;
      const total = totalPoints(state.best);
      const remaining = WORLD_COUNT - stamps;
      h += `<section class="card center"><div class="stamp pop" style="color:${d.color}"><div><span>${d.stamp}</span><b>${d.name}</b></div></div>
    <h2 tabindex="-1" data-screen-title>${landedLine(d)} ${d.to}</h2>
    <p class="score" style="margin:14px 0 4px">${r.score} <span class="muted" style="font-size:16px;font-family:var(--ui);font-weight:400">of ${MAX_WORLD_POINTS}</span></p>
    <p class="muted">${m.points} from decisions${m.flawless ? `, plus ${FLAWLESS_BONUS} for a flawless run` : ""}</p>
    <div class="dossier" style="text-align:left"><div class="did"><b>Take home:</b> ${d.fact}</div></div>
    ${stamps === WORLD_COUNT
      ? `<p><b>All ${WORLD_COUNT} stamps collected.</b> Total ${total} points. Rank: ${rankFor(total, WORLD_COUNT)}.</p>`
      : `<p class="muted">${remaining} ${remaining === 1 ? "world" : "worlds"} left to visit.</p>`}
    <div class="actions"><button class="btn" data-action="open-map">Back to the map</button><button class="btn ghost" data-action="launch">Fly it again</button></div></section>`;
    } else {
      const lost = STAT_KEYS.find((k) => m.meters[k] <= 0);
      const craft = d.type === "Star" || d.type === "Gas giant" || d.type === "Ice giant" ? "probe" : "lander";
      h += `<section class="card center"><div class="stamp fail pop"><div><span>Mission lost</span><b>${d.name}</b></div></div>
    <h2 tabindex="-1" data-screen-title>Your ${craft} didn't make it</h2>
    <p class="muted" style="margin-top:8px">${lost ? STAT_NAMES[lost] : "A meter"} reached zero. Study the dossier and try again.</p>
    <div class="actions"><button class="btn" data-action="launch">Try again</button><button class="btn ghost" data-action="open-map">Read the dossier</button></div></section>`;
    }

    el.innerHTML = h;
  },
};
