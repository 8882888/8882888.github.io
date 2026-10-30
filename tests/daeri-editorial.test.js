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
 assert.ok(homepage.includes('/assets/illustrations/busan-rainy-dongnae.svg'),'homepage shows illustrated Busan scene');
 assert.ok(homepage.includes('/assets/illustrations/sokcho-three-ports.svg'),'homepage shows illustrated Sokcho scene');
 const golf=await get('/service/golf/');
 assert.ok(golf.includes('id="golf-travel-food-editorial"'),'golf driver content explains local food and tourism');
 assert.ok(golf.includes('/assets/illustrations/golf-driver.svg'),'golf has distinct contextual visual');
 assert.ok(golf.includes('25만원'),'golf driver source example remains');
 const taksongNotice=await get('/taksong/');
 assert.ok(taksongNotice.includes('24시탁송 · 전국 24시간 차량 이동 상담 안내'),'24 hour taksong service emphasized');
 assert.ok(taksongNotice.includes('월요일'),'taksong delay notice is shown');
 const mainSitemap=await get('/sitemap.xml');
 const driverSitemap=await get('/sitemap-daeri.xml');
 for(const place of travel.destinations){
  const path=travel.pathFor(place);
  const page=await get(path);
  const original=travel.original(place);
  assert.ok(page.includes(place.title),'travel detail title and on-page content match');
  assert.ok(page.includes(original.url),'existing source blog post linked without rewriting');
  assert.ok(page.includes(place.tags[0]),'site-visible topical hashtag reflects content');
  const visual='/assets/illustrations/'+({samgilpo:'samgilpo-harbor',gungpyeong:'gungpyeong-sunset','busan-dongnae':'busan-rainy-dongnae','sokcho-ports':'sokcho-three-ports'})[place.slug]+'.svg';
  assert.ok(page.includes(visual),'each geographic page has its own relevant illustration');
  assert.ok(page.includes('실제 운행 현장이나 해당 장소를 촬영한 사진이 아닙니다'),'illustration is not misrepresented as documentary photo');
  const asset=await fetch('http://127.0.0.1:3000'+visual);
  assert.equal(asset.status,200,'illustration asset is served');
  assert.ok((await asset.text()).includes('<svg'),'visual must be an actual SVG image');
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
