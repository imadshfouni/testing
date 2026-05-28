import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageSelector } from './LanguageSelector';

const VIDEO_SRC = '/videos/demo.mp4';
const TRACKS = [
  { lang: 'en', label: 'English', src: '/subtitles/en.vtt' },
  { lang: 'fr', label: 'French', src: '/subtitles/fr.vtt' },
];

/**
 * Mode 2: Native HTML5 video with <track> WebVTT — 100% browser-synced subtitles.
 * Play / pause / seek on the video element drive captions automatically.
 */
export function NativeVideoPlayer({ language, setLanguage }) {
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
    applyTextTracks(language);
  }, [language, applyTextTracks, videoReady]);

  const onLoadedMetadata = () => {
    setVideoReady(true);
    applyTextTracks(language);
  };

  return (
    <section className="player-section" aria-label="Native MP4 test">
      <div className="player-stack">
        <div className="video-container">
          <video
            ref={videoRef}
            className="native-video"
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={onLoadedMetadata}
            onError={() =>
              setVideoError(
                `Could not load ${VIDEO_SRC}. Add your MP4 export to public/videos/demo.mp4.`,
              )
            }
          >
            <source src={VIDEO_SRC} type="video/mp4" />
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

        <div className="player-toolbar">
          <div className="sync-banner sync-banner--supported" role="status">
            <span className="sync-badge">Native sync</span>
            <p className="sync-message">
              Subtitles use <code>&lt;video&gt;</code> + <code>&lt;track&gt;</code>{' '}
              (WebVTT). Play, pause, and seek are handled by the browser — fully
              automatic, no external timer.
            </p>
          </div>

          <LanguageSelector
            value={language}
            onChange={setLanguage}
            disabled={!!videoError || !videoReady}
          />

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
