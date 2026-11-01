// An Icecast source client (also modern SHOUTcast v2, which takes the same HTTP
// source protocol): a long-lived chunked HTTP PUT to the mount with Basic Auth,
// fed the encoder's bytes as they arrive. Ported from CTR Studio Pro Next. One
// connection at a time; a dropped connection retries with backoff until the
// presenter disconnects. Listener counts come from the server's status-json.xsl.
const http = require('http');

const BACKOFF_MS = [2000, 5000, 15000, 30000];
const POLL_MS = 10000;

function createIcecast(onStatus) {
  let settings = null, password = '', request = null, wanted = false, attempt = 0, retryTimer = null, pollTimer = null;
  let status = { state: 'off', error: null, listeners: null, connectedAt: null };
  const set = patch => { status = { ...status, ...patch }; onStatus(status); };
  const auth = () => `Basic ${Buffer.from(`${settings.user}:${password}`).toString('base64')}`;
  const clearTimers = () => { clearTimeout(retryTimer); clearInterval(pollTimer); retryTimer = pollTimer = null; };

  function pollListeners() {
    const target = settings;
    const req = http.get({ hostname: target.host, port: target.port, path: '/status-json.xsl', timeout: 5000 }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const sources = JSON.parse(body).icestats?.source, list = Array.isArray(sources) ? sources : sources ? [sources] : [];
          const mine = list.find(source => source && (source.listenurl || '').endsWith(target.mount));
          if (mine && settings === target) set({ listeners: Number(mine.listeners) || 0 });
        } catch { /* no status page: listener counts are best-effort */ }
      });
    });
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
  }

  function retry() {
    if (!wanted) return;
    const delay = BACKOFF_MS[Math.min(attempt++, BACKOFF_MS.length - 1)];
    set({ state: 'reconnecting', listeners: null });
    retryTimer = setTimeout(open, delay);
  }

  function open() {
    clearTimers();
    set({ state: 'connecting', error: null });
    const req = http.request({
      hostname: settings.host, port: settings.port, path: settings.mount, method: 'PUT',
      headers: {
        Authorization: auth(),
        'Content-Type': settings.format === 'opus' ? 'audio/webm' : 'audio/mpeg',
        'ice-public': '0', 'ice-name': settings.name || 'CTR Studio Open', 'ice-genre': settings.genre, 'ice-audio-info': `bitrate=${settings.kbps}`,
        'Transfer-Encoding': 'chunked'
      }
    }, res => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        attempt = 0;
        set({ state: 'connected', connectedAt: Date.now(), error: null });
        pollListeners();
        pollTimer = setInterval(pollListeners, POLL_MS);
      } else {
        // A wrong password or a mount already in use won't fix itself: stop rather than retry.
        wanted = false;
        set({ state: 'error', error: res.statusCode === 401 ? 'The server refused the username or password' : res.statusCode === 403 ? 'That mount is already in use, or not allowed' : `The server answered ${res.statusCode}` });
        req.destroy();
      }
    });
    req.on('error', error => { if (request === req) request = null; set({ error: error.code === 'ECONNREFUSED' ? 'Nothing is listening at that address and port' : error.code === 'ENOTFOUND' ? 'That server address could not be found' : error.message }); retry(); });
    req.on('close', () => { if (request !== req) return; request = null; if (status.state === 'connected') retry(); });
    // Send the headers now: the first audio may be a moment away, and the server answers only once it has them.
    req.flushHeaders();
    request = req;
  }

  return {
    connect(next, secret) { this.disconnect(); settings = next; password = secret || ''; wanted = true; attempt = 0; open(); },
    disconnect() { wanted = false; clearTimers(); const req = request; request = null; req?.destroy(); set({ state: 'off', error: null, listeners: null, connectedAt: null }); },
    // Never throws: a slow or closed connection drops audio rather than disturbing playback.
    write(bytes) { if (request && status.state === 'connected') { try { request.write(bytes); } catch { /* the close handler reconnects */ } } },
    metadata(text) {
      if (!settings || status.state !== 'connected' || settings.format === 'opus') return;
      const query = new URLSearchParams({ mode: 'updinfo', mount: settings.mount, song: String(text).slice(0, 200) });
      const req = http.get({ hostname: settings.host, port: settings.port, path: `/admin/metadata?${query}`, headers: { Authorization: auth() }, timeout: 5000 }, res => res.resume());
      req.on('error', () => {});
      req.on('timeout', () => req.destroy());
    },
    status: () => status
  };
}

module.exports = { createIcecast };
