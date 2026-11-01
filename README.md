# CTR Studio Open — Version 2.1

**Build your show. Then go live.**

CTR Studio Open is a free, local-first radio and DJ workspace from **Ground Xero Music Australia**. The current release is **Version 2.1**. It combines a persistent music library, assisted show building, a two-deck live desk with EQ and loops, microphone input, local recording, MIDI control, shuffle and repeat-safe automatic playback. Run it in the browser, or as a desktop app for Mac, Windows and Linux that also streams to Icecast and feeds an OBS overlay.

[Open the public website](https://ctr-studio-open.vercel.app/) · [Launch the studio](https://ctr-studio-open.vercel.app/studio.html) · [Download the desktop app](https://github.com/groundxeromusicau/ctr-studio-public/releases/latest)

## Why local-first?

Your imported audio remains in browser storage on your device. CTR Studio does not require an account or upload your music to a cloud library. After the application shell has been cached, the studio can reopen offline on supported browsers.

Browser storage is not a replacement for the original music files or a separate backup. Users can clear it through browser settings, private browsing is temporary, and storage policies vary between browsers.

## Open features

- Persistent on-device music library using IndexedDB
- Searchable, sortable and editable track collection with Music, ID, Promo and Sweeper tags
- Duplicate-aware folder/file import with progress, cancellation and storage checks
- Assisted Show Builder with configurable ID and promo spacing
- Saved show rundown with drag, touch controls, templates and runtime estimate
- Workstation settings/rundown backup and restore (audio remains local)
- Independent Deck A and Deck B playback
- Equal-power crossfader and master volume
- Guarded manual transitions that start the incoming deck
- Continuous overlapping Auto DJ playback
- Persistent shuffle, recent-track repeat protection and rundown randomisation
- Muted-by-default Program output gate, output meter and waveform previews
- Live microphone input
- Local master-output recording and supported output-device selection
- Session clock, keyboard shortcuts and now-playing information
- Installable progressive web application
- Offline application shell
- Responsive desktop and mobile layouts
- Three-band EQ (double-click a slider to reset) and loop on both decks; click a waveform to jump
- Silence alert after 10 seconds of dead air on Program; with Auto DJ on, the next track starts
- MIDI Learn for decks, loops, mix, crossfader, master, EQ, mic, Program, Auto DJ, record and visuals, with lit buttons that follow the studio
- Full-screen spectrum, wave and orbit visuals (V)

## Desktop app (Mac, Windows, Linux)

The same studio, plus what a browser can't do:

- **Go live:** stream the Program output to Icecast or SHOUTcast v2 in MP3 (LAME) or Opus/WebM, with now-playing metadata, listener counts and automatic reconnection. The password is kept with the system keychain.
- **OBS overlay:** a browser source at `http://127.0.0.1:4810/` with a now-playing lower third and an ON AIR bug, on a transparent background. It only listens on this computer.
- Your library and settings stay put between launches (the studio is served from its own `ctr://studio` address), it updates itself from GitHub releases, and it asks before quitting while you're on air.

Download it from [the latest release](https://github.com/groundxeromusicau/ctr-studio-public/releases/latest).

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

To run the desktop app from source:

```bash
npm start
```

To build it: `npm run package:mac`, `package:win` or `package:linux` (into `release/`). Releases: push a `v*` tag and the Desktop release workflow builds Windows and Linux into a draft release; `npm run release:mac` adds the signed and notarised Mac build; then publish the draft.

## Testing

```bash
npm test
```

The core tests cover show building, playback selection, MIDI, the silence alert and stream settings; the Icecast test runs the desktop app's source client against a stand-in server; the smoke test starts the local server, checks the health response, verifies the marketing and studio routes, and confirms required assets are available.

## Project layout

```text
.
├── main.js                         Desktop app: the ctr://studio window, permissions, updates
├── preload.js                      The studio's bridge to streaming and the overlay
├── desktop/                        Icecast source client and the OBS overlay server
├── server.js                       Vercel/server entry point
├── scripts/                        Startup and smoke-test scripts
├── src/
│   ├── backend/server.js           Local Express service
│   └── frontend/
│       ├── index.html              V2 public website
│       ├── studio.html             V2 studio application
│       ├── ctr-v2-site.css         Public website styles
│       ├── ctr-studio-v2.css       Studio styles
│       ├── studio-core.js          Tested show-building and playback selection logic
│       ├── ctr-studio-v2.js        Library, rundown, audio, and PWA logic
│       ├── ctr-open-tools.css      EQ, MIDI, streaming, overlay and visuals styles
│       ├── overlay/                The OBS overlay page
│       ├── vendor/lamejs/          MP3 encoder (LGPL-3.0), loaded only to stream MP3
│       ├── service-worker.js       Offline application shell
│       └── manifest.webmanifest    Install metadata
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── TRADEMARKS.md
└── LICENSE
```

## Third-party software

MP3 streaming uses [lamejs](https://github.com/breezystack/lamejs) (LGPL-3.0), shipped unmodified as its own file in `src/frontend/vendor/lamejs/` with its licence, and loaded only when you stream MP3, so it can be replaced with any compatible build.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request. Report vulnerabilities according to [SECURITY.md](SECURITY.md).

## Public and paid editions

This repository contains CTR Studio Open. CTR Studio Pro services, private infrastructure, and proprietary modules are not part of this repository or the public licence grant.

## Licence and trademarks

The source code is available under the [Mozilla Public License 2.0](LICENSE). Modifications to MPL-covered files must remain available under MPL 2.0 when distributed.

The source-code licence does not grant rights to the CTR Studio or CrazyTalkRadio names, logos, icons, or visual identity. See [TRADEMARKS.md](TRADEMARKS.md) before distributing a fork or branded service.

Copyright © 2026 Ground Xero Music Australia.
