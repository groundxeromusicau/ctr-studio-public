// The bridge between the studio page and the desktop app: going live over
// Icecast and the OBS overlay. Sandboxed: nothing else crosses over, and the
// main process only answers the studio's own origin.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ctrDesktop', {
  platform: process.platform,
  stream: {
    load: () => ipcRenderer.invoke('stream:load'),
    save: (settings, password) => ipcRenderer.invoke('stream:save', settings, password),
    connect: () => ipcRenderer.invoke('stream:connect'),
    disconnect: () => ipcRenderer.invoke('stream:disconnect'),
    write: bytes => ipcRenderer.send('stream:write', bytes),
    metadata: text => ipcRenderer.send('stream:metadata', text),
    onStatus: callback => ipcRenderer.on('stream:status', (_event, status) => callback(status))
  },
  overlay: {
    url: () => ipcRenderer.invoke('overlay:url'),
    update: value => ipcRenderer.send('overlay:update', value)
  }
});
