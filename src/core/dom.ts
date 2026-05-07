/**
 * Tiny DOM helpers used by the renderer. Kept dependency-free and minimal so
 * the IIFE bundle remains under 8 KB gzipped.
 */

// Accept any DOM event subtype (KeyboardEvent, MouseEvent…) for ergonomic
// callsites; the handler is added via addEventListener which is variant in
// the event type at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventLike = (event: any) => void;
type AttrValue = string | number | boolean | null | undefined | EventLike;
type Attrs = Record<string, AttrValue>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  ...children: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) applyAttrs(node, attrs);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function applyAttrs(node: HTMLElement, attrs: Attrs): void {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'className') {
      node.className = String(v);
    } else if (k === 'html') {
      node.innerHTML = String(v);
    } else {
      node.setAttribute(k, v === true ? '' : String(v));
    }
  }
}

export function svg(viewBox: string, paths: string): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = paths;
  return s as SVGSVGElement;
}

// Lucide-style line icons.
export const icons = {
  x: () => svg('0 0 24 24', '<path d="M18 6L6 18M6 6l12 12"/>'),
  mail: () =>
    svg('0 0 24 24', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  shield: () => svg('0 0 24 24', '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  check: () => svg('0 0 24 24', '<path d="M5 12l4 4 10-10"/>'),
  chevronDown: () => svg('0 0 24 24', '<path d="M6 9l6 6 6-6"/>'),
} as const;

/** Replace the children of `node` with the given new children. */
export function replaceChildren(node: HTMLElement, ...children: Array<Node | string>): void {
  while (node.firstChild) node.removeChild(node.firstChild);
  for (const c of children) {
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableIn(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (n) => !n.hasAttribute('aria-hidden') && n.offsetParent !== null,
  );
}

/** Trap focus within `root`. Returns a cleanup function. */
export function trapFocus(root: HTMLElement): () => void {
  const previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusables = focusableIn(root);
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active =
      root.getRootNode() instanceof ShadowRoot
        ? (root.getRootNode() as ShadowRoot).activeElement
        : document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  root.addEventListener('keydown', onKey);

  return () => {
    root.removeEventListener('keydown', onKey);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch {
        previouslyFocused.focus();
      }
    }
  };
}
