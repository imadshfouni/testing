import { useEffect, useState } from 'react';
import './App.css';
import { NativeVideoPlayer } from './components/NativeVideoPlayer';
import { SynthesiaPlayer } from './components/SynthesiaPlayer';
import { useDemoVideo } from './hooks/useDemoVideo';
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
  const [playerMode, setPlayerMode] = useState('native');
  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [cuesByLang, setCuesByLang] = useState({ en: [], fr: [] });
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const demoVideo = useDemoVideo();

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
  const videoProps = {
    videoSrc: demoVideo.videoSrc,
    videoStatus: demoVideo.status,
    onLoadLocalFile: demoVideo.loadLocalFile,
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Subtitle Sync Demo</h1>
        <p className="app-subtitle">
          Mode 2 (native MP4) is the reliable option. Mode 1 uses the Synthesia iframe
          only if it sends player events; otherwise it falls back to your MP4.
        </p>
      </header>

      <main className="app-main">
        <nav className="mode-tabs" aria-label="Player mode">
          <button
            type="button"
            className={playerMode === 'native' ? 'mode-tab active' : 'mode-tab'}
            onClick={() => setPlayerMode('native')}
          >
            Mode 2 — Native MP4 (recommended)
          </button>
          <button
            type="button"
            className={playerMode === 'synthesia' ? 'mode-tab active' : 'mode-tab'}
            onClick={() => setPlayerMode('synthesia')}
          >
            Mode 1 — Synthesia iframe
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

        {subtitlesReady && demoVideo.status === 'ready' && (
          <p className="status-message status-ok">
            Video ready · {cuesByLang.en.length} EN / {cuesByLang.fr.length} FR cues
          </p>
        )}

        {subtitlesReady && demoVideo.status === 'missing' && (
          <p className="status-message status-loading">
            No <code>demo.mp4</code> on server — choose your MP4 below or set{' '}
            <code>VITE_VIDEO_URL</code> on Render.
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
            {...videoProps}
          />
        ) : (
          <NativeVideoPlayer
            language={nativeLanguage}
            setLanguage={setNativeLanguage}
            {...videoProps}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>React + Vite · Render static site</p>
      </footer>
    </div>
  );
}
