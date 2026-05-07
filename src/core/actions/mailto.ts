import type { ActionFn } from '../types';

/**
 * Default action: open the device's `mailto:` handler with a pre-filled
 * subject (page title) and body (page URL). The user remains on-page; the OS
 * decides which mail app to launch.
 *
 * The promise resolves once the navigation has been triggered. We do not — and
 * cannot — observe whether the user actually sent the email. Success copy is
 * deliberately conservative ("handed to your mail app") to reflect this.
 */
export const mailtoAction: ActionFn = async (email, meta) => {
  const subject = encodeURIComponent(meta.title || 'A link to read later');
  const body = encodeURIComponent(`${meta.title}\n\n${meta.url}\n`);
  // Email is left literal: per RFC 6068 the address goes in unencoded, and
  // some iOS / Android clients render `%40` literally instead of decoding it.
  // `isValidEmail` has already rejected whitespace and ensured one `@`.
  const href = `mailto:${email}?subject=${subject}&body=${body}`;

  // Use an anchor click so this works inside iOS in-app browser sandboxing,
  // which is more permissive about user-initiated clicks than location.assign.
  const a = document.createElement('a');
  a.href = href;
  a.style.display = 'none';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();

  return { ok: true };
};
