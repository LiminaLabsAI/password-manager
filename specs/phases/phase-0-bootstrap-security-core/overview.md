---
type: Phase
status: in-progress
tags: [nextjs, typescript, tailwind, postgres, prisma, libsodium, argon2id, xchacha20-poly1305, e2ee, kdf, auth]
---

# Phase 0 — Bootstrap Security Core

> **Status**: In Progress
> **Target**: v0.1.0

## Goal
A logged-in user has an empty encrypted vault syncing to the server, proven
by a passing smoke test. Nothing else.

This phase proves the security architecture is real before any feature is
built on top of it: client-side KDF, client-side symmetric encryption, server
as a dumb ciphertext store, auth via an opaque derived hash. Every later
phase is feature work on this foundation.

## Out of Scope (deferred to later phases)
- Entry CRUD UI and schema beyond empty-vault round-trip (Phase 1)
- Password generator (Phase 1)
- Search/filter (Phase 2)
- Lock-on-timeout (Phase 2)
- Export + recovery code (Phase 3)

## Exit Criteria
1. Smoke test `tests/smoke/phase-0-roundtrip.test.ts` passes: signup → login → save empty encrypted vault → reload → decrypt to same empty vault → logout.
2. Unit tests assert no plaintext master password or vault key traversed any network or persisted path.
3. Argon2id KDF wall-time is measured and bounded by a test assertion.
4. CI runs lint + typecheck + tests green on the Phase 0 branch.

## Risks
- **libsodium-wrappers in the browser**: WASM load is async; need to ensure the
  crypto helper is ready before any auth flow runs. Mitigation: a single
  ready-gate wrapper used by all callers.
- **Argon2id cost tuning**: too low = weak; too high = unusable login.
  Mitigation: parameterize and benchmark in Phase 0 tests; pick a band that
  targets interactive login (sub-second to ~1s on commodity hardware).
- **Auth-hash reversibility**: the server stores a hash derived from the
  master password; if mis-constructed it could be used to derive the vault
  key. Mitigation: use libsodium `crypto_kdf` with distinct context strings
  for the vault key vs. the auth hash; unit test asserts the auth hash
  cannot be turned into the vault key.