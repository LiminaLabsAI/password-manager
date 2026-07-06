import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, unauthorized, normalizeEmail, readJson } from "@/lib/auth";
import { constantTimeEqual, fromBase64, toBase64 } from "@/lib/crypto";

interface LoginBody {
  email?: string;
  authHash?: string; // base64
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await readJson(req)) as LoginBody | null;
  if (!body) return badRequest("Invalid JSON");
  if (!body.email || !body.authHash) return badRequest("Missing credentials");

  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, authHash: true, vaultVersion: true, vault: true },
  });
  if (!user || !user.vault) return unauthorized();

  let ok: boolean;
  try {
    ok = await constantTimeEqual(fromBase64(body.authHash), fromBase64(user.authHash));
  } catch {
    return unauthorized();
  }
  if (!ok) return unauthorized();

  return NextResponse.json({
    vaultCiphertext: toBase64(user.vault.ciphertext as Uint8Array),
    vaultVersion: user.vault.version,
    serverVersion: user.vaultVersion,
  });
}