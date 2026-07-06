"use client";

import { useState } from "react";
import { deriveKeys, encryptVault, toBase64 } from "@/lib/crypto";
import { emptyVault, serializeVault } from "@/lib/vault";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const keys = await deriveKeys(masterPassword);
      const blob = await encryptVault(serializeVault(emptyVault()), keys.vaultKey);
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          salt: toBase64(keys.salt),
          authHash: toBase64(keys.authHash),
          vaultCiphertext: toBase64(blob),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Signup failed (${res.status})`);
      }
      setStatus("Account created. Go to /login.");
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-2xl font-bold">Create account</h1>
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
          {busy ? "Creating…" : "Create account"}
        </button>
        {status && <p className="text-sm text-gray-700">{status}</p>}
        <p>
          Already have an account? <a href="/login" className="underline">Login</a>
        </p>
      </form>
    </main>
  );
}