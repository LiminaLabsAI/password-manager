---
type: Roadmap
---

# Roadmap

> **Start Date**: 2026-07-06

## Vision
A personal, end-to-end-encrypted password manager where the server is a dumb
ciphertext store — the smallest trustworthy thing that lets one user stop
reusing passwords, sync across devices, and survive master-password loss.

## Timeline
| Phase | Name | Status | Key Deliverables |
|-------|------|--------|------------------|
| 0 | Bootstrap Security Core (target v0.1.0) | Complete — released v0.1.0 (2026-07-06) | Next.js + TS scaffold; Postgres + Prisma; libsodium KDF + crypto helpers; auth signup/login via master password; empty encrypted vault round-trip; smoke test; CI |
| 1 | Vault CRUD + Generator (target v0.2.0) | Not Started | Encrypted entry CRUD (name, username, password, url, notes); password generator (length + char sets); vault sync with version counter (last-write-wins) |
| 2 | Daily-Use Hardening (target v0.3.0) | Not Started | Lock-on-timeout + on-demand lock; client-side search/filter; efficiency pass |
| 3 | Safety & Recovery (target v0.4.0) | Not Started | Export encrypted vault; recovery code generation + lost-password recovery flow; cross-device sync verification |

## Guiding Principles
1. Ship working software in every phase
2. Each phase leaves the project in a releasable state
3. Defer scope, not quality
4. No custom crypto, ever