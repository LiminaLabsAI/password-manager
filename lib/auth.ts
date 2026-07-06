import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { constantTimeEqual, fromBase64 } from "@/lib/crypto";

export interface AuthedUser {
  id: string;
  email: string;
  vaultVersion: number;
}

/**
 * Verify the (email, authHash) bearer credentials on a request body.
 * Returns the user if the auth hash matches (constant-time), else null.
 *
 * The auth hash is a 32-byte Argon2id-derived value; it is NOT the master
 * password. Sending it as a bearer credential on every request is the
 * MVP auth model (no session store). The master password never leaves the
 * browser.
 */
export async function requireAuth(body: {
  email?: unknown;
  authHash?: unknown;
}): Promise<AuthedUser | null> {
  if (typeof body.email !== "string" || typeof body.authHash !== "string") {
    return null;
  }
  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({
 where: { email },
    select: { id: true, email: true, authHash: true, vaultVersion: true },
  });
  if (!user) return null;
  let ok: boolean;
  try {
    ok = await constantTimeEqual(fromBase64(body.authHash), fromBase64(user.authHash));
  } catch {
    return null;
  }
  return ok
    ? { id: user.id, email: user.email, vaultVersion: user.vaultVersion }
    : null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}