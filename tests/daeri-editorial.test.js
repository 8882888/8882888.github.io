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
 assert.ok(jejuArchive.includes('지정일 도착을 보장할 수 없습니다.')&&jejuArchive.includes('1877-5245'),
   'Jeju archive does not guarantee ferry schedule or past fare');
 assert.ok(homepage.includes('href="tel:18775245" aria-label="제주탁송 대표번호 1877-5245 전화 상담"'),
   'the homepage Jeju spotlight advertises the dedicated 1877-5245 number');
 const jejuArchiveUpdated=await get('/blog/archive/jeju-taksong/');
 assert.ok(jejuArchiveUpdated.includes('제주탁송 대표 상담 1877-5245')&&jejuArchiveUpdated.includes('href="tel:18775245"'),
   'Jeju archive has the correct dedicated phone CTA');
 assert.ok(!jejuArchiveUpdated.includes('현재 스마트24 문의는 1811-4294로 해주세요.'),
   'Jeju page does not show outdated generic consultation number');

 const gangwonBlog=await get('/blog/archive/gangwon-taksong/');
 assert.ok(gangwonBlog.includes('강원도탁송 영동·영서 지역 안내와 실제후기 원문')&&gangwonBlog.includes('id="gangwon-blog-guide"'),
   'Gangwon archive has an original editorial guide for coastal and inland regions');
 assert.ok(gangwonBlog.includes('224437809013')&&gangwonBlog.includes('224452920151')&&gangwonBlog.includes('224452928413'),
   'Gangwon article links to existing Naver original posts without inventing trips');
 assert.ok(gangwonBlog.includes('/taksong/gangwon/')&&gangwonBlog.includes('tel:18114294'),
   'Gangwon article links service guide and preserves the nationwide phone');
 assert.ok(gangwonBlog.includes('"@type":"CollectionPage"')&&gangwonBlog.includes('"@type":"ItemList"'),
   'curated article source list provides structured collection metadata');
 const gangwonArchiveCount=require('../lib/blog-archive').counts['gangwon-taksong'];
 const gangwonBlogPage2Response=await fetch('http://127.0.0.1:3000/blog/archive/gangwon-taksong/?page=2');
 assert.equal(gangwonBlogPage2Response.status,gangwonArchiveCount>30?200:404,
   'archive pagination returns 404 when there are fewer than 31 indexed source posts');
 if(gangwonBlogPage2Response.status===200){
   const page2Html=await gangwonBlogPage2Response.text();
   assert.ok(!page2Html.includes('id="gangwon-blog-guide"'),
     'long editorials do not duplicate across paginated archive pages');
 }
 assert.ok(homepage.includes('id="gangwon-blog-spotlight"')&&homepage.includes('href="/blog/archive/gangwon-taksong/"'),
   'homepage displays a source-linked Gangwon editorial entry');
 assert.ok(jejuArchiveUpdated.includes('<title>제주탁송 차량선적·실제후기 원문')&&
   jejuArchiveUpdated.includes('"@type":"CollectionPage"')&&jejuArchiveUpdated.includes('tel:18775245'),
   'Jeju archive uses search-specific editorial metadata and dedicated phone');
 const secondFive=[
  {id:'mountain-cycle',title:'설악산·지리산 종주탁송·자전거 인증센터 차량회수',sourceIds:['224453074981','224451230156','224450163134','224452067282'],service:'/taksong/gangwon/'},
  {id:'golf-corporate-daily',title:'골프장대리운전·일일기사 예약과 실제후기',sourceIds:['224451280349','224417611971','224445462278'],service:'/service/golf/'},
  {id:'vehicle-taksong',title:'중고차·서비스센터·렌트카·경매장탁송 실제원문',sourceIds:['224427052635','224421653506','224430950314','224419673150'],service:'/taksong/'}
 ];
 for(const item of secondFive){
   const page=await get('/blog/archive/'+item.id+'/');
   assert.ok(page.includes('<title>'+item.title)&&page.includes('id="'+item.id+'-editorial"'),
     item.id+' archive has unique search metadata and practical editorial guide');
   assert.ok(page.includes('"@type":"CollectionPage"')&&page.includes('tel:18114294'),
     item.id+' archive retains structured original links and nationwide phone');
   assert.ok(page.includes(item.service),item.id+' connects to its related service');
   for(const sourceId of item.sourceIds){
     assert.ok(originalById.has(sourceId)&&page.includes(originalById.get(sourceId).url),
       item.id+' only points to known original Naver blog articles: '+sourceId);
   }
   const pg2=await fetch('http://127.0.0.1:3000/blog/archive/'+item.id+'/?page=2');
   const count=require('../lib/blog-archive').counts[item.id];
   assert.equal(pg2.status,count>30?200:404,item.id+' respects archive pagination');
   if(pg2.status===200)assert.ok(!(await pg2.text()).includes('id="'+item.id+'-editorial"'),
     item.id+' does not duplicate full editorial on page 2');
 }
 const golfServiceArchive=await get('/service/golf/');
 const dailyServiceArchive=await get('/service/daily-driver/');
 assert.ok(golfServiceArchive.includes('id="golf-blog-archive-link"')&&
   golfServiceArchive.includes('href="/blog/archive/golf-corporate-daily/"'),
   'golf service page sends readers to original Naver archive');
 assert.ok(dailyServiceArchive.includes('id="daily-blog-archive-link"')&&
   dailyServiceArchive.includes('href="/blog/archive/golf-corporate-daily/"'),
   'daily driver page sends readers to the same relevant original Naver archive');

 const regionalThirdFive=[{"id":"capital-taksong","title":"서울·경기·인천탁송 | 수도권 자동차 인수·인계와 실제후기","ids":["224452097042","224452072174","224451107355","224451097227"]},{"id":"gyeongsang-taksong","title":"부산·대구·경상탁송 | 항만·산단·장거리 운행 원문","ids":["224452088793","224452085535","224450082013","224445300887"]},{"id":"jeolla-taksong","title":"광주·전북·전남탁송 | 목포항·산단·산간 차량이동","ids":["224449892895","224449871939","224448781333","224447539054"]},{"id":"chungcheong-taksong","title":"대전·세종·충청탁송 | 천안·청주·서산 실제후기","ids":["224452906198","224451239682","224447657132","224434019317"]},{"id":"general-daeri","title":"전국·장거리 대리운전 | 지역별 귀가·예약 실제원문","ids":["224453006635","224452992697","224452987205","224445451429"]}];
 for(const item of regionalThirdFive){
   const path='/blog/archive/'+item.id+'/';
   const doc=await get(path);
   assert.ok(doc.includes('<title>'+item.title)&&doc.includes('id="'+item.id+'-regional-guide"'),
     item.id+' displays unique region editorial and title');
   assert.ok(doc.includes('"@type":"CollectionPage"')&&doc.includes('"@type":"ItemList"'),
     item.id+' includes original-source list metadata');
   assert.ok(doc.includes('tel:18114294'),item.id+' keeps current nationwide service phone');
   for(const sourceId of item.ids){
     const src=originalById.get(sourceId);
     assert.ok(src&&doc.includes(src.url),item.id+' uses verified existing original '+sourceId);
   }
   const count=require('../lib/blog-archive').counts[item.id];
   const next=await fetch('http://127.0.0.1:3000'+path+'?page=2');
   assert.equal(next.status,count>30?200:404,'regional archive pagination respects actual count');
   if(next.status===200)assert.ok(!(await next.text()).includes('id="'+item.id+'-regional-guide"'),
     'editorial not duplicated across '+item.id+' page 2');
 }

 const archiveHomeFourth=await get('/blog/archive/');
 assert.ok(archiveHomeFourth.includes('id="blog-archive-start"')&&archiveHomeFourth.includes('/blog/archive/jeju-taksong/'), 'blog archive directory contains useful first-step navigation');
 assert.ok(archiveHomeFourth.includes('tel:18775245')&&archiveHomeFourth.includes('tel:18114294'), 'archive directory differentiates Jeju and nationwide consultation');
 const latestBlogFourth=await get('/blog/');
 assert.ok(latestBlogFourth.includes('id="blog-reader-guide"')&&latestBlogFourth.includes('/blog/archive/mountain-cycle/'), 'latest blog links to targeted original article categories');
 assert.ok(latestBlogFourth.includes('네이버 RSS')&&latestBlogFourth.includes('tel:18775245'), 'blog feed labels freshness source and separate Jeju phone');
 const taksongHubFourth=await get('/taksong/');
 assert.ok(taksongHubFourth.includes('id="national-taksong-blog-archive"')&&taksongHubFourth.includes('/blog/archive/vehicle-taksong/'), 'nationwide taksong hub has curated archived originals');
 assert.ok(taksongHubFourth.includes('tel:18775245')&&taksongHubFourth.includes('tel:18114294'), 'nationwide taksong hub separates Jeju and nationwide consultation');
 const daeriHubFourth=await get('/daeri/');
 assert.ok(daeriHubFourth.includes('id="national-daeri-blog-archive"')&&daeriHubFourth.includes('/blog/archive/general-daeri/'), 'nationwide designated-driver hub links original Naver posts');
 const historyFourth=await get('/reviews/history/');
 assert.ok(historyFourth.includes('id="history-original-distinction"')&&historyFourth.includes('네이버 블로그 공개 원문 자료실'), 'history page distinguishes completed records from blog titles');
 const historyFilteredFourth=await get('/reviews/history/?kind=daeri&page=2');
 assert.ok(historyFilteredFourth.includes('https://jeongukdaeri.kr/reviews/history/?kind=daeri&amp;page=2')||historyFilteredFourth.includes('https://jeongukdaeri.kr/reviews/history/?kind=daeri&page=2'), 'filter and page retain own canonical URL');
 const fifthBatch=[
   {route:'/service/corporate/',marker:'corporate-original-archive',archive:'/blog/archive/golf-corporate-daily/',source:'224371958009'},
   {route:'/service/long-distance-taksong/',marker:'long-taksong-original-guides',archive:'/blog/archive/vehicle-taksong/',source:'224452072174'},
   {route:'/business/rental-car/',marker:'rental-original-archive',archive:'/blog/archive/vehicle-taksong/',source:'224430950314'},
   {route:'/business/used-car/',marker:'usedcar-original-archive',archive:'/blog/archive/vehicle-taksong/',source:'224421653506'},
   {route:'/taksong/types/',marker:'vehicle-types-original-archive',archive:'/blog/archive/vehicle-taksong/',source:'224431721391'}
 ];
 for(const entry of fifthBatch){
   const page=await get(entry.route);
   assert.ok(page.includes('id="'+entry.marker+'"')&&page.includes('href="'+entry.archive+'"'),
     'fifth batch original-source links present: '+entry.route);
   assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/'+entry.source),
     'fifth batch Naver original sourced: '+entry.route);
   assert.ok(page.includes('1811-4294')&&!page.includes('tel:18775245'),
     'fifth batch non-Jeju pages preserve nationwide phone: '+entry.route);
 }
 const sixBatch=[
 {route:'/business/auction/',marker:'auction-original-blog-guide',origins:['224421653506','224398306763'],archive:'/blog/archive/vehicle-taksong/'},
 {route:'/business/export-port/',marker:'export-original-blog-guide',origins:['224363608182','224421653506'],archive:'/blog/archive/vehicle-taksong/'},
 {route:'/business/scrapyard/',marker:'scrapyard-original-blog-guide',origins:['224389438504','224371924577'],archive:'/blog/archive/other-taksong/'},
 {route:'/special/24-hour-service/',marker:'overnight-original-blog-guide',origins:['224430950314','224431721391'],archive:'/blog/archive/vehicle-taksong/'},
 {route:'/service/taksong/',marker:'taksong-service-original-guide',origins:[],archive:'/blog/archive/gangwon-taksong/'}
 ];
 for(const entry of sixBatch){
  const page=await get(entry.route);
  assert.ok(page.includes('id="'+entry.marker+'"')&&page.includes('href="'+entry.archive+'"'),
   'sixth batch page has distinct booking guide and original archive: '+entry.route);
  for(const id of entry.origins){
   assert.ok(originalById.has(id)&&page.includes(originalById.get(id).url),
    'sixth batch only links real original Naver posts: '+id);
  }
  assert.ok(page.includes('tel:18114294'),'national consultation retained '+entry.route);
 }
 const overnight=await get('/special/24-hour-service/');
 assert.ok(overnight.includes('rel="canonical" href="https://jeongukdaeri.kr/special/24-hour-service/"'),
  'overnight official page uses one canonical domain, not old github.io');
 assert.ok(!overnight.includes('rel="canonical" href="https://8882888.github.io/'),
  'github backup address must not be canonical');
 const nationwideTaksongSix=await get('/service/taksong/');
 assert.ok(nationwideTaksongSix.includes('tel:18775245')&&nationwideTaksongSix.includes('/blog/archive/jeju-taksong/'),
  'national taksong gives Jeju-only consultation for Jeju service');

 const sevenBatch=[
 {path:'/service/daeri/',marker:'daeri-service-original-guide',source:['224445451429','224431732696'],archive:'/blog/archive/general-daeri/',canonical:'https://jeongukdaeri.kr/daeri/'},
 {path:'/special/nationwide-daeri/',marker:'national-daeri-original-guide',source:['224453006635','224445451429'],archive:'/blog/archive/general-daeri/',canonical:'https://jeongukdaeri.kr/daeri/'},
 {path:'/special/nationwide-transport/',marker:'nationwide-transport-original-guide',source:['224431721391','224452072174'],archive:'/blog/archive/capital-taksong/',canonical:'https://jeongukdaeri.kr/special/nationwide-transport/'},
 {path:'/special/outskirts-service/',marker:'outskirts-daeri-original-guide',source:['224453006635','224452992697','224452987205'],archive:'/blog/archive/general-daeri/',canonical:'https://jeongukdaeri.kr/special/outskirts-service/'},
 {path:'/special/truck-transport/',marker:'truck-transport-original-guide',source:['224418501595','224446313248','224431721391'],archive:'/blog/archive/vehicle-taksong/',canonical:'https://jeongukdaeri.kr/special/truck-transport/'}
 ];
 for(const entry of sevenBatch){
  const response=await fetch('http://127.0.0.1:3000'+entry.path);
  assert.equal(response.status,200,entry.path+' must render HTTP 200');
  const page=await response.text();
  assert.ok(page.includes('id="'+entry.marker+'"')&&page.includes('href="'+entry.archive+'"'),entry.path+' links to relevant original archive');
  assert.ok(page.includes('rel="canonical" href="'+entry.canonical+'"'),entry.path+' keeps intended canonical');
  for(const id of entry.source){
   assert.ok(originalById.has(id)&&page.includes(originalById.get(id).url),entry.path+' only links existing original Naver post '+id);
  }
  assert.ok(page.includes('tel:18114294'),entry.path+' retains nationwide consultation');
 }
 const backupCanonicals=['/special/nationwide-transport/','/special/outskirts-service/','/special/truck-transport/'];
 for(const path of backupCanonicals){
  assert.ok(!(await get(path)).includes('rel="canonical" href="https://8882888.github.io/'),path+' must not use backup host as canonical');
 }
 const eighthFive=[{"route":"/special/seoraksan-transport/","marker":"seoraksan-real-source-guide","archive":"/blog/archive/mountain-cycle/","origins":["224451230156","224453015755","224453074981"],"canonical":"https://jeongukdaeri.kr/special/seoraksan-transport/"},{"route":"/special/jirisan-transport/","marker":"jirisan-real-source-guide","archive":"/blog/archive/mountain-cycle/","origins":["224430920625","224422345862","224453077687"],"canonical":"https://jeongukdaeri.kr/special/jirisan-transport/"},{"route":"/special/cycling-trail-transport/","marker":"cycling-trail-real-source-guide","archive":"/blog/archive/mountain-cycle/","origins":["224450163134","224445317658","224452067282"],"canonical":"https://jeongukdaeri.kr/special/cycling-trail-transport/"},{"route":"/special/national-bicycle-road/","marker":"national-bicycle-real-source-guide","archive":"/blog/archive/mountain-cycle/","origins":["224443728585","224445430649","224452067282"],"canonical":"https://jeongukdaeri.kr/special/national-bicycle-road/"},{"route":"/special/deogyusan/","marker":"deogyusan-real-source-guide","archive":"/blog/archive/mountain-cycle/","origins":["224431773709","224448804487"],"canonical":"https://jeongukdaeri.kr/special/deogyusan/"}];
 for(const entry of eighthFive){
  const response=await fetch('http://127.0.0.1:3000'+entry.route);
  assert.equal(response.status,200,entry.route+' must return HTTP 200');
  const html=await response.text();
  assert.ok(html.includes('id="'+entry.marker+'"')&&html.includes('href="'+entry.archive+'"'),
    entry.route+' has unique guidance and original Naver archive');
  assert.ok(html.includes('rel="canonical" href="'+entry.canonical+'"'),
    entry.route+' canonical uses official website');
  for(const id of entry.origins){
   assert.ok(originalById.has(id)&&html.includes(originalById.get(id).url),
     entry.route+' links real blog source '+id);
  }
  assert.ok(html.includes('tel:18114294'),entry.route+' keeps nationwide consultation');
  assert.ok(!html.includes('rel="canonical" href="https://8882888.github.io/'),
    entry.route+' does not prioritize the backup domain');
 }
 const ninthFive=[{"route":"/special/osaek/","marker":"osaek-source-guide","source":["224451230156","224428185111"],"archive":"/blog/archive/mountain-cycle/","canonical":"https://jeongukdaeri.kr/special/osaek/"},{"route":"/special/hangyeryeong/","marker":"hangyeryeong-source-guide","source":["224423738485","224453015755"],"archive":"/blog/archive/mountain-cycle/","canonical":"https://jeongukdaeri.kr/special/hangyeryeong/"},{"route":"/special/baekdamsa/","marker":"baekdamsa-source-guide","source":["224453015755","224428185111"],"archive":"/blog/archive/mountain-cycle/","canonical":"https://jeongukdaeri.kr/special/baekdamsa/"},{"route":"/special/namgyori/","marker":"namgyori-source-guide","source":["224448653664","224453074981"],"archive":"/blog/archive/mountain-cycle/","canonical":"https://jeongukdaeri.kr/special/namgyori/"},{"route":"/special/seoraksan/","marker":"seoraksan-four-routes-guide","source":["224437898065","224448653664","224453074981"],"archive":"/blog/archive/mountain-cycle/","canonical":"https://jeongukdaeri.kr/special/seoraksan/"}];
 for(const item of ninthFive){
  const response=await fetch('http://127.0.0.1:3000'+item.route);
  assert.equal(response.status,200,item.route+' HTTP 200');
  const html=await response.text();
  assert.ok(html.includes('id="'+item.marker+'"')&&html.includes('href="'+item.archive+'"'),item.route+' contains specific reader guidance and original archive');
  assert.ok(html.includes('rel="canonical" href="'+item.canonical+'"'),item.route+' canonical uses official host');
  assert.ok(!html.includes('rel="canonical" href="https://8882888.github.io/'),item.route+' excludes backup host canonical');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,item.route+' retains one heading');
  assert.ok(html.includes('tel:18114294'),item.route+' retains nationwide hotline');
  for(const id of item.source){
    assert.ok(originalById.has(id)&&html.includes(originalById.get(id).url),item.route+' links only verified public blog source '+id);
  }
 }
 const jeju=await get('/taksong/jeju/');
 assert.ok(jeju.includes('href="/blog/archive/jeju-taksong/"'),
   'Jeju service guide links directly to the curated Jeju blog article');
 const gangwonService=await get('/taksong/gangwon/');
 assert.ok(gangwonService.includes('id="gangwon-source-archive"')&&
   gangwonService.includes('href="/blog/archive/gangwon-taksong/"'),
   'Gangwon taksong region service links directly to the curated provincial blog article');
 assert.ok(gangwonService.includes('tel:18114294'),
   'Gangwon service continues to use nationwide contact, not Jeju dedicated phone');
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
