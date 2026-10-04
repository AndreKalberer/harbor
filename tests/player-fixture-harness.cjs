// Only this isolated test entry point substitutes provider pages. The shipped
// application never installs these handlers and contacts real providers.
const path=require('node:path');
const {app,session}=require('electron');
const root=process.env.HARBOR_QA_APP_ASAR || path.join(__dirname,'..');
const providers=require(path.join(root,'shared/playback-providers.js'));
require(path.join(root,'electron/main.cjs'));
const wav=Buffer.alloc(44+16000);
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const player=`<html><head><title>Harbor player test</title></head><body style="background:#222;color:white"><button id="play">Play test audio</button><audio id="media" loop src="data:audio/wav;base64,${wav.toString('base64')}"></audio><script>document.querySelector('#play').onclick=()=>document.querySelector('#media').play();</script></body></html>`;
app.whenReady().then(()=>{
  session.fromPartition('persist:harbor').protocol.handle('https',request=>{
    const url=new URL(request.url);
    const provider=providers.providers.find(p=>p.host===url.hostname || p.navigationHosts?.includes(url.hostname));
    if(!provider) return new Response('Blocked fixture destination',{status:403});
    if(provider.navigationHosts?.length && url.hostname===provider.host) {
      return new Response(null,{status:302,headers:{location:`https://${provider.navigationHosts[0]}${url.pathname}${url.search}`}});
    }
    const nested=providers.providers.indexOf(provider)%2===0 && url.pathname!=='/fixture-media';
    const html=nested ? `<html><head><title>Nested provider fixture</title></head><body><iframe id="nested-player" src="https://${url.hostname}/fixture-media" style="width:100%;height:100%"></iframe></body></html>` : player;
    return new Response(html,{headers:{'content-type':'text/html'}});
  });
});
