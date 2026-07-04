# Boss for a Day

A walkable WebXR business-sim built with the [Immersive Web SDK (IWSDK)](https://github.com/meta-quest/immersive-web-sdk) for Virginia Ventures Module 8. Pick a shop — a Richmond bakery, a Virginia Beach surf shop, or an Arlington repair shop — and run it for a day: make a growth move, set prices, stock the shelves, handle the rush, answer a complaint, weigh a big order, and close out. The shop owner mentors you, three live meters track how you are doing, real cash moves on every decision, and a daily report reflects your choices back with net profit and a debrief.

Aligned to Virginia SOL VS.13 and economics standards (opportunity cost, scarcity, producers/consumers). Runs in any WebXR-capable browser on desktop (mouse + keyboard) and enters Immersive VR on a headset.

## Play

- **Walk:** `WASD` / arrow keys (or thumbstick in VR)
- **Look:** right-mouse drag (the headset owns the view in VR)
- **Interact:** left-click panels and cards (or point-and-trigger in VR)

Walk up to the shop owner and the counter/floor stations to trigger each part of the day. The three meters — Customer Satisfaction, Business Profit, and Owner's Instinct — respond to your decisions, and the register (top-left and on the in-VR dashboard) shows your cash.

## Develop

Requires Node `>=20.19` (or `>=22.12`).

```bash
npm install
npm run dev        # start the IWSDK dev server (HTTPS via mkcert)
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
npm run preview    # preview the production build
```

UI panels are authored in `ui/*.uikitml` and compiled to `public/ui/*.json` at build time by the Vite UIKitML plugin. Game logic lives in `src/` (`index.ts` is the world entry point; `environment.ts`, `shops.ts`, and `sfx.ts` provide the scene, shop content packs, and audio). The whole day's economy is balanced from the single `ECONOMY` object in `shops.ts`.

## Deploy

Pushing to `main` triggers the GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the project and publishes `dist/` to GitHub Pages. The Vite `base` is set to `'./'` so the site works from a project-page subpath.

## Results export (for teachers / LMS integration)

When a student reaches the daily report, the run is saved and broadcast so a course shell can capture it. Three surfaces carry the **same payload**:

- **`localStorage["bossForADay:last"]`** — the most recent run.
- **`localStorage["bossForADay:history"]`** — a JSON array of up to the last 20 runs.
- **`window.parent.postMessage(...)`** — posted to the embedding frame as `{ type: "bossForADay:result", payload }` (origin `"*"`; the parent should verify `event.data.type`). Only fires when the game is embedded in an iframe.

A student can also tap **Copy My Results** on the report to put a plain-text version on the clipboard for pasting into a discussion post.

### Payload schema (`schema: 1`)

```jsonc
{
  "app": "boss-for-a-day",
  "schema": 1,
  "timestamp": "2026-07-04T18:30:00.000Z", // ISO 8601, UTC
  "shop":   { "id": "bakery", "name": "Sweet Capital Bakery" }, // id: "bakery" | "surf" | "repair"
  "player": "Ada",              // chosen character name
  "personality": "Boss Material", // the report's earned title
  "meters": { "satisfaction": 68, "profit": 72, "instinct": 60 }, // each 0–100
  "money":  { "start": 150, "in": 347, "out": 133, "net": 214 },  // whole dollars; net = in - out
  "decisions": [               // in play order, one per choice made
    { "title": "Morning growth move", "choice": "Bought the ad flyer", "score": 6 }
    // ...prices, stock, the three owner questions, rival, complaint, leftovers, big order
  ]
}
```

`score` is a decision's net effect on the meters (higher is a better call); the report uses it to pick the "best call of the day" and the "one thing to try next time." This schema is intended as the seed for future xAPI/SCORM wiring — keep the `schema` version bumped if the shape changes.

## Tech

[IWSDK](https://github.com/meta-quest/immersive-web-sdk) (ECS + reactive signals over Three.js) · [Vite](https://vitejs.dev/) · TypeScript · WebXR.
