'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {resolve,AERIAL,HEAVY}=require('../lib/special-vehicle-keywords.cjs');
const root=path.resolve(__dirname,'..'),PORT=39862,base='http://127.0.0.1:'+PORT;
const keywords=[
 ['고소차탁송',AERIAL],['고소차량탁송',AERIAL],['고소작업차탁송',AERIAL],['고소작업차량탁송',AERIAL],
 ['1톤고소차탁송',AERIAL],['3.5톤고소차탁송',AERIAL],['3.5톤고소차량탁송',AERIAL],
 ['1톤고소작업차탁송',AERIAL],['2.5톤스카이차탁송',AERIAL],['5톤고소차탁송',AERIAL],
 ['스카이차탁송',AERIAL],['바가지차탁송',AERIAL],['버킷차탁송',AERIAL],
 ['1톤사다리차탁송',HEAVY],['3.5톤카고크레인탁송',HEAVY],['5톤집게차탁송',HEAVY],
 ['활선차탁송',HEAVY],['청소차탁송',HEAVY],['노면청소차탁송',HEAVY],
 ['살수차탁송',HEAVY],['콘크리트펌프카탁송',HEAVY],['작업차량탁송',HEAVY]
];
test('all key aerial work truck and other special vehicle phrases resolve to two existing-purpose pages',()=>{
 for(const [keyword,target] of keywords){
  assert.equal(resolve(keyword),target,keyword);
  assert.equal(resolve('전국 '+keyword),target,'nationwide '+keyword);
 }
 assert.equal(resolve('차량대여'),null);
 assert.equal(resolve('3.5톤고소차임대'),null,'do not advertise equipment rental as vehicle transport');
 assert.equal(resolve('1톤 스카이차 탁송'),AERIAL);
});
test('aerial lift is one indexable, grounded canonical page; aliases never spawn separate SEO documents',async()=>{
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let live=false;
  for(let i=0;i<100;i++){
   if(cp.exitCode!==null)throw Error('server exited '+cp.exitCode);
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1200)})).ok){live=true;break}}catch{}
   await new Promise(r=>setTimeout(r,300));
  }
  assert.ok(live,'local Smart24 test server starts');
  const res=await fetch(base+AERIAL),html=await res.text();
  assert.equal(res.status,200);
  assert.match(html,/<h1>고소차탁송/);
  assert.ok(html.includes('rel="canonical" href="https://jeongukdaeri.kr'+AERIAL+'"'));
  assert.ok(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  assert.ok(html.includes('"@type":"WebPage"'));
  const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  assert.ok(desc&&[...desc].length<=80,'meta description in 80-char editorial constraint');
  assert.ok(html.includes('1톤고소차탁송'));
  assert.ok(html.includes('3.5톤고소차탁송'));
  assert.ok(html.includes('작업대')&&html.includes('아웃트리거'));
  assert.ok(html.includes('1811-4294'));
  assert.ok(html.includes('실제 기사 배정'));
  for(const [keyword,target] of keywords.slice(0,9).concat(keywords.slice(13,17))){
   const q=await fetch(base+'/keyword-search/?q='+encodeURIComponent(keyword),{redirect:'manual'});
   assert.equal(q.status,302,'keyword alias redirect '+keyword);
   assert.equal(q.headers.get('location'),target,'one canonical destination for '+keyword);
  }
  const t=await (await fetch(base+'/taksong/types/')).text();
  assert.ok(t.includes('href="'+AERIAL+'"'));
  const h=await (await fetch(base+HEAVY)).text();
  assert.ok(h.includes('href="'+AERIAL+'"'));
  assert.ok(h.includes('카고크레인탁송')&&h.includes('집게차탁송'));
  for(const map of ['/sitemap-priority.xml','/sitemap.xml','/sitemap-taksong.xml']){
   const response=await fetch(base+map,{signal:AbortSignal.timeout(16000)});
   assert.equal(response.status,200,map);
   const xml=await response.text();
   assert.ok(xml.includes('https://jeongukdaeri.kr'+AERIAL),'sitemap includes aerial hub '+map);
   assert.ok(!xml.includes('/taksong/type/'+Buffer.from('1톤고소차탁송').toString('hex')+'/'),'avoid duplicate alias URL in '+map);
  }
 }finally{cp.kill()}
});
