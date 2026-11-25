'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const data=require('../data/service-center-keywords-20261117.json');
const {createServiceCenterTaksong}=require('../lib/service-center-taksong.cjs');
const root=path.resolve(__dirname,'..'),port=39871,base='http://127.0.0.1:'+port;
const compact=x=>String(x||'').replace(/\s+/g,'');
const hex=x=>Buffer.from(x,'utf8').toString('hex');
const brandPage=x=>'/taksong/type/'+hex(x)+'/';
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const originals=['현대서비스센터탁송','벤츠서비스센터탁송','볼보서비스센터탁송','BMW서비스센터탁송'];
const topicMap=new Map(originals.map(x=>[x,true]));
const guide=createServiceCenterTaksong({data,vehicleTopicMap:topicMap,vehicleTopicPath:brandPage,esc,compact});

test('service-center keywords are curated by vehicle class with real intake distinctions',()=>{
 assert.equal(data.groups.length,3);
 assert.deepEqual(data.groups.map(g=>g.id),['domestic-service-centers','imported-service-centers','commercial-truck-service-centers']);
 const all=data.groups.flatMap(g=>g.keywords);
 assert.equal(all.length,44);
 assert.equal(new Set(all.map(x=>x.toLowerCase())).size,44,'no duplicate search terms');
 assert.equal(data.aliases.length,7);
 for(const g of data.groups){
  assert(g.description.length>90&&g.action.length>=50,'not thin keyword-only text');
  assert(!/(공식 협약|제조사 공식 탁송|100% 배차 보장|기사 상주)/.test(g.description+g.action));
 }
 for(const exact of ['현대서비스센터탁송','벤츠서비스센터탁송','볼보서비스센터탁송']){
  assert.equal(guide.find(exact),brandPage(exact));
 }
 for(const word of ['타타대우서비스센터탁송','대우타타서비스센터탁송','볼보트럭서비스센터탁송','벤츠트럭서비스센터탁송','현대상용차서비스센터탁송']){
  assert.equal(guide.find(word),'/taksong/types/#commercial-truck-service-centers');
 }
 assert.equal(guide.find('존재하지않는서비스탁송'),null);
 assert.equal(guide.keywordCount,51);
 const html=guide.markup();
 assert(html.includes('id="commercial-truck-service-centers"'));
 assert(html.includes('타타대우모빌리티'));
 assert(html.includes('볼보트럭'));
 assert(html.includes('서비스센터 정비예약과 로드탁송 배차는 별도'));
 assert(!html.includes('대우타타서비스센터탁송'),'wrong-order nickname is search-only alias');
 for(const g of data.groups)assert(html.includes('id="'+g.id+'"'));
});
test('existing canonical search entrypoints link to distinct car and truck center pages',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<90;n++){
   if(child.exitCode!==null)throw Error('server exited '+child.exitCode);
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1500)});if(r.ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert(ready,'server ready');
  const [hub,national]=await Promise.all([fetch(base+'/taksong/types/'),fetch(base+'/taksong/')]);
  assert.equal(hub.status,200);assert.equal(national.status,200);
  const h=await hub.text(),n=await national.text();
  for(const group of data.groups)assert(h.includes('id="'+group.id+'"'),group.title);
  for(const term of ['현대상용차서비스센터탁송','타타대우서비스센터탁송','볼보트럭서비스센터탁송','벤츠트럭서비스센터탁송'])assert(h.includes(term),term);
  assert(n.includes('id="national-service-center-categories"'));
  assert(n.includes('/taksong/types/#commercial-truck-service-centers'));
  assert(h.includes('href="tel:18114294"'));
  assert(h.includes('href="https://jeongukdaeri.kr/taksong/types/"'),'self canonical kept');
  const samples=[
   ['벤츠서비스센터탁송',brandPage('벤츠서비스센터탁송')],
   ['볼보서비스센터탁송',brandPage('볼보서비스센터탁송')],
   ['현대서비스센터탁송',brandPage('현대서비스센터탁송')],
   ['타타대우모빌리티서비스센터탁송','/taksong/types/#commercial-truck-service-centers'],
   ['대우타타서비스센터탁송','/taksong/types/#commercial-truck-service-centers'],
   ['볼보트럭서비스센터탁송','/taksong/types/#commercial-truck-service-centers']
  ];
  for(const [term,to] of samples){
   for(const entry of ['/','/keyword-search/','/region/']){
    const r=await fetch(base+entry+'?q='+encodeURIComponent(term),{redirect:'manual',signal:AbortSignal.timeout(14000)});
    assert.equal(r.status,302,entry+term);
    assert.equal(decodeURI(r.headers.get('location')),to,term+' canonical search route');
    assert.match(r.headers.get('cache-control')||'',/no-store/);
   }
  }
  for(const term of ['벤츠서비스센터탁송','볼보서비스센터탁송','현대서비스센터탁송']){
   const r=await fetch(base+brandPage(term),{signal:AbortSignal.timeout(14000)});
   assert.equal(r.status,200,term);
   const html=await r.text();
   assert(html.includes('상용차·대형트럭 서비스센터와 구분'),term+' contextual comparison');
  }
 }finally{child.kill()}
});

test('Existing service-center brand pages are directly discoverable without new sitemap URLs',()=>{
 const fs=require('node:fs');
 const html=fs.readFileSync(path.join(root,'service/taksong/index.html'),'utf8');
 const owners=require('../data/sitemap-url-owners.json');
 const block=html.match(/<div id="service-center-brand-direct-links-20261125">[\s\S]*?<\/div>/)?.[0]||'';
 const links=[...block.matchAll(/href="(\/taksong\/type\/[a-f0-9]+\/)"/g)].map(x=>x[1]);
 const names=["블루핸즈탁송","기아오토큐탁송","르노코리아서비스센터탁송","쉐보레서비스센터탁송","제네시스서비스센터탁송","KG모빌리티서비스센터탁송","벤츠서비스센터탁송","BMW서비스센터탁송","포르쉐서비스센터탁송","아우디서비스센터탁송","포드서비스센터탁송","도요타서비스센터탁송","렉서스서비스센터탁송","볼보서비스센터탁송","폭스바겐서비스센터탁송","랜드로버서비스센터탁송","재규어서비스센터탁송","혼다서비스센터탁송","닛산서비스센터탁송","미니서비스센터탁송","테슬라서비스센터탁송","캐딜락서비스센터탁송","링컨서비스센터탁송","마세라티서비스센터탁송","벤틀리서비스센터탁송","롤스로이스서비스센터탁송"];
 assert.deepEqual(links,names.map(brandPage));assert.equal(new Set(links).size,26);
 for(const url of links)assert.ok(owners[url],'registered existing URL '+url);
 assert.ok(block.includes('/taksong/types/#commercial-truck-service-centers'));
 assert.ok(block.includes('제조사 공식 서비스센터나 제휴업체 명단이 아닙니다'));
 assert.ok(block.includes('https://open.kakao.com/o/sGV88r7h'));
});
