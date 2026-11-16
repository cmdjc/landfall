# Landfall

A pocket tour of the solar system. You fly a small probe to eleven worlds — the Sun, the planets, our Moon, and the asteroid belt — read the dossier, and try to land. Each landing throws three situations at you, and each choice you make keeps your hull, air, and power meters alive or burns them down. Land well and you collect a stamp. Collect all eleven and you find out your rank.

Play it at https://cmdjc.github.io/landfall/

## How to play

Pick a world from the map to read its dossier: atmosphere, temperature, landscape, gravity, and day length, plus one fact to remember. Launch when you're ready. During the flight you get three decisions. Every option sounds plausible, but only one is the smart move for that world — the others are common misconceptions, and they cost you hull integrity, air, or power. If any meter reaches zero, the mission is lost. Finish all three decisions and you land, scoring up to 40 points, with a bonus for an undamaged run.

Every world you land on earns a stamp on the map, and your best score per world is kept. Perfect runs across all eleven worlds make you a Grand navigator.

## Controls

Everything works with a tap. The game can also be played without a mouse from start to finish: Tab reaches every control, Enter presses it. On the map, Tab steps through the worlds in orbit order; during a landing, the option buttons take focus in turn.

## Running it locally

Install the dependencies from the lock file with `npm ci`.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server. Add `-- --host` to open it on a phone. |
| `npm run build` | Writes a static build to `dist/`. |
| `npm run preview` | Serves the built game locally. |
| `npm run test` | Runs the unit tests. |
| `npm run lint` | Runs ESLint over the whole project. |
| `npm run e2e` | Builds the game and runs the browser tests in Brave. |
| `npm run check` | Runs lint, the unit tests, and the build. |

## Tests

The unit tests cover the seeded random number generator, the mission rules (damage, points, ranks), the mission builder, the world content schema (every option set is validated for length parity and rating order), persistence, and the screens through a fake DOM.

The e2e tests build the game and drive it in a real headless Brave over the Chrome DevTools Protocol: they play all eleven worlds through real buttons, check that scores survive a reload, and play a mission on a phone-sized viewport.

## Debug flag

Add `?e2e=1` to the game URL to expose `window.__landfall`, a hook the e2e tests use to find the best answer. Without it, the game exposes no globals.

## Layout

All world content lives in `src/data/worlds.js`: eleven worlds, each with a dossier and a pool of at least five scenarios covering hull, air, and power. A scenario is one question with three options — best, partly right, and a plausible mistake. The rules (damage, points, ranks) live in `src/game/`, the seeded scenery painting in `src/gfx/`, and the screens in `src/ui/`. To add a world, copy an entry in `worlds.js` and add it to the list; the schema tests will tell you if the content is not valid.

## Deployment

A GitHub Actions workflow (`.github/workflows/pages.yml`) deploys the game to GitHub Pages on each push to `main`. It runs `npm run check` first. The e2e tests do not run there, because they need a local Brave.

## Credits

Created by Commander. Built with GLM, by Z.ai.

## License

Landfall is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
