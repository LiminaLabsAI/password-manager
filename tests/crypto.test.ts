import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import {
  ready,
  deriveKeys,
  encryptVault,
  decryptVault,
  constantTimeEqual,
  toBase64,
  fromBase64,
  ARGON2ID_PARAMS_TEST,
  CRYPTO_CONSTANTS,
} from "@/lib/crypto";

const P = ARGON2ID_PARAMS_TEST;

describe("crypto: ready gate", () => {
  it("resolves libsodium and is idempotent", async () => {
    const a = await ready();
    const b = await ready();
    expect(a).toBe(b);
  });
});

describe("crypto: deriveKeys (Argon2id + crypto_kdf)", () => {
  it("produces 32-byte vault key + auth hash + 16-byte salt", async () => {
    const { vaultKey, authHash, salt } = await deriveKeys("pw", undefined, P);
    expect(vaultKey.length).toBe(CRYPTO_CONSTANTS.VAULT_KEY_LEN);
    expect(authHash.length).toBe(CRYPTO_CONSTANTS.AUTH_HASH_LEN);
    expect(salt.length).toBe(CRYPTO_CONSTANTS.SALT_LEN);
  });

  it("is deterministic given the same salt", async () => {
    const salt = new Uint8Array(16); // 16 zero bytes
    const a = await deriveKeys("hunter2", salt, P);
    const b = await deriveKeys("hunter2", salt, P);
    expect(await constantTimeEqual(a.vaultKey, b.vaultKey)).toBe(true);
    expect(await constantTimeEqual(a.authHash, b.authHash)).toBe(true);
  });

  it("produces different keys for different master passwords", async () => {
    const salt = new Uint8Array(16);
    const a = await deriveKeys("hunter2", salt, P);
    const b = await deriveKeys("hunter3", salt, P);
    expect(await constantTimeEqual(a.vaultKey, b.vaultKey)).toBe(false);
    expect(await constantTimeEqual(a.authHash, b.authHash)).toBe(false);
  });

  it("produces different keys for different salts", async () => {
    const saltA = new Uint8Array(16);
    const saltB = new Uint8Array(16);
    saltB[0] = 1;
    const a = await deriveKeys("hunter2", saltA, P);
    const b = await deriveKeys("hunter2", saltB, P);
    expect(await constantTimeEqual(a.vaultKey, b.vaultKey)).toBe(false);
  });

  it("vault key ≠ auth hash (distinct contexts are distinct)", async () => {
    const { vaultKey, authHash } = await deriveKeys("pw", undefined, P);
    expect(vaultKey).not.toEqual(authHash);
    expect(await constantTimeEqual(vaultKey, authHash)).toBe(false);
  });

  it("auth hash cannot be turned into the vault key: contexts are isolated", async () => {
    // A server holding only the auth hash could try to derive the vault key
    // from it by re-running crypto_kdf. There is no API to do that without
    // the master key — the KDF is one-way. We assert that the auth hash is
    // not a valid master key for re-deriving the SAME vault key: feeding it
    // as if it were a master key produces different bytes.
    const s = await ready();
    const { vaultKey, authHash } = await deriveKeys("pw", undefined, P);
    const fakeVaultKey = s.crypto_kdf_derive_from_key(
      CRYPTO_CONSTANTS.VAULT_KEY_LEN,
      1,
      "pmvault1",
      authHash,
    );
    expect(await constantTimeEqual(vaultKey, fakeVaultKey)).toBe(false);
  });
});

describe("crypto: encrypt/decrypt (XChaCha20-Poly1305)", () => {
  it("round-trips a plaintext", async () => {
    const { vaultKey } = await deriveKeys("pw", undefined, P);
    const blob = await encryptVault("hello world", vaultKey);
    const back = await decryptVault(blob, vaultKey);
    expect(back).toBe("hello world");
  });

  it("wrong master password fails decryption (AEAD verification)", async () => {
    const a = await deriveKeys("pw1", undefined, P);
    const b = await deriveKeys("pw2", undefined, P);
    const blob = await encryptVault("secret", a.vaultKey);
    await expect(decryptVault(blob, b.vaultKey)).rejects.toThrow();
  });

  it("ciphertext differs from plaintext", async () => {
    const { vaultKey } = await deriveKeys("pw", undefined, P);
    const plaintext = "a very secret password 12345";
    const blob = await encryptVault(plaintext, vaultKey);
    const blobB64 = toBase64(blob);
    expect(blobB64).not.toContain(plaintext);
    // The nonce + ciphertext bytes should not equal the plaintext bytes.
    const s = await ready();
    const ptBytes = s.from_string(plaintext);
    expect(blob.length).toBeGreaterThan(ptBytes.length);
  });

  it("two encryptions of the same plaintext differ (random nonce)", async () => {
    const { vaultKey } = await deriveKeys("pw", undefined, P);
    const a = await encryptVault("same", vaultKey);
    const b = await encryptVault("same", vaultKey);
    // Random nonce ⇒ different ciphertext blobs, both decrypt to the same.
    expect(a).not.toEqual(b);
    expect(await decryptVault(a, vaultKey)).toBe("same");
    expect(await decryptVault(b, vaultKey)).toBe("same");
  });

  it("tampering with the ciphertext throws on decryption", async () => {
    const { vaultKey } = await deriveKeys("pw", undefined, P);
    const blob = await encryptVault("secret", vaultKey);
    blob[blob.length - 1] ^= 0x01; // flip one bit of the tag/ciphertext
    await expect(decryptVault(blob, vaultKey)).rejects.toThrow();
  });

  it("rejects a vault key of the wrong length", async () => {
    const badKey = new Uint8Array(16);
    await expect(encryptVault("x", badKey)).rejects.toThrow();
  });
});

describe("crypto: base64 helpers", () => {
  it("round-trips bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 255, 254]);
    const b64 = toBase64(bytes);
    expect(fromBase64(b64)).toEqual(bytes);
  });
});

describe("crypto: KDF wall-time bound", () => {
  it("Argon2id (test params) completes in under 5 seconds wall time", async () => {
    const t0 = performance.now();
    await deriveKeys("benchmark", undefined, P);
    const elapsed = performance.now() - t0;
    // Loose bound — test params are tiny. The point is that the KDF call
    // is measurable and does not hang; production params (64 MiB) are
    // separately bounded (~1s on commodity hardware).
    expect(elapsed).toBeLessThan(5000);
    expect(elapsed).toBeGreaterThan(0);
  });

  it("Argon2id (production params) completes in under 5 seconds wall time", async () => {
    // Smoke bound: confirms production-cost Argon2id would not hang a login
    // on this machine. Not a hard SLO — refined post-Phase 0 against real
    // hardware telemetry.
    const t0 = performance.now();
    const { ARGON2ID_PARAMS } = await import("@/lib/crypto");
    await deriveKeys("benchmark", undefined, ARGON2ID_PARAMS);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(5000);
  });
});