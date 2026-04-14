# TwitterAPI CLI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a TypeScript-first TwitterAPI.io CLI with stable machine-readable output, clear pagination ergonomics, and an architecture that can grow from read-only endpoints into authenticated write flows.

**Architecture:** Use Commander for command parsing, a typed config resolver for flags/env/file merging, a small HTTP client layer, and one output layer for JSON contracts. Keep the public surface modular by command group (`user`, `tweet`, `auth`) instead of adopting a heavy plugin framework too early.

**Tech Stack:** Node.js 20+, TypeScript, pnpm, Commander, Zod, tsup, tsx, Vitest, Biome.

---

## Research notes

### From X/Twitter
- The useful signal was not framework dogma; it was repeated emphasis on:
  - clean folder structure
  - strong typing
  - small focused functions
  - consistent scripts (`dev`, `test`, `lint`, `format`)
  - stable onboarding and docs
- Search quality on X was noisy, so X is better for rough sentiment than source-of-truth architecture.

### From broader web research
- Commander remains the best default for a TypeScript CLI unless we need a full plugin platform.
- Modern Node/TypeScript package guidance strongly favors:
  - strict TypeScript
  - light config
  - `bin` + shebang for npm/npx execution
  - `tsup` for builds
  - `Vitest` for tests
  - `Biome` or similarly consolidated tooling for formatting/linting
- oclif is strong for very large CLIs, but it adds framework overhead we do not need for v1.

## Initial milestone

Ship a skeleton that includes:
- package/build/test/lint setup
- root CLI with `user`, `tweet`, and `auth`
- shared config resolution
- predictable global output flags
- minimal placeholder command handlers
- tests for command registration and config resolution

## Planned command map

- `user`
  - `info`
  - `search`
  - `tweets`
  - `followers`
  - `following`
- `tweet`
  - `get`
  - `search`
  - `replies`
  - `quotes`
  - `retweeters`
  - `thread`
- `auth`
  - `whoami`
  - later `login-cookie validate`

## Cross-cutting rules

- Output defaults to JSON.
- Add JSONL for bulk/stream-friendly commands.
- Errors use one envelope shape.
- Pagination flags should be uniform across commands.
- Read-only API key workflows and authenticated `login_cookie` workflows must stay clearly separated.

## Next implementation tasks

1. Make the scaffold compile and pass tests.
2. Add HTTP client and typed error model.
3. Implement `user info` against the live API.
4. Add shared field filtering and pagination primitives.
