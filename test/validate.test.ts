import { describe, expect, it } from 'vitest';
import { isValidEmail } from '../src/core/validate';

describe('isValidEmail', () => {
  it.each(['a@b.co', 'aki.mori@gmail.com', 'user+tag@sub.example.org', '  trim@me.com  '])(
    'accepts %s',
    (v) => {
      expect(isValidEmail(v)).toBe(true);
    },
  );

  it.each([
    '',
    'plain',
    'a@b',
    'a b@c.com',
    'no-at-sign.com',
    '@no-local.com',
    'no-domain@',
    'two@@signs.com',
  ])('rejects %s', (v) => {
    expect(isValidEmail(v)).toBe(false);
  });

  it('rejects very long input', () => {
    const local = 'a'.repeat(260);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
  });
});
