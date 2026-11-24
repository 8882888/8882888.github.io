'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const sources=[
 {file:'data/naver-regional-focus-50.json',ids:[37]},
 {file:'data/naver-regional-focus-fifth-daeri-50.json',ids:[283,284]},
 {file:'data/naver-regional-focus-sixth-100.json',ids:[320,321,322,370,371]}
];
const rows=sources.flatMap(({file,ids})=>{
 const list=load(file).priority;
 return ids.map(id=>{const row=list.find(x=>x.id===id);assert(row,'missing '+file+'#'+id);return {...row,file};});
});
const reviewed=new Map(load('data/priority-regions.json').pages.map(x=>[x.kind+'|'+x.region,x]));
const oldNaver=load('data/naver-search-baseline-20261105.json');
const PREFIX='https://jeongukdaeri.kr',PORT=39877,LOCAL='http://127.0.0.1:'+PORT;
const problem=/100%\s*(?:보장|배차)|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차|공식\s*제휴|배차완료|운행완료/;

test('eight remaining reviewed editorial guides add real local decision information without new URLs',()=>{
 assert.equal(rows.length,8);
 assert.equal(new Set(rows.map(x=>x.kind+'|'+x.region)).size,8);
 assert.equal(new Set(rows.map(x=>x.keyword)).size,8);
 assert.equal(new Set(rows.map(x=>x.pickup)).size,8);
 assert.equal(new Set(rows.map(x=>x.handover)).size,8);
 for(const row of rows){
  assert(reviewed.has(row.kind+'|'+row.region),'no unreviewed source on '+row.keyword);
  assert(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword+' is distinct and substantive');
  assert([row.topic,row.pickup,row.handover].join(' ').includes(row.region.split(' ').at(-1)),row.keyword+' identifies legal region');
  assert.match(row.related,/^\/(?:service|business|route-taksong)\/[a-z0-9/-]*$/,'actual service guide');
  assert(!problem.test(row.topic+' '+row.pickup+' '+row.handover),row.keyword+' no fake completion, affiliation or dispatch');
  assert(row.pickup!==row.handover);
 }
});
test('dated owner Naver traffic baseline identifies actual page optimization targets, not gains',()=>{
 assert.equal(oldNaver.last_updated,'2026-11-05');
 const stats=new Map(oldNaver.pages.map(([url,clicks,impressions])=>[url,{clicks,impressions}]));
 assert.deepEqual(stats.get('/daeri/gangwon/gangreung-si/'),{clicks:0,impressions:615});
 assert.deepEqual(stats.get('/taksong/gangwon/gangreung-si/'),{clicks:1,impressions:229});
 assert(oldNaver.limitations?.some(t=>t.includes('직접 클릭')),'exclude self-check clicks from business outcomes');
});
test('eight reviewed service pages expose exact source information to crawlers, and Gangneung CTR metadata is useful',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   if(child.exitCode!==null)throw Error('local server exited: '+child.exitCode);
   try{if((await fetch(LOCAL+'/health',{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert(ready,'local source SSR started');
  const paths=new Set();
  for(const row of rows){
   const lookup=await fetch(LOCAL+'/?q='+encodeURIComponent(row.keyword),{redirect:'manual',signal:AbortSignal.timeout(15000)});
   assert.equal(lookup.status,302,row.keyword+' must resolve to a canonical service page');
   const dest=decodeURI(lookup.headers.get('location')||'');
   assert(dest.startsWith('/'),row.keyword+' must remain internal');
   paths.add(dest);
   const response=await fetch(LOCAL+dest,{signal:AbortSignal.timeout(30000)});
   assert.equal(response.status,200,row.keyword+' real HTTP 200');
   assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),row.keyword+' is not noindex');
   const html=await response.text();
   const curated=html.indexOf('id="priority-region-guide"');
   const focused=html.indexOf('id="naver-focus50-local-guide"');
   const checklist=html.indexOf('id="priority-locality-customer-checklist-20261105"');
   assert(curated>0&&focused>curated&&checklist>focused,row.keyword+' reviewed evidence must lead generic checklists');
   assert.equal(html.split('id="priority-region-guide"').length-1,1,row.keyword+' one curated local section');
   assert.equal(html.split('id="naver-focus50-local-guide"').length-1,1,row.keyword+' one original focus section');
   assert(html.includes(row.topic),row.keyword+' unique topic in SSR HTML');
   assert(html.includes(row.pickup),row.keyword+' source-specific pickup in SSR HTML');
   assert(html.includes(row.handover),row.keyword+' source-specific handover in SSR HTML');
   assert(html.includes('href="'+row.related+'"'),row.keyword+' canonical related service link');
   assert(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),row.keyword+' indexable meta');
   assert(html.includes('<link rel="canonical" href="'+PREFIX+dest+'">'),row.keyword+' canonical');
   assert(html.includes('tel:18114294'),row.keyword+' contact');
   if(row.id===320||row.id===370){
    const isDaeri=row.id===370;
    const headline=isDaeri?'강릉대리운전 | 경포·안목·교동·주문진 예약·실제 운행기록':'강릉탁송 | 강릉항·경포·주문진 차량인수·요금';
    assert(html.includes('<title>'+headline+' | 전국대리운전</title>'),row.keyword+' accurate search title');
    assert(html.includes('<h1>'+headline+'</h1>'),row.keyword+' visible H1/title parity');
    const desc=html.match(/<meta name="description" content="([^"]*)">/);
    assert(desc&&desc[1].includes(isDaeri?'경포해변·안목해변의 음식점과':'강릉 경포대와 주문진·강릉항 차량 인수'),row.keyword+' unique description');
    assert(desc[1].includes('1811-4294'),row.keyword+' phone');
    assert(desc[1].length<160,row.keyword+' concise meta');
   }
  }
  assert.equal(paths.size,8,'no two reviewed services collapsed into the same canonical');
 }finally{child.kill();}
});
