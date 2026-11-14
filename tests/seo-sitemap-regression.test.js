'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const reviewed=JSON.parse(fs.readFileSync(path.join(root,'data/priority-regions.json'),'utf8')).pages;

test('every declared sitemap has an explicit server route',()=>{
 const routes=[...robots.matchAll(/^Sitemap:\s+https:\/\/jeongukdaeri\.kr(\/[^\s]+)$/gm)].map(m=>m[1]);
 assert.equal(routes.length,7,'keep seven published sitemap declarations');
 for(const route of routes){
  assert.ok(server.includes("pathname==='"+route+"'"),'missing sitemap handler: '+route);
 }
});
test('sitemap index includes reviewed routes and history inventory',()=>{
 for(const route of ['/sitemap-reviewed-routes.xml','/sitemap-history.xml','/sitemap-priority.xml']){
  assert.ok(server.includes("'"+route+"'"),'missing sitemap index reference: '+route);
 }
 assert.ok(server.includes("'/sitemap-history-'+(i+1)+'.xml'"),'history shards must remain reachable');
});
test('reviewed regional sitemap is backed by source-reviewed pages only',()=>{
 assert.ok(server.includes('priorityRegionalPages.flatMap(entry=>'),'reviewed sitemap must use curated records');
 assert.ok(server.includes('regionByFullName.get(entry.region)'),'region names must resolve to canonical regions');
 assert.ok(server.includes('servicePath(region,entry.kind)'),'sitemap must use canonical service routes');
 assert.ok(reviewed.length>0);
 const keys=new Set();
 for(const entry of reviewed){
  assert.ok(['daeri','taksong'].includes(entry.kind));
  assert.ok(entry.region&&entry.topic&&entry.detail);
  const key=entry.kind+'|'+entry.region;
  assert.ok(!keys.has(key),'duplicate reviewed route '+key);
  keys.add(key);
 }
});

test('priority sitemap guide selection respects the reviewed region and service gate',()=>{
 const start=server.indexOf("if(pathname==='/sitemap-priority.xml')");
 assert.ok(start>=0,'dynamic priority sitemap handler must exist');
 const code=server.slice(start,server.indexOf("if(pathname==='/sitemap-daeri.xml'",start));
 assert.ok(code.includes("reviewedIntentLinkKeys.has(kind+'|'+region.full_name)"),
   'priority sitemap must not relist all unreviewed topic permutations');
 assert.ok(code.includes('...priorityLocalityRoutes'),
   'original canonical locality landings remain discoverable');
 assert.ok(code.includes('...priorityRegionalGuides'),
   'reviewed regional guide entries remain discoverable');
});

test('live release verifier rejects unreviewed priority guide resurrection',()=>{
 const verifier=fs.readFileSync(path.join(root,'scripts/verify-live-seo-release.cjs'),'utf8');
 assert.ok(verifier.includes("const priorityXml=await read('/sitemap-priority.xml')"),
  'verify the actual priority sitemap after Cloudtype deployment');
 assert.ok(verifier.includes("const reviewedXml=await read('/sitemap-regional-guides.xml')"),
  'compare priority and reviewed sitemap on the same release');
 assert.ok(verifier.includes("priorityXml.includes(unreviewedSample)"),
  'release must fail if a template-only priority guide is reintroduced');
});

test('Gijang-gun taksong has a direct homepage link and priority discovery URL',()=>{
 const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const priority=fs.readFileSync(path.join(root,'sitemap-priority.xml'),'utf8');
 const url='https://jeongukdaeri.kr/taksong/busan/gijang-gun/';
 assert.ok(home.includes('<a href="/taksong/busan/gijang-gun/">기장군탁송</a>'),'Missing county exact-match link from national homepage');
 assert.ok(priority.includes('<loc>'+url+'</loc>'),'Gijang canonical missing from priority sitemap');
 assert.equal(priority.split('<loc>'+url+'</loc>').length-1,1,'Gijang canonical appears more than once');
 assert.ok(server.includes("'부산광역시 기장군'"),'Live dynamic priority sitemap must select a real legal region');
});

test('cycling center discovery stays in priority and main sitemaps',()=>{
 const main=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 const priority=fs.readFileSync(path.join(root,'sitemap-priority.xml'),'utf8');
 const url='<loc>https://jeongukdaeri.kr/route-taksong/centers/</loc>';
 assert.ok(main.includes(url),'main sitemap must include cycling center guide');
 assert.ok(priority.includes(url),'priority sitemap must include cycling center guide');
 const page=fs.readFileSync(path.join(root,'route-taksong/centers/index.html'),'utf8');
 assert.ok(page.includes('rel="canonical" href="https://jeongukdaeri.kr/route-taksong/centers/"'),'canonical must point to indexable base URL');
 assert.ok(page.includes('action="/route-taksong/centers/" method="get"'),'search must submit query before fragment');
 assert.ok(page.includes('name="q"'),'search input must be submitted as q');
 assert.equal((page.match(/href="\?q=[^"]+#result"/g)||[]).length,25,'retain 25 center shortcuts');
 const shortcuts=[...page.matchAll(/href="\?q=([^"#]+)#result"/g)].map(match=>decodeURIComponent(match[1]));
 assert.equal(new Set(shortcuts).size,25,'center shortcuts must be unique');
 const script=page.slice(page.indexOf('const officialCenters='),page.indexOf('</script>'));
 for(const name of shortcuts){
  assert.ok(script.includes("'"+name+"'"),'search data missing center shortcut: '+name);
 }

});

test('all sitemap index entries are declared and handled',()=>{
 const indexStart=server.indexOf("const rootSitemaps=pathname==='/sitemap-all.xml'");
 assert.ok(indexStart>=0,'sitemap-all index handler must exist');
 const indexCode=server.slice(indexStart,server.indexOf("const xml=",indexStart));
 const expected=['/sitemap-priority.xml','/sitemap.xml','/sitemap-reviewed-routes.xml','/sitemap-taksong.xml','/sitemap-daeri.xml'];
 for(const route of expected){
  assert.ok(indexCode.includes("'"+route+"'"),'sitemap-all missing '+route);
  assert.ok(robots.includes('Sitemap: https://jeongukdaeri.kr'+route),'robots missing '+route);
 }
 assert.ok(indexCode.includes("...Array.from({length:Math.ceil(indexableHistoricalRides.length/500)}"),'root must link every canonical history shard directly');
 assert.ok(indexCode.includes("'/sitemap-history-'+(i+1)+'.xml'"),'root must emit numbered history shard URLs');
 assert.ok(!indexCode.includes("'/sitemap-history.xml'"),'do not nest a sitemap index inside the root index');
 assert.ok(robots.includes('Sitemap: https://jeongukdaeri.kr/sitemap-history.xml'),'standalone history index remains advertised');
 assert.ok(server.includes("const historySitemapMatch=pathname.match("),'history shard route must exist');
 assert.ok(server.includes("if(segment>total)return respond(res,404"),'history shards must reject out-of-range requests');
});

test('dynamic sitemap retains cycling guide before 499-URL cutoff',()=>{
 const start=server.indexOf("if(pathname==='/sitemap.xml')");
 assert.ok(start>=0,'dynamic main sitemap handler must exist');
 const end=server.indexOf("const urls=[...new Set(focused)].slice(0,499)",start);
 assert.ok(end>start,'main sitemap URL limit must remain explicit');
 const focused=server.slice(start,end);
 for(const route of ['/route-taksong/','/route-taksong/centers/','/special/cycling-trail-transport/']){
  assert.ok(focused.includes("'"+route+"'"),'dynamic sitemap missing cycling route '+route);
 }
 assert.ok(focused.indexOf("'/route-taksong/centers/'")<focused.indexOf('...provinceRegions.flatMap('),
  'cycling center guide must precede province and locality expansion');
 assert.ok(focused.indexOf("'/special/cycling-trail-transport/'")<focused.indexOf('...provinceRegions.flatMap('),
  'cycling service guide must precede province and locality expansion');
});

test('automobile delivery service guides precede province expansion in dynamic sitemap',()=>{
 const start=server.indexOf("if(pathname==='/sitemap.xml')");
 const end=server.indexOf("const urls=[...new Set(focused)].slice(0,499)",start);
 assert.ok(start>=0&&end>start,'dynamic sitemap source must be present');
 const focused=server.slice(start,end);
 const province=focused.indexOf('...provinceRegions.flatMap(');
 assert.ok(province>0,'province expansion must exist');
 for(const route of [
  '/service/taksong/','/service/taksong-purpose/','/service/long-distance-taksong/','/service/heavy-truck-taksong/',
  '/taksong/types/','/taksong/jeju/','/reviews/taksong/','/fare/',
  '/business/rental-car/','/business/used-car/','/business/auction/','/business/export-port/'
 ]){
  const index=focused.indexOf("'"+route+"'");
  assert.ok(index>=0&&index<province,'priority automobile delivery guide missing or delayed: '+route);
 }
});

test('priority taksong locality discovery uses real legal regions before broad expansion',()=>{
 const start=server.indexOf("if(pathname==='/sitemap.xml')");
 const end=server.indexOf("const urls=[...new Set(focused)].slice(0,499)",start);
 assert.ok(start>=0&&end>start,'dynamic sitemap handler exists');
 const focused=server.slice(start,end);
 const first=focused.indexOf("'부산광역시','대구광역시','울산광역시','세종특별자치시'");
 const province=focused.indexOf('...provinceRegions.flatMap(');
 assert.ok(first>=0&&first<province,'priority taksong localities must precede broad province list');
 assert.ok(focused.includes(".map(name=>regionByFullName.get(name)).filter(Boolean).map(r=>servicePath(r,'taksong'))"),
  'priority taksong regions must resolve official regions, never invent URL slugs');
 for(const name of ['경상남도 창원시','경상남도 진주시','경상북도 김천시','강원특별자치도 원주시','전라남도 나주시']){
  assert.ok(focused.includes("'"+name+"'"),'missing priority innovation-city taksong '+name);
 }
});


test('local service-center taksong discovery links to the purpose-specific handover guide',()=>{
 assert.ok(server.includes("['정비·서비스센터 차량 인계','/service/taksong-purpose/']"),
  'regional service-center links must not point only to the generic taksong landing page');
});

test('vehicle guide navigation does not promise removed promotional images',()=>{
 assert.ok(server.includes('차종·차량 크기와 출발지·도착지, 희망 인수 시각을 알려주시면 차량 이동 조건을 상담합니다.'),
  'vehicle guide must explain available booking information');
 assert.ok(!server.includes('차종별 소개 이미지를 확인하세요'),
  'vehicle guide must not promise images that are intentionally hidden');
});

test('vehicle guide includes actionable handover details without promotional imagery',()=>{
 for(const phrase of ['차량의 정확한 주차 위치','차량 키 전달 방법','시동·주행 가능 상태','정비 입출고나 렌트카 반납']){
  assert.ok(server.includes(phrase),'missing handover information: '+phrase);
 }
 assert.ok(server.includes("kind==='taksong'?'자동차탁송 인수·인계 전 확인':'대리운전 출발 전 확인'"),
  'vehicle guide heading must reflect the actual service');
});

test('chauffeur and taksong vehicle guides use distinct operational checklists',()=>{
 assert.ok(server.includes("kind==='taksong'?'<ol><li>차량의 정확한 주차 위치"),
  'taksong-only handover checklist must be conditional');
 assert.ok(server.includes(":'<ol><li>출발지의 정확한 위치와 주차장 출입 방법"),
  'chauffeur checklist must describe driver pickup rather than vehicle delivery');
});

test('vehicle guide introduction uses service-specific pickup terminology',()=>{
 assert.ok(server.includes("kind==='taksong'?'차량 인수·인계 조건과 예약 준비사항':'출발지·목적지와 기사 호출 전 확인사항'"));
 assert.ok(server.includes("kind==='taksong'?'차종·차량 크기와 출발지·도착지, 희망 인수 시각"));
 assert.ok(server.includes(":'차종과 출발지·목적지, 희망 출발 시각"));
});

test('booking journey labels distinguish vehicle handover from chauffeur pickup',()=>{
 assert.ok(server.includes("isT?'차량 인수·인계와 예약 준비':'출발지 확인과 기사 호출 준비'"),
  'service journey must use service-specific booking language');
});

test('national reservation guide does not reuse vehicle handover instructions for chauffeur',()=>{
 assert.ok(server.includes("isT?'<ol><li>차량이 있는 출발지의 정확한 주소와 주차 위치"));
 assert.ok(server.includes(":'<ol><li>기사와 만날 출발지 주소 및 주차 위치"));
 assert.ok(server.includes('차종·동승 인원과 차량 특이사항'));
});

test('national taksong hub builds priority city links from canonical region paths',()=>{
 for(const city of ['세종','창원','대전','속초','강릉']){
  assert.ok(server.includes("['"+city+"',"),'missing priority city: '+city);
 }
 assert.ok(server.includes("servicePath(r,'taksong')"),'priority city links must use canonical region paths');
 assert.ok(server.includes("if(!r)throw Error('Missing canonical priority taksong region: '+full)"),
  'missing official city data must fail loudly rather than silently drop links');
 assert.ok(!server.includes("regions.find(x=>x.name===name+'시'"),
  'ambiguous city-name fallback must never choose the wrong province');
});

test('history sitemaps publish canonical ride URLs only while preserving original records',()=>{
 const duplicates=JSON.parse(fs.readFileSync(path.join(root,'data/seo-history-duplicates.json'),'utf8')).canonicalById;
 assert.ok(Object.keys(duplicates).length>0,'duplicate mappings should be evaluated');
 assert.ok(server.includes("const indexableHistoricalRides=historicalRides.filter("),'sitemap-specific canonical ride list must exist');
 assert.ok(server.includes("!historyCanonicalById[x.id]||historyCanonicalById[x.id]===x.id"),'noncanonical originals must be excluded from discovery');
 assert.ok(server.includes("indexableHistoricalRides.slice((segment-1)*500,segment*500)"),'history sitemap shards must use filtered canonical records');
 assert.ok(server.includes("const historicalRides=(Array.isArray(rides)?rides:[]).map("),'original ride dataset must remain intact');
});

test('primary taksong and recruitment titles retain the approved search intent',()=>{
 const pages=JSON.parse(fs.readFileSync(path.join(root,'data/seo-pages.json'),'utf8')).pages;
 const titles=new Map(pages.map(p=>[p.path,p.title]));
 assert.equal(titles.get('/taksong/'),'전국자동차탁송｜실제 운행후기·24시탁송·요금조회');
 assert.equal(titles.get('/recruit/taksong/'),'탁송기사모집｜전국 로드탁송기사 지원·등록 안내');
 assert.equal(titles.get('/recruit/daeri/'),'대리운전기사모집｜전국 대리기사 지원·등록 안내');
 assert.ok(server.includes("r.full_name==='울산광역시'?'울산탁송｜자동차탁송·빠른배차·예약배차'"),'Ulsan title override must remain');
 assert.ok(server.includes("r.full_name==='세종특별자치시'?'세종탁송｜장거리 차량탁송·거리조회·예약'"),'Sejong title override must remain');
});

test('national commercial keywords and recruitment hubs stay in priority discovery',()=>{
 const priority=fs.readFileSync(path.join(root,'sitemap-priority.xml'),'utf8');
 const paths=['/taksong/','/daeri/','/taksong/daegu/','/taksong/ulsan/','/taksong/sejong/',
              '/daeri/daegu/','/daeri/ulsan/','/daeri/sejong/','/recruit/taksong/','/recruit/daeri/'];
 for(const p of paths){
  const url='<loc>https://jeongukdaeri.kr'+p+'</loc>';
  assert.equal(priority.split(url).length-1,1,'Expected one canonical nationwide priority URL: '+p);
 }
 assert.ok(server.includes("'/recruit/daeri/','/recruit/taksong/'"),'Dynamic priority should retain recruitment hubs');
});

test('dynamic priority sitemap puts nationwide commercial-intent pages before regional inventories',()=>{
 const at=server.indexOf("if(pathname==='/sitemap-priority.xml')");
 assert.ok(at>=0,'dynamic priority sitemap handler required');
 const block=server.slice(at,server.indexOf("if(pathname==='/sitemap-daeri.xml'",at));
 assert.ok(block.includes("const nationwideCommercialPriority=['대구광역시','울산광역시','세종특별자치시']"),'metro focus routes must use real legal regions');
 assert.ok(block.includes("servicePath(r,'taksong'),servicePath(r,'daeri')"),'metro routes must use canonical service paths');
 const early=block.indexOf("const urls=['/','/taksong/','/daeri/','/service/taksong/','/service/long-distance-taksong/','/recruit/taksong/','/recruit/daeri/',...nationwideCommercialPriority");
 assert.ok(early>=0,'national taksong, recruitment and metro intent URLs must lead discovery sitemap');
 assert.ok(early<block.indexOf('...nationwideProvinceHubs'),'national intent URLs must precede province inventory');
});

test('verified regional discovery uses completed source records, canonical pages and stays in sitemap-all',()=>{
 const start=server.indexOf("if(pathname==='/sitemap-verified-regions.xml')");
 assert.ok(start>=0,'verified-region sitemap route is missing');
 const code=server.slice(start,server.indexOf("if(pathname==='/sitemap-history.xml'",start));
 assert.ok(code.includes("indexableHistoricalRides.some("),'only canonical finished records may support discovery');
 assert.ok(code.includes("matchingHistoryRegion(x,r,regions)"),'regional evidence must be geographically verified');
 assert.ok(code.includes("['시도','시','군','구'].includes(r.level)"),'avoid village-scale templated pages');
 assert.ok(code.includes("servicePath(r,kind)"),'use canonical region routing');
 assert.ok(server.slice(server.indexOf("const rootSitemaps="),server.indexOf("const historySitemapMatch=")).includes("'/sitemap-verified-regions.xml'"),'integrated sitemap must link new discovery supplement');
});

test('verified regional discovery is cached and advertised to crawlers',()=>{
 const start=server.indexOf("if(pathname==='/sitemap-verified-regions.xml')");
 const end=server.indexOf("if(pathname==='/sitemap-history.xml'",start);
 const block=server.slice(start,end);
 assert.ok(block.includes("sitemapCache.get(pathname)"),'repeated verified sitemap requests should reuse cached XML');
 assert.ok(block.includes("sitemapCache.set(pathname,xml)"),'verified region XML must be cached');
 assert.ok(server.includes("'Sitemap: '+base+'/sitemap-verified-regions.xml'"),'robots.txt should expose the evidence-backed sitemap');
});

test('national answer-first content is visible, useful and tied to real consultation',()=>{
 assert.ok(server.includes('id="national-taksong-direct-answer"'),'national taksong needs a direct-answer summary');
 assert.ok(server.includes('id="national-daeri-direct-answer"'),'national daeri needs a direct-answer summary');
 assert.ok(/const body=answerFirst\+[^;\n]*\+taksongTrustFirst\+/.test(server),'answer-first section must lead rendered national hubs');
 assert.ok(server.includes('24시 상담 안내는 전국 모든 지역의 즉시 배차 보장을 의미하지 않습니다'),'do not promise universal dispatch');
 assert.ok(server.includes('/reviews/history/?kind=taksong'),'cite actual completed taksong records in visible answer');
 assert.ok(server.includes('/fare/?service=daeri'),'include actual fare lookup');
});

test('regional AEO direct answers cover all nationwide administrative levels without artificial indexability',()=>{
 assert.ok(server.includes("['시도','시','군','구','읍','면','동','리'].includes(r.level)"),'all existing administrative levels need visible region answers');
 assert.ok(server.includes("const regionalAnswerContext=r.level==='시도'"),'answer text must distinguish province city and neighborhood conditions');
 assert.ok(server.includes('외곽이나 심야에는 배차가 제한될 수 있습니다'),'sparse rural locality guidance must not promise instant dispatch');
 assert.ok(server.includes('id="regional-direct-answer"'),'indexable region answers should be visible in HTML');
 assert.ok(server.includes("const rendered=layout(searchTitle,searchDesc,regionalAnswerFirst+"),'direct answer should lead the regional content');
 assert.ok(server.includes('과거 요금은 현재 고정 요금이 아닙니다'),'past completed ride fares cannot be presented as current quotes');
 assert.ok(server.includes('확인되지 않은 후기를 작성하지 않습니다'),'do not fabricate regional ride evidence');
});

test('favicon is retained and served as a valid crawlable icon instead of deleting its URL',()=>{
 assert.ok(server.includes("if(pathname==='/favicon.ico')"),'favicon must have an explicit server route');
 assert.ok(server.includes("fs.readFileSync(path.join(ROOT,'favicon.ico'))"),'favicon route must load its actual binary asset');
 assert.ok(server.includes("res.writeHead(200,{'content-type':'image/x-icon'"),'favicon GET must return HTTP 200 and icon MIME');
 assert.ok(server.includes("req.method==='HEAD'?undefined:icon"),'favicon HEAD must return the same status without a response body');
 assert.ok(!server.includes("pathname==='/favicon.ico')return respond(res,400"),'favicon must not be treated as a malformed request');
});

test('nationwide coverage exposes crawlable region and original ride links only with evidence',()=>{
 assert.ok(server.includes('id="verified-coverage-crawl-links"'),'nationwide hub must have visible crawlable evidence links');
 assert.ok(server.includes("const ride=indexableHistoricalRides.find(x=>x.service===p.kind"),'region links must be grounded in completed immutable records');
 assert.ok(server.includes("matchingHistoryRegion(x,r,regions)"),'rides must match canonical administrative region');
 assert.ok(server.includes("'+cards+'</div></section>'+verifiedCoverageHtml"),'evidence links must appear in nationwide HTML');
 assert.ok(server.includes("encodeURIComponent(x.ride.id)"),'original completed record must have a direct crawlable URL');
 assert.ok(server.includes("}).slice(0,36)"),'limit hub links to avoid indiscriminate mass linking');
});

test('national commercial hubs link only canonical evidence-backed regional rides',()=>{
 assert.ok(server.includes("const evidenceByService=Object.freeze("),'evidence must be derived from immutable ride inventory');
 assert.ok(server.includes("indexableHistoricalRides.find(x=>x.service===kind"),'only canonical records for the correct service');
 assert.ok(server.includes("!usedRides.has(x.id)"),'do not list duplicate records');
 assert.ok(server.includes("records.length>=12"),'limit nationwide hub outbound link count');
 assert.ok(server.includes('id="national-verified-history-links"'),'visible server-rendered national evidence section');
 assert.ok(/const body=answerFirst\+(?:nationwidePlaceIntentLinks\(kind\)\+)?nationwideEvidenceSection\(kind\)\+/.test(server),'both national commercial hubs must expose real evidence near top');
 assert.ok(server.includes("encodeURIComponent(ride.id)"),'link directly to canonical source ride detail');
});

test('nationwide place intent discovery covers requested airport valley beach and Gyeonggi searches',()=>{
 for(const word of ['백운계곡대리운전','포천영북면대리운전','산정호수대리운전','남한산성대리운전','인천공항대리운전','인천공항탁송','인구대리운전','인구해변대리운전','가평현리대리운전','가평설악대리운전','포천일동대리운전','포천이동대리운전']){
  assert.ok(server.includes(word),'missing requested local search phrase '+word);
 }
 for(const word of ['대천해수욕장대리운전','전주한옥마을대리운전','해운대대리운전','경주보문단지대리운전','여수돌산대리운전','제주공항탁송']){
  assert.ok(server.includes(word),'missing nationwide intent region '+word);
 }
 assert.ok(server.includes('const body=answerFirst+nationwidePlaceIntentLinks(kind)+'),'both national service hubs must expose nationwide place links');
 assert.ok(server.includes('regionByFullName.get(full)'),'place links must resolve known canonical administrative pages');
 assert.ok(server.includes('해당 장소에 기사가 상주한다거나 현재 배차가 확정됐다는 뜻이 아닙니다'),'do not fabricate local dispatch presence');
});

test('nationwide beach and Incheon coastal search intents resolve to existing region links',()=>{
 for(const term of ['영종도탁송','강화도탁송','을왕리대리운전','을왕리해수욕장대리운전','삼목항대리운전','구읍뱃터대리운전','동막해수욕장대리운전','민머루해수욕장대리운전']){
  assert.ok(server.includes("'"+term+"'"),'required user keyword missing: '+term);
 }
 for(const term of ['꽃지해수욕장대리운전','무창포해수욕장대리운전','선유도해수욕장대리운전','낙산해수욕장대리운전','광안리해수욕장대리운전','영일대해수욕장대리운전','구조라해수욕장대리운전','함덕해수욕장대리운전']){
  assert.ok(server.includes("'"+term+"'"),'nationwide beach keyword missing: '+term);
 }
 assert.ok(server.includes("regionByFullName.get(full)"),'beach keyword must link to existing administrative region');
 assert.ok(server.includes("servicePath(r,service)"),'beach keywords cannot point to synthetic keyword URLs');
 assert.ok(server.includes('기사가 상주한다거나 현재 배차가 확정됐다는 뜻이 아닙니다'),'no unsupported immediate dispatch claims');
});
