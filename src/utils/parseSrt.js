/**
 * Parse an SRT timestamp (HH:MM:SS,mmm) to milliseconds.
 */
export function parseSrtTimestamp(timestamp) {
  const trimmed = timestamp.trim();
  const [timePart, msPart] = trimmed.split(',');
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  const ms = Number(msPart ?? 0);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
}

/**
 * Parse SRT file content into cue objects: { start, end, text } (times in ms).
 */
export function parseSrt(content) {
  if (!content || !String(content).trim()) {
    return [];
  }

  const normalized = String(content).replace(/\r\n/g, '\n').trim();
  const blocks = normalized.split(/\n\n+/);
  const cues = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trimEnd());
    if (lines.length < 2) continue;

    const arrowIndex = lines.findIndex((line) => line.includes('-->'));
    if (arrowIndex === -1) continue;

    const [startRaw, endRaw] = lines[arrowIndex].split('-->').map((s) => s.trim());
    const start = parseSrtTimestamp(startRaw);
    const end = parseSrtTimestamp(endRaw);
    const text = lines
      .slice(arrowIndex + 1)
      .join('\n')
      .trim();

    if (text && end > start) {
      cues.push({ start, end, text });
    }
  }

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Return the active cue at a given playback time (ms), or null.
 */
export function findCueAtTime(cues, timeMs) {
  if (!cues?.length || timeMs < 0) return null;
  return cues.find((cue) => timeMs >= cue.start && timeMs < cue.end) ?? null;
}
