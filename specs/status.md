---
type: Status
---

# Project Status

> **Last Updated**: 2026-07-06
> **Current Phase**: Phase 0 — Bootstrap Security Core (In Progress)
> **Latest Release**: None
> **Health**: On Track

## Summary

A personal, end-to-end-encrypted (E2EE) password manager web app. The user
unlocks one vault with a master password; the browser derives the encryption
key via Argon2id and encrypts/decrypts all entries client-side. The server is
a dumb ciphertext store: it holds an opaque encrypted blob per user plus an
opaque auth hash, never the master password or the key. The MVP (M1–M8)
ships account + master password, client-side crypto, encrypted vault CRUD,
last-write-wins sync, password generator, lock-on-timeout, client-side
search, and export + recovery. Stack: Next.js (App Router) + Postgres +
Prisma + libsodium-wrappers; single deploy unit. See
`specs/vision/project-charter.md` and `specs/planning/roadmap.md`.

## Completed Phases

| Phase | Name | Status | Released |
|-------|------|--------|---------|
| _(none yet)_ | | | |

## Ad-hoc / Patch Releases

> Releases NOT tied to a numbered phase — hotfixes, patch/audit releases,
> chores. Keep these out of the Completed Phases table. Work records live in
> `specs/adhoc/`. See Rule 14 for when ad-hoc work must become a phase instead.

| Version | Date | Type | Summary |
|---------|------|------|---------|
| _(none yet)_ | | | |

## Active Phase

> One row per active lane (Rule 15, ADR-0001). Each session's phase is the
> one bound to its branch; this table is the cross-lane overview and the
> fallback for branches that don't resolve. Lanes touch only their own row.

| Phase | Branch | Status | Progress |
|-------|--------|--------|----------|
| _(none — project not founded yet)_ | | | |

## Active Phase

| Phase | Branch | Status | Progress |
|-------|--------|--------|----------|
| 0 — Bootstrap Security Core | phase-0-bootstrap-security-core | In Progress | 4 / 4 groups |

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 0 | Bootstrap Security Core (v0.1.0) | Not Started | Next.js + TS scaffold; Postgres + Prisma; libsodium KDF + crypto helpers; auth signup/login via master password; empty encrypted vault round-trip; smoke test; CI |
| 1 | Vault CRUD + Generator (v0.2.0) | Not Started | Encrypted entry CRUD; password generator (length + char sets); vault sync with version counter (last-write-wins) |
| 2 | Daily-Use Hardening (v0.3.0) | Not Started | Lock-on-timeout + on-demand lock; client-side search/filter; efficiency pass |
| 3 | Safety & Recovery (v0.4.0) | Not Started | Export encrypted vault; recovery code generation + lost-password recovery flow; cross-device sync verification |

## Blockers

| ID | Description | Severity |
|----|-------------|----------|
| _(none)_ | | |

## Critical Items (P0)

| ID | Type | Description |
|----|------|-------------|
| _(none)_ | | |

## Next Actions

1. Run `/start-phase` to begin Phase 0 — Bootstrap Security Core (creates phase branch `phase-0-bootstrap-security-core`, executes groups 0–4 per `specs/phases/phase-0-bootstrap-security-core/plan.md`)

## Key Decisions Made

- **2026-07-06** — Founded as personal E2EE password manager; server is dumb ciphertext store. MVP scope M1–M8 defined; autofill, sharing, offline, 2FA, TOTP deferred. Stack Next.js + Postgres + libsodium-wrappers. See `specs/phases/phase-0-bootstrap-security-core/history.md`.

## Recent Changes

- **2026-07-06** — Project founded: vision, roadmap, and Phase 0 written via `/start-project`.
