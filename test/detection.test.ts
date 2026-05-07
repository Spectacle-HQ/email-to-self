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
