/**
 * In-app browser detection via user-agent sniffing.
 *
 * UA strings drift; this is a best-effort signal, not a guarantee. The host can
 * always force-show via `forceShow: true` for testing or to bypass detection.
 */

const IN_APP_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'instagram', re: /Instagram/i },
  { name: 'linkedin', re: /LinkedInApp/i },
  // Messenger before Facebook: Messenger UAs also carry FBAV, so the more
  // specific match has to win first.
  { name: 'messenger', re: /\bFB_IAB\b|Messenger/i },
  // Facebook in-app browser exposes both FBAN (app id) and FBAV (app version).
  // Either alone is a strong signal.
  { name: 'facebook', re: /\bFBAN\b|\bFBAV\b/i },
  { name: 'twitter', re: /Twitter/i },
  { name: 'tiktok', re: /Bytedance|musical_ly|TikTok/i },
  { name: 'snapchat', re: /Snapchat/i },
  { name: 'pinterest', re: /Pinterest/i },
  { name: 'wechat', re: /MicroMessenger/i },
  { name: 'line', re: /\bLine\//i },
];

export interface InAppDetection {
  isInApp: boolean;
  app: string | null;
}

export function detectInAppBrowser(userAgent?: string): InAppDetection {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '') ?? '';
  for (const { name, re } of IN_APP_PATTERNS) {
    if (re.test(ua)) return { isInApp: true, app: name };
  }
  return { isInApp: false, app: null };
}
