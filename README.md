# Hero TV (React Web Edition)

Hero TV is a modern, high-performance IPTV and media stream player rewritten from Android to React + TypeScript + Vite.

## Features

- **Multi-Protocol IPTV Connections**:
  - **Extrême IPTV (Xtream Codes API)**: Connexion via Host/Serveur, Username, Password avec validation automatique, date d'expiration et statut du compte.
  - **Playlists M3U / M3U8**: URL en ligne ou import direct de fichier local `.m3u` / `.m3u8` avec détection automatique des logos et catégories.
  - **Portails Stalker (MAG Middleware)**: Connexion via URL de portail et adresse MAC (`00:1A:79:XX:XX:XX`) avec générateur d'adresse MAC intégré.
  - **Flux direct**: Lecture immédiate de liens HLS `.m3u8`, MP4, MKV avec User-Agent personnalisable.
- **Export Links by Category (Chaînes, Films, Séries)**:
  - Export stream URLs categorized by channels, movies (VOD), and TV series.
  - Export formats: M3U/M3U8 playlist, structured JSON, Markdown/Text list, and CSV.
  - Copy directly to clipboard or download files with one click.
  - Filter exports by individual category or export all.
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

## GitHub Actions Workflows

Configured in `.github/workflows/`:

- **Build Android APK** (`.github/workflows/build-apk.yml`):
  - Automates building the Android APK (`hero-tv-debug.apk`) using Capacitor and Gradle.
  - Automatically runs on push to `main` or manually via the "Run workflow" button.
  - Uploads the installable APK file to GitHub Actions Artifacts (`Hero-TV-APK`).
- **CI - Build & Test** (`.github/workflows/ci.yml`):
  - Runs on push / PR to `main` or `master`.
  - Installs dependencies and verifies TypeScript compilation and production build.
  - Uploads compiled production artifacts (`dist/`).

## Getting Started

```bash
npm install
npm run dev
```

App runs on `http://0.0.0.0:3000`.
