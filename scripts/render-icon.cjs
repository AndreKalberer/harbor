const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const markPath = path.join(projectRoot, 'assets', 'harbor-mark.svg');
const outputPath = path.join(projectRoot, 'assets', 'icon.png');

app.disableHardwareAcceleration();

const render = async () => {
  await app.whenReady();
  const source = fs.readFileSync(markPath, 'utf8');
  const window = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    backgroundColor: '#00000000'
  });
  const document = `<!doctype html><style>html,body{width:100%;height:100%;margin:0;background:transparent;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${source}`;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(document)}`);
  const image = await window.webContents.capturePage();
  fs.writeFileSync(outputPath, image.toPNG());
  window.destroy();
};

render()
  .then(() => app.quit())
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
