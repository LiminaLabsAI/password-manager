"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  encryptVault,
  toBase64,
  fromBase64,
  decryptVault,
} from "@/lib/crypto";
import { emptyVault, serializeVault, deserializeVault } from "@/lib/vault";
import { getSession, setSession, clearSession } from "@/lib/session";

export default function VaultPage() {
  const router = useRouter();
  const session = getSession();
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 p-6 border rounded max-w-sm">
          <h1 className="text-2xl font-bold">Vault</h1>
          <p>No active session. Log in first.</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full p-2 bg-black text-white rounded"
          >
            Go to login
          </button>
        </div>
      </main>
    );
  }

  async function saveEmptyVault() {
    setBusy(true);
    setStatus("");
    try {
      const vault = emptyVault();
      const blob = await encryptVault(serializeVault(vault), session!.vaultKey);
      const res = await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session!.email,
          authHash: session!.authHash,
          vaultCiphertext: toBase64(blob),
          baseVersion: session!.vaultVersion,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      const { version } = (await res.json()) as { version: number };
      setSession({ ...session!, vaultVersion: version });
      setStatus(`Saved. New vault version ${version}.`);
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function reloadVault() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/vault", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session!.email,
          authHash: session!.authHash,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Reload failed (${res.status})`);
      }
      const { vaultCiphertext, vaultVersion } = (await res.json()) as {
        vaultCiphertext: string;
        vaultVersion: number;
      };
      // Re-decrypt to confirm the round-trip is honest (server returns
      // ciphertext the client can still open with the in-memory vault key).
      const plaintext = deserializeVault(
        await decryptVault(fromBase64(vaultCiphertext), session!.vaultKey),
      );
      setSession({ ...session!, vaultVersion: vaultVersion });
      setStatus(`Reloaded + decrypted. Entries: ${plaintext.entries.length}.`);
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-2xl font-bold">Vault</h1>
        <p className="text-sm text-gray-700">
          Logged in as <strong>{session.email}</strong>. Vault version{" "}
          {session.vaultVersion}. (Phase 0: empty vault round-trip only.)
        </p>
        <button
          onClick={saveEmptyVault}
          disabled={busy}
          className="w-full p-2 bg-black text-white rounded disabled:opacity-50"
        >
          {busy ? "Working…" : "Save empty vault"}
        </button>
        <button
          onClick={reloadVault}
          disabled={busy}
          className="w-full p-2 border rounded disabled:opacity-50"
        >
          Reload + decrypt
        </button>
        <button onClick={logout} className="w-full p-2 border rounded">
          Log out
        </button>
        {status && <p className="text-sm text-gray-700">{status}</p>}
      </div>
    </main>
  );
}