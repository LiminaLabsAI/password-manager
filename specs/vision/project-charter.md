---
type: Vision
---

# Project Charter

> **Project**: password-manager
> **Created**: 2026-07-06

## Problem Statement
People reuse passwords across dozens of sites because retrieving strong ones is
inconvenient and syncing them across devices is hard. The result is
credential-stuffing exposure, breach cascade, and lockout pain. For a single
user the cost of fixing this should be a small web app, not a commercial
subscription with a feature pile they never touch.

## Solution
A personal, end-to-end-encrypted (E2EE) password manager web app. The user
unlocks one vault with a master password; the browser derives the encryption
key via Argon2id and encrypts/decrypts all vault entries client-side. The
server is a dumb, unauthenticated-from-its-perspective ciphertext store: it
holds an opaque encrypted blob per user and an opaque auth hash, never the
master password or the key. Sync across devices falls out for free from the
"same creds ⇒ same encrypted blob" model. The MVP ships the minimum feature
set that lets one user stop reusing passwords, retrieve them fast, generate
strong ones, sync across devices, and survive master-password loss.

## Stakeholders
| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| Owner | Project author | Final decisions |
| Users | Single end user (personal use) | Primary audience; security depends on their master password |

## Scope
### In (MVP — M1–M8)
- User account: email + master password; server stores Argon2id-derived auth hash only
- Client-side crypto: master password → Argon2id → (encryption key + auth hash); vault encrypted with XChaCha20-Poly1305
- Encrypted vault CRUD: entries {name, username, password, url, notes} as one ciphertext blob
- Vault sync: server stores latest encrypted blob, last-write-wins via version counter
- Password generator: configurable length + char sets
- Lock vault / re-auth on timeout: in-memory key wiped after idle or on demand
- Search/filter entries: client-side over decrypted in-memory vault
- Export + recovery code: download encrypted blob + generated recovery key for master-password loss

### Out (deferred — later phases or never)
- Browser extension / autofill
- Non-login item types (cards, notes, identities, files/attachments)
- Categories / folders / tags
- Sharing / multiple users / teams
- True offline mode
- 2FA for the manager account itself
- TOTP secret storage
- Audit log / breach monitoring / password health reporting
- Device pairing & revocation UI (same-creds ⇒ same-vault covers MVP)
- Custom fields

## Success
Phase 0 succeeds when a user can sign up, log in, and round-trip an empty
encrypted vault to the server, proven by a passing smoke test (see
success-criteria.md). Long-term success is measured by the security
properties (no plaintext to server; KDF meets real cost target) holding
under test and by the MVP feature set shipping in phases 1–3.