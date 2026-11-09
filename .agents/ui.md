# UI

`design/mockup/` is the approved UI. Studio implements it 1:1: same layout, spacing, tokens, copy,
states, keyboard shortcuts and behaviour, with real data instead of the mockup's sample data.
Open `design/mockup/preview.html` in a browser to see it; the query params `?state=`, `?act=`,
`?theme=`, `?seq=` jump to any state (see the script at the end of `preview.html`).

## Where each part lives in the mockup

| Mockup file | What it holds | Port it to |
|---|---|---|
| `styles.css` | every token (`:root`, both dark blocks) and every component rule | `studio/src/app/styles/` tokens + one CSS file per component, same values |
| `index.html` | the markup of the window, dashboard, workspace and the icon set (`<symbol id="i-…">`, Lucide shapes) | components; icons come from `lucide-react` |
| `src/01-core.js` | helpers, sample `MACHINES`/`SIMS`/`PACKAGES`/`BUILDS`, a fake physics model | the catalog in `shared/lammps`; the samples and the physics are mock-only, drop them |
| `src/02-viewport.js` | the three.js atom renderer (impostor spheres, orbit, fit, box, axes gizmo, structure/energy/type colours, legend, frame ruler, dashboard previews) | `studio/src/modules/viewport/` |
| `src/03-panels.js` | the workspace panels: Editor, Output, Charts (bento), Variables, Files (Finder), Runs, Build and run | `studio/src/modules/<panel>/` |
| `src/04-dashboard.js` | the simulations grid and cards, the machine filter popup, menus, modals (connect a cluster, new simulation), the command palette, the Settings sheet | `studio/src/modules/{simulations,machines,settings,palette}/` |
| `src/05-run.js` | the run lifecycle chrome: run chip, Run/Stop split button and its menu, statusbar, viewport overlays (build progress, entry picker), the failure banner, display popover, every click and key handler | spread across the modules above |

The mockup bar at the top (View, Run state, Theme, Cards) is a mockup control, not part of the app.
Cards use variant 2, "Text + image": the caption leads with the state word and anything that is not
running shows a greyscale, dimmed preview.

## Rules the user set while reviewing the mockup

- No explanatory prose: no page leads, no chart captions, no info boxes that explain mechanics.
- No status dots for the normal state. State shows as text, and only when it matters.
- No sidebar on the dashboard. Machines are the "All machines" popup next to the status filters.
  Builds and machine details live in the Settings sheet (General, Machines, Builds).
- Settings and option lists look like macOS System Settings: grouped rounded lists, label left,
  popup / stepper / value right, short muted footnotes. No chip clouds, no coloured callouts.
- Files is a real Finder list view: columns, breadcrumb, double-click opens, right-click menu.
- Charts are a bento grid: big value, small label, sparkline; one featured tile.
- No floating glass cards over the 3D view. Only the tool rail and the axes gizmo float. The bottom
  bar spans edge to edge over the scene with a blurred translucent background.
- The run state is centred in the window header, text only, no border, ring or icon.
- One font in UI chrome (Geist). Geist Mono only for code, the log, commands, paths and hashes.
- No auth: no avatar, no account icon. No "Read the docs", no global running count.
- Progress in the viewport is a centred macOS-style block: title, muted subtitle, thin bar, one
  status line, details collapsed behind "Show details".

## Done means

Put the studio screen next to the mockup in the same state, light and dark, at 1600×1000 and at
400 px wide, and they match. Screenshot both with headless Chrome (see `design/mockup/preview.html`
for state params) and compare before calling a screen done.

## Fake agent

`packages/apps/studio/dev/fake-agent.ts` serves the whole wire with the mockup's data, so studio
can be built and screenshotted without Docker. Token `dev`, port 4100 (`FAKE_PORT` to change it).

```
pnpm --filter studio dev:fake
VITE_AGENT_URL=http://127.0.0.1:4100 VITE_AGENT_TOKEN=dev pnpm --filter studio dev
```

Started plain, it plays: Cu nanowire tension runs on from step 184,000 and streams `run:updated`,
`run:log`, `run:thermo` and `run:frame`, builds progress, and Run, Stop and Kill from studio go
through building, starting, running and the stop grace like the mockup.

A scenario puts Cu nanowire tension into one mockup state and holds it still: fixed step, no
ticking. Add `FAKE_LIVE=1` to let it play forward from there. Run and Stop from studio set the
agent playing, so a started run goes on and a stop finishes its grace.

| Scenario | Run 3 of Cu nanowire tension |
|---|---|
| `idle` | not started; runs 1 and 2 only |
| `building` | waiting for a MANYBODY, OPENMP, EXTRA-COMPUTE build at 36% |
| `running` | step 184,000 of 500,000 (the default) |
| `stopping` | step 184,000, stop requested |
| `finished` | 500,000 steps, completed |
| `failed` | neighbor list overflow near step 231,400 |
| `noscript` | as `running`; open Water box, which has no entry script in every scenario |

```
FAKE_SCENARIO=failed pnpm --filter studio dev:fake
curl -X POST -H 'Authorization: Bearer dev' -d '{"scenario":"stopping","live":true}' http://127.0.0.1:4100/dev/scenario
curl -H 'Authorization: Bearer dev' http://127.0.0.1:4100/dev/scenario
```

Switching resets every simulation, build and folder to the seed and broadcasts the new state.
Studio merges log lines, thermo rows and frames by index, so moving the same run forward (running
to finished or failed) updates an open page; moving it back needs a reload. The editor iframe gets
`/dev/editor/<simulationId>`, a plain page showing the entry script.
