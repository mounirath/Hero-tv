# Hero TV (React Web Edition)

Hero TV is a modern, high-performance IPTV and media stream player rewritten from Android to React + TypeScript + Vite.

## Features

- **Stream & Playlist Management**:
  - Add individual stream URLs (HLS `.m3u8`, MP4, WebM, etc.) or full M3U/M3U8 IPTV playlists.
  - Custom User-Agent support for streams that require specific player headers.
  - Automatic parsing of M3U playlists with channel metadata, categories, and channel logos.
  - Category filtering tabs and 3-column channel grid.
- **Full Player Experience**:
  - HLS.js adaptive bitrate streaming.
  - Immersive fullscreen controls with auto-hide after 5 seconds.
  - Large centered Play / Pause control.
  - Seeking, duration, repeat/loop mode, and live badge indicators.
  - Aspect ratio toggle: FIT, FILL, 16:9, and 4:3 modes.
  - Playback settings: Speed (0.5x, 1x, 1.25x, 1.5x, 2x, 5x) and Quality selection (Auto, Medium, Low).
  - WebVTT subtitles support.
- **Theme & Settings**:
  - Light and Dark mode toggle.
  - Notifications and Auto-play preferences saved locally.
- **External Stream Support**:
  - Deep-linkable playback via query parameters: `?url=...&title=...&ua=...&autoplay=true`.

## Getting Started

```bash
npm install
npm run dev
```

App runs on `http://0.0.0.0:3000`.
