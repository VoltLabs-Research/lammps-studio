# Conventions

Copied from Pollium and trimmed to what this repo uses. When this file and the surrounding code
disagree, the surrounding code wins, then this file, then your habits.

## Formatting

- 4-space indentation, single quotes (JSX attributes too), semicolons.
- No space before an opening brace and none after control keywords: `if(cond){`, `for(const x of xs){`,
  `}catch(error){`, `class Run{`, `interface Run{`.
- One member per line in `interface` and object `type` bodies, never collapsed to one line.
- One property per line in object literals that carry a shape (state, config, a returned aggregate).
  Incidental literals (a decorator's options, a short spread update) may stay inline.
- Arrow functions for definitions: components, hooks, handlers, helpers. `function` only for
  hoisting or `this`.
- No `: void` / `: Promise<void>` return annotations except on bodyless declarations.
- A block body with an explicit `return` for anything that decides something. A guard clause, a
  blank line, then the real return; never a whole-body ternary.
- No inline object types in signatures, annotations or generics. Name the shape and put it in
  `contracts` (wire) or the module's `contracts/` / `domain/` folder (internal).

## Naming

| Thing | Convention | Example |
|---|---|---|
| React component | `PascalCase`, one per folder as `ComponentName/index.tsx`, default export | `RunChip/index.tsx` |
| Class | `PascalCase` file matching the class | `RunService.ts`, `DumpWatcher.ts` |
| Everything else in studio and shared/lammps | `kebab-case` file, never `camelCase` | `use-run.ts`, `parse-thermo.ts` |
| Non-class files in agent and readable | `camelCase`, matching the export (Pollium's api style) | `defineErrors.ts` |
| Controller | `<Name>Controller` in `modules/<name>/controllers/<Name>.ts` | `RunController` |
| Service | `<Name>Service` in `modules/<name>/services/<Name>.ts` | `RunService` |
| Request DTO | `<Verb><Noun>Input` in `contracts/<name>/http.ts` | `StartRunInput` |
| Error table | `<Domain>Errors` in `contracts/<name>/errors.ts`, codes `Domain::Cause` | `RunErrors` |

Imports inside a package use its alias (`@/…`). Imports across packages use the package name and
the exported path (`@lammps-studio/contracts/run/routes`). Shared packages use relative imports
internally so they can be consumed from source.

## Errors

Never `throw new Error`. Throw a factory bound with `defineErrors` to the table in contracts:
`throw RunError.AlreadyRunning()`. The global handler maps `RuntimeError` to its status and
`{ error: 'Run::AlreadyRunning' }`. Studio maps codes to copy with one `errorCopy` table typed against
the code union.

## Validation

Validate once, where untrusted data enters: the HTTP body (typia, as in Pollium's
`auto-validate-body`), a file parse, a WebSocket frame. Behind the boundary, trust the types.

## Tests

Vitest, run inside the package (`pnpm --filter <name> test`), never from the root. Parsers in
`shared/lammps` get table-driven tests with real LAMMPS output in `tests/fixtures/`. The agent gets
HTTP integration tests through `app.inject()`; Docker-dependent tests are skipped when
`docker info` fails.

## Commit messages

Conventional commits, subject line only, no body and no `Co-Authored-By` trailer. Types:
`feat`, `fix`, `chore`, `refactor`, `remove`. Scope is the package or area: `feat(agent): …`,
`fix(studio): …`, `chore(desktop): …`. Small commits: one coherent change each, every commit
typechecks.
