'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const port=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
test('v2 official canonical pages and isolated redirect/noindex routes', {timeout:45000}, async()=>{
 const p=await port(),base='http://127.0.0.1:'+p;
 const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(p)},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',d=>{errors=(errors+String(d)).slice(-3000);});
 const get=(u,opts={})=>fetch(base+u,{redirect:'manual',signal:AbortSignal.timeout(10000),...opts});
 try{
  let ready=false;
  for(let i=0;i<75;i++){
   if(child.exitCode!==null)throw Error('Server exited: '+errors);
   try{const r=await fetch(base+'/local-service/',{signal:AbortSignal.timeout(900)});if(r.status===200){ready=true;break;}}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,180));
  }
  assert(ready,'Server did not start: '+errors);
  for(const [source,target] of [['/local-service/sejong/daeri/','https://jeongukdaeri.kr/daeri/sejong/'],['/local-service/busan/taksong/','https://jeongukdaeri.kr/taksong/busan/']]){
   const r=await get(source);assert.equal(r.status,301,source);assert.equal(r.headers.get('location'),target);
  }
  const draft=await get('/local-service/ulsan/daeri/');assert.equal(draft.status,200);assert.match((draft.headers.get('x-robots-tag')||'').toLowerCase(),/noindex/);assert.match(await draft.text(),/noindex,follow/);
  const seg=await get('/daeri/sejong/');assert.equal(seg.status,200);const segHTML=await seg.text();assert(segHTML.includes('smart24-regional-evidence'));assert(segHTML.includes('/reviews/history/excel-2230/'));assert(segHTML.includes('/reviews/history/excel-2249/'));assert(segHTML.includes('도착 기록'));assert(segHTML.includes('tel:18114294'));
  const bus=await get('/taksong/busan/');assert.equal(bus.status,200);const busHTML=await bus.text();assert(busHTML.includes('smart24-regional-evidence'));assert(busHTML.includes('/reviews/history/excel-1165/'));assert(busHTML.includes('/reviews/history/excel-0979/'));assert(busHTML.includes('tel:18114294'));
  const xml=await get('/local-service/sitemap.xml');assert.equal(xml.status,200);assert(!(await xml.text()).includes('/local-service/sejong/daeri/'));
 }finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)return resolve();const t=setTimeout(resolve,3000);child.once('exit',()=>{clearTimeout(t);resolve();});});}
});
