const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const port = 3917;
const server = spawn(process.execPath, [path.join('src', 'backend', 'server.js')], {
  cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
server.stderr.on('data', chunk => { output += chunk; });

function request(target) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: target }, response => {
      let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve({ status: response.statusCode, body, type: response.headers['content-type'] || '' }));
    }); req.on('error', reject);
  });
}
function expect(value, message) { if (!value) throw new Error(message); }

async function run() {
  for (let attempt = 0; attempt < 30; attempt++) { try { await request('/api/health'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  const health = await request('/api/health'); expect(health.status === 200, 'health endpoint failed'); expect(JSON.parse(health.body).product === 'CTR Studio V2 Public', 'wrong product identity');
  const home = await request('/'); expect(home.status === 200, 'home page failed'); expect(home.body.includes('<title>CTR Studio V2 — Build Your Show. Go Live.</title>'), 'V2 website title missing');
  const studio = await request('/studio.html'); expect(studio.status === 200, 'studio page failed'); expect(studio.body.includes('<title>CTR Studio V2 Public</title>'), 'V2 studio title missing');
  for (const asset of ['/ctr-v2-site.css', '/ctr-studio-v2.css', '/ctr-studio-v2.js', '/service-worker.js', '/ctr-icon.svg', '/manifest.webmanifest']) { const response = await request(asset); expect(response.status === 200, `${asset} failed`); }
  const unknown = await request('/not-a-v2-asset.js'); expect(unknown.body.includes('<title>CTR Studio V2 — Build Your Show. Go Live.</title>'), 'unknown routes should return the V2 website');
  console.log('CTR Studio V2 Public smoke test passed');
}

run().catch(error => { console.error(error.message); if (output) console.error(output); process.exitCode = 1; }).finally(() => server.kill('SIGTERM'));
