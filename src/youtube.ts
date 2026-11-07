declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

export function parseVideoId(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let u: URL;
  try { u = new URL(/^[a-z]+:\/\//i.test(t) ? t : 'https://' + t); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  let id: string | null = null;
  if (host === 'youtu.be') id = parts[0] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

let apiPromise: Promise<any> | null = null;
export function loadYouTubeApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { apiPromise = null; reject(new Error('YouTube player script failed to load')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

export const PLAYER_ERRORS: Record<number, string> = {
  2: 'YouTube says this video ID is invalid.',
  5: 'The YouTube player hit an internal error. Try again.',
  100: 'This video was removed, is private, or doesn’t exist.',
  101: 'The owner of this video has disabled embedded playback.',
  150: 'The owner of this video has disabled embedded playback.',
  153: 'YouTube couldn’t verify where this page runs. Open it from an https:// site or localhost.',
};

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

// Android: try the official YouTube app, fall back to the regular URL. Elsewhere: regular URL.
export function openUrl(id: string): string {
  const web = watchUrl(id);
  if (/android/i.test(navigator.userAgent)) {
    return `intent://www.youtube.com/watch?v=${id}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(web)};end`;
  }
  return web;
}
