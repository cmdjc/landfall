// The solar system orbit map, as an SVG string. Pure: state goes in,
// markup comes out. The layout table and belt dots match the prototype.
import { rngf } from "../core/rng.js";
import { byId } from "../data/worlds.js";

const MAP = [
  { id: "mercury", r: 28, a: 30, s: 4, side: "r" },
  { id: "venus", r: 46, a: 250, s: 6, side: "l" },
  { id: "earth", r: 66, a: 120, s: 6.5, side: "l" },
  { id: "mars", r: 86, a: 330, s: 5, side: "r" },
  { id: "jupiter", r: 130, a: 200, s: 12, side: "r" },
  { id: "saturn", r: 152, a: 60, s: 9, side: "r", rings: true },
  { id: "uranus", r: 172, a: 290, s: 8, side: "r" },
  { id: "neptune", r: 192, a: 150, s: 8, side: "r" },
];

export function mapSVG({ selectedId, best }) {
  const rad = (a) => a * Math.PI / 180;
  const seen = (id) => best[id] != null;
  const cls = (id) => `b${selectedId === id ? " sel" : ""}${seen(id) ? " vis" : ""}`;
  let s = `<svg viewBox="0 0 400 400" role="group" aria-label="Solar system map. Select a destination."><defs><radialGradient id="sg"><stop offset="0" stop-color="#FFF6D0"/><stop offset=".5" stop-color="#FFB547"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient></defs>`;
  [28, 46, 66, 86, 130, 152, 172, 192].forEach((r) => s += `<circle cx="200" cy="200" r="${r}" fill="none" stroke="rgba(255,255,255,.13)"/>`);
  const rr = rngf(42);
  s += `<g class="${cls("belt")}" data-world-id="belt" tabindex="0" role="button" aria-label="Asteroid belt"><circle cx="200" cy="200" r="106" fill="none" stroke="transparent" stroke-width="20" pointer-events="stroke"/>`;
  for (let i = 0; i < 170; i++) {
    const a = rr() * 6.283, q = 98 + rr() * 16;
    s += `<circle class="bd" cx="${(200 + q * Math.cos(a)).toFixed(1)}" cy="${(200 + q * Math.sin(a)).toFixed(1)}" r="${(0.7 + rr() * 1.1).toFixed(1)}" fill="#A19B93" pointer-events="none"/>`;
  }
  s += `<text class="lab" x="200" y="328" text-anchor="middle">Asteroid belt</text><circle class="done" cx="236" cy="316" r="4"/></g>`;
  s += `<g class="${cls("sun")}" data-world-id="sun" tabindex="0" role="button" aria-label="The Sun"><circle cx="200" cy="200" r="26" fill="url(#sg)"/><circle cx="200" cy="200" r="12" fill="#FFD36B" pointer-events="none"/><circle class="ring" cx="200" cy="200" r="19"/><circle cx="200" cy="200" r="22" fill="transparent"/><text class="lab" x="200" y="176" text-anchor="middle">Sun</text><circle class="done" cx="214" cy="186" r="4"/></g>`;
  MAP.forEach((p) => {
    const d = byId[p.id], x = 200 + p.r * Math.cos(rad(p.a)), y = 200 + p.r * Math.sin(rad(p.a));
    const lx = p.side === "r" ? x + p.s + 4 : x - p.s - 4, an = p.side === "r" ? "start" : "end";
    s += `<g class="${cls(p.id)}" data-world-id="${p.id}" tabindex="0" role="button" aria-label="${d.name}">`;
    if (p.rings) s += `<ellipse cx="${x}" cy="${y}" rx="${p.s * 1.9}" ry="${p.s * 0.55}" transform="rotate(-20 ${x} ${y})" fill="none" stroke="#D9C48C" stroke-width="1.6" pointer-events="none"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${p.s}" fill="${d.color}" pointer-events="none"/><circle class="ring" cx="${x}" cy="${y}" r="${p.s + 5}"/><circle cx="${x}" cy="${y}" r="${Math.max(p.s + 7, 15)}" fill="transparent"/>`;
    s += `<text class="lab" x="${lx.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${an}">${d.name}</text><circle class="done" cx="${(x + p.s).toFixed(1)}" cy="${(y - p.s).toFixed(1)}" r="3.5"/></g>`;
    if (p.id === "earth") {
      const mx = x + 14, my = y + 8;
      s += `<g class="${cls("moon")}" data-world-id="moon" tabindex="0" role="button" aria-label="The Moon"><circle cx="${mx}" cy="${my}" r="2.6" fill="#D0D0D0" pointer-events="none"/><circle class="ring" cx="${mx}" cy="${my}" r="7"/><circle cx="${mx}" cy="${my}" r="9" fill="transparent"/><text class="lab" x="${mx + 6}" y="${my + 14}" text-anchor="start">Moon</text><circle class="done" cx="${mx + 3}" cy="${my - 3}" r="3"/></g>`;
    }
  });
  return s + "</svg>";
}
