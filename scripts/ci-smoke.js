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
  const health = await request('/api/health'); expect(health.status === 200, 'health endpoint failed'); const identity = JSON.parse(health.body); expect(identity.product === 'CTR Studio Open', 'wrong product identity'); expect(identity.version === '2.0.0-alpha.3', 'wrong Open release version');
  const home = await request('/'); expect(home.status === 200, 'home page failed'); expect(home.body.includes('<title>CTR Studio Open — Build Your Show. Go Live.</title>'), 'Open website title missing'); expect(home.body.includes('OPEN · VERSION 2.0 ALPHA 3'), 'Open version badge missing');
  expect(home.body.includes('id="v3"'), 'V3 preview teaser missing'); expect(home.body.includes('crazytalkradio-studio-restrictedmusic-rickie-drayton-s-projects.vercel.app/login?next=/studio'), 'stable V3 login link missing'); expect(home.body.includes('INVITE-ONLY TESTING'), 'V3 access expectation missing');
  const studio = await request('/studio.html'); expect(studio.status === 200, 'studio page failed'); expect(studio.body.includes('<title>CTR Studio Open</title>'), 'Open studio title missing'); expect(studio.body.includes('V2.0 · ALPHA 3'), 'Open build version missing'); expect(studio.body.includes('id="shuffleBtn"') && studio.body.includes('id="shuffleQueueBtn"'), 'Open shuffle controls missing');
  expect(studio.body.includes('id="importProgress"') && studio.body.includes('role="progressbar"'), 'accessible import progress UI missing'); expect(studio.body.includes('id="audioInput" type="file" multiple') && !studio.body.includes('accept="audio/*"'), 'mobile-safe Files audio picker missing'); expect(studio.body.includes('PHONE · CHOOSE BROWSE / FILES'), 'mobile Files picker guidance missing'); expect(studio.body.includes('id="folderInput" type="file" webkitdirectory directory multiple') && studio.body.includes('id="importFolderBtn"'), 'folder audio import picker missing'); expect(studio.body.includes('id="selectAllBtn"') && studio.body.includes('id="addSelectedBtn"'), 'bulk rundown controls missing');
  const studioScript = await request('/ctr-studio-v2.js'); expect(studioScript.body.includes("'Reading metadata'") && studioScript.body.includes("'Saving on this device'"), 'per-track import phases missing'); expect(studioScript.body.includes('AUDIO_FILE_EXTENSION.test(file.name)'), 'mobile audio extension fallback missing'); expect(studioScript.body.includes('toggleSelectAll') && studioScript.body.includes('addSelectedToQueue') && studioScript.body.includes("$('folderInput')"), 'folder import or bulk rundown engine missing'); expect(studioScript.body.includes("'ctr-v2-shuffle'") && studioScript.body.includes('Math.random() * candidates.length'), 'Open shuffle selection missing');
  for (const asset of ['/ctr-v2-site.css', '/ctr-studio-v2.css', '/ctr-shuffle.css', '/ctr-studio-v2.js', '/service-worker.js', '/ctr-icon.svg', '/manifest.webmanifest']) { const response = await request(asset); expect(response.status === 200, `${asset} failed`); }
  const unknown = await request('/not-a-v2-asset.js'); expect(unknown.body.includes('<title>CTR Studio Open — Build Your Show. Go Live.</title>'), 'unknown routes should return the Open website');
  console.log('CTR Studio Open smoke test passed');
}

run().catch(error => { console.error(error.message); if (output) console.error(output); process.exitCode = 1; }).finally(() => server.kill('SIGTERM'));
