// Conservative, non-RFC-strict pattern. We accept anything that "looks like an email"
// and let the SMTP/MX layer be the source of truth. Trims surrounding whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length === 0 || v.length > 254) return false;
  return EMAIL_RE.test(v);
}
