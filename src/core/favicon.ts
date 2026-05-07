/**
 * Favicon / app-icon resolution.
 *
 * Walks the document looking for the highest-quality icon link, falling back to
 * /favicon.ico. Returns `null` if nothing is available — callers should hide the
 * logo region rather than show a broken image.
 */

function abs(href: string): string {
  try {
    return new URL(href, document.baseURI).toString();
  } catch {
    return href;
  }
}

function pickLargest(links: NodeListOf<HTMLLinkElement>): HTMLLinkElement | null {
  let best: HTMLLinkElement | null = null;
  let bestSize = -1;
  links.forEach((link) => {
    const sizes = (link.getAttribute('sizes') || '').toLowerCase();
    if (sizes === 'any') {
      // Vector — score it as effectively infinite.
      if (bestSize < Number.MAX_SAFE_INTEGER) {
        best = link;
        bestSize = Number.MAX_SAFE_INTEGER;
      }
      return;
    }
    const m = sizes.match(/(\d+)x(\d+)/);
    const size = m && m[1] ? parseInt(m[1], 10) : 0;
    if (size > bestSize) {
      best = link;
      bestSize = size;
    }
  });
  return best;
}

export function resolveLogoUrl(): string | null {
  if (typeof document === 'undefined') return null;

  const tryQuery = (selector: string): string | null => {
    const links = document.querySelectorAll<HTMLLinkElement>(selector);
    if (links.length === 0) return null;
    const pick = pickLargest(links) ?? links.item(0);
    const href = pick?.getAttribute('href');
    return href ? abs(href) : null;
  };

  return (
    tryQuery('link[rel="apple-touch-icon-precomposed"]') ||
    tryQuery('link[rel="apple-touch-icon"]') ||
    tryQuery('link[rel~="icon"][type="image/png"]') ||
    tryQuery('link[rel~="icon"]') ||
    abs('/favicon.ico')
  );
}
