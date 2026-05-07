import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EmailToSelf } from '../src/core/EmailToSelf';
import { clearDismiss } from '../src/core/persistence';

function findHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-ets-host=""]');
}

function shadow(host: HTMLElement): ShadowRoot {
  if (!host.shadowRoot) throw new Error('no shadow root');
  return host.shadowRoot;
}

const tick = (ms = 32) => new Promise((r) => setTimeout(r, ms));

async function submit(opts: ConstructorParameters<typeof EmailToSelf>[0]): Promise<string> {
  let captured = '';
  new EmailToSelf({
    ...opts,
    forceShow: true,
    trigger: 'load',
    action: async (_email, meta) => {
      captured = meta.url;
    },
  });
  await tick();
  const sr = shadow(findHost()!);
  const input = sr.querySelector('input[type="email"]') as HTMLInputElement;
  const form = sr.querySelector('form') as HTMLFormElement;
  input.value = 'aki.mori@gmail.com';
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await tick(50);
  return captured;
}

describe('utm_email tagging', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearDismiss();
  });
  afterEach(() => {
    document.body.innerHTML = '';
    clearDismiss();
  });

  it('appends utm_email when trackInSpectacle is true', async () => {
    const url = await submit({ trackInSpectacle: true, url: 'https://example.com/article' });
    expect(url).toBe('https://example.com/article?utm_email=aki.mori%40gmail.com');
  });

  it('uses & when the URL already has a query string', async () => {
    const url = await submit({
      trackInSpectacle: true,
      url: 'https://example.com/article?ref=newsletter',
    });
    const u = new URL(url);
    expect(u.searchParams.get('ref')).toBe('newsletter');
    expect(u.searchParams.get('utm_email')).toBe('aki.mori@gmail.com');
  });

  it('replaces an existing utm_email rather than appending a duplicate', async () => {
    const url = await submit({
      trackInSpectacle: true,
      url: 'https://example.com/article?utm_email=stale@example.com',
    });
    const u = new URL(url);
    // Only one utm_email param should be present and it must be the new value.
    expect(u.searchParams.getAll('utm_email')).toEqual(['aki.mori@gmail.com']);
  });

  it('does not modify the URL when trackInSpectacle is false', async () => {
    const url = await submit({ url: 'https://example.com/article' });
    expect(url).toBe('https://example.com/article');
  });
});
