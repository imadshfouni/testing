import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findCueAtTime } from '../utils/parseSrt';
import {
  isSynthesiaOrigin,
  isUsablePlayerEvent,
  logPostMessageDev,
  parseSynthesiaMessage,
} from '../utils/synthesiaPostMessage';

const DETECTION_TIMEOUT_MS = 4000;

/**
 * @param {{
 *   cuesByLang: { en: Array<{ start: number, end: number, text: string }>, fr: Array<{ start: number, end: number, text: string }> },
 *   initialLanguage?: 'en' | 'fr' | 'off',
 * }} options
 */
export function useSubtitleSync({ cuesByLang, initialLanguage = 'en' }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  /** @type {'detecting' | 'iframe' | 'manual'} */
  const [syncMode, setSyncMode] = useState('detecting');
  const [iframeEventsDetected, setIframeEventsDetected] = useState(false);

  const elapsedRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastFrameRef = useRef(null);
  const rafRef = useRef(null);
  const previousTimeRef = useRef(0);
  const syncModeRef = useRef(syncMode);

  useEffect(() => {
    syncModeRef.current = syncMode;
  }, [syncMode]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameRef.current = null;
  }, []);

  const tick = useCallback(() => {
    if (!isPlayingRef.current) return;

    const now = performance.now();
    if (lastFrameRef.current != null) {
      const delta = now - lastFrameRef.current;
      elapsedRef.current += delta;
      setElapsedTime(elapsedRef.current);
    }
    lastFrameRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsPlaying(true);
    lastFrameRef.current = performance.now();
    cancelRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [cancelRaf, tick]);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    setIsPlaying(false);
    cancelRaf();
  }, [cancelRaf]);

  const reset = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    cancelRaf();
    elapsedRef.current = 0;
    previousTimeRef.current = 0;
    setElapsedTime(0);
  }, [cancelRaf]);

  const seekTo = useCallback(
    (ms, { autoPlay } = {}) => {
      const clamped = Math.max(0, ms);
      elapsedRef.current = clamped;
      setElapsedTime(clamped);

      if (autoPlay) start();
    },
    [start],
  );

  const setLanguage = useCallback((lang) => {
    setSelectedLanguage(lang);
  }, []);

  const handleIframeEvent = useCallback(
    (parsed) => {
      if (!isUsablePlayerEvent(parsed)) return;

      if (!iframeEventsDetected) {
        setIframeEventsDetected(true);
        setSyncMode('iframe');
      }

      const { type, currentTimeMs } = parsed;

      if (currentTimeMs != null) {
        const prev = elapsedRef.current;
        if (currentTimeMs < 500 && prev > 2000) {
          reset();
        } else {
          elapsedRef.current = currentTimeMs;
          setElapsedTime(currentTimeMs);
        }
        previousTimeRef.current = currentTimeMs;
      }

      switch (type) {
        case 'play':
          start();
          break;
        case 'pause':
          pause();
          break;
        case 'ended':
          pause();
          break;
        case 'reset':
          reset();
          break;
        case 'seek':
          if (currentTimeMs != null) seekTo(currentTimeMs);
          break;
        case 'time':
          if (syncModeRef.current === 'iframe' && !isPlayingRef.current && currentTimeMs != null) {
            elapsedRef.current = currentTimeMs;
            setElapsedTime(currentTimeMs);
          }
          break;
        default:
          break;
      }
    },
    [iframeEventsDetected, pause, reset, seekTo, start],
  );

  useEffect(() => {
    const onMessage = (event) => {
      if (!isSynthesiaOrigin(event.origin)) return;

      const parsed = parseSynthesiaMessage(event.data);
      logPostMessageDev({ origin: event.origin, data: event.data, parsed });

      if (parsed) handleIframeEvent(parsed);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleIframeEvent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSyncMode((mode) => (mode === 'detecting' ? 'manual' : mode));
    }, DETECTION_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => cancelRaf(), [cancelRaf]);

  const activeCues =
    selectedLanguage === 'off' ? [] : cuesByLang[selectedLanguage] ?? [];

  const currentCaption =
    selectedLanguage === 'off'
      ? null
      : findCueAtTime(activeCues, elapsedTime);

  const syncLabel = useMemo(() => {
    if (syncMode === 'detecting') {
      return 'Checking for Synthesia player events…';
    }
    if (syncMode === 'iframe') {
      return 'Auto-synced with Synthesia player (postMessage detected).';
    }
    return 'Because Synthesia iframe does not expose video controls to external code, captions are synced using external controls.';
  }, [syncMode]);

  return {
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
    seekTo,
  };
}
