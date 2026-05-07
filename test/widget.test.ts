import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EmailToSelf } from '../src/core/EmailToSelf';
import { clearDismiss } from '../src/core/persistence';

function findHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-ets-host=""]');
}

function shadow(host: HTMLElement | null): ShadowRoot {
  if (!host || !host.shadowRoot) throw new Error('host or shadowRoot missing');
  return host.shadowRoot;
}

async function tick(ms = 32): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('EmailToSelf widget', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearDismiss();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    clearDismiss();
  });

  it('does not mount when not in an in-app browser', async () => {
    new EmailToSelf({ trigger: 'load' });
    await tick();
    expect(findHost()).toBeNull();
  });

  it('mounts when forceShow is set', async () => {
    new EmailToSelf({ forceShow: true, trigger: 'load' });
    await tick();
    expect(findHost()).not.toBeNull();
    const root = shadow(findHost()).querySelector('.root');
    expect(root?.classList.contains('layout-drawer')).toBe(true);
  });

  it('renders heading + email input + dismiss button', async () => {
    new EmailToSelf({ forceShow: true, trigger: 'load', layout: 'drawer' });
    await tick();
    const sr = shadow(findHost());
    expect(sr.querySelector('.heading')?.textContent).toContain('Email this to yourself');
    expect(sr.querySelector('input[type="email"]')).not.toBeNull();
    expect(sr.querySelector('.dismiss')).not.toBeNull();
  });

  it('shows inline error for invalid email', async () => {
    new EmailToSelf({ forceShow: true, trigger: 'load' });
    await tick();
    const sr = shadow(findHost());
    const input = sr.querySelector('input[type="email"]') as HTMLInputElement;
    const form = sr.querySelector('form') as HTMLFormElement;
    input.value = 'not-an-email';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    const err = sr.querySelector('.error-msg') as HTMLDivElement;
    expect(err.style.display).not.toBe('none');
    expect(err.textContent).toMatch(/valid email/i);
    expect(input.classList.contains('has-error')).toBe(true);
  });

  it('runs custom action and renders success state', async () => {
    let received: string | null = null;
    new EmailToSelf({
      forceShow: true,
      trigger: 'load',
      action: async (email) => {
        received = email;
      },
    });
    await tick();
    const sr = shadow(findHost());
    const input = sr.querySelector('input[type="email"]') as HTMLInputElement;
    const form = sr.querySelector('form') as HTMLFormElement;
    input.value = 'aki.mori@gmail.com';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    // The action is async; allow microtasks to drain.
    await tick(50);
    expect(received).toBe('aki.mori@gmail.com');
    expect(sr.querySelector('.success')).not.toBeNull();
  });

  it('renders fullscreen layout with attribution when enabled', async () => {
    new EmailToSelf({
      forceShow: true,
      trigger: 'load',
      layout: 'fullscreen',
      trackInSpectacle: true,
    });
    await tick();
    const sr = shadow(findHost());
    expect(sr.querySelector('.layout-fullscreen')).not.toBeNull();
    expect(sr.querySelector('.footer')?.textContent).toMatch(/Spectacle/);
  });

  it('renders banner layout in collapsed state initially', async () => {
    new EmailToSelf({ forceShow: true, trigger: 'load', layout: 'banner' });
    await tick();
    const sr = shadow(findHost());
    expect(sr.querySelector('.layout-banner')).not.toBeNull();
    const card = sr.querySelector('.card') as HTMLElement;
    expect(card.classList.contains('is-collapsed')).toBe(true);
  });

  it('destroy() removes the host', async () => {
    const w = new EmailToSelf({ forceShow: true, trigger: 'load' });
    await tick();
    expect(findHost()).not.toBeNull();
    w.destroy();
    expect(findHost()).toBeNull();
  });
});
