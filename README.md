<p align="center">
  <img src="./assets/logo-lockup.svg" alt="@spectacle/email-to-self" width="600" />
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
- **Pluggable actions** — defaults to `mailto:`, swap in your own async sender. [Spectacle](https://www.spectaclehq.com) customers get free access to the hosted send endpoint.

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

The React entry is marked `'use client'`, so it's safe to import directly from a Next.js Server Component (App Router) or any other React Server Components environment.

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

| Option             | Type                                                              | Default                                    | Description                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`           | `'drawer' \| 'fullscreen' \| 'banner'`                            | `'drawer'`                                 | Visual variant.                                                                                                                                                               |
| `url`              | `string`                                                          | `window.location.href`                     | URL emailed to the user.                                                                                                                                                      |
| `title`            | `string`                                                          | `document.title`                           | Page title shown in preview + used as `mailto:` subject.                                                                                                                      |
| `logoUrl`          | `string \| null`                                                  | auto-detected favicon                      | Override the auto-detected logo. `null` hides it.                                                                                                                             |
| `persistence`      | `{ strategy: 'localStorage' \| 'session' \| 'always', ttlDays? }` | `{ strategy: 'localStorage', ttlDays: 7 }` | How long to remember dismissals.                                                                                                                                              |
| `trigger`          | `'load' \| 'manual' \| { delay: ms } \| { scrollDepth: 0..100 }`  | `'load'`                                   | When the widget should appear.                                                                                                                                                |
| `forceShow`        | `boolean`                                                         | `false`                                    | Bypass UA detection + dismiss record. Useful in development.                                                                                                                  |
| `debug`            | `boolean`                                                         | `false`                                    | Alias for `forceShow`.                                                                                                                                                        |
| `copy`             | `Partial<Copy>`                                                   | English defaults                           | Override any user-facing string. See the [Copy keys](#copy-keys) table.                                                                                                       |
| `action`           | `(email, meta) => Promise<ActionResult>`                          | `mailtoAction`                             | Replace the default `mailto:` flow with a custom send.                                                                                                                        |
| `etsPayload`       | `string`                                                          | —                                          | HMAC-signed envelope (see [Hosted send endpoint](#hosted-send-endpoint-spectacle-managed)). When set, the widget submits to Spectacle's hosted endpoint instead of `mailto:`. |
| `onSubmit`         | `(email) => void`                                                 | —                                          | Fires after a successful submit.                                                                                                                                              |
| `onDismiss`        | `() => void`                                                      | —                                          | Fires when the user dismisses the widget.                                                                                                                                     |
| `prefillEmail`     | `string`                                                          | —                                          | Pre-fill the email input.                                                                                                                                                     |
| `container`        | `HTMLElement`                                                     | `document.body`                            | Where to append the widget host.                                                                                                                                              |
| `trackInSpectacle` | `boolean`                                                         | `false`                                    | Tracks Identify and Event in [Spectacle](https://www.spectaclehq.com). Requires the Spectacle script to be present.                                                           |

### Instance methods

```ts
const widget = new EmailToSelf({ trigger: 'manual' });

widget.show(); // mount + animate in
widget.hide(); // animate out + unmount
widget.destroy(); // tear down completely (use this on SPA route changes)
widget.state; // 'idle' | 'loading' | 'success' | 'error' | 'dismissed'
```

### Hosted send endpoint (Spectacle-managed)

The default `mailto:` flow hands the link to the user's mail client — fine for many cases, but the email actually arriving in their inbox depends on the OS and the user remembering to hit "send". For a guaranteed-delivered email we offer a hosted send endpoint.

The endpoint **only accepts requests accompanied by an HMAC-signed envelope minted on your server**. This means an attacker cannot tamper with the URL or title that ends up in the email — what your server signs is what the recipient sees.

#### 1. Get your `keyId` and `secret`

Sign in to your Spectacle workspace (`https://app.spectaclehq.com`) and open **Settings → Email-to-self** to find your `keyId` (public, may live in client code) and `secret` (treat as a server-side credential — never ship to the browser). Each key is bound to an allow-list of origins and hostnames you control.

#### 2. Sign the envelope server-side

```ts
// e.g. inside a Next.js Server Component, an Express handler, etc.
import { signEmailToSelfPayload } from '@spectaclehq/email-to-self/server';

const etsPayload = signEmailToSelfPayload({
  keyId: process.env.SPECTACLE_ETS_KEY_ID!,
  secret: process.env.SPECTACLE_ETS_SECRET!,
  url: 'https://example.com/blog/post', // the URL that will be in the email
  title: 'How we ship faster', // the title that will be in the email
  // ttlSeconds: 3600,                    // optional, default 1h, clamped 60s..24h
});
```

`signEmailToSelfPayload` is a Node-only entry point — it imports `node:crypto`. Keep it on the server.

#### 3. Pass the envelope to the widget

```tsx
import { EmailToSelfWidget } from '@spectaclehq/email-to-self/react';

<EmailToSelfWidget
  layout="drawer"
  etsPayload={etsPayload} // ← from step 2
  url="https://example.com/blog/post"
  title="How we ship faster"
/>;
```

When `etsPayload` is set, the widget submits to the Spectacle-hosted endpoint instead of opening a `mailto:`. If the request fails the widget shows the server-supplied error message; if any of the env vars are missing on the server, omit `etsPayload` entirely and the widget gracefully falls back to `mailto:`.

#### Envelope format (for reference)

```text
base64url(canonical_json(payload)) + "." + base64url(HMAC-SHA256(payload_canonical_json, secret))
```

Where `payload` is `{ v: 1, keyId, url, title, iat, exp, nonce }`. Replays are blocked server-side — each `nonce` is single-use within the envelope's lifetime.

### Custom actions

If you want to deliver to your own backend instead of the Spectacle-hosted endpoint:

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

<p align="center">
  <a href="https://www.spectaclehq.com">
    <img src="https://www.spectaclehq.com/logo.svg" alt="Spectacle" height="28" />
  </a>
</p>
