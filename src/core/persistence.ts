import type { PersistenceOptions } from './types';

const STORAGE_KEY = 'ets_dismissed';
const SESSION_KEY = '__ets_dismissed_session__';

const DEFAULTS = { strategy: 'localStorage', ttlDays: 7 } satisfies PersistenceOptions;

function safeLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    // Touch the API to surface privacy-mode SecurityErrors here, not on use.
    const probe = '__ets_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function isDismissed(opts?: PersistenceOptions): boolean {
  const { strategy, ttlDays = DEFAULTS.ttlDays } = { ...DEFAULTS, ...opts };
  if (strategy === 'always') return false;

  if (strategy === 'session') {
    try {
      // sessionStorage in-memory fallback handled by the in-window session map.
      if (typeof window !== 'undefined') {
        const w = window as Window & { [SESSION_KEY]?: number };
        return w[SESSION_KEY] === 1;
      }
      return false;
    } catch {
      return false;
    }
  }

  const ls = safeLocalStorage();
  if (!ls) return false;
  const raw = ls.getItem(STORAGE_KEY);
  if (!raw) return false;
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) {
    ls.removeItem(STORAGE_KEY);
    return false;
  }
  const ageMs = Date.now() - ts;
  const ttlMs = (ttlDays ?? 7) * 24 * 60 * 60 * 1000;
  if (ageMs > ttlMs) {
    ls.removeItem(STORAGE_KEY);
    return false;
  }
  return true;
}

export function recordDismiss(opts?: PersistenceOptions): void {
  const { strategy } = { ...DEFAULTS, ...opts };
  if (strategy === 'always') return;

  if (strategy === 'session') {
    try {
      if (typeof window !== 'undefined') {
        (window as Window & { [SESSION_KEY]?: number })[SESSION_KEY] = 1;
      }
    } catch {
      /* noop */
    }
    return;
  }

  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    /* quota or privacy mode — silently ignore */
  }
}

export function clearDismiss(): void {
  const ls = safeLocalStorage();
  if (ls) ls.removeItem(STORAGE_KEY);
  try {
    if (typeof window !== 'undefined') {
      delete (window as Window & { [SESSION_KEY]?: number })[SESSION_KEY];
    }
  } catch {
    /* noop */
  }
}
