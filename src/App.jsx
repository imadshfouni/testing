import { useEffect, useState } from 'react';
import './App.css';
import { useSubtitleSync } from './hooks/useSubtitleSync';
import { parseSrt } from './utils/parseSrt';

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

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

export default function App() {
  const [cuesByLang, setCuesByLang] = useState({ en: [], fr: [] });
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    elapsedTime,
    isPlaying,
    selectedLanguage,
    currentCaption,
    syncMode,
    iframeEventsDetected,
    syncLabel,
    start,
    pause,
    reset,
    setLanguage,
  } = useSubtitleSync({ cuesByLang });

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

  const showManualControls = syncMode === 'manual';
  const showDetecting = syncMode === 'detecting';

  return (
    <div className="app">
      <header className="app-header">
        <h1>Synthesia Subtitle Demo</h1>
        <p className="app-subtitle">
          Custom subtitle overlay for embedded Synthesia videos. Native{' '}
          <code>&lt;track&gt;</code> works with direct <code>&lt;video&gt;</code> / MP4
          only—not cross-origin iframes.
        </p>
      </header>

      <main className="app-main">
        <section className="player-section" aria-label="Video player">
          <div className="player-stack">
            <div className="video-container">
              <iframe
                src={SYNTHESIA_EMBED_SRC}
                loading="lazy"
                title="Synthesia video player - AI Path EN"
                allowFullScreen
                allow="encrypted-media; fullscreen; microphone; screen-wake-lock;"
              />
              {currentCaption && (
                <div className="subtitle-overlay" role="status" aria-live="polite">
                  <p className="subtitle-text">{currentCaption.text}</p>
                </div>
              )}
            </div>

            <div className="player-toolbar" aria-label="Subtitle controls">
              <div
                className={`sync-banner sync-banner--${syncMode}`}
                role="status"
              >
                <span className="sync-badge">
                  {syncMode === 'iframe' && 'Auto sync'}
                  {syncMode === 'manual' && 'Manual sync'}
                  {syncMode === 'detecting' && 'Detecting…'}
                </span>
                <p className="sync-message">{syncLabel}</p>
              </div>

              <fieldset className="toolbar-group">
                <legend>Subtitles</legend>
                <div className="button-row">
                  <button
                    type="button"
                    className={selectedLanguage === 'en' ? 'btn active' : 'btn'}
                    onClick={() => setLanguage('en')}
                    disabled={isLoading || !!loadError}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={selectedLanguage === 'fr' ? 'btn active' : 'btn'}
                    onClick={() => setLanguage('fr')}
                    disabled={isLoading || !!loadError}
                  >
                    French
                  </button>
                  <button
                    type="button"
                    className={selectedLanguage === 'off' ? 'btn active' : 'btn'}
                    onClick={() => setLanguage('off')}
                  >
                    Off
                  </button>
                </div>
              </fieldset>

              {(showManualControls || showDetecting) && (
                <fieldset className="toolbar-group">
                  <legend>Caption sync</legend>
                  <div className="button-row">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={start}
                      disabled={isLoading || !!loadError || isPlaying}
                    >
                      Play Captions
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={pause}
                      disabled={!isPlaying}
                    >
                      Pause Captions
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={reset}
                      disabled={isLoading || !!loadError}
                    >
                      Reset Captions
                    </button>
                  </div>
                </fieldset>
              )}

              <p className="timer-display" aria-label="Caption timer">
                <span className="timer-label">Position</span>
                <strong>{formatTime(elapsedTime)}</strong>
                <span className="timer-state">
                  {isPlaying ? '· playing' : '· paused'}
                </span>
                {selectedLanguage === 'off' && (
                  <span className="timer-state"> · hidden (timer active)</span>
                )}
              </p>

              {import.meta.env.DEV && (
                <p className="dev-hint">
                  Dev: open the console to inspect <code>postMessage</code> events
                  from the Synthesia iframe.
                  {iframeEventsDetected
                    ? ' Player events detected.'
                    : ' No usable player events yet.'}
                </p>
              )}
            </div>
          </div>
        </section>

        {isLoading && (
          <p className="status-message status-loading">Loading subtitle files…</p>
        )}

        {loadError && (
          <div className="status-message status-error" role="alert">
            <strong>Subtitle load error:</strong> {loadError}
            <p>
              Ensure <code>public/subtitles/en.srt</code> and{' '}
              <code>public/subtitles/fr.srt</code> exist.
            </p>
          </div>
        )}

        {!isLoading && !loadError && (
          <p className="status-message status-ok">
            Loaded {cuesByLang.en.length} English and {cuesByLang.fr.length} French
            cues. Changing language keeps the current timestamp.
          </p>
        )}

        <section className="info-section">
          <h2>How sync works</h2>
          <ul>
            <li>
              <strong>Level 1 (automatic):</strong> listens for{' '}
              <code>postMessage</code> events from <code>share.synthesia.io</code>.
              If Synthesia sends play, pause, or time updates, captions follow the
              player.
            </li>
            <li>
              <strong>Level 2 (fallback):</strong> if no usable events are detected
              within a few seconds, use Play / Pause / Reset next to the video.
            </li>
            <li>
              We do <strong>not</strong> claim 100% automatic sync unless real
              iframe events are detected—cross-origin embeds often hide playback
              state from the parent page.
            </li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>React + Vite · Static deploy on Render</p>
      </footer>
    </div>
  );
}
