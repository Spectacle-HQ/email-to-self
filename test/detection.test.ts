import { describe, expect, it } from 'vitest';
import { detectInAppBrowser } from '../src/core/detection';

const SAMPLES = {
  instagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 314.0.0.20.119 (iPhone15,2; iOS 17_0; en_US; en-US; scale=3.00; 1179x2556; 552555524) NW/3',
  linkedin:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.0 (iPhone; iOS 17.0)',
  facebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/430.0.0.36.105;FBBV/588617088]',
  messenger:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/431.0]',
  tiktok:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_18.0.0 JsSdk/2.0',
  reddit:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Reddit/Version 2024.32.0/Build 1617543/Android 14',
  redditCrawler: 'Mozilla/5.0 (compatible; redditbot/1.0; +http://www.reddit.com/feedback)',
  safari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('detects Instagram', () => {
    expect(detectInAppBrowser(SAMPLES.instagram)).toEqual({ isInApp: true, app: 'instagram' });
  });

  it('detects LinkedIn', () => {
    expect(detectInAppBrowser(SAMPLES.linkedin)).toEqual({ isInApp: true, app: 'linkedin' });
  });

  it('detects Facebook (FBAN/FBAV)', () => {
    expect(detectInAppBrowser(SAMPLES.facebook)).toEqual({ isInApp: true, app: 'facebook' });
  });

  it('detects Messenger (FB_IAB)', () => {
    // Messenger UAs also contain FBAV; the more specific FB_IAB match runs
    // first so we identify them as messenger, not facebook.
    expect(detectInAppBrowser(SAMPLES.messenger)).toEqual({ isInApp: true, app: 'messenger' });
  });

  it('detects TikTok', () => {
    expect(detectInAppBrowser(SAMPLES.tiktok)).toEqual({ isInApp: true, app: 'tiktok' });
  });

  it('detects Reddit (Android)', () => {
    expect(detectInAppBrowser(SAMPLES.reddit)).toEqual({ isInApp: true, app: 'reddit' });
  });

  it("does not mistake Reddit's link-preview crawler for its app", () => {
    expect(detectInAppBrowser(SAMPLES.redditCrawler)).toEqual({ isInApp: false, app: null });
  });

  it('returns false for Mobile Safari', () => {
    expect(detectInAppBrowser(SAMPLES.safari)).toEqual({ isInApp: false, app: null });
  });

  it('returns false for Chrome Android', () => {
    expect(detectInAppBrowser(SAMPLES.chromeAndroid)).toEqual({ isInApp: false, app: null });
  });

  it('handles empty UA gracefully', () => {
    expect(detectInAppBrowser('')).toEqual({ isInApp: false, app: null });
  });
});
