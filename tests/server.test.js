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
  const categoryHtml=await (await get('/keyword-search/?category='+encodeURIComponent('맛집'))).text();assert.ok(categoryHtml.includes('먹거리·상권'));assert.ok(categoryHtml.includes('맛집 · 장소'));assert.ok(!categoryHtml.includes('계곡</a></li>'));
  const injected=await (await get('/keyword-search/?q='+encodeURIComponent('<script>alert(1)</script>'))).text();assert.ok(!injected.includes('<script>alert(1)</script>'));
  const unknownKeyword=await get('/visit/00000000000000000000/');assert.equal(unknownKeyword.status,404);
  const topicCatalog=require('../data/keywords/catalog.json');const mountain=topicCatalog.items.find(x=>x.term==='설악산');const mountainRes=await get('/visit/'+mountain.id+'/');assert.equal(mountainRes.status,200);const mountainHtml=await mountainRes.text();assert.ok(mountainHtml.includes('차키'));assert.ok(mountainHtml.includes('tel:18114294'));assert.ok(mountainHtml.includes('name="from"'));assert.ok(mountainHtml.includes('name="to"'));
  const eupHtml=await (await get('/daeri/incheon/ganghwa-gun/ganghwa-eup/')).text();assert.ok(eupHtml.includes('<title>강화읍대리운전'));assert.ok(eupHtml.includes('href="/daeri/incheon/"'));assert.ok(eupHtml.includes('href="/daeri/incheon/ganghwa-gun/"'));
  const ganghwa=await (await get('/daeri/incheon/ganghwa-gun/')).text();assert.ok(ganghwa.includes('id="destination-guide"'));assert.ok(ganghwa.includes('/keyword-search/'));
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
