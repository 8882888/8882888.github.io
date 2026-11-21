'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const urlpaths={
 private:'/reviews/history/excel-0002/',
 public:'/reviews/history/excel-0013/',
 hub:'/reviews/history/',
 sitemap:'/sitemap-history-1.xml',
 last:'/sitemap-history-6.xml'
};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
}
test('archive preserves 2591 ride documents but avoids indexing both-private-location entries',{timeout:90000},async()=>{
 const port=await freePort();
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 async function get(url){
  const response=await fetch(base+url,{signal:AbortSignal.timeout(15000)});
  return {status:response.status,text:await response.text(),headers:response.headers};
 }
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   if(child.exitCode!==null)throw Error('Server process exited early: '+child.exitCode);
   try{const r=await get('/health');if(r.status===200){ready=true;break;}}catch{}
   await pause(300);
  }
  assert(ready,'local server must become ready');
  const [privatePage,publicPage,hub,first,last]=await Promise.all(Object.values(urlpaths).map(get));
  assert.equal(privatePage.status,200,'preserve private historical URL for user lookup');
  assert.equal(publicPage.status,200,'retain geographic records as indexable');
  assert.match(privatePage.text,/<meta name="robots" content="noindex,follow">/);
  assert.doesNotMatch(privatePage.text,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(privatePage.text,/<link rel="canonical" href="https:\/\/jeongukdaeri.kr\/reviews\/history\/excel-0002\/"/);
  assert.match(privatePage.text,/당시 운행요금/);
  assert.match(publicPage.text,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.equal(hub.status,200,'all original records remain navigable from the archive');
  assert.match(hub.text,/2591/);
  assert.equal(first.status,200);
  assert.equal(last.status,200,'keep all six original XML shard URLs working');
  assert.doesNotMatch(first.text,/\/reviews\/history\/excel-0002\//,'no double-private-place record in sitemap');
  assert.match(first.text,/\/reviews\/history\/excel-0013\//,'genuine public route still in sitemap');
  assert.match(last.text,/<urlset/);
 }finally{
  child.kill('SIGTERM');
  await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,3000).unref();});
 }
});
