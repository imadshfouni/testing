import { parseSrt } from './parseSrt.js';

/** Format milliseconds as WebVTT timestamp `HH:MM:SS.mmm` */
export function formatVttTimestamp(ms) {
  const clamped = Math.max(0, ms);
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const millis = clamped % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Convert SRT file content to WebVTT for native <track> elements.
 */
export function srtToVtt(srtContent) {
  const cues = parseSrt(srtContent);
  const lines = ['WEBVTT', ''];

  for (const cue of cues) {
    lines.push(
      `${formatVttTimestamp(cue.start)} --> ${formatVttTimestamp(cue.end)}`,
      cue.text,
      '',
    );
  }

  return `${lines.join('\n')}\n`;
}
