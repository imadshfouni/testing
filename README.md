# Synthesia Subtitle Demo

A frontend-only React + Vite demo for testing custom subtitle overlays on embedded Synthesia videos.

Synthesia plays inside a cross-origin **iframe**, so you cannot attach native HTML `<track>` elements to that player. This app loads `.srt` files, parses them in JavaScript, and renders timed captions in an overlay on top of the video container. If you later switch to a direct **MP4** with a normal `<video>` tag, you can use native `<track kind="subtitles">` instead.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build & preview production bundle

```bash
npm run build
npm run preview
```

## Synthesia embed code

The embed lives in **`src/App.jsx`**.

1. Open `src/App.jsx`.
2. Find the constant `SYNTHESIA_EMBED_SRC` and/or the `<iframe>` block inside `.video-container`.
3. Replace the `src` URL with your Synthesia share embed URL from the embed snippet.

Example embed HTML from Synthesia:

```html
<div style="position: relative; overflow: hidden; aspect-ratio: 1920/1080">
  <iframe
    src="https://share.synthesia.io/embeds/videos/YOUR-VIDEO-ID"
    ...
  ></iframe>
</div>
```

In this project, only the iframe `src` (and optional `title`) need to be updated; the responsive 16:9 wrapper is already handled by `.video-container` in CSS.

## Subtitle files

Place SRT files here:

| File | Path |
|------|------|
| English | `public/subtitles/en.srt` |
| French | `public/subtitles/fr.srt` |

They are served at `/subtitles/en.srt` and `/subtitles/fr.srt` and fetched on page load.

To replace subtitles, overwrite those files and refresh the app (no code changes required unless you add more languages).

## Caption sync (two levels)

### Level 1 — iframe `postMessage` (automatic when available)

The app listens for `window.postMessage` events from `share.synthesia.io` (and related Synthesia origins). If the embed sends play, pause, time, or seek payloads, captions sync automatically.

In **development**, open the browser console to inspect logged messages:

```
[Synthesia postMessage] https://share.synthesia.io
```

Synthesia does **not** document a public embed player API today. If nothing useful appears in the console, Level 2 is used.

### Level 2 — external controls (fallback)

If no usable iframe events are detected within ~4 seconds, the UI shows **Play Captions**, **Pause Captions**, and **Reset Captions** directly under the video, with an honest notice that the iframe does not expose playback to parent JavaScript.

| Control | Behavior |
|---------|----------|
| **English / French / Off** | Switch track; **same timestamp** is kept |
| **Off** | Hides overlay; timer keeps running unless paused |
| **Play Captions** | Start / resume timer (`performance.now()` + `requestAnimationFrame`) |
| **Pause Captions** | Pause timer; elapsed time preserved |
| **Reset Captions** | Back to `00:00.00` and paused |

We do **not** claim 100% automatic sync unless real Synthesia iframe events are detected.

## Deploy on Render (Static Site)

1. Push this repository to GitHub.
2. In [Render](https://render.com), create a **Static Site** connected to the repo.
3. Use these settings:

| Setting | Value |
|---------|--------|
| **Build command** | `npm install && npm run build` |
| **Publish directory** | `dist` |

4. Deploy. Render will serve the built files from `dist`.

`package.json` includes `"preview": "vite preview --host 0.0.0.0"` for local production checks; Render uses the static `dist` output from `npm run build`.

### Optional: `render.yaml`

You can add a Blueprint file at the repo root if you use Render’s YAML config; the manual Static Site settings above are sufficient.

## Project structure

```
public/subtitles/en.srt   # English cues
public/subtitles/fr.srt   # French cues
src/App.jsx                      # UI, iframe, overlay, controls
src/App.css                      # Layout & subtitle styling
src/hooks/useSubtitleSync.js     # Timer + iframe postMessage sync
src/utils/parseSrt.js            # SRT parser
src/utils/synthesiaPostMessage.js # postMessage parsing & dev logging
```

## Tech stack

- React 19
- Vite 8
- No backend

## License

MIT (or your choice — add a LICENSE file if needed).
