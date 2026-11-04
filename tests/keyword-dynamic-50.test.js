#!/usr/bin/env node
'use strict';
// Second 50 of Smart24's 100-point full-site audit.
// Test real HTTP output, not only source snippets, in addition to site-full-50.test.js.
const assert=require('node:assert/strict');
const base=new URL(process.argv[2]||'http://127.0.0.1:3000/');
const checks=[];
const samples=[
 ['01','설악산탁송','taksong','/assets/seoraksan-taksong-fares.svg'],
 ['02','오색탁송','taksong','/assets/seoraksan-taksong-fares.svg'],
 ['03','한계령소공원탁송','taksong','/assets/seoraksan-taksong-fares.svg'],
 ['04','지리산탁송','taksong','/assets/jirisan-taksong-fares.svg'],
 ['05','성삼재탁송','taksong','/assets/jirisan-taksong-fares.svg'],
 ['06','덕유산탁송','taksong','/keyword-card/deogyusan.svg'],
 ['07','육십령탁송','taksong','/keyword-card/deogyusan.svg'],
 ['08','동해안자전거길탁송','taksong','/assets/cycling-routes/eastcoast-taksong.svg'],
 ['09','경포대탁송','taksong','/assets/cycling-routes/eastcoast-taksong.svg'],
 ['10','영산강길종주탁송','taksong','/assets/cycling-routes/yeongsan-taksong.svg'],
 ['11','담양댐탁송','taksong','/assets/cycling-routes/yeongsan-taksong.svg'],
 ['12','섬진강종주탁송','taksong','/assets/cycling-routes/seomjin-taksong.svg'],
 ['13','배알도탁송','taksong','/assets/cycling-routes/seomjin-taksong.svg'],
 ['14','금강종주탁송','taksong','/assets/cycling-routes/geumgang-taksong.svg'],
 ['15','오천길종주탁송','taksong','/assets/cycling-routes/ocheon-taksong.svg'],
 ['16','낙동강길종주탁송','taksong','/assets/cycling-routes/nakdonggang-taksong.svg'],
 ['17','국토종주탁송','taksong','/assets/cycling-routes/nationwide-taksong.svg'],
 ['18','자전거길종주탁송','taksong','/assets/cycling-routes/nationwide-taksong.svg'],
 ['19','골프장대리운전','daeri','/keyword-card/golf-daeri.svg'],
 ['20','법인대리운전','daeri','/keyword-card/corporate-daeri.svg'],
 ['21','프리미엄대리운전','daeri','/keyword-card/premium-daeri.svg'],
 ['22','장거리대리운전','daeri','/keyword-card/long-daeri.svg'],
 ['23','일일기사','daeri','/keyword-card/daily-driver.svg'],
 ['24','심야대리운전','daeri','/keyword-card/night-daeri.svg'],
 ['25','렌트카탁송','taksong','/keyword-card/rent-taksong.svg'],
 ['26','렌터카탁송','taksong','/keyword-card/rent-taksong.svg'],
 ['27','사고대차탁송','taksong','/keyword-card/accident-taksong.svg'],
 ['28','서비스센터탁송','taksong','/keyword-card/service-center-taksong.svg'],
 ['29','중고차탁송','taksong','/keyword-card/usedcar-taksong.svg'],
 ['30','경매장탁송','taksong','/keyword-card/auction-taksong.svg'],
 ['31','수출단지탁송','taksong','/keyword-card/export-taksong.svg'],
 ['32','장거리탁송','taksong','/keyword-card/long-taksong.svg'],
 ['33','특장차탁송','taksong','/keyword-card/truck-taksong.svg'],
 ['34','25톤탁송','taksong','/keyword-card/truck-taksong.svg'],
 ['35','공항탁송','taksong','/keyword-card/airport-taksong.svg'],
 ['36','인천공항탁송','taksong','/keyword-card/airport-taksong.svg'],
 ['37','전국대리운전','daeri','/keyword-card/general-daeri.svg']
];
const pages=[
 ['38','/설악산탁송/','seoraksan'],
 ['39','/지리산탁송/','jirisan'],
 ['40','/special/cycling-trail-transport/','cycling'],
 ['41','/special/national-bicycle-road/','cycling'],
 ['42','/service/golf/','golf-daeri'],
 ['43','/service/corporate/','corporate-daeri'],
 ['44','/service/daily-driver/','daily-driver'],
 ['45','/service/long-distance-taksong/','long-taksong'],
 ['46','/service/heavy-truck-taksong/','truck-taksong'],
 ['47','/business/auction/','auction-taksong']
];
const get=async(path)=>{
 const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(25000)});
 return {res:response,body:await response.text()};
};
for(const [number,query,kind,image] of samples)checks.push([number,query+' matched keyword image',async()=>{
 const result=await get('/api/region-card-preview?q='+encodeURIComponent(query));
 assert.equal(result.res.status,200,query);
 assert.match(result.res.headers.get('content-type')||'',/application\/json/);
 const data=JSON.parse(result.body);
 assert.equal(data.status,'matched',query);
 assert.equal(data.cards.length,1,'exactly one service visual for '+query);
 assert.equal(data.cards[0].kind,kind,'no driver/taksong swapping '+query);
 assert.equal(data.cards[0].image,image,'wrong keyword image '+query);
 assert.ok(data.cards[0].description.includes('실제 운행완료 사진이 아닙니다')||
  data.cards[0].description.includes('실제 운행사진이 아닙니다'),'illustrative provenance '+query);
}]);
// Original mountain fare posters and existing specialist illustrations have
// deliberate image priority. Do not force a duplicate dynamic card above them.
const establishedVisuals={
 '/설악산탁송/':'/assets/seoraksan-taksong-original-fare.png',
 '/지리산탁송/':'/assets/jirisan-taksong-original-fare.png',
 '/special/cycling-trail-transport/':'/assets/cycling-routes/nationwide-taksong.svg',
 '/service/golf/':'/assets/service-golf-visual.svg',
 '/service/corporate/':'/assets/service-daeri-visual.svg',
 '/service/daily-driver/':'/assets/service-golf-visual.svg'
};
for(const [number,path,topic] of pages)checks.push([number,path+' visible topic image, original poster or expandable card',async()=>{
 const result=await get(path);
 assert.equal(result.res.status,200,path);
 const original=establishedVisuals[path];
 if(original){
  assert.ok(result.body.includes('src="'+original+'"'),path+' must visibly render its original or specialist image');
  assert.ok(!result.body.includes('id="keyword-intent-dynamic-image"'),path+' must not duplicate imagery and obscure existing fares');
  assert.ok(result.body.includes('width:100%')&&result.body.includes('height:auto'),path+' image must remain mobile responsive');
  if(path==='/설악산탁송/'||path==='/지리산탁송/')
   assert.ok(result.body.includes('fetchpriority="high"'),path+' original fare image must load first');
  return;
 }
 assert.match(result.body,/id="keyword-intent-dynamic-image"/,path);
 assert.match(result.body,/class="keyword-image-enlarge"/,path);
 assert.match(result.body,/width:100%;height:auto/,path);
 const exp=topic==='cycling'?'/assets/cycling-routes/nationwide-taksong.svg':'/keyword-card/'+topic+'.svg';
 assert.ok(result.body.includes('href="'+exp+'"'),path+' links the matching service image');
 // Below-the-fold keyword cards are lazy by design; do not compete with the hero image.
 assert.ok(result.body.includes('loading="lazy"'),path+' avoids delaying first screen imagery');
}]);
checks.push(['48','Every mountain subroute, cycling itinerary and outside-area driving page matches its correct visual',async()=>{
 const r=await get('/keyword-card/golf-daeri.svg');
 assert.equal(r.res.status,200);assert.match(r.res.headers.get('content-type')||'',/image\/svg\+xml/);
 assert.ok(r.body.includes('<svg')&&r.body.includes('골프장대리운전')&&r.body.includes('1811-4294'));
 assert.ok(!r.body.includes('강릉스마트'),'never retain foreign-city card label');
 const specific=[
  ['/special/osaek/','seoraksan'],['/special/hangyeryeong/','seoraksan'],
  ['/special/baekdamsa/','seoraksan'],['/special/namgyori/','seoraksan'],
  ['/special/seoraksan/','seoraksan'],
  ['/special/jirisan/','jirisan'],['/special/seongjung-jongju/','jirisan'],
  ['/special/seongdae-jongju/','jirisan'],['/special/hwajung-jongju/','jirisan'],
  ['/special/hwadae-jongju/','jirisan'],['/special/jungsanri/','jirisan'],
  ['/special/baekmudong/','jirisan'],
  ['/special/national-cycling-tour/','cycling'],
  ['/special/pension-daeri/','pension-daeri'],['/special/valley-daeri/','valley-daeri'],
  ['/special/outskirts-service/','outskirts-daeri'],
  ['/special/camping-car-transport/','campingcar-taksong'],
  ['/special/truck-transport/','truck-taksong'],
  ['/special/24-hour-service/','night-taksong'],
  ['/special/baekdudaegan/','baekdudaegan-taksong']
 ];
 for(const [path,topic] of specific){
  const p=await get(path);assert.equal(p.res.status,200,path);
  assert.ok(p.body.includes('id="keyword-intent-dynamic-image"'),path+' missing visible keyword image');
  const expected=topic==='seoraksan'?'/assets/seoraksan-taksong-fares.svg':
   topic==='jirisan'?'/assets/jirisan-taksong-fares.svg':
   topic==='cycling'?'/assets/cycling-routes/nationwide-taksong.svg':'/keyword-card/'+topic+'.svg';
  assert.ok(p.body.includes('href="'+expected+'"'),path+' should have '+expected);
  const kind=(topic.endsWith('-daeri'))?'daeri':'taksong';
  assert.ok(p.body.includes('data-kind="'+kind+'"'),path+' must show '+kind+' not wrong industry');
 }
 for(const [q,topic] of [
  ['펜션대리운전','/keyword-card/pension-daeri.svg'],
  ['계곡대리운전','/keyword-card/valley-daeri.svg'],
  ['외곽대리운전','/keyword-card/outskirts-daeri.svg'],
  ['캠핑카탁송','/keyword-card/campingcar-taksong.svg'],
  ['백두대간탁송','/keyword-card/baekdudaegan-taksong.svg']
 ]){
  const data=JSON.parse((await get('/api/region-card-preview?q='+encodeURIComponent(q))).body);
  assert.equal(data.status,'matched',q);
  assert.equal(data.cards[0].image,topic,q);
 }
 const cyclingTour=await get('/special/national-cycling-tour/');
 assert.ok(!cyclingTour.body.includes('smart24-taksong-brand.webp'),'national bicycle tour cannot show Gangneung-specific card');
}]);
checks.push(['49','Combined region + purpose yields matching local service image (not another locality)',async()=>{
 for(const [query,kind,region,keyword,phone] of [
  ['부산렌트카탁송','taksong','부산광역시','렌트카탁송','1811-4294'],
  ['대구법인대리운전','daeri','대구광역시','법인대리운전','1811-4294'],
  ['서울강남골프장대리운전','daeri','서울특별시 강남구','골프장대리운전','1811-4294'],
  ['제주도렌터카탁송','taksong','제주특별자치도','렌트카탁송','1877-5245']
 ]){
  const r=await get('/api/region-card-preview?q='+encodeURIComponent(query));
  const d=JSON.parse(r.body);
  assert.equal(d.status,'matched',query);assert.equal(d.region,region,query);
  assert.equal(d.cards.length,1);assert.equal(d.cards[0].kind,kind);
  assert.ok(d.cards[0].label.includes(keyword)&&d.cards[0].image.includes('/keyword-card/'),query);
  assert.equal(d.cards[0].phone,phone);
  const svg=await get(d.cards[0].image);
  assert.equal(svg.res.status,200,query);assert.match(svg.res.headers.get('content-type')||'',/image\/svg\+xml/);
  assert.ok(svg.body.includes(keyword)&&svg.body.includes(phone),'image itself must include correct regional service name and telephone');
 }
 const ambiguous=JSON.parse((await get('/api/region-card-preview?q='+encodeURIComponent('광주렌트카탁송'))).body);
 assert.equal(ambiguous.status,'ambiguous');
 assert.equal(ambiguous.cards.length,0);
 assert.ok(ambiguous.candidates.some(x=>x.query.includes('렌트카탁송')),'region choice retains service purpose');
 const h=await get('/');assert.equal(h.res.status,200);
 assert.ok(h.body.includes('id="dynamic-service-card-search-20261103"'));
 const script=await get('/assets/region-card-preview.js');
 assert.ok(script.body.includes("'/keyword-card/'")&&script.body.includes("'/assets/'"));
}]);
checks.push(['50','Non-keyword records and ambiguous city stay unmodified',async()=>{
 const history=await get('/reviews/history/');
 assert.equal(history.res.status,200);
 assert.ok(!history.body.includes('id="keyword-intent-dynamic-image"'),'do not imply record photos');
 const ambiguous=await get('/api/region-card-preview?q='+encodeURIComponent('광주'));
 const data=JSON.parse(ambiguous.body);
 assert.equal(data.status,'ambiguous');assert.equal(data.cards.length,0);
}]);
async function main(){
 assert.equal(checks.length,50,'must have exactly 50 new keyword-specific checks');
 let passed=0;const errors=[];
 for(const [number,label,test] of checks){
  try{await test();passed++;console.log('PASS '+number+' '+label)}
  catch(error){const e=String(error?.message||error);console.error('FAIL '+number+' '+label+': '+e);errors.push(number+' '+label+' - '+e)}
 }
 console.log('SMART24_KEYWORD_50_AUDIT '+passed+'/50 passed; failed '+errors.length);
 if(process.env.GITHUB_STEP_SUMMARY){
  const fs=require('node:fs');
  const lines=['## Smart24 keyword-specific image 50-point audit','','| # | Keyword or page | Result |','|---:|---|---|'];
  for(const [number,label] of checks)lines.push('| '+number+' | '+label+' | '+(errors.some(e=>e.startsWith(number+' '))?'FAIL':'PASS')+' |');
  lines.push('','**'+passed+'/50 passed**','');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
 if(errors.length)process.exitCode=1;
}
main().catch(err=>{console.error(err);process.exitCode=1});
