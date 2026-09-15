/**
 * The terminal's persisted sign-in, exposed as an external store.
 *
 * `localStorage` is an external system, so React's own primitive for reading it
 * is `useSyncExternalStore` rather than an effect that calls setState on mount —
 * that pattern causes a cascading render and is what
 * `react-hooks/set-state-in-effect` warns about.
 *
 * `getSnapshot` must return a referentially stable value between changes or
 * React will re-render forever, so the parsed object is cached and only
 * replaced when something actually writes.
 */

const STORAGE_KEY = "restohub.pos.session";

export interface PersistedSession {
  cashierId: string;
  signedInAt: string;
  locked: boolean;
}

/** `undefined` means "not read yet" (server render / hydration). */
type Snapshot = PersistedSession | null | undefined;

let cache: Snapshot = undefined;
let hasRead = false;
const listeners = new Set<() => void>();

function readStorage(): PersistedSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (typeof parsed?.cashierId !== "string") return null;
    return {
      cashierId: parsed.cashierId,
      signedInAt: typeof parsed.signedInAt === "string" ? parsed.signedInAt : new Date().toISOString(),
      locked: Boolean(parsed.locked),
    };
  } catch {
    // Private mode, blocked site data, or corrupt JSON — start signed out.
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab on the same terminal signing out should lock this one too.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cache = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): Snapshot {
  if (!hasRead) {
    cache = readStorage();
    hasRead = true;
  }
  return cache;
}

/** During SSR and hydration nothing has been read yet. */
export function getServerSnapshot(): Snapshot {
  return undefined;
}

export function writeSession(next: PersistedSession | null): void {
  cache = next;
  hasRead = true;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the session still works, it just won't survive reload.
  }
  emit();
}
