const { app, BrowserWindow } = require('electron');
const os = require('node:os');
const path = require('node:path');

const port = process.argv[2] || '9343';
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('remote-debugging-port', port);
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.setPath('userData', process.env.HARBOR_QA_PROFILE || path.join(os.tmpdir(), 'harbor-tv-test-' + process.pid));

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: process.env.HARBOR_QA_SHOW === '1',
    backgroundColor: '#050208',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.loadFile(path.join(__dirname, '..', 'tv', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
