const SYNTHESIA_ORIGIN_PREFIXES = [
  'https://share.synthesia.io',
  'https://app.synthesia.io',
  'https://synthesia.io',
];

/**
 * Synthesia does not document a public embed postMessage API.
 * Automatic overlay sync is only possible if the iframe emits player events.
 *
 * @typedef {'play' | 'pause' | 'time' | 'ended' | 'seek' | 'reset' | 'unknown'} PlayerEventType
 * @typedef {{ type: PlayerEventType, currentTimeMs?: number, raw: unknown }} ParsedPlayerMessage
 */

export function isSynthesiaOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  return SYNTHESIA_ORIGIN_PREFIXES.some(
    (prefix) => origin === prefix || origin.startsWith(`${prefix}/`),
  );
}

function toMs(value) {
  if (value == null || Number.isNaN(Number(value))) return undefined;
  const n = Number(value);
  if (n < 0) return undefined;
  return n > 10_000 ? n : n * 1000;
}

function pickTimeMs(obj) {
  const candidates = [
    obj.currentTime,
    obj.current_time,
    obj.time,
    obj.position,
    obj.playhead,
    obj.value,
    obj.data?.currentTime,
    obj.data?.time,
    obj.payload?.currentTime,
    obj.payload?.time,
  ];
  for (const c of candidates) {
    const ms = toMs(c);
    if (ms != null) return ms;
  }
  return undefined;
}

function normalizeEventName(value) {
  if (value == null) return '';
  return String(value).toLowerCase().replace(/[_-]/g, '');
}

function inferEventType(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const names = [
    payload.type,
    payload.event,
    payload.action,
    payload.method,
    payload.name,
    payload.message,
    payload.data?.type,
    payload.data?.event,
  ]
    .filter(Boolean)
    .map(normalizeEventName);

  const joined = names.join(' ');

  if (/play|playing|started|resume/.test(joined) && !/pause/.test(joined)) {
    return 'play';
  }
  if (/pause|paused|waiting/.test(joined)) {
    return 'pause';
  }
  if (/ended|complete|finish/.test(joined)) {
    return 'ended';
  }
  if (/seek|seeked|jump|scrub/.test(joined)) {
    return 'seek';
  }
  if (/reset|restart|replay/.test(joined)) {
    return 'reset';
  }
  if (/time|progress|tick|update|timeupdate/.test(joined)) {
    return 'time';
  }

  return null;
}

export function parseSynthesiaMessage(data) {
  let payload = data;

  if (typeof data === 'string') {
    try {
      payload = JSON.parse(data);
    } catch {
      const lowered = data.toLowerCase();
      if (lowered.includes('play')) return { type: 'play', raw: data };
      if (lowered.includes('pause')) return { type: 'pause', raw: data };
      return null;
    }
  }

  if (!payload || typeof payload !== 'object') return null;

  const eventType = inferEventType(payload);
  const currentTimeMs = pickTimeMs(payload);

  if (eventType) {
    return { type: eventType, currentTimeMs, raw: payload };
  }

  if (currentTimeMs != null) {
    return { type: 'time', currentTimeMs, raw: payload };
  }

  return { type: 'unknown', raw: payload };
}

export function isUsablePlayerEvent(parsed) {
  return parsed != null && parsed.type !== 'unknown';
}

/**
 * Log every message from Synthesia origins in development (for API discovery).
 */
export function logPostMessageDev({ origin, data, parsed }) {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed('[Synthesia iframe message]', origin);
  console.log('raw:', data);
  console.log('parsed:', parsed ?? '(not a recognized player event)');
  console.groupEnd();
}

/**
 * Optional probes (player.js-style). Harmless if unsupported.
 */
export function probeSynthesiaPlayer(iframe) {
  if (!iframe?.contentWindow) return;
  const target = 'https://share.synthesia.io';
  const probes = [
    { context: 'player.js', method: 'addEventListener', value: 'play' },
    { context: 'player.js', method: 'addEventListener', value: 'pause' },
    { context: 'player.js', method: 'addEventListener', value: 'timeupdate' },
    { type: 'listening' },
  ];
  for (const msg of probes) {
    try {
      iframe.contentWindow.postMessage(msg, target);
    } catch {
      /* cross-origin — postMessage may still queue */
    }
  }
  if (import.meta.env.DEV) {
    console.info('[Synthesia] Sent postMessage probes to iframe (dev only).');
  }
}
