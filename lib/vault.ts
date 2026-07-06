// The vault shape. Phase 0 ships an empty vault; Phase 1 adds real entries.
// The whole object is serialized to JSON and encrypted as a single blob.

export interface VaultEntry {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

export interface VaultShape {
  entries: VaultEntry[];
}

export function emptyVault(): VaultShape {
  return { entries: [] };
}

export function serializeVault(vault: VaultShape): string {
  return JSON.stringify(vault);
}

export function deserializeVault(json: string): VaultShape {
  const parsed = JSON.parse(json) as VaultShape;
  if (!Array.isArray(parsed.entries)) {
    throw new Error("Invalid vault shape: missing entries array");
  }
  return parsed;
}