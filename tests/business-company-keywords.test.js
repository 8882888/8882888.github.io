#!/usr/bin/env node
'use strict';
// Verify all official levels and real business/driver-intent keyword combinations.
// No fabricated locality staff, completed jobs or unconditional card acceptance.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=new URL(process.argv[2]||'http://127.0.0.1:3000/');
const tasks=[];
function check(name,fn){tasks.push({name,fn})}
async function get(p){const r=await fetch(new URL(p,base),{signal:AbortSignal.timeout(20000)});return{status:r.status,headers:r.headers,body:await r.text()}}
async function preview(q,service){
 const p=new URLSearchParams({q});if(service)p.set('service',service);
 const r=await get('/api/region-card-preview?'+p);
 assert.equal(r.status,200,q);assert.match(r.headers.get('content-type'),/application\/json/);
 assert.match(r.headers.get('x-robots-tag')||'',/^noindex\s*,\s*nofollow$/,'search-preview API must stay noindex regardless of insignificant whitespace');
 return JSON.parse(r.body);
}
const exact=[
 ['골프대리운전','daeri','golf-daeri'],
 ['골프장대리운전','daeri','golf-daeri'],
 ['골프대리','daeri','golf-daeri'],
 ['일일기사','daeri','daily-driver'],
 ['하루기사','daeri','daily-driver'],
 ['골프일일기사','daeri','daily-driver'],
 ['법인대리운전','daeri','corporate-daeri'],
 ['기업대리운전','daeri','corporate-daeri'],
 ['법인카드대리운전','daeri','corporate-card-daeri'],
 ['법인카드결제대리운전','daeri','corporate-card-daeri'],
 ['법인카드대리운전업체','daeri','corporate-card-daeri'],
 ['탁송업체','taksong','general-taksong'],
 ['탁송회사','taksong','general-taksong'],
 ['대리운전업체','daeri','general-daeri'],
 ['대리운전회사','daeri','general-daeri'],
 ['대리업체','daeri','general-daeri'],
 ['대리회사','daeri','general-daeri']
];
for(const [q,kind,slug]of exact)check('Direct '+q,async()=>{
 const d=await preview(q);assert.equal(d.status,'matched',q);
 assert.equal(d.cards.length,1);assert.equal(d.cards[0].kind,kind);
 assert.equal(d.cards[0].image,'/keyword-card/'+slug+'.svg',q);
 const svg=await get(d.cards[0].image);assert.equal(svg.status,200);
 assert.match(svg.headers.get('content-type'),/image\/svg\+xml/);
 assert.ok(svg.body.includes('1811-4294'));
 if(q.includes('법인카드'))assert.ok(d.cards[0].description.includes('등록·승인'));
});
const levels=[
 ['시도','부산광역시','대리운전회사','daeri'],
 ['시','충청북도 제천시','탁송회사','taksong'],
 ['군','부산광역시 기장군','탁송업체','taksong'],
 ['구','서울특별시 강남구','대리업체','daeri'],
 ['읍','부산광역시 기장군 기장읍','탁송업체','taksong'],
 ['면','충청북도 괴산군 감물면','대리회사','daeri'],
 ['동','서울특별시 강남구 역삼동','대리운전업체','daeri'],
 ['리','부산광역시 기장군 기장읍 동부리','탁송회사','taksong']
];
for(const [level,place,suffix,kind]of levels)check(level+' locality+company intent',async()=>{
 const d=await preview(place+suffix);assert.equal(d.status,'matched',level);
 assert.equal(d.region,place,level);assert.equal(d.cards.length,1);
 assert.equal(d.cards[0].kind,kind);assert.ok(d.cards[0].image.endsWith('-'+kind+'-brand-v7.png'));
 const page=await get(d.cards[0].url);assert.equal(page.status,200);
 if(level==='리'){
  // Fine-grained villages deliberately use compact content to avoid 20k duplicate SEO pages.
  assert.ok(page.body.includes('동부리')&&page.body.includes('tel:18114294'),'village still shows its correct area and phone');
  assert.ok(!page.body.includes('id="regional-provider-keywords"'),'village avoids repetitive provider keyword stuffing');
 }else{
  assert.ok(page.body.includes('id="regional-provider-keywords"'),level+' company guidance');
  assert.ok(page.body.includes('탁송업체·탁송회사')||page.body.includes('대리운전업체·대리운전회사'));
  assert.ok(page.body.includes('상주')&&page.body.includes('보장하지 않습니다'));
 }
});
const combinations=[
 ['부산골프대리운전','부산광역시','daeri','golf-daeri','1811-4294'],
 ['대구법인대리운전','대구광역시','daeri','corporate-daeri','1811-4294'],
 ['서울강남법인카드대리운전','서울특별시 강남구','daeri','corporate-card-daeri','1811-4294'],
 ['서울강남법인카드대리운전회사','서울특별시 강남구','daeri','corporate-card-daeri','1811-4294'],
 ['부산골프장일일기사','부산광역시','daeri','golf-daeri','1811-4294'],
 ['부산일일기사','부산광역시','daeri','daily-driver','1811-4294'],
 ['부산법인카드대리운전업체','부산광역시','daeri','corporate-card-daeri','1811-4294'],
 ['제주도법인카드대리운전','제주특별자치도','daeri','corporate-card-daeri','1811-4294'],
 ['부산탁송회사','부산광역시','taksong',null,'1811-4294'],
 ['서울대리운전회사','서울특별시','daeri',null,'1811-4294'],
 ['대구대리업체','대구광역시','daeri',null,'1811-4294'],
 ['제주도탁송업체','제주특별자치도','taksong',null,'1877-5245']
];
for(const [q,place,kind,slug,phone]of combinations)check('Combined '+q,async()=>{
 const d=await preview(q);assert.equal(d.status,'matched',q);assert.equal(d.region,place,q);
 assert.equal(d.cards.length,1);assert.equal(d.cards[0].kind,kind,q);assert.equal(d.cards[0].phone,phone);
 if(slug){
  assert.ok(d.cards[0].image.includes('/keyword-card/'+slug+'/area-'),q);
  const image=await get(d.cards[0].image);
  assert.equal(image.status,200,q);assert.match(image.headers.get('content-type'),/image\/svg\+xml/);
  assert.ok(image.body.includes(phone),q);
 }else assert.ok(d.cards[0].image.endsWith('-'+kind+'-brand-v7.png'),q);
});
for(const q of ['동구대리업체','광주탁송회사','광주법인카드대리운전'])
 check('Ambiguous '+q,async()=>{
  const d=await preview(q);assert.equal(d.status,'ambiguous',q);
  assert.equal(d.cards.length,0,q);
  assert.ok(d.candidates.length>1,q);
  if(q.endsWith('탁송회사'))assert.ok(d.candidates[0].query.endsWith('탁송'));
 });
for(const [p,id] of [
 ['/','four-driver-intents-20261103'],
 ['/daeri/','four-specialized-driver-services'],
 ['/service/golf/','golf-driver-keyword-focus'],
 ['/service/daily-driver/','daily-driver-keyword-focus'],
 ['/service/corporate/','corporate-card-driver-keyword-focus']
])check('Visible service section '+p,async()=>{
 const r=await get(p);assert.equal(r.status,200,p);
 assert.ok(r.body.includes('id="'+id+'"'),p);
 assert.ok(r.body.includes('골프대리운전')&&r.body.includes('일일기사'),p);
 assert.ok(r.body.includes('법인대리운전')&&r.body.includes('법인카드대리운전'),p);
});
check('Corporate card not universally guaranteed',async()=>{
 const r=await get('/service/corporate/');assert.ok(r.body.includes('사전 등록·승인'));
 assert.ok(r.body.includes('모든 법인카드를 무조건 결제할 수 있다는 보장은 하지 않습니다'));
});
check('National driver link and no route duplication',async()=>{
 const r=await get('/daeri/');assert.ok(r.body.includes('/region/'));
 assert.ok(r.body.includes('법인카드대리운전'));
 assert.ok(!r.body.includes('서울특별시 강남구 법인카드대리운전 실제 완료'),'no invented cases');
});

check('Exact Gyeonggi full administrative name resolves instead of colliding with Dori',async()=>{
 const d=await preview('경기도탁송');
 assert.equal(d.status,'matched');
 assert.equal(d.region,'경기도');
 assert.equal(d.cards.length,1);
 assert.equal(d.cards[0].kind,'taksong');
});
check('Sejong real town works without internal direct-admin label',async()=>{
 for(const [q,area,kind] of [
  ['세종특별자치시 조치원읍탁송','세종특별자치시 (직할) 조치원읍','taksong'],
  ['세종특별자치시 반곡동대리운전','세종특별자치시 (직할) 반곡동','daeri']
 ]){
  const d=await preview(q);
  assert.equal(d.status,'matched',q);
  assert.equal(d.region,area,q);
  assert.equal(d.cards.length,1);
  assert.equal(d.cards[0].kind,kind);
 }
});
check('Nationwide B2B portal, canonical and five industry handoff links',async()=>{
 const home=await get('/');
 assert.equal(home.status,200);
 assert.ok(home.body.includes('id="nationwide-b2b-entry-20261114"'),'homepage must expose B2B hub');
 const hub=await get('/business/');
 assert.equal(hub.status,200);
 assert.match(hub.headers.get('content-type')||'',/text\/html/);
 assert.ok(hub.body.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/">'));
 assert.ok(hub.body.includes('name="robots" content="index,follow"'));
 assert.ok(hub.body.includes('tel:18114294'));
 assert.ok(hub.body.includes('id="business-copy"'));
 const industries=['used-car','rental-car','export-port','scrapyard','auction'];
 for(const industry of industries){
  const route='/business/'+industry+'/';
  assert.ok(hub.body.includes('href="'+route+'"'),'industry link missing: '+route);
  const detail=await get(route);
  assert.equal(detail.status,200,route);
  assert.ok(detail.body.includes('tel:18114294'),route+' contact missing');
  assert.ok(detail.body.includes('rel="canonical" href="https://jeongukdaeri.kr'+route+'"'),route+' canonical');
 }
 for(const sitemap of ['/sitemap-priority.xml','/sitemap.xml']){
  const xml=await get(sitemap);
  assert.equal(xml.status,200,sitemap);
  for(const route of ['/business/',...industries.map(v=>'/business/'+v+'/')]){
   const loc='<loc>https://jeongukdaeri.kr'+route+'</loc>';
   assert.equal(xml.body.split(loc).length-1,1,sitemap+' duplicate/missing '+route);
  }
 }
 assert.ok(hub.body.includes('기사 수급'),'must state dispatch limitations');
 assert.ok(hub.body.includes('견인'),'must distinguish road driving and towing');
});
(async()=>{
 let ok=0;
 for(const t of tasks){try{await t.fn();ok++;console.log('PASS '+t.name)}catch(e){console.error('FAIL '+t.name+': '+String(e?.message||e))}}
 console.log('BUSINESS_INTENTS_AUDIT '+ok+'/'+tasks.length);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '\n## Company and professional driver intent checks\n\n**'+ok+'/'+tasks.length+' passed**\n');
 if(ok!==tasks.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
