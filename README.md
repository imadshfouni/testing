# Subtitle Sync Demo

React + Vite demo comparing **Synthesia iframe** subtitles vs **native MP4 + WebVTT**.

## Two modes

### Mode 1 — Synthesia iframe (experimental auto-sync)

1. Choose **English**, **French**, or **Off**.
2. Press **play on the Synthesia video** (inside the iframe).
3. Captions start **only if** the iframe sends `postMessage` events (`play`, `pause`, `seek`, `timeupdate`, etc.).

There is **no** “Play Captions” button. External JavaScript cannot see iframe play/pause clicks unless Synthesia posts events to the parent window.

If no usable timing events are detected:

> This Synthesia iframe does not expose video timing events, so external subtitles cannot be synced automatically from outside the iframe.

**Development:** every message from Synthesia origins is logged as `[Synthesia iframe message]` in the console.

### Mode 2 — Native MP4 + `<track>` (100% sync)

Uses a normal `<video>` element and WebVTT:

```html
<video controls>
  <source src="/videos/demo.mp4" type="video/mp4" />
  <track src="/subtitles/en.vtt" kind="subtitles" srclang="en" label="English" />
  <track src="/subtitles/fr.vtt" kind="subtitles" srclang="fr" label="French" />
</video>
```

Play, pause, and seek are handled by the browser — fully automatic.

**Required:** add your export at `public/videos/demo.mp4` (same video as the Synthesia embed so timestamps match).

VTT files are generated from SRT:

```bash
npm run generate-vtt
```

(runs automatically before `dev` and `build`)

## Run locally

```bash
npm install
npm run dev
```

## Subtitle files

| Language | SRT (overlay / source) | WebVTT (native `<track>`) |
|----------|------------------------|---------------------------|
| English | `public/subtitles/en.srt` | `public/subtitles/en.vtt` |
| French | `public/subtitles/fr.srt` | `public/subtitles/fr.vtt` |

## Synthesia embed

Update the iframe `src` in `src/components/SynthesiaPlayer.jsx`.

## Deploy on Render (Static Site)

| Setting | Value |
|---------|--------|
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

Include `demo.mp4` in the repo or deploy pipeline if you need Mode 2 in production.

## Project structure

```
src/App.jsx
src/components/SynthesiaPlayer.jsx   # Mode 1
src/components/NativeVideoPlayer.jsx # Mode 2
src/hooks/useSubtitleSync.js         # iframe postMessage sync only
src/utils/parseSrt.js
src/utils/srtToVtt.js
src/utils/synthesiaPostMessage.js
public/subtitles/*.srt, *.vtt
public/videos/demo.mp4               # you provide
```

## Recommendation

- **Guaranteed subtitles:** Mode 2 (MP4 + WebVTT).
- **Synthesia embed:** Mode 1 only if console shows usable `postMessage` player events; otherwise use Mode 2 or host video without iframe overlay.
