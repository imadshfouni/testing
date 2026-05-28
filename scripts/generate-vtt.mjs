import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { srtToVtt } from '../src/utils/srtToVtt.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  ['public/subtitles/en.srt', 'public/subtitles/en.vtt'],
  ['public/subtitles/fr.srt', 'public/subtitles/fr.vtt'],
];

for (const [srtPath, vttPath] of pairs) {
  const srt = readFileSync(join(root, srtPath), 'utf8');
  writeFileSync(join(root, vttPath), srtToVtt(srt), 'utf8');
  console.log(`Wrote ${vttPath}`);
}
