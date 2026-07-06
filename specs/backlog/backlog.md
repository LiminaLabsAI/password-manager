---
type: Backlog
---

# Backlog

> **Last Updated**: 2026-07-06

---

## Priority Levels

| Level | Meaning |
|-------|---------|
| **P0** | Critical — blocks current phase |
| **P1** | High — address in current/next phase |
| **P2** | Medium — within 2 phases |
| **P3** | Low — nice to have |

**Status**: `open` | `in-progress` | `resolved` | `deferred` | `deprecated`

---

## Bugs

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | Post-founding Next.js scaffold hook | P3 | open | unassigned | `/start-project` (or `/start-phase` group-0 preamble) could lay down a Next.js scaffold in one shot when `momentum init` has pre-populated the repo with `.opencode/`, `.momentum/`, `AGENTS.md`, etc. — `create-next-app` refuses pre-populated dirs, forcing manual scaffolding. See Phase 0 retrospective. |
| ENH-002 | Document non-Docker Postgres dev fallback | P3 | open | unassigned | `docs/developer-guide.md` should note a Homebrew/apt Postgres path for environments without Docker, since `prisma migrate deploy` and the smoke test need a running DB. See Phase 0 retrospective. |
