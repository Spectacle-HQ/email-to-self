import type { Copy } from './types';

export const defaultCopy: Copy = {
  heading: 'Email this to yourself',
  subheading:
    "You're in an in-app browser. Send the link to your inbox so you can finish reading later.",
  emailLabel: 'Email address',
  inputPlaceholder: 'your@email.com',
  privacy: 'One email. No newsletter, no marketing, ever.',
  submitButton: 'Send the link',
  submitButtonLoadingMailto: 'Opening your mail app…',
  submitButtonLoadingCustom: 'Sending…',
  successHeadingMailto: 'Done — check your inbox',
  successBodyMailto: "We've handed the link to your mail app.",
  successHeadingCustom: 'Sent — check your inbox',
  successBodyCustom: 'The link is on its way to {email}.',
  errorInvalidEmail: 'Please enter a valid email address',
  errorAction: "Couldn't send the link. Please try again.",
  dismissLabel: 'Dismiss',
  dismissedToast: 'Widget dismissed',
  attribution: 'Open-source by Spectacle',
  attributionUrl: 'https://spectaclehq.com/email-to-self?utm_source=widget',
  backToArticle: 'Back to article',
  bannerCollapsedHeading: 'Email this to yourself',
  bannerCollapsedSub: "You're in an in-app browser",
  bannerSubmit: 'Send',
};

export function mergeCopy(overrides?: Partial<Copy>): Copy {
  return overrides ? { ...defaultCopy, ...overrides } : defaultCopy;
}

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : `{${key}}`,
  );
}
