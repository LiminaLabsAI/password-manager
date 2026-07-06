"use client";

// In-memory session holder for Phase 0. The session is lost on reload —
// by design, the vault key is never persisted to storage. A later phase
// may add lock-on-timeout semantics on top of this in-memory model.

export interface Session {
  email: string;
  authHash: string; // base64
  vaultKey: Uint8Array;
  vaultVersion: number;
}

let _session: Session | null = null;

export function getSession(): Session | null {
  return _session;
}

export function setSession(s: Session | null): void {
  _session = s;
}

export function clearSession(): void {
  _session = null;
}