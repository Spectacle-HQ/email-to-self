<p align="right">
  <a href="https://www.spectaclehq.com">
    <img src="https://www.spectaclehq.com/logo.svg" alt="Spectacle" height="28" />
  </a>
</p>

# @spectaclehq/email-to-self

> An open-source widget that detects in-app browsers (LinkedIn, Instagram, Facebook…) and prompts the visitor to email the page link to themselves so they can reopen it in a real browser.

[![npm](https://img.shields.io/npm/v/@spectaclehq/email-to-self.svg)](https://www.npmjs.com/package/@spectaclehq/email-to-self)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@spectaclehq/email-to-self)](https://bundlephobia.com/package/@spectaclehq/email-to-self)
[![license](https://img.shields.io/npm/l/@spectaclehq/email-to-self.svg)](./LICENSE)

In-app browsers trap users in a degraded experience — bookmarks, password managers, and tabs don't work properly. This drop-in widget detects that situation and offers a single tap to email the link to themselves.

- **Zero runtime dependencies** — vanilla TypeScript, ~8.5 KB gzipped (IIFE, all three layouts)
- **Shadow DOM-isolated** — your styles never leak in or out
- **Three layouts** — drawer, full-screen, banner
- **Accessible** — focus trap, screen-reader labels, keyboard nav, `prefers-reduced-motion`
- **i18n-ready** — every string is overridable
- **Pluggable actions** — defaults to `mailto:`, swap in your own async sender

## Install

```bash
pnpm add @spectaclehq/email-to-self
# or
npm install @spectaclehq/email-to-self
# or
yarn add @spectaclehq/email-to-self
```

Or via CDN:

```html
<script
  src="https://unpkg.com/@spectaclehq/email-to-self/iife"
  data-ets-auto
  data-ets-layout="drawer"
></script>
```

## Quick start

### Vanilla JS / TS

```ts
import { EmailToSelf } from '@spectaclehq/email-to-self';

new EmailToSelf();
```

That's it. The widget will:

1. Detect in-app browsers via `navigator.userAgent`.
2. If detected (and not previously dismissed), mount itself into a shadow-DOM host on `document.body`.
3. On submit, open the device's `mailto:` handler with the page title as subject and URL as body.

### React

```tsx
import { EmailToSelfWidget } from '@spectaclehq/email-to-self/react';

export default function App() {
  return (
    <>
      <EmailToSelfWidget
        layout="drawer"
        trackInSpectacle
        onSubmit={(email) => analytics.track('email_to_self', { email })}
      />
      {/* …your app… */}
    </>
  );
}
```

### Drop-in `<script>`

Add `data-ets-auto` to enable auto-init from `data-` attributes:

```html
<script
  src="https://unpkg.com/@spectaclehq/email-to-self/iife"
  data-ets-auto
  data-ets-layout="fullscreen"
  data-ets-track-in-spectacle="true"
></script>
```

Or initialize manually:

```html
<script src="https://unpkg.com/@spectaclehq/email-to-self/iife"></script>
<script>
  EmailToSelf.init({ layout: 'banner' });
</script>
```

## API

### `new EmailToSelf(options?)`

| Option             | Type                                                              | Default                                    | Description                                                                                                         |
|--------------------|-------------------------------------------------------------------|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| `layout`           | `'drawer' \| 'fullscreen' \| 'banner'`                            | `'drawer'`                                 | Visual variant.                                                                                                     |
| `url`              | `string`                                                          | `window.location.href`                     | URL emailed to the user.                                                                                            |
| `title`            | `string`                                                          | `document.title`                           | Page title shown in preview + used as `mailto:` subject.                                                            |
| `logoUrl`          | `string \| null`                                                  | auto-detected favicon                      | Override the auto-detected logo. `null` hides it.                                                                   |
| `persistence`      | `{ strategy: 'localStorage' \| 'session' \| 'always', ttlDays? }` | `{ strategy: 'localStorage', ttlDays: 7 }` | How long to remember dismissals.                                                                                    |
| `trigger`          | `'load' \| 'manual' \| { delay: ms } \| { scrollDepth: 0..100 }`  | `'load'`                                   | When the widget should appear.                                                                                      |
| `forceShow`        | `boolean`                                                         | `false`                                    | Bypass UA detection + dismiss record. Useful in development.                                                        |
| `debug`            | `boolean`                                                         | `false`                                    | Alias for `forceShow`.                                                                                              |
| `copy`             | `Partial<Copy>`                                                   | English defaults                           | Override any user-facing string. See the [Copy keys](#copy-keys) table.                                             |
| `action`           | `(email, meta) => Promise<ActionResult>`                          | `mailtoAction`                             | Replace the default `mailto:` flow with a custom send.                                                              |
| `onSubmit`         | `(email) => void`                                                 | —                                          | Fires after a successful submit.                                                                                    |
| `onDismiss`        | `() => void`                                                      | —                                          | Fires when the user dismisses the widget.                                                                           |
| `prefillEmail`     | `string`                                                          | —                                          | Pre-fill the email input.                                                                                           |
| `container`        | `HTMLElement`                                                     | `document.body`                            | Where to append the widget host.                                                                                    |
| `trackInSpectacle` | `boolean`                                                         | `false`                                    | Tracks Identify and Event in [Spectacle](https://www.spectaclehq.com). Requires the Spectacle script to be present. |

### Instance methods

```ts
const widget = new EmailToSelf({ trigger: 'manual' });

widget.show(); // mount + animate in
widget.hide(); // animate out + unmount
widget.destroy(); // tear down completely (use this on SPA route changes)
widget.state; // 'idle' | 'loading' | 'success' | 'error' | 'dismissed'
```

### Custom actions

```ts
new EmailToSelf({
  action: async (email, { url, title }) => {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, url, title }),
    });
    if (!res.ok) throw new Error('Failed to send');
  },
});
```

If the action throws or resolves to `{ ok: false, message }`, the widget shows a top-level error and re-enables the form.

### Copy keys

All strings are overridable via the `copy` option. Templates may use `{email}`:

```ts
new EmailToSelf({
  copy: {
    heading: 'Mail jezelf de link',
    subheading:
      'Je zit in een in-app browser. Stuur de link naar je inbox om later verder te lezen.',
    submitButton: 'Stuur de link',
    privacy: 'Eén e-mail. Geen nieuwsbrief, geen marketing.',
    successHeadingCustom: 'Verstuurd',
    successBodyCustom: 'De link is onderweg naar {email}.',
  },
});
```

See `defaultCopy` in [`src/core/i18n.ts`](./src/core/i18n.ts) for the full key list.

### Theming

The widget exposes CSS custom properties on the shadow host. Override them via your own stylesheet:

```css
[data-ets-host] {
  --ets-primary-bg: #5b21b6;
  --ets-primary-fg: #fff;
  --ets-radius: 20px;
}
```

## Detected user agents

`Instagram`, `LinkedInApp`, `FBAN`/`FBAV` (Facebook), `FB_IAB`/`Messenger`, `Twitter`, `TikTok`/`musical_ly`, `Snapchat`, `Pinterest`, `MicroMessenger` (WeChat), `Line`.

UA strings drift. If you hit a missed case, please open an issue — and use `forceShow: true` while you wait.

## Privacy

The package itself ships zero telemetry. No data leaves the browser unless you wire it up:

- **`mailto:` action (default):** the email never touches a server. The user's mail client is invoked locally.
- **Custom `action` / `onSubmit`:** you control where the email goes. Make sure your handler complies with applicable law (GDPR, CCPA, …).
- **`trackInSpectacle: true`:** calls `window.spectacle.identify({ email })` and `window.spectacle.track("Visitor E-mailed Page to Self", {url: "{the currenrt url}"})`. Requires the [Spectacle](https://www.spectaclehq.com) script to be present.

The `localStorage` key `ets_dismissed` stores an ISO timestamp of the last dismissal. Nothing else.

## Accessibility

- `role="dialog"` + `aria-modal="true"` on drawer and full-screen layouts
- Focus trap while open; focus restored on close
- Escape closes (drawer + full-screen)
- All interactive targets ≥ 44×44 px
- Visually-hidden but DOM-present input label
- All animations gated on `@media (prefers-reduced-motion: no-preference)`

## Browser support

Modern evergreen browsers and iOS/Android in-app browsers based on WebKit/Blink (Safari 14+, Chrome 90+, Edge 90+). The IIFE bundle targets ES2017.

## Development

```bash
pnpm install
pnpm build       # build ESM + CJS + IIFE
pnpm dev         # watch mode
pnpm test        # vitest
pnpm typecheck   # tsc --noEmit
pnpm size        # check bundle size against the limit
```

Open `examples/demo.html` after a build to play with all three layouts.

## License

MIT © Spectacle
