'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {setTimeout:delay}=require('node:timers/promises');
const fs=require('node:fs');
const path=require('node:path');
const files=fs.readdirSync(path.join(__dirname,'../data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort();
assert.equal(files.length,17,'all 17 regional datasets must exist');
const regions=[];
for(const file of files){const doc=require('../data/legal-regions/'+file);for(const full_name of doc.full_names){const parts=full_name.split(' ');regions.push({full_name,name:parts.at(-1),slug:'area-'+(regions.length+1),level:parts.length===1?'시도':'other'});}}

// Regression: place-name substrings in venue names must not be presented as local dispatches.
const {matchingHistoryRegion,publicPlace}=require('../lib/regional-history-evidence');
const record=(dep,dest)=>({rawDeparture:dep,rawDestination:dest});
const region=(name,full_name,level)=>({name,full_name,level});
assert.equal(matchingHistoryRegion(record('탁/경기 김포시 고촌읍','의정부산곡동/톨포'),region('부산광역시','부산광역시','시도'),regions),false,'의정부산곡동 is not 부산');
assert.equal(matchingHistoryRegion(record('강화읍서울깍두기','김포시 장기동'),region('서울특별시','서울특별시','시도'),regions),false,'서울깍두기 is not a 서울 departure');
assert.equal(matchingHistoryRegion(record('장기동속초명가','김포하성면'),region('속초시','강원특별자치도 속초시','시'),regions),false,'속초명가 is not a 속초 destination');
assert.equal(matchingHistoryRegion(record('탁/설악산소공원주차장','오색주차장/톨포'),region('원주시','강원특별자치도 원주시','시'),regions),false,'공원주차장 is not 원주');
assert.equal(matchingHistoryRegion(record('탁/양평읍','목포항국제여객터미널/톨포'),region('포항시','경상북도 포항시','시'),regions),false,'목포항 is not 포항');
assert.equal(matchingHistoryRegion(record('대리/부산연산동','부산장전동'),region('부산광역시','부산광역시','시도'),regions),true,'real 부산 names remain eligible');
assert.equal(matchingHistoryRegion(record('탁/기장군반룡산단','연수구 능허대로/톨포'),region('기장군','부산광역시 기장군','군'),regions),true,'explicit 기장군 record stays linked');
// Public and Excel records cannot turn same-suffix neighborhoods into local achievements.
const sokchoGyodong=region('교동','강원특별자치도 속초시 교동','동');
const gangneungGyodong=region('교동','강원특별자치도 강릉시 교동','동');
const busanToseong=region('토성동','부산광역시 서구 토성동','동');
const busanSeogu=region('서구','부산광역시 서구','구');
assert.equal(matchingHistoryRegion(record('방교동','광산구'),sokchoGyodong,regions),false,'Banggyo-dong must not be presented as Sokcho Gyo-dong');
assert.equal(matchingHistoryRegion(record('강릉교동.명륜로83','평택시'),sokchoGyodong,regions),false,'Gangneung Gyo-dong must not be assigned to Sokcho');
assert.equal(matchingHistoryRegion(record('강화교동면대룡시장','서울'),sokchoGyodong,regions),false,'Ganghwa Gyodong-myeon must not be matched to Sokcho');
assert.equal(matchingHistoryRegion(record('교동','대구'),sokchoGyodong,regions),false,'unqualified Gyo-dong is not enough');
assert.equal(matchingHistoryRegion(record('속초시 교동','대구'),sokchoGyodong,regions),true,'properly qualified Sokcho Gyo-dong remains visible');
assert.equal(matchingHistoryRegion(record('강릉교동','대구'),gangneungGyodong,regions),true,'qualified Gangneung Gyo-dong remains visible');
assert.equal(matchingHistoryRegion(record('대명동','부산서구 토성동'),busanToseong,regions),true,'same-field Busan Seo-gu Toseong-dong is a real local match');
assert.equal(matchingHistoryRegion(record('부산서구 토성동','대구'),busanSeogu,regions),true,'Busan district is qualified');
assert.equal(matchingHistoryRegion(record('인천서구 토성동','대구'),busanToseong,regions),false,'other city Seo-gu is never Busan');
assert.equal(matchingHistoryRegion(record('부산','서구 토성동'),busanToseong,regions),false,'do not combine province from departure with district from destination');

assert.equal(publicPlace('의정부산곡동'),'지역 비공개','do not publicly label Uijeongbu as Busan');
assert.equal(publicPlace('장기동속초명가'),'지역 비공개','do not publicly label restaurant as Sokcho');
assert.equal(publicPlace('설악산소공원주차장'),'지역 비공개','do not publicly label parking lot as Wonju');
assert.equal(publicPlace('목포항국제여객터미널'),'목포','known Mokpo seaport name remains visible');
assert.equal(publicPlace('탁/김해공항T1'),'김해공항(부산 강서구)','Gimhae airport is not Gimhae city');
assert.equal(publicPlace('인천공항 출발 → 부산남산동 도착'),'인천','public place shows the first origin rather than a later destination');

// An observed Yeti User-Agent is useful diagnostic evidence but never an authenticated bot identity.
const {observeCrawlerRequest}=require('../lib/crawler-observability');
const {EventEmitter: CrawlerEmitter}=require('node:events');
const observedCrawlerLogs=[];
const claimedReq={method:'GET',url:'/taksong/busan/?utm_source=private-test',headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',cookie:'session=private',referer:'https://private.example/'}};
const claimedRes=new CrawlerEmitter();claimedRes.statusCode=403;
assert.equal(observeCrawlerRequest(claimedReq,claimedRes,line=>observedCrawlerLogs.push(line)),true);
claimedRes.emit('finish');
assert.equal(observedCrawlerLogs.length,1);
assert.ok(observedCrawlerLogs[0].startsWith('SEO_YETI_UA '));
assert.ok(observedCrawlerLogs[0].includes('"path":"/taksong/busan/"'));
assert.ok(observedCrawlerLogs[0].includes('"status":403'));
for(const forbidden of ['private-test','session=private','private.example','Mozilla/5.0'])assert.ok(!observedCrawlerLogs[0].includes(forbidden),'crawler output must not contain private query, cookie, referrer, or raw UA');
const syntheticRes=new CrawlerEmitter();syntheticRes.statusCode=200;
assert.equal(observeCrawlerRequest({...claimedReq,headers:{...claimedReq.headers,'x-smart24-monitor':'github-health-probe'}},syntheticRes,line=>observedCrawlerLogs.push(line)),false);
syntheticRes.emit('finish');
assert.equal(observedCrawlerLogs.length,1,'simulated GitHub Yeti requests must not appear in diagnostics');
const normalRes=new CrawlerEmitter();normalRes.statusCode=200;
assert.equal(observeCrawlerRequest({method:'GET',url:'/',headers:{'user-agent':'Mozilla/5.0'}},normalRes,line=>observedCrawlerLogs.push(line)),false);
normalRes.emit('finish');
assert.equal(observedCrawlerLogs.length,1,'ordinary visitors are not logged');

const port=30000+Math.floor(Math.random()*10000);
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port),PUBLIC_HOST:'example.com'},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',d=>stderr+=d);
async function get(p){return fetch('http://127.0.0.1:'+port+p)}
(async()=>{
 try{
  for(let i=0;i<50;i++){try{const r=await get('/health');if(r.ok)break}catch{}await delay(100)}
  for(const kind of ['daeri','taksong']){
   const hub=await (await get('/'+kind+'/')).text();
   assert.ok(hub.includes('id="vehicle-guide"'),'national vehicle guide anchor');
   for(const fleet of ['domestic','imported']){
    assert.ok(hub.includes('/assets/vehicles/'+fleet+'-fleet-1811.webp'),'fleet image on service hub');
    const asset=await get('/assets/vehicles/'+fleet+'-fleet-1811.webp');
    assert.equal(asset.status,200,'fleet asset served');
    assert.ok(asset.headers.get('content-type').includes('image/webp'));
   }
  }
  for(const kind of ['daeri','taksong']){
   const route=await get('/route-search/?from='+encodeURIComponent('대구')+'&service='+kind);
   assert.equal(route.status,200);
   const html=await route.text();
   assert.ok(html.includes('대구에서 서울'));
   assert.ok(html.includes('/routes/'+kind+'/'),'search results now link to indexable route pages');
   assert.ok(html.includes('page=2'));
   const direct=await (await get('/route-search/?from='+encodeURIComponent('부산')+'&to='+encodeURIComponent('인천')+'&service='+kind)).text();
   assert.ok(direct.includes('부산에서 인천'));
   assert.ok(direct.includes('부산인천'));
   const second=await (await get('/route-search/?from='+encodeURIComponent('대구')+'&page=2&service='+kind)).text();
   assert.notEqual(html,second);
  }
  const routeArea=n=>regions.find(r=>r.full_name===n).slug;
  const busanId=routeArea('부산광역시'),incheonId=routeArea('인천광역시'),daeguId=routeArea('대구광역시');
  const qualityRoutes=[
    {from:busanId,to:incheonId,heading:'부산에서 인천 탁송: 인수 지역에 따라 준비할 내용'},
    {from:routeArea('서울특별시'),to:busanId,heading:'서울에서 부산 탁송: 장거리 인계 준비'},
    {from:routeArea('부산광역시 기장군'),to:daeguId,heading:'기장군에서 대구 탁송: 읍별 인수 위치와 기사 접근'},
    {from:'airport-gimhae',to:incheonId,heading:'김해공항에서 인천 탁송: 공항 차량 인수 안내'}
  ];
  for(const r of qualityRoutes){
    const url='/routes/taksong/'+r.from+'/'+r.to+'/';
    const res=await get(url),body=await res.text();
    assert.equal(res.status,200,'priority route returns HTTP 200 '+url);
    assert.ok(body.includes(r.heading),'priority route must have unique helpful local guidance '+url);
    assert.ok(body.includes('/routes/reviewed/'),'priority guidance distinguishes verified ride history '+url);
    assert.ok(body.includes('rel="canonical" href="https://example.com'+url+'"'),'route has own canonical');
    assert.equal((body.match(/<h1(?:\\s|>)/g)||[]).length,1,'route should have one H1');
  }

  for(const kind of ['daeri','taksong']){
   const url='/routes/'+kind+'/'+busanId+'/'+incheonId+'/';
   const response=await get(url),html=await response.text();
   assert.equal(response.status,200);assert.ok(!/noindex/.test(response.headers.get('x-robots-tag')||''));
   assert.ok(html.includes('부산에서 인천'));assert.ok(html.includes('https://example.com'+url));
   assert.ok(!html.includes('content="noindex'));assert.ok(html.includes('auto=1'));
   assert.ok(html.includes('부산인천'+(kind==='daeri'?'대리운전':'탁송')),'joined route keywords must be rendered');
   assert.equal((await get('/routes/'+kind+'/'+busanId+'/'+busanId+'/')).status,404);
   const map=await (await get('/sitemap-route-'+kind+'.xml')).text();
   const urls=[...map.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
   assert.ok(urls.length<50000&&urls.length>41000);assert.equal(new Set(urls).size,urls.length);
   assert.ok(urls.includes('https://example.com'+url));
   const list=await (await get('/routes/'+kind+'/'+daeguId+'/?page=2')).text();assert.ok(list.includes('2 /'));assert.ok(list.includes('?page=2'));
   assert.ok(list.includes('content="noindex,nofollow"'),'massive route directories must not consume crawler budget');
  }
  // Nationwide shard coverage, Naver XML limits, airport aliases and on-demand combinations.
  for(const kind of ['daeri','taksong']){
   const index=await get('/sitemap-nationwide-route-'+kind+'.xml');
   const indexXml=await index.text();
   assert.equal(index.status,200);
   assert.ok(indexXml.includes('<sitemapindex'));
   assert.equal((indexXml.match(/<sitemap><loc>/g)||[]).length,17);
   for(const code of ['02','15']){
    const response=await get('/sitemap-nationwide-route-'+kind+'-'+code+'.xml');
    const xml=await response.text();
    assert.equal(response.status,200,'national sitemap shard '+code);
    const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
    assert.ok(urls.length>1000 && urls.length<50000,'Naver 50,000 URL limit '+code);
    assert.ok(Buffer.byteLength(xml)<10000000,'Naver 10 MB limit '+code);
    assert.equal(new Set(urls).size,urls.length,'no duplicate routes in shard');
    assert.ok(urls.some(x=>x.includes('/routes/'+kind+'/area-') && x.includes('/area-')),'two-way routes in shard');
    if(code==='02')assert.ok(urls.some(x=>x.includes('/airport-gimhae/')),'Gimhae airport routes');
   }
   const airportSearch=await (await get('/route-search/?from='+encodeURIComponent('김해공항')+'&to='+encodeURIComponent('서울')+'&service='+kind)).text();
   assert.ok(airportSearch.includes('/routes/'+kind+'/airport-gimhae/'+routeArea('서울특별시')+'/'),'airport searches use SEO route page');
   const fromAirport=await get('/routes/'+kind+'/airport-gimhae/'+routeArea('서울특별시')+'/');
   const airportHtml=await fromAirport.text();
   assert.equal(fromAirport.status,200);
   assert.ok(airportHtml.includes('김해공항에서 서울'));
   assert.ok(airportHtml.includes('부산광역시 강서구 공항진입로 108'));
   assert.ok(airportHtml.includes('auto=1'));
   assert.ok(airportHtml.includes('index,follow'));
   const airportHub=await get('/routes/gimhae-airport/');
   assert.equal(airportHub.status,200);
   const airportDirectory=await (await get('/routes/'+kind+'/airport-gimhae/')).text();
   assert.ok(airportDirectory.includes('noindex,nofollow'));
  }

  // Region-specific source posts and visible homepage hub must not become keyword-only dead ends.
  const seoHome=await (await get('/')).text();
  assert.ok(seoHome.includes('id="home-priority-regions"'),'homepage links to priority regional service pages');
  assert.ok(seoHome.includes('/taksong/busan/'),'homepage has direct Busan taksong link');
  assert.ok(seoHome.includes('/daeri/daegu/'),'homepage has direct Daegu driver link');
  const crosslinkBusanTaksong=await (await get('/taksong/busan/')).text();
  assert.ok(crosslinkBusanTaksong.includes('id="regional-blog-links"'),'Busan region has related published Naver blog posts');
  assert.ok(crosslinkBusanTaksong.includes('blog.naver.com/wjdtnr4757/'),'regional blog links use the operator blog');
  assert.ok(crosslinkBusanTaksong.includes('/reviews/history/'),'regional page links verified ride history');
  const crosslinkBusanDaeri=await (await get('/daeri/busan/')).text();
  assert.ok(crosslinkBusanDaeri.includes('id="regional-blog-links"'),'Busan driver page connects published blog articles');
  assert.ok(crosslinkBusanDaeri.includes('blog.naver.com/wjdtnr4757/'),'driver page uses operator blog');
  assert.ok(!crosslinkBusanDaeri.includes('blog.naver.com/eom4757/'),'old unrelated blog ID must never leak');
  assert.ok(!crosslinkBusanDaeri.includes('부산동부권탁송 기장군탁송'),'taksong article must not be misclassified as daeri via brand name');
  assert.ok(!crosslinkBusanDaeri.includes('대리운전 이용 목적</h2>'),'priority regional pages should avoid repeated keyword-dump sections');
  const gimhaeDaeriQuality=await (await get('/daeri/gyeongnam/gimhae-si/')).text();
  assert.ok(!gimhaeDaeriQuality.includes('김해공항탁송 부산강서구'),'Gimhae Airport in Busan is not evidence for Gimhae city driver services');
  const busanTaksongQuality=await (await get('/taksong/busan/')).text();
  assert.ok(busanTaksongQuality.includes('부산탁송'),'taksong regional page still links a relevant operator post');
  assert.ok(!busanTaksongQuality.includes('차량탁송 이용 목적</h2>'),'priority taksong region avoids keyword-dump section');

  // Priority regions lead with their own factual source evidence, not mass route keywords.
  const sokchoGyodongPage=await get('/taksong/gangwon/sokcho-si/gyo-dong/');
  assert.equal(sokchoGyodongPage.status,200,'Sokcho Gyo-dong page exists');
  const sokchoGyodongHtml=await sokchoGyodongPage.text();
  assert.ok(!sokchoGyodongHtml.includes('방교동 → 광산구'),'another citys Banggyo-dong ride cannot masquerade as Sokcho ride');
  assert.ok(!sokchoGyodongHtml.includes('강릉교동'),'Gangneung ride cannot masquerade as Sokcho ride');

  const verifiedBusan=await (await get('/daeri/busan/')).text();
  assert.ok(verifiedBusan.includes('id="priority-verified-rides"'),'priority page needs visible real completed dispatch evidence');
  assert.ok(verifiedBusan.includes('사용자 확인 공개 운행')||verifiedBusan.includes('기존 완료 운행기록'),'priority page identifies confirmed record source');
  assert.ok(verifiedBusan.indexOf('id="priority-verified-rides"')<verifiedBusan.indexOf('출발 전국 주요 구간'),'real evidence precedes generic nationwide route links');
  const verifiedGangwon=await (await get('/taksong/gangwon/')).text();
  assert.ok(verifiedGangwon.includes('id="priority-verified-rides"'),'Gangwon priority page has factual record section');
  const unverifiedLocality=await (await get('/taksong/jeonbuk/muju-gun/')).text();
  assert.ok(unverifiedLocality.includes('id="priority-verified-rides"'),'Muju priority page explains evidence status');
  assert.ok(!unverifiedLocality.includes('다른 지역에서 확인된 탁송 운행후기'),'priority landing must not use unrelated ride as local case');
  // Missing region-specific history must show only verified nationwide reviews, never a fabricated local ride.
  const localityWithoutRecord=await get('/taksong/busan/gijang-gun/gijang-eup/dongbu-ri/');
  assert.equal(localityWithoutRecord.status,200,'rural locality must resolve');
  const localityHtml=await localityWithoutRecord.text();
  assert.ok(localityHtml.includes('동부리 출발·도착 운행 참고 후기'));
  assert.ok(localityHtml.includes('다른 지역에서 확인된 탁송 운행후기'));
  assert.ok(localityHtml.includes('이 지역에서 운행했다는 뜻이 아니며'));
  assert.ok(/href="\/reviews\/[a-f0-9]{16}\//.test(localityHtml),'fallback must link to verified published reviews');
  assert.ok(!localityHtml.includes('이 지역의 확인된 완료 운행 기록은 아직 없습니다. 확인된 사례가 등록되면'));
  // Only completed, directional dispatch records should enrich SEO route pages.
  const verifiedRouteIndex=await get('/routes/reviewed/');
  const verifiedRouteHtml=await verifiedRouteIndex.text();
  assert.equal(verifiedRouteIndex.status,200);
  assert.ok(verifiedRouteHtml.includes('실제 운행완료 내역으로 확인된 전국 출발·도착 구간'));
  assert.ok(verifiedRouteHtml.includes('2,591건'));
  assert.ok(verifiedRouteHtml.includes('김해공항에서 인천 자동차탁송'));
  const reviewedXmlResponse=await get('/sitemap-reviewed-routes.xml');
  const reviewedXml=await reviewedXmlResponse.text();
  assert.equal(reviewedXmlResponse.status,200);
  const reviewedUrls=[...reviewedXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);
  assert.ok(reviewedUrls.length>30&&reviewedUrls.length<2000,'source-backed route sitemap must be curated');
  assert.equal(reviewedUrls.length,new Set(reviewedUrls).size);
  const provenAirportRoute='/routes/taksong/airport-gimhae/'+incheonId+'/';
  assert.ok(reviewedUrls.includes('https://example.com'+provenAirportRoute),'source confirms Gimhae Airport to Incheon transport');
  const provenAirportHtml=await (await get(provenAirportRoute)).text();
  assert.ok(provenAirportHtml.includes('실제 운행완료 후기'));
  assert.ok(provenAirportHtml.includes('150,000원'),'source fare, not a made-up quote');
  assert.ok(provenAirportHtml.includes('/reviews/history/excel-'),'visible completed-record citation');
  const originalRecords=require('../data/ride-history.json');
  const originalIndex=originalRecords.findIndex(x=>x.departure.includes('김해공항')&&x.destination.includes('인천공항')&&x.fare==='150,000원');
  assert.ok(originalIndex>=0);
  const referenced='/reviews/history/excel-'+String(originalIndex+1).padStart(4,'0')+'/';
  assert.ok(provenAirportHtml.includes(referenced));
  const originalHtml=await (await get(referenced)).text();
  assert.ok(originalHtml.includes(provenAirportRoute),'completed record links back to its route');
  const falseGeo=require('../lib/verified-route-index')({
   regions,
   historicalRides:[{id:'false',date:'2026-10-01',service:'taksong',fare:'40,000원',rawDeparture:'장성읍',rawDestination:'광주효천1중흥'}]
  });
  assert.equal(falseGeo.entries.length,0,'ambiguous Gwangju cannot be assigned to Gyeonggi Gwangju city');
  assert.ok((await (await get('/robots.txt')).text()).includes('sitemap-reviewed-routes.xml'));
  // Nationwide local-intent SEO must distinguish transport and designated-driver services.
  const busanTaksong=await (await get('/taksong/busan/')).text();
  assert.ok(busanTaksong.includes('공업사탁송'),'repair-shop transport intent');
  assert.ok(busanTaksong.includes('폐차장탁송'),'scrapyard transport intent');
  assert.ok(busanTaksong.includes('폐차산업탁송'),'scrapyard industry transport intent');
  assert.ok(busanTaksong.includes('자동차검사소탁송'),'inspection transport intent');
  assert.ok(busanTaksong.includes('블랙박스탁송'),'black-box transport intent');
  const busanDaeri=await (await get('/daeri/busan/')).text();
  assert.ok(busanDaeri.includes('골프장대리운전'),'golf designated-driver intent');
  assert.ok(busanDaeri.includes('법인대리운전'),'corporate designated-driver intent');
  assert.ok(!busanDaeri.includes('공업사탁송'),'no transport keyword leakage');
  // Same-name regions should have different natural search titles, descriptions and canonicals.
  const headValue=(html,tag)=>html.match(tag)?.[1]||'';
  for(const [first,second] of [
    ['/daeri/seoul/jung-gu/','/daeri/daegu/jung-gu/'],
    ['/taksong/gangwon/goseong-gun/','/taksong/gyeongnam/goseong-gun/'],
    ['/daeri/gwangju/','/daeri/gyeonggi/gwangju-si/'],
    ['/daeri/seoul/jung-gu/fare/','/daeri/daegu/jung-gu/fare/']
  ]){
    const ha=await (await get(first)).text(),hb=await (await get(second)).text();
    assert.ok(ha.includes('rel="canonical" href="https://example.com'+first+'"'),first+' canonical');
    assert.ok(hb.includes('rel="canonical" href="https://example.com'+second+'"'),second+' canonical');
    const aTitle=headValue(ha,/<title>([^<]+)<\/title>/),bTitle=headValue(hb,/<title>([^<]+)<\/title>/);
    const aDesc=headValue(ha,/<meta name="description" content="([^"]+)"/),bDesc=headValue(hb,/<meta name="description" content="([^"]+)"/);
    assert.ok(aTitle&&bTitle&&aTitle!==bTitle,first+' and '+second+' must not have duplicated titles');
    assert.ok(aDesc&&bDesc&&aDesc!==bDesc,first+' and '+second+' must not have duplicated descriptions');
  }
  const busanDistrict=await (await get('/taksong/busan/sasang-gu/')).text();
  assert.ok(busanDistrict.includes('공업사탁송'),'city-borough service transport keeps relevant business intent');
  assert.ok(!busanDistrict.includes('폐차산업탁송'),'broad province-only keyword not stuffed into every borough');
  for(const [source,destination] of [['/daeri?from=naver','/daeri/?from=naver'],['/taksong','/taksong/']]){
   const redirect=await fetch('http://127.0.0.1:'+port+source,{redirect:'manual'});
   assert.equal(redirect.status,301,'noncanonical nationwide hub must redirect');
   assert.equal(redirect.headers.get('location'),destination);
  }
  // Place-verified scrapyard names must appear only on matching transport pages.
  const incheonTaksong=await (await get('/taksong/incheon/')).text();
  assert.ok(incheonTaksong.includes('인천폐차사업소탁송'),'exact Naver Place name used for scrap transport');
  assert.ok(incheonTaksong.includes('m.place.naver.com/place/11785307/home'),'Naver Place business source linked');
  assert.ok(!(await (await get('/daeri/incheon/')).text()).includes('인천폐차사업소탁송'),'scrapyard intent not on daeri');
  assert.ok(!busanTaksong.includes('인천폐차사업소탁송'),'scrapyard name not leaked to unrelated province');
  const namdongTaksong=await (await get('/taksong/incheon/namdong-gu/')).text();
  assert.ok(namdongTaksong.includes('인천폐차사업소탁송'),'matching borough page includes exact shop name');
  for(const route of ['/business/','/business/rental-car/','/business/used-car/','/business/auction/','/business/scrapyard/','/business/export-port/']){
   const response=await get(route);assert.equal(response.status,200,'business landing route '+route);
   const html=await response.text();
   assert.ok(html.includes('rel="canonical" href="https://jeongukdaeri.kr'+route+'"'),'main production canonical for '+route);
   assert.ok(!html.includes('up.railway.app'),'old auxiliary-host canonical must not persist '+route);
  }
  // Place names may be published only with a traceable source; registry leads stay private.
  const verifiedShops=require('../data/verified-scrapyards.json').shops;
  const researchQueue=require('../data/scrapyard-place-audit-queue.json').candidates;
  assert.equal(verifiedShops.length,2,'two separately cross-checked Naver Place-linked scrapyards');
  assert.equal(researchQueue.length,69,'69 nationwide association leads awaiting individual Place checks');
  assert.equal(new Set(verifiedShops.map(x=>x.placeUrl.split('/place/')[1]?.split('/')[0])).size,verifiedShops.length,'unique Naver Place IDs');
  assert.ok(verifiedShops.every(x=>x.placeVerified===true&&x.verificationMethod&&x.verificationSourceUrl&&x.regionFullNames.length),'every published place has evidence and precise area');
  assert.ok(researchQueue.every(x=>x.placeStatus==='pending'&&x.placeUrl===null&&x.placeName===null),'unverified candidates must never be published');
  const gyeonggiScrap=await (await get('/taksong/gyeonggi/')).text();
  assert.ok(gyeonggiScrap.includes('굿바이카탁송'),'verified Yangju business shown in Gyeonggi transport');
  assert.ok(gyeonggiScrap.includes('36326967/home'),'actual linked Naver Place ID shown');
  const yangjuScrap=await (await get('/taksong/gyeonggi/yangju-si/')).text();
  assert.ok(yangjuScrap.includes('굿바이카탁송'),'matching city receives verified shop keyword');
  assert.ok(!busanTaksong.includes('굿바이카탁송'),'unrelated region must not inherit verified shop name');
  assert.ok(!(await (await get('/daeri/gyeonggi/')).text()).includes('굿바이카탁송'),'scrapyard intent must not leak to driver service');
  assert.ok(!gyeonggiScrap.includes('정선폐차장탁송'),'unverified association search leads never render on regional pages');
  const scrapLanding=await (await get('/business/scrapyard/')).text();
  assert.ok(scrapLanding.includes('인천폐차사업소탁송'),'scrapyard hub includes verified name');
  assert.ok(scrapLanding.includes('굿바이카탁송'),'scrapyard hub includes second Naver Place-linked name');
  assert.ok(scrapLanding.includes('36326967/home'),'scrapyard hub links independent Naver Place ID');
  assert.ok(!scrapLanding.includes('삼광종합폐차탁송'),'pending candidates never leak to public hub');
  assert.ok(scrapLanding.includes('주행 가능한 차량'),'scrapyard hub distinguishes drivable vehicle transport');
  // Shared layout must preserve exactly one page heading with and without a body H1.
  for(const route of ['/taksongdaeri/','/reviews/','/recruit/taksong/','/taksong/busan/']){
   const response=await get(route);assert.equal(response.status,200);
   assert.equal(((await response.text()).match(/<h1(?:\s|>)/gi)||[]).length,1,route+' must have exactly one H1');
  }
  for(const [source,target] of [['/index.html','/'],['/daeri/index.html?ref=a','/daeri/?ref=a'],['/taksong/index.html','/taksong/']]){
   const response=await fetch('http://127.0.0.1:'+port+source,{redirect:'manual'});assert.equal(response.status,301);assert.equal(response.headers.get('location'),target);
  }
  for(const kind of ['daeri','taksong']){
   const hub=await (await get('/'+kind+'/')).text();
   assert.ok(hub.includes('id="reservation-guide"'));
   assert.ok(hub.includes('href="/fare/?service='+kind+'"'));
   assert.ok(hub.includes('href="/reviews/history/?kind='+kind+'"'));
  }
  for(const service of ['golf','daily-driver','corporate','daeri','taksong']){
   const html=await (await get('/service/'+service+'/')).text();
   const kind=service==='taksong'?'taksong':'daeri';
   assert.ok(html.includes('href="/'+kind+'/#reservation-guide"'));
   assert.ok(html.includes('href="/reviews/history/?kind='+kind+'"'));
  }
  const quoteHtml=await (await get('/fare/')).text();
  assert.ok(quoteHtml.includes('href="/reviews/history/?kind=taksong"'));
  assert.ok(quoteHtml.includes('href="/reviews/history/?kind=daeri"'));
  const recordHtml=await (await get('/reviews/history/excel-0001/')).text();
  assert.ok(recordHtml.includes('class="service-journey"'));
  assert.ok(recordHtml.includes('2026-10-16'));
  assert.ok(recordHtml.includes('70,000원'));
  assert.ok(recordHtml.includes('2배 이상의 금액'));
  assert.ok(recordHtml.includes('100% 배차·운행완료'));
  assert.ok(recordHtml.includes('자료에 예약 여부') ,'do not invent booking status');
  const gyeongsan=await (await get('/taksong/gyeongbuk/gyeongsan-si/')).text();
  assert.ok(gyeongsan.includes('실제 완료 운행내역에서 작성한 후기'));
  assert.ok(gyeongsan.includes('excel-0001/'),'region-specific reviewed historical dispatch linked');

  // Regional review links must point to published records with real IDs.
  let regionalReviewCount=0;
  for(const route of ['/daeri/incheon/','/daeri/busan/','/daeri/seoul/','/taksong/busan/']){
   const regionalHtml=await (await get(route)).text();
   assert.ok(!regionalHtml.includes('/reviews/undefined/'),route+' must not link to undefined');
   const reviewLinks=[...new Set([...regionalHtml.matchAll(new RegExp('href="(/reviews/[a-f0-9]{16}/)"','g'))].map(m=>m[1]))];
   regionalReviewCount+=reviewLinks.length;
   for(const target of reviewLinks.slice(0,2))assert.equal((await get(target)).status,200,route+' -> '+target);
  }
  assert.ok(regionalReviewCount>0,'known regional samples must link to published reviews');
  const rssResponse=await get('/rss.xml'),rssXml=await rssResponse.text();
  assert.equal(rssResponse.status,200);
  const feedItems=[...rssXml.matchAll(new RegExp('<item>([^]*?)</item>','g'))].map(m=>m[1]);
  assert.ok(feedItems.length>0&&feedItems.length<=20);
  const feedUrls=feedItems.map(item=>item.match(new RegExp('<link>(.*?)</link>'))[1]);
  assert.equal(new Set(feedUrls).size,feedUrls.length);
  assert.ok(feedUrls.every(url=>url.startsWith('https://example.com/reviews/')));
  const feedDates=feedItems.map(item=>item.match(new RegExp('<title>([0-9]{4}-[0-9]{2}-[0-9]{2})'))[1]);
  assert.deepEqual(feedDates,[...feedDates].sort().reverse());
  assert.ok(feedItems.every(item=>item.includes('&lt;article&gt;')),'RSS includes full public record body');
  assert.ok(rssXml.includes('운행일 기준 정렬이며 게시·수정 시각을 뜻하지 않습니다.'));
  assert.equal(await (await get('/feed.xml')).text(),rssXml);
  for(const target of feedUrls.slice(0,2))assert.equal((await get(new URL(target).pathname)).status,200);
  const h=await get('/health');assert.equal(h.status,200);const health=await h.json();assert.equal(health.regions,regions.length);
  const keywordStatus=await (await get('/api/keyword-status')).json();assert.ok(keywordStatus.stored>200000);assert.equal(keywordStatus.searchExposure,'not-measured');
  for(const query of ['강화도맛집','강남맛집','설악산','영덕해맞이공원']){
   const response=await get('/keyword-search/?q='+encodeURIComponent(query));assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex, follow');const html=await response.text();assert.ok(/href="\/(?:daeri|taksong|visit|place)\//.test(html),'keyword must link to a real website destination: '+query);
  }
  const categoryHtml=await (await get('/keyword-search/?category='+encodeURIComponent('맛집'))).text();assert.ok(categoryHtml.includes('맛집·식당 방문 후 대리운전'));assert.ok(categoryHtml.includes('/assets/smart24-daeri-brand.png'));assert.ok(categoryHtml.includes('activity-feature'));assert.ok(!categoryHtml.includes('자동 갱신 현황'));assert.ok(!categoryHtml.includes('20,562'));
  for(const p of ['/activities/','/activities/food/','/activities/hiking/','/activities/cycling/']){const r=await get(p);assert.equal(r.status,200);const h=await r.text();assert.ok(h.includes('index,follow,max-image-preview:large'));assert.ok(h.includes('property="og:image"'));const activityImage=h.match(/property="og:image" content="https:\/\/example.com([^"]+)/)[1];assert.ok(h.includes('src="'+activityImage+'"'),'advertised card must be visible on category page');assert.ok(h.includes('tel:18114294'));assert.ok(!h.includes('자동 갱신 현황'));assert.ok(!h.includes('20,562'));assert.ok(h.includes('href="https://example.com'+p+'"'));}
  const oldCategory=await fetch('http://127.0.0.1:'+port+'/keyword-search/?category='+encodeURIComponent('맛집'),{redirect:'manual'});assert.equal(oldCategory.status,301);assert.equal(oldCategory.headers.get('location'),'/activities/food/');
  assert.equal((await get('/activities/unknown/')).status,404);
  const busanHtml=await (await get('/taksong/busan/')).text();const busanGraph=[...busanHtml.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flatMap(x=>x['@graph']||[x]);assert.ok(busanHtml.includes('<title>부산탁송 | 항만·서비스센터 및 부산 시내 차량 인수 준비'),'priority page title reflects actual Busan service conditions');
  assert.ok(busanHtml.includes('class="province-service-guide"'));
  assert.ok(busanHtml.includes('부산 출발 지역 선택'));
  assert.ok(busanHtml.includes('공항 주차장이나 항만 시설'));
  assert.ok(busanHtml.includes('href="/taksong/busan/haeundae-gu/"'));
  const busanCrumbs=busanGraph.find(x=>x['@type']==='BreadcrumbList');assert.ok(busanCrumbs);assert.deepEqual(busanCrumbs.itemListElement.map(x=>x.name),['홈','전국 탁송','부산탁송']);assert.equal(busanCrumbs.itemListElement.at(-1).item,'https://example.com/taksong/busan/');assert.ok(busanHtml.includes('href="/taksong/">전국 탁송'));
  const injected=await (await get('/keyword-search/?q='+encodeURIComponent('<script>alert(1)</script>'))).text();assert.ok(!injected.includes('<script>alert(1)</script>'));
  const feedFixture=require('../data/keywords/catalog.json').items.find(x=>x.origin==='public-feed'&&x.state==='linked'&&x.category==='축제');assert.ok(feedFixture,'a collected and linked festival keyword must exist');
  const bookingHtml=await (await get('/visit/'+feedFixture.id+'/')).text();const bookingSelect=bookingHtml.match(/<select name="service">(.*?)<\/select>/s)[1];assert.ok(bookingSelect.includes('value="daeri" selected'),'driver guide must select designated driving in its quote form');
  assert.ok(bookingHtml.match(/property="og:image" content="[^"]+-daeri-brand.png/));
  for(const html of [bookingHtml,categoryHtml]){const paragraphs=[...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map(x=>x[1].replace(/<[^>]+>/g,'').trim()).filter(x=>x.length>40);assert.equal(new Set(paragraphs).size,paragraphs.length,'guide should not repeat its lead paragraph');}
  const coast=require('../data/coastal/places.json');assert.ok(coast.items.length>600);assert.equal(coast.unresolved.length,0);assert.equal(new Set(coast.items.map(x=>x.id)).size,coast.items.length);
  for(const x of coast.items){assert.equal(regions.find(r=>r.slug===x.regions[0])?.full_name,x.regionFull);assert.ok(x.aliases.includes(x.term));}
  const coastSitemap=await (await get('/sitemap.xml')).text();
  assert.ok(!coastSitemap.includes('/daeri/coast/'),'large automatically collected coastal combinations no longer dominate main sitemap');
  assert.ok(!coastSitemap.includes('/taksong/coast/'),'large automatically collected coastal combinations no longer dominate main sitemap');
  for(const [term,region] of [['인구해수욕장','양양군'],['을왕리해수욕장','영종구'],['소래포구','남동구'],['삼길포항','서산시'],['삼천포항','사천시'],['대포항','속초시']]){
   const x=coast.items.find(x=>x.term===term&&x.regionFull.includes(region));assert.ok(x,term);
   for(const kind of ['daeri','taksong']){const p='/'+kind+'/coast/'+x.id+'/',r=await get(p);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('href="https://example.com'+p+'"'));assert.ok(html.includes('name="service" value="'+kind+'"'));assert.ok(html.includes('tel:18114294'));assert.ok(html.includes('index,follow,max-image-preview:large'));const image=html.match(/property="og:image" content="([^"]+)/)[1];assert.ok(image.endsWith('-'+kind+'-brand.png'));assert.ok(html.includes('src="'+image+'"'));assert.ok(!html.includes('1877-'));}
  }
  for(const q of ['인구대리운전','인구해변탁송','을왕리대리','소래포구대리운전','삼길포항탁송','삼천포탁송','강원도대리운전','속초대리운전','고성대리운전','거진대리운전','간성대리운전','삼척대리운전','동해대리운전','주문진대리운전']){const h=await (await get('/keyword-search/?q='+encodeURIComponent(q))).text();assert.ok(/href="\/(daeri|taksong)\/(coast|gangwon)/.test(h),q);}
  const songjeong=coast.items.filter(x=>x.term==='송정해수욕장');assert.ok(new Set(songjeong.map(x=>x.regionFull)).size>1,'same-name beaches remain region-separated');
  const coastIndex=await (await get('/coast/')).text();assert.ok(coastIndex.includes('해변·항구'));assert.equal((await get('/daeri/coast/00000000000000000000/')).status,404);
  for(const suffix of ['대리','대리운전','탁송']){
   const kind=suffix==='탁송'?'taksong':'daeri';
   for(const term of ['설악산','강남맛집','강화읍','역삼동','서울','맛집','자전거길']){const h=await (await get('/keyword-search/?q='+encodeURIComponent(term+suffix))).text();assert.ok(h.includes('href="/'+kind+'/'),term+suffix);}
   const fixture=topicCatalogForService();const p='/'+kind+'/visit/'+fixture.id+'/',h=await (await get(p)).text();assert.ok(h.includes('href="https://example.com'+p+'"'));assert.ok(h.includes('-'+kind+'-brand.png'));assert.ok(h.includes('value="'+kind+'" selected'));assert.ok(h.includes('1811-4294'));
   const topicHtml=await (await get('/'+kind+'/activities/food/')).text();assert.ok(topicHtml.includes('value="'+kind+'" selected'));assert.ok(topicHtml.includes('/assets/smart24-'+kind+'-brand.png'));
  }
  function topicCatalogForService(){return require('../data/keywords/catalog.json').items.find(x=>x.term==='설악산'&&x.state==='linked');}
  const shortNames=require('../lib/keyword-aliases');assert.equal(shortNames.shortName('인구해수욕장',['인구','인구해변']),'인구');assert.deepEqual(shortNames.aliases('설악산'),['설악산']);assert.ok(shortNames.aliases('송추계곡').includes('송추'));
  for(const [place,short] of [['인구해수욕장','인구'],['소래포구','소래'],['해운대해수욕장','해운대'],['협재해수욕장','협재']]){const x=coast.items.find(x=>x.term===place);assert.ok(x.aliases.includes(short));const h=await (await get('/daeri/coast/'+x.id+'/')).text();assert.ok(h.includes(short+'대리 · '+short+'대리운전'));assert.ok(h.includes(short+'탁송'));for(const suffix of ['대리','대리운전','탁송']){const k=suffix==='탁송'?'taksong':'daeri',result=await (await get('/keyword-search/?q='+encodeURIComponent(short+suffix))).text();assert.ok(result.includes('/'+k+'/coast/'+x.id+'/'));}}
  const unknownKeyword=await get('/visit/00000000000000000000/');assert.equal(unknownKeyword.status,404);
  const topicCatalog=require('../data/keywords/catalog.json');const mountain=topicCatalog.items.find(x=>x.term==='설악산');const mountainRes=await get('/visit/'+mountain.id+'/');assert.equal(mountainRes.status,200);const mountainHtml=await mountainRes.text();assert.ok(mountainHtml.includes('차키'));assert.ok(mountainHtml.includes('tel:18114294'));assert.ok(mountainHtml.includes('name="from"'));assert.ok(mountainHtml.includes('name="to"'));const mountainImage=mountainHtml.match(/property="og:image" content="([^"]+)/)[1];assert.ok(mountainHtml.includes('src="'+mountainImage+'"'),'guide primary image must actually be visible');
  const eupHtml=await (await get('/daeri/incheon/ganghwa-gun/ganghwa-eup/')).text();assert.ok(eupHtml.includes('<title>강화읍대리운전'));assert.ok(eupHtml.includes('href="/daeri/incheon/"'));assert.ok(eupHtml.includes('href="/daeri/incheon/ganghwa-gun/"'));
  const ganghwa=await (await get('/daeri/incheon/ganghwa-gun/')).text();assert.ok(ganghwa.includes('id="destination-guide"'));assert.ok(ganghwa.includes('/keyword-search/'));
  for(const p of ['/fare/jeju/','/assets/road-fare.js','/assets/jeju-quote.js','/assets/jeju-ferry-rates.json'])assert.equal((await get(p)).status,200,p);
  const jejuPage=await (await get('/taksong/jeju/')).text();assert.ok(jejuPage.includes('/fare/jeju/'));assert.ok(jejuPage.includes('275,000원'));
  const slugs=new Set(regions.map(r=>r.slug));assert.equal(slugs.size,regions.length,'duplicate slugs');
  assert.equal(regions.filter(r=>r.level==='시도').length,17,'17 provinces expected');
  const fullNames=new Set(regions.map(r=>r.full_name));assert.equal(fullNames.size,regions.length,'duplicate full region paths');
  for(const r of regions){const parent=r.full_name.split(' ').slice(0,-1).join(' ');if(parent)assert.ok(fullNames.has(parent),'missing parent: '+r.full_name)}
  const samples=[regions[0],regions.find(r=>r.full_name==='서울특별시 강남구'),regions.at(-1)].filter(Boolean);
  for(const r of samples){const res=await get('/region/'+r.slug+'/');assert.equal(res.status,200,r.slug);const html=await res.text();assert.ok(html.includes(r.name));assert.ok(html.includes('대리운전'));assert.ok(html.includes('자동차탁송'));assert.ok(html.includes('1811-4294'));assert.ok(html.includes('일일기사'))}
  const missing=await get('/region/not-a-real-region/');assert.equal(missing.status,404);
  for(const service of ['daeri','taksong']){
   const response=await get('/'+service+'/seoul/');assert.equal(response.status,200);
   const html=await response.text();
   const card=html.match(/<meta property="og:image" content="https:\/\/example.com(\/card\/area-\d+-(?:daeri|taksong)-brand\.png)"/);
   assert.ok(card,'regional '+service+' page must advertise a PNG business card');
   assert.ok(html.includes('href="tel:18114294"'),'service card retains the representative phone');
   const svg=await (await get(card[1].replace('.png','.svg'))).text();
   const expectedBrand=service==='daeri'?'스마트전국대리운전':'스마트24시전국탁송';
   assert.ok(svg.includes('서울 '+expectedBrand),'card uses the requested regional service brand');
   const caption=html.match(/<figcaption[^>]*>(.*?)<\/figcaption>/)[1];assert.ok(caption.includes(expectedBrand),'caption identifies the same service as the displayed card');
   const visibleLabels=svg.replace(/<image[^>]+\/>/g,'');
   assert.ok(!visibleLabels.includes(service==='daeri'?'스마트24시전국탁송':'스마트전국대리운전'),'card headings do not mix the two service brands');
   assert.ok(svg.includes('data:image/webp;base64,')&&svg.includes('x="200" y="7"'),'regional card uses the approved artwork and teal local labels');
   assert.ok(html.includes('src="'+card[1]+'"'),'advertised business card is also visible on the page');
   assert.ok(html.indexOf('<figure>')<html.indexOf('class="booking-guide"'),'regional card appears beside the regional introduction');
   const metadata=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
   assert.ok(metadata.some(x=>x['@graph']?.some(y=>y['@type']==='WebPage'&&y.primaryImageOfPage)),'regional service page identifies its primary image');
   const imageMap=await (await get('/sitemap-'+service+'.xml')).text();
   assert.equal((imageMap.match(/<image:image>/g)||[]).length,regions.length,'every regional service URL includes its existing card in the image sitemap');
   if(service==='taksong'){
    const villages=[...imageMap.matchAll(/<loc>https:\/\/example\.com(\/taksong\/[^<]*\/yongsan-ri\/)<\/loc>/g)].map(m=>m[1]);
    assert.ok(villages.length>=2,'same-named villages have distinct regional URLs');
    const firstVillage=await (await get(villages[0])).text(),secondVillage=await (await get(villages[1])).text();
    const firstTitle=firstVillage.match(/<title>([^<]+)<\/title>/)?.[1];
    const secondTitle=secondVillage.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(firstTitle&&secondTitle&&firstTitle!==secondTitle,'two YongSan villages do not share a search title');
    assert.ok(firstVillage.includes('차량인수탁송')&&!firstVillage.includes('폐차산업탁송'),'village has handover intent rather than nationwide industry keyword stuffing');
   }

   assert.ok(imageMap.includes('https://example.com'+card[1]),'sitemap and visible card use the same image URL');
   const image=await get(card[1]);assert.equal(image.status,200);
   assert.equal(image.headers.get('content-type'),'image/png');
   const bytes=new Uint8Array(await image.arrayBuffer());
   assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);
   const dimensions=await require('sharp')(bytes).metadata();assert.equal(dimensions.width,1200);assert.equal(dimensions.height,800,'regional heading is inside the artwork without an outside band');
   const artStats=await require('sharp')(bytes).extract({left:0,top:100,width:1200,height:700}).stats();assert.ok(artStats.channels.some(c=>c.stdev>35),'regional PNG retains the detailed approved artwork instead of a blank background');
   assert.equal((await get('/card/'+card[1].match(/area-\d+/)[0]+'-light.png')).status,200,'previous regional image URLs remain available');
  }
  for(const service of ['daeri','taksong']){
   const hub=await (await get('/'+service+'/')).text();
   assert.equal((hub.match(/<h1[ >]/g)||[]).length,1,'service hub has a single primary heading');
   assert.ok(hub.includes('/fare/?service='+service),'hub calculator preserves service choice');
   assert.ok(!hub.includes('키워드 자동 검색'),'customer hub prioritizes booking instead of generated search terms');
   const regional=await (await get('/'+service+'/gangwon/gangreung-si/')).text();
   assert.ok(regional.includes('영서·영동'),'Gangwon guidance addresses the regional journey');
   assert.ok(regional.includes('name="auto" value="1"')&&regional.includes('예상요금 바로 계산'),'usage guide supports destination-driven automatic fare lookup');
   assert.ok(regional.includes(service==='taksong'?'80,000~110,000원':'105,000~145,000원'),'Gangneung example uses the verified route calculator estimate for each service');
   assert.ok(regional.includes('상황별 이용 안내')&&regional.includes('실제 완료 운행후기가 아닙니다'),'regions without verified rides offer clearly labelled usage guidance');
   assert.ok(regional.includes('https://open.kakao.com/o/sGV88r7h'),'regional pages link to the existing consultation channel');
   assert.ok(regional.includes('/fare/?service='+service+'&amp;from='+encodeURIComponent('강원특별자치도 강릉시')),'regional calculator retains service and departure');
   assert.ok(regional.includes(service==='taksong'?'면책금':'동승 인원'),'service-specific booking checks are visible');
  }
  const fareHtml=await (await get('/fare/')).text();
  assert.ok(fareHtml.includes('통행료·주유비·주차비'),'estimator discloses costs to confirm');
  const homeHtml=await (await get('/')).text();
  assert.ok(homeHtml.includes('/fare/?service=taksong')&&homeHtml.includes('/fare/?service=daeri'),'homepage offers both service calculators');
  const crawlRobots=await (await get('/robots.txt')).text();
  const submittedMaps=crawlRobots.split('\n').filter(line=>line.startsWith('Sitemap: '));
  assert.equal(submittedMaps.length,3,'robots advertises only curated and verified route sitemaps');
  assert.ok(submittedMaps.some(x=>x.includes('/sitemap-priority.xml')));
  assert.ok(submittedMaps.some(x=>x.includes('/sitemap-reviewed-routes.xml')));
  assert.ok(!submittedMaps.some(x=>x.includes('nationwide-route')),'avoid diluting crawl effort across hundreds of thousands of generated combinations');
  const sm=await get('/sitemap.xml');assert.equal(sm.status,200);const xml=await sm.text();const submitted=(xml.match(/<loc>/g)||[]).length;assert.ok(submitted>=29&&submitted<500,'main sitemap focuses fewer than 500 high-quality URLs');assert.ok(xml.includes('https://example.com/taksong/busan/'),'main sitemap includes curated Busan region');assert.ok(xml.includes('https://example.com/daeri/daegu/'),'main sitemap includes curated Daegu region');assert.ok(xml.includes('/reviews/'),'main sitemap links to verified rides');assert.ok(!xml.includes('/region/area-20562/'),'main sitemap must not expose all 20,562 low-priority regions');assert.ok(xml.includes('example.com'));assert.ok(xml.includes('/places/'),'place category hub appears in sitemap');assert.ok(xml.includes('/places/'+encodeURIComponent('캠핑장')+'/'),'camping category appears in sitemap');assert.ok(xml.includes('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/'),'tow truck delivery category appears in sitemap');
  const guideUrls=[...xml.matchAll(/<loc>([^<]+\/(?:fare|long-distance|handover)\/)<\/loc>/g)].map(x=>x[1]).filter(url=>!url.endsWith('example.com/fare/'));
  assert.equal(guideUrls.length,0,'deep auto-generated intent guides remain usable without being submitted in the main sitemap');
  assert.equal(new Set(guideUrls).size,guideUrls.length,'regional topic canonicals are unique');
  assert.ok(health.regionalGuideAreas>=17,'guides cover every province');
  const guideImages=new Set();
  for(const [kind,topic,title] of [['daeri','fare','강릉대리운전요금'],['daeri','long-distance','강릉 장거리대리운전'],['taksong','fare','강릉탁송요금'],['taksong','handover','강릉 자동차탁송 예약·인계']]){
   const pathname='/'+kind+'/gangwon/gangreung-si/'+topic+'/';
   const response=await get(pathname);assert.equal(response.status,200);const html=await response.text();
   assert.ok(html.includes(title),'guide answers its own service intent');
   const dispatchPhrase=kind==='daeri'?'대리운전 빠른배차 상담':'탁송 즉시배차 가능 여부 확인';
   assert.ok(html.includes('aria-label="빠른배차 상담"')&&html.includes(dispatchPhrase),'topic card has visible dispatch consultation information');
   assert.ok(html.match(/name="description" content="([^"]*)"/)[1].includes(dispatchPhrase),'search description and visible consultation copy agree');
   assert.ok(html.includes('rel="canonical" href="https://example.com'+pathname+'"'),'topic guide uses its own canonical');
   assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
   assert.ok(html.includes('href="tel:18114294"'));
   assert.ok(html.includes('/'+kind+'/gangwon/gangreung-si/'),'guide connects back to its regional service');
   const image=html.match(/property="og:image" content="https:\/\/example.com([^"]+)"/)[1];guideImages.add(image);
   assert.ok(html.includes('src="'+image+'"'),'topic card is still visible even if deep topic guide is not submitted');
  }
  assert.equal(guideImages.size,2,'guides reuse their service basic card instead of topic-specific cards');
  assert.ok([...guideImages].every(x=>/-(daeri|taksong)-brand\.png$/.test(x)),'all guides point to the requested service-specific basic cards');
  const topicImage=await get([...guideImages][0]);assert.equal(topicImage.status,200);
  const topicBytes=new Uint8Array(await topicImage.arrayBuffer());const topicMeta=await require('sharp')(topicBytes).metadata();assert.equal(topicMeta.width,1200);assert.equal(topicMeta.height,800);
  const topicStats=await require('sharp')(topicBytes).extract({left:0,top:100,width:1200,height:700}).stats();assert.ok(topicStats.channels.some(c=>c.stdev>35),'topic cards retain approved detailed artwork');
  assert.equal((await get('/daeri/gangwon/gangreung-si/handover/')).status,404,'unsupported service/topic combination is not indexed');
  assert.equal((await get('/taksong/gangwon/not-a-city/fare/')).status,404,'unknown regions do not create topic guides');
  const secret=await get('/server.js');assert.equal(secret.status,403,'server source must not be exposed');
  const malformed=await get('/%25ZZ');assert.ok([400,404].includes(malformed.status));
  // Homepage statistics show KST today/yesterday visits and phone click provenance.
  const statsHome=await (await get('/')).text();
  assert.ok(statsHome.includes('전화클릭 전환 <strong id="phone-click-number"'),
    'conversion counter label must display next to the representative phone');
  assert.ok(statsHome.includes('id="priority-verified-routes"')&&
    statsHome.includes('/routes/taksong/area-494/area-1174/')&&
    statsHome.includes('/routes/taksong/area-1/area-494/')&&
    statsHome.includes('/routes/taksong/area-532/area-765/')&&
    statsHome.includes('/routes/reviewed/'),
    'homepage must link natural-language priority route pages and real ride evidence');
  const noCacheHome=await get('/');
  assert.match(noCacheHome.headers.get('cache-control')||'',/no-cache/,
    'production HTML should revalidate after phone source UI deployments');

  // Top navigation -> functional calculator -> vehicle imagery, on every viewport.
  const statsNavPos=statsHome.indexOf('</nav>');
  const statsFarePos=statsHome.indexOf('id="top-fare-calculator"');
  const statsHeroPos=statsHome.indexOf('class="hero hero-with-photo"');
  const statsImagePos=statsHome.indexOf('src="/assets/vehicles/santafe-1811.webp"');
  assert.ok(statsNavPos>=0&&statsNavPos<statsFarePos&&statsFarePos<statsHeroPos&&statsHeroPos<statsImagePos,
    'calculator must be immediately after navigation and above vehicle photo');
  assert.equal((statsHome.match(/class="quick-booking"/g)||[]).length,1,'fare form must not be duplicated');
  assert.ok(statsHome.includes('name="from"')&&statsHome.includes('name="to"')&&statsHome.includes('action="/fare/"'),
    'top fare calculator still submits the real fare lookup');
  assert.ok(statsHome.includes('background:transparent;color:#fff;text-align:right'),
    'visits are compact plain white text without a boxed dashboard');
  assert.ok(statsHome.includes('id="traffic-sources-detail" hidden') &&
    statsHome.includes('id="traffic-call-trigger"'),
    'source details remain hidden until the count beside the phone is clicked');
  const headerNumberAt=statsHome.indexOf('class="header-phone-line"');
  const phoneNumberEnd=statsHome.indexOf('</a>',headerNumberAt);
  const phoneClickAt=statsHome.indexOf('id="traffic-call-trigger"');
  const phoneClickEnd=statsHome.indexOf('</button>',phoneClickAt);
  assert.ok(headerNumberAt>=0&&phoneNumberEnd>headerNumberAt&&
    phoneClickAt>phoneNumberEnd&&phoneClickAt<statsHome.indexOf('</div>',headerNumberAt),
    'phone click count is immediately beside the representative number');
  assert.ok(phoneClickEnd>phoneClickAt &&
    statsHome.slice(phoneClickAt,phoneClickEnd).includes('id="phone-click-number"'),
    'count beside telephone opens the source details');
  const headerPhonePos=statsHome.indexOf('class="header-call"');
  const dashboardPos=statsHome.indexOf('id="traffic-stats-panel"');
  assert.ok(headerPhonePos>=0&&headerPhonePos<dashboardPos&&dashboardPos<statsNavPos,
    'small visit counts remain below the top-right phone');
  assert.ok(!statsHome.includes('id="yesterday-visit-number"')&&
    !statsHome.includes('id="total-phone-click-number"')&&
    !statsHome.includes('traffic-stats-grid'),
    'remove yesterday and duplicate phone count and boxed dashboard');
  for(const id of ['traffic-stats-panel','today-visit-number','total-visit-number',
                   'phone-click-number','phone-source-list']){
    assert.ok(statsHome.includes('id="'+id+'"'),'home header statistic missing '+id);
  }
  assert.equal(statsHome.split('src="/assets/traffic-analytics.js?v=20261028-conversion"').length-1,1,
    'homepage loads new versioned click tracking exactly once');
  const statRoute=await (await get('/taksong/')).text();
  assert.equal(statRoute.split('src="/assets/traffic-analytics.js?v=20261028-conversion"').length-1,1,
    'dynamic transport pages track clicks with current script without duplicates');
  const statOther=await (await get('/service/golf/')).text();
  assert.ok(statOther.includes('traffic-analytics.js'),'static HTML pages track calls too');
  const tracker=await get('/assets/traffic-analytics.js');
  assert.equal(tracker.status,200);
  const trackerBody=await tracker.text();
  assert.ok(trackerBody.includes("site_phone_event")&&trackerBody.includes("site_traffic_dashboard"));
  assert.ok(trackerBody.includes('acquisition();')&&trackerBody.includes('유입 경로 미확인'),
    'record first landing source and display existing unattributed conversions');
  assert.ok(trackerBody.includes("el('traffic-call-trigger')") && !trackerBody.includes("traffic-today-trigger"),
    'click-source visibility is controlled only by the phone-click count');
  assert.ok(trackerBody.includes('p_page:location.pathname')&&trackerBody.includes('p_source:acquisition()'));
  assert.ok(!trackerBody.includes('event.preventDefault()'),'phone navigation is never blocked');
  assert.ok(trackerBody.includes('response.status===204'),'Supabase void phone-event response must not cause retry or double count');
  assert.ok(!trackerBody.includes('document.referrer.trim()'),'raw referrers must not be transmitted');
  assert.equal((await get('/supabase/site_traffic_dashboard.sql')).status,403,
    'statistics database schema must not be web-exposed');
  const root=await get('/');assert.equal(root.status,200);
  const regionIndex=await get('/region/');assert.equal(regionIndex.status,200);const places=await get('/places/');assert.equal(places.status,200);assert.ok((await places.text()).includes('캠핑장'));const camping=await get('/places/'+encodeURIComponent('캠핑장')+'/');assert.equal(camping.status,200);const reka=await get('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/');assert.equal(reka.status,200);const daeriMap=await get('/sitemap-daeri.xml');assert.equal(daeriMap.status,200);assert.equal(((await daeriMap.text()).match(/<loc>/g)||[]).length,regions.length+3,'regional URLs plus three service hubs');const taksongMap=await get('/sitemap-taksong.xml');assert.equal(taksongMap.status,200);assert.equal(((await taksongMap.text()).match(/<loc>/g)||[]).length,regions.length+3,'regional URLs plus three service hubs');
  const search=await get('/region/?q='+encodeURIComponent('가평읍'));assert.equal(search.status,200);assert.ok((await search.text()).includes('가평읍'));
  // The sixteen user-confirmed Excel review drafts use Korean service labels in their source.
  // They must be normalized before the public verified-ride filter, not silently discarded.
  const drafts=[
   ...require('../data/daeri-review-drafts-202610.json').items,
   ...require('../data/taksong-review-drafts-202610.json').items
  ].filter(x=>x.publication_status==='사용자 확인 운행완료');
  assert.equal(drafts.length,16,'only the sixteen user-confirmed Excel draft records are publicly eligible');
  const verifiedExamples=[
   {date:'2026-10-19',service:'taksong',departure:'백담사 탐방지원센터',destination:'설악산 소공원',region:'/taksong/gangwon/'},
   {date:'2026-10-19',service:'daeri',departure:'창원시 월영동',destination:'부산 부산진구',region:'/daeri/busan/'}
  ];
  for(const example of verifiedExamples){
   const matched=drafts.find(x=>x.date===example.date&&x.departure===example.departure&&x.destination===example.destination);
   assert.ok(matched,'expected user-confirmed source record exists');
   const id=require('node:crypto').createHash('sha256').update([example.date,example.service,example.departure,example.destination].join('|')).digest('hex').slice(0,16);
   const published='/reviews/'+id+'/';
   const detail=await get(published);
   assert.equal(detail.status,200,'user-confirmed record is published as verified review: '+published);
   const detailHtml=await detail.text();
   assert.ok(detailHtml.includes(example.departure)&&detailHtml.includes(example.destination),'published record retains original place evidence');
   assert.ok(detailHtml.includes(matched.fare),'published record retains actual historic fare');
   const regionHtml=await (await get(example.region)).text();
   assert.ok(regionHtml.includes(published),'related priority page directly links to the verified ride');
   assert.ok(regionHtml.includes(example.departure)&&regionHtml.includes(example.destination),'region page shows concrete verified origin and destination');
  }
  const noInferredDaegu=await (await get('/taksong/daegu/')).text();
  assert.ok(!noInferredDaegu.includes('대명동 → 부산서구 토성동 탁송 운행완료'),'do not infer Daegu from unqualified neighborhood name');
  console.log('PASS: server, '+regions.length+' regions, pages, no-history content, sitemap, 404, homepage');
 }catch(e){console.error(e);console.error(stderr);process.exitCode=1}finally{child.kill()}
})();
