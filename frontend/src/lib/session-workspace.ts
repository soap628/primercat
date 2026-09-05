/** Tab-scoped workspace snapshots; never stored in localStorage or uploaded. */
export interface WorkspaceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memory = new Map<string, string>();
const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;

export function browserSessionStorage(): WorkspaceStorage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; }
  catch { return null; }
}

export function readSessionWorkspace<T>(
  key: string,
  validate: (value: unknown) => value is T,
  storage: WorkspaceStorage | null,
): T | null {
  let serialized = memory.get(key) ?? null;
  if (!serialized) {
    try { serialized = storage?.getItem(key) ?? null; } catch {}
  }
  if (!serialized) return null;
  try {
    if (serialized.length > MAX_SNAPSHOT_BYTES) throw new Error("Oversized workspace");
    const record = JSON.parse(serialized);
    if (record?.version !== 1 || !validate(record.value)) throw new Error("Invalid workspace");
    // Returning parsed data keeps callers from mutating the cached snapshot.
    return record.value;
  } catch {
    clearSessionWorkspace(key, storage);
    return null;
  }
}

/** False means navigation is protected by memory only; reload is not assured. */
export function writeSessionWorkspace<T>(key: string, value: T, storage: WorkspaceStorage | null): boolean {
  try {
    const serialized = JSON.stringify({ version: 1, value });
    if (serialized.length > MAX_SNAPSHOT_BYTES) {
      clearSessionWorkspace(key, storage);
      return false;
    }
    memory.set(key, serialized);
    if (!storage) return false;
    storage.setItem(key, serialized);
    return true;
  } catch {
    // A quota/security failure may occur after memory was updated. Keep that
    // latest navigation snapshot, but never let an older disk copy reappear.
    try { storage?.removeItem(key); } catch {}
    return false;
  }
}

export function clearSessionWorkspace(key: string, storage: WorkspaceStorage | null): void {
  memory.delete(key);
  try { storage?.removeItem(key); } catch {}
}
