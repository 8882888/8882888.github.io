'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const port=39183;
const base='http://127.0.0.1:'+port;
const seo=JSON.parse(fs.readFileSync(path.join(root,'data/seo-pages.json'),'utf8'));
const pages=new Map(seo.pages.map(x=>[x.path,x]));
const title=html=>html.match(/<title>([^<]*)<\/title>/i)?.[1]||'';

test('nationwide transport reviews and regional driver booking stay separate, without inventing rides',{timeout:90000},async()=>{
 assert.match(pages.get('/taksong/').title,/실제 운행후기/);
 assert.match(pages.get('/daeri/').title,/예약·예상요금/);
 assert.doesNotMatch(pages.get('/daeri/').title,/후기/);
 const child=spawn(process.execPath,['server.js'],{
  cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'
 });
 try{
  let ready=false;
  for(let i=0;i<95;i++){
   if(child.exitCode!==null)throw Error('Server exited during test');
   try{
    const health=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});
    if(health.ok){ready=true;break;}
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,350));
  }
  assert(ready,'server /health becomes ready');
  async function page(route){
   const r=await fetch(base+route,{signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,200,route+' HTTP 200');
   const html=await r.text();
   assert(html.includes('https://jeongukdaeri.kr'+route),route+' canonical site');
   return html;
  }
  const nationalDaeri=await page('/daeri/');
  const nationalTaksong=await page('/taksong/');
  assert.equal(title(nationalDaeri),pages.get('/daeri/').title);
  assert.equal(title(nationalTaksong),pages.get('/taksong/').title);
  assert(nationalDaeri.includes('id="national-daeri-direct-answer"'),'Driver booking question appears before trip archive');
  assert(nationalDaeri.indexOf('id="national-daeri-direct-answer"')<nationalDaeri.indexOf('id="national-daeri-completed-cases"'),'Driver service guidance must precede ride list');
  assert(nationalTaksong.includes('id="national-taksong-completed-cases"'),'Taksong hub shows source-backed completed case cards');
  assert(nationalTaksong.indexOf('id="national-taksong-completed-cases"')<nationalTaksong.indexOf('id="national-taksong-direct-answer"'),'Transport case evidence appears before booking details');
  for(const route of ['/daeri/gyeonggi/','/daeri/chungbuk/']){
   const html=await page(route);
   assert(title(html).includes('대리운전'),route+' driver search title');
   assert(html.includes('id="regional-direct-answer"'),route+' server-rendered local booking answer');
   assert(html.includes('service=daeri'),route+' driver fare lookup');
   assert(html.includes('1811-4294'),route+' real customer booking number');
  }
  for(const route of ['/taksong/gyeongbuk/','/taksong/busan/']){
   const html=await page(route);
   assert(title(html).includes('탁송'),route+' transport search title');
   assert(html.includes('id="regional-direct-answer"'),route+' server-rendered transport answer');
   assert(html.includes('service=taksong'),route+' fare quote, not invented recorded mileage');
   assert(html.includes('운행기록'),route+' evidence provenance');
  }
 }finally{child.kill('SIGTERM');}
});
