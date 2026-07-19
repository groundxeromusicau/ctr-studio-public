require('./scripts/load-env')();

const { app, BrowserWindow, dialog, session } = require('electron');
const { fork } = require('child_process');
const path = require('path');

let backend;
let startupTimer;

function createWindow(port) {
  clearTimeout(startupTimer);
  const origin = `http://127.0.0.1:${port}`;
  const win = new BrowserWindow({
    width: 1700,
    height: 1000,
    backgroundColor: '#070204',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(origin)) event.preventDefault();
  });
  win.loadURL(origin).catch(error => dialog.showErrorBox('CTR Studio Open could not load', error.message));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => permission === 'media' && String(requestingOrigin).startsWith('http://127.0.0.1:'));
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => callback(permission === 'media' && String(details.requestingUrl).startsWith('http://127.0.0.1:')));
  backend = fork(path.join(__dirname, 'src/backend/server.js'), [], {
    env: { ...process.env, PORT: process.env.PORT || '0' },
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  });

  startupTimer = setTimeout(() => {
    dialog.showErrorBox('CTR Studio Open could not start', 'The local studio service did not become ready. Check whether security software is blocking local applications, then reopen CTR Studio.');
    app.quit();
  }, 15000);

  backend.once('message', message => {
    if (message?.type === 'ready') createWindow(message.port);
  });

  backend.once('exit', code => {
    clearTimeout(startupTimer);
    if (code && !app.isQuitting) {
      dialog.showErrorBox('CTR Studio Open stopped', `The local studio service exited unexpectedly (code ${code}).`);
      app.quit();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (backend && !backend.killed) backend.kill();
});

app.on('window-all-closed', () => app.quit());
