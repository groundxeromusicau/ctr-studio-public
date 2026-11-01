require('./scripts/load-env')();

const { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, safeStorage, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { streamSettings } = require('./src/frontend/studio-core');
const { createIcecast } = require('./desktop/icecast');
const { startOverlay } = require('./desktop/overlay');

// The studio is served from ctr://studio/ rather than a local web server. A fixed,
// secure origin keeps the library (IndexedDB) and settings between launches; a
// random localhost port gave every launch a new, empty origin.
const SCHEME = 'ctr';
const ORIGIN = `${SCHEME}://studio`;
const FRONTEND = path.join(__dirname, 'src', 'frontend');
const CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; form-action 'self'";
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2' };

protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } }]);

let win;
const windowStateFile = () => path.join(app.getPath('userData'), 'window-state.json');
function savedBounds() { try { return JSON.parse(fs.readFileSync(windowStateFile(), 'utf8')); } catch { return { width: 1600, height: 980 }; } }
function saveBounds() { if (!win || win.isDestroyed()) return; try { fs.writeFileSync(windowStateFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch { /* not worth failing a quit over */ } }

async function serve(request) {
  const { pathname } = new URL(request.url);
  const relative = decodeURIComponent(pathname === '/' ? '/studio.html' : pathname);
  const file = path.normalize(path.join(FRONTEND, relative));
  if (!file.startsWith(FRONTEND + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response('Not found', { status: 404 });
  const response = await net.fetch(pathToFileURL(file).toString());
  return new Response(response.body, { headers: { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff' } });
}

function createWindow() {
  const bounds = savedBounds();
  win = new BrowserWindow({
    ...bounds,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#070204',
    title: 'CTR Studio Open',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  if (bounds.maximized) win.maximize();
  // Links out (the website, help) open in the browser; the window only ever shows the studio.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, target) => { if (!target.startsWith(ORIGIN)) { event.preventDefault(); if (/^https:\/\//.test(target)) shell.openExternal(target); } });
  // Live production: confirm before closing while on air, recording or importing (the page decides).
  win.webContents.on('will-prevent-unload', event => { if (dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Quit anyway', 'Stay on air'], defaultId: 1, cancelId: 1, message: 'CTR Studio is live, recording or importing.', detail: 'Quitting now stops the audio.' }) === 0) event.preventDefault(); });
  win.on('close', saveBounds);
  win.loadURL(`${ORIGIN}/studio.html`).catch(error => dialog.showErrorBox('CTR Studio Open could not load', error.message));
}

// Going live: the studio encodes the Program output and hands the bytes over; this
// process holds the Icecast connection. Settings live in userData, the password
// encrypted with the system keychain where there is one.
const streamFile = () => path.join(app.getPath('userData'), 'stream.json');
function readStream() { try { return JSON.parse(fs.readFileSync(streamFile(), 'utf8')); } catch { return {}; } }
function streamPassword(saved) {
  if (!saved.password) return '';
  try { return saved.encrypted ? safeStorage.decryptString(Buffer.from(saved.password, 'base64')) : Buffer.from(saved.password, 'base64').toString('utf8'); } catch { return ''; }
}
let icecast, overlay;
function desktopBridge() {
  const fromStudio = event => String(event.senderFrame?.url || '').startsWith(ORIGIN);
  icecast = createIcecast(status => { if (win && !win.isDestroyed()) win.webContents.send('stream:status', status); });
  overlay = startOverlay(path.join(FRONTEND, 'overlay'));
  ipcMain.handle('stream:load', event => { if (!fromStudio(event)) return null; const saved = readStream(); return { settings: streamSettings(saved.settings).settings, hasPassword: Boolean(saved.password), configured: Boolean(saved.settings?.host), status: icecast.status() }; });
  ipcMain.handle('stream:save', (event, value, password) => {
    if (!fromStudio(event)) return null;
    const { settings, error } = streamSettings(value);
    if (error) return { error };
    const saved = readStream(), next = { settings, password: saved.password, encrypted: saved.encrypted };
    if (typeof password === 'string' && password) {
      const encrypted = safeStorage.isEncryptionAvailable();
      next.password = (encrypted ? safeStorage.encryptString(password) : Buffer.from(password, 'utf8')).toString('base64');
      next.encrypted = encrypted;
    }
    fs.writeFileSync(streamFile(), JSON.stringify(next), { mode: 0o600 });
    return { settings, hasPassword: Boolean(next.password) };
  });
  ipcMain.handle('stream:connect', event => {
    if (!fromStudio(event)) return null;
    const saved = readStream(), { settings, error } = streamSettings(saved.settings);
    if (!saved.settings?.host || error) return { error: error || 'Set up your stream first' };
    icecast.connect(settings, streamPassword(saved));
    return { settings };
  });
  ipcMain.handle('stream:disconnect', event => { if (fromStudio(event)) icecast.disconnect(); });
  ipcMain.on('stream:write', (event, bytes) => { if (fromStudio(event) && bytes instanceof Uint8Array) icecast.write(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)); });
  ipcMain.on('stream:metadata', (event, text) => { if (fromStudio(event)) icecast.metadata(text); });
  ipcMain.handle('overlay:url', event => (fromStudio(event) ? overlay.url() : null));
  ipcMain.on('overlay:update', (event, value) => { if (fromStudio(event) && value && typeof value === 'object') overlay.update(value); });
}

function menu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }])] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'CTR Studio Open website', click: () => shell.openExternal('https://ctr-studio-open.vercel.app/') }, { label: 'Source code and issues', click: () => shell.openExternal('https://github.com/groundxeromusicau/ctr-studio-public') }] }
  ]));
}

function checkForUpdates() {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.on('error', () => { /* offline or no release yet: try again next launch */ });
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch { /* updater missing from a source checkout */ }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    protocol.handle(SCHEME, serve);
    const studio = origin => String(origin).startsWith(ORIGIN);
    const allowed = ['media', 'speaker-selection', 'midi', 'midiSysex', 'persistent-storage', 'notifications', 'fullscreen', 'clipboard-sanitized-write'];
    session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => allowed.includes(permission) && studio(requestingOrigin));
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => callback(allowed.includes(permission) && studio(details.requestingUrl)));
    desktopBridge();
    menu();
    createWindow();
    checkForUpdates();
  });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { icecast?.disconnect(); overlay?.close(); });
}
