// The OBS overlay: a browser source at http://127.0.0.1:<port>/ showing what's on
// air. Local only (it never listens beyond this computer); the studio pushes the
// now-playing state in, and the overlay page polls /now.json once a second.
const fs = require('fs');
const http = require('http');
const path = require('path');

const FIRST_PORT = 4810;
const PAGES = { '/': 'index.html', '/overlay.css': 'overlay.css', '/overlay.js': 'overlay.js' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

function startOverlay(folder) {
  let now = { onAir: false, title: '', artist: '', show: '', lowerThird: true, bug: true, updated: 0 };
  const server = http.createServer((req, res) => {
    const route = new URL(req.url, 'http://overlay').pathname;
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'" };
    if (req.method !== 'GET') { res.writeHead(405, headers); return res.end(); }
    if (route === '/now.json') { res.writeHead(200, { ...headers, 'Content-Type': 'application/json' }); return res.end(JSON.stringify(now)); }
    const page = PAGES[route];
    if (!page) { res.writeHead(404, headers); return res.end('Not found'); }
    res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(page)] });
    fs.createReadStream(path.join(folder, page)).pipe(res);
  });
  let port = FIRST_PORT;
  const ready = new Promise(resolve => {
    // Another app may hold the port: try the next few, then give up quietly.
    server.on('error', () => { if (++port < FIRST_PORT + 10) server.listen(port, '127.0.0.1'); else resolve(null); });
    server.on('listening', () => resolve(`http://127.0.0.1:${port}/`));
    server.listen(port, '127.0.0.1');
  });
  return {
    url: () => ready,
    update(value = {}) {
      const text = (v, n) => String(v ?? '').slice(0, n);
      now = { onAir: Boolean(value.onAir), title: text(value.title, 160), artist: text(value.artist, 160), show: text(value.show, 80), lowerThird: value.lowerThird !== false, bug: value.bug !== false, updated: Date.now() };
    },
    close: () => server.close()
  };
}

module.exports = { startOverlay };
