import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, normalizeEmail, readJson } from "@/lib/auth";
import { toBase64 } from "@/lib/crypto";

// Returns the Argon2id salt for an email so the client can re-derive the
// auth hash before calling /api/login.
//
// Information-disclosure note: this endpoint reveals whether an email is
// registered (200 + salt vs 404). For a personal single-user MVP this is an
// acceptable trade-off (the attacker learns one email exists); a later
// phase can return a deterministic fake salt for unknown emails to mask
// enumeration.
interface ChallengeBody {
  email?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await readJson(req)) as ChallengeBody | null;
  if (!body) return badRequest("Invalid JSON");
  if (!body.email) return badRequest("Missing email");

  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { salt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "No such user" }, { status: 404 });
  }
  return NextResponse.json({ salt: toBase64(user.salt as Uint8Array) });
}