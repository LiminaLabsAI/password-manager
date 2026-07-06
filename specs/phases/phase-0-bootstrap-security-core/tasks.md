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
- [ ] Commit: `chore: scaffold Next.js + TS + Tailwind + Vitest + CI`

## Group 1 — Data layer
- [ ] Add Prisma + Postgres connection (docker compose for local dev)
- [ ] Author `users` + `vaults` schema and first migration
- [ ] Commit: `feat(db): Prisma schema + migrations for users and vaults`

## Group 2 — Crypto primitives
- [ ] Integrate libsodium-wrappers; ready-gate helper
- [ ] KDF: master password → Argon2id → (vault key, auth hash) via `crypto_kdf`
- [ ] Symmetric encrypt/decrypt helpers (XChaCha20-Poly1305)
- [ ] Unit tests: round-trip, wrong-password, ciphertext≠plaintext, auth-hash ≠ vault-key, KDF wall-time bounded
- [ ] Commit: `feat(crypto): Argon2id KDF + XChaCha20-Poly1305 helpers with tests`

## Group 3 — Auth + vault round-trip
- [ ] Signup endpoint (POST email + auth_hash + empty encrypted vault)
- [ ] Login endpoint (verify auth_hash; return ciphertext + version)
- [ ] Save-vault endpoint (PUT ciphertext + version; last-write-wins)
- [ ] Client pages: `/signup`, `/login`, `/vault` (empty-vault state)
- [ ] Wire end-to-end empty-vault round-trip through the UI
- [ ] Commit: `feat(auth): signup + login + empty encrypted vault round-trip`

## Group 4 — Verification
- [ ] Smoke test: signup → login → save → reload → decrypt → logout
- [ ] Assert no plaintext master password / vault key over network or in storage
- [ ] CI green on Phase 0 branch
- [ ] Commit: `test: Phase 0 smoke test + security invariants`