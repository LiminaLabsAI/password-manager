import sodium from "libsodium-wrappers-sumo";

/**
 * Crypto primitives for the password-manager.
 *
 * Security model:
 *  - Master password (never sent to server, never persisted) is the single
 *    root secret.
 *  - Argon2id derives a 32-byte master key from the master password + a
 *    per-user salt.
 *  - `crypto_kdf` with distinct 8-byte context strings sub-derives:
 *      * "pmvault1" -> 32-byte symmetric vault key (XChaCha20-Poly1305)
 *      * "pmauthh1" -> 32-byte auth hash (sent to server for login; the
 *        server stores this and verifies it on login; it cannot decrypt
 *        the vault).
 *  - Distinct context strings + the KDF guarantee the auth hash cannot be
 *    turned into the vault key (unit-tested).
 *
 * No custom crypto: only libsodium primitives. Never hand-roll IVs, modes,
 * or randomness.
 *
 * NOTE: requires the "sumo" build of libsodium-wrappers because Argon2id
 * (`crypto_pwhash`) is omitted from the standard build.
 */

const VAULT_KEY_CONTEXT = "pmvault1"; // 8 bytes (crypto_kdf_CONTEXTBYTES)
const AUTH_HASH_CONTEXT = "pmauthh1"; // 8 bytes
const VAULT_KEY_LEN = 32; // crypto_kdf_KEYBYTES
const AUTH_HASH_LEN = 32;
const MASTER_KEY_LEN = 32; // crypto_kdf_KEYBYTES — must match KDF master key length
const SALT_LEN = 16; // crypto_pwhash_SALTBYTES
const NONCE_LEN = 24; // crypto_aead_xchacha20poly1305_ietf_NPUBBYTES

/**
 * Argon2id cost parameters.
 * Tuned for interactive login on commodity hardware (~sub-second to ~1s).
 * opsLimit ~ crypto_pwhash_OPSLIMIT_INTERACTIVE, memLimit ~ 64 MiB.
 * Parameterized so the test suite can run with cheap params while production
 * uses these defaults.
 */
export const ARGON2ID_PARAMS = {
  opsLimit: 2, // crypto_pwhash_OPSLIMIT_INTERACTIVE
  memLimit: 64 * 1024 * 1024, // 64 MiB
} as const;

/** Cheap params for tests so the suite runs in milliseconds, not seconds. */
export const ARGON2ID_PARAMS_TEST = {
  opsLimit: 1, // crypto_pwhash_OPSLIMIT_MIN
  memLimit: 8 * 1024, // 8 KiB — fast enough for unit tests
} as const;

let readyPromise: Promise<typeof sodium> | null = null;

/**
 * Ensure libsodium WASM is loaded before any crypto call.
 * Idempotent — all callers may await this freely; the module is loaded once.
 * Required by the "ready-gate" pattern: any auth/crypto flow must await this
 * before touching primitives.
 */
export async function ready(): Promise<typeof sodium> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await sodium.ready;
      return sodium;
    })();
  }
  return readyPromise;
}

export interface DerivedKeys {
  /** 32-byte symmetric vault key (XChaCha20-Poly1305). Stays in the browser. */
  vaultKey: Uint8Array;
  /**
   * 32-byte auth hash sent to the server for login. Server stores it; it
   * cannot derive the vault key from it.
   */
  authHash: Uint8Array;
  /** The per-user salt used for Argon2id. Persisted alongside the account. */
  salt: Uint8Array;
}

/**
 * Derive (vaultKey, authHash, salt) from a master password.
 * If `salt` is omitted, a fresh random salt is generated (signup path).
 *
 * The master key derived by Argon2id is wiped from memory before this
 * function returns; only the two sub-keys survive.
 */
export async function deriveKeys(
  masterPassword: string,
  salt?: Uint8Array,
  params: { opsLimit: number; memLimit: number } = ARGON2ID_PARAMS,
): Promise<DerivedKeys> {
  const s = await ready();
  const saltBytes = salt ?? s.randombytes_buf(SALT_LEN);
  const masterKey = s.crypto_pwhash(
    MASTER_KEY_LEN,
    masterPassword,
    saltBytes,
    params.opsLimit,
    params.memLimit,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
  const vaultKey = s.crypto_kdf_derive_from_key(
    VAULT_KEY_LEN,
    1,
    VAULT_KEY_CONTEXT,
    masterKey,
  );
  const authHash = s.crypto_kdf_derive_from_key(
    AUTH_HASH_LEN,
    2,
    AUTH_HASH_CONTEXT,
    masterKey,
  );
  // Wipe the master key from memory as soon as the sub-keys are derived.
  masterKey.fill(0);
  return { vaultKey, authHash, salt: saltBytes };
}

/**
 * Symmetrically encrypt a plaintext UTF-8 string with XChaCha20-Poly1305.
 * Returns `nonce (24B) || ciphertext+tag` as a single Uint8Array.
 * A fresh random nonce is used for every call.
 */
export async function encryptVault(
  plaintext: string,
  vaultKey: Uint8Array,
): Promise<Uint8Array> {
  const s = await ready();
  if (vaultKey.length !== VAULT_KEY_LEN) {
    throw new Error(`vaultKey must be ${VAULT_KEY_LEN} bytes, got ${vaultKey.length}`);
  }
  const nonce = s.randombytes_buf(NONCE_LEN);
  const message = s.from_string(plaintext);
  const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    null,
    null,
    nonce,
    vaultKey,
  );
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce, 0);
  out.set(ciphertext, nonce.length);
  return out;
}

/**
 * Decrypt a `nonce || ciphertext+tag` blob produced by `encryptVault`.
 * Throws on tampering or wrong key (AEAD verification fails).
 */
export async function decryptVault(
  blob: Uint8Array,
  vaultKey: Uint8Array,
): Promise<string> {
  const s = await ready();
  if (vaultKey.length !== VAULT_KEY_LEN) {
    throw new Error(`vaultKey must be ${VAULT_KEY_LEN} bytes, got ${vaultKey.length}`);
  }
  if (blob.length < NONCE_LEN) {
    throw new Error("ciphertext too short");
  }
  const nonce = blob.subarray(0, NONCE_LEN);
  const ciphertext = blob.subarray(NONCE_LEN);
  const plaintext = s.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    null,
    nonce,
    vaultKey,
  );
  return s.to_string(plaintext);
}

/** Encode bytes as base64 for JSON-safe transport / persistence. */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Decode a base64 string to bytes. */
export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time comparison for auth hashes / secrets. */
export async function constantTimeEqual(
  a: Uint8Array,
  b: Uint8Array,
): Promise<boolean> {
  const s = await ready();
  if (a.length !== b.length) return false;
  // libsodium memcmp returns true if buffers are equal, false otherwise.
  return s.memcmp(a, b);
}

export const CRYPTO_CONSTANTS = {
  VAULT_KEY_LEN,
  AUTH_HASH_LEN,
  SALT_LEN,
  NONCE_LEN,
  MASTER_KEY_LEN,
  VAULT_KEY_CONTEXT,
  AUTH_HASH_CONTEXT,
};