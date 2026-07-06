---
type: Vision
---

# Principles

> Guiding decisions throughout the project. When trade-offs arise, these resolve them.

## Core Principles
1. **Client-side crypto or it doesn't exist** — the server is a dumb ciphertext
   store. Any feature requiring server-side decryption is out by default; if a
   feature can't be done E2EE, it's deferred, not bent.
2. **Ship incrementally, never skimp on security** — defer scope, not safety.
   Recovery, lock-on-timeout, and hardened Argon2id params ship with v1;
   sharing, 2FA, autofill, and offline mode are genuinely deferrable.
3. **No custom crypto** — libsodium primitives only (Argon2id, XChaCha20-Poly1305,
   crypto_kdf). Never hand-roll KDFs, modes, IVs, or randomness; reuse
   vetted wrappers.
4. **Single-user before multi-anything** — sync first; sharing and teams are a
   separate security architecture (pub-key per user), not a v2 toggle.
5. **Reproducible evidence over reassurance** — every security claim is backed
   by a test or a concrete measurement (KDF cost in wall time, ciphertext
   size, auth-hash non-reversibility). "Should be secure" is not evidence.