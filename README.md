# CTR Studio Open — Version 2.0 Alpha

**Build your show. Then go live.**

CTR Studio Open is a free, local-first radio and DJ workspace from **Ground Xero Music Australia**. The current release is **Version 2.0 Alpha 3**. It combines a persistent music library, show rundown, two-deck live desk, microphone input, shuffle playback, and automatic playback in an installable web application.

[Open the public website](https://crazytalkradio-studio.vercel.app/) · [Launch the studio](https://crazytalkradio-studio.vercel.app/studio.html)

## Why local-first?

Your imported audio remains in browser storage on your device. CTR Studio does not require an account or upload your music to a cloud library. After the application shell has been cached, the studio can reopen offline on supported browsers.

Browser storage is not a replacement for the original music files or a separate backup. Users can clear it through browser settings, private browsing is temporary, and storage policies vary between browsers.

## Open features

- Persistent on-device music library using IndexedDB
- Searchable and sortable track collection
- Saved show rundown with drag ordering and runtime estimate
- Independent Deck A and Deck B playback
- Equal-power crossfader and master volume
- One-button automatic transitions
- Continuous Auto DJ playback
- Persistent shuffle playback and one-click rundown randomisation
- Live microphone input
- Session clock and now-playing information
- Installable progressive web application
- Offline application shell
- Responsive desktop and mobile layouts

## Quick start

### Requirements

- Node.js 18 or newer
- npm
- A Chromium-based browser is recommended for the complete install experience

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run the Electron wrapper:

```bash
npm start
```

## Testing

```bash
npm test
```

The smoke test starts the local server, checks the V2 health response, verifies the marketing and studio routes, and confirms required PWA assets are available.

## Project layout

```text
.
├── main.js                         Electron launcher
├── server.js                       Vercel/server entry point
├── scripts/                        Startup and smoke-test scripts
├── src/
│   ├── backend/server.js           Local Express service
│   └── frontend/
│       ├── index.html              V2 public website
│       ├── studio.html             V2 studio application
│       ├── ctr-v2-site.css         Public website styles
│       ├── ctr-studio-v2.css       Studio styles
│       ├── ctr-studio-v2.js        Library, rundown, audio, and PWA logic
│       ├── service-worker.js       Offline application shell
│       └── manifest.webmanifest    Install metadata
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── TRADEMARKS.md
└── LICENSE
```

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request. Report vulnerabilities according to [SECURITY.md](SECURITY.md).

## Public and paid editions

This repository contains CTR Studio Open. CTR Studio Pro services, private infrastructure, and proprietary modules are not part of this repository or the public licence grant.

## Licence and trademarks

The source code is available under the [Mozilla Public License 2.0](LICENSE). Modifications to MPL-covered files must remain available under MPL 2.0 when distributed.

The source-code licence does not grant rights to the CTR Studio or CrazyTalkRadio names, logos, icons, or visual identity. See [TRADEMARKS.md](TRADEMARKS.md) before distributing a fork or branded service.

Copyright © 2026 Ground Xero Music Australia.
