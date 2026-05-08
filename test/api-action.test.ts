import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiAction } from '../src/core/actions/api';

const HOSTED_ENDPOINT = 'https://t.spectaclehq.com/email-to-self';
const ENVELOPE = 'eyJrZXkiOiJ2YWx1ZSJ9.signature';
const META = { url: 'https://example.com', title: 'Hi', layout: 'drawer' as const };

describe('apiAction', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('throws when etsPayload is missing', () => {
    // @ts-expect-error — testing runtime guard
    expect(() => apiAction({})).toThrow(/etsPayload/);
  });

  it('POSTs JSON { email, envelope } to the hardcoded Spectacle endpoint', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const action = apiAction({ etsPayload: ENVELOPE, fetch: fetchMock });

    const result = await action('user@example.com', META);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(HOSTED_ENDPOINT);
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).mode).toBe('cors');
    expect((init as RequestInit).credentials).toBe('omit');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      email: 'user@example.com',
      envelope: ENVELOPE,
    });
  });

  it('returns a friendly error result on network failure', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const action = apiAction({ etsPayload: ENVELOPE, fetch: fetchMock });
    const result = await action('user@example.com', META);
    expect(result).toEqual({ ok: false, message: 'offline' });
  });

  it('surfaces a server-supplied error message from JSON body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Rate limited, retry later' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const action = apiAction({ etsPayload: ENVELOPE, fetch: fetchMock });
    const result = await action('user@example.com', META);
    expect(result).toEqual({ ok: false, message: 'Rate limited, retry later' });
  });

  it('falls back to message-less failure when the server returns non-JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 502 }));
    const action = apiAction({ etsPayload: ENVELOPE, fetch: fetchMock });
    const result = await action('user@example.com', META);
    expect(result).toEqual({ ok: false });
  });

  it('also accepts `error` as the failure message field', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const action = apiAction({ etsPayload: ENVELOPE, fetch: fetchMock });
    const result = await action('user@example.com', META);
    expect(result).toEqual({ ok: false, message: 'Invalid signature' });
  });
});
