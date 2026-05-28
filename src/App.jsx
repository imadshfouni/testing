import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { findCueAtTime, parseSrt } from './utils/parseSrt';

const SUBTITLE_PATHS = {
  en: '/subtitles/en.srt',
  fr: '/subtitles/fr.srt',
};

const SYNTHESIA_EMBED_SRC =
  'https://share.synthesia.io/embeds/videos/52860779-60ac-4df2-8a05-fd1b56a83c3e';

async function loadSubtitleFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.text();
}

export default function App() {
  const [language, setLanguage] = useState('en');
  const [cuesByLang, setCuesByLang] = useState({ en: [], fr: [] });
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const lastTickRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSubtitles() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [enText, frText] = await Promise.all([
          loadSubtitleFile(SUBTITLE_PATHS.en),
          loadSubtitleFile(SUBTITLE_PATHS.fr),
        ]);

        if (cancelled) return;

        setCuesByLang({
          en: parseSrt(enText),
          fr: parseSrt(frText),
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Could not load subtitle files.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSubtitles();
    return () => {
      cancelled = true;
    };
  }, []);

  const tick = useCallback((timestamp) => {
    if (lastTickRef.current == null) {
      lastTickRef.current = timestamp;
    }
    const delta = timestamp - lastTickRef.current;
    lastTickRef.current = timestamp;
    setElapsedMs((prev) => prev + delta);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return undefined;
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);

  const activeCues = language === 'off' ? [] : cuesByLang[language] ?? [];
  const currentCue =
    language !== 'off' ? findCueAtTime(activeCues, elapsedMs) : null;

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    lastTickRef.current = null;
  };

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Synthesia Subtitle Demo</h1>
        <p className="app-subtitle">
          Custom subtitle overlay for embedded Synthesia videos (iframe-safe).
          Native <code>&lt;track&gt;</code> elements only apply to direct{' '}
          <code>&lt;video&gt;</code> sources such as MP4, not cross-origin iframes.
        </p>
      </header>

      <main className="app-main">
        <section className="player-section" aria-label="Video player">
          <div className="video-container">
            <iframe
              src={SYNTHESIA_EMBED_SRC}
              loading="lazy"
              title="Synthesia video player - AI Path EN"
              allowFullScreen
              allow="encrypted-media; fullscreen; microphone; screen-wake-lock;"
            />
            {currentCue && (
              <div className="subtitle-overlay" role="status" aria-live="polite">
                <p className="subtitle-text">{currentCue.text}</p>
              </div>
            )}
          </div>

          <p className="timer-display" aria-label="Caption timer">
            Timer: <strong>{formatTime(elapsedMs)}</strong>
            {isRunning ? ' (running)' : ' (paused)'}
          </p>
        </section>

        <section className="controls-section" aria-label="Subtitle controls">
          <fieldset className="control-group">
            <legend>Language</legend>
            <div className="button-row">
              <button
                type="button"
                className={language === 'en' ? 'btn active' : 'btn'}
                onClick={() => setLanguage('en')}
                disabled={isLoading || !!loadError}
              >
                English
              </button>
              <button
                type="button"
                className={language === 'fr' ? 'btn active' : 'btn'}
                onClick={() => setLanguage('fr')}
                disabled={isLoading || !!loadError}
              >
                French
              </button>
              <button
                type="button"
                className={language === 'off' ? 'btn active' : 'btn'}
                onClick={() => setLanguage('off')}
              >
                Subtitles Off
              </button>
            </div>
          </fieldset>

          <fieldset className="control-group">
            <legend>Playback sync</legend>
            <p className="control-hint">
              Press Start when the video begins, then Pause/Reset to stay in sync.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
                disabled={language === 'off' || isLoading || !!loadError}
              >
                Start Captions
              </button>
              <button
                type="button"
                className="btn"
                onClick={handlePause}
                disabled={!isRunning}
              >
                Pause Captions
              </button>
              <button type="button" className="btn" onClick={handleReset}>
                Reset Captions
              </button>
            </div>
          </fieldset>
        </section>

        {isLoading && (
          <p className="status-message status-loading">Loading subtitle files…</p>
        )}

        {loadError && (
          <div className="status-message status-error" role="alert">
            <strong>Subtitle load error:</strong> {loadError}
            <p>
              Ensure <code>public/subtitles/en.srt</code> and{' '}
              <code>public/subtitles/fr.srt</code> exist and redeploy.
            </p>
          </div>
        )}

        {!isLoading && !loadError && (
          <p className="status-message status-ok">
            Loaded {cuesByLang.en.length} English and {cuesByLang.fr.length} French
            cues.
          </p>
        )}
      </main>

      <footer className="app-footer">
        <p>Frontend-only demo · React + Vite · Ready for Render static hosting</p>
      </footer>
    </div>
  );
}
