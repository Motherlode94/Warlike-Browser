// main.js — processus principal Electron
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0a0e1a',
    title: 'Warlike Browser',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Guest pages never receive Node.js or a preload bridge. Reject non-web URLs.
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    try {
      const url = new URL(params.src || 'about:blank');
      if (!['https:', 'http:', 'about:'].includes(url.protocol) || url.username || url.password) throw Error('Unsafe guest URL');
    } catch { event.preventDefault(); return; }
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });
  // The browser chrome must not navigate to remote origins.
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (['https:', 'http:'].includes(target.protocol) && !target.username && !target.password) {
        shell.openExternal(target.href).catch(() => {});
      }
    } catch (_) {}
    return { action: 'deny' };
  });
  win.loadFile(path.join(__dirname,'..','index.html'));
  // win.webContents.openDevTools(); // décommenter pour debug
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
