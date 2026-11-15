'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const port=39763,root=path.join(__dirname,'..');
const origin='http://127.0.0.1:'+port;
const sparseCandidates=[
 '/daeri/sejong/jikhal/bugang-myeon/fare/',
 '/taksong/sejong/jikhal/geumnam-myeon/handover/',
 '/daeri/sejong/jikhal/janggun-myeon/long-distance/',
 '/daeri/gangwon/hoengseong-gun/hoengseong-eup/fare/',
 '/taksong/gyeonggi/gapyeong-gun/jojong-myeon/handover/'
];
const protectedRegions=[
 '/daeri/sejong/','/taksong/sejong/','/taksong/busan/gijang-gun/',
 '/daeri/daegu/','/coverage/'
];
const robots=html=>(html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i)||[])[1]||'';
const canonical=html=>(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)||[])[1]||'';
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function get(route){
 const r=await fetch(origin+route,{signal:AbortSignal.timeout(16000)});
 assert.equal(r.status,200,route+' must remain customer-accessible HTTP 200');
 return r.text();
}
test('sparse local topic pages are not search-index candidates, real sources and major hubs stay indexable',async()=>{
 const child=spawn(process.execPath,['server.js'],{
  cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'
 });
 try{
  let ready=false;
  for(let i=0;i<110;i++){
   if(child.exitCode!==null)throw Error('server unexpectedly terminated');
   try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1100)})).status===200){ready=true;break}}catch{}
   await sleep(300);
  }
  assert(ready,'server ready');
  let sourceEmptyCount=0;
  const regionalSitemap=await get('/sitemap-regional-guides.xml');
  for(const route of sparseCandidates){
   const html=await get(route),r=robots(html);
   assert.equal(canonical(html),new URL(route,'https://jeongukdaeri.kr').href,route+' canonical unchanged');
   const hasOriginalEditorial=html.includes('id="regional-intent-reviewed-context"');
   const hasOriginalCompletedRide=/<h2>[^<]*실제 운행후기<\/h2>/i.test(html);
   if(!hasOriginalEditorial&&!hasOriginalCompletedRide){
    sourceEmptyCount++;
    assert.match(r,/\bnoindex\b/i,route+' source-empty local topic must noindex');
    assert(!regionalSitemap.includes('<loc>https://jeongukdaeri.kr'+route+'</loc>'),route+' must not be sitemap promoted');
   }else{
    assert(!/\bnoindex\b/i.test(r),route+' sourced guide must remain indexable');
   }
   assert(html.includes('1811-4294'),route+' must retain booking phone');
  }
  assert(sourceEmptyCount>=2,'test must cover 2+ genuinely source-empty town topic pages');
  for(const route of protectedRegions){
   const html=await get(route);
   assert(!/\bnoindex\b/i.test(robots(html)),route+' regional landing must remain indexable');
   assert.equal(canonical(html),new URL(route,'https://jeongukdaeri.kr').href);
  }
  console.log('PASS '+sourceEmptyCount+' sparse township topic pages noindex, all sourced topics/main service pages remain indexable');
 }finally{child.kill()}
});
