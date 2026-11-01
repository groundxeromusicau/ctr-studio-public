// Tells the studio page it's running as the desktop app (no service worker or
// install button there). Sandboxed: nothing else crosses over.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('ctrDesktop', { platform: process.platform });
