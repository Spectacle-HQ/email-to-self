/**
 * Public types for @spectaclehq/email-to-self.
 *
 * These types form the package's public API surface. Treat them as semver-stable.
 */

export type Layout = 'drawer' | 'fullscreen' | 'banner';

export type WidgetState = 'idle' | 'loading' | 'success' | 'error' | 'dismissed';

export type PersistenceStrategy = 'localStorage' | 'session' | 'always';

export interface PersistenceOptions {
  strategy: PersistenceStrategy;
  /** Days to remember dismissal for `localStorage` strategy. Default 7. */
  ttlDays?: number;
}

export type Trigger = 'load' | 'manual' | { delay: number } | { scrollDepth: number };

export interface ActionMeta {
  url: string;
  title: string;
  layout: Layout;
}

export type ActionResult = void | { ok: true } | { ok: false; message?: string };

export type ActionFn = (email: string, meta: ActionMeta) => Promise<ActionResult> | ActionResult;

export interface Copy {
  heading: string;
  subheading: string;
  /** Visually hidden label for the email input. */
  emailLabel: string;
  inputPlaceholder: string;
  privacy: string;
  submitButton: string;
  submitButtonLoadingMailto: string;
  submitButtonLoadingCustom: string;
  successHeadingMailto: string;
  successBodyMailto: string;
  /** May contain `{email}` token. */
  successHeadingCustom: string;
  /** May contain `{email}` token. */
  successBodyCustom: string;
  errorInvalidEmail: string;
  errorAction: string;
  dismissLabel: string;
  dismissedToast: string;
  attribution: string;
  attributionUrl: string;
  backToArticle: string;
  bannerCollapsedHeading: string;
  bannerCollapsedSub: string;
  bannerSubmit: string;
}

export interface EmailToSelfOptions {
  /** Layout variant. Default `'drawer'`. */
  layout?: Layout;
  /** URL shown in preview block + emailed. Defaults to `window.location.href`. */
  url?: string;
  /** Title shown in preview block + used as mailto subject. Defaults to `document.title`. */
  title?: string;
  /**
   * Logo image URL.
   *  - `undefined` (default) → auto-detect from <link rel="apple-touch-icon"> / favicon.
   *  - `null` → no logo.
   *  - `string` → explicit URL.
   */
  logoUrl?: string | null;
  /** Dismiss persistence behavior. Default `{ strategy: 'localStorage', ttlDays: 7 }`. */
  persistence?: PersistenceOptions;
  /** When the widget should appear. Default `'load'`. */
  trigger?: Trigger;
  /** Bypass user-agent and dismiss checks; always show. Useful for development. */
  forceShow?: boolean;
  /** Override any user-facing string. */
  copy?: Partial<Copy>;
  /** Custom async action. If omitted and `etsPayload` is set, the built-in
   * Spectacle-hosted API action runs; otherwise the default `mailto:` action
   * runs. */
  action?: ActionFn;
  /**
   * HMAC-signed envelope minted on the customer's server (see
   * `@spectaclehq/email-to-self/server`). When set, the widget submits to
   * Spectacle's hosted send endpoint and the email is delivered server-side
   * — the URL and title in the email are exactly what the server signed.
   */
  etsPayload?: string;
  /** Fired after the configured action resolves successfully. */
  onSubmit?: (email: string) => void;
  /** Fired when the user dismisses the widget. */
  onDismiss?: () => void;
  /**
   * Track Identify and Event in Spectacle on submit, and render the
   * "Open-source by Spectacle" footer (full-screen layout). Default `false`.
   */
  trackInSpectacle?: boolean;
  /** Pre-fill the email input. */
  prefillEmail?: string;
  /**
   * Mount target. Defaults to `document.body`. The widget creates and manages
   * its own host element inside this container.
   */
  container?: HTMLElement;
}

export interface EmailToSelfInstance {
  show(): void;
  hide(): void;
  destroy(): void;
  /** Read-only view of the current state. */
  readonly state: WidgetState;
}
