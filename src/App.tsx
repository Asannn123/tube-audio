import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import { loadYouTubeApi, parseVideoId, parsePlaylist, PLAYER_ERRORS } from './youtube';
import OpenInYouTube from './components/OpenInYouTube';
import MobilePlaybackNotice from './components/MobilePlaybackNotice';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const KEY = 'listening-room:favorites';
type Fav = { id: string; title: string; listId?: string | null; index?: number | null };
type Status = 'idle' | 'loading' | 'ready' | 'error';

function readFavs(): Fav[] {
  const v = JSON.parse(localStorage.getItem(KEY) || '[]');
  return Array.isArray(v) ? v.filter((f) => f && typeof f.id === 'string' && typeof f.title === 'string') : [];
}

export default function App() {
  const wrap = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const ready = useRef(false);
  const pending = useRef<string | null>(null);
  const loopRef = useRef(false);
  const rateRef = useRef(1);

  const [input, setInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ listId: string | null; index: number | null }>({ listId: null, index: null });
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(false);
  const [favs, setFavs] = useState<Fav[]>([]);
  const [storageError, setStorageError] = useState('');

  // Favorites: load, and sync across tabs
  useEffect(() => {
    const load = () => { try { setFavs(readFavs()); setStorageError(''); } catch { setStorageError('Browser storage is unavailable, so favorites can’t be loaded or saved.'); } };
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const saveFavs = (next: Fav[]) => {
    setFavs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('Couldn’t save to browser storage. Favorites will be lost when you close this tab.'); }
  };

  // YouTube player
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !wrap.current) return;
      const el = document.createElement('div');
      wrap.current.appendChild(el);
      player.current = new YT.Player(el, {
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            ready.current = true;
            if (pending.current) { player.current.loadVideoById(pending.current); pending.current = null; }
          },
          onStateChange: (e: any) => {
            const s = e.data;
            if ([1, 2, 3, 5].includes(s)) {
              const t = player.current?.getVideoData?.().title;
              if (t) setTitle(t);
              setStatus('ready'); setError('');
            }
            setPlaying(s === 1 || s === 3);
            if (s === 1) player.current.setPlaybackRate(rateRef.current);
            if (s === 0 && loopRef.current) { player.current.seekTo(0, true); player.current.playVideo(); }
          },
          onError: (e: any) => {
            setStatus('error'); setPlaying(false);
            setError(PLAYER_ERRORS[e.data] ?? `YouTube couldn’t play this video (error ${e.data}).`);
          },
        },
      });
    }).catch(() => { setStatus('error'); setError('The YouTube player script couldn’t load. Check your connection or ad blocker.'); });
    return () => { cancelled = true; try { player.current?.destroy(); } catch {} player.current = null; ready.current = false; if (wrap.current) wrap.current.innerHTML = ''; };
  }, []);

  const play = useCallback((id: string, listId: string | null = null, index: number | null = null) => {
    setVideoId(id); setCtx({ listId, index }); setTitle(''); setStatus('loading'); setError('');
    if (ready.current) player.current.loadVideoById(id); else pending.current = id;
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = parseVideoId(input);
    if (!id) { setStatus('error'); setError('That doesn’t look like a valid YouTube link. Try a watch, youtu.be, Shorts, embed, or live URL.'); return; }
    const { listId, index } = parsePlaylist(input);
    play(id, listId, index);
  };

  const togglePlay = () => { if (!ready.current || !videoId) return; playing ? player.current.pauseVideo() : player.current.playVideo(); };
  const pickRate = (r: number) => { setRate(r); rateRef.current = r; if (ready.current) player.current.setPlaybackRate(r); };
  const toggleLoop = () => { setLoop((l) => { loopRef.current = !l; return !l; }); };
  const isFav = !!videoId && favs.some((f) => f.id === videoId);
  const toggleFav = () => {
    if (!videoId) return;
    saveFavs(isFav ? favs.filter((f) => f.id !== videoId) : [...favs, { id: videoId, title: title || `Untitled video (${videoId})`, listId: ctx.listId, index: ctx.index }]);
  };

  return (
    <div className="shell">
      <header className="top">
        <span className="mono tag">LISTENING ROOM</span>
        <h1>Make room for the music.</h1>
      </header>

      <main>
        <MobilePlaybackNotice action={videoId ? <OpenInYouTube videoId={videoId} playlistId={ctx.listId} playlistIndex={ctx.index} testId="notice-open-youtube" /> : undefined} />

        <section className="panel" aria-labelledby="h-in">
          <h2 id="h-in" className="mono label"><i>01</i> Input</h2>
          <form onSubmit={submit} className="row">
            <input data-testid="url-input" aria-label="YouTube URL" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste a YouTube link…" autoComplete="off" />
            <button data-testid="load-button" className="btn primary mono" type="submit">LOAD</button>
          </form>
          {status === 'error' && <p role="alert" className="msg err" data-testid="error">{error}</p>}
        </section>

        <section className="panel" aria-labelledby="h-pl">
          <h2 id="h-pl" className="mono label"><i>02</i> Player</h2>
          <div className="frame" data-testid="player-frame">
            <div ref={wrap} className="yt" />
            {(status === 'idle' || status === 'loading') && (
              <div className="overlay mono" data-testid="player-state">{status === 'loading' ? 'LOADING VIDEO…' : 'NO VIDEO LOADED'}</div>
            )}
          </div>
          <p className="now" data-testid="title">{title || (videoId && status !== 'error' ? 'Waiting for title from YouTube…' : '—')}</p>
          <div className="controls">
            <button data-testid="play-pause" className="btn primary mono" onClick={togglePlay} disabled={!videoId || status === 'error'}>{playing ? 'PAUSE' : 'PLAY'}</button>
            <button data-testid="loop-toggle" className={'btn mono' + (loop ? ' on' : '')} aria-pressed={loop} onClick={toggleLoop}>LOOP {loop ? 'ON' : 'OFF'}</button>
            <button data-testid="favorite-toggle" className={'btn mono' + (isFav ? ' on mag' : '')} aria-pressed={isFav} onClick={toggleFav} disabled={!videoId}>{isFav ? '★ KEPT' : '☆ KEEP'}</button>
            {videoId && <OpenInYouTube videoId={videoId} playlistId={ctx.listId} playlistIndex={ctx.index} testId="open-youtube" />}
            {ctx.listId && <OpenInYouTube playlistId={ctx.listId} label="Open playlist" testId="open-playlist" />}
          </div>
          <div className="rates" role="group" aria-label="Playback speed">
            <span className="mono dim">SPEED</span>
            {RATES.map((r) => (
              <button key={r} data-testid={`speed-${r}`} className={'btn small mono' + (rate === r ? ' on' : '')} aria-pressed={rate === r} onClick={() => pickRate(r)}>{r}×</button>
            ))}
          </div>
          <p className="note">
            Playback happens in YouTube’s embedded player and stops when Chrome is backgrounded or the screen locks. “Open in YouTube” hands the video to the official app, where background play may need YouTube Premium. Once you leave this page, the controls here no longer affect that playback.
          </p>
        </section>

        <section className="panel" aria-labelledby="h-fv">
          <h2 id="h-fv" className="mono label"><i>03</i> Kept close.</h2>
          {storageError && <p role="alert" className="msg err" data-testid="storage-error">{storageError}</p>}
          {favs.length === 0 ? (
            <p className="dim" data-testid="favorites-empty">Nothing kept yet. Load a video and press KEEP.</p>
          ) : (
            <ul className="favs" data-testid="favorites-list">
              {favs.map((f) => (
                <li key={f.id}>
                  <button data-testid={`fav-play-${f.id}`} className="fav-title" onClick={() => play(f.id, f.listId ?? null, f.index ?? null)}>{f.title}</button>
                  <OpenInYouTube videoId={f.id} playlistId={f.listId} playlistIndex={f.index} label="YouTube" small testId={`fav-open-${f.id}`} />
                  <button data-testid={`fav-remove-${f.id}`} className="btn small mono" aria-label={`Remove ${f.title}`} onClick={() => saveFavs(favs.filter((x) => x.id !== f.id))}>REMOVE</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
