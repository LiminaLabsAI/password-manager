import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, conflict, normalizeEmail, readJson } from "@/lib/auth";

interface SignupBody {
  email?: string;
  salt?: string; // base64, 16 bytes
  authHash?: string; // base64, 32 bytes
  vaultCiphertext?: string; // base64, nonce||ciphertext+tag
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await readJson(req)) as SignupBody | null;
  if (!body) return badRequest("Invalid JSON");

  const email = body.email ? normalizeEmail(body.email) : "";
  if (!email || !email.includes("@")) return badRequest("Invalid email");
  if (!body.salt) return badRequest("Missing salt");
  if (!body.authHash) return badRequest("Missing authHash");
  if (!body.vaultCiphertext) return badRequest("Missing vaultCiphertext");

  const salt = Buffer.from(body.salt, "base64");
  if (salt.length !== 16) return badRequest("salt must be 16 bytes");
  const authHash = body.authHash;
  const ciphertext = Buffer.from(body.vaultCiphertext, "base64");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return conflict("Email already registered");

  await prisma.user.create({
    data: {
      email,
      authHash,
      salt,
      vaultVersion: 1,
      vault: {
        create: {
          ciphertext,
          version: 1,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, version: 1 });
}