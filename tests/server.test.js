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
assert.equal(matchingHistoryRegion(record('광주광역시 송정역','광주효천동'),region('광주시','경기도 광주시','시'),regions),false,'Gwangju metropolitan city is not Gyeonggi Gwangju-si');
assert.equal(matchingHistoryRegion(record('경기도 광주시 경안동','인천'),region('광주시','경기도 광주시','시'),regions),true,'fully qualified Gyeonggi Gwangju-si remains matched');

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
  const coverageResponse=await get('/coverage/');
  assert.equal(coverageResponse.status,200,'Nationwide province hub must return HTTP 200');
  const coverageHTML=await coverageResponse.text();
  assert(coverageHTML.includes('nationwide-seventeen-province-coverage-20261105'),'National coverage content must be rendered');
  assert(coverageHTML.includes('https://example.com/coverage/'),'National coverage page must have canonical URL');
  for(const title of ['서울','부산','대구','인천','대전','광주','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']){
   assert(coverageHTML.includes(title),'National coverage must mention '+title);
  }
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
  // Ten-point customer journey audit: avoid duplicate sections and show the fare
  // general service header before the mountain poster, then verified history and booking.
  for(const id of ['mountain-cycle-priority-links','mountain-taksong-fares',
   'long-distance-five-routes','keyword-topics','core-search-services','cycle-second-five-home'])
   assert.ok(!seoHome.includes('id="'+id+'"'),'duplicate homepage section removed: '+id);
  assert.ok(seoHome.indexOf('<header')<seoHome.indexOf('id="mobile-direct-image-priority"'),'general service header must precede mountain poster on homepage');
  const heroStart=seoHome.indexOf('<div class="hero hero-with-photo">');
  const fareStart=seoHome.indexOf('<section id="mountain-cycling-fare-first-20261103"');
  const completedStart=seoHome.indexOf('<section id="real-completed-service-hubs-202611"');
  assert.ok(heroStart>=0&&heroStart<fareStart&&fareStart<completedStart,
   'homepage must present immediate booking, one consolidated fare section, then real completed rides');
  assert.ok(!seoHome.includes('id="homepage-mountain-fare-shortcuts-202611"'),
   'removed duplicate mountain shortcuts must not return');
  assert.ok(seoHome.includes('href="tel:18114294"')&&seoHome.includes('href="/fare/"'),
   'homepage must retain the phone and estimated fare actions');
  for(const [url,expectedFare,requiredSource] of [
   ['/설악산탁송/','오색 → 소공원','real-route-proof-202610'],
   ['/지리산탁송/','성삼재 → 중산리','jirisan-real-source-guide']
  ]){
   const response=await get(url),html=await response.text();
   assert.equal(response.status,200,'mountain canonical page loads: '+url);
   assert.ok(html.includes('<body><figure id="original-mountain-fare-visual"')&&
    html.indexOf('<figure id="original-mountain-fare-visual"')<html.indexOf('<section id="mountain-route-fare-table-202611"')&&
    html.indexOf('<section id="mountain-route-fare-table-202611"')<html.indexOf('id="mountain-complete-course-guide-20261102"'),
    'original mountain fare poster should be visually first, readable HTML fares before long guide: '+url);
   const a=html.indexOf('id="mountain-route-fare-table-202611"');
   assert.ok(a>0&&a<html.indexOf('id="mountain-complete-course-guide-20261102"'),
    'readable existing fare table precedes long route guide: '+url);
   assert.ok(html.includes(expectedFare)&&html.includes('현재 확정 견적은 아닙니다'),
    'historical fare is kept separate from live estimates: '+url);
   assert.ok(html.includes('id="'+requiredSource+'"'),'actual sourced route guidance preserved: '+url);
   assert.ok(html.includes('href="tel:18114294"'),'mountain consultation button works: '+url);
   assert.ok((html.match(/<h2\b/g)||[]).length<=12,'repetitive mountain sections consolidated: '+url);
  }
  // A Naver/crawler view of a cycle course must not borrow a Gangneung
  // driver business card: all six courses need their own topical image.
  const cycleAreas=[
    ['yeongsan','영산강길'],['seomjin','섬진강길'],['eastcoast','동해안길'],
    ['geumgang','금강길'],['ocheon','오천길'],['nakdonggang','낙동강길']
  ];
  for(const [id,label] of cycleAreas){
    const route='/route-taksong/courses/'+id+'/',pic='/assets/cycling-routes/'+id+'-taksong.svg';
    const res=await get(route),page=await res.text();
    assert.equal(res.status,200,'cycling canonical: '+route);
    assert(page.includes('property="og:image" content="https://jeongukdaeri.kr'+pic+'"'),'course og:image is missing '+route);
    assert(page.includes('src="'+pic+'"')&&page.includes(label+'자전거종주탁송'),'course picture is not topical '+route);
    assert(page.includes('primaryImageOfPage')&&page.includes(pic),'course structured image absent '+route);
    assert(!page.includes('src="/assets/smart24-business-card-inline.webp"'),'wrong common business card: '+route);
    const image=await get(pic);
    assert.equal(image.status,200,'course picture not served '+pic);
    assert.match(image.headers.get('content-type')||'',/image\/svg\+xml/,'SVG MIME absent '+pic);
  }
  for(const hub of ['/route-taksong/','/special/cycling-trail-transport/']){
    const page=await (await get(hub)).text();
    assert(page.includes('national-cycling-true-topic-image'),'national topic picture missing '+hub);
    assert(!page.includes('src="/assets/smart24-business-card-inline.webp"'),'misleading generic business card still appears '+hub);
    if(hub==='/route-taksong/'){
      assert(page.includes('id="cycling-visible-fare-table-20261103"'),'historical cycling fare table must remain visible');
      assert(!page.includes('src="/assets/smart24-taksong-brand.webp"'),'wrong Gangneung nationwide card must not appear in cycling fare section');
      assert(page.includes('id="cycling-route-specific-visuals-20261103"'),'cycling hub route-specific visual group missing');
      for(const route of ['eastcoast','yeongsan','seomjin'])
        assert(page.includes('src="/assets/cycling-routes/'+route+'-taksong.svg"'),'missing route-specific image '+route);
      assert(page.includes('섬진강 생활체육공원 → 배알도')&&page.includes('기존 안내 10만원'),'verified 100k historic Seomjin route quote retained');
    }
    if(hub==='/special/cycling-trail-transport/'){
      assert(page.includes('섬진강 생활체육공원 → 배알도')&&page.includes('기존 안내 10만원'),'special cycling hub keeps the separately verified Seomjin sports-park quote');
      assert(page.includes('섬진강댐 출발 → 배알도')&&page.includes('별도 출발지·거리 확인 후 상담'),'different dam start must not inherit sports-park price');
    }
  }
  for(const loc of ['/taksong/busan/','/taksong/daegu/','/taksong/gyeongnam/changwon-si/']){
   const response=await get(loc),html=await response.text();
   assert.equal(response.status,200,'priority regional page loads: '+loc);
   assert.ok(html.includes('id="regional-taksong-quick-start"'),'region first-view decision panel: '+loc);
   assert.ok(html.includes('자주 묻는 질문')&&html.includes('기존 완료기록의 당시 요금'),
    'region has fact-grounded FAQ and historic-price warning: '+loc);
   assert.ok(html.includes('href="tel:18114294"')&&html.includes('href="https://open.kakao.com/o/sGV88r7h"'),
    'phone and Kakao consultation links present: '+loc);
   assert.ok(html.includes('<figure')&&html.indexOf('id="regional-taksong-quick-start"')>=0&& (html.indexOf('id="priority-verified-rides"')<0 || html.indexOf('id="regional-taksong-quick-start"')<html.indexOf('id="priority-verified-rides"')),
    'regional picture and customer choices come ahead of long evidence listings: '+loc);
  }
  assert.ok(seoHome.includes('id="southeast-priority-regions"')&&
   seoHome.includes('href="/taksong/ulsan/"')&&
   seoHome.includes('href="https://blog.naver.com/wjdtnr4757/224441226524"'),
   'homepage provides Ulsan region and grounded blog evidence near its first view');
  // The Seoul city-wide editorial series contains exactly 25 distinct
  // boroughs, grouped in sets of three or four, with real existing Naver sources.
  const seoulEditorial=require('../data/seoul-taksong-editorial.json').groups;
  assert.equal(seoulEditorial.length,7,'seven Seoul editorial groups are published');
  const seoulBoroughs=seoulEditorial.flatMap(g=>g.districts.map(d=>d[0]));
  assert.equal(seoulBoroughs.length,25);
  assert.equal(new Set(seoulBoroughs).size,25,'all 25 Seoul boroughs included exactly once');
  assert.equal(seoulEditorial.find(g=>g.slug==='jongno-jung-yongsan-dongdaemun').districts[0][1],'jongro-gu','Jongno link matches legacy canonical path');
  assert.equal(seoulEditorial.find(g=>g.slug==='seongdong-gwangjin-jungnang-seongbuk').districts[2][1],'jungrang-gu','Jungnang link matches legacy canonical path');
  assert.ok(seoulEditorial.every(g=>g.districts.length>=3&&g.districts.length<=4),
    'each article handles 3-4 adjacent boroughs');
  const existingNaverPosts=require('../blog/posts.json');
  const existingIds=new Set(existingNaverPosts.map(p=>p.id));
  assert.ok(seoulEditorial.every(g=>g.sources.every(src=>existingIds.has(src[0]))),
    'all linked source posts exist in the recorded 630 published Naver blog posts');
  const seoIndex=await get('/blog/seoul-taksong/'),seoIndexText=await seoIndex.text();
  assert.equal(seoIndex.status,200,'Seoul grouped blog index is available');
  assert.ok(seoIndexText.includes('<h1>서울탁송 25개 구')&&
    seoIndexText.includes('rel="canonical" href="https://jeongukdaeri.kr/blog/seoul-taksong/"'),
    'Seoul editorial index has distinct H1 and canonical');
  assert.ok(seoHome.includes('id="seoul-seven-editorial-links"')&&seoHome.includes('href="/blog/seoul-taksong/"'),
    'home includes 7 group links without disrupting mountain posters');
  const seoulRegional=await (await get('/taksong/seoul/')).text();
  assert.ok(seoulRegional.includes('id="seoul-editorial-guide"')&&
    seoulRegional.includes('href="/blog/seoul-taksong/"'),
    'main Seoul locality landing references editorial index');
  const seoulHub=await (await get('/taksong/')).text();
  assert.ok(seoulHub.includes('id="seoul-taksong-seven-articles"'),
    'national taksong hub links Seoul grouped content');
  for(const group of seoulEditorial){
    const route='/blog/seoul-taksong/'+group.slug+'/';
    const response=await get(route),html=await response.text();
    assert.equal(response.status,200,'editorial article route works: '+route);
    assert.ok(html.includes('href="https://jeongukdaeri.kr/blog/seoul-taksong/'+group.slug+'/"')&&
      html.includes('type="application/ld+json"')&&html.includes('content="index,follow,max-image-preview:large"'),
      'each article includes canonical, JSON-LD and allows indexing: '+route);
    assert.ok(html.includes('href="tel:18114294"')&&html.includes('href="https://open.kakao.com/o/sGV88r7h"'),
      'phone and Kakao consultations available: '+route);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,'one unique article heading: '+route);
    assert.ok(html.includes('특정 운행의 현장 촬영 사진은 아닙니다'),
      'vehicle imagery must not be misrepresented as an actual delivered route photo: '+route);
    assert.ok(html.includes('현재 예약 확정 요금')&&html.includes('운행기록'),
      'past quote, real history and present-day price are distinguished: '+route);
    for(const [name,slug] of group.districts){
      assert.ok(html.includes('href="/taksong/seoul/'+slug+'/"'),name+' canonical borough link');
      assert.ok(html.includes(name+'탁송'),'borough-specific search phrase '+name);
      const boroughHtml=await (await get('/taksong/seoul/'+slug+'/')).text();
      assert.ok(boroughHtml.includes('href="/blog/seoul-taksong/'+group.slug+'/'),
        'each Seoul borough points back to its curated cluster: '+name);
    }
    for(const [postId] of group.sources)
      assert.ok(html.includes('https://blog.naver.com/wjdtnr4757/'+postId),
        'article links recorded published original '+postId);
    assert.ok(seoIndexText.includes(route),'index links all 7 editorial pages');
  }
  // All 2,591 original rides are now discoverable in six bounded XML sitemap shards.
  const sitemapIndexRes=await get('/sitemap-all.xml');
  assert.equal(sitemapIndexRes.status,200,'complete sitemap index is accessible');
  const sitemapIndex=await sitemapIndexRes.text();
  assert(sitemapIndex.includes('<sitemapindex'),'complete sitemap is a proper sitemap index');
  assert(sitemapIndex.includes('https://example.com/sitemap-history.xml'),'all sitemap references original ride archive index');
  const historyIndex=await (await get('/sitemap-history.xml')).text();
  const shards=[...historyIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.equal(shards.length,6,'2,591 rides require exactly six bounded sitemap shards');
  const duplicateCanonical=require('../data/seo-history-duplicates.json').canonicalById;
  const expected=new Set(Array.from({length:2591},(_,i)=>'https://example.com/reviews/history/excel-'+String(i+1).padStart(4,'0')+'/').filter(url=>!duplicateCanonical[url.split('/').at(-2)]));
  for(let index=1;index<=6;index++){
   const response=await get('/sitemap-history-'+index+'.xml');
   assert.equal(response.status,200,'history sitemap shard '+index+' exists');
   const xml=await response.text();
   const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
   const omitted=Object.keys(duplicateCanonical).filter(id=>Math.ceil(Number(id.slice(6))/500)===index).length;
   assert.equal(urls.length,(index<6?500:91)-omitted,'sitemap omits only exact public duplicates');
   for(const url of urls)assert(expected.delete(url),'sitemap contains each source ride exactly once: '+url);
  }
  assert.equal(expected.size,0,'all representative ride URLs are discoverable; original records remain accessible');
  for(const [id,representative] of Object.entries(duplicateCanonical)){const r=await get('/reviews/history/'+id+'/');assert.equal(r.status,200);const html=await r.text();assert(html.includes('href="https://example.com/reviews/history/'+representative+'/"'));assert(html.includes('원본 운행기록 번호: '+id));}
  assert.equal((await get('/sitemap-history-7.xml')).status,404,'out of-range sitemap shards do not exist');
  const indexedRobots=await (await get('/robots.txt')).text();
  assert(indexedRobots.includes('Sitemap: https://example.com/sitemap-all.xml'),'robots advertises complete sitemap index');
  const seoulPriorityMap=await (await get('/sitemap-priority.xml')).text();
  const seoulMainMap=await (await get('/sitemap.xml')).text();
  // Regional link volume must not crowd out verifiable completed rides in the main sitemap.
  const crypto=require('node:crypto');
  const firstRide=require('../data/public-reviewed-rides-202610.json')[0];
  const firstId=crypto.createHash('sha256').update([firstRide.date,firstRide.service,firstRide.departure,firstRide.destination].join('|')).digest('hex').slice(0,16);
  assert.ok(seoulMainMap.includes('https://example.com/reviews/'+firstId+'/'),
    'main sitemap must retain verified completed trip, not only templated location pages');
  assert.ok(seoulMainMap.includes('https://example.com/find/'), 'discoverable canonical region finder');
  assert.ok(seoulMainMap.includes('https://example.com/daeri/'), 'national designated driver canonical');
  assert.ok(seoulMainMap.includes('https://example.com/taksong/'), 'national vehicle transfer canonical');

  for(const path of ['/blog/seoul-taksong/',...seoulEditorial.map(g=>'/blog/seoul-taksong/'+g.slug+'/')]){
    assert.ok(seoulPriorityMap.includes('https://example.com'+path),'priority sitemap: '+path);
    assert.ok(seoulMainMap.includes('https://example.com'+path),'main sitemap: '+path);
  }
  // Preserve all original Naver blog categories, without copying article bodies.
  const ownerBlog=require('../blog/posts.json'),sourceArchive=require('../lib/blog-archive');
  assert.ok(ownerBlog.length>=630,'do not lose any of the 630 preserved Naver source posts when new originals are imported');
  assert.equal(sourceArchive.originalCategories.length,52,'all 52 original Naver categories are retained');
  assert.equal(sourceArchive.categoryTopics.length,11,'usable editorial subjects replace redundant raw-category indexes');
  assert.equal(sourceArchive.originalCategories.reduce((sum,c)=>sum+c.count,0),ownerBlog.length,'every current published original post remains accounted for');
  assert.equal(sourceArchive.categoryTopics.flatMap(g=>g.categories).length,52,
    'no original Naver category is discarded or duplicated during editorial grouping');
  const archiveHub=await get('/blog/archive/categories/'),archiveMarkup=await archiveHub.text();
  assert.equal(archiveHub.status,200,'complete original-category portal must load');
  assert.ok(archiveMarkup.includes('52개 카테고리')&&archiveMarkup.includes(ownerBlog.length+'편')&&archiveMarkup.includes('중고차탁송')&&archiveMarkup.includes('인증센터탁송 종주탁송'),
    'all original source categories are visible under grouped editorial themes');
  assert.ok(archiveMarkup.includes('rel="canonical" href="https://example.com/blog/archive/categories/"'),
    'category portal has a stable canonical and is indexable');
  assert.ok(seoHome.includes('href="/blog/archive/categories/"'),
    'homepage links users to 52 original categories and source links');
  const usedPostCategory='중고차탁송',categorySearch='/blog/archive/categories/?category='+encodeURIComponent(usedPostCategory);
  const filteredArchive=await get(categorySearch),filteredText=await filteredArchive.text();
  assert.equal(filteredArchive.status,200);
  assert.equal(filteredArchive.headers.get('x-robots-tag'),'noindex, follow',
    'individual category filters cannot spawn dozens of redundant search pages');
  assert.ok(filteredText.includes('중고차탁송')&&filteredText.includes('https://blog.naver.com/wjdtnr4757/'),
    'category filters display original published article URLs');
  assert.equal((filteredText.match(/<li><a href="https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+"/g)||[]).length,25,
    'large original categories paginate source links in groups of 25');
  assert.equal((await get('/blog/archive/categories/?category='+encodeURIComponent('없는분류'))).status,404,
    'unknown source category must not create a misleading search page');
  const archivePriority=await (await get('/sitemap-priority.xml')).text(),archiveMain=await (await get('/sitemap.xml')).text();
  for(const xml of [archivePriority,archiveMain])assert.ok(xml.includes('https://example.com/blog/archive/categories/'),
    'one canonical rebuilt Naver category portal is discoverable in sitemap');
  // Ten source-grounded, unique content guides must be visible on both hosts.
  const blogGuideRoutes=["/blog/guides/seoraksan-handover/","/blog/guides/jirisan-hiking-return/","/blog/guides/bicycle-certification-pickup/","/blog/guides/golf-daily-driver/","/blog/guides/corporate-card-daeri/","/blog/guides/service-center-car-transfer/","/blog/guides/cargo-truck-road-delivery/","/blog/guides/airport-terminal-parking/","/blog/guides/rental-return-accident-car/","/blog/guides/auction-export-car-yard/"];
  assert.equal(blogGuideRoutes.length,10);
  assert.equal(new Set(blogGuideRoutes).size,10);
  const guideHub=await get('/blog/guides/'),guideHubHtml=await guideHub.text();
  assert.equal(guideHub.status,200);
  assert.ok(guideHubHtml.includes('rel="canonical" href="https://jeongukdaeri.kr/blog/guides/"'),'guide hub has canonical');
  assert.ok(seoHome.includes('href="/blog/guides/"'),'homepage points to new evidence-linked editorials');
  const guidePrioritySitemap=await (await get('/sitemap-priority.xml')).text();
  const guideMainSitemap=await (await get('/sitemap.xml')).text();
  for(const path of ['/blog/guides/',...blogGuideRoutes]){
    const r=await get(path),body=await r.text();
    assert.equal(r.status,200,'published blog guide '+path);
    assert.ok(body.includes('rel="canonical" href="https://jeongukdaeri.kr'+path+'"'),'canonical '+path);
    assert.ok(body.includes('href="tel:18114294"')&&body.includes('application/ld+json'),'contact and structured data '+path);
    assert.ok(guideMainSitemap.includes('https://example.com'+path),'main sitemap '+path);
    assert.ok(guidePrioritySitemap.includes('https://example.com'+path),'priority sitemap '+path);
    if(path!=='/blog/guides/'){
      assert.equal((body.match(/<h1[ >]/g)||[]).length,1,'single guide H1 '+path);
      assert.ok((body.match(/https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+/g)||[]).length>=4,'four existing Naver posts '+path);
      assert.ok(body.includes('현재 확정 견적은 다릅니다'),'historic and current prices separate '+path);
      assert.ok(guideHubHtml.includes('href="'+path+'"'),'guide hub links article '+path);
    }
  }
  // Current regional daeri blog-like articles use real prior source links, per-region contact numbers,
  // original artwork and individual indexable canonicals on both production hosts.
  const recreationSlugs=["sanjeong-lake","baegun-valley","jangheung-valley","namhansanseong","gapyeong-hyeonri","gapyeong-seorak","ilyeong-valley","bukhansan-valley","buyeo-daeri","daegu-daeri"];
  assert.equal(recreationSlugs.length,10);
  assert.equal(new Set(recreationSlugs).size,10);
  const recreationIndex=await get('/blog/daeri-regions/'),recreationHubHtml=await recreationIndex.text();
  assert.equal(recreationIndex.status,200);
  assert.ok(recreationHubHtml.includes('rel="canonical" href="https://jeongukdaeri.kr/blog/daeri-regions/"'));
  assert.ok(seoHome.includes('href="/blog/daeri-regions/"'),'homepage links the published local driving editorial index');
  const recreationPriorityXml=await (await get('/sitemap-priority.xml')).text();
  const recreationMainXml=await (await get('/sitemap.xml')).text();
  for(const [idx,slug] of recreationSlugs.entries()){
    const route='/blog/daeri-regions/'+slug+'/',poster='/blog/daeri-regions/media/'+slug+'.svg';
    const response=await get(route),html=await response.text();
    const pic=await get(poster),svg=await pic.text();
    assert.equal(response.status,200,'published local driving editorial '+route);
    assert.equal(pic.status,200,'unique region artwork '+poster);
    assert.ok(svg.startsWith('<svg')&&svg.includes('010-4072-1577'),'locality image has direct phone '+slug);
    assert.ok(html.includes('src="'+poster+'"')&&html.includes('application/ld+json'),'SEO image plus BlogPosting '+slug);
    assert.ok(html.includes('rel="canonical" href="https://jeongukdaeri.kr'+route+'"'),'permalink canonical '+slug);
    assert.ok(html.includes('010-4072-1577'),'regional article direct phone '+slug);
    assert.ok(html.includes((slug==='jangheung-valley'||slug==='buyeo-daeri')?'1811-0963':'1877-3015'),'correct per-region published blog phone '+slug);
    assert.ok((html.match(/<h1[ >]/g)||[]).length===1,'one H1 per article '+slug);
    assert.ok(html.includes('새로운 완료 후기')||html.includes('완료후기를 만들어내지')||html.includes('운행완료 기록은 추가하지'),'no fabricated reviews '+slug);
    assert.ok(recreationHubHtml.includes('href="'+route+'"'),'regional index links article '+slug);
    assert.ok(recreationMainXml.includes('https://example.com'+route),'main sitemap '+slug);
    assert.ok(recreationPriorityXml.includes('https://example.com'+route),'priority sitemap '+slug);
  }
  assert.ok(recreationPriorityXml.includes('https://example.com/blog/daeri-regions/'));
  assert.ok(recreationMainXml.includes('https://example.com/blog/daeri-regions/'));
  // Search-result titles and site identity must present a single Korean brand.
  assert.ok(seoHome.includes('<title>'+require('../data/seo-pages.json').pages.find(x=>x.path==='/').title+'</title>'),'homepage title matches the centrally configured SEO title');
  assert.ok(seoHome.includes('property="og:site_name" content="스마트24 전국대리운전·24시탁송"'),'homepage Open Graph names the Korean brand');
  const visibleHeading=(seoHome.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)||[])[1]||'';
  assert.ok(visibleHeading.includes('전국자동차탁송')&&visibleHeading.includes('전국대리운전')&&
   visibleHeading.includes('href="tel:18114294"')&&seoHome.includes('전국 지역별 자동차탁송·대리운전 예약 안내'),
   'visible H1, call button and SEO description consistently identify nationwide and regional services');
  const schemaNodes=[...seoHome.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const homeWebsite=schemaNodes.find(x=>x['@type']==='WebSite');
  assert.ok(homeWebsite,'homepage declares WebSite JSON-LD');
  assert.equal(homeWebsite.name,'스마트24 전국대리운전·24시탁송');
  assert.equal(homeWebsite.url,'https://jeongukdaeri.kr/');
  const koreanTaksong=await (await get('/taksong/')).text();
  const koreanDaeri=await (await get('/daeri/')).text();
  assert.ok(koreanDaeri.includes('id="regional-driver-stories"'),'nationwide hub has region-integrated driver guidance');
  for(const term of ['둔내·횡성·평창·진부·태백·영월·정선','해운대·기장·범어동','충청·전라 대리운전'])assert.ok(koreanDaeri.includes(term),'regional driver prose: '+term);
  const golfRegion=await(await get('/service/golf/')).text();
  assert.ok(golfRegion.includes('id="golf-region-evidence"')&&golfRegion.includes('id="golf-sourced-cases"'),'golf service should show regional coverage and linked real posts');
  assert.ok(golfRegion.includes('224451280349')&&golfRegion.includes('224445462278'),'golf sources match actual user-published blog posts');
  const corporateRegion=await(await get('/service/corporate/')).text();
  assert.ok(corporateRegion.includes('id="corporate-region-evidence"')&&corporateRegion.includes('id="corporate-sourced-guides"'),'corporate page should include business contexts and payment guides');
  assert.ok(corporateRegion.includes('rel="canonical" href="https://jeongukdaeri.kr/service/corporate/"'),'corporate page canonical should target official host');
  assert.ok(!corporateRegion.includes('8882888.github.io'),'corporate production page should not promote mirror host');
  assert.ok(corporateRegion.includes('일반 대리운전 완료 기록을 법인 완료 운행 실적으로 표시하지 않습니다.'),'never present unverified corporate completions');
  const dailyRegion=await(await get('/service/daily-driver/')).text();
  assert.ok(dailyRegion.includes('id="daily-verified-examples"')&&dailyRegion.includes('id="daily-region-evidence"'),'daily driver landing should show authentic itinerary evidence');
  assert.ok(dailyRegion.includes('224451280349')&&dailyRegion.includes('224417611971'),'daily driver page links two published round-trip cases');
  for(const page of [golfRegion,corporateRegion,dailyRegion])assert.ok(page.includes('1811-4294'),'service page must retain official call number');
  // Duplicate nationwide-driver pages must not compete for mobile Naver sitelinks.
  for(const oldPath of ['/service/daeri/','/special/nationwide-daeri/']){
   const redirect=await fetch('http://127.0.0.1:'+port+oldPath,{redirect:'manual'});
   assert.equal(redirect.status,301,'legacy nationwide driver URL redirects: '+oldPath);
   assert.equal(redirect.headers.get('location'),'/daeri/','legacy driver canonical consolidation: '+oldPath);
  }
  const homepageRegionalNavigation=(seoHome.match(/<nav class="top-nav"[^>]*>[\s\S]*?<\/nav>/)||[])[0]||'';
  for(const keyword of ['전국대리운전','전국자동차탁송','법인대리운전','골프장대리운전','카카오상담'])
   assert.ok(homepageRegionalNavigation.includes('>'+keyword+'</a>'),'core service navigation retains '+keyword);
  const mountainMetroShortcuts=(seoHome.match(/<section id="priority-region-shortcuts-20261103"[\s\S]*?<\/section>/)||[])[0]||'';
  for(const keyword of ['설악산탁송','지리산탁송','부산탁송','울산탁송','창원탁송','대구탁송'])
   assert.ok(mountainMetroShortcuts.includes('>'+keyword+'</a>'),'regional mountain and metro shortcuts retain '+keyword);
  assert.ok(seoHome.includes('href="/daeri/" rel="nosublink"'),
   'duplicate nationwide-driver navigation links opt out of Naver sitelink candidates');
  const duplicateDaeriService=await (await get('/service/daeri/')).text();
  const duplicateNationwide=await (await get('/special/nationwide-daeri/')).text();
  for(const duplicate of [duplicateDaeriService,duplicateNationwide])assert.ok(duplicate.includes('<link rel="canonical" href="https://example.com/daeri/">'),'legacy daeri redirects land on the one canonical national driver page');
  assert.equal((duplicateDaeriService.match(/<meta name="robots"/g)||[]).length,1,'service daeri has a single robots meta tag');
  assert.ok(koreanTaksong.includes('<title>'+require('../data/seo-pages.json').pages.find(x=>x.path==='/taksong/').title+'</title>'),'taksong hub title matches central SEO rules');
  assert.ok(koreanDaeri.includes('<title>'+require('../data/seo-pages.json').pages.find(x=>x.path==='/daeri/').title+'</title>'),'daeri hub title matches central SEO rules');
  assert.ok(koreanTaksong.includes('property="og:site_name" content="스마트24 전국대리운전·24시탁송"'));
  assert.ok(koreanDaeri.includes('property="og:site_name" content="스마트24 전국대리운전·24시탁송"'));
  assert.ok(koreanDaeri.includes('id="national-driver-guide"'),'national driving hub explains general, long-distance and golf reservation differences');
  const regionalDriverNav=koreanDaeri.split('id="priority-regions"')[1]?.split('</section>')[0]||'';
  for(const [path,keyword] of [['/daeri/seoul/','서울대리운전'],['/daeri/busan/','부산대리운전'],['/daeri/daegu/','대구대리운전'],['/daeri/incheon/','인천대리운전'],['/daeri/gangwon/sokcho-si/','속초대리운전']]){
   assert.ok(regionalDriverNav.includes('href="'+path+'"'),path+' appears in curated nationwide driver links');
   assert.ok(regionalDriverNav.includes('>'+keyword+'</a>'),keyword+' uses a natural region search phrase without creating duplicate pages');
  }
  assert.ok(koreanDaeri.includes('전국 주요 지역 대리운전 예약 안내'));

  assert.ok(koreanDaeri.includes('id="national-driver-source-links"'),'national driving hub links existing pre-August-25 Naver content');
  assert.ok(koreanDaeri.includes('blog.naver.com/wjdtnr4757/224388328571'),'national driving page points to the August 24 long-distance guide');
  assert.ok(koreanDaeri.includes('1811-4294'),'national driving page preserves the official contact number');
  assert.ok(!koreanTaksong.includes('id="national-driver-source-links"'),'vehicle delivery hub keeps its own distinct subject');
  assert.ok(koreanDaeri.includes('id="long-distance-daeri-verified"'),'national daeri hub explains long-distance booking with verified examples');
  for(const phrase of ['해운대중동 → 평택신장동','고흥군 → 종로숭인동','창원시 월영동 → 부산 부산진구','과거 금액','기사 복귀 교통편'])assert.ok(koreanDaeri.includes(phrase),'long-distance guidance contains verified source and booking advice: '+phrase);
  assert.ok(koreanDaeri.includes('170,000원')&&koreanDaeri.includes('190,000원')&&koreanDaeri.includes('60,000원'),'only confirmed historical fares are displayed for selected rides');
  const longDistanceSection=koreanDaeri.split('id="long-distance-daeri-verified"')[1]?.split('</section>')[0]||'';
  assert.equal((longDistanceSection.match(/href="\/reviews\/[a-f0-9]{16}\//g)||[]).length,3,'three verified completed ride details are linked');
  assert.ok(!koreanTaksong.includes('id="long-distance-daeri-verified"'),'taksong page never gets driver-specific completed rides');

  assert.ok(seoHome.includes('id="home-priority-regions"'),'homepage links to priority regional service pages');
  assert.ok(seoHome.includes('/taksong/busan/'),'homepage has direct Busan taksong link');
  assert.ok(seoHome.includes('/daeri/daegu/'),'homepage has direct Daegu driver link');
  const crosslinkBusanTaksong=await (await get('/taksong/busan/')).text();
  assert.ok(crosslinkBusanTaksong.includes('id="regional-blog-links"'),'Busan region has related published Naver blog posts');
  assert.ok(crosslinkBusanTaksong.includes('blog.naver.com/wjdtnr4757/'),'regional blog links use the operator blog');
  assert.ok(crosslinkBusanTaksong.includes('/reviews/history/'),'regional page links verified ride history');
  const crosslinkBusanDaeri=await (await get('/daeri/busan/')).text();
  // Province driver pages use a curated 17-province editorial component, not the generic regional-blog-links widget.
  assert.ok(crosslinkBusanDaeri.includes('id="province-daeri-blog-guide"'),'Busan driver page includes the curated province editorial');
  assert.ok(crosslinkBusanDaeri.includes('https://blog.naver.com/wjdtnr4757/224452970245'),'Busan driver page links its curated real operator blog article');
  assert.ok(crosslinkBusanDaeri.includes('blog.naver.com/wjdtnr4757/'),'driver page uses operator blog');
  assert.ok(!crosslinkBusanDaeri.includes('blog.naver.com/eom4757/'),'old unrelated blog ID must never leak');
  assert.ok(!crosslinkBusanDaeri.includes('부산동부권탁송 기장군탁송'),'taksong article must not be misclassified as daeri via brand name');
  assert.ok(!crosslinkBusanDaeri.includes('대리운전 이용 목적</h2>'),'priority regional pages should avoid repeated keyword-dump sections');
  const gimhaeDaeriQuality=await (await get('/daeri/gyeongnam/gimhae-si/')).text();
  assert.ok(!gimhaeDaeriQuality.includes('김해공항탁송 부산강서구'),'Gimhae Airport in Busan is not evidence for Gimhae city driver services');
  const busanTaksongQuality=await (await get('/taksong/busan/')).text();
  assert.ok(busanTaksongQuality.includes('부산탁송'),'taksong regional page still links a relevant operator post');
  assert.ok(!busanTaksongQuality.includes('차량탁송 이용 목적</h2>'),'priority taksong region avoids keyword-dump section');
  const gangwonDaeriBlogPage=await (await get('/daeri/gangwon/')).text();
  const gangwonDaeriBlogLinks=gangwonDaeriBlogPage.split('id="province-daeri-blog-guide"')[1]?.split('</section>')[0]||'';
  assert.ok(gangwonDaeriBlogPage.includes('id="province-daeri-blog-guide"'),'Gangwon driver page keeps curated local service guide');
  assert.ok(gangwonDaeriBlogPage.includes('https://blog.naver.com/wjdtnr4757/224420736659'),'Gangwon driver page keeps a real source article');
  assert.ok(!gangwonDaeriBlogLinks.includes('눈 내리는 부산'),'Gangwon region intro stays region-relevant');

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
  assert.ok(localityHtml.includes('동부리 실제 운행기록 확인 안내'));
  assert.ok(localityHtml.includes('이 행정구역의 출발 또는 도착이 확인된 운행은 없습니다'));
  assert.ok(localityHtml.includes('이름이 비슷한 다른 지역의 운행사례를 이곳의 실적으로 표시하지 않습니다'));
  assert.ok(!/href="\/reviews\/[a-f0-9]{16}\//.test(localityHtml),'local pages without confirmed rides must not feature unrelated records');
  assert.ok(localityHtml.includes('/reviews/history/?kind=taksong'),'all actual records remain accessible through a clearly labelled national archive');
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

   // The two URLs previously shown as Naver Search Advisor collection-limited are auditable.
   const oldLandingResponse=await get('/taksongdaeri/');
   assert.equal(oldLandingResponse.status,200,'combined service landing stays accessible');
   const oldLandingHtml=await oldLandingResponse.text();
   assert.ok(oldLandingHtml.includes('<link rel="canonical" href="https://example.com/taksongdaeri/">'),'combined landing owns its canonical');
   assert.ok(oldLandingHtml.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),'combined landing permits indexing');
   const oldLandingSchema=oldLandingHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
   assert.ok(oldLandingSchema,'combined landing has valid structured data');
   assert.equal(JSON.parse(oldLandingSchema[1]).url,'https://example.com/taksongdaeri/');
   const faviconResponse=await get('/favicon.ico');
   assert.equal(faviconResponse.status,200,'favicon URL returns 200');
   assert.ok(/^image\//.test(faviconResponse.headers.get('content-type')||''),'favicon has an image MIME type');
   assert.ok((await faviconResponse.arrayBuffer()).byteLength>=100,'favicon is a nonempty image');
   assert.equal(faviconResponse.headers.get('content-type'),'image/x-icon','favicon uses explicit ICO MIME');
   const faviconSize=Number(faviconResponse.headers.get('content-length'));
   assert.ok(faviconSize>=100,'favicon has a stable content length');
   const faviconHead=await fetch('http://127.0.0.1:'+port+'/favicon.ico',{method:'HEAD'});
   assert.equal(faviconHead.status,200,'favicon HEAD request succeeds for search crawlers');
   assert.equal(Number(faviconHead.headers.get('content-length')),faviconSize,'favicon HEAD and GET sizes agree');
   assert.equal((await faviconHead.arrayBuffer()).byteLength,0,'HEAD favicon response has no body');
   const homepageMarkup=await (await get('/')).text();
   assert.ok(homepageMarkup.includes('rel="icon"'),'homepage explicitly exposes favicon');
   const regionMarkup=await (await get('/taksong/busan/')).text();
   assert.ok(regionMarkup.includes('rel="icon"'),'region pages expose favicon in head');
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
  // Real route history searches accept the words customers type, not just exact place names.
  for(const phrase of ['설악산탁송','오색탁송','백담사탁송','영덕탁송','강릉탁송']){
    const page=await get('/reviews/history/?kind=taksong&q='+encodeURIComponent(phrase));
    const html=await page.text();
    assert.equal(page.status,200,phrase+' completed review query responds');
    assert.ok(html.includes('실제 운행완료 후기'),phrase+' review search stays rendered');
    assert.ok(html.includes('예상요금 조회')||html.includes('검색 결과가 없습니다'),phrase+' keeps accurate quote/no-result state');
  }
  const historyListResponse=await get('/reviews/history/?kind=taksong');
  const historyListHtml=await historyListResponse.text();
  assert.equal(historyListResponse.status,200);
  assert.ok(historyListHtml.includes('804건'),'actual taksong count');
  const unknownFareRecord=historyListHtml.match(/href="\/fare\/\?service=taksong[^"]*"[^>]*>예상요금 조회/);
  assert.ok(unknownFareRecord,'historical fares remain linked');
  const hiddenRide=await (await get('/reviews/history/?kind=daeri&q='+encodeURIComponent('지역 비공개'))).text();
  assert.ok(hiddenRide.includes('출발·도착 지역 검색'),'search stays available');
  const recordHtml=await (await get('/reviews/history/excel-0001/')).text();
  assert.ok(recordHtml.includes('class="service-journey"'));
  assert.ok(recordHtml.includes('2026-10-16'));
  assert.ok(recordHtml.includes('70,000원'));
  assert.ok(recordHtml.includes('이 운행기록에서 읽히는 실제 현장 정보'),'all completed rides describe record-specific conditions');
  assert.ok(recordHtml.includes('08:04:23'),'first record explicitly shows logged time without inventing departure time');
  assert.ok(recordHtml.includes('출발·도착 시각으로 단정하지 않습니다'),'logged timestamp cannot be represented as drive time');
  assert.ok(recordHtml.includes('주거단지 관련 위치가 기록돼 있습니다'),'original route-specific residence context is recognized');
  assert.ok(recordHtml.includes('실제 출발·도착 지역 연결'),'verified region links stay attached to each ride');
  const mountainRide=await (await get('/reviews/history/excel-0012/')).text();
  assert.ok(mountainRide.includes('산행 출발지·하산지 관련 지명이 운행기록에 포함돼 있습니다'),'mountain rides use recorded place clues');
  assert.ok(mountainRide.includes('백담사'),'original mountain location survives in the review');
  const serviceCenterRide=await (await get('/reviews/history/excel-0008/')).text();
  assert.ok(serviceCenterRide.includes('정비·서비스센터 관련 장소가 기록돼 있습니다'),'service-center journeys use verified source-specific context');

  assert.ok(recordHtml.includes('2배 이상의 금액'));
  assert.ok(recordHtml.includes('100% 배차·운행완료'));
  assert.ok(recordHtml.includes('자료에 예약 여부') ,'do not invent booking status');
  const gyeongsan=await (await get('/taksong/gyeongbuk/gyeongsan-si/')).text();
  assert.ok(gyeongsan.includes('실제 완료 운행내역에서 작성한 후기'));
  assert.ok(gyeongsan.includes('excel-0001/'),'region-specific reviewed historical dispatch linked');
  assert.ok(gyeongsan.includes('id="regional-archive-matched-ride-links"'),'verified original archive visibly linked');
  assert.equal((gyeongsan.match(/id="regional-archive-matched-ride-links"/g)||[]).length,1,'region archive is not duplicated');
  assert.ok(gyeongsan.indexOf('id="regional-archive-matched-ride-links"')<gyeongsan.indexOf('지역별 탁송 경로'),'actual evidence should precede generic regional navigation');
  assert.ok(!gyeongsan.includes('<h2>예약·예상요금·빠른배차</h2>'),'remove duplicate generic booking block from regional output');


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
  // Strong Busan/Ulsan locality intent without duplicating the brand image or
  // inventing a delivered ride. Priority pages need source-linked local context.
  const priorityRegions=require('../data/priority-regions.json').pages;
  assert.ok(priorityRegions.length>=34,'current 34+ unique curated service regions remain available');
  assert.ok(priorityRegions.some(p=>p.kind==='taksong'&&p.region==='울산광역시'),
    'Ulsan is an actual curated taksong priority, not a generic province directory');
  const ulsanHtml=await (await get('/taksong/ulsan/')).text();
  assert.ok(ulsanHtml.includes('<title>울산탁송 후기') && ulsanHtml.includes('남구 삼산동·동구 방어진'),
    'Ulsan title gives locality-first service intent');
  assert.ok(ulsanHtml.includes('id="southeast-taksong-local-evidence"') &&
    ulsanHtml.includes('href="/taksong/ulsan/ulju-gun/"'),
    'Ulsan links local district/county pages and specific pickup guidance');
  assert.ok(ulsanHtml.includes('blog.naver.com/wjdtnr4757/224441226524'),
    'Ulsan evidence comes from a published Naver blog source');
  const busanEvidence=await (await get('/taksong/busan/')).text();
  assert.ok(busanEvidence.includes('id="southeast-taksong-local-evidence"')&&
    busanEvidence.includes('blog.naver.com/wjdtnr4757/224445300887'),
    'Busan links regional landmarks to existing published source rather than made-up completions');
  for(const [region,html] of [['busan',busanEvidence],['ulsan',ulsanHtml]]){
    const imagePath=region==='busan'?'/card/area-494-taksong-brand-v5.png':null;
    assert.equal((html.match(/<img src="\/card\/area-[0-9]+-taksong-brand-v5.png"/g)||[]).length,1,
      'region branded hero image must be shown exactly once: '+region);
    assert.ok(html.includes('href="tel:18114294"')&&html.includes('href="https://open.kakao.com/o/sGV88r7h"'),
      'Busan and Ulsan local booking paths remain accessible: '+region);
  }
  const curSitemap=await (await get('/sitemap-priority.xml')).text();
  assert.ok(curSitemap.includes('https://example.com/taksong/ulsan/'),
    'priority crawl sitemap includes Ulsan canonical landing');
  const regionSitemap=await (await get('/sitemap-taksong.xml')).text();
  for(const route of ['/taksong/ulsan/nam-gu/','/taksong/ulsan/dong-gu/','/taksong/ulsan/buk-gu/','/taksong/ulsan/ulju-gun/'])
    assert.ok(regionSitemap.includes('https://example.com'+route),'regional discovery includes '+route);
  const hubHtml=await (await get('/taksong/')).text();

  // Nationwide service hubs must display distinct branded previews and correct explanations.
  const daeriHubHtml=await (await get('/daeri/')).text();
  assert.ok(daeriHubHtml.includes('id="national-daeri-business-card"')&&daeriHubHtml.includes('src="/assets/smart24-daeri-brand.png"'),'driver hub displays the actual daeri card');
  assert.ok(daeriHubHtml.includes('고객의 차량을 기사가 대신 운전하는 서비스'),'driver hub describes designated driving, not vehicle handover');
  assert.ok(hubHtml.includes('id="national-taksong-business-card"')&&hubHtml.includes('src="/assets/smart24-taksong-brand.png"'),'taksong hub displays the actual taksong card');
  assert.ok(hubHtml.includes('고객 차량만 출발지에서 인수'),'taksong hub describes vehicle handover');
  const [daeriCard,taksongCard]=await Promise.all([get('/assets/smart24-daeri-brand.png'),get('/assets/smart24-taksong-brand.png')]);
  assert.equal(daeriCard.status,200);assert.equal(taksongCard.status,200);
  assert.ok(daeriCard.headers.get('content-type').includes('image/png')&&taksongCard.headers.get('content-type').includes('image/png'),'business cards return PNG');
  assert.ok(!Buffer.from(await daeriCard.arrayBuffer()).equals(Buffer.from(await taksongCard.arrayBuffer())),'daeri and taksong business card artwork must actually differ');
  const inferredRegion=await (await get('/region/?q='+encodeURIComponent('부산대리운전'))).text();
  assert.ok(/\/card\/area-\d+-daeri-brand-v5\.png/.test(inferredRegion),'search text 대리운전 selects daeri card');

  assert.ok(hubHtml.includes('href="/taksong/ulsan/"')&&hubHtml.includes('>울산탁송</a>'),
    'national taksong hub uses a concise Ulsan keyword anchor');
  const busanHtml=await (await get('/taksong/busan/')).text();const busanGraph=[...busanHtml.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flatMap(x=>x['@graph']||[x]);assert.ok(busanHtml.includes('<title>부산탁송 후기｜부산 연산동→경산 중산동 실제 자동차탁송'),'Busan title must lead with the confirmed local review theme');
  const reviewLeadPos=busanHtml.indexOf('id="busan-taksong-real-review-first-20261104"');
  assert.ok(reviewLeadPos>0&&reviewLeadPos<busanHtml.indexOf('id="regional-provider-keywords"'),'Busan true reviews precede provider copy');
  assert.ok(busanHtml.includes('https://blog.naver.com/wjdtnr4757/224445300887'),'Busan review contains the existing original post');
  const busanTags=busanHtml.match(/<p class="busan-local-taksong-tags">([^<]+)<\/p>/);
  assert.ok(busanTags&&busanTags[1].trim().split(/\s+/).length===30,'Busan region review guide retains exactly 30 local tags');
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
  const eupResponse=await get('/daeri/incheon/ganghwa-gun/ganghwa-eup/');
  assert.equal(eupResponse.status,200,'Ganghwa-eup canonical page must be available');
  const eupHtml=await eupResponse.text();
  const eupTitle=(eupHtml.match(/<title>([^<]+)<\/title>/)||[])[1]||'';
  assert.ok(eupTitle.includes('강화읍')&&eupTitle.includes('대리운전'),
   'Ganghwa-eup title must identify the actual locality and driver service: '+eupTitle);
  assert.ok(eupHtml.includes('href="/daeri/incheon/"')&&eupHtml.includes('href="/daeri/incheon/ganghwa-gun/"'),
   'Ganghwa-eup breadcrumbs must link to correct Incheon ancestors');
  const ganghwa=await (await get('/daeri/incheon/ganghwa-gun/')).text();assert.ok(ganghwa.includes('id="destination-guide"'));assert.ok(ganghwa.includes('/keyword-search/'));
  for(const p of ['/fare/jeju/','/assets/road-fare.js','/assets/jeju-quote.js','/assets/jeju-ferry-rates.json'])assert.equal((await get(p)).status,200,p);
  const jejuPage=await (await get('/taksong/jeju/')).text();assert.ok(jejuPage.includes('/fare/jeju/'));assert.ok(jejuPage.includes('275,000원'));
  assert.ok(jejuPage.includes('href="tel:18775245"')&&jejuPage.includes('1877-5245'),'Jeju landing page links its dedicated phone');
  assert.ok(!jejuPage.includes('tel:18114294')&&!jejuPage.includes('1811-4294'),'Jeju landing page contains no conflicting nationwide phone');
  assert.ok(/property="og:image" content="https:\/\/example\.com\/card\/area-\d+-taksong-brand-v5\.png"/.test(jejuPage),'Jeju card OG image must be locality specific');
  assert.ok(jejuPage.includes('primaryImageOfPage'),'Jeju JSON-LD should link dedicated phone and locality image');
  const jejuFareHtml=await (await get('/fare/jeju/')).text();
  assert.ok(jejuFareHtml.includes('1877-5245')&&jejuFareHtml.includes('tel:18775245'),'Jeju quote page uses the correct phone');
  const slugs=new Set(regions.map(r=>r.slug));assert.equal(slugs.size,regions.length,'duplicate slugs');
  assert.equal(regions.filter(r=>r.level==='시도').length,17,'17 provinces expected');
  const fullNames=new Set(regions.map(r=>r.full_name));assert.equal(fullNames.size,regions.length,'duplicate full region paths');
  for(const r of regions){const parent=r.full_name.split(' ').slice(0,-1).join(' ');if(parent)assert.ok(fullNames.has(parent),'missing parent: '+r.full_name)}
  const samples=[regions[0],regions.find(r=>r.full_name==='서울특별시 강남구'),regions.at(-1)].filter(Boolean);
  for(const r of samples){const res=await get('/region/'+r.slug+'/');assert.equal(res.status,200,r.slug);const html=await res.text();assert.ok(html.includes(r.name));assert.ok(html.includes('대리운전'));assert.ok(html.includes('자동차탁송'));assert.ok(html.includes('1811-4294'));assert.ok(html.includes('일일기사'))}
  const missing=await get('/region/not-a-real-region/');assert.equal(missing.status,404);
  // A mobile mountain keyword must open its own original fare poster, not the generic Smart24 card.
  const mountainQueries=[
   ['설악산탁송','seoraksan'],['설악산 종주 탁송','seoraksan'],['한계령소공원탁송','seoraksan'],
   ['지리산탁송','jirisan'],['지리산 종주 탁송','jirisan'],['성삼재중산리탁송','jirisan']
  ];
  for(const [keyword,mountain] of mountainQueries){
    const result=await get('/?q='+encodeURIComponent(keyword));
    assert.equal(result.status,200,'search redirects to dedicated page: '+keyword);
    assert.ok(decodeURIComponent(result.url).includes('/'+(mountain==='seoraksan'?'설악산탁송':'지리산탁송')+'/'),'no generic homepage for mountain keyword: '+keyword);
    const body=await result.text();
    assert.ok(body.startsWith('<!doctype html>')&&body.includes('<body><figure id="original-mountain-fare-visual"')&&body.includes('id="mountain-route-fare-table-202611"'),'mountain original poster and fares are both visible: '+keyword);
    assert.ok(body.includes('src="/assets/'+mountain+'-taksong-original-fare.png"'),'correct mountain PNG: '+keyword);
    assert.ok(!body.includes('id="mobile-direct-image-priority"'),'no homepage Smart24 hero: '+keyword);
  }
  const referrerResult=await fetch('http://127.0.0.1:'+port+'/',{headers:{referer:'https://search.naver.com/search.naver?query='+encodeURIComponent('설악산탁송')},redirect:'manual'});
  assert.equal(referrerResult.status,302,'available search referrer resolves to image-first Seoraksan page');
  assert.equal(referrerResult.headers.get('location'),encodeURI('/설악산탁송/'));
  for(const [segment,mountain] of [['설악산탁송','seoraksan'],['지리산탁송','jirisan']]){
    const seo=await get('/'+encodeURIComponent(segment)+'/');
    assert.equal(seo.status,200,'Korean keyword URL resolves');
    const html=await seo.text();
    assert.ok(html.includes('<body><figure id="original-mountain-fare-visual"')&&html.includes('id="mountain-route-fare-table-202611"'),'Korean keyword URL leads with original fare poster and preserves readable fares');
    assert.ok(html.includes('src="/assets/'+mountain+'-taksong-original-fare.png"'),'correct original mountain fare image');
    assert.ok(html.includes('rel="canonical" href="https://jeongukdaeri.kr/'+segment+'/"'),'Korean URL is canonical');
  }
  const nationwideHome=await get('/');
  assert.equal(nationwideHome.status,200,'plain homepage remains nationwide');
  const nationwideHtml=await nationwideHome.text();
  assert.ok(nationwideHtml.includes('id="mobile-direct-image-priority"'),'ordinary homepage retains mountain direct-view mobile hero');
  assert.ok(nationwideHtml.indexOf('<header')>=0&&nationwideHtml.indexOf('<header')<nationwideHtml.indexOf('<section id="mobile-direct-image-priority"'),'general-service header comes before the mountain mobile poster');
  const firstMobileHero=nationwideHtml.slice(nationwideHtml.indexOf('id="mobile-direct-image-priority"'),nationwideHtml.indexOf('</section>',nationwideHtml.indexOf('id="mobile-direct-image-priority"')));
  assert.ok(firstMobileHero.includes('src="/assets/seoraksan-taksong-original-fare.png"'),'Seoraksan original fare first');
  assert.ok(firstMobileHero.includes('src="/assets/jirisan-taksong-original-fare.png"'),'Jirisan original fare in same direct-view area');
  assert.ok(!firstMobileHero.includes('smart24-business-card-inline.webp'),'generic brand card no longer blocks mobile mountain posters');
  const specialHub=await (await get('/special/')).text();
  assert.ok(specialHub.includes('<body><section aria-label="설악산·지리산 원본 요금표 우선 안내"'),'special category menu follows original poster');
  assert.ok(specialHub.indexOf('src="/assets/seoraksan-taksong-original-fare.png"')<specialHub.indexOf('<header>'),'Seoraksan original poster before special category menu');
  // All legal-area levels share one on-demand image generator; never need hand-authored 10-image batches.
  const imageSamples=[
   regions.find(r=>r.full_name==='경상남도 창원시'),
   regions.find(r=>r.full_name==='부산광역시 기장군'),
   ...['읍','면','동','리'].map(suffix=>regions.find(r=>r.name.endsWith(suffix)))
  ].filter(Boolean);
  assert.equal(imageSamples.length,6,'city, county, town, township, neighborhood and village samples must exist');
  for(const r of imageSamples){
   const page=await (await get('/region/'+r.slug+'/')).text();
   assert.ok(page.includes('<figure')&&page.includes('alt='),'regional directory retains its local image');
   const taksongUrl=page.match(/href="(\/taksong\/[^"]+\/)"/)?.[1];
   assert.ok(taksongUrl,'region links to dedicated taksong landing: '+r.full_name);
   for(const kind of ['taksong','daeri']){
    const serviceUrl=page.match(new RegExp('href="(/'+kind+'/[^"]+/)"'))?.[1];
    assert.ok(serviceUrl,'dedicated '+kind+' link: '+r.full_name);
    const response=await get(serviceUrl);assert.equal(response.status,200,serviceUrl);
    const html=await response.text();
    const imagePath='/card/'+r.slug+'-'+kind+'-brand-v5.png';
    assert.ok(html.includes('<figure'),'region image remains visible without an oversized first-view placement: '+serviceUrl);
    assert.ok(html.includes('src="'+imagePath+'"'),'only correct locality and service image is linked: '+serviceUrl);
    assert.ok(html.includes('class="regional-responsive-card"')&&html.includes('href="'+imagePath+'" target="_blank"'),'card should resize and open its full-resolution version on tap: '+serviceUrl);
    assert.ok(html.includes('max-width:700px')&&html.includes('height:auto'),'region card must fit phone and desktop viewport: '+serviceUrl);
    const firstCardAt=html.indexOf('class="regional-responsive-card"'),evidenceAt=html.indexOf('id="priority-verified-rides"');
    assert(firstCardAt>0&&(evidenceAt<0||firstCardAt<evidenceAt),'regional card buried beneath long evidence: '+serviceUrl);
    
    assert.ok(html.includes('property="og:image" content="https://example.com'+imagePath+'"'),'search image matches body image: '+serviceUrl);
    const picture=await get(imagePath);assert.equal(picture.status,200,'on-demand PNG exists: '+imagePath);
    assert.ok(picture.headers.get('content-type').includes('image/png'),'image has PNG MIME: '+imagePath);
    const signature=new Uint8Array(await picture.arrayBuffer()).slice(0,8);
    assert.deepEqual([...signature],[137,80,78,71,13,10,26,10],'valid PNG: '+imagePath);
   }
  }
  // Keyword+service searches go straight to the matching locality-first banner.
  for(const [query,canonicalPath,headline] of [
   ['창원탁송','/taksong/gyeongnam/changwon-si/','창원전국탁송'],
   ['창원전국탁송','/taksong/gyeongnam/changwon-si/','창원전국탁송'],
   ['부산탁송','/taksong/busan/','부산전국탁송'],
   ['부산전국탁송','/taksong/busan/','부산전국탁송'],
   ['기장군탁송','/taksong/busan/gijang-gun/','기장전국탁송']
  ]){
   for(const entry of ['/?q=','/region/?q=']){
    const response=await get(entry+encodeURIComponent(query));
    assert.equal(response.status,200,'regional search resolves: '+query);
    assert.equal(new URL(response.url).pathname,canonicalPath,'regional keyword selects matching landing: '+query);
    const html=await response.text();
    assert.ok(html.includes('<figure')&&html.includes(headline),'region+전국탁송 banner and locality identity are visible: '+query);
    assert.ok(/src="\/card\/area-\d+-taksong-brand-v5\.png"/.test(html),'new image URL avoids previous browser cache: '+query);
   }
  }
  // Sample ten local service destinations: all must use distinct dynamic v3 PNGs.
  const automaticLocalCards=[
   ['/taksong/busan/','부산전국탁송'],['/taksong/daegu/','대구전국탁송'],
   ['/taksong/incheon/','인천전국탁송'],['/taksong/ulsan/','울산전국탁송'],
   ['/taksong/gyeongnam/changwon-si/','창원전국탁송'],
   ['/taksong/gyeongnam/gimhae-si/','김해전국탁송'],
   ['/taksong/gangwon/gangreung-si/','강릉전국탁송'],
   ['/taksong/gangwon/sokcho-si/','속초전국탁송'],
   ['/daeri/busan/','부산스마트대리운전'],['/daeri/daegu/','대구스마트대리운전']
  ];
  const uniqueCardUrls=new Set();
  for(const [route,brand] of automaticLocalCards){
    const html=await (await get(route)).text();
    const og=html.match(/<meta property="og:image" content="https:\/\/example\.com(\/card\/area-\d+-(?:taksong|daeri)-brand-v5\.png)"/);
    assert(og,'regional og:image missing: '+route);
    assert(!uniqueCardUrls.has(og[1]),'generic card reused across localities: '+route);
    uniqueCardUrls.add(og[1]);
    assert(html.includes(brand)&&html.includes('src="'+og[1]+'"'),'wrong city or service on image: '+route);
    assert(html.includes('href="'+og[1]+'" target="_blank"'),'cannot expand regional image: '+route);
    assert(html.includes('property="og:image:alt"'),'search thumbnail description missing: '+route);
  }
  for(const [q,label] of [['부산','부산광역시'],['강릉','강릉시'],['속초','속초시']]){
    const html=await (await get('/region/?q='+encodeURIComponent(q))).text();
    assert(html.includes('class="dynamic-region-card-directory"'),'region directory has no image previews');
    assert(html.includes('class="dynamic-region-card-preview" open'),'unique region should auto-expand: '+q);
    assert(html.includes(label),'regional search lacks '+label);
  }
  const inferredServiceKeyword=await (await get('/region/?q='+encodeURIComponent('부산대리운전'))).text();
  assert.ok(inferredServiceKeyword.includes('class="dynamic-region-card-preview" open'),'region+대리운전 query automatically expands an exact-locality driver card');
  assert.ok(inferredServiceKeyword.includes('id="region-card-keyword-form"')&&inferredServiceKeyword.includes('name="service"'),'dynamic search has an explicit service selector');
  assert.ok(/\/card\/area-\d+-daeri-brand-v5\.png/.test(inferredServiceKeyword)&&!inferredServiceKeyword.includes('/card/area-494-taksong-brand-v5.png'),'typed driver keyword must not show a taksong card');
  const cityBoth=(await (await get('/region/?q='+encodeURIComponent('부산'))).text());
  assert.ok(/\/card\/area-\d+-daeri-brand-v5\.png/.test(cityBoth)&&/\/card\/area-\d+-taksong-brand-v5\.png/.test(cityBoth),'unqualified region displays two different service images');
  const requestedTaksong=(await (await get('/region/?q='+encodeURIComponent('울산')+'&service=taksong')).text());
  assert.ok(requestedTaksong.includes('class="dynamic-region-card-preview" open'),'explicit taksong filter should open matching region; markup excerpt '+requestedTaksong.match(/<details[^>]*>/)?.[0]);
  assert.ok(requestedTaksong.includes('울산광역시 탁송')&&
   /\/card\/area-\d+-taksong-brand-v5\.png/.test(requestedTaksong)&&
   !/\/card\/area-\d+-daeri-brand-v5\.png/.test(requestedTaksong),
   'explicit Ulsan taksong filter must show the correct legal locality and taksong-only card');
  const homeCardSearch=(await (await get('/')).text());
  assert.ok(homeCardSearch.includes('id="dynamic-service-card-search-20261103"')&&homeCardSearch.includes('action="/region/"')&&homeCardSearch.includes('지역별 명함 자동확장 보기'),'homepage offers responsive region service card search');
  assert.ok(homeCardSearch.includes('id="mountain-cycling-fare-first-20261103"')&&homeCardSearch.includes('id="homepage-fare-top"'),'home retains original fare and calculator');

  // Live business-card previews must work without a second page load.
  const getPreview=async(q,service='')=>{
   const params=new URLSearchParams({q});if(service)params.set('service',service);
   const response=await get('/api/region-card-preview?'+params.toString());
   assert.equal(response.status,200,'card-preview endpoint reachable');
   assert.ok(response.headers.get('content-type').includes('application/json'),'card-preview API uses JSON only');
   assert.ok(response.headers.get('x-robots-tag').includes('noindex'),'search API itself must not be indexed');
   return response.json();
  };
  const driverPreview=await getPreview('부산대리운전');
  assert.equal(driverPreview.status,'matched');assert.equal(driverPreview.service,'daeri');
  assert.equal(driverPreview.cards.length,1);assert.equal(driverPreview.cards[0].kind,'daeri');
  assert.ok(driverPreview.cards[0].image.endsWith('-daeri-brand-v5.png'));
  const taksongPreview=await getPreview('울산탁송');
  assert.equal(taksongPreview.status,'matched');assert.equal(taksongPreview.region,'울산광역시');
  assert.equal(taksongPreview.cards.length,1);assert.equal(taksongPreview.cards[0].kind,'taksong');
  const seoulDistrict=await getPreview('서울 강남구','taksong');
  assert.equal(seoulDistrict.status,'matched');assert.equal(seoulDistrict.cards[0].kind,'taksong');
  const bothPreview=await getPreview('부산');
  assert.equal(bothPreview.cards.length,2);assert.deepEqual(bothPreview.cards.map(x=>x.kind),['daeri','taksong']);
  assert.notEqual(bothPreview.cards[0].image,bothPreview.cards[1].image);
  const homonyms=await getPreview('광주');
  assert.equal(homonyms.status,'ambiguous');assert.equal(homonyms.cards.length,0);
  assert.ok(homonyms.candidates.some(c=>c.name==='광주광역시')&&homonyms.candidates.some(c=>c.name.includes('경기도 광주시')));
  const jejuPreview=await getPreview('제주도탁송');
  assert.equal(jejuPreview.status,'matched');assert.equal(jejuPreview.cards[0].phone,'1877-5245');
  const missingPreview=await getPreview('존재하지않는지역명');
  assert.equal(missingPreview.status,'not_found');assert.equal(missingPreview.cards.length,0);
  // Common abbreviated Korea-region combinations must resolve without conflating homonyms.
  for(const [keyword,kind,expected] of [
   ['경기광주탁송','taksong','경기도 광주시'],
   ['서울강남탁송','taksong','서울특별시 강남구'],
   ['수원영통대리운전','daeri','경기도 수원시 영통구'],
   ['부산시탁송','taksong','부산광역시'],
   ['대구시대리운전','daeri','대구광역시'],
  ]){
   const data=await getPreview(keyword);
   assert.equal(data.status,'matched','abbreviated locality not resolved: '+keyword);
   assert.equal(data.region,expected,'wrong same-name locality: '+keyword);
   assert.equal(data.cards[0].kind,kind,'wrong service for local search: '+keyword);
  }
  const duplicateDistrict=await getPreview('동구탁송');
  assert.equal(duplicateDistrict.status,'ambiguous','same-name Dong-gu must not auto-choose a province');
  assert.equal(duplicateDistrict.cards.length,0,'ambiguous district cannot claim a specific local ride');
  // PNG remains the share/search original; 800-pixel WebP is used only as mobile preview.
  assert.ok(taksongPreview.cards[0].image.endsWith('.png'));
  assert.ok(taksongPreview.cards[0].previewImage.endsWith('-taksong-brand-v5.webp'));
  assert.notEqual(taksongPreview.cards[0].previewImage,taksongPreview.cards[0].image);
  const previewImagePath=taksongPreview.cards[0].previewImage;
  const mobileImage=await get(previewImagePath);
  assert.equal(mobileImage.status,200,'mobile WebP card image must resolve');
  assert.ok(mobileImage.headers.get('content-type').includes('image/webp'));
  const etag=mobileImage.headers.get('etag');assert.ok(etag,'versioned preview must have conditional caching');
  const mobileBytes=Buffer.from(await mobileImage.arrayBuffer());
  assert.equal(mobileBytes.subarray(0,4).toString(),'RIFF');
  assert.equal(mobileBytes.subarray(8,12).toString(),'WEBP');
  const dimensions=await require('sharp')(mobileBytes).metadata();
  assert.equal(dimensions.width,800);assert.ok(dimensions.height>=530&&dimensions.height<=535);
  const originalImage=await get(taksongPreview.cards[0].image);
  assert.equal(originalImage.status,200);assert.ok(originalImage.headers.get('content-type').includes('image/png'));
  assert.ok(mobileBytes.byteLength<(await originalImage.arrayBuffer()).byteLength,'mobile WebP should use fewer bytes than crawler PNG');
  const cached=await fetch('http://127.0.0.1:'+port+previewImagePath,{headers:{'if-none-match':etag}});
  assert.equal(cached.status,304,'WebP conditional cache response should not download image twice');
  const head=await fetch('http://127.0.0.1:'+port+previewImagePath,{method:'HEAD'});
  assert.equal(head.status,200);assert.ok(head.headers.get('content-type').includes('image/webp'));
  const liveScript=await (await get('/assets/region-card-preview.js')).text();
  const liveCss=await (await get('/assets/region-card-preview.css')).text();
  assert.ok(liveScript.includes('card.previewImage')&&liveScript.includes('pngFallback'),'browser must prefer WebP and fall back to PNG');
  assert.ok(liveScript.includes("picture.addEventListener('click'")&&liveScript.includes('openZoom(original,img.alt,picture)'),'tapping actual image should open original zoom');
  assert.ok(liveScript.includes('lastActivator.focus()')&&liveCss.includes('.smart24-card-picture-link:focus-visible'),'keyboard focus and visible focus ring are retained');
  assert.ok(liveScript.includes('++sequence')&&liveScript.includes('controller.abort()'),'stale fast-typing requests are cancelled');
  const currentHome=await (await get('/')).text();
  const previewScriptVersion=(currentHome.match(/region-card-preview\.js\?v=([^"]+)/)||[])[1];
  const previewCssVersion=(currentHome.match(/region-card-preview\.css\?v=([^"]+)/)||[])[1];
  assert.ok(previewScriptVersion&&previewCssVersion&&
   previewScriptVersion==='20261106-traverse-information'&&previewCssVersion==='20261103-keyword3',
   'versioned, updated JS and CSS must bypass stale mobile browser caches');
  for(const asset of ['/assets/region-card-preview.js','/assets/region-card-preview.css']){
   const r=await get(asset);assert.equal(r.status,200,asset);
   const body=await r.text();assert.ok(body.length>600&&/card-(?:preview|dialog)/.test(body),'live card asset has functional code: '+asset);
  }
  const regionInteractive=await (await get('/region/?q='+encodeURIComponent('부산'))).text();
  assert.ok(regionInteractive.includes('data-card-preview-form')&&regionInteractive.includes('data-card-preview-output'),'region result page offers in-place live switching');
  assert.ok(regionInteractive.includes('region-card-preview.js')&&regionInteractive.includes('region-card-preview.css'),'region page loads live preview assets');
  assert.ok(homeCardSearch.includes('data-card-preview-form')&&homeCardSearch.includes('data-card-preview-output')&&homeCardSearch.includes('region-card-preview.js'),'homepage supports instant no-navigation preview');

  const ambiguousCity=await (await get('/region/?q='+encodeURIComponent('광주'))).text();
  assert(ambiguousCity.includes('class="dynamic-region-card-preview"')&&!ambiguousCity.includes('class="dynamic-region-card-preview" open'),'ambiguous city must not silently choose a card');
  const ambiguousRegion=await get('/region/?q='+encodeURIComponent('광주탁송'));
  assert.equal(new URL(ambiguousRegion.url).pathname,'/region/','ambiguous city name must show region choices');
  const oldRegion=await get('/region/detail/?region='+encodeURIComponent('창원시')+'&parent='+encodeURIComponent('경상남도')+'&kind=daeri');
  assert.equal(oldRegion.status,200,'fetch follows legacy regional redirect');
  const oldRegionHtml=await oldRegion.text();
  assert.ok(oldRegionHtml.includes('창원')&&oldRegionHtml.includes('스마트대리운전'),'old regional links open matching driver page');
  for(const service of ['daeri','taksong']){
   const response=await get('/'+service+'/seoul/');assert.equal(response.status,200);
   const html=await response.text();
   const card=html.match(/<meta property="og:image" content="https:\/\/example.com(\/card\/area-\d+-(?:daeri|taksong)-brand-v5\.png)"/);
   assert.ok(card,'regional '+service+' page must advertise a PNG business card');
   assert.ok(html.includes('href="tel:18114294"'),'service card retains the representative phone');
   const svg=await (await get(card[1].replace('.png','.svg'))).text();
   const expectedBrand=service==='daeri'?'스마트전국대리운전':'스마트24시전국탁송';
   const expectedCardLabel=service==='daeri'?'서울스마트대리운전':'서울전국탁송';
   assert.ok(svg.includes(expectedCardLabel),'service-card heading must show the actual Seoul locality and right service');
   const caption=html.match(/<figcaption[^>]*>(.*?)<\/figcaption>/)[1];assert.ok(caption.includes(expectedBrand),'caption identifies the same service as the displayed card');
   const visibleLabels=svg.replace(/<image[^>]+\/>/g,'');
   assert.ok(!visibleLabels.includes(service==='daeri'?'스마트24시전국탁송':'스마트전국대리운전'),'card headings do not mix two service brands');
   assert.ok(svg.includes('data:image/webp;base64,')&&svg.includes('id="identity-band"')&&svg.includes('height="82"'),'custom local banner covers the obsolete city text but preserves matching service artwork');
   assert.ok(html.includes('src="'+card[1]+'"'),'advertised business card is also visible on the page');
   assert.ok(html.includes('class="regional-responsive-card"')&&html.includes('class="booking-guide"'),'responsive regional card and booking guide are both retained');
   const metadata=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
   assert.ok(metadata.some(x=>x['@graph']?.some(y=>y['@type']==='WebPage'&&y.primaryImageOfPage)),'regional service page identifies its primary image');
   const imageMap=await (await get('/sitemap-'+service+'.xml')).text();
   // Focused Naver sitemaps contain HTML URLs only. PNG cards remain on the actual pages.
   assert.ok(!/<image:image|<image:loc/.test(imageMap),'focused sitemap must not list generated card images');
   const sitemapUrls=[...imageMap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
   assert.ok(sitemapUrls.includes('https://example.com/'+service+'/seoul/'),'focused sitemap includes Seoul service HTML');
   assert.ok(sitemapUrls.length>100&&sitemapUrls.length<=500,
    'focused sitemap must contain useful curated pages without publishing the entire 20k directory; got '+sitemapUrls.length);
   assert.equal(sitemapUrls.length,new Set(sitemapUrls).size,'focused sitemap must not duplicate regional URLs');
   if(service==='taksong')assert.ok(sitemapUrls.includes('https://example.com/taksong/busan/gijang-gun/'),'Gijang landing page is discoverable');
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
  assert.equal(submittedMaps.length,7,'robots advertises original five sitemaps plus full history discovery indexes');
   for(const sitemap of ['sitemap-priority.xml','sitemap.xml','sitemap-reviewed-routes.xml','sitemap-taksong.xml','sitemap-daeri.xml','sitemap-all.xml','sitemap-history.xml'])assert.ok(submittedMaps.some(x=>x.endsWith('/'+sitemap)),'robots retains '+sitemap);
  assert.ok(submittedMaps.some(x=>x.includes('/sitemap-priority.xml')));
  assert.ok(submittedMaps.some(x=>x.includes('/sitemap-reviewed-routes.xml')));
  assert.ok(!submittedMaps.some(x=>x.includes('nationwide-route')),'avoid diluting crawl effort across hundreds of thousands of generated combinations');
  const sm=await get('/sitemap.xml');assert.equal(sm.status,200);const xml=await sm.text();const submitted=(xml.match(/<loc>/g)||[]).length;assert.ok(submitted>=29&&submitted<500,'main sitemap focuses fewer than 500 high-quality URLs');assert.ok(xml.includes('https://example.com/taksong/busan/'),'main sitemap includes curated Busan region');assert.ok(xml.includes('https://example.com/daeri/daegu/'),'main sitemap includes curated Daegu region');assert.ok(xml.includes('/reviews/'),'main sitemap links to verified rides');assert.ok(!xml.includes('https://example.com/service/daeri/')&&!xml.includes('https://example.com/special/nationwide-daeri/'),'main sitemap omits alternate nationwide daeri URLs');assert.ok(!xml.includes('/region/area-20562/'),'main sitemap must not expose all 20,562 low-priority regions');assert.ok(xml.includes('example.com'));assert.ok(xml.includes('/places/'),'place category hub appears in sitemap');assert.ok(xml.includes('/places/'+encodeURIComponent('캠핑장')+'/'),'camping category appears in sitemap');assert.ok(xml.includes('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/'),'tow truck delivery category appears in sitemap');
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
  assert.ok([...guideImages].every(x=>/-(daeri|taksong)-brand(?:-v[2345])?\.png$/.test(x)),'all guides point to the requested service-specific basic cards; got '+JSON.stringify([...guideImages]));
  const topicImage=await get([...guideImages][0]);assert.equal(topicImage.status,200);
  const topicBytes=new Uint8Array(await topicImage.arrayBuffer());const topicMeta=await require('sharp')(topicBytes).metadata();assert.equal(topicMeta.width,1200);assert.equal(topicMeta.height,800);
  const topicStats=await require('sharp')(topicBytes).extract({left:0,top:100,width:1200,height:700}).stats();assert.ok(topicStats.channels.some(c=>c.stdev>35),'topic cards retain approved detailed artwork');
  assert.equal((await get('/daeri/gangwon/gangreung-si/handover/')).status,404,'unsupported service/topic combination is not indexed');
  assert.equal((await get('/taksong/gangwon/not-a-city/fare/')).status,404,'unknown regions do not create topic guides');
  const secret=await get('/server.js');assert.equal(secret.status,403,'server source must not be exposed');
  const malformed=await get('/%25ZZ');assert.ok([400,404].includes(malformed.status));
  // Homepage statistics show KST today/yesterday visits and phone click provenance.
  const statsHome=await (await get('/')).text();
  assert.ok(statsHome.includes('누적 전화클릭 <strong id="phone-click-number"'),
    'lifetime phone-button click label must appear in the top-right header panel');
  assert.ok(statsHome.includes('id="priority-verified-routes"')&&
    statsHome.includes('/routes/taksong/area-494/area-1174/')&&
    statsHome.includes('/routes/taksong/area-1/area-494/')&&
    statsHome.includes('/routes/taksong/area-532/area-765/')&&
    statsHome.includes('/routes/reviewed/'),
    'homepage must link natural-language priority route pages and real ride evidence');
  const noCacheHome=await get('/');
  assert.match(noCacheHome.headers.get('cache-control')||'',/no-cache/,
    'production HTML should revalidate after phone source UI deployments');

  // Actual first-view flow: visible hero call buttons and eager vehicle image,
  // then consolidated fare shortcuts and a functional detailed calculator.
  const statsNavPos=statsHome.indexOf('</nav>');
  const statsFarePos=statsHome.indexOf('id="top-fare-calculator"');
  const statsFareShortcutPos=statsHome.indexOf('id="homepage-fare-top"');
  const statsHeroPos=statsHome.indexOf('class="hero hero-with-photo"');
  const statsImagePos=statsHome.indexOf('src="/assets/vehicles/santafe-1811.webp"');
  assert.ok(statsFareShortcutPos>=0&&statsFareShortcutPos<statsHome.indexOf('id="dynamic-service-card-search-20261103"')&&statsFareShortcutPos<statsHeroPos&&statsHeroPos<statsImagePos&&statsImagePos<statsFarePos,
    'fare inputs and regional card search must precede the vehicle introduction');
  assert.equal((statsHome.match(/class="quick-booking"/g)||[]).length,1,'fare form must not be duplicated');
  assert.ok(statsHome.includes('name="from"')&&statsHome.includes('name="to"')&&statsHome.includes('action="/fare/"'),
    'top fare calculator still submits the real fare lookup');
  assert.ok(statsHome.includes('/assets/traffic-summary.css?v=20261030'),
    'homepage loads compact header traffic styling');
  const trafficCss=await get('/assets/traffic-summary.css');
  assert.equal(trafficCss.status,200,'traffic summary stylesheet must be served');
  assert.ok((await trafficCss.text()).includes('.traffic-stats .traffic-stats-lines'),
    'traffic counters are styled in a compact header row');
  assert.ok(statsHome.includes('오늘 접속')&&statsHome.includes('누적 기록')&&
    statsHome.includes('누적 전화클릭')&&statsHome.includes('접속 집계 안내')&&
    statsHome.includes('이미 기록된 수치는 자동 차감되지 않습니다.'),
    'header labels distinguish browser records from search impressions and actual calls');
  assert.ok(statsHome.includes('id="traffic-sources-detail" hidden') &&
    statsHome.includes('id="traffic-call-trigger"'),
    'source details remain hidden until the header phone-click counter is clicked');
  const headerNumberAt=statsHome.indexOf('class="header-phone-line"');
  const phoneNumberEnd=statsHome.indexOf('</a>',headerNumberAt);
  const phoneClickAt=statsHome.indexOf('id="traffic-call-trigger"');
  const phoneClickEnd=statsHome.indexOf('</button>',phoneClickAt);
  assert.ok(headerNumberAt>=0&&phoneNumberEnd>headerNumberAt&&
    phoneClickAt>phoneNumberEnd&&phoneClickAt<statsHome.indexOf('</aside>',phoneNumberEnd),
    'phone click counter appears in the header traffic panel after the representative number');
  assert.ok(phoneClickEnd>phoneClickAt &&
    statsHome.slice(phoneClickAt,phoneClickEnd).includes('id="phone-click-number"'),
    'header phone click counter opens the source details');
  const headerPhonePos=statsHome.indexOf('class="header-call"');
  const dashboardPos=statsHome.indexOf('id="traffic-stats-panel"');
  assert.ok(headerPhonePos>=0&&headerPhonePos<dashboardPos&&dashboardPos<statsNavPos,
    'compact traffic panel appears after the header phone and before navigation');
  assert.ok(!statsHome.includes('id="yesterday-visit-number"')&&
    !statsHome.includes('id="total-phone-click-number"')&&
    !statsHome.includes('traffic-stats-grid'),
    'remove yesterday and duplicate phone count and boxed dashboard');
  for(const id of ['traffic-stats-panel','today-visit-number','total-visit-number',
                   'phone-click-number','phone-source-list','exclude-my-visits']){
    assert.ok(statsHome.includes('id="'+id+'"'),'home header statistic missing '+id);
  }
  assert.equal(statsHome.split('src="/assets/traffic-analytics.js?v=20261030-count-accuracy"').length-1,1,
    'homepage loads new versioned click tracking exactly once');
  const statRoute=await (await get('/taksong/')).text();
  assert.equal(statRoute.split('src="/assets/traffic-analytics.js?v=20261030-count-accuracy"').length-1,1,
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
  const rootHtml=await root.text();
  assert.ok(rootHtml.includes('/blog/archive/'),'homepage links to blog directory');
  assert.ok(rootHtml.includes('id="field-notes"'),'homepage editorial section appears');
  assert.ok(rootHtml.indexOf('id="field-notes"')<rootHtml.indexOf('id="priority-verified-routes"'),'blog-first content precedes route listings');
  assert.equal((rootHtml.match(/<h1\b/g)||[]).length,1,'homepage retains one H1');
  const editorialHtml=rootHtml.split('<section class="editorial-hub"')[1]?.split('</section>')[0]||'';
  const originalBlogPosts=require('../blog/posts.json');
  const featuredIds=['224451280349','224453015755','224452067282','224445300887','224452928413','224452920151','224449909441','224450082013','224448741396','224452906198','224453006635'];
  for(const id of featuredIds){
    const post=originalBlogPosts.find(p=>p.id===id);
    assert.ok(post,'featured post must exist in saved original Naver directory '+id);
    assert.ok(editorialHtml.includes(post.url),'homepage uses unchanged Naver original URL '+id);
    assert.ok(editorialHtml.includes(post.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')),'homepage retains original title '+id);
  }
  const gwangjuBlog=originalBlogPosts.find(p=>p.id==='224415779391');
  assert.ok(gwangjuBlog,'user-reported Gyeonggi Gwangju post is in archived source data');
  assert.ok(editorialHtml.includes(gwangjuBlog.url),'call-producing Gyeonggi Gwangju post keeps exact original link');
  assert.ok(editorialHtml.includes(gwangjuBlog.title),'call-producing post keeps exact published title');
  assert.ok(editorialHtml.includes('경기도 광주시·오포 지역 차량탁송'),'Gyeonggi Gwangju is not confused with Gwangju metropolitan city');
  assert.ok(editorialHtml.includes('출고 가능 시간'),'Gyeonggi Gwangju card gives customer booking information');
  const gangwonInquiries=originalBlogPosts.find(p=>p.id==='224378263508');
  assert.ok(gangwonInquiries,'user-confirmed August Gangwon call source must be in saved blog index');
  assert.ok(editorialHtml.includes(gangwonInquiries.url),'homepage preserves source of real Gangwon phone inquiry');
  assert.ok(editorialHtml.includes(gangwonInquiries.title),'homepage preserves exact source title');
  assert.ok(editorialHtml.includes('평창군 봉평면'),'blog card correctly identifies Bongpyeong-myeon in Pyeongchang');
  assert.ok(editorialHtml.includes('평창군 봉평면 → 경상북도 청송'),'dispatch origin and destination preserved');
  assert.ok(editorialHtml.includes('15만원에 배차했고'),'user-reported dispatch fare preserved');
  assert.ok(editorialHtml.includes('확인 당시 운행 중'),'dispatch is not misrepresented as a completed ride');
  assert.ok(editorialHtml.includes('고정 요금은 아닙니다'),'historical quote is not universal current pricing');
  const gangwonProvince=await (await get('/taksong/gangwon/')).text();
  assert.ok(gangwonProvince.includes(gangwonInquiries.url),'Gangwon taksong provincial guide links to call-generating original blog post');
    assert.ok(editorialHtml.includes('1811-4294'),'homepage shows official contact for current booking');
  const editorialImages=[...editorialHtml.matchAll(/<img\b[^>]*alt="([^"]+)"/g)].map(x=>x[1]);
  assert.ok(editorialImages.every(alt=>alt.includes('AI 연출 이미지')&&alt.includes('실제')&&alt.includes('촬영 사진 아님')),'travel illustrations must be transparently labeled, never claimed as field photographs');
  const archiveData=require('../lib/blog-archive');
  assert.equal(archiveData.total,require('../blog/posts.json').length,'archive retains source links');
  assert.equal(Object.values(archiveData.counts).reduce((sum,n)=>sum+n,0),archiveData.total,'all original posts are cataloged once');
  const archiveIndex=await get('/blog/archive/');assert.equal(archiveIndex.status,200);
  const archiveIndexHtml=await archiveIndex.text();
  assert.ok(archiveIndexHtml.includes(archiveData.total+'편'),'archive displays source count');
   const additionalBlogRegions=require('../data/priority-blog-links.json').pages.filter(x=>x.kind==='taksong'&&x.path);
   assert.equal(additionalBlogRegions.length,10,'ten region keyword blog improvements');
   assert.ok(archiveIndexHtml.includes('regional-blog-keyword-guide-20261103'),'blog archive links regional service pages');
   for(const item of additionalBlogRegions){
      assert.ok(archiveIndexHtml.includes('href="'+item.path+'"'),'regional blog archive page has '+item.label);
      const response=await get(item.path);assert.equal(response.status,200,item.label);
      const pageHtml=await response.text();
      assert.ok(pageHtml.includes('id="local-naver-originals"')&&pageHtml.includes(item.handoff),'unique local editorial context '+item.label);
      for(const id of item.ids)assert.ok(pageHtml.includes('https://blog.naver.com/wjdtnr4757/'+id),'exact existing Naver source '+id);
   }
  for(const group of archiveData.groups){
    const slug='/blog/archive/'+group.id+'/';
    assert.ok(archiveIndexHtml.includes(slug),'archive index links '+group.id);
    const catalog=await get(slug);assert.equal(catalog.status,200,slug);
    assert.ok((await catalog.text()).includes('https://blog.naver.com/wjdtnr4757/'),'links original blog');
  }
  assert.equal((await get('/blog/archive/vehicle-taksong/?page=2')).status,200,'pagination works');
  assert.equal((await get('/blog/archive/vehicle-taksong/?page=999')).status,404,'rejects invalid page');
  const archiveSitemap=await (await get('/sitemap.xml')).text();
  assert.ok(archiveSitemap.includes('https://example.com/blog/archive/'),'directory in sitemap');
  for(const group of archiveData.groups)assert.ok(archiveSitemap.includes('/blog/archive/'+group.id+'/'),'category in sitemap');
  const regionIndex=await get('/region/');assert.equal(regionIndex.status,200);const places=await get('/places/');assert.equal(places.status,200);assert.ok((await places.text()).includes('캠핑장'));const camping=await get('/places/'+encodeURIComponent('캠핑장')+'/');assert.equal(camping.status,200);const reka=await get('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/');assert.equal(reka.status,200);const daeriMap=await get('/sitemap-daeri.xml');const daeriXml=await daeriMap.text();assert.ok(daeriXml.includes('https://example.com/daeri/'));assert.ok(!daeriXml.includes('/special/nationwide-daeri/')&&!daeriXml.includes('/service/daeri/'),'daeri discovery sitemap keeps only canonical national hub');assert.equal(daeriMap.status,200);const priorityDaeri=require('../data/priority-regions.json').pages.filter(p=>p.kind==='daeri');
 const daeriLocs=[...daeriXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.ok(daeriLocs.length>=100&&daeriLocs.length<=500,
  'driver sitemap must prioritize 100-500 useful region and travel guide URLs; found '+daeriLocs.length);
 assert.equal(daeriLocs.length,new Set(daeriLocs).size,'driver discovery sitemap has no duplicate canonical URLs');
 for(const guide of require('../lib/daeri-travel-guides').destinations)
  assert.ok(daeriLocs.includes('https://example.com'+require('../lib/daeri-travel-guides').pathFor(guide)),
   'driver sitemap retains sourced travel guide');
 for(const region of ['서울특별시','부산광역시','대구광역시','인천광역시']){
  const url={'서울특별시':'seoul','부산광역시':'busan','대구광역시':'daegu','인천광역시':'incheon'}[region];
  assert.ok(daeriXml.includes('https://example.com/daeri/'+url+'/'),'driver sitemap retains priority '+region);
 }
 const taksongMap=await get('/sitemap-taksong.xml');assert.equal(taksongMap.status,200);
 const taksongXml=await taksongMap.text();
 const taksongLocs=[...taksongXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
 assert.ok(taksongLocs.length>=100&&taksongLocs.length<=500,
  'taksong sitemap must contain a focused selection of up to 500 curated regional URLs, not the entire generated directory');
 assert.equal(taksongLocs.length,new Set(taksongLocs).size,'taksong sitemap URLs are unique');for(const priorityPath of ['/taksong/','/taksong/busan/','/taksong/busan/gijang-gun/','/taksong/daegu/','/taksong/gangwon/'])assert.ok(taksongLocs.includes('https://example.com'+priorityPath),'taksong sitemap retains important indexable page '+priorityPath);
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
  // Transparent gzip reduces mobile HTML transfer without changing SEO content.
  const http=require('node:http'),zlib=require('node:zlib');
  const zipped=await new Promise((resolve,reject)=>{
   http.get('http://127.0.0.1:'+port+'/taksong/busan/',{headers:{'accept-encoding':'gzip'}},res=>{
    const parts=[];res.on('data',chunk=>parts.push(chunk));
    res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));
    res.on('error',reject);
   }).on('error',reject);
  });
  const identity=await fetch('http://127.0.0.1:'+port+'/taksong/busan/',{headers:{'accept-encoding':'identity'}});
  const html=await identity.text();
  assert.equal(zipped.status,200);
  assert.equal(identity.status,200);
  assert.equal(zipped.headers['content-encoding'],'gzip');
  assert.match(zipped.headers.vary,/Accept-Encoding/i);
  assert.ok(!identity.headers.get('content-encoding'));
  assert.equal(zlib.gunzipSync(zipped.body).toString('utf8'),html,'gzip must retain full rendered HTML');
  assert.ok(zipped.body.length<Buffer.byteLength(html,'utf8')*.75,'at least 25% byte savings');
  const jsonApi=await fetch('http://127.0.0.1:'+port+'/api/region-card-preview?q='+encodeURIComponent('부산탁송'),{headers:{'accept-encoding':'gzip'}});
  assert.equal(jsonApi.status,200);
  assert.ok(!jsonApi.headers.get('content-encoding'),'API remains uncompressed');
  console.log('PASS: regional HTML gzip retains original SEO bytes, identity variant and JSON API');
  // All 63 blog-style combinations retain regional and service identity.
  for(const [term,place,kind] of [
   ['부산차량운송','부산광역시','taksong'],
   ['부산자동차탁송업체','부산광역시','taksong'],
   ['부산차량탁송업체','부산광역시','taksong'],
   ['부산탁송비용','부산광역시','taksong'],
   ['부산탁송기사','부산광역시','taksong'],
   ['부산대리운전요금','부산광역시','daeri'],
   ['부산대리운전기사','부산광역시','daeri'],
   ['부산일일기사업체','부산광역시','daeri'],
   ['부산골프장왕복기사','부산광역시','daeri'],
   ['부산수행기사','부산광역시','daeri'],
   ['부산2.5톤탁송','부산광역시','taksong'],
   ['부산중고차경매장탁송','부산광역시','taksong'],
   ['부산자전거종주탁송','부산광역시','taksong'],
   ['부산골프장탁송','부산광역시','taksong'],
   ['서울강남차량이동','서울특별시 강남구','taksong'],
   ['서울강남대리운전비용','서울특별시 강남구','daeri'],
   ['제주도탁송예약','제주특별자치도','taksong'],
  ]){
   const response=await get('/api/region-card-preview?q='+encodeURIComponent(term));
   assert.equal(response.status,200,term);
   const data=await response.json();
   assert.equal(data.status,'matched','blog keyword must be recognized: '+term);
   assert.equal(data.region,place,'keyword must not point to wrong area: '+term);
   assert.equal(data.cards.length,1,'single service image '+term);
   assert.equal(data.cards[0].kind,kind,'service-specific card '+term);
  }
  for(const [path,must,excluded] of [
   ['/taksong/busan/',['id="regional-blog-keyword-guide"','부산탁송업체','부산렌트카탁송','부산중고차경매장탁송'],['부산법인대리운전업체']],
   ['/daeri/busan/',['id="regional-blog-keyword-guide"','부산심야대리운전','부산법인카드대리운전','부산골프장왕복기사'],['부산2.5톤탁송']],
   ['/taksong/busan/gijang-gun/',['id="regional-blog-keyword-guide"','기장군탁송요금'],[]],
  ]){
   const html=(await (await get(path)).text());
   for(const phrase of must)assert.ok(html.includes(phrase),'regional blog keyword section missing '+phrase+' on '+path);
   for(const phrase of excluded)assert.ok(!html.includes(phrase),'irrelevant keyword in other-service page '+path);
   assert.ok(html.includes('href="/fare/?"')||html.includes('href="/fare/?service='),'fare navigation must stay on '+path);
  }
  console.log('PASS: 17 new locality keyword searches and regional blog sections preserve service identity');
  // Every user-prioritized region+service phrase must resolve to the correct
  // single regional landing page, not a national card from an unrelated topic.
  const requestedPriority=require('../data/blog-priority-regional-keywords.json').keywords;
  assert.equal(requestedPriority.length,25);
  const seenPriority=new Set();
  for(const {keyword,region,kind} of requestedPriority){
   const response=await get('/api/region-card-preview?q='+encodeURIComponent(keyword));
   assert.equal(response.status,200,'priority API '+keyword);
   const data=await response.json();
   assert.equal(data.status,'matched','priority keyword matched: '+keyword);
   assert.equal(data.region,region,'priority locality identity: '+keyword);
   assert.equal(data.cards.length,1,'one service-specific card '+keyword);
   assert.equal(data.cards[0].kind,kind,'correct service '+keyword);
   const pageUrl=data.cards[0].url;
   assert.ok(pageUrl.startsWith('/'+kind+'/'),'canonical regional service path '+keyword);
   const page=await get(pageUrl);
   assert.equal(page.status,200,'priority regional page '+keyword);
   const pageHtml=await page.text();
   assert.ok(pageHtml.includes('id="regional-priority-search-guide"'),'focused blog guide on '+pageUrl);
   assert.ok(pageHtml.includes(keyword),'exact requested phrase on '+pageUrl+': '+keyword);
   assert.ok(pageHtml.includes('href="/fare/?service='),'fare link on '+pageUrl);
   assert.ok(!pageHtml.includes('실제 운행완료 후기입니다'),'no invented trip on '+pageUrl);
   seenPriority.add(pageUrl);
  }
  assert.equal(seenPriority.size,16,'25 keyword phrases converge to 16 canonical locality/service pages');
  const directory=await (await get('/blog/')).text();
  assert.ok(directory.includes('요청 지역별 탁송·대리운전 핵심 검색어'),'blog navigation to priority regions');
  assert.ok(directory.includes('부산기장군탁송')&&directory.includes('강남프리미엄대리운전'),
   'blog directory contains exact priority phrase labels');
  console.log('PASS: 25 priority keywords -> 16 canonical locality/service guides and blog navigation');
  // The 100 new phrases must open the correct region page and matching
  // taksong/daeri image. Never treat keyword interest as a completed trip.
  const workGroups=require('../data/blog-regional-work-100.json').groups;
  assert.equal(workGroups.length,20);
  const workPages=new Map();
  let confirmedWords=0;
  for(const group of workGroups){
   for(const keyword of group.keywords){
    const response=await get('/api/region-card-preview?q='+encodeURIComponent(keyword));
    assert.equal(response.status,200,'100-keyword API status '+keyword);
    const data=await response.json();
    assert.equal(data.status,'matched','100-keyword recognized '+keyword);
    assert.equal(data.region,group.region,'100-keyword region '+keyword);
    assert.equal(data.cards.length,1,'single regional visual for '+keyword);
    assert.equal(data.cards[0].kind,group.kind,'correct service for '+keyword);
    assert.ok(data.cards[0].image.startsWith('/card/')||data.cards[0].image.startsWith('/keyword-card/'),'no generic false image '+keyword);
    const pageUrl=data.cards[0].url;
    assert.ok(pageUrl.startsWith('/'+group.kind+'/'),'canonical regional route '+keyword);
    if(!workPages.has(pageUrl)){
     const page=await get(pageUrl);
     assert.equal(page.status,200,'existing regional page '+pageUrl);
     workPages.set(pageUrl,await page.text());
    }
    const pageHtml=workPages.get(pageUrl);
    assert.ok(pageHtml.includes('id="regional-priority-search-guide"'),'guide visible '+pageUrl);
    assert.ok(pageHtml.includes(keyword),'exact phrase visible '+keyword);
    assert.ok(pageHtml.includes(group.guide),'specific editorial context '+pageUrl);
    assert.ok(pageHtml.includes('href="/fare/?service='),'fare CTA preserved '+pageUrl);
    assert.ok(pageHtml.includes('rel="canonical"'),'canonical preserved '+pageUrl);
    confirmedWords++;
   }
  }
  assert.equal(confirmedWords,100);
  assert.equal(workPages.size,20,'100 phrases converge to exactly 20 existing pages');
  const workBlog=await (await get('/blog/')).text();
  assert.ok(workBlog.includes('요청 지역별 탁송·대리운전 핵심 검색어'));
  assert.ok(workBlog.includes('창원탁송')&&workBlog.includes('인천탁송'),'new priority region navigation');
  console.log('PASS: 100 new locality SEO intents -> 20 canonical pages, proper regional images and actual article context');
  // Twenty different combinations must paint the *entire typed query* on
  // the live preview/zoom SVG while original canonical PNG cards remain stable.
  const exactTerms=require('../data/exact-image-priority-20.json');
  assert.equal(exactTerms.length,20);
  for(const phrase of exactTerms){
   const parsed=require('../lib/regional-blog-keywords').parse(phrase);
   const api=await get('/api/region-card-preview?q='+encodeURIComponent(phrase));
   assert.equal(api.status,200,'exact image API '+phrase);
   const result=await api.json();
   assert.equal(result.status,'matched','exact image region match '+phrase);
   assert.equal(result.cards.length,1,'exact image single card '+phrase);
   const card=result.cards[0];
   assert.equal(card.kind,parsed.kind,'exact service '+phrase);
   assert.equal(card.displayKeyword,phrase,'exact keyword label '+phrase);
   assert.ok(card.keywordImage.startsWith('/keyword-card/exact/'),'custom visual for '+phrase);
   assert.ok(card.keywordImage.includes(encodeURIComponent(phrase)),'escaped query '+phrase);
   // Legacy canonical card URL stays untouched for SEO and old article embeds.
   assert.ok(card.image.startsWith('/card/')||card.image.startsWith('/keyword-card/'));
   const visual=await get(card.keywordImage);
   assert.equal(visual.status,200,'exact SVG loads '+phrase);
   assert.match(visual.headers.get('content-type'),/image\/svg\+xml/);
   assert.equal(visual.headers.get('x-robots-tag'),'noindex, nofollow');
   const svg=await visual.text();
   assert.ok(svg.includes('<title id="title">'+phrase+' | 스마트24'),'exact SVG title '+phrase);
   assert.ok(svg.includes('>'+phrase+'</text>'),'exact visible painted phrase '+phrase);
   const page=await get('/region/?q='+encodeURIComponent(phrase));
   assert.equal(page.status,200,'keyword search result page '+phrase);
   const pageHtml=await page.text();
   assert.ok(pageHtml.includes(phrase),'exact query in server fallback '+phrase);
  }
  const badImage=await get('/keyword-card/exact/area-1-taksong.svg?q='+encodeURIComponent('부산대리운전회사'));
  assert.equal(badImage.status,404,'reject wrong locality/service combinations');
  const ambiguousExact=await (await get('/api/region-card-preview?q='+encodeURIComponent('광주탁송회사'))).json();
  assert.equal(ambiguousExact.status,'ambiguous');
  assert.ok(!ambiguousExact.cards.some(c=>c.keywordImage),'no cross-city spoofing');
  console.log('PASS 20/20 exact keyword painted images, region fallback, phone and no ambiguous leakage');
  // Each of 50 genuinely different localities must be linked from the
  // national hub, described on the existing canonical page and discoverable
  // in the appropriate service sitemap. No new thin URL is permitted.
  const focus50=require('../data/naver-regional-focus-50.json').priority;
  assert.equal(focus50.length,50);
  const siteHubs={
   taksong:await (await get('/taksong/')).text(),
   daeri:await (await get('/daeri/')).text()
  };
  const siteMaps={
   taksong:await (await get('/sitemap-taksong.xml')).text(),
   daeri:await (await get('/sitemap-daeri.xml')).text()
  };
  const focusPaths=new Set();
  for(const target of focus50){
   const regex=new RegExp('<a href="([^"]+)">'+target.keyword+'</a>');
   const found=siteHubs[target.kind].match(regex);
   assert.ok(found,'50 regional hub must link exact keyword '+target.keyword);
   const pagePath=found[1];
   assert.ok(pagePath.startsWith('/'+target.kind+'/'),'same-service landing '+target.keyword);
   assert.ok(!focusPaths.has(pagePath),'one unique page per focus item '+pagePath);
   focusPaths.add(pagePath);
   assert.ok(siteMaps[target.kind].includes('https://example.com'+pagePath),
    '50 priority pages should be in service sitemap '+target.keyword);
   const response=await get(pagePath);
   assert.equal(response.status,200,'priority region HTTP '+target.keyword);
   const html=await response.text();
   assert.ok(html.includes('id="naver-focus50-local-guide"'),'contextual guide '+target.keyword);
   assert.ok(html.includes(target.keyword),'exact regional headline '+target.keyword);
   assert.ok(html.includes(target.topic)&&html.includes(target.pickup)&&html.includes(target.handover),
    'two distinctive locality paragraphs and topic '+target.keyword);
   assert.ok(html.includes('href="/fare/?service='+target.kind),'fare CTA '+target.keyword);
   assert.ok(html.includes('rel="canonical" href="https://example.com'+pagePath+'"'),
    'canonical remains unchanged '+target.keyword);
   assert.ok(!html.includes('<meta name="robots" content="noindex'),
    'SEO-focus pages must remain indexable '+target.keyword);
   assert.ok(html.includes('class="regional-responsive-card"'),'regional responsive image '+target.keyword);
   const api=await get('/api/region-card-preview?q='+encodeURIComponent(target.keyword));
   assert.equal(api.status,200,'search-to-region API '+target.keyword);
   const preview=await api.json();
   assert.equal(preview.status,'matched','keyword API recognized '+target.keyword);
   assert.equal(preview.region,target.region,'official locality matches '+target.keyword);
   assert.equal(preview.cards.length,1,'one service card '+target.keyword);
   assert.equal(preview.cards[0].kind,target.kind,'no driver/taksong mix '+target.keyword);
   assert.equal(preview.cards[0].url,pagePath,'search box links to canonical region '+target.keyword);
  }
  assert.equal(focusPaths.size,50,'50 distinct existing canonical landing pages');
  assert.ok(siteHubs.taksong.includes('인천서해구탁송'),
   '2026 Incheon Seohae-gu canonical replaces obsolete Seo-gu locality');
  console.log('PASS: 50 locally distinct regional SEO pages, 50 home links, official image/API, canonical, sitemap and CTA');
  // New non-overlapping batch: 30 additional taksong + 20 daeri regions.
  const focusNext50=require('../data/naver-regional-focus-next-50.json').priority;
  assert.equal(focusNext50.length,50);
  let additionalVerified=0;
  const allRegionPaths=new Set(focusPaths);
  for(const entry of focusNext50){
   const linked=siteHubs[entry.kind].match(new RegExp('<a href="([^"]+)">'+entry.keyword+'</a>'));
   assert.ok(linked,'second 50 locality navigation '+entry.keyword);
   const url=linked[1];
   assert.ok(!allRegionPaths.has(url),'100 focus pages must be distinct '+entry.keyword);
   allRegionPaths.add(url);
   assert.ok(siteMaps[entry.kind].includes('https://example.com'+url),'50 new regional sitemap URLs '+entry.keyword);
   const page=await get(url);
   assert.equal(page.status,200,'second 50 local page HTTP '+entry.keyword);
   const html=await page.text();
   assert.ok(html.includes('id="naver-focus50-local-guide"'),'existing guide component '+entry.keyword);
   assert.ok(html.includes(entry.keyword)&&html.includes(entry.topic),'exact phrase and differentiated customer focus '+entry.keyword);
   assert.ok(html.includes(entry.pickup)&&html.includes(entry.handover),'unique pickup and handover guidance '+entry.keyword);
   assert.ok(html.includes('href="'+entry.related+'"'),'service-appropriate related link '+entry.keyword);
   assert.ok(html.includes('rel="canonical" href="https://example.com'+url+'"'),'canonical locality URL preserved '+entry.keyword);
   assert.ok(!html.includes('<meta name="robots" content="noindex'),'indexable key region '+entry.keyword);
   assert.ok(html.includes('class="regional-responsive-card"'),'correct responsive region image '+entry.keyword);
   const response=await get('/api/region-card-preview?q='+encodeURIComponent(entry.keyword));
   assert.equal(response.status,200);
   const data=await response.json();
   assert.equal(data.status,'matched','second 50 search query resolves '+entry.keyword);
   assert.equal(data.region,entry.region,'not wrong city or county '+entry.keyword);
   assert.equal(data.cards.length,1,'single targeted service '+entry.keyword);
   assert.equal(data.cards[0].kind,entry.kind,'correct service category '+entry.keyword);
   assert.equal(data.cards[0].url,url,'search lands on the correct existing region page '+entry.keyword);
   assert.equal(data.cards[0].displayKeyword,entry.keyword,'dynamic card heading exactly matches '+entry.keyword);
   assert.ok(data.cards[0].keywordImage.startsWith('/keyword-card/exact/'),'exact regional card '+entry.keyword);
   const img=await get(data.cards[0].keywordImage);
   assert.equal(img.status,200,'exact image generated '+entry.keyword);
   assert.ok((await img.text()).includes('>'+entry.keyword+'</text>'),'exact phrase actually painted on image '+entry.keyword);
   additionalVerified++;
  }
  assert.equal(additionalVerified,50);
  assert.equal(allRegionPaths.size,100);
  console.log('PASS second 50 SEO regions + previous 50 = 100 distinct canonical pages, proper service images, exact phrases, site maps and handover detail');
  // Validate the 50 newly curated customer-facing regions in real server HTTP,
  // including exact dynamic text shown on each area's individual SVG.
  const third50=require('../data/naver-regional-focus-third-50.json').priority;
  assert.equal(third50.length,50);
  let thirdVerified=0;
  for(const target of third50){
   const found=siteHubs[target.kind].match(new RegExp('<a href="([^"]+)">'+target.keyword+'</a>'));
   assert.ok(found,'third batch links on hub '+target.keyword);
   const url=found[1];
   assert.ok(!allRegionPaths.has(url),'canonical unique from earlier 100 '+target.keyword);
   allRegionPaths.add(url);
   assert.ok(siteMaps[target.kind].includes('https://example.com'+url),'curated sitemap '+target.keyword);
   const res=await get(url);
   assert.equal(res.status,200,'regional page '+target.keyword);
   const html=await res.text();
   assert.ok(html.includes('id="naver-focus50-local-guide"')&&html.includes(target.topic),'local section '+target.keyword);
   assert.ok(html.includes(target.pickup)&&html.includes(target.handover),'unique region handover guidance '+target.keyword);
   assert.ok(html.includes('href="'+target.related+'"'),'specialized service cross link '+target.keyword);
   assert.ok(html.includes('rel="canonical" href="https://example.com'+url+'"'),'stable original canonical '+target.keyword);
   assert.ok(html.includes('class="regional-responsive-card"'),'per-region brand image '+target.keyword);
   const response=await get('/api/region-card-preview?q='+encodeURIComponent(target.keyword));
   assert.equal(response.status,200);
   const result=await response.json();
   assert.equal(result.status,'matched','region recognized '+target.keyword);
   assert.equal(result.region,target.region,'no misattributed city '+target.keyword);
   assert.equal(result.cards.length,1);
   assert.equal(result.cards[0].kind,target.kind);
   assert.equal(result.cards[0].url,url,'correct canonical '+target.keyword);
   assert.equal(result.cards[0].displayKeyword,target.keyword,'keyword visual label '+target.keyword);
   const image=await get(result.cards[0].keywordImage);
   assert.equal(image.status,200,'SVG preview '+target.keyword);
   assert.ok((await image.text()).includes('>'+target.keyword+'</text>'),'SVG exact keyword pixels '+target.keyword);
   thirdVerified++;
  }
  assert.equal(thirdVerified,50);
  assert.equal(allRegionPaths.size,150);
  console.log('PASS third 50 SEO pages, 150 distinct canonical regions, relevant service images and exact keyword display');
  // Ganghwa search-recovery page must serve a specific, indexable canonical URL.
  const ganghwaUrl='/daeri/incheon/ganghwa-gun/';
  const ganghwaResponse=await get(ganghwaUrl);
  assert.equal(ganghwaResponse.status,200,'Ganghwa local designated driver returns HTTP 200');
  const ganghwaHtml=await ganghwaResponse.text();
  assert(ganghwaHtml.includes('id="ganghwa-daeri-verified-editorial-20261104"'),'verified Ganghwa reviews visible');
  assert(ganghwaHtml.includes('강화읍')&&ganghwaHtml.includes('검단아라동'),'actual Ganghwa case retained');
  assert(ganghwaHtml.includes('강화대리운전 실제 후기'),'Ganghwa title matches local search');
  assert(ganghwaHtml.includes('content="index,follow,max-image-preview:large"'),'Ganghwa indexed regional service (not noindex)');
  assert(ganghwaHtml.includes('rel="canonical" href="https://example.com'+ganghwaUrl+'"'),'canonical matches live route');
  const ganghwaPriority=await (await get('/sitemap-priority.xml')).text();
  assert(ganghwaPriority.includes('https://example.com'+ganghwaUrl),'Ganghwa SEO route in priority sitemap');
  console.log('PASS Ganghwa region HTTP 200, canonical, real reviews, indexable meta and sitemap');
  // Each archived completion has a review title and regional index path; never invent case details.
  const firstHistory=await get('/reviews/history/excel-0001/');
  assert.equal(firstHistory.status,200);
  const firstHistoryHtml=await firstHistory.text();
  assert(firstHistoryHtml.includes('운행완료 후기') || firstHistoryHtml.includes('완료내역 기반 후기'),'first archive record has review-first title');
  const regionArchive=await get('/reviews/history/?region='+encodeURIComponent('area-494')+'&kind=taksong');
  assert.equal(regionArchive.status,200);
  const regionArchiveHtml=await regionArchive.text();
  assert(regionArchiveHtml.includes('부산광역시 자동차탁송 실제 운행완료 후기'),'region-specific completed cases');
  assert(regionArchiveHtml.includes('name="region" value="area-494"'),'filter survives search');
  assert(regionArchiveHtml.includes('/reviews/history/excel-'),'region lists linked source case details');
  const invalidRegionArchive=await get('/reviews/history/?region=area-999999999');
  assert.equal(invalidRegionArchive.status,404,'invalid region must not claim completed records');
  const busanTransport=await(await get('/taksong/busan/')).text();
  assert(busanTransport.includes('/reviews/history/?region=area-494&amp;kind=taksong'),'region page links archive cases');
  assert.equal(require('../data/ride-history.json').length,2591,'all 2,591 raw records preserved');
  // Region finder is a single useful canonical page, never a million thin pages.
  const finder=await get('/find/?q='+encodeURIComponent('부산 해운대구')+'&service=daeri&intent=late-night');
  assert.equal(finder.status,200);
  const finderHtml=await finder.text();
  assert(finderHtml.includes('부산광역시 해운대구'),'compact region lookup');
  assert(finderHtml.includes('1,028,100'),'one million legitimate inquiry combinations');
  assert(finderHtml.includes('content="noindex,follow"'),'query results should not be mass indexed');
  assert(finderHtml.includes('상담 목적: 야간·새벽'),'selected intent affects page content');
  const finderApi=await get('/api/find-regions?q='+encodeURIComponent('강화대리운전')+'&service=taksong&intent=fare');
  assert.equal(finderApi.status,200);
  const finderData=await finderApi.json();
  assert.equal(finderData.count,1028100);
  assert.equal(finderData.selectedIntent,'fare');
  assert(finderData.results.some(x=>x.name==='인천광역시 강화군'),'Ganghwa lookup includes official region');
  const finderSitemap=await(await get('/sitemap-priority.xml')).text();
  assert(finderSitemap.includes('https://example.com/find/'),'finder has one discoverable canonical');
  console.log('PASS million-query finder HTTP, search, intent, API and noindex guard');
  console.log('PASS: server, '+regions.length+' regions, pages, no-history content, sitemap, 404, homepage');
 }catch(e){console.error(e);console.error(stderr);process.exitCode=1}finally{child.kill()}
})();
