---
type: Phase Retrospective
---

# Phase 0 Retrospective — Bootstrap Security Core

> **Phase**: 0 — Bootstrap Security Core
> **Released**: v0.1.0 (2026-07-06)
> **Branch**: `phase-0-bootstrap-security-core` (merged to `main`, deleted)

## Summary

Phase 0 proved the security architecture is real before any feature work:
client-side Argon2id KDF → `crypto_kdf` (distinct contexts for vault key
and auth hash) → XChaCha20-Poly1305 vault encryption; server is a dumb
ciphertext store; master password never leaves the browser. The gating
artifact is `tests/smoke/phase-0-roundtrip.test.ts`, which round-trips an
empty encrypted vault through the live API + Postgres and asserts two
security invariants: (a) no master password or vault-key bytes appear in
any request body or persisted column, (b) the persisted auth hash cannot
be turned into a vault key that decrypts the vault.

All four exit criteria from `overview.md` are met:
1. ✅ Smoke test passes (signup → login → save → reload → decrypt → logout).
2. ✅ Smoke test asserts no plaintext master/keys over network or at rest.
3. ✅ Argon2id KDF wall-time measured and bounded (crypto unit test, both
   test and production cost params).
4. ✅ CI green on the Phase 0 branch (run 28812300910) and subsequently on
   `main` after merge.

## What went well

- **Crypto-first ordering paid off** — locking and unit-testing the KDF +
  AEAD in Group 2 *before* any feature consumed them meant a crypto bug
  would have surfaced in isolation, not as a confusing auth failure. By
  Group 3 the primitives were just plumbing.
- **The smoke test is the spec** — writing a single test that asserts both
  the end-to-end flow *and* the security invariants turned "is the
  architecture honest?" into a binary question. No manual checklist could
  drift past it.
- **context-string isolation between vault key and auth hash** is small to
  implement and gives a unit-testable guarantee that the server — holding
  only the auth hash — cannot derive the vault key. Worth the hour.
- **Prisma 6 pin over Prisma 7** — Prisma 7's removal of `datasource.url`
  and mandatory driver-adapter pattern would have added ceremony
  disproportionate to an MVP. Pinning was the right Rule-14-graded call.

## What didn't go well / lessons

- **`create-next-app` refused the pre-populated repo** — momentum ships
  `.opencode/`, `.momentum/`, `AGENTS.md`, etc. before any code exists,
  so the official scaffolder bails on "conflicting files." I had to
  scaffold Next.js manually. **Lesson**: momentum could ship a
  `/start-project` post-founding hook that lays down the Next.js scaffold
  in one shot, so the first `/start-phase` doesn't spend its Group 0
  re-deriving `package.json`/`tsconfig.json`/`tailwind.config.ts`.
  Filed as backlog TODO (see below).
- **`libsodium-wrappers` (standard) silently omits `crypto_pwhash`
  (Argon2id)** — there is no build-time warning; the function is just
  `undefined` at runtime. Switched to `libsodium-wrappers-sumo`. **Lesson**:
  when a crypto primitive is load-bearing, probe for it with a one-liner
  before designing around it; type definitions can ship for a smaller
  surface than the runtime supports.
- **Lockfile drift broke CI on first push** — `npm install` mid-phase left
  `package-lock.json` out of sync (`magicast@0.3.5` missing); `npm ci` in
  CI then refused. Fixed by deleting `node_modules` + lockfile and
  reinstalling. **Lesson**: after any `npm install <pkg>` during a phase,
  run `npm ci` locally once before pushing to catch lockfile drift before
  CI does.
- **`prisma migrate diff --from-migrations` needs a shadow DB** — without
  local Postgres there is no way to verify migration/schema drift locally.
  I had to install Postgres via Homebrew (no Docker in this env) to run
  `migrate deploy` and confirm. **Lesson**: the dev-loop assumes Docker;
  document a non-Docker fallback (brew/apt Postgres) in
  `docs/developer-guide.md` for environments without Docker.
- **Sentinel mechanics surfaced a snag** — releasing via the `/start-phase`
  hard-stop consumed the `.momentum/merge-approved` sentinel; the
  follow-up tracking-docs commit then triggered the pre-push hook again.
  Re-authorizing once for the same release was the right move, but it
  revealed that the single-use sentinel friction is more acutely felt on
  a release that needs >1 push. **Lesson**: batch all release-time
  tracking-docs edits into the *same* commit as the sentinel-authored
  release commit, so a single sentinel authorization covers the whole
  release push.

## Verification Evidence

Captured fresh in this session (Rule 12). All commands run from the repo
root on `main` at `5525660`, against local Postgres 16 (Homebrew service).

### `npm run typecheck`

Exit code: **0**

```
> password-manager@0.1.0 typecheck
> tsc --noEmit
```

(No diagnostics emitted. Clean.)

### `npm run lint`

Exit code: **0**

```
> password-manager@0.1.0 lint
> eslint .
```

(No problems reported. Clean.)

### `npm test`

Exit code: **0**

```
> password-manager@0.1.0 test
> vitest run

 RUN  v4.1.10 /Users/avinash/Workspace/Projects/password-manager

 ✓ tests/sanity.test.ts (1 test) 1ms
 ✓ tests/crypto.test.ts (16 tests) 78ms
 ✓ tests/smoke/phase-0-roundtrip.test.ts (1 test) 111ms

 Test Files  3 passed (3)
      Tests  18 passed (18)
   Start at  23:38:34
   Duration  812ms (transform 66ms, setup 0ms, import 620ms, tests 190ms, environment 0ms)

TEST_EXIT=0
```

Test breakdown:
- `tests/sanity.test.ts` — 1 test (scaffold sanity)
- `tests/crypto.test.ts` — 16 tests (ready gate, KDF derivation, KDF
  context isolation, AEAD round-trip, wrong-key rejection, ciphertext ≠
  plaintext, random-nonce uniqueness, AEAD tamper detection, wrong-key-length
  rejection, base64 round-trip, KDF wall-time bounds for both test and
  production Argon2id params)
- `tests/smoke/phase-0-roundtrip.test.ts` — 1 test (full round-trip against
  live Postgres + two security invariants)

### `npm run build`

Exit code: **0**

```
> password-manager@0.1.0 build
> next build

  Creating an optimized production build ...
✓ Compiled successfully
  Running TypeScript ...
  Finished TypeScript
  Collecting page data using 9 workers ...
✓ Generating static pages using 9 workers (10/10) in 103ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/login
├ ƒ /api/login/challenge
├ ƒ /api/signup
├ ƒ /api/vault
├ ○ /login
├ ○ /signup
└ ○ /vault

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

BUILD_EXIT=0
```

### CI on the released `main` (run 28812300910)

Captured during `/start-phase` Group 4 against branch
`phase-0-bootstrap-security-core` at commit `6eec435` (the branch HEAD
that was subsequently fast-forward-merged to `main` and tagged `v0.1.0`).
All steps green:

```
✓ Install dependencies
✓ Prisma generate
✓ Apply migrations
✓ Lint
✓ Typecheck
✓ Test
✓ Post Setup Node
✓ Post Run actions/checkout@v4
✓ Stop containers
✓ Complete job
```

`prisma migrate deploy` in CI applied both migrations
(`20260706000000_init`, `20260706000001_add_user_salt`) cleanly against a
fresh Postgres 16 service container — independent confirmation that the
migration SQL matches the schema, beyond the local `migrate deploy`.

## Release

Phase 0 was merged to `main` and tagged `v0.1.0` during the
`/start-phase` autonomous-execution hard-stop, with explicit user
approval. Branch `phase-0-bootstrap-security-core` was deleted (local +
remote). npm publish was deferred by the user.

This retrospective is the final Phase-0 artifact; the merge + tag steps of
the `/complete-phase` Release phase are intentionally not re-run —
re-merging would create duplicate merge commits and re-tagging `v0.1.0`
would fail.

## Next

Phase 1 — Vault CRUD + Generator (target v0.2.0). Run `/start-phase` to
begin.