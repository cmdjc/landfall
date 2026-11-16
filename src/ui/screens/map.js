import { WORLDS, WORLD_COUNT, byId } from "../../data/worlds.js";
import { MAX_WORLD_POINTS, rankFor } from "../../game/rules.js";
import { headerHtml, totalPoints } from "../header.js";
import { mapSVG } from "../../gfx/map.js";

export const mapScreen = {
  render(el, state) {
    const sel = state.selectedWorldId && byId[state.selectedWorldId];
    const stamps = Object.keys(state.best).length;
    const complete = stamps === WORLD_COUNT;
    let h = headerHtml(state);
    if (complete) {
      const total = totalPoints(state.best);
      h += `<div class="banner"><h3>Grand tour complete</h3><p class="muted" style="margin:4px 0 0">You earned all ${WORLD_COUNT} stamps with ${total} of ${WORLD_COUNT * MAX_WORLD_POINTS} points. Rank: ${rankFor(total, WORLD_COUNT)}. Replay any world to improve your score.</p></div>`;
    }
    h += `<div class="mapwrap">${mapSVG({ selectedId: state.selectedWorldId, best: state.best })}</div>`;
    h += `<div class="chips">${WORLDS.map((d) => `<button class="chip${state.selectedWorldId === d.id ? " sel" : ""}" data-world-id="${d.id}"><i style="background:${d.color}"></i>${d.name}${state.best[d.id] != null ? '<span class="tick" aria-label="visited">✓</span>' : ""}</button>`).join("")}</div>`;
    h += `<section id="dossier" class="card dossier" aria-live="polite">`;
    if (!sel) {
      h += `<h3 tabindex="-1" data-screen-title>Choose a destination</h3><p class="muted" style="margin-top:8px">Tap a world on the map or in the list to read its dossier before you launch.</p>`;
    } else {
      h += `<h2 tabindex="-1" data-screen-title>${sel.name}</h2><p class="tag">${sel.type}${state.best[sel.id] != null ? `. Best run: ${state.best[sel.id]} of ${MAX_WORLD_POINTS}` : ""}</p>
   <dl><dt>Atmosphere</dt><dd>${sel.atm}</dd><dt>Temperature</dt><dd>${sel.temp}</dd><dt>Landscape</dt><dd>${sel.land}</dd><dt>Gravity</dt><dd>${sel.grav}</dd><dt>Day length</dt><dd>${sel.day}</dd></dl>
   <div class="did"><b>Did you know?</b> ${sel.fact}</div>
   ${sel.note ? `<div class="note">${sel.note}</div>` : ""}
   <p style="margin-top:14px"><button class="btn" data-action="launch">Launch to ${sel.to}</button></p>`;
    }
    h += "</section>";
    el.innerHTML = h;
  },
};
