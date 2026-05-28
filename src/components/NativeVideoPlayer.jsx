import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageSelector } from './LanguageSelector';
import { VideoFilePicker } from './VideoFilePicker';

const TRACKS = [
  { lang: 'en', label: 'English', src: '/subtitles/en.vtt' },
  { lang: 'fr', label: 'French', src: '/subtitles/fr.vtt' },
];

/**
 * Mode 2: Native HTML5 video + WebVTT <track> — browser-synced subtitles.
 */
export function NativeVideoPlayer({
  language,
  setLanguage,
  videoSrc,
  videoStatus,
  onLoadLocalFile,
  compact = false,
}) {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);

  const applyTextTracks = useCallback((lang) => {
    const video = videoRef.current;
    if (!video?.textTracks) return;

    for (let i = 0; i < video.textTracks.length; i += 1) {
      const track = video.textTracks[i];
      if (lang === 'off') {
        track.mode = 'disabled';
      } else if (track.language === lang) {
        track.mode = 'showing';
      } else {
        track.mode = 'hidden';
      }
    }
  }, []);

  useEffect(() => {
    setVideoError(null);
    setVideoReady(false);
  }, [videoSrc]);

  useEffect(() => {
    applyTextTracks(language);
  }, [language, applyTextTracks, videoReady]);

  const onLoadedMetadata = () => {
    setVideoReady(true);
    setVideoError(null);
    applyTextTracks(language);
  };

  const missing = videoStatus === 'missing';
  const checking = videoStatus === 'checking';

  return (
    <section
      className="player-section"
      aria-label={compact ? 'Synced MP4 player' : 'Native MP4 test'}
    >
      <div className="player-stack">
        {missing && !checking && (
          <div className="video-missing-panel">
            <p>
              <strong>No video file found.</strong> Add{' '}
              <code>public/videos/demo.mp4</code> (export from Synthesia), choose a
              file below, or set <code>VITE_VIDEO_URL</code> for production (Render).
            </p>
            <VideoFilePicker onSelect={onLoadLocalFile} />
          </div>
        )}

        {checking && (
          <p className="status-message status-loading">Checking for demo video…</p>
        )}

        {videoStatus === 'ready' && (
          <div className="video-container">
            <video
              key={videoSrc}
              ref={videoRef}
              className="native-video"
              controls
              playsInline
              preload="metadata"
              src={videoSrc}
              onLoadedMetadata={onLoadedMetadata}
              onError={() =>
                setVideoError(
                  'Video failed to load. Try choosing another MP4 or check VITE_VIDEO_URL.',
                )
              }
            >
              {TRACKS.map((t) => (
                <track
                  key={t.lang}
                  kind="subtitles"
                  src={t.src}
                  srcLang={t.lang}
                  label={t.label}
                />
              ))}
              Your browser does not support HTML5 video.
            </video>
          </div>
        )}

        <div className="player-toolbar">
          <div className="sync-banner sync-banner--supported" role="status">
            <span className="sync-badge">Native sync</span>
            <p className="sync-message">
              {compact
                ? 'Automatic subtitles via <video> + WebVTT (same export as your Synthesia video).'
                : 'Play, pause, and seek are synced by the browser — no external timer.'}
            </p>
          </div>

          <LanguageSelector
            value={language}
            onChange={setLanguage}
            disabled={!!videoError || !videoReady}
          />

          {videoStatus === 'ready' && (
            <VideoFilePicker onSelect={onLoadLocalFile} />
          )}

          {videoError && (
            <p className="status-message status-error" role="alert">
              {videoError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
