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
const port=30000+Math.floor(Math.random()*10000);
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port),PUBLIC_HOST:'example.com'},stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',d=>stderr+=d);
async function get(p){return fetch('http://127.0.0.1:'+port+p)}
(async()=>{
 try{
  for(let i=0;i<50;i++){try{const r=await get('/health');if(r.ok)break}catch{}await delay(100)}
  const h=await get('/health');assert.equal(h.status,200);const health=await h.json();assert.equal(health.regions,regions.length);
  const keywordStatus=await (await get('/api/keyword-status')).json();assert.ok(keywordStatus.stored>200000);assert.equal(keywordStatus.searchExposure,'not-measured');
  for(const query of ['강화도맛집','강남맛집','설악산','영덕해맞이공원']){
   const response=await get('/keyword-search/?q='+encodeURIComponent(query));assert.equal(response.status,200);assert.equal(response.headers.get('x-robots-tag'),'noindex, follow');const html=await response.text();assert.ok(/href="\/(?:daeri|taksong|visit|place)\//.test(html),'keyword must link to a real website destination: '+query);
  }
  const categoryHtml=await (await get('/keyword-search/?category='+encodeURIComponent('맛집'))).text();assert.ok(categoryHtml.includes('맛집·식당 방문 후 대리운전'));assert.ok(categoryHtml.includes('/assets/smart24-daeri-brand.png'));assert.ok(categoryHtml.includes('activity-feature'));assert.ok(!categoryHtml.includes('자동 갱신 현황'));assert.ok(!categoryHtml.includes('20,562'));
  for(const p of ['/activities/','/activities/food/','/activities/hiking/','/activities/cycling/']){const r=await get(p);assert.equal(r.status,200);const h=await r.text();assert.ok(h.includes('index,follow,max-image-preview:large'));assert.ok(h.includes('property="og:image"'));const activityImage=h.match(/property="og:image" content="https:\/\/example.com([^"]+)/)[1];assert.ok(h.includes('src="'+activityImage+'"'),'advertised card must be visible on category page');assert.ok(h.includes('tel:18114294'));assert.ok(!h.includes('자동 갱신 현황'));assert.ok(!h.includes('20,562'));assert.ok(h.includes('href="https://example.com'+p+'"'));}
  const oldCategory=await fetch('http://127.0.0.1:'+port+'/keyword-search/?category='+encodeURIComponent('맛집'),{redirect:'manual'});assert.equal(oldCategory.status,301);assert.equal(oldCategory.headers.get('location'),'/activities/food/');
  assert.equal((await get('/activities/unknown/')).status,404);
  const busanHtml=await (await get('/taksong/busan/')).text();const busanGraph=[...busanHtml.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1])).flatMap(x=>x['@graph']||[x]);const busanCrumbs=busanGraph.find(x=>x['@type']==='BreadcrumbList');assert.ok(busanCrumbs);assert.deepEqual(busanCrumbs.itemListElement.map(x=>x.name),['홈','전국 탁송','부산탁송']);assert.equal(busanCrumbs.itemListElement.at(-1).item,'https://example.com/taksong/busan/');assert.ok(busanHtml.includes('href="/taksong/">전국 탁송'));
  const injected=await (await get('/keyword-search/?q='+encodeURIComponent('<script>alert(1)</script>'))).text();assert.ok(!injected.includes('<script>alert(1)</script>'));
  const feedFixture=require('../data/keywords/catalog.json').items.find(x=>x.origin==='public-feed'&&x.state==='linked'&&x.category==='축제');assert.ok(feedFixture,'a collected and linked festival keyword must exist');
  const bookingHtml=await (await get('/visit/'+feedFixture.id+'/')).text();const bookingSelect=bookingHtml.match(/<select name="service">(.*?)<\/select>/s)[1];assert.ok(bookingSelect.includes('value="daeri" selected'),'driver guide must select designated driving in its quote form');
  assert.ok(bookingHtml.match(/property="og:image" content="[^"]+-daeri-brand.png/));
  for(const html of [bookingHtml,categoryHtml]){const paragraphs=[...html.matchAll(/<p[^>]*>(.*?)<\/p>/gs)].map(x=>x[1].replace(/<[^>]+>/g,'').trim()).filter(x=>x.length>40);assert.equal(new Set(paragraphs).size,paragraphs.length,'guide should not repeat its lead paragraph');}
  const coast=require('../data/coastal/places.json');assert.ok(coast.items.length>600);assert.equal(coast.unresolved.length,0);assert.equal(new Set(coast.items.map(x=>x.id)).size,coast.items.length);
  for(const x of coast.items){assert.equal(regions.find(r=>r.slug===x.regions[0])?.full_name,x.regionFull);assert.ok(x.aliases.includes(x.term));}
  const coastSitemap=await (await get('/sitemap.xml')).text();
  for(const x of coast.items)for(const k of ['daeri','taksong'])assert.ok(coastSitemap.includes('/'+k+'/coast/'+x.id+'/'));
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
  const sm=await get('/sitemap.xml');assert.equal(sm.status,200);const xml=await sm.text();assert.ok((xml.match(/<loc>/g)||[]).length>=regions.length+2,'main sitemap includes all regions and category URLs');assert.ok(xml.includes('example.com'));assert.ok(xml.includes('/places/'),'place category hub appears in sitemap');assert.ok(xml.includes('/places/'+encodeURIComponent('캠핑장')+'/'),'camping category appears in sitemap');assert.ok(xml.includes('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/'),'tow truck delivery category appears in sitemap');
  const guideUrls=[...xml.matchAll(/<loc>([^<]+\/(?:fare|long-distance|handover)\/)<\/loc>/g)].map(x=>x[1]);
  assert.equal(guideUrls.length,health.regionalGuides,'submitted sitemap contains every regional topic guide');
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
   assert.ok(xml.includes('https://example.com'+image),'topic card is included in image sitemap');
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
  const root=await get('/');assert.equal(root.status,200);
  const regionIndex=await get('/region/');assert.equal(regionIndex.status,200);const places=await get('/places/');assert.equal(places.status,200);assert.ok((await places.text()).includes('캠핑장'));const camping=await get('/places/'+encodeURIComponent('캠핑장')+'/');assert.equal(camping.status,200);const reka=await get('/taksong/type/'+Buffer.from('렉카탁송','utf8').toString('hex')+'/');assert.equal(reka.status,200);const daeriMap=await get('/sitemap-daeri.xml');assert.equal(daeriMap.status,200);assert.equal(((await daeriMap.text()).match(/<loc>/g)||[]).length,regions.length);const taksongMap=await get('/sitemap-taksong.xml');assert.equal(taksongMap.status,200);assert.equal(((await taksongMap.text()).match(/<loc>/g)||[]).length,regions.length);
  const search=await get('/region/?q='+encodeURIComponent('가평읍'));assert.equal(search.status,200);assert.ok((await search.text()).includes('가평읍'));
  console.log('PASS: server, '+regions.length+' regions, pages, no-history content, sitemap, 404, homepage');
 }catch(e){console.error(e);console.error(stderr);process.exitCode=1}finally{child.kill()}
})();
