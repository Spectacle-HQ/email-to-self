/**
 * Shadow-DOM-scoped stylesheet for the widget.
 *
 * Encapsulated in `:host` so host pages cannot leak into the widget. Custom
 * properties on `:host` form the public theming API.
 */
export const styles = /* css */ `
:host {
  --ets-bg: #ffffff;
  --ets-fg: #0b0b0c;
  --ets-fg-muted: #5b5b62;
  --ets-fg-subtle: #84848d;
  --ets-border: #ececef;
  --ets-surface: #f6f6f7;
  --ets-primary-bg: #0b0b0c;
  --ets-primary-fg: #ffffff;
  --ets-danger: #c4251a;
  --ets-success-bg: #d8f3df;
  --ets-success-fg: #1d6b3a;
  --ets-radius: 16px;
  --ets-radius-sm: 10px;
  --ets-shadow: 0 -8px 32px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.04);
  --ets-z: 2147483600;
  --ets-font: 'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  position: fixed;
  inset: 0;
  z-index: var(--ets-z);
  pointer-events: none;
}

* { box-sizing: border-box; }

/*
 * Type / color base lives on .root, not :host. The host element carries an
 * inline \`all: initial\` (set in JS to defend against host-page cascade) which
 * overrides :host CSS rules and forces shadow descendants to inherit the
 * initial-value font (Times). Setting font/color directly on .root short-
 * circuits that inheritance chain.
 */
.root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: var(--ets-font);
  color: var(--ets-fg);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/*
 * Form controls don't inherit font by default in WebKit/Blink. Inputs/selects/
 * textareas also don't inherit color from page styling reliably. Buttons are
 * intentionally excluded from the color reset because .btn sets its own
 * (white-on-black) color and a generic .root button color rule would win on
 * specificity and erase it.
 */
.root input, .root select, .root textarea {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  line-height: inherit;
}
.root button {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/*
 * Hide the browser's built-in autofill / password-manager affordance from the
 * email input. Chrome / Safari render a small icon at the right edge of any
 * email field which collides with our rounded input + visually competes with
 * the submit button.
 */
.root input::-webkit-credentials-auto-fill-button,
.root input::-webkit-contacts-auto-fill-button,
.root input::-webkit-caps-lock-indicator,
.root input::-webkit-strong-password-auto-fill-button {
  visibility: hidden;
  display: none !important;
  pointer-events: none;
  position: absolute;
  right: 0;
}

/* Backdrop */
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 15, 16, 0.32);
  opacity: 0;
  pointer-events: auto;
  transition: opacity 220ms ease;
}
.backdrop.is-visible { opacity: 1; }
.layout-banner .backdrop { display: none; }

/* Card shared */
.card {
  background: var(--ets-bg);
  color: var(--ets-fg);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
}

/* === Drawer === */
.layout-drawer .card {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  border-radius: var(--ets-radius) var(--ets-radius) 0 0;
  box-shadow: var(--ets-shadow);
  padding: 18px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  transform: translateY(100%);
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 92vh;
  overflow-y: auto;
}
.layout-drawer.is-visible .card { transform: translateY(0); }

/* === Full-screen === */
.layout-fullscreen .card {
  position: absolute;
  inset: 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  opacity: 0;
  transition: opacity 220ms ease;
  overflow-y: auto;
}
.layout-fullscreen.is-visible .card { opacity: 1; }
.layout-fullscreen .backdrop { background: var(--ets-bg); }

/* === Banner === */
.layout-banner { pointer-events: none; }
.layout-banner .card {
  position: absolute;
  left: 12px; right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  border-radius: var(--ets-radius);
  box-shadow: var(--ets-shadow);
  padding: 0;
  transform: translateY(120%);
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.layout-banner.is-visible .card { transform: translateY(0); }

.banner-collapsed {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  min-height: 56px;
}
.banner-collapsed .ban-icon {
  width: 22px; height: 22px; flex: 0 0 22px;
  color: var(--ets-fg-muted);
}
.banner-collapsed .ban-text { flex: 1; min-width: 0; line-height: 1.25; }
.banner-collapsed .ban-heading { font-weight: 600; font-size: 14px; }
.banner-collapsed .ban-sub { font-size: 13px; color: var(--ets-fg-muted); }
.banner-collapsed .ban-actions { display: flex; gap: 4px; }
.banner-collapsed .icon-btn { color: var(--ets-fg-subtle); }

.banner-expanded { padding: 16px; }
.is-collapsed .banner-expanded { display: none; }
.is-expanded .banner-collapsed { display: none; }

/* === Header (drawer/fullscreen) === */
.header { display: flex; align-items: flex-start; gap: 12px; }
.layout-drawer .logo { display: none; }
.logo {
  width: 36px; height: 36px;
  border-radius: 8px;
  flex: 0 0 36px;
  background: var(--ets-surface);
  object-fit: cover;
}
.titles { flex: 1; min-width: 0; }
.heading { margin: 0; font-size: 17px; font-weight: 700; line-height: 1.25; letter-spacing: -0.01em; }
.subheading { margin: 4px 0 0; font-size: 13.5px; color: var(--ets-fg-muted); line-height: 1.45; }

/* Drawer-specific top row to match mockup (logo absent, dismiss top-right) */
.layout-drawer .header { padding-right: 28px; }

.dismiss {
  position: absolute;
  top: 14px; right: 14px;
  width: 28px; height: 28px;
  border: 0; background: transparent; cursor: pointer;
  color: var(--ets-fg-subtle);
  border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.dismiss:hover { color: var(--ets-fg); background: var(--ets-surface); }
.dismiss:focus-visible { outline: 2px solid var(--ets-fg); outline-offset: 2px; }

/* === Body === */
/* The form element is the flex column for preview / field / button / privacy. */
.body-region { display: flex; flex-direction: column; margin-top: 14px; }
.layout-fullscreen .body-region { margin-top: 18px; }
.body-region > form { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; }
.body-region > form > .privacy { margin-top: 4px; }

.preview {
  display: flex; gap: 10px; align-items: center;
  background: var(--ets-surface);
  border-radius: var(--ets-radius-sm);
  padding: 10px 12px;
  min-height: 52px;
}
.preview .pv-logo {
  width: 28px; height: 28px; border-radius: 6px;
  background: #2b2b2e; color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  flex: 0 0 28px;
  object-fit: cover;
}
.preview .pv-text { min-width: 0; flex: 1; line-height: 1.3; }
.preview .pv-title {
  font-size: 13.5px; font-weight: 600; color: var(--ets-fg);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.preview .pv-url {
  font-size: 12px; color: var(--ets-fg-subtle);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* === Form === */
.field { position: relative; }
.input {
  width: 100%;
  height: 44px;
  padding: 0 14px 0 38px;
  border-radius: var(--ets-radius-sm);
  border: 1px solid var(--ets-border);
  background: var(--ets-bg);
  color: var(--ets-fg);
  font-size: 15px;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.input:focus { border-color: var(--ets-fg); box-shadow: 0 0 0 3px rgba(11,11,12,0.08); }
.input.has-error { border-color: var(--ets-danger); box-shadow: 0 0 0 3px rgba(196,37,26,0.10); }
.input::placeholder { color: var(--ets-fg-subtle); }
.field-icon {
  position: absolute;
  left: 12px; top: 50%; transform: translateY(-50%);
  width: 18px; height: 18px;
  color: var(--ets-fg-subtle);
  pointer-events: none;
}
.error-msg {
  font-size: 12.5px; color: var(--ets-danger);
  margin: 6px 2px 0;
}
.action-error {
  font-size: 13px; color: var(--ets-danger);
  background: #fdecea;
  border: 1px solid #f5c2bd;
  padding: 8px 10px;
  border-radius: var(--ets-radius-sm);
}

.btn {
  appearance: none; -webkit-appearance: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  height: 44px;
  border-radius: var(--ets-radius-sm);
  border: 0;
  cursor: pointer;
  background: var(--ets-primary-bg);
  color: var(--ets-primary-fg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
}
.btn:disabled { opacity: 0.7; cursor: progress; }
.btn:focus-visible { outline: 2px solid var(--ets-fg); outline-offset: 2px; }
.btn .spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 999px;
  animation: ets-spin 720ms linear infinite;
}

.privacy {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px;
  color: var(--ets-fg-subtle);
  justify-content: center;
}
.privacy svg { width: 12px; height: 12px; }

/* === Success === */
.success {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 8px 8px 4px;
  gap: 10px;
}
.success .check {
  width: 44px; height: 44px;
  border-radius: 999px;
  background: var(--ets-success-bg);
  color: var(--ets-success-fg);
  display: inline-flex; align-items: center; justify-content: center;
}
.success-heading { margin: 0; font-size: 16px; font-weight: 700; }
.success-body { margin: 0; font-size: 13.5px; color: var(--ets-fg-muted); line-height: 1.45; }
.layout-fullscreen .success { padding-top: 80px; gap: 12px; }
.layout-fullscreen .success-actions { margin-top: 10px; }
.layout-fullscreen .success-actions a {
  font-size: 14px; color: var(--ets-fg); text-decoration: underline;
}
.layout-banner .success {
  flex-direction: row;
  text-align: left;
  padding: 12px 14px;
  align-items: center;
  gap: 10px;
}
.layout-banner .success .check { width: 28px; height: 28px; }

/* === Footer === */
.footer {
  margin-top: 14px;
  padding-top: 8px;
  text-align: center;
  font-size: 11.5px;
  color: var(--ets-fg-subtle);
  border-top: 1px solid var(--ets-border);
}
.footer a {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}
.footer a:hover { color: var(--ets-fg); }
.layout-drawer .footer { display: none; }
.layout-banner .footer { display: none; }

/* === Dismissed toast === */
.toast {
  position: absolute;
  left: 50%;
  transform: translate(-50%, 30px);
  bottom: 22px;
  background: var(--ets-fg);
  color: var(--ets-bg);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 200ms ease, transform 200ms ease;
}
.toast.is-visible { opacity: 1; transform: translate(-50%, 0); }

/* === Banner inline form === */
.banner-form {
  display: flex; gap: 8px; margin-top: 10px;
}
.banner-form .input { padding-left: 32px; height: 40px; font-size: 14px; }
.banner-form .field { flex: 1; }
.banner-form .field-icon { left: 10px; width: 16px; height: 16px; }
.banner-form .btn-send {
  width: auto; padding: 0 14px; height: 40px; font-size: 14px;
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  .layout-drawer .card,
  .layout-banner .card,
  .layout-fullscreen .card,
  .backdrop,
  .toast {
    transition: none !important;
  }
  .btn .spinner { animation: none; border-top-color: rgba(255,255,255,0.6); }
}

@keyframes ets-spin { to { transform: rotate(360deg); } }

/* Visually hidden, but available to AT */
.sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}
`;
