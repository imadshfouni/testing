import { useCallback, useEffect, useRef, useState } from 'react';
import { findCueAtTime } from '../utils/parseSrt';
import {
  isSynthesiaOrigin,
  isUsablePlayerEvent,
  logPostMessageDev,
  parseSynthesiaMessage,
  probeSynthesiaPlayer,
} from '../utils/synthesiaPostMessage';

const DETECTION_TIMEOUT_MS = 3500;

/**
 * Automatic subtitle sync for Synthesia iframe embeds.
 *
 * ONLY works if the iframe sends play / pause / seek / time events via postMessage.
 * There is no manual caption timer — if timing events never arrive, syncMode becomes
 * "unsupported" and overlays are disabled.
 *
 * @param {{
 *   cuesByLang: { en: Array<{ start: number, end: number, text: string }>, fr: Array<{ start: number, end: number, text: string }> },
 *   initialLanguage?: 'en' | 'fr' | 'off',
 *   enabled?: boolean,
 * }} options
 */
export function useSubtitleSync({
  cuesByLang,
  initialLanguage = 'en',
  enabled = true,
}) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  /** @type {'detecting' | 'supported' | 'unsupported'} */
  const [syncMode, setSyncMode] = useState('detecting');
  const [capabilities, setCapabilities] = useState({
    play: false,
    pause: false,
    seek: false,
    ended: false,
    time: false,
  });

  const elapsedRef = useRef(0);
  const isPlayingRef = useRef(false);
  const lastFrameRef = useRef(null);
  const rafRef = useRef(null);
  const usesVideoClockRef = useRef(false);
  const iframeRef = useRef(null);

  const markCapability = useCallback((type) => {
    setCapabilities((prev) => {
      if (prev[type]) return prev;
      return { ...prev, [type]: true };
    });
  }, []);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameRef.current = null;
  }, []);

  const tick = useCallback(() => {
    if (!isPlayingRef.current || usesVideoClockRef.current) return;

    const now = performance.now();
    if (lastFrameRef.current != null) {
      const delta = now - lastFrameRef.current;
      elapsedRef.current += delta;
      setElapsedTime(elapsedRef.current);
    }
    lastFrameRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const setPlaying = useCallback(
    (playing) => {
      isPlayingRef.current = playing;
      setIsPlaying(playing);
      if (playing && !usesVideoClockRef.current) {
        lastFrameRef.current = performance.now();
        cancelRaf();
        rafRef.current = requestAnimationFrame(tick);
      } else {
        cancelRaf();
      }
    },
    [cancelRaf, tick],
  );

  const applyVideoTime = useCallback((ms) => {
    const clamped = Math.max(0, ms);
    elapsedRef.current = clamped;
    setElapsedTime(clamped);
    usesVideoClockRef.current = true;
  }, []);

  const resetElapsed = useCallback(() => {
    elapsedRef.current = 0;
    setElapsedTime(0);
  }, []);

  const evaluateSupport = useCallback((caps) => {
    const hasTransport = caps.play || caps.pause;
    const hasTiming = caps.time || caps.seek;
    return hasTransport && hasTiming;
  }, []);

  const handleIframeEvent = useCallback(
    (parsed) => {
      if (!isUsablePlayerEvent(parsed)) return;

      const { type, currentTimeMs } = parsed;

      setCapabilities((prev) => {
        const next = { ...prev };
        if (type === 'play') next.play = true;
        if (type === 'pause' || type === 'ended') next.pause = true;
        if (type === 'seek') next.seek = true;
        if (type === 'ended') next.ended = true;
        if (type === 'time' || (currentTimeMs != null && type !== 'play')) {
          next.time = true;
        }
        if (evaluateSupport(next)) {
          setSyncMode('supported');
        }
        return next;
      });

      if (currentTimeMs != null) {
        const prev = elapsedRef.current;
        if (currentTimeMs < 500 && prev > 2000) {
          resetElapsed();
        }
        applyVideoTime(currentTimeMs);
      }

      switch (type) {
        case 'play':
          markCapability('play');
          setPlaying(true);
          break;
        case 'pause':
          markCapability('pause');
          setPlaying(false);
          break;
        case 'ended':
          markCapability('ended');
          markCapability('pause');
          setPlaying(false);
          break;
        case 'seek':
          markCapability('seek');
          if (currentTimeMs != null) applyVideoTime(currentTimeMs);
          break;
        case 'time':
          markCapability('time');
          if (currentTimeMs != null) applyVideoTime(currentTimeMs);
          break;
        case 'reset':
          resetElapsed();
          setPlaying(false);
          break;
        default:
          break;
      }
    },
    [applyVideoTime, evaluateSupport, markCapability, resetElapsed, setPlaying],
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const onMessage = (event) => {
      const fromSynthesia = isSynthesiaOrigin(event.origin);
      const parsed = fromSynthesia ? parseSynthesiaMessage(event.data) : null;

      if (import.meta.env.DEV) {
        logPostMessageDev({
          origin: event.origin,
          data: event.data,
          parsed,
          fromSynthesia,
        });
      }

      if (fromSynthesia && parsed) handleIframeEvent(parsed);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [enabled, handleIframeEvent]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setTimeout(() => {
      setSyncMode((mode) => {
        if (mode !== 'detecting') return mode;
        return 'unsupported';
      });
    }, DETECTION_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => () => cancelRaf(), [cancelRaf]);

  const setLanguage = useCallback((lang) => {
    setSelectedLanguage(lang);
  }, []);

  const registerIframe = useCallback((node) => {
    iframeRef.current = node;
    if (node) probeSynthesiaPlayer(node);
  }, []);

  const activeCues =
    selectedLanguage === 'off' ? [] : cuesByLang[selectedLanguage] ?? [];

  const currentCaption =
    syncMode === 'supported' && selectedLanguage !== 'off'
      ? findCueAtTime(activeCues, elapsedTime)
      : null;

  return {
    elapsedTime,
    isPlaying,
    selectedLanguage,
    currentCaption,
    syncMode,
    capabilities,
    setLanguage,
    registerIframe,
  };
}
