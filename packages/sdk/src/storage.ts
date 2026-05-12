/**
 * Lightweight session-scoped storage.
 * Falls back to in-memory if sessionStorage is unavailable (Safari ITP / privacy modes).
 */

const memory = new Map<string, string>();

export function safeGet(key: string): string | null {
  try {
    const v = window.sessionStorage.getItem(key);
    return v;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function safeSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

export function safeRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    memory.delete(key);
  }
}

export function safeGetJSON<T>(key: string): T | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeSetJSON(key: string, value: unknown): void {
  try {
    safeSet(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const RETURN_VISIT_KEY = "si:returning";

export function detectReturnVisit(): boolean {
  try {
    const local = window.localStorage;
    const seen = local.getItem(RETURN_VISIT_KEY);
    local.setItem(RETURN_VISIT_KEY, String(Date.now()));
    return !!seen;
  } catch {
    return false;
  }
}
