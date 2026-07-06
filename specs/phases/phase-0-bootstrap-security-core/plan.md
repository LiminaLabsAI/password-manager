---
type: Phase Plan
---

# Phase 0 — Bootstrap Security Core — Plan

# Execution order:
# Sequential:  Group 0 → Group 1 → Group 2 → Group 3 → Group 4
# (Crypto primitives locked + verified before any feature consumes them;
#  end-to-end round-trip is the gating signal.)

## Group 0 — Project scaffold (Sequential)
External deps: Node, npm.
- Next.js (App Router) + TypeScript + Tailwind CSS init
- ESLint, `tsc --noEmit` typecheck, Vitest setup
- CI workflow: run lint + typecheck + test on every push
- Commit: `chore: scaffold Next.js + TS + Tailwind + Vitest + CI`

## Group 1 — Data layer (Sequential)
External deps: Postgres instance (local docker for dev).
- Prisma setup; connection + migrations tooling
- Schema:
  - `users`: id, email (unique), auth_hash, vault_version
  - `vaults`: id, user_id (FK), ciphertext (blob), version
- Commit: `feat(db): Prisma schema + migrations for users and vaults`

## Group 2 — Crypto primitives (Sequential)
External deps: libsodium-wrappers.
- libsodium-wrappers integration; ready-gate helper
- KDF helper: master password → Argon2id → (vault key, auth hash) via
  `crypto_kdf` with distinct context strings
- Symmetric encrypt/decrypt helpers: XChaCha20-Poly1305 (random nonce per
  encryption; nonce prepended to ciphertext)
- Unit tests:
  - round-trip: encrypt → decrypt → original
  - wrong master password fails decryption
  - ciphertext differs from plaintext
  - auth hash cannot be turned into vault key
  - KDF wall-time measured and bounded
- Commit: `feat(crypto): Argon2id KDF + XChaCha20-Poly1305 helpers with tests`

## Group 3 — Auth + vault round-trip (Sequential)
External deps: groups 1 + 2.
- Signup endpoint: POST email + auth_hash + empty encrypted vault (initial
  version 1)
- Login endpoint: verify auth_hash; return latest ciphertext + version
- Save-vault endpoint: PUT ciphertext + version; last-write-wins via version
  counter (reject stale writes whose client version < server version)
- Client pages: `/signup`, `/login`, `/vault` (renders empty-vault state)
- End-to-end empty-vault round-trip wired through the UI
- Commit: `feat(auth): signup + login + empty encrypted vault round-trip`

## Group 4 — Verification (Sequential)
External deps: groups 0–3.
- Smoke test: signup → login → save empty vault → reload → decrypt to same
  empty vault → logout
- Assertion that no plaintext master password or vault key traversed any
  network or persisted path (spy on fetch + inspect stored rows)
- CI green on Phase 0 branch
- Commit: `test: Phase 0 smoke test + security invariants`