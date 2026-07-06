---
type: Phase Tasks
---

# Phase 0 — Bootstrap Security Core — Tasks

> One task per checklist item. Mark `[x]` when a verification command has
> produced passing output for that item in this session (Rule 12).

## Group 0 — Project scaffold
- [x] Initialize Next.js (App Router) + TypeScript + Tailwind CSS
- [x] Configure ESLint, `tsc --noEmit`, Vitest
- [x] Add CI workflow (lint + typecheck + test on push)
- [x] Commit: `chore: scaffold Next.js + TS + Tailwind + Vitest + CI`

## Group 1 — Data layer
- [x] Add Prisma + Postgres connection (docker compose for local dev)
- [x] Author `users` + `vaults` schema and first migration
- [x] Commit: `feat(db): Prisma schema + migrations for users and vaults`

## Group 2 — Crypto primitives
- [x] Integrate libsodium-wrappers; ready-gate helper
- [x] KDF: master password → Argon2id → (vault key, auth hash) via `crypto_kdf`
- [x] Symmetric encrypt/decrypt helpers (XChaCha20-Poly1305)
- [x] Unit tests: round-trip, wrong-password, ciphertext≠plaintext, auth-hash ≠ vault-key, KDF wall-time bounded
- [x] Commit: `feat(crypto): Argon2id KDF + XChaCha20-Poly1305 helpers with tests`

## Group 3 — Auth + vault round-trip
- [x] Signup endpoint (POST email + auth_hash + empty encrypted vault)
- [x] Login endpoint (verify auth_hash; return ciphertext + version)
- [x] Save-vault endpoint (PUT ciphertext + version; last-write-wins)
- [x] Client pages: `/signup`, `/login`, `/vault` (empty-vault state)
- [x] Wire end-to-end empty-vault round-trip through the UI
- [x] Commit: `feat(auth): signup + login + empty encrypted vault round-trip`

## Group 4 — Verification
- [x] Smoke test: signup → login → save → reload → decrypt → logout
- [x] Assert no plaintext master password / vault key over network or in storage
- [x] CI green on Phase 0 branch
- [x] Commit: `test: Phase 0 smoke test + security invariants`