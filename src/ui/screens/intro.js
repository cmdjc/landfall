import { rngf } from "../../core/rng.js";
import { byId } from "../../data/worlds.js";
import { drawOrbit } from "../../gfx/scenery.js";
import { headerHtml } from "../header.js";

export const introScreen = {
  render(el, state) {
    el.innerHTML = `${headerHtml(state)}
<section class="intro">
  <canvas class="hero" id="hero" aria-hidden="true"></canvas>
  <h1 tabindex="-1" data-screen-title>Landfall</h1>
  <p class="lede">Visit every world in the solar system and find out what it's really like to stand there, or to try.</p>
  <ul>
    <li>Pick a destination on the map and read its dossier.</li>
    <li>Make three decisions on the way down. They test what you know about the atmosphere, temperature and landscape.</li>
    <li>Keep your hull, air and power above zero to earn a stamp.</li>
  </ul>
  <p class="muted">Some worlds, like the Sun and Jupiter, have no ground at all. You'll learn what happens to a probe that tries.</p>
  <button class="btn" data-action="open-map">Open the map</button>
</section>`;
    drawOrbit(el.querySelector("#hero"), byId.saturn.v, rngf(11));
  },
};
