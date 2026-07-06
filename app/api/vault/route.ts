import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  badRequest,
  unauthorized,
  conflict,
  requireAuth,
  normalizeEmail,
  readJson,
} from "@/lib/auth";
import { fromBase64, toBase64 } from "@/lib/crypto";

// GET /api/vault: return the latest ciphertext + version for the authed user.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const body = (await readJson(req)) as
    | { email?: string; authHash?: string }
    | null;
  if (!body) return badRequest("Invalid JSON");
  const authed = await requireAuth(body);
  if (!authed) return unauthorized();

  const vault = await prisma.vault.findUnique({
    where: { userId: authed.id },
    select: { ciphertext: true, version: true },
  });
  if (!vault) return NextResponse.json({ error: "No vault" }, { status: 404 });

  return NextResponse.json({
    vaultCiphertext: toBase64(vault.ciphertext as Uint8Array),
    vaultVersion: vault.version,
    serverVersion: authed.vaultVersion,
  });
}

interface PutBody {
  email?: string;
  authHash?: string;
  vaultCiphertext?: string; // base64
  baseVersion?: number; // the version the client last read
}

// PUT /api/vault: last-write-wins via optimistic concurrency.
// Accepts only if `baseVersion` === server's current `vaultVersion`; on
// accept, writes the new ciphertext and increments `vaultVersion` and the
// Vault row's `version` to `baseVersion + 1`.
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const body = (await readJson(req)) as PutBody | null;
  if (!body) return badRequest("Invalid JSON");
  const authed = await requireAuth(body);
  if (!authed) return unauthorized();

  if (!body.vaultCiphertext) return badRequest("Missing vaultCiphertext");
  if (typeof body.baseVersion !== "number" || !Number.isFinite(body.baseVersion)) {
    return badRequest("Missing baseVersion");
  }

  // Raw base64 validation — reject malformed ciphertext early.
  try {
    fromBase64(body.vaultCiphertext);
  } catch {
    return badRequest("vaultCiphertext is not valid base64");
  }

  // Optimistic-concurrency guard.
  if (body.baseVersion !== authed.vaultVersion) {
    return conflict(
      `Stale write: client baseVersion=${body.baseVersion}, server version=${authed.vaultVersion}`,
    );
  }

  const newVersion = body.baseVersion + 1;
  const ciphertext = Buffer.from(body.vaultCiphertext, "base64");

  const updated = await prisma.user.update({
    where: { id: authed.id },
    data: {
      vaultVersion: newVersion,
      vault: {
        update: {
          ciphertext,
          version: newVersion,
        },
      },
    },
    select: { vaultVersion: true },
  });

  return NextResponse.json({ ok: true, version: updated.vaultVersion });
}

// Suppress unused-import warning for normalizeEmail (kept for parity).
void normalizeEmail;