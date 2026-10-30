'use strict';
const assert=require('node:assert/strict');
const editorial=require('../lib/daeri-blog-editorial');
const travel=require('../lib/daeri-travel-guides');
const source=require('../blog/posts.json');
assert.equal(editorial.provinces.length,17,'all 17 nationwide provinces are represented');
assert.deepEqual(travel.destinations.map(x=>x.slug),['samgilpo','gungpyeong','busan-dongnae','sokcho-ports'],'four distinct themed tourism locales');
for(const place of travel.destinations){
 const sourcePost=travel.original(place);
 const relatedWord=({samgilpo:'삼길포항',gungpyeong:'궁평항','busan-dongnae':'부산','sokcho-ports':'속초'})[place.slug];
 assert.ok(sourcePost.title.includes(relatedWord),'real source post is about the broad correct region');
 assert.equal(place.tags.length,12,'a distinct set of twelve contextual hashtags, not stuffed original tags');
 for(const section of place.sections){
  assert.ok(section.heading.length>=10&&section.paragraphs.length>=2,'non-thin travel content');
 }
}
assert.equal(new Set(editorial.provinces.map(p=>p.region)).size,17,'no duplicate provinces');
const originalById=new Map(source.map(p=>[p.id,p]));
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const p of editorial.provinces){
 assert.ok(p.title.includes('대리운전'),'unique province article title is about designated driving');
 assert.ok(p.summary.length>=38&&p.tip.length>=38,'region article provides substantial local booking information');
 for(const id of p.ids){
  const original=originalById.get(id);
  assert.ok(original,'article must be in real source index: '+id);
  assert.equal(editorial.sourcePost(id).url,original.url,'do not invent links');
 }
}
for(const p of editorial.featured)for(const id of p.ids)assert.ok(originalById.has(id),'national feature has original');
const fakeRegions=editorial.provinces.map((p,i)=>({full_name:p.region,name:p.region,slug:'area-'+(i+1)}));
const route=(r,kind)=>'/'+kind+'/'+r.slug+'/';
const national=editorial.national(fakeRegions,route,esc);
assert.equal((national.match(/class="daeri-blog-links"/g)||[]).length,4,'national section has four curated topic groups');
assert.equal((national.match(/href="\/daeri\/area-\d+\/"/g)||[]).length,17,'national index includes seventeen real region links');
assert.ok(!national.includes('/taksong/area-'),'only designated-driver region links in editorial index');
assert.ok(national.includes('1811-4294'),'current homepage contact is intact');
for(const x of editorial.provinces){
 const province=editorial.province(fakeRegions.find(r=>r.full_name===x.region),[],route,esc);
 assert.ok(province.includes(x.title),'province gets distinct article');
 assert.ok(province.includes(x.tip),'province gets local customer booking advice');
 if(!x.ids.length)assert.ok(province.includes('원문이 부족'),'do not fabricate an unpublished local driver story');
 for(const id of x.ids)assert.ok(province.includes(originalById.get(id).url),'original Naver URL kept');
}
async function get(p){
 const res=await fetch('http://127.0.0.1:3000'+p,{signal:AbortSignal.timeout(25000)});
 assert.equal(res.status,200,'expected 200 '+p);
 return res.text();
}
(async()=>{
 const hub=await get('/daeri/');
 const foodTravelMap=await get('/travel/food-map/');
 assert.ok(foodTravelMap.includes('전국 맛집·여행지도')&&foodTravelMap.includes('대리운전·자동차탁송'),'map emphasizes natural travel and transport intent');
 assert.equal((foodTravelMap.match(/class="ft-card"/g)||[]).length,21,'food map contains 17 provinces and 4 curated guides');
 assert.ok(foodTravelMap.includes('id="ft-map"')&&foodTravelMap.includes('id="ft-search"'),'interactive and accessible search');
 for(const guide of travel.destinations){assert.ok(foodTravelMap.includes(travel.pathFor(guide)),'food map links verified guide '+guide.slug);assert.ok(foodTravelMap.includes(travel.original(guide).url),'food map links Naver original '+guide.slug)}
 assert.ok(foodTravelMap.includes('tel:18114294')&&foodTravelMap.includes('/taksong/'),'food map connects to real transport consultations');
 const mapRedirect=await fetch('http://127.0.0.1:3000/travel/food-map',{redirect:'manual'});
 assert.equal(mapRedirect.status,301,'map canonical redirect');
 assert.equal(mapRedirect.headers.get('location'),'/travel/food-map/','map canonical path');
 const mapPriority=await get('/sitemap-priority.xml');
 assert.ok(mapPriority.includes('https://jeongukdaeri.kr/travel/food-map/'),'map in priority sitemap');
 const indexPage=await get('/');
 assert.ok(indexPage.includes('id="traffic-stats-panel"')&&indexPage.includes('id="exclude-my-visits"'),'homepage has a compact visitor counter and opt-out control');
 assert.ok(indexPage.includes('오늘 접속')&&indexPage.includes('누적 기록')&&indexPage.includes('누적 전화클릭'),'homepage labels are distinct from real search impressions/calls');
 assert.ok(indexPage.includes('/assets/traffic-summary.css'),'homepage references compact traffic styling');
 assert.ok(hub.includes('id="traffic-stats-panel"')&&hub.includes('id="exclude-my-visits"'),'secondary service pages show same header counts and control');
 assert.ok(hub.includes('접속 집계 안내')&&hub.includes('이미 기록된 수치는 자동 차감되지 않습니다.'),'stats explain internal traffic and historical limits');
 assert.ok(indexPage.includes('id="home-food-travel-map"')&&indexPage.includes('href="/travel/food-map/"'),'homepage prominent map links');
 assert.ok(hub.includes('id="national-daeri-blog-editorial"'),'nationwide driver editorial is visible');
 assert.ok(hub.includes('강남·프리미엄·법인 대리운전'),'driver services have their own editorial grouping');
 assert.ok(hub.includes('href="/daeri/gangwon/"'),'national guide links existing Gangwon page');
 assert.ok(hub.includes(originalById.get('224445451429').url),'national guide links actual Naver original');
 const provincePaths=[
  ['/daeri/seoul/','서울특별시','224386422952'],
  ['/daeri/busan/','부산광역시','224452970245'],
  ['/daeri/daegu/','대구광역시','224451280349'],
  ['/daeri/gangwon/','강원특별자치도','224420736659']
 ];
 for(const [p,name,id] of provincePaths){
  const html=await get(p);
  assert.ok(html.includes('id="province-daeri-blog-guide"'),name+' blog-style editorial is visible');
  assert.ok(html.includes(originalById.get(id).url),name+' original source link is present');
  assert.ok(html.includes('1811-4294'),name+' retains current phone');
 }
 const homepage=await get('/');
 for(const id of ['224445451429','224420736659','224386422952','224452987205'])
  assert.ok(homepage.includes(originalById.get(id).url),'homepage displays unchanged original driver post '+id);
 assert.ok(homepage.includes('/daeri/#national-daeri-blog-editorial'),'home links to nationwide editorial');
 assert.ok(homepage.includes('24시탁송')&&homepage.includes('월요일'),'homepage includes overnight vehicle transfer and Monday/weather caveat');
  assert.ok(homepage.includes('AI로 연출한 분위기 이미지'),'homepage discloses AI image provenance');
 assert.ok(homepage.includes('/assets/photos/busan-rainy-dongnae.avif'),'homepage shows photoreal AI Busan-themed scene');
 assert.ok(homepage.includes('/assets/photos/sokcho-three-ports.avif'),'homepage shows photoreal AI Sokcho-themed scene');
 const golf=await get('/service/golf/');
 assert.ok(golf.includes('id="golf-travel-food-editorial"'),'golf driver content explains local food and tourism');
 assert.ok(golf.includes('/assets/photos/golf-driver.avif'),'golf has distinct photoreal AI visual');
 assert.ok(golf.includes('25만원'),'golf driver source example remains');
  assert.ok(golf.includes('AI로 제작한 골프장 이동 분위기'),'golf image is disclosed as staged AI visual');
 const taksongNotice=await get('/taksong/');
 assert.ok(taksongNotice.includes('24시탁송 · 전국 24시간 차량 이동 상담 안내'),'24 hour taksong service emphasized');
 assert.ok(taksongNotice.includes('월요일'),'taksong delay notice is shown');
 const daeriRecruit=await get('/recruit/daeri/');
 const taksongRecruit=await get('/recruit/taksong/');
 assert.ok(daeriRecruit.includes('전국 대리운전기사 모집')&&daeriRecruit.includes('tel:18114294'),'nationwide designated-driver recruitment is reachable');
 assert.ok(taksongRecruit.includes('전국 탁송기사 모집')&&taksongRecruit.includes('수입을 보장하지 않습니다'),'taksong-driver recruitment avoids earnings guarantees');
 assert.ok(homepage.includes('id="home-driver-recruitment"')&&homepage.includes('href="/recruit/daeri/"')&&homepage.includes('href="/recruit/taksong/"'),'recruitment is discoverable from the homepage');
 assert.ok(homepage.includes('id="front-driver-recruitment"'),'dedicated driver-recruitment CTA appears above fare calculator');
 assert.ok(homepage.indexOf('id="front-driver-recruitment"')<homepage.indexOf('id="top-fare-calculator"'),'recruitment is visible at top before calculator');
 const mainNav=homepage.match(/<nav class="top-nav"[\s\S]*?<\/nav>/)||[];
 assert.ok(mainNav[0]&&mainNav[0].includes('href="/recruit/daeri/"')&&mainNav[0].includes('href="/recruit/taksong/"'),'both recruitment paths are in top navigation');
 const hero=homepage.match(/<div class="hero hero-with-photo">[\s\S]*?<\/figure><\/div>/)||[];
 assert.ok(hero[0]&&hero[0].includes('href="/recruit/daeri/"')&&hero[0].includes('href="/recruit/taksong/"'),'both recruitment CTAs appear in hero');
 
 assert.ok(homepage.indexOf('id="field-notes"')>homepage.indexOf('class="hero hero-with-photo"')&&
   homepage.indexOf('id="field-notes"')<homepage.indexOf('id="home-driver-recruitment"'),
   'real blog stories now lead the homepage before recruitment editorial');
 assert.ok(homepage.includes('id="jeju-blog-spotlight"')&&homepage.includes('/blog/archive/jeju-taksong/'),
   'homepage prominently links Jeju source-guided article');
 const jejuArchive=await get('/blog/archive/jeju-taksong/');
 assert.ok(jejuArchive.includes('id="jeju-blog-guide"')&&jejuArchive.includes('id="jeju-port"')&&jejuArchive.includes('id="jeju-cost"'),
   'Jeju archive includes practical blog-style port and price explanation');
 assert.ok(jejuArchive.includes('224415828744')&&jejuArchive.includes('224433990134'),
   'Jeju archive cites existing blog originals and does not invent new completed jobs');
 assert.ok(jejuArchive.includes('지정일 도착을 보장할 수 없습니다.')&&jejuArchive.includes('1811-4294'),
   'Jeju archive does not guarantee ferry schedule or past fare');
 assert.ok(homepage.includes('href="tel:18775245" aria-label="제주탁송 대표번호 1877-5245 전화 상담"'),
   'the homepage Jeju spotlight advertises the dedicated 1877-5245 number');
 const jejuArchiveUpdated=await get('/blog/archive/jeju-taksong/');
 assert.ok(jejuArchiveUpdated.includes('제주탁송 대표 상담 1877-5245')&&jejuArchiveUpdated.includes('href="tel:18775245"'),
   'Jeju archive has the correct dedicated phone CTA');
 assert.ok(!jejuArchiveUpdated.includes('현재 스마트24 문의는 1811-4294로 해주세요.'),
   'Jeju page does not show outdated generic consultation number');
 const jeju=await get('/taksong/jeju/');
 assert.ok(jeju.includes('제주탁송 대표번호 1877-5245')&&jeju.includes('tel:18775245'),
   'Jeju region uses the dedicated 1877-5245 contact number');
 assert.ok(!jeju.includes('tel:18114294')&&!jeju.includes('1811-4294'),
   'the Jeju landing page has no conflicting nationwide phone number');
 const jejuFare=await get('/fare/jeju/');
 assert.ok(jejuFare.includes('1877-5245')&&jejuFare.includes('tel:18775245')&&!jejuFare.includes('1811-4294'),
   'Jeju quote page uses its dedicated phone without displaying the national number');
 assert.ok(jeju.includes('id="jeju-source-route-guide"'),'Jeju transfer has distinct island and port guide');
 for(const id of ['224371918565','224387354617','224362663400'])assert.ok(jeju.includes(originalById.get(id).url),'Jeju guide links verified pre-September originals '+id);
 assert.ok(jeju.includes('제주항')&&jeju.includes('목포항'),'Jeju sea transfer handover is explained');
 const jejuTitle=(jeju.match(/<title>([^<]+)<\/title>/)||[])[1]||'';
 assert.ok(jejuTitle.startsWith('제주도탁송'), 'Jeju primary title begins with service keyword');
 assert.equal((jeju.match(/id="jeju-source-route-guide"/g)||[]).length,1,'Jeju evidence is presented exactly once');
 assert.ok(jeju.indexOf('id="jeju-source-route-guide"')<jeju.indexOf('서울·대구 출발 제주탁송 예상요금'),'Jeju original evidence is prominent');
 assert.ok(daeriRecruit.includes('대리운전기사 지원 시 안내할 사항'),'driver recruitment provides focused application information');
 assert.ok(taksongRecruit.includes('탁송기사 지원 시 안내할 사항'),'vehicle-transfer recruitment provides focused application information');
 for(const [p,href] of [['/recruit/daeri','/recruit/daeri/'],['/recruit/taksong','/recruit/taksong/']]){
  const response=await fetch('http://127.0.0.1:3000'+p,{redirect:'manual'});
  assert.equal(response.status,301,'recruitment canonical redirect');
  assert.equal(response.headers.get('location'),href,'recruitment redirects to canonical URL');
 }
 const sitemapPriority=await get('/sitemap-priority.xml');
 for(const p of ['/taksong/jeju/','/recruit/daeri/','/recruit/taksong/'])assert.ok(sitemapPriority.includes('https://jeongukdaeri.kr'+p),'priority sitemap includes '+p);
 const mainSitemap=await get('/sitemap.xml');
 const driverSitemap=await get('/sitemap-daeri.xml');
 assert.ok(mainSitemap.includes('https://jeongukdaeri.kr/recruit/daeri/')&&mainSitemap.includes('https://jeongukdaeri.kr/recruit/taksong/'),'main discovery sitemap includes both existing recruitment hubs');
 for(const place of travel.destinations){
  const path=travel.pathFor(place);
  const page=await get(path);
  const original=travel.original(place);
  assert.ok(page.includes(place.title),'travel detail title and on-page content match');
  assert.ok(page.includes(original.url),'existing source blog post linked without rewriting');
  assert.ok(page.includes(place.tags[0]),'site-visible topical hashtag reflects content');
  const visual='/assets/photos/'+({samgilpo:'samgilpo-harbor',gungpyeong:'gungpyeong-sunset','busan-dongnae':'busan-rainy-dongnae','sokcho-ports':'sokcho-three-ports'})[place.slug]+'.avif';
  assert.ok(page.includes(visual),'each geographic page has its own AI-generated visual');
  assert.ok(page.includes('실제 해당 장소나 운행 현장을 촬영한 사진이 아닙니다'),'AI image is not misrepresented as documentary photo');
  const asset=await fetch('http://127.0.0.1:3000'+visual);
  assert.equal(asset.status,200,'photoreal visual is served');
  assert.equal(asset.headers.get('content-type'),'image/avif','asset uses AVIF content type');
  const binary=Buffer.from(await asset.arrayBuffer());
  assert.ok(binary.length>20000&&binary.toString('ascii',4,12)==='ftypavif','AVIF image is a valid nonempty binary');
  assert.ok(page.includes('원문에서 수집한 해시태그 목록은 아닙니다'),'new topical hashtag is never attributed to Naver original');
  assert.ok(page.includes('tel:18114294'),'booking retains official site phone');
  assert.ok(page.includes('https://jeongukdaeri.kr'+path),'canonical URL uses official domain');
  for(const section of place.sections)assert.ok(page.includes(section.heading),'all original editorial sections retained');
  assert.ok(mainSitemap.includes('https://jeongukdaeri.kr'+path),'travel page in global sitemap');
  assert.ok(driverSitemap.includes('https://jeongukdaeri.kr'+path),'travel page in driver discovery sitemap');
  assert.ok(homepage.includes(path),'homepage tourism card is visible');
 }
 const west=await get('/daeri/gyeonggi/');
 const south=await get('/daeri/chungnam/');
 const busan=await get('/daeri/busan/');
 const gangwon=await get('/daeri/gangwon/');
 assert.ok(busan.includes('/daeri/travel/busan-dongnae/'),'Busan province features Dongnae food and rainy day story');
 assert.ok(gangwon.includes('/daeri/travel/sokcho-ports/'),'Gangwon province features Sokcho three ports');
 assert.ok(west.includes('/daeri/travel/gungpyeong/'),'Gyeonggi page features relevant Hwaseong destination');
 assert.ok(south.includes('/daeri/travel/samgilpo/'),'Chungnam page features relevant Seosan destination');
 assert.ok(hub.includes('/daeri/travel/samgilpo/')&&hub.includes('/daeri/travel/gungpyeong/'),'national driver hub links both travel guides');
 const taksong=await get('/taksong/');
 assert.ok(!taksong.includes('id="national-daeri-blog-editorial"'),'taksong hub remains independent');
 console.log('PASS: 17 national designated-driver provinces, curated Naver original articles, homepage and service pages');
})().catch(err=>{console.error(err);process.exitCode=1;});
