const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    title: 'САПР стержневых систем — Препроцессор',
    backgroundColor: '#090b10',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  Menu.setApplicationMenu(null);

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
