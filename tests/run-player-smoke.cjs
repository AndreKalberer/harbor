const {spawnSync}=require('node:child_process');
const path=require('node:path');
const env={...process.env,HARBOR_QA_ENTRYPOINT:'player-fixture-harness.cjs'};
delete env.HARBOR_QA_EXECUTABLE;
const result=spawnSync(process.execPath,[path.join(__dirname,'run-desktop-smoke.cjs'),'player-fixture-smoke.cjs'],{env,stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status===null?1:result.status;
