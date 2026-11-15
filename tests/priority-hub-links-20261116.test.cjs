'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');

const live=process.env.SMART24_AUDIT_LIVE==='1';
const port=39712;
const origin=live?'https://jeongukdaeri.kr':'http://127.0.0.1:'+port;
const paths=['/','/coverage/','/region/innovation-cities/','/taksong/busan/gijang-gun/'];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchPage(route){
 const r=await fetch(origin+route+(live?'?crawl-link-check='+Date.now():''),{
  signal:AbortSignal.timeout(18000),
  headers:{'Cache-Control':'no-cache'}
 });
 assert.equal(r.status,200,route+' must respond HTTP 200');
 const html=await r.text();
 if(route!=='/'){
  assert(html.includes('href="https://jeongukdaeri.kr'+route+'"'),route+' must self-canonicalize');
  assert(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html),route+' must be indexable');
 }
 return html;
}
test((live?'production':'local')+' priority discovery hubs are connected through server HTML',async()=>{
 let server;
 if(!live){
  server=spawn(process.execPath,['server.js'],{
   cwd:path.join(__dirname,'..'),
   env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},
   stdio:'ignore'
  });
 }
 try{
  if(!live){
   let ready=false;
   for(let attempt=0;attempt<90;attempt++){
    if(server.exitCode!==null)throw Error('server quit '+server.exitCode);
    try{
     const response=await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)});
     if(response.ok){ready=true;break}
    }catch{}
    await pause(350);
   }
   assert(ready,'server must become healthy');
  }
  const [home,coverage,innovation,gijang]=await Promise.all(paths.map(fetchPage));
  const homeLinks=home.match(/<section id="homepage-focus-ten"[\s\S]*?<\/section>/)?.[0]||'';
  assert(homeLinks,'homepage must render indexable priority region link section');
  for(const route of paths.slice(1)){
   assert(homeLinks.includes('href="'+route+'"'),'homepage missing direct link to '+route);
  }
  assert(coverage.includes('href="/region/innovation-cities/"'),'nationwide guide must link to innovation guide');
  assert(innovation.includes('href="/coverage/"'),'innovation guide must link back to nationwide guide');
  assert(gijang.includes('기장군')&&gijang.includes('1811-4294'),'Gijang page content and phone must be preserved');
  const priority=await fetch(origin+'/sitemap-priority.xml',{signal:AbortSignal.timeout(18000)});
  assert.equal(priority.status,200,'priority sitemap HTTP');
  const xml=await priority.text();
  for(const route of paths.slice(1))assert(xml.includes('https://jeongukdaeri.kr'+route),'priority sitemap missing '+route);
  console.log('PASS 3 direct homepage discovery links, 2 cross-links, 3 self-canonicals, 3 sitemap entries, unchanged Gijang details');
 }finally{
  server?.kill();
 }
});
