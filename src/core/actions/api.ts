import type { ActionFn } from '../types';

/**
 * URL of the Spectacle-hosted send endpoint. Hardcoded — every customer hits
 * the same URL; abuse protection is per-`keyId` server-side.
 */
const ETS_SEND_ENDPOINT = 'https://t.spectaclehq.com/email-to-self';

export interface ApiActionOptions {
  /**
   * The HMAC-signed envelope minted by the customer's server. The server-side
   * recipient resolves the `url` and `title` from this envelope, so the
   * browser cannot tamper with what ends up in the email.
   *
   * @see signEmailToSelfPayload from `@spectaclehq/email-to-self/server`
   */
  etsPayload: string;
  /** Override `fetch` (e.g. for tests). Defaults to `globalThis.fetch`. */
  fetch?: typeof fetch;
}

/**
 * Build an `ActionFn` that POSTs `{ email, envelope }` to the Spectacle-hosted
 * `email-to-self` send endpoint.
 *
 * Server contract:
 *  - 2xx → action succeeds
 *  - 4xx/5xx → action fails; if the body parses as JSON with `message` or
 *    `error`, that string is surfaced to the user, otherwise a generic copy.
 */
export function apiAction(opts: ApiActionOptions): ActionFn {
  if (!opts.etsPayload) throw new Error('apiAction: etsPayload is required');

  const { etsPayload } = opts;
  const fetchFn = opts.fetch ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!fetchFn) {
    throw new Error('apiAction: no fetch implementation available — pass `fetch` explicitly');
  }

  return async (email) => {
    let res: Response;
    try {
      res = await fetchFn(ETS_SEND_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ email, envelope: etsPayload }),
      });
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Network error' };
    }

    if (res.ok) return { ok: true };

    let message: string | undefined;
    try {
      const data = (await res.json()) as { message?: unknown; error?: unknown };
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.error === 'string') message = data.error;
    } catch {
      /* fall through to generic error copy */
    }
    return message ? { ok: false, message } : { ok: false };
  };
}
