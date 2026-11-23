'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),{spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),live=process.env.SMART24_META_LIVE==='1';
const origin=live?'https://jeongukdaeri.kr':'http://127.0.0.1:39866';
const seo=JSON.parse(fs.readFileSync(path.join(root,'data/seo-pages.json'),'utf8')).pages;
const dynamic=JSON.parse(fs.readFileSync(path.join(root,'data/naver-priority-meta-80-20261116.json'),'utf8')).pages;
const staticPaths=['/','/daeri/','/taksong/','/service/long-distance-daeri/','/recruit/daeri/','/recruit/taksong/','/region/'];
const checks=[...staticPaths.map(route=>[route,seo.find(x=>x.path===route)?.description]),...dynamic.map(x=>[x.path,x.description])];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const attr=(tag,key)=>tag.match(new RegExp('(?:^|\\s)'+key+'=["\\x27]([^"\\x27]*)["\\x27]','i'))?.[1]||'';
function tags(head,key,value){return [...head.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]).filter(tag=>attr(tag,key)===value).map(tag=>attr(tag,'content'));}
test('23 unique canonical summaries keep Naver 80-character guidance without shared descriptions',()=>{
 assert.equal(checks.length,23);
 assert.equal(new Set(checks.map(x=>x[0])).size,23);
 assert.equal(new Set(checks.map(x=>x[1])).size,23);
 for(const [route,description] of checks){
  assert.equal(typeof description,'string',route);
  assert(Array.from(description).length>25&&Array.from(description).length<=80,route+' length: '+Array.from(description).length);
  assert(!/무조건\s*배차|100%\s*배차|즉시\s*배차\s*보장/.test(description),route);
 }
});
test('Yeti and live human-readable HTML agree on short meta/OG, canonical and indexability for 23 URLs',async()=>{
 const child=live?null:spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39866',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  if(!live){
   let ready=false;
   for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw Error('server failed to start');
    try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}
    await sleep(250);
   }
   assert(ready,'server ready');
  }
  for(const [route,expected] of checks){
   const r=await fetch(origin+route,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'},signal:AbortSignal.timeout(17000)});
   assert.equal(r.status,200,route+' HTTP');
   assert(!/noindex/i.test(r.headers.get('x-robots-tag')||''),route+' HTTP noindex');
   const html=await r.text(),head=html.split('</head>')[0];
   const normal=tags(head,'name','description'),og=tags(head,'property','og:description');
   assert.deepEqual(normal,[expected],route+' meta description');
   assert.deepEqual(og,[expected],route+' OG description');
   assert.equal(tags(head,'property','og:site_name')[0],'전국대리운전',route+' Korean site name');
   assert.match(head,/<title>[^<]+<\/title>/,route+' title');
   assert.match(head,/<link\s+rel="canonical"\s+href="https:\/\/jeongukdaeri\.kr\/[^"]*"/,route+' canonical');
   assert(!/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*noindex/i.test(head),route+' robots');
   assert(html.includes('1811-4294')||route==='/region/innovation-cities/',route+' contact');
   console.log('PASS_URL',route,Array.from(expected).length,r.status,'indexable-tag');
  }
 }finally{child?.kill()}
});
