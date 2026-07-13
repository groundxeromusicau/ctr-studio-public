require('./scripts/load-env')();

const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');

let backend;

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1700,
    height: 1000,
    backgroundColor: '#070204',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(() => {
  backend = fork(path.join(__dirname, 'src/backend/server.js'), [], {
    env: { ...process.env, PORT: process.env.PORT || '3000' },
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  });

  backend.once('message', message => {
    if (message?.type === 'ready') createWindow(message.port);
  });

  backend.once('exit', code => {
    if (code && !app.isQuitting) app.quit();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (backend && !backend.killed) backend.kill();
});

app.on('window-all-closed', () => app.quit());
