# LAMMPS Studio — agent guide

pnpm monorepo, Pollium's architecture. Shared: `packages/shared/contracts` (wire types, route and
error tables, consumed by all), `packages/shared/readable` (the HTTP/WS framework, a subset of
Pollium's), `packages/shared/runtime` (LAMMPS in Docker), `packages/shared/lammps` (pure LAMMPS
parsing and knowledge). Infra: `packages/infra/agent` (the lammps-agent, Fastify via readable, run
via `vite-node`, no build step in dev). Apps: `packages/apps/studio` (the React + Vite UI) and
`packages/apps/desktop` (the Electron shell that spawns the local agent and hosts studio).

This file is a router, not a manual. Read the file that matches your task before writing code.

| If you are going to… | Read |
|---|---|
| Understand how the pieces fit, the on-disk layout, the wire, the run lifecycle | [.agents/architecture.md](.agents/architecture.md) |
| Write any code (formatting, naming, errors, validation, tests, commits) | [.agents/conventions.md](.agents/conventions.md) |
| Build or change anything the user sees | [.agents/ui.md](.agents/ui.md), then `design/mockup/` |
| Know the quality bar — what not to write, comments included | [.agents/anti-slop.md](.agents/anti-slop.md) |

## Things that will otherwise burn an hour

- **Run tests inside the package** (`pnpm --filter <name> test`), never Vitest from the root.
- **Shared packages are consumed from source.** They use relative imports internally; an `@/` alias
  inside `shared/*` breaks every consumer.
- **The agent needs Docker.** Runtime and agent tests that start containers skip themselves when
  `docker info` fails; don't mock Docker to make them pass.
- **The mockup is the spec, not a suggestion.** Port its CSS values as they are; don't restyle.
