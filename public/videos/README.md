# Demo video (Mode 2)

## Local development

Copy your Synthesia export here:

```
public/videos/demo.mp4
```

This repo’s `.gitignore` excludes `demo.mp4` because exports are often >100MB (GitHub limit).

A copy from your Desktop English export may already exist locally after setup.

## Render / production

GitHub will **not** include `demo.mp4`. Use one of:

1. **Environment variable** (recommended): upload MP4 to S3, Cloudflare R2, etc., then on Render set  
   `VITE_VIDEO_URL=https://…/your-video.mp4`  
   and redeploy.

2. **Visitor file picker**: open the site and use **Choose video file (MP4)** (stored in the browser for that session only).

## Match subtitles

Use the same video as your Synthesia embed (`AI Path EN`) so `en.vtt` / `fr.vtt` timings stay in sync.
