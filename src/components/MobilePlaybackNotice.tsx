import { ReactNode, useEffect, useState } from 'react';

const KEY = 'listening-room:mobile-notice-dismissed';
const QUERY = '(pointer: coarse)';
const wasDismissed = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

export default function MobilePlaybackNotice({ action }: { action?: ReactNode }) {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);
  const [dismissed, setDismissed] = useState(wasDismissed);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  if (!mobile || dismissed) return null;
  const dismiss = () => { setDismissed(true); try { sessionStorage.setItem(KEY, '1'); } catch {} };

  return (
    <aside className="notice" role="note" aria-label="Mobile playback notice" data-testid="mobile-notice">
      <div className="body">
        <p>
          <strong>Listening on mobile?</strong> Mobile browsers may pause YouTube playback when you lock your screen or
          switch apps. Open this video in the official YouTube app for background listening.
        </p>
        {action}
      </div>
      <button type="button" className="btn small mono" onClick={dismiss} aria-label="Dismiss notice" data-testid="mobile-notice-dismiss">✕</button>
    </aside>
  );
}
