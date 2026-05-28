import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_PATH = '/videos/demo.mp4';
const envUrl = import.meta.env.VITE_VIDEO_URL?.trim();

/**
 * Resolve demo MP4: env URL → public file → user-selected local file (blob URL).
 */
export function useDemoVideo() {
  const [status, setStatus] = useState('checking'); // checking | ready | missing
  const [videoSrc, setVideoSrc] = useState(envUrl || DEFAULT_PATH);
  const blobRef = useRef(null);

  const checkUrl = useCallback(async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setStatus('checking');

      if (envUrl) {
        const ok = await checkUrl(envUrl);
        if (!cancelled) {
          setVideoSrc(envUrl);
          setStatus(ok ? 'ready' : 'missing');
        }
        return;
      }

      const ok = await checkUrl(DEFAULT_PATH);
      if (!cancelled) {
        setVideoSrc(DEFAULT_PATH);
        setStatus(ok ? 'ready' : 'missing');
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [checkUrl]);

  const loadLocalFile = useCallback((file) => {
    if (!file?.type?.startsWith('video/')) return false;
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const url = URL.createObjectURL(file);
    blobRef.current = url;
    setVideoSrc(url);
    setStatus('ready');
    return true;
  }, []);

  useEffect(
    () => () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    },
    [],
  );

  return { videoSrc, status, loadLocalFile, defaultPath: DEFAULT_PATH };
}
