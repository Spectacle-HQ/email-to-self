/**
 * @spectaclehq/email-to-self — vanilla JS / TS entry.
 *
 * Detects in-app browsers (LinkedIn, Instagram, Facebook, …) and prompts the
 * visitor to email the current page link to themselves so they can reopen it
 * in a real browser. Zero runtime dependencies. Shadow-DOM isolated.
 *
 * @example Basic usage:
 * ```ts
 * import { EmailToSelf } from '@spectaclehq/email-to-self';
 * new EmailToSelf();
 * ```
 *
 * @example With a custom send action and Spectacle attribution:
 * ```ts
 * new EmailToSelf({
 *   layout: 'fullscreen',
 *   trackInSpectacle: true,
 *   action: async (email, meta) => {
 *     await fetch('/api/share', { method: 'POST', body: JSON.stringify({ email, ...meta }) });
 *   },
 *   onSubmit: (email) => analytics.track('email_to_self', { email }),
 * });
 * ```
 */

export { EmailToSelf } from './core/EmailToSelf';
export { detectInAppBrowser } from './core/detection';
export { isValidEmail } from './core/validate';
export { isDismissed, recordDismiss, clearDismiss } from './core/persistence';
export { resolveLogoUrl } from './core/favicon';
export { defaultCopy } from './core/i18n';
export { mailtoAction } from './core/actions/mailto';

export type {
  ActionFn,
  ActionMeta,
  ActionResult,
  Copy,
  EmailToSelfInstance,
  EmailToSelfOptions,
  Layout,
  PersistenceOptions,
  PersistenceStrategy,
  Trigger,
  WidgetState,
} from './core/types';
