# UI

The UI is settled: the user approved it screen by screen. Keep new work consistent with what studio
already has: same tokens (`studio/src/app/styles/tokens.css`), the shared components in
`studio/src/shared/components`, the same spacing, copy style, states and keyboard behaviour.

## Where each part lives

| Part | Module |
|---|---|
| Tokens, base styles, shared panel content (`section`, `kv`, `note`, `cmd`, `list`, `tabs`, `pane`) | `src/app/styles/`, `src/shared/styles/` |
| Window, dashboard and workspace layout: header, activity bar, panel host | `src/app/components/` |
| Simulations grid and cards, new simulation, machine filter | `src/modules/simulations/`, `src/modules/machines/` |
| Settings sheet (General, Machines, Builds) | `src/modules/settings/` |
| Command palette | `src/modules/palette/` |
| Run chip, Run/Stop button and menu, build progress, entry picker, failure banner, statusbar | `src/modules/run-control/` |
| Build and run panel | `src/modules/run-settings/` |
| Atom renderer, tool rail, display popover, frame bar, ruler, previews | `src/modules/viewport/` |
| Editor, Output, Charts, Variables, Files, Runs panels | `src/modules/<panel>/` |

Cards use the "Text + image" style: the caption leads with the state word, and anything that is
not running shows a greyscale, dimmed preview.

## Rules the user set while reviewing the UI

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

Screenshot the screen in every state it has, light and dark, at 1600×1000 and at 400 px wide
(`node packages/apps/studio/dev/shoot.ts plan.json` against the fake agent below), check it against
the rules above and the screens next to it, and check StrictMode logs no errors.

## Fake agent

`packages/apps/studio/dev/fake-agent.ts` serves the whole wire with sample data, so studio
can be built and screenshotted without Docker. Token `dev`, port 4100 (`FAKE_PORT` to change it).

```
pnpm --filter studio dev:fake
VITE_AGENT_URL=http://127.0.0.1:4100 VITE_AGENT_TOKEN=dev pnpm --filter studio dev
```

Started plain, it plays: Cu nanowire tension runs on from step 184,000 and streams `run:updated`,
`run:log`, `run:thermo` and `run:frame`, builds progress, and Run, Stop and Kill from studio go
through building, starting, running and the stop grace with the real agent's timing.

A scenario puts Cu nanowire tension into one run state and holds it still: fixed step, no
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
