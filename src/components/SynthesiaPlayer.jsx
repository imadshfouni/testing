import { LanguageSelector } from './LanguageSelector';

const SYNTHESIA_EMBED_SRC =
  'https://share.synthesia.io/embeds/videos/52860779-60ac-4df2-8a05-fd1b56a83c3e';

const UNSUPPORTED_MSG =
  'This Synthesia iframe does not expose video timing events, so external subtitles cannot be synced automatically from outside the iframe.';

/**
 * Mode 1: Synthesia iframe + overlay captions driven only by postMessage player events.
 * No manual “Play Captions” control — user presses play inside the iframe.
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
}) {
  const showOverlay = syncMode === 'supported' && currentCaption;

  return (
    <section className="player-section" aria-label="Synthesia embed test">
      <div className="player-stack">
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

        <div className="player-toolbar">
          <div className={`sync-banner sync-banner--${syncMode}`} role="status">
            <span className="sync-badge">
              {syncMode === 'detecting' && 'Detecting API'}
              {syncMode === 'supported' && 'Auto sync'}
              {syncMode === 'unsupported' && 'Not supported'}
            </span>
            <p className="sync-message">
              {syncMode === 'detecting' &&
                'Listening for Synthesia play / pause / seek / time events via postMessage… Press play on the video after choosing a language.'}
              {syncMode === 'supported' &&
                'Subtitles follow the iframe player automatically. Use the video controls — no separate caption buttons.'}
              {syncMode === 'unsupported' && UNSUPPORTED_MSG}
            </p>
          </div>

          <LanguageSelector
            value={selectedLanguage}
            onChange={setLanguage}
            disabled={!subtitlesReady || !!loadError}
          />

          {import.meta.env.DEV && (
            <div className="capabilities" aria-label="Detected iframe events">
              <span className="capabilities-label">Detected events (dev):</span>
              {['play', 'pause', 'seek', 'time', 'ended'].map((key) => (
                <span
                  key={key}
                  className={
                    capabilities[key] ? 'cap cap--yes' : 'cap cap--no'
                  }
                >
                  {key}
                </span>
              ))}
            </div>
          )}

          {import.meta.env.DEV && (
            <p className="dev-hint">
              Open the console — every <code>postMessage</code> from Synthesia is
              logged as <code>[Synthesia iframe message]</code>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export { UNSUPPORTED_MSG };
