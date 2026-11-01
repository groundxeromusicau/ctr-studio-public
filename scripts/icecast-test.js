// The desktop app's Icecast source client against a stand-in Icecast server.
const { strict: assert } = require('node:assert');
const http = require('node:http');
const { createIcecast } = require('../desktop/icecast');

const wait = (check, ms = 3000) => new Promise((resolve, reject) => { const start = Date.now(); const tick = () => { if (check()) return resolve(); if (Date.now() - start > ms) return reject(new Error('timed out')); setTimeout(tick, 20); }; tick(); });

async function run() {
  const received = [], metadata = [];
  let sockets = [];
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/admin/metadata')) { metadata.push(new URL(req.url, 'http://x').searchParams.get('song')); return res.end('ok'); }
    if (req.url === '/status-json.xsl') return res.end(JSON.stringify({ icestats: { source: { listenurl: 'http://x/live', listeners: 3 } } }));
    if (req.method !== 'PUT' || req.headers.authorization !== `Basic ${Buffer.from('source:hackme').toString('base64')}`) { res.writeHead(401); return res.end(); }
    assert.equal(req.headers['content-type'], 'audio/mpeg');
    res.writeHead(200); res.flushHeaders();
    req.on('data', chunk => received.push(...chunk));
  });
  server.on('connection', socket => sockets.push(socket));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const settings = { host: '127.0.0.1', port: server.address().port, mount: '/live', user: 'source', format: 'mp3', kbps: 128, name: 'Test', genre: '' };
  const states = [];
  const icecast = createIcecast(status => states.push(status));

  icecast.connect(settings, 'hackme');
  await wait(() => icecast.status().state === 'connected');
  icecast.write(Buffer.from([1, 2, 3]));
  await wait(() => received.length === 3);
  assert.deepEqual(received, [1, 2, 3], 'audio reaches the mount');
  await wait(() => icecast.status().listeners === 3);
  icecast.metadata('Artist - Title');
  await wait(() => metadata.length === 1);
  assert.equal(metadata[0], 'Artist - Title', 'now playing reaches the server');

  // The server drops the connection: the client comes back on its own.
  sockets.forEach(socket => socket.destroy()); sockets = [];
  await wait(() => icecast.status().state === 'reconnecting');
  await wait(() => icecast.status().state === 'connected', 6000);

  icecast.disconnect();
  assert.equal(icecast.status().state, 'off');

  icecast.connect(settings, 'wrong');
  await wait(() => icecast.status().state === 'error');
  assert.equal(icecast.status().error, 'The server refused the username or password');
  await new Promise(resolve => setTimeout(resolve, 2500));
  assert.equal(icecast.status().state, 'error', 'a refused password is not retried');

  server.close(); sockets.forEach(socket => socket.destroy());
  console.log('CTR Studio Open Icecast client tests passed');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
