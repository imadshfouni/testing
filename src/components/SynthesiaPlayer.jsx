import { LanguageSelector } from './LanguageSelector';
import { NativeVideoPlayer } from './NativeVideoPlayer';
import { VideoFilePicker } from './VideoFilePicker';

const SYNTHESIA_EMBED_SRC =
  'https://share.synthesia.io/embeds/videos/52860779-60ac-4df2-8a05-fd1b56a83c3e';

export const UNSUPPORTED_MSG =
  'This Synthesia iframe does not expose video timing events, so external subtitles cannot be synced automatically from outside the iframe.';

/**
 * Mode 1: Try iframe postMessage sync. If unsupported, fall back to native MP4 player
 * (when demo.mp4 or a local file is available) so subtitles still work automatically.
 */
export function SynthesiaPlayer({
  currentCaption,
  syncMode,
  capabilities,
  selectedLanguage,
  setLanguage,
  registerIframe,
  subtitlesReady,
  loadError,
  videoSrc,
  videoStatus,
  onLoadLocalFile,
}) {
  const showIframe = syncMode === 'detecting' || syncMode === 'supported';
  const showOverlay = syncMode === 'supported' && currentCaption;
  const useNativeFallback =
    syncMode === 'unsupported' && (videoStatus === 'ready' || videoStatus === 'checking');

  if (useNativeFallback) {
    return (
      <div className="synthesia-fallback">
        <div className="sync-banner sync-banner--unsupported" role="alert">
          <span className="sync-badge">Iframe limit</span>
          <p className="sync-message">{UNSUPPORTED_MSG}</p>
          <p className="sync-message sync-message--follow">
            Playing your exported MP4 below with fully automatic subtitles instead.
          </p>
        </div>
        <NativeVideoPlayer
          language={selectedLanguage}
          setLanguage={setLanguage}
          videoSrc={videoSrc}
          videoStatus={videoStatus}
          onLoadLocalFile={onLoadLocalFile}
          compact
        />
      </div>
    );
  }

  return (
    <section className="player-section" aria-label="Synthesia embed test">
      <div className="player-stack">
        {showIframe && (
          <div className="video-container">
            <iframe
              ref={registerIframe}
              src={SYNTHESIA_EMBED_SRC}
              loading="lazy"
              title="Synthesia video player - AI Path EN"
              allowFullScreen
              allow="encrypted-media; fullscreen; microphone; screen-wake-lock;"
            />
            {showOverlay && (
              <div className="subtitle-overlay" role="status" aria-live="polite">
                <p className="subtitle-text">{currentCaption.text}</p>
              </div>
            )}
          </div>
        )}

        <div className="player-toolbar">
          <div className={`sync-banner sync-banner--${syncMode}`} role="status">
            <span className="sync-badge">
              {syncMode === 'detecting' && 'Detecting API'}
              {syncMode === 'supported' && 'Auto sync'}
              {syncMode === 'unsupported' && 'Not supported'}
            </span>
            <p className="sync-message">
              {syncMode === 'detecting' &&
                'Choose a language, then press play on the Synthesia video. We listen for postMessage player events…'}
              {syncMode === 'supported' &&
                'Subtitles follow the iframe player automatically.'}
              {syncMode === 'unsupported' && (
                <>
                  {UNSUPPORTED_MSG}
                  <br />
                  <br />
                  Add <code>public/videos/demo.mp4</code> or choose a file — the app
                  will switch to the synced native player.
                </>
              )}
            </p>
          </div>

          {syncMode === 'unsupported' && videoStatus === 'missing' && (
            <VideoFilePicker onSelect={onLoadLocalFile} />
          )}

          <LanguageSelector
            value={selectedLanguage}
            onChange={setLanguage}
            disabled={!subtitlesReady || !!loadError}
          />

          {import.meta.env.DEV && syncMode !== 'unsupported' && (
            <div className="capabilities" aria-label="Detected iframe events">
              <span className="capabilities-label">Detected (dev):</span>
              {['play', 'pause', 'seek', 'time', 'ended'].map((key) => (
                <span
                  key={key}
                  className={capabilities[key] ? 'cap cap--yes' : 'cap cap--no'}
                >
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
