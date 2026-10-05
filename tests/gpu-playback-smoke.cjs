const assert = require('node:assert/strict');
const connect = async (url) => {
  const socket = new WebSocket(url);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    close: () => socket.close(),
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    })
  };
};
async function run() {
  const endpoint = `http://127.0.0.1:${process.argv[2]}`;
  const version = await fetch(endpoint + '/json/version').then((response) => response.json());
  const browser = await connect(version.webSocketDebuggerUrl);
  const targets = await fetch(endpoint + '/json').then((response) => response.json());
  const target = targets.find((entry) => entry.type === 'page' && /\/app\/index\.html(?:$|[?#])/i.test(entry.url));
  const page = await connect(target.webSocketDebuggerUrl);
  try {
    await page.send('Page.bringToFront');
    const evaluated = await page.send('Runtime.evaluate', {
      awaitPromise: true, returnByValue: true, userGesture: true,
      expression: `(async () => {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        const deadline = Date.now() + 10000;
        while (typeof startStreamPlayback !== 'function' && Date.now() < deadline) await delay(25);
        if (welcomeDialog.open) welcomeDialog.close();
        // Generate our own buffered moving video; no provider/network throughput
        // can affect this startup/decoder regression check.
        const canvas = document.createElement('canvas');
        canvas.width = 1280; canvas.height = 720;
        const context = canvas.getContext('2d');
        const capture = canvas.captureStream(30);
        const recorder = new MediaRecorder(capture, { mimeType: 'video/webm;codecs=vp8' });
        const chunks = []; recorder.ondataavailable = event => chunks.push(event.data);
        const stopped = new Promise(resolve => recorder.onstop = resolve);
        let frame = 0;
        const draw = () => {
          context.fillStyle = '#152438'; context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#61d7da'; context.fillRect((frame++ * 15) % 1150, 250, 130, 220);
        };
        draw(); const interval = setInterval(draw, 1000 / 30);
        recorder.start(); await delay(8500); recorder.stop(); await stopped;
        clearInterval(interval); capture.getTracks().forEach(track => track.stop());
        const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
        try {
          await startStreamPlayback({ id: 'gpu-playback-test', name: 'Playback check', category: 'Watch', type: 'movie', directStream: url });
          const video = streamDirectVideo; video.muted = true; video.loop = false;
          await video.play();
          let observedFrames = 0; let counting = true; const onFrame = () => { observedFrames++; if (counting) video.requestVideoFrameCallback(onFrame); }; video.requestVideoFrameCallback(onFrame);
          await delay(6000);
          counting = false; const final = video.getVideoPlaybackQuality();
          return { width: video.videoWidth, height: video.videoHeight, frames: observedFrames,
            dropped: final.droppedVideoFrames, playing: !video.paused, error: Boolean(video.error), readyState: video.readyState,
            confirmed: streamPlaybackConfirmed };
        } finally { closeStreamDialogBtn.click(); URL.revokeObjectURL(url); }
      })()`
    });
    if (evaluated.exceptionDetails) throw new Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text);
    const media = evaluated.result.value;
    assert.equal(media.width, 1280);
    assert.equal(media.height, 720);
    assert(media.playing && !media.error && media.readyState >= 2 && media.confirmed, 'Buffered video must play through Harbor');
    assert(media.frames >= 50, 'Buffered video frames must advance');
    const info = await browser.send('SystemInfo.getInfo');
    const features = info.gpu.featureStatus;
    // Drivers and virtual hosts can legitimately lack acceleration. Report
    // availability; the startup policy unit test guards the platform override.
    console.log(JSON.stringify({ media, gpu: { videoDecode: features.video_decode, compositing: features.gpu_compositing }, defaultGpuArguments: !info.commandLine.includes('--disable-gpu') }));
    assert(!info.commandLine.includes('--disable-gpu'), 'Native GPU QA must not force software rendering');
  } finally { page.close(); browser.close(); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
