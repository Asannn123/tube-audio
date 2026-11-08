export type Platform = 'android' | 'ios' | 'desktop';
export interface LinkInput { videoId?: string | null; playlistId?: string | null; playlistIndex?: number | null }
export interface OpenLink { href: string; newTab: boolean; platform: Platform }

const VIDEO_RE = /^[\w-]{11}$/;
const LIST_RE = /^[\w-]{10,64}$/;
const ANDROID_PACKAGE = 'com.google.android.youtube';

export function detectPlatform(ua: string = navigator.userAgent): Platform {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

/** Regular https URL, or null when there is no valid video or playlist ID. */
export function buildWebUrl({ videoId, playlistId, playlistIndex }: LinkInput): string | null {
  const v = !!videoId && VIDEO_RE.test(videoId);
  const l = !!playlistId && LIST_RE.test(playlistId);
  if (v) {
    const p = new URLSearchParams({ v: videoId! });
    if (l) {
      p.set('list', playlistId!);
      if (Number.isInteger(playlistIndex) && (playlistIndex as number) > 0) p.set('index', String(playlistIndex));
    }
    return `https://www.youtube.com/watch?${p}`;
  }
  if (l) return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId!)}`;
  return null;
}

/** Best-effort Android intent. Chrome falls back to the web URL if the app isn't available. */
export function buildAndroidIntent(webUrl: string): string {
  const u = new URL(webUrl);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

export function getOpenLink(input: LinkInput, platform: Platform = detectPlatform()): OpenLink | null {
  const web = buildWebUrl(input);
  if (!web) return null;
  // iOS and desktop use the plain https link (iOS hands it to the app via universal links).
  if (platform === 'android') return { href: buildAndroidIntent(web), newTab: false, platform };
  return { href: web, newTab: true, platform };
}
