---
type: Phase History
---

# Phase 0 — Bootstrap Security Core — History

Append-only log of meaningful changes and decisions for this phase. See
Rule 8 for the format.

### [DECISION] 2026-07-06 — Founding: personal E2EE password manager
Topics: founding, scope, stack, crypto, sync
Affects-phases: phase-0-bootstrap-security-core (this phase) and all later phases
Affects-specs: specs/vision/project-charter.md, specs/vision/principles.md, specs/vision/success-criteria.md, specs/planning/roadmap.md
Detail: Project founded via `/start-project` from a `/brainstorm-idea` session.
Decisions made during founding:

- **Product**: personal, end-to-end-encrypted password manager web app for a
  single user. Server is a dumb ciphertext store.
- **MVP feature set (M1–M8)**: account + master password; client-side crypto
  via Argon2id + XChaCha20-Poly1305; encrypted vault CRUD (single ciphertext
  blob per user); last-write-wins sync via version counter; password
  generator; lock-on-timeout; client-side search; export + recovery code.
- **Explicitly deferred**: autofill/browser extension, non-login item types,
  folders/tags, sharing/teams, true offline, 2FA, TOTP, audit log, device
  management, custom fields.
- **Stack**: Node/Next.js (App Router, RSC) + Postgres + Prisma +
  libsodium-wrappers; single deploy unit (Vercel/self-host).
- **Repo type**: Standard (not monorepo) — single deployable, no front-loaded
  architecture constitution; security decisions captured as ADRs during
  phase work.
- **Crypto rule**: libsodium primitives only; no hand-rolled KDFs, modes,
  IVs, or randomness. Vault key and auth hash derived via `crypto_kdf` with
  distinct context strings so the auth hash cannot be turned into the vault
  key.
- **Sync model**: last-write-wins via a server-side version counter; full
  CRDT/merge is a Phase 2+ concern.
- **Recovery**: a generated recovery code restores vault access on
  master-password loss (vs. the "no recovery" model). Recovery ships with
  the MVP (Phase 3) because its absence is a catastrophic-loss path.
- **Phase 0 scope**: prove the security architecture only — bootstrap
  scaffold, data layer, crypto primitives, auth, and an empty-vault
  end-to-end round-trip, gated by a smoke test. No real entry CRUD,
  generator, lock, search, or recovery in Phase 0.

### [NOTE] 2026-07-06 — Phase 0 ordering rationale
Topics: crypto, execution-order
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: specs/phases/phase-0-bootstrap-security-core/plan.md
Detail: Phase 0 is strictly sequential (Group 0 → 4). Crypto primitives are
locked and unit-tested (Group 2) before any feature consumes them (Group 3),
so a crypto bug is caught in isolation rather than as a confusing auth
failure. The end-to-end round-trip (Group 3 + Group 4 smoke test) is the
gating signal for phase completion — it is the smallest proof that the
security model is honest.

### [FEATURE] 2026-07-06 — Group 0: project scaffold
Topics: nextjs, typescript, tailwind, vitest, ci, eslint
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: none
Detail: Scaffolded Next.js 16 (App Router) + TypeScript + Tailwind v3 + Vitest
+ ESLint flat config manually (create-next-app refused due to pre-existing
momentum-managed files). CI workflow runs lint + typecheck + test against a
Postgres 16 service and `prisma migrate deploy`. Verification: lint,
typecheck, `npm test` (sanity), and `next build` all pass locally.

### [FEATURE] 2026-07-06 — Group 1: data layer
Topics: prisma, postgres
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: none
Detail: Pinned Prisma 6 (Prisma 7's removal of `datasource.url` in schema +
mandatory driver-adapter config would add ceremony disproportionate to MVP).
Authored `prisma/schema.prisma` with `User` (id, email, authHash, salt,
vaultVersion) and `Vault` (id, userId, ciphertext Bytes, version). Generated
the initial migration SQL via `prisma migrate diff --from-empty` (no local
Postgres/docker available locally — the migration is by-construction in sync
with the schema; CI's `prisma migrate deploy` is the authoritative drift
check). Added a PrismaClient singleton in `lib/db.ts` with dev hot-reload
reuse. Verification: typecheck + lint clean; build picks up the new schema.

### [ARCH_CHANGE] 2026-07-06 — Salt stored on User (login challenge flow)
Topics: auth, crypto, schema
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: specs/architecture (none — standard repo, recorded here)
Detail: Added a `salt Bytes` column to `User` (second migration
`20260706000001_add_user_salt`). Login is two-round: the client first calls
`POST /api/login/challenge?email` to fetch the per-user Argon2id salt, then
re-derives the auth hash before submitting it to `/api/login`. Without the
salt column the client could not reproduce the auth hash on a second device.
Information-disclosure trade-off: the challenge endpoint reveals whether an
email is registered (200 + salt vs 404). Acceptable for a personal
single-user MVP; a later phase may return a deterministic fake salt for
unknown emails to mask enumeration.

### [FEATURE] 2026-07-06 — Group 2: crypto primitives
Topics: libsodium, argon2id, xchacha20-poly1305, crypto_kdf
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: none
Detail: Implemented `lib/crypto.ts`. Master password → Argon2id (32-byte
master key, salt 16B, opsLimit 2 / memLimit 64 MiB by default) →
`crypto_kdf` with distinct 8-byte contexts ("pmvault1" → vault key,
"pmauthh1" → auth hash). Vault symmetric crypto is XChaCha20-Poly1305 with a
fresh random nonce per encryption, prepended to the ciphertext blob.
Discovered that `libsodium-wrappers` (standard build) omits `crypto_pwhash`
— switched to `libsodium-wrappers-sumo` (the only build that ships
Argon2id). The master key is wiped (`fill(0)`) before `deriveKeys` returns.
17 unit tests cover ready-gate idempotency, salt/password determinism and
divergence, KDF context isolation (auth hash cannot be turned into the
vault key), encrypt/decrypt round-trip, wrong-key rejection, ciphertext ≠
plaintext, random-nonce uniqueness, AEAD tamper detection, and KDF wall-time
bounds for both test and production Argon2id params. Verification:
`npm test` (17/17 pass), typecheck, lint all clean.

### [FEATURE] 2026-07-06 — Group 3: auth + empty-vault round-trip
Topics: api, auth, vault, round-trip
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: none
Detail: Implemented `POST /api/signup` (creates User.salt + authHash + an
initial encrypted empty vault at version 1), `POST /api/login/challenge`
(returns salt), `POST /api/login` (constant-time auth-hash verification;
returns ciphertext + version), and `GET/PUT /api/vault` (auth via
(email, authHash) bearer on every request — no session store for MVP;
PUT enforces last-write-wins via `baseVersion === server.vaultVersion`,
rejecting stale writes with 409). Client pages `/signup`, `/login`,
`/vault` derive keys client-side, encrypt/decrypt the vault with the
in-memory vault key, and never send the master password. In-memory session
holder (`lib/session.ts`) loses the vault key on reload by design. Note:
`Bytes` columns are typed as `Uint8Array` (not `Buffer`) in Prisma 6's
generated client — server reads use `toBase64()`, writes use `Buffer.from`.
Verification: typecheck, lint, and `next build` all pass (routes registered
dynamic, pages prerender static). End-to-end round-trip against a live
Postgres is verified by the Group 4 smoke test in CI (no local docker in
this environment).

### [DISCOVERY] 2026-07-06 — Prisma 7 + libsodium-wrappers environment notes
Topics: prisma, libsodium, tooling
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: none
Detail: Two environment discoveries worth future-reader time: (1) Prisma 7
removes the `datasource.url` property from `schema.prisma` and requires a
`prisma.config.ts` driver-adapter pattern — pinned to v6 for MVP
simplicity; revisit on a deliberate upgrade. (2) `libsodium-wrappers`
(standard build) does not export `crypto_pwhash` (Argon2id); the "sumo"
build is required. No backlog item — recorded for context only.

### [FEATURE] 2026-07-06 — Group 4: verification (smoke test + invariants)
Topics: testing, smoke, security-invariants, ci
Affects-phases: phase-0-bootstrap-security-core
Affects-specs: specs/vision/success-criteria.md
Detail: Added `tests/smoke/phase-0-roundtrip.test.ts` exercising the full
flow against a live Postgres via the real Next route handlers: signup →
login challenge → login (wrong hash rejected) → decrypt → save (PUT) →
reload (GET) → decrypt → optimistic-concurrency 409 → logout. Two explicit
security invariants are asserted: (a) neither the master password nor the
derived vault key appears in any request body sent to the handlers OR in
any persisted DB column (only salt + authHash + ciphertext); (b) the
persisted auth hash cannot be turned into the vault key — feeding it to
`crypto_kdf_derive_from_key` with the vault context does not produce a key
that decrypts the vault. Installed Postgres 16 via Homebrew locally
(no docker in this env; the docker-compose dev DB implies Postgres
availability and brew is the equivalent). Ran `prisma migrate deploy`
cleanly (both migrations applied), then `npm test`: 18/18 tests pass
including the smoke test. typecheck, lint, and `next build` all clean.
CI-green on the branch is verified after push via GitHub Actions.

---