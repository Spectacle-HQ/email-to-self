/**
 * IIFE bundle entry point.
 *
 * Exposes the public API on `window.EmailToSelf` so consumers can drop a
 * single <script> tag and either auto-init via data attributes or call
 * `EmailToSelf.init({...})` from inline JS.
 *
 * @example
 * ```html
 * <script src="https://unpkg.com/@spectaclehq/email-to-self/iife"
 *         data-ets-auto
 *         data-ets-layout="drawer"
 *         data-ets-track-in-spectacle="true"></script>
 * ```
 */

import { EmailToSelf } from './core/EmailToSelf';
import { clearDismiss, isDismissed, recordDismiss } from './core/persistence';
import { detectInAppBrowser } from './core/detection';
import { isValidEmail } from './core/validate';
import { defaultCopy } from './core/i18n';
import { mailtoAction } from './core/actions/mailto';
import type { EmailToSelfOptions, Layout } from './core/types';

function bool(v: string | null | undefined): boolean {
  return v === '' || v === 'true' || v === '1';
}

function readScriptDataset(): EmailToSelfOptions | null {
  if (typeof document === 'undefined') return null;
  const script = (document.currentScript ||
    document.querySelector('script[data-ets-auto]')) as HTMLScriptElement | null;
  if (!script || !script.hasAttribute('data-ets-auto')) return null;
  const ds = script.dataset;
  const opts: EmailToSelfOptions = {};
  if (ds.etsLayout) opts.layout = ds.etsLayout as Layout;
  if (ds.etsForceShow) opts.forceShow = bool(ds.etsForceShow);
  if (ds.etsTrackInSpectacle) opts.trackInSpectacle = bool(ds.etsTrackInSpectacle);
  if (ds.etsLogoUrl) opts.logoUrl = ds.etsLogoUrl;
  if (ds.etsPrefillEmail) opts.prefillEmail = ds.etsPrefillEmail;
  return opts;
}

const auto = readScriptDataset();
if (auto) {
  // Defer to DOMContentLoaded so the trigger logic in the constructor sees a
  // ready document.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new EmailToSelf(auto), { once: true });
  } else {
    new EmailToSelf(auto);
  }
}

export {
  EmailToSelf,
  detectInAppBrowser,
  isValidEmail,
  isDismissed,
  recordDismiss,
  clearDismiss,
  defaultCopy,
  mailtoAction,
};

/** Convenience for the IIFE: `EmailToSelf.init({...})`. */
export function init(options?: EmailToSelfOptions): EmailToSelf {
  return new EmailToSelf(options);
}
