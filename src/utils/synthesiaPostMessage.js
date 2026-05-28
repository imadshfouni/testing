const SYNTHESIA_ORIGIN_PREFIXES = [
  'https://share.synthesia.io',
  'https://app.synthesia.io',
  'https://synthesia.io',
];

/**
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
  // Heuristic: values under 10_000 are usually seconds (e.g. 125.4)
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
  if (/seek|seeked|jump/.test(joined)) {
    return 'seek';
  }
  if (/reset|restart|replay/.test(joined)) {
    return 'reset';
  }
  if (/time|progress|tick|update/.test(joined)) {
    return 'time';
  }

  return null;
}

/**
 * Attempt to parse a postMessage payload from a Synthesia (or compatible) embed.
 * Returns null if nothing recognizable.
 */
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
 * Development-only logging for iframe postMessage inspection.
 */
export function logPostMessageDev({ origin, data, parsed }) {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed('[Synthesia postMessage]', origin);
  console.log('raw data:', data);
  if (parsed) console.log('parsed:', parsed);
  else console.log('parsed: (none)');
  console.groupEnd();
}
