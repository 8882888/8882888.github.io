'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.join(__dirname,'..');
const port=38971;
const routes=[
 ['/daeri/gangwon/','강원특별자치도'],
 ['/daeri/gyeonggi/','경기도'],
 ['/taksong/chungbuk/','충청북도'],
 ['/taksong/gyeonggi/','경기도']
];
function meta(html){
 return html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]||'';
}
test('four evidence-light provinces have concise canonical meta description',async()=>{
 const server=spawn(process.execPath,['server.js'],{
  cwd:root,
  env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},
  stdio:'ignore'
 });
 try{
  let ready=false;
  for(let i=0;i<90;i++){
   if(server.exitCode!==null)throw Error('local server failed to start');
   try{
    const r=await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(1200)});
    if(r.ok){ready=true;break}
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,400));
  }
  assert(ready,'local server must start');
  for(const [route,region] of routes){
   const response=await fetch('http://127.0.0.1:'+port+route,{signal:AbortSignal.timeout(18000)});
   assert.equal(response.status,200,route+' HTTP success');
   const html=await response.text(),description=meta(html);
   assert(description.length>=70&&description.length<=160,route+' length '+description.length);
   assert(description.includes(region),route+' regional uniqueness');
   assert(description.includes('1811-4294'),route+' hotline retained');
   assert(html.includes('href="https://jeongukdaeri.kr'+route+'"'),route+' canonical');
   assert(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(html),route+' indexable');
  }
 }finally{server.kill()}
});
