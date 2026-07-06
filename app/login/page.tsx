"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deriveKeys, toBase64, fromBase64, decryptVault } from "@/lib/crypto";
import { deserializeVault } from "@/lib/vault";
import { setSession, clearSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      // 1) challenge: fetch the Argon2id salt for this email
      const ch = await fetch("/api/login/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!ch.ok) {
        const data = await ch.json().catch(() => ({}));
        throw new Error(data.error ?? `No such account (${ch.status})`);
      }
      const { salt } = (await ch.json()) as { salt: string };

      // 2) derive keys client-side (master password never leaves the browser)
      const keys = await deriveKeys(masterPassword, fromBase64(salt));

      // 3) prove identity by submitting only the derived auth hash
      const loginRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          authHash: toBase64(keys.authHash),
        }),
      });
      if (!loginRes.ok) {
        const data = await loginRes.json().catch(() => ({}));
        throw new Error(data.error ?? `Login failed (${loginRes.status})`);
      }
      const { vaultCiphertext, vaultVersion } = (await loginRes.json()) as {
        vaultCiphertext: string;
        vaultVersion: number;
      };

      // 4) decrypt the vault with the derived vault key (server can't do this)
      const plaintext = await decryptVault(fromBase64(vaultCiphertext), keys.vaultKey);
      const vault = deserializeVault(plaintext);

      setSession({
        email,
        authHash: toBase64(keys.authHash),
        vaultKey: keys.vaultKey,
        vaultVersion,
      });
      setStatus(`Logged in. Vault has ${vault.entries.length} entries.`);
      router.push("/vault");
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    setStatus("Logged out.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={onLogin} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-2xl font-bold">Log in</h1>
        <input
          type="email"
          required
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          required
          placeholder="master password"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full p-2 bg-black text-white rounded disabled:opacity-50"
        >
          {busy ? "Logging in…" : "Log in"}
        </button>
        {status && <p className="text-sm text-gray-700">{status}</p>}
        <p>
          No account? <a href="/signup" className="underline">Sign up</a>
        </p>
      </form>
    </main>
  );
}