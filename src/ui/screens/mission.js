import { byId } from "../../data/worlds.js";
import { isLastStep } from "../../game/mission.js";
import { DMG, PTS, STAT_KEYS, STAT_NAMES } from "../../game/rules.js";
import { drawView } from "../../gfx/scenery.js";
import { headerHtml } from "../header.js";

// meters must re-render per state change; aria-labels keep them readable.
const meterHtml = (m) => STAT_KEYS.map((k) => {
  const v = Math.max(0, m.meters[k]);
  return `<div class="meter${v <= 40 ? " low" : ""}" id="m-${k}" aria-label="${STAT_NAMES[k]} ${v} of 100">
    <div class="row"><span>${STAT_NAMES[k]}</span><b>${v}</b></div>
    <div class="bar"><div class="fill" style="width:${v}%"></div></div></div>`;
}).join("");

export const missionScreen = {
  render(el, state) {
    const m = state.mission;
    if (!m) return;
    const d = byId[m.worldId];
    const s = m.scenarios[m.step];
    const done = m.picked !== null;
    const chosen = done ? s.opts[m.picked] : null;
    const best = s.opts[0];
    const order = m.orders[m.step];

    let scene = `<div class="pips" role="img" aria-label="Decision ${m.step + 1} of ${m.scenarios.length}">${m.scenarios.map((_, i) => `<span class="${i <= m.step ? "on" : ""}"></span>`).join("")}<em>${s.tag}</em></div><p class="q">${s.text}</p><div class="opts">`;
    order.forEach((k, i) => {
      const o = s.opts[k];
      let c = "opt";
      if (done) {
        if (k === 0) c += " best";
        if (k === m.picked && k !== 0) c += ` chosen ${o.r}`;
      }
      scene += `<button class="${c}" data-option="${i}" ${done ? "disabled" : ""}>${o.t}</button>`;
    });
    scene += "</div>";

    if (done) {
      const lbl = { best: "Best choice", ok: "Partly right", bad: "That went badly" }[chosen.r];
      const dm = DMG[chosen.r];
      scene += `<div class="fb"><div class="res ${chosen.r}">${lbl}</div><div class="dmg">${dm ? `${STAT_NAMES[s.stat]} −${dm}. ` : "No damage. "}${PTS[chosen.r]} points</div><p>${chosen.fb}</p>`;
      if (chosen.r !== "best") scene += `<p><b>Best choice:</b> ${best.t}. ${best.fb}</p>`;
      scene += `<button class="btn" data-action="next">${m.failed ? "See what happened" : isLastStep(m) ? "Finish landing" : "Continue"}</button></div>`;
    }

    el.innerHTML = `${headerHtml(state)}
<section class="mission"><div class="mtop"><div><h2 tabindex="-1" data-screen-title>${d.name}</h2><div class="muted" style="font-size:14px">${d.type}</div></div><button class="btn ghost small" data-action="abort">Abort mission</button></div>
<div class="meters">${meterHtml(m)}</div>
<canvas class="view" id="view" role="img" aria-label="View from your lander window"></canvas>
<div class="card scene" id="scene">${scene}</div></section>`;

    drawView(el.querySelector("#view"), d, m.step);
    // The answered option button is gone from the DOM; move focus to the
    // next control instead of dropping it back to the document.
    if (done) {
      const nextBtn = el.querySelector('.fb [data-action="next"]');
      if (nextBtn instanceof HTMLElement) nextBtn.focus();
    }
  },
};
