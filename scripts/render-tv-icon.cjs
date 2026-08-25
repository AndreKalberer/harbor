const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const markPath = path.join(projectRoot, 'assets', 'harbor-tv-icon.svg');
const outputPath = path.join(projectRoot, 'assets', 'tv-icon.png');

app.disableHardwareAcceleration();

const render = async () => {
  await app.whenReady();
  const source = fs.readFileSync(markPath, 'utf8');
  const window = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    webPreferences: { backgroundThrottling: false }
  });
  await window.loadURL('data:text/html;charset=utf-8,<canvas id="icon" width="1024" height="1024"></canvas>');
  const pngDataUrl = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
    const canvas = document.getElementById('icon');
    const context = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('SVG render failed'));
    image.src = ${JSON.stringify(`data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`)};
  })`);
  fs.writeFileSync(outputPath, Buffer.from(pngDataUrl.split(',')[1], 'base64'));
  window.destroy();
};

render()
  .then(() => app.quit())
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
