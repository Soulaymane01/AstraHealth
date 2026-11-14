const PREFIX = "astra.clinical.v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ClinicalCacheEntry<T> {
  data: T;
  savedAt: number;
}

function storageKey(userId: number, name: string): string {
  return `${PREFIX}.${userId}.${name}`;
}

function storage(): Storage | null {
  return typeof window !== "undefined" ? window.localStorage : null;
}

/**
 * A small, user-scoped read cache for the offline Flight Deck. It holds only
 * the last successful response; it is never used to satisfy a write and it is
 * cleared on logout. The app is local-first, so localStorage keeps the demo
 * simple; a production build should move this to IndexedDB/encrypted storage.
 */
export function readClinical<T>(
  userId: number | null | undefined,
  name: string,
): ClinicalCacheEntry<T> | null {
  if (!userId) return null;
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(storageKey(userId, name));
    if (!raw) return null;
    const entry = JSON.parse(raw) as ClinicalCacheEntry<T>;
    if (!entry || typeof entry.savedAt !== "number") return null;
    if (Date.now() - entry.savedAt > MAX_AGE_MS) {
      store.removeItem(storageKey(userId, name));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function writeClinical<T>(
  userId: number | null | undefined,
  name: string,
  data: T,
): void {
  if (!userId) return;
  const store = storage();
  if (!store) return;
  try {
    store.setItem(
      storageKey(userId, name),
      JSON.stringify({ data, savedAt: Date.now() } satisfies ClinicalCacheEntry<T>),
    );
  } catch {
    // Quota or serialization failures must never break a live response.
  }
}

export function clearClinicalCache(): void {
  const store = storage();
  if (!store) return;
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => store.removeItem(key));
}
