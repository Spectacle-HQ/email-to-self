import { apiAction } from './actions/api';
import { mailtoAction } from './actions/mailto';
import { detectInAppBrowser } from './detection';
import { el, focusableIn, icons, replaceChildren, trapFocus } from './dom';
import { resolveLogoUrl } from './favicon';
import { interpolate, mergeCopy } from './i18n';
import { isDismissed, recordDismiss } from './persistence';
import { styles } from './styles';
import type {
  ActionFn,
  ActionMeta,
  Copy,
  EmailToSelfInstance,
  EmailToSelfOptions,
  Layout,
  WidgetState,
} from './types';
import { isValidEmail } from './validate';

type Mode = 'mailto' | 'custom';

interface Refs {
  host: HTMLElement;
  shadow: ShadowRoot;
  root: HTMLDivElement;
  backdrop: HTMLDivElement;
  card: HTMLDivElement;
  body: HTMLDivElement;
  toast: HTMLDivElement;
  // Form refs (idle/loading/error states)
  form?: HTMLFormElement;
  input?: HTMLInputElement;
  inputError?: HTMLDivElement;
  submit?: HTMLButtonElement;
  submitLabel?: HTMLSpanElement;
  actionError?: HTMLDivElement;
  bannerExpanded?: HTMLDivElement;
}

const HOST_ATTR = 'data-ets-host';
const FONT_LINK_ID = 'ets-font-link';

/**
 * Append `utm_email={email}` to a URL. Replaces an existing `utm_email` if
 * present so we don't double-tag if the page URL already has one. Uses the
 * current document location as a base so relative paths passed via `opts.url`
 * also parse. Falls back to manual concatenation only for genuinely malformed
 * input — and then carefully splices before any `#fragment`.
 */
function withUtmEmail(rawUrl: string, email: string): string {
  const base = typeof location !== 'undefined' ? location.href : undefined;
  try {
    const u = new URL(rawUrl, base);
    u.searchParams.set('utm_email', email);
    return u.toString();
  } catch {
    const hashIdx = rawUrl.indexOf('#');
    const head = hashIdx >= 0 ? rawUrl.slice(0, hashIdx) : rawUrl;
    const hash = hashIdx >= 0 ? rawUrl.slice(hashIdx) : '';
    const sep = head.includes('?') ? '&' : '?';
    return `${head}${sep}utm_email=${encodeURIComponent(email)}${hash}`;
  }
}

/**
 * Inject a single <link> to Google Fonts (Google Sans) on the host document.
 *
 * Fonts have to be loaded against the outer document, not within shadow DOM,
 * so the browser can resolve them once and reuse them everywhere. We guard
 * with an id check so re-mounts don't insert duplicate links.
 */
function ensureFontLoaded(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FONT_LINK_ID)) return;

  // Preconnect to speed up the font fetch on cold loads.
  const preconnectGoogle = document.createElement('link');
  preconnectGoogle.rel = 'preconnect';
  preconnectGoogle.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnectGoogle);

  const preconnectGstatic = document.createElement('link');
  preconnectGstatic.rel = 'preconnect';
  preconnectGstatic.href = 'https://fonts.gstatic.com';
  preconnectGstatic.crossOrigin = '';
  document.head.appendChild(preconnectGstatic);

  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Text:wght@400;500&display=swap';
  document.head.appendChild(link);
}

export class EmailToSelf implements EmailToSelfInstance {
  readonly #opts: EmailToSelfOptions;
  readonly #copy: Copy;
  readonly #layout: Layout;
  readonly #action: ActionFn;
  readonly #mode: Mode;
  readonly #url: string;
  readonly #title: string;

  #state: WidgetState = 'idle';
  #refs: Refs | null = null;
  #releaseFocusTrap: (() => void) | null = null;
  #scrollHandler: (() => void) | null = null;
  #triggerTimer: ReturnType<typeof setTimeout> | null = null;
  #autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  #onKeydown: ((e: KeyboardEvent) => void) | null = null;
  #destroyed = false;
  // Banner-only: was the form actually shown? Dismiss counts only when expanded.
  #bannerExpanded = false;

  constructor(opts: EmailToSelfOptions = {}) {
    this.#opts = opts;
    this.#copy = mergeCopy(opts.copy);
    this.#layout = opts.layout ?? 'drawer';

    // Action precedence: explicit `action` > built-in apiAction (when
    // `etsPayload` is set) > default mailto.
    let resolvedAction: ActionFn;
    let resolvedMode: Mode;
    if (opts.action) {
      resolvedAction = opts.action;
      resolvedMode = 'custom';
    } else if (opts.etsPayload) {
      resolvedAction = apiAction({ etsPayload: opts.etsPayload });
      resolvedMode = 'custom';
    } else {
      resolvedAction = mailtoAction;
      resolvedMode = 'mailto';
    }
    this.#action = resolvedAction;
    this.#mode = resolvedMode;
    this.#url = opts.url ?? (typeof location !== 'undefined' ? location.href : '');
    this.#title = opts.title ?? (typeof document !== 'undefined' ? document.title : '');

    if (typeof document === 'undefined') return;

    const trigger = opts.trigger ?? 'load';
    if (trigger === 'manual') return;

    const start = () => this.#maybeShow();

    if (trigger === 'load') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
      } else {
        start();
      }
      return;
    }

    if (typeof trigger === 'object' && 'delay' in trigger) {
      this.#triggerTimer = setTimeout(start, Math.max(0, trigger.delay));
      return;
    }

    if (typeof trigger === 'object' && 'scrollDepth' in trigger) {
      const target = Math.max(0, Math.min(100, trigger.scrollDepth));
      const onScroll = () => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        if (total <= 0) return;
        const pct = (window.scrollY / total) * 100;
        if (pct >= target) {
          window.removeEventListener('scroll', onScroll);
          this.#scrollHandler = null;
          start();
        }
      };
      this.#scrollHandler = onScroll;
      window.addEventListener('scroll', onScroll, { passive: true });
      return;
    }
  }

  get state(): WidgetState {
    return this.#state;
  }

  show(): void {
    // Public `show()` bypasses both the in-app-browser detection and the
    // dismiss record. The gated path is `#maybeShow()`, used by trigger logic.
    if (this.#destroyed) return;
    if (this.#refs) return;
    this.#mount();
  }

  hide(): void {
    if (!this.#refs) return;
    this.#animateOutAndRemove();
  }

  destroy(): void {
    this.#destroyed = true;
    if (this.#triggerTimer) clearTimeout(this.#triggerTimer);
    if (this.#autoCloseTimer) clearTimeout(this.#autoCloseTimer);
    if (this.#scrollHandler) window.removeEventListener('scroll', this.#scrollHandler);
    if (this.#refs) {
      this.#refs.host.remove();
      this.#refs = null;
    }
    if (this.#releaseFocusTrap) this.#releaseFocusTrap();
    if (this.#onKeydown) document.removeEventListener('keydown', this.#onKeydown);
  }

  // ---------------------------------------------------------------------------

  #maybeShow(): void {
    if (this.#destroyed) return;
    const force = this.#opts.forceShow;
    if (!force && !detectInAppBrowser().isInApp) return;
    if (!force && isDismissed(this.#opts.persistence)) return;
    this.show();
  }

  #mount(): void {
    const container = this.#opts.container ?? document.body;

    ensureFontLoaded();

    const host = document.createElement('div');
    host.setAttribute(HOST_ATTR, '');
    host.style.all = 'initial';
    container.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadow.appendChild(styleEl);

    const root = el('div', {
      className: `root layout-${this.#layout}`,
      role: 'presentation',
    }) as HTMLDivElement;

    const backdrop = el('div', {
      className: 'backdrop',
      onclick: () => {
        // Banner collapses, doesn't dismiss, when tapping outside.
        if (this.#layout === 'banner') return;
        this.#dismiss();
      },
    }) as HTMLDivElement;

    const card = el('div', {
      className: 'card',
      role: this.#layout === 'banner' ? 'region' : 'dialog',
      'aria-labelledby': 'ets-heading',
      tabindex: '-1',
    }) as HTMLDivElement;
    // aria-modal applies only to the trapped dialog layouts.
    if (this.#layout !== 'banner') card.setAttribute('aria-modal', 'true');

    const body = el('div', { className: 'body-region' }) as HTMLDivElement;

    const toast = el('div', {
      className: 'toast',
      role: 'status',
      'aria-live': 'polite',
    }) as HTMLDivElement;
    toast.textContent = this.#copy.dismissedToast;

    root.appendChild(backdrop);
    root.appendChild(card);
    root.appendChild(toast);
    shadow.appendChild(root);

    this.#refs = { host, shadow, root, backdrop, card, body, toast };

    if (this.#layout === 'banner') {
      this.#renderBanner();
    } else {
      this.#renderShell();
      this.#renderIdle();
    }

    // Slide/fade in on the next frame so the transition runs.
    requestAnimationFrame(() => {
      if (!this.#refs) return;
      this.#refs.root.classList.add('is-visible');
      this.#refs.backdrop.classList.add('is-visible');
    });

    // Esc closes drawer + fullscreen.
    if (this.#layout !== 'banner') {
      this.#onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          this.#dismiss();
        }
      };
      document.addEventListener('keydown', this.#onKeydown);
      // Trap focus inside the card.
      this.#releaseFocusTrap = trapFocus(this.#refs.card);
      // Move focus to the card so Tab cycles properly.
      requestAnimationFrame(() => {
        const f = focusableIn(this.#refs!.card);
        (f[0] ?? this.#refs!.card).focus({ preventScroll: true });
      });
    }
  }

  // === Drawer / Fullscreen rendering =========================================

  #renderShell(): void {
    if (!this.#refs) return;
    const { card, body } = this.#refs;
    replaceChildren(card);

    // Dismiss button (top-right, absolutely positioned in CSS).
    const dismiss = el(
      'button',
      {
        className: 'dismiss',
        type: 'button',
        'aria-label': this.#copy.dismissLabel,
        onclick: () => this.#dismiss(),
      },
      icons.x(),
    );
    card.appendChild(dismiss);

    // Header with optional logo + heading + subheading.
    const header = el('div', { className: 'header' });
    const logoUrl = this.#resolveLogoUrl();
    if (logoUrl) {
      const img = el('img', {
        className: 'logo',
        src: logoUrl,
        alt: '',
        loading: 'lazy',
        onerror: (e: Event) => {
          // Replace the broken image with the text-letter fallback rather
          // than leaving an empty header gap. Matches `#renderPreview`.
          const fallback = this.#textLogoFallback();
          fallback.classList.add('logo');
          (e.target as HTMLImageElement).replaceWith(fallback);
        },
      });
      header.appendChild(img);
    }
    const titles = el(
      'div',
      { className: 'titles' },
      el('h2', { id: 'ets-heading', className: 'heading' }, this.#copy.heading),
      el('p', { className: 'subheading' }, this.#copy.subheading),
    );
    header.appendChild(titles);
    card.appendChild(header);

    // Body region (state-dependent content goes here).
    card.appendChild(body);

    // Footer (attribution) — drawer hides this via CSS.
    if (this.#opts.trackInSpectacle) {
      const footer = el(
        'div',
        { className: 'footer' },
        document.createTextNode('Open-source by '),
        el(
          'a',
          {
            href: this.#copy.attributionUrl,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          'Spectacle',
        ),
      );
      card.appendChild(footer);
    }
  }

  #renderIdle(): void {
    if (!this.#refs) return;
    this.#state = 'idle';

    const preview = this.#renderPreview();

    const fieldIcon = icons.mail();
    fieldIcon.classList.add('field-icon');

    const input = el('input', {
      className: 'input',
      type: 'email',
      inputmode: 'email',
      autocomplete: 'email',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      name: 'email',
      placeholder: this.#copy.inputPlaceholder,
      'aria-label': this.#copy.emailLabel,
      'aria-describedby': 'ets-privacy ets-input-error',
      value: this.#opts.prefillEmail ?? '',
    }) as HTMLInputElement;

    const inputError = el('div', {
      id: 'ets-input-error',
      className: 'error-msg',
      role: 'alert',
      'aria-live': 'polite',
    }) as HTMLDivElement;
    inputError.style.display = 'none';

    const field = el('div', { className: 'field' }, fieldIcon, input);

    const submitLabel = el('span', {}, this.#copy.submitButton) as HTMLSpanElement;
    const submit = el(
      'button',
      { className: 'btn', type: 'submit' },
      submitLabel,
    ) as HTMLButtonElement;

    const privacy = el(
      'div',
      { className: 'privacy', id: 'ets-privacy' },
      icons.shield(),
      el('span', {}, this.#copy.privacy),
    );

    const actionError = el('div', {
      className: 'action-error',
      role: 'alert',
    }) as HTMLDivElement;
    actionError.style.display = 'none';

    const form = el('form', {
      novalidate: '',
      onsubmit: (e: Event) => {
        e.preventDefault();
        void this.#handleSubmit();
      },
    }) as HTMLFormElement;
    form.appendChild(preview);
    form.appendChild(field);
    form.appendChild(inputError);
    form.appendChild(actionError);
    form.appendChild(submit);
    form.appendChild(privacy);

    this.#refs.form = form;
    this.#refs.input = input;
    this.#refs.inputError = inputError;
    this.#refs.submit = submit;
    this.#refs.submitLabel = submitLabel;
    this.#refs.actionError = actionError;

    replaceChildren(this.#refs.body, form);
  }

  #renderPreview(): HTMLDivElement {
    const logoUrl = this.#resolveLogoUrl();

    let logoEl: HTMLElement;
    if (logoUrl) {
      logoEl = el('img', {
        className: 'pv-logo',
        src: logoUrl,
        alt: '',
        loading: 'lazy',
        onerror: (e: Event) => {
          // Replace with text fallback rather than broken image.
          const fallback = this.#textLogoFallback();
          (e.target as HTMLImageElement).replaceWith(fallback);
        },
      });
    } else {
      logoEl = this.#textLogoFallback();
    }

    return el(
      'div',
      { className: 'preview', 'aria-hidden': 'true' },
      logoEl,
      el(
        'div',
        { className: 'pv-text' },
        el('div', { className: 'pv-title', title: this.#title }, this.#title),
        el('div', { className: 'pv-url', title: this.#url }, this.#prettyUrl()),
      ),
    ) as HTMLDivElement;
  }

  #textLogoFallback(): HTMLElement {
    const letter = (this.#title.trim()[0] || this.#hostname()[0] || '·').toUpperCase();
    return el('div', { className: 'pv-logo' }, letter);
  }

  #renderLoading(): void {
    if (!this.#refs?.submit || !this.#refs.submitLabel) return;
    this.#state = 'loading';
    this.#refs.submit.disabled = true;
    const label =
      this.#mode === 'mailto'
        ? this.#copy.submitButtonLoadingMailto
        : this.#copy.submitButtonLoadingCustom;
    replaceChildren(
      this.#refs.submitLabel.parentElement!,
      this.#spinner(),
      document.createTextNode(label),
    );
  }

  #renderSuccess(email: string): void {
    if (!this.#refs) return;
    this.#state = 'success';

    const heading =
      this.#mode === 'mailto'
        ? this.#copy.successHeadingMailto
        : interpolate(this.#copy.successHeadingCustom, { email });
    const body =
      this.#mode === 'mailto'
        ? this.#copy.successBodyMailto
        : interpolate(this.#copy.successBodyCustom, { email });

    const checkIcon = icons.check();
    const successEl = el(
      'div',
      { className: 'success' },
      el('div', { className: 'check' }, checkIcon),
      el('h3', { className: 'success-heading' }, heading),
      el('p', { className: 'success-body' }, body),
    );

    if (this.#layout === 'fullscreen') {
      successEl.appendChild(
        el(
          'div',
          { className: 'success-actions' },
          el(
            'a',
            {
              href: '#',
              onclick: (e: Event) => {
                e.preventDefault();
                this.#dismiss();
              },
            },
            this.#copy.backToArticle,
          ),
        ),
      );
    }

    replaceChildren(this.#refs.body, successEl);

    // Auto-dismiss for drawer after 3s.
    if (this.#layout === 'drawer') {
      this.#autoCloseTimer = setTimeout(() => this.#dismiss(), 3000);
    }
  }

  #renderActionError(message: string): void {
    if (!this.#refs?.actionError || !this.#refs.submit || !this.#refs.submitLabel) return;
    this.#state = 'error';
    this.#refs.actionError.textContent = message;
    this.#refs.actionError.style.display = '';
    this.#refs.submit.disabled = false;
    replaceChildren(
      this.#refs.submitLabel.parentElement!,
      document.createTextNode(this.#copy.submitButton),
    );
  }

  // === Banner rendering ======================================================

  #renderBanner(): void {
    if (!this.#refs) return;
    const { card } = this.#refs;
    replaceChildren(card);
    card.classList.add('is-collapsed');

    // --- Collapsed strip
    const banIcon = icons.mail();
    banIcon.classList.add('ban-icon');

    const collapsed = el(
      'div',
      {
        className: 'banner-collapsed',
        role: 'button',
        tabindex: '0',
        'aria-expanded': 'false',
        'aria-label': this.#copy.heading,
        onclick: (e: Event) => {
          if ((e.target as HTMLElement).closest('.icon-btn')) return;
          this.#expandBanner();
        },
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.#expandBanner();
          }
        },
      },
      banIcon,
      el(
        'div',
        { className: 'ban-text' },
        el('div', { className: 'ban-heading' }, this.#copy.bannerCollapsedHeading),
        el('div', { className: 'ban-sub' }, this.#copy.bannerCollapsedSub),
      ),
      el(
        'div',
        { className: 'ban-actions' },
        el(
          'button',
          {
            className: 'dismiss icon-btn',
            type: 'button',
            'aria-label': this.#copy.dismissLabel,
            onclick: (e: Event) => {
              e.stopPropagation();
              // Collapsed dismiss does NOT write a dismiss record per spec —
              // the user never saw the form. We just unmount visually.
              this.#animateOutAndRemove();
            },
          },
          icons.chevronDown(),
        ),
      ),
    );
    card.appendChild(collapsed);

    // --- Expanded form
    const expanded = el('div', { className: 'banner-expanded' }) as HTMLDivElement;
    this.#refs.bannerExpanded = expanded;
    card.appendChild(expanded);

    this.#renderBannerExpandedContents();
  }

  #renderBannerExpandedContents(): void {
    if (!this.#refs?.bannerExpanded) return;

    const expanded = this.#refs.bannerExpanded;
    replaceChildren(expanded);

    const expandedLogoUrl = this.#resolveLogoUrl();
    const expandedLogoEl = expandedLogoUrl
      ? el('img', { className: 'logo', src: expandedLogoUrl, alt: '', loading: 'lazy' })
      : this.#textLogoFallback();

    const header = el(
      'div',
      { className: 'header' },
      expandedLogoEl,
      el(
        'div',
        { className: 'titles' },
        el('h2', { id: 'ets-heading', className: 'heading' }, this.#copy.heading),
        el('p', { className: 'subheading' }, this.#copy.subheading),
      ),
      el(
        'button',
        {
          className: 'dismiss',
          type: 'button',
          'aria-label': this.#copy.dismissLabel,
          onclick: () => this.#dismiss(),
        },
        icons.x(),
      ),
    );
    expanded.appendChild(header);

    const fieldIcon = icons.mail();
    fieldIcon.classList.add('field-icon');

    const input = el('input', {
      className: 'input',
      type: 'email',
      inputmode: 'email',
      autocomplete: 'email',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      name: 'email',
      placeholder: this.#copy.inputPlaceholder,
      'aria-label': this.#copy.emailLabel,
      'aria-describedby': 'ets-privacy ets-input-error',
      value: this.#opts.prefillEmail ?? '',
    }) as HTMLInputElement;

    const submitLabel = el('span', {}, this.#copy.bannerSubmit) as HTMLSpanElement;
    const submit = el(
      'button',
      { className: 'btn btn-send', type: 'submit' },
      submitLabel,
    ) as HTMLButtonElement;

    const inputError = el('div', {
      id: 'ets-input-error',
      className: 'error-msg',
      role: 'alert',
      'aria-live': 'polite',
    }) as HTMLDivElement;
    inputError.style.display = 'none';

    const actionError = el('div', {
      className: 'action-error',
      role: 'alert',
    }) as HTMLDivElement;
    actionError.style.display = 'none';

    const form = el('form', {
      className: 'banner-form-wrap',
      novalidate: '',
      onsubmit: (e: Event) => {
        e.preventDefault();
        void this.#handleSubmit();
      },
    }) as HTMLFormElement;

    form.appendChild(
      el(
        'div',
        { className: 'banner-form' },
        el('div', { className: 'field' }, fieldIcon, input),
        submit,
      ),
    );
    form.appendChild(inputError);
    form.appendChild(actionError);
    form.appendChild(
      el(
        'div',
        { className: 'privacy', id: 'ets-privacy' },
        icons.shield(),
        el('span', {}, this.#copy.privacy),
      ),
    );

    expanded.appendChild(form);

    this.#refs.form = form;
    this.#refs.input = input;
    this.#refs.inputError = inputError;
    this.#refs.submit = submit;
    this.#refs.submitLabel = submitLabel;
    this.#refs.actionError = actionError;
  }

  #expandBanner(): void {
    if (!this.#refs) return;
    this.#bannerExpanded = true;
    this.#refs.card.classList.remove('is-collapsed');
    this.#refs.card.classList.add('is-expanded');
    requestAnimationFrame(() => {
      this.#refs?.input?.focus({ preventScroll: true });
    });
  }

  // === Banner success (different shape from drawer/fullscreen) ===============

  #renderBannerSuccess(email: string): void {
    if (!this.#refs) return;
    this.#state = 'success';
    const expanded = this.#refs.bannerExpanded!;
    replaceChildren(expanded);

    const heading =
      this.#mode === 'mailto'
        ? this.#copy.successHeadingMailto
        : interpolate(this.#copy.successHeadingCustom, { email });
    const body =
      this.#mode === 'mailto'
        ? this.#copy.successBodyMailto
        : interpolate(this.#copy.successBodyCustom, { email });

    const success = el(
      'div',
      { className: 'success' },
      el('div', { className: 'check' }, icons.check()),
      el(
        'div',
        { className: 'pv-text' },
        el('div', { className: 'success-heading', style: 'font-size:14px;' }, heading),
        el('div', { className: 'success-body', style: 'font-size:12px;' }, body),
      ),
      el(
        'button',
        {
          className: 'dismiss',
          type: 'button',
          'aria-label': this.#copy.dismissLabel,
          onclick: () => this.#dismiss(),
        },
        icons.x(),
      ),
    );
    expanded.appendChild(success);

    this.#autoCloseTimer = setTimeout(() => this.#dismiss(), 3000);
  }

  // === State transitions =====================================================

  async #handleSubmit(): Promise<void> {
    if (!this.#refs?.input || !this.#refs.inputError || !this.#refs.actionError) return;
    const value = this.#refs.input.value.trim();

    // Reset previous errors.
    this.#refs.inputError.style.display = 'none';
    this.#refs.actionError.style.display = 'none';
    this.#refs.input.classList.remove('has-error');
    this.#refs.input.removeAttribute('aria-invalid');

    if (!isValidEmail(value)) {
      this.#refs.input.classList.add('has-error');
      this.#refs.input.setAttribute('aria-invalid', 'true');
      this.#refs.inputError.textContent = this.#copy.errorInvalidEmail;
      this.#refs.inputError.style.display = '';
      this.#refs.input.focus();
      return;
    }

    this.#renderLoading();

    // When trackInSpectacle is on, tag the emailed URL with the submitter's
    // address so Spectacle can attribute the eventual return-visit back to
    // this submission.
    const url = this.#opts.trackInSpectacle ? withUtmEmail(this.#url, value) : this.#url;
    const meta: ActionMeta = { url, title: this.#title, layout: this.#layout };

    try {
      const result = await this.#action(value, meta);
      const ok =
        !result || (typeof result === 'object' && (result as { ok?: boolean }).ok !== false);
      if (!ok) {
        const message =
          (typeof result === 'object' && (result as { message?: string }).message) ||
          this.#copy.errorAction;
        this.#renderActionError(message);
        return;
      }

      // Fire-and-forget: implementer callback + Spectacle.
      try {
        this.#opts.onSubmit?.(value);
      } catch (e) {
        console.warn('[email-to-self] onSubmit callback threw:', e);
      }
      if (this.#opts.trackInSpectacle) {
        try {
          const w = window as unknown as {
            spectacle?: { identify?: (p: object) => void; track?: (e: string, p: object) => void };
          };
          if (!w.spectacle) {
            console.warn('[email-to-self] Spectacle not found in window');
          }

          w.spectacle?.identify?.({ email: value });
          w.spectacle?.track?.('Visitor E-mailed Page to Self', { url: window.location.href });
        } catch {
          /* swallow */
        }
      }

      if (this.#layout === 'banner') this.#renderBannerSuccess(value);
      else this.#renderSuccess(value);
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : this.#copy.errorAction;
      this.#renderActionError(message);
    }
  }

  #dismiss(): void {
    if (!this.#refs) return;
    if (this.#layout === 'banner' && !this.#bannerExpanded && this.#state === 'idle') {
      // Bare collapse should not persist a dismiss; that path is handled
      // separately in the collapsed × handler. This branch is defensive.
      this.#animateOutAndRemove();
      return;
    }
    try {
      this.#opts.onDismiss?.();
    } catch (e) {
      console.warn('[email-to-self] onDismiss callback threw:', e);
    }
    recordDismiss(this.#opts.persistence);
    this.#animateOutAndRemove(true);
  }

  #animateOutAndRemove(showToast: boolean = false): void {
    if (!this.#refs) return;
    const { root, host, toast } = this.#refs;
    root.classList.remove('is-visible');
    this.#refs.backdrop.classList.remove('is-visible');
    if (this.#autoCloseTimer) clearTimeout(this.#autoCloseTimer);
    this.#autoCloseTimer = null;
    if (this.#releaseFocusTrap) {
      this.#releaseFocusTrap();
      this.#releaseFocusTrap = null;
    }
    if (this.#onKeydown) {
      document.removeEventListener('keydown', this.#onKeydown);
      this.#onKeydown = null;
    }

    const removeHost = () => {
      host.remove();
      this.#refs = null;
      this.#state = 'dismissed';
    };

    if (showToast) {
      // Card slides out, toast fades in for ~1.6s, then we remove the host.
      setTimeout(() => toast.classList.add('is-visible'), 280);
      setTimeout(() => toast.classList.remove('is-visible'), 1900);
      setTimeout(removeHost, 2200);
    } else {
      setTimeout(removeHost, 320);
    }
  }

  #spinner(): HTMLElement {
    return el('div', { className: 'spinner', 'aria-hidden': 'true' });
  }

  #resolveLogoUrl(): string | null {
    if (this.#opts.logoUrl === null) return null;
    if (typeof this.#opts.logoUrl === 'string') return this.#opts.logoUrl;
    return resolveLogoUrl();
  }

  #hostname(): string {
    try {
      return new URL(this.#url).hostname;
    } catch {
      return '';
    }
  }

  #prettyUrl(): string {
    try {
      const u = new URL(this.#url);
      return u.hostname + (u.pathname === '/' ? '' : u.pathname);
    } catch {
      return this.#url;
    }
  }
}
