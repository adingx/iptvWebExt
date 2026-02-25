# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IPTV Player is a lightweight Chrome/Edge browser extension for importing M3U playlists and playing M3U8 live streams. Built with Vanilla JavaScript ES6+, no frameworks, following Manifest V3 specifications.

**Key Technologies**: Chrome Extension Manifest V3, HLS.js (CDN), chrome.storage.local, ES6 Modules

---

## Installation & Loading

**No build process required** - this is a vanilla JavaScript extension.

### Loading for Development
1. Open Chrome/Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project root directory

**Important**: The extension requires PNG icon files (16x16, 48x48, 128x128) in `icons/` directory. Only `icon.svg` is provided. Convert using online tools or image editing software before loading.

### After Code Changes
- Go to `chrome://extensions/`
- Click the reload icon 🔄 on the extension card
- For service-worker changes, also click "Service worker" link → "Stop" → "Restart"

---

## Architecture

### Module System
All JavaScript files use **ES6 modules** (`export`/`import`). HTML files use `<script type="module">`. This is critical - modules cannot be loaded as regular scripts.

### Shared Layer
`src/shared/` contains modules imported by multiple pages:
- **constants.js**: Storage keys, default settings, configuration values
- **storage.js**: Wrapper around chrome.storage.local with error handling
- **m3u-parser.js**: Parses M3U files, extracts #EXTINF attributes

### Data Flow
```
M3U Import → FileReader → parseM3U() → deduplicate by URL → saveChannels()
Channel Click → chrome.tabs.create(player.html?id=X) → loadChannel() → HLS.js
```

### Storage Schema
- **channels**: Array of channel objects (id, name, url, group, logo, tvgId, tvgName)
- **history**: Array of channels (max 50, newest first, deduplicated by url)
- **settings**: Object {defaultQuality, autoPlay, volume}

### Critical Design Decisions
1. **Channel ID generation**: Hash-based from URL using `generateIdFromUrl()` in m3u-parser.js
2. **History deduplication**: By URL (not ID), keeps newest at front via `unshift()`
3. **Import behavior**: Merges with existing channels, skips duplicates by URL
4. **Player URL**: Uses `chrome.runtime.getURL()` since player.html is in `web_accessible_resources`

---

## File-by-File Notes

### manifest.json
- CSP restricts scripts to `'self'` only - no inline scripts or external JS except HLS.js CDN
- `player.html` must be in `web_accessible_resources` to allow navigation
- Icons reference paths that must exist before loading

### src/shared/storage.js
All chrome.storage calls wrapped in try-catch. Functions throw errors if API unavailable - calling code should not catch, let errors propagate.

### src/player/player.js
- HLS.js loaded from CDN: `https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js`
- Checks `Hls.isSupported()` first, falls back to native HLS (Safari)
- Channel switching wraps around (last → first, first → last)

### src/background/service-worker.js
- Runs in background context, no DOM access
- Creates context menu on install
- Validates m3u8 URLs before creating temporary channels

### CSS Architecture
- No CSS framework - vanilla CSS with Flexbox
- Color scheme: #4285f4 (accent), #ffffff/#333333 (light mode), #000000 (player dark mode)
- Popup: 400x600px fixed size
- Player: 100vw × 100vh fullscreen

---

## Common Development Tasks

### Adding New Storage Fields
1. Add key to `STORAGE_KEYS` in `src/shared/constants.js`
2. Update storage.js wrapper functions if needed
3. Update DEFAULT_SETTINGS if applicable

### Modifying M3U Parser
- Located in `src/shared/m3u-parser.js`
- Uses regex to extract attributes from #EXTINF line
- Format: `#EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",ChannelName`

### Debugging Storage
Open DevTools Console while on popup/options pages and use:
```javascript
chrome.storage.local.get(null).then(console.log)
```

For service worker, go to `chrome://extensions/` → "Service worker" link to open its DevTools.

---

## Known Limitations & TODO

See `memory-bank/progress.md` for full status. Optional optimizations not yet implemented:
- Virtual scrolling for >100 channels
- Image lazy loading for channel logos
- Unified error logging system

---

## Browser Compatibility

- **Chrome 88+**, **Edge 88+** (Chromium-based)
- Firefox/Safari not supported (different extension APIs)
