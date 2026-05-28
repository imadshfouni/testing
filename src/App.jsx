import { useEffect, useState } from 'react';
import './App.css';
import { NativeVideoPlayer } from './components/NativeVideoPlayer';
import { SynthesiaPlayer } from './components/SynthesiaPlayer';
import { useSubtitleSync } from './hooks/useSubtitleSync';
import { parseSrt } from './utils/parseSrt';

const SUBTITLE_PATHS = {
  en: '/subtitles/en.srt',
  fr: '/subtitles/fr.srt',
};

async function loadSubtitleFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return response.text();
}

export default function App() {
  /** @type {'synthesia' | 'native'} */
  const [playerMode, setPlayerMode] = useState('synthesia');
  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [cuesByLang, setCuesByLang] = useState({ en: [], fr: [] });
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const synthesia = useSubtitleSync({
    cuesByLang,
    enabled: playerMode === 'synthesia',
  });

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
        setCuesByLang({ en: parseSrt(enText), fr: parseSrt(frText) });
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

  const subtitlesReady = !isLoading && !loadError;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Subtitle Sync Demo</h1>
        <p className="app-subtitle">
          Two modes: Synthesia iframe (only auto-syncs if postMessage events exist)
          and native MP4 (guaranteed sync via <code>&lt;track&gt;</code>).
        </p>
      </header>

      <main className="app-main">
        <nav className="mode-tabs" aria-label="Player mode">
          <button
            type="button"
            className={playerMode === 'synthesia' ? 'mode-tab active' : 'mode-tab'}
            onClick={() => setPlayerMode('synthesia')}
          >
            Mode 1 — Synthesia iframe
          </button>
          <button
            type="button"
            className={playerMode === 'native' ? 'mode-tab active' : 'mode-tab'}
            onClick={() => setPlayerMode('native')}
          >
            Mode 2 — Native MP4 + track
          </button>
        </nav>

        {isLoading && (
          <p className="status-message status-loading">Loading subtitle files…</p>
        )}

        {loadError && (
          <div className="status-message status-error" role="alert">
            <strong>Subtitle load error:</strong> {loadError}
          </div>
        )}

        {subtitlesReady && (
          <p className="status-message status-ok">
            Loaded {cuesByLang.en.length} EN / {cuesByLang.fr.length} FR cues (SRT)
            and WebVTT tracks for native mode.
          </p>
        )}

        {playerMode === 'synthesia' ? (
          <SynthesiaPlayer
            currentCaption={synthesia.currentCaption}
            syncMode={synthesia.syncMode}
            capabilities={synthesia.capabilities}
            selectedLanguage={synthesia.selectedLanguage}
            setLanguage={synthesia.setLanguage}
            registerIframe={synthesia.registerIframe}
            subtitlesReady={subtitlesReady}
            loadError={loadError}
          />
        ) : (
          <NativeVideoPlayer
            language={nativeLanguage}
            setLanguage={setNativeLanguage}
          />
        )}

        <section className="info-section">
          <h2>How this works</h2>
          <ul>
            <li>
              <strong>Mode 1:</strong> Choose English, French, or Off, then press
              play on the Synthesia player. Captions appear only if the iframe sends
              play, pause, seek, or time events via <code>postMessage</code>. We do
              not use a separate caption timer or “Play Captions” button.
            </li>
            <li>
              <strong>Mode 2:</strong> Place your export at{' '}
              <code>public/videos/demo.mp4</code> (same content as the Synthesia
              video). The browser syncs <code>en.vtt</code> / <code>fr.vtt</code>{' '}
              natively — 100% automatic.
            </li>
            <li>
              For production subtitles you control end-to-end, prefer Mode 2 (MP4 +
              WebVTT). Synthesia iframe sync cannot be promised without an official
              embed player API.
            </li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>React + Vite · Render static site</p>
      </footer>
    </div>
  );
}
