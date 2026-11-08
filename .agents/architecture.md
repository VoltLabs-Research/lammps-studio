# Architecture

LAMMPS Studio is a desktop app. The window is a React app (`studio`) that talks to an agent
(`@lammps-studio/agent`) over HTTP and one WebSocket channel. The agent owns everything that
touches a machine: folders, Docker, LAMMPS builds, runs, logs, dumps and the code-server editor.
On this computer the Electron shell (`desktop`) spawns the agent; on a cluster the same agent runs
there and Studio reaches it through an SSH tunnel.

```
desktop (Electron main) ── spawns ──► agent (127.0.0.1:<port>, token)
   │                                     │
   └── BrowserWindow ── studio ── HTTP + ws /events ──┘
                                         │
                                         └── runtime (Docker: build image, run lmp, stream log, watch dumps)
```

## Packages

| Package | Path | Owns |
|---|---|---|
| `@lammps-studio/contracts` | `packages/shared/contracts` | Every type that crosses the wire, the route tables (`<name>/routes.ts`), error tables (`<name>/errors.ts`) and the `/events` frames (`events/gateway.ts`). Zero dependencies. |
| `@lammps-studio/readable` | `packages/shared/readable` | The subset of Pollium's readable framework this repo uses: `Application`, `BaseController`, `@Route`, parameter decorators, `BaseGateway` + `@Channel`, `defineErrors`, `RuntimeError`, the logger, module discovery. Nothing for auth, Postgres, Redis, queues or S3. |
| `@lammps-studio/runtime` | `packages/shared/runtime` | LAMMPS in Docker, adopted from `VoltLabs-Research/lammps-runtime` (the npm 1.0.0 release ships no code). Builds an image per package set, runs `lmp` with MPI, streams stdout, watches dump files, emits typed events. Relative imports only, so it can be consumed from source. |
| `@lammps-studio/lammps` | `packages/shared/lammps` | Pure LAMMPS knowledge, no I/O: log line classification and thermo parsing, input script analysis (variables, computes, fixes, dumps, runs, the packages a style needs), entry script resolution, text dump parsing, the package catalog, build hashing, the run command preview. Used by the agent and by studio. |
| `@lammps-studio/agent` | `packages/infra/agent` | The lammps-agent: a readable `Application` with modules `machines`, `simulations`, `runs`, `builds`, `files`, `editor` and the `/events` gateway. Persists to JSON files on disk, never to a database. |
| `studio` | `packages/apps/studio` | The UI. React 19 + Vite + zustand. A 1:1 implementation of `design/mockup`. |
| `desktop` | `packages/apps/desktop` | The Electron shell: frameless window, the traffic lights drawn by studio, spawning and supervising the local agent, handing its URL and token to the renderer through the preload. |

## The one hard boundary

```
apps/*    → may import shared/* (never infra/*)
infra/*   → may import shared/*
shared/*  → may import only shared/* below it: contracts ← lammps, contracts ← readable; runtime imports nothing of ours
```

Inside a package the Pollium layering holds: `app/` (studio) or `core/` composes, `modules/` hold
features, `shared/` imports only `shared/`. No per-module `index.ts`, no registry file: the agent
discovers modules from `src/modules/<name>/{controllers,gateways,services}` and the controller
prefix is the folder name, so `runRoutes` paths start with `/runs`.

## On disk

The agent keeps one root per machine (`~/lammps-studio/simulations` on this computer). Each
simulation is a folder the user owns and can open in any editor:

```
<root>/<folder>/
├── main.in                     the entry script (any name; recorded in .studio/simulation.json)
├── potentials/…                anything the user adds
├── .studio/
│   ├── simulation.json         id, name, entry, createdAt
│   └── preview.bin             the last frame, decimated, in the frame wire format
└── runs/
    └── run-<n>/
        ├── run.json            RunConfig, state, progress, error, timestamps, buildHash
        ├── log.lammps          the full LAMMPS log
        ├── thermo.json         parsed ThermoSection[]
        └── *.lammpstrj, restart.*, …   whatever the script writes
```

Builds live in `~/lammps-studio/builds.json` on the machine (hash → image tag, packages, size,
timings). The hash is computed from the sorted package list, the version and the accelerator
options, so package order never changes it.

A run survives a Studio restart: `run.json` is written on every state change, containers carry the
labels `lammps-studio.simulation` and `lammps-studio.run`, and the agent reattaches to running
containers at boot.

## Launching the agent

`vite-node src/server.ts` (dev) or the bundled `agent.cjs` (packaged desktop). Environment:
`LAMMPS_STUDIO_ROOT` (default `~/lammps-studio`), `LAMMPS_AGENT_TOKEN` (generated when unset),
`LAMMPS_AGENT_PORT` (default `0`, a free port). It binds `127.0.0.1` only. Once listening it
prints one line to stdout, `AGENT_READY_PREFIX` followed by an `AgentReadyMessage` as JSON
(`contracts/desktop/bridge.ts`); the desktop shell reads that line and hands the endpoint to
studio through the preload as `window.studio: StudioBridge`. Studio in a plain browser (vite dev
without Electron) reads `VITE_AGENT_URL` and `VITE_AGENT_TOKEN` instead.

## The wire

- HTTP: `call(endpoint, { path, query, body })` on both sides, typed by the route tables. The
  envelope is `{ data }` / `{ error: 'Domain::Cause' }`. Every request carries
  `Authorization: Bearer <token>`; the WebSocket passes it as `?token=`.
- Live state goes through one WebSocket, `EVENTS_CHANNEL` (`/events`), never polling. Frames are
  `StudioEvent` from `contracts/events/gateway.ts`. Log lines and thermo rows are batched every
  100 ms. A new dump frame sends `run:frame` with its index; studio fetches the bytes.
- A dump frame on the wire (`runRoutes.frame`, `simulationRoutes.preview`) is binary, little
  endian: `u32 FRAME_MAGIC`, `u32 headerBytes`, the `FrameHeader` as UTF-8 JSON padded with spaces
  to a multiple of 4, then `Float32Array(atoms * 3)` positions, then one `Float32Array(atoms)` per
  name in `header.columns` (`type`, `c_cna`, `c_pe`, …) in that order.

## Run lifecycle

`queued` (Slurm only) → `building` (no image for the hash yet) → `starting` → `running` →
`stopping` → `cancelled` | `completed` | `failed`. A failure carries `RunError` with the LAMMPS
`ERROR` line and the step it happened near. Stop sends `timer timeout 0` semantics through a
graceful SIGTERM and waits; kill removes the container.
