import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDismiss, isDismissed, recordDismiss } from '../src/core/persistence';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    clearDismiss();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('localStorage strategy: not dismissed by default', () => {
    expect(isDismissed()).toBe(false);
  });

  it('localStorage strategy: writes + reads dismiss record', () => {
    recordDismiss();
    expect(isDismissed()).toBe(true);
  });

  it('localStorage strategy: expires after TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    recordDismiss({ strategy: 'localStorage', ttlDays: 7 });
    expect(isDismissed({ strategy: 'localStorage', ttlDays: 7 })).toBe(true);
    vi.setSystemTime(new Date('2026-01-09T00:00:01Z'));
    expect(isDismissed({ strategy: 'localStorage', ttlDays: 7 })).toBe(false);
  });

  it('always strategy: never dismissed', () => {
    recordDismiss({ strategy: 'always' });
    expect(isDismissed({ strategy: 'always' })).toBe(false);
  });

  it('session strategy: persists for the page lifetime', () => {
    expect(isDismissed({ strategy: 'session' })).toBe(false);
    recordDismiss({ strategy: 'session' });
    expect(isDismissed({ strategy: 'session' })).toBe(true);
    clearDismiss();
    expect(isDismissed({ strategy: 'session' })).toBe(false);
  });

  it('clears corrupt dismiss records', () => {
    localStorage.setItem('ets_dismissed', 'not-a-date');
    expect(isDismissed()).toBe(false);
    expect(localStorage.getItem('ets_dismissed')).toBe(null);
  });
});
