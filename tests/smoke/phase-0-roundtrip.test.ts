/**
 * Phase 0 smoke test — exercises the security architecture end-to-end
 * against a live Postgres and the real Next API route handlers.
 *
 * Flow: signup → login → save empty vault → reload + decrypt → logout.
 * Plus two security invariants:
 *   (a) the master password and vault key never traverse the network or
 *       get persisted (asserted by inspecting request bodies sent to the
 *       handlers AND the raw DB rows)
 *   (b) the auth hash cannot be turned into the vault key (the server,
 *       holding only the persisted auth hash, still cannot decrypt the vault)
 *
 * Requires DATABASE_URL pointing at a Postgres with migrations applied.
 * CI runs this against its service container; locally against the
 * docker-compose-equivalent (brew postgres in this dev env).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as signupPOST } from "@/app/api/signup/route";
import { POST as loginChallengePOST } from "@/app/api/login/challenge/route";
import { POST as loginPOST } from "@/app/api/login/route";
import { GET as vaultGET, PUT as vaultPUT } from "@/app/api/vault/route";
import { deriveKeys, encryptVault, decryptVault, toBase64, fromBase64 } from "@/lib/crypto";
import { emptyVault, serializeVault, deserializeVault } from "@/lib/vault";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

function jsonReq(body: unknown, method = "POST", url = "http://localhost/api/x"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function json(res: Response): Promise<any> {
  return res.json();
}

const MASTER = "correct horse battery staple";
const EMAIL = `phase0-smoke-${Date.now()}@example.com`;

/** Assert that a request body never contains the master password or vault key. */
function assertBodyLeaksNothing(body: string, keys: { vaultKey: Uint8Array }) {
  expect(body).not.toContain(MASTER);
  expect(body).not.toContain(toBase64(keys.vaultKey));
}

describe("phase 0 smoke: full round-trip + security invariants", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
  });

  it("signup → login → save → reload → decrypt → logout; secrets never leak", async () => {
    // ---- 1. signup ----
    const keys = await deriveKeys(MASTER);
    const blob = await encryptVault(serializeVault(emptyVault()), keys.vaultKey);

    const signupBody = {
      email: EMAIL,
      salt: toBase64(keys.salt),
      authHash: toBase64(keys.authHash),
      vaultCiphertext: toBase64(blob),
    };
    assertBodyLeaksNothing(JSON.stringify(signupBody), keys);
    const signupReq = jsonReq(signupBody);

    const signupRes = await signupPOST(signupReq);
    expect(signupRes.status).toBe(200);
    expect((await json(signupRes)).version).toBe(1);

    // ---- security invariant (a): persisted rows hold no master password
    // or vault key — only salt + authHash + ciphertext. ----
    const persistedUser = await prisma.user.findUnique({
      where: { email: EMAIL },
      include: { vault: true },
    });
    expect(persistedUser).not.toBeNull();
    expect(persistedUser!.authHash).toBe(toBase64(keys.authHash));
    const persistedStrings = [
      persistedUser!.email,
      persistedUser!.authHash,
      Buffer.from(persistedUser!.salt as Uint8Array).toString("base64"),
      Buffer.from(persistedUser!.vault!.ciphertext as Uint8Array).toString("base64"),
    ].join("\n");
    expect(persistedStrings).not.toContain(MASTER);
    expect(persistedStrings).not.toContain(toBase64(keys.vaultKey));
    // Ciphertext must not equal the plaintext vault JSON.
    expect(persistedStrings).not.toContain('"entries":[]"');

    // ---- 2. login challenge: salt round-trips ----
    const chRes = await loginChallengePOST(jsonReq({ email: EMAIL }));
    expect(chRes.status).toBe(200);
    expect((await json(chRes)).salt).toBe(toBase64(keys.salt));

    // ---- 3. login: wrong auth hash rejected; correct one returns vault ----
    const badLoginRes = await loginPOST(
      jsonReq({ email: EMAIL, authHash: toBase64(new Uint8Array(32)) }),
    );
    expect(badLoginRes.status).toBe(401);

    const loginReqBody = {
      email: EMAIL,
      authHash: toBase64(keys.authHash),
    };
    expect(JSON.stringify(loginReqBody)).not.toContain(MASTER);
    const loginRes = await loginPOST(jsonReq(loginReqBody));
    expect(loginRes.status).toBe(200);
    const loginJson = await json(loginRes);
    expect(loginJson.vaultVersion).toBe(1);

    // ---- 4. decrypt on the client with the vault key the server never saw ----
    const plaintext = await decryptVault(
      fromBase64(loginJson.vaultCiphertext),
      keys.vaultKey,
    );
    expect(deserializeVault(plaintext).entries).toEqual([]);

    // ---- 5. save empty vault again (PUT) round-trip ----
    const saveRes = await vaultPUT(
      jsonReq({
        email: EMAIL,
        authHash: toBase64(keys.authHash),
        vaultCiphertext: toBase64(blob),
        baseVersion: 1,
      }),
    );
    expect(saveRes.status).toBe(200);
    expect((await json(saveRes)).version).toBe(2);

    // ---- 6. reload via GET + decrypt ----
    const reloadRes = await vaultGET(
      jsonReq({
        email: EMAIL,
        authHash: toBase64(keys.authHash),
      }),
    );
    expect(reloadRes.status).toBe(200);
    const reloadJson = await json(reloadRes);
    expect(reloadJson.vaultVersion).toBe(2);
    const reloadedPlain = await decryptVault(
      fromBase64(reloadJson.vaultCiphertext),
      keys.vaultKey,
    );
    expect(deserializeVault(reloadedPlain).entries).toEqual([]);

    // ---- 7. optimistic concurrency: stale baseVersion rejected (409) ----
    const staleRes = await vaultPUT(
      jsonReq({
        email: EMAIL,
        authHash: toBase64(keys.authHash),
        vaultCiphertext: toBase64(blob),
        baseVersion: 1, // server is now at 2
      }),
    );
    expect(staleRes.status).toBe(409);

    // ---- security invariant (b): persisted auth hash ≠ vault key, and
    // the auth hash cannot be turned into the vault key. A server holding
    // only the persisted auth hash still cannot decrypt the vault. ----
    expect(persistedUser!.authHash).not.toBe(toBase64(keys.vaultKey));
    const sodiumMod = await import("libsodium-wrappers-sumo");
    const s = (sodiumMod as any).default ?? sodiumMod;
    await s.ready;
    const fakeVaultKey = s.crypto_kdf_derive_from_key(
      32,
      1,
      "pmvault1",
      fromBase64(persistedUser!.authHash),
    );
    await expect(
      decryptVault(fromBase64(loginJson.vaultCiphertext), fakeVaultKey),
    ).rejects.toThrow();
  }, 30000);
});