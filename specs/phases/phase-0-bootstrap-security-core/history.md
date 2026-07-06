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

---