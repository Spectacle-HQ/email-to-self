import { describe, expect, it } from 'vitest';
import {
  decodeEmailToSelfEnvelope,
  signEmailToSelfPayload,
  verifyEmailToSelfPayload,
} from '../src/server';

const SECRET = 'a'.repeat(64);
const OTHER_SECRET = 'b'.repeat(64);
const KEY_ID = 'ets_pub_test';
const URL = 'https://example.com/blog/post';
const TITLE = 'Hello, world';

function fixedTimeSign(opts: { now: number; ttlSeconds?: number }): string {
  return signEmailToSelfPayload({
    keyId: KEY_ID,
    secret: SECRET,
    url: URL,
    title: TITLE,
    ttlSeconds: opts.ttlSeconds,
    now: opts.now,
  });
}

describe('signEmailToSelfPayload', () => {
  it('returns a two-part dot-separated envelope', () => {
    const env = signEmailToSelfPayload({ keyId: KEY_ID, secret: SECRET, url: URL, title: TITLE });
    const parts = env.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.length).toBeGreaterThan(0);
    expect(parts[1]!.length).toBeGreaterThan(0);
  });

  it('embeds the supplied url, title and keyId into the payload', () => {
    const env = signEmailToSelfPayload({ keyId: KEY_ID, secret: SECRET, url: URL, title: TITLE });
    const decoded = decodeEmailToSelfEnvelope(env);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.payload.keyId).toBe(KEY_ID);
    expect(decoded.payload.url).toBe(URL);
    expect(decoded.payload.title).toBe(TITLE);
    expect(decoded.payload.v).toBe(1);
  });

  it('produces different envelopes on each call (fresh nonce)', () => {
    const a = signEmailToSelfPayload({ keyId: KEY_ID, secret: SECRET, url: URL, title: TITLE });
    const b = signEmailToSelfPayload({ keyId: KEY_ID, secret: SECRET, url: URL, title: TITLE });
    expect(a).not.toEqual(b);
  });

  it('clamps ttlSeconds to the documented bounds', () => {
    const tooShort = signEmailToSelfPayload({
      keyId: KEY_ID,
      secret: SECRET,
      url: URL,
      title: TITLE,
      ttlSeconds: 1,
      now: 1000,
    });
    const tooLong = signEmailToSelfPayload({
      keyId: KEY_ID,
      secret: SECRET,
      url: URL,
      title: TITLE,
      ttlSeconds: 999_999,
      now: 1000,
    });
    const a = decodeEmailToSelfEnvelope(tooShort);
    const b = decodeEmailToSelfEnvelope(tooLong);
    expect(a.ok && a.payload.exp - a.payload.iat).toBe(60);
    expect(b.ok && b.payload.exp - b.payload.iat).toBe(86400);
  });

  it('rejects non-https urls', () => {
    expect(() =>
      signEmailToSelfPayload({
        keyId: KEY_ID,
        secret: SECRET,
        url: 'http://example.com',
        title: TITLE,
      }),
    ).toThrow(/https/);
  });

  it('rejects malformed urls', () => {
    expect(() =>
      signEmailToSelfPayload({
        keyId: KEY_ID,
        secret: SECRET,
        url: 'not a url',
        title: TITLE,
      }),
    ).toThrow(/valid URL/);
  });

  it('rejects empty/whitespace-only titles', () => {
    expect(() =>
      signEmailToSelfPayload({ keyId: KEY_ID, secret: SECRET, url: URL, title: '   ' }),
    ).toThrow(/non-empty/);
  });

  it('clips overlong titles and strips control chars', () => {
    const longTitle = 'a'.repeat(500);
    const env = signEmailToSelfPayload({
      keyId: KEY_ID,
      secret: SECRET,
      url: URL,
      title: longTitle,
    });
    const decoded = decodeEmailToSelfEnvelope(env);
    expect(decoded.ok && decoded.payload.title.length).toBe(200);

    const dirty = `Hello\x00\x07world`;
    const env2 = signEmailToSelfPayload({
      keyId: KEY_ID,
      secret: SECRET,
      url: URL,
      title: dirty,
    });
    const dec2 = decodeEmailToSelfEnvelope(env2);
    expect(dec2.ok && dec2.payload.title).toBe('Hello world');
  });

  it('rejects short or non-string secrets', () => {
    expect(() =>
      signEmailToSelfPayload({ keyId: KEY_ID, secret: 'short', url: URL, title: TITLE }),
    ).toThrow(/at least 32/);
  });

  it('rejects empty keyId', () => {
    expect(() =>
      signEmailToSelfPayload({ keyId: '', secret: SECRET, url: URL, title: TITLE }),
    ).toThrow(/non-empty/);
  });
});

describe('verifyEmailToSelfPayload', () => {
  it('round-trips a freshly signed envelope', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now });
    const result = verifyEmailToSelfPayload(env, SECRET, { now });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.url).toBe(URL);
      expect(result.payload.title).toBe(TITLE);
    }
  });

  it('rejects a tampered payload (url swapped)', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now });
    const [encodedPayload, sig] = env.split('.');
    const decoded = JSON.parse(Buffer.from(encodedPayload!, 'base64url').toString('utf8'));
    decoded.url = 'https://attacker.example/phish';
    const tampered = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`;

    const result = verifyEmailToSelfPayload(tampered, SECRET, { now });
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects a tampered payload (title swapped)', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now });
    const [encodedPayload, sig] = env.split('.');
    const decoded = JSON.parse(Buffer.from(encodedPayload!, 'base64url').toString('utf8'));
    decoded.title = 'Click to win $$$';
    const tampered = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`;

    const result = verifyEmailToSelfPayload(tampered, SECRET, { now });
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects a wrong-secret verification', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now });
    const result = verifyEmailToSelfPayload(env, OTHER_SECRET, { now });
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects an expired envelope', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now, ttlSeconds: 60 });
    const result = verifyEmailToSelfPayload(env, SECRET, { now: now + 120 });
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a future-dated envelope (beyond clock skew)', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now: now + 600 });
    const result = verifyEmailToSelfPayload(env, SECRET, { now });
    expect(result).toEqual({ ok: false, reason: 'future_dated' });
  });

  it('tolerates 60s of forward clock skew', () => {
    const now = 1_000_000;
    const env = fixedTimeSign({ now: now + 30 });
    const result = verifyEmailToSelfPayload(env, SECRET, { now });
    expect(result.ok).toBe(true);
  });

  it.each(['malformed', 'no-dot-separator', '.startswithdot', 'endswithdot.', 'a.b'])(
    'returns malformed for %s',
    (input) => {
      const result = verifyEmailToSelfPayload(input, SECRET, { now: 1_000_000 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['malformed', 'invalid_payload']).toContain(result.reason);
      }
    },
  );

  it('returns invalid_payload for a well-formed-but-empty envelope', () => {
    const payloadBytes = Buffer.from('{}', 'utf8');
    const sigBytes = Buffer.from('sig');
    const env = `${payloadBytes.toString('base64url')}.${sigBytes.toString('base64url')}`;
    const result = verifyEmailToSelfPayload(env, SECRET, { now: 1_000_000 });
    expect(result).toEqual({ ok: false, reason: 'invalid_payload' });
  });
});

describe('decodeEmailToSelfEnvelope', () => {
  it('returns malformed for non-string input', () => {
    expect(decodeEmailToSelfEnvelope(null as unknown as string)).toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(decodeEmailToSelfEnvelope(123 as unknown as string)).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('exposes raw bytes the verifier can re-hash', () => {
    const env = signEmailToSelfPayload({
      keyId: KEY_ID,
      secret: SECRET,
      url: URL,
      title: TITLE,
    });
    const decoded = decodeEmailToSelfEnvelope(env);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(Buffer.isBuffer(decoded.payloadBytes)).toBe(true);
    expect(Buffer.isBuffer(decoded.sigBytes)).toBe(true);
    expect(decoded.sigBytes.length).toBe(32); // HMAC-SHA256
  });
});
