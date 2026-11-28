'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');

const root=path.resolve(__dirname,'..'),port=39374,base='http://127.0.0.1:'+port;
const modulePath=path.join(root,'lib/southeast-five-locality-seo.cjs');
const {approvedDescription}=require(modulePath);
const targets=[
 {name:'해운대구',full:'부산광역시 해운대구',suffix:'busan/haeundae-gu/',parent:'busan/',terms:['센텀시티','우동']},
 {name:'울산남구',full:'울산광역시 남구',suffix:'ulsan/nam-gu/',parent:'ulsan/',terms:['삼산동','무거동']},
 {name:'창원성산구',full:'경상남도 창원시 성산구',suffix:'gyeongnam/changwon-si/seongsan-gu/',parent:'gyeongnam/changwon-si/',terms:['상남동','성주동']},
 {name:'양산물금',full:'경상남도 양산시 물금읍',suffix:'gyeongnam/yangsan-si/mulgeum-eup/',parent:'gyeongnam/yangsan-si/',terms:['범어리','가촌리']},
 {name:'정관읍',full:'부산광역시 기장군 정관읍',suffix:'busan/gijang-gun/jeonggwan-eup/',parent:'busan/gijang-gun/',terms:['정관신도시','모전리']}
];
const attr=(html,re)=>html.match(re)?.[1]||'';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('Five original southeast localities retain ten separate service-intent SEO pages and exact canonical URLs',{timeout:170000},async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:['ignore','ignore','pipe']});
 let startupError='';child.stderr.on('data',chunk=>{startupError=(startupError+chunk.toString()).slice(-6000)});
 try{
  let ready=false;
  for(let i=0;i<115;i++){
   if(child.exitCode!==null)throw Error('Server exited during locality SEO test: '+startupError);
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ready=true;break;}}catch{}
   await wait(250);
  }
  assert(ready,'local server started');
  const allTitles=new Set(),allDescriptions=new Set();
  for(const item of targets){
   for(const kind of ['daeri','taksong']){
    const route='/'+kind+'/'+item.suffix,resp=await fetch(base+route,{headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'},redirect:'manual',signal:AbortSignal.timeout(23000)});
    assert.equal(resp.status,200,route+' HTTP 200');
    assert(!/noindex/i.test(resp.headers.get('x-robots-tag')||''),route+' header indexability unchanged');
    const html=await resp.text(),head=html.split('</head>')[0];
    const title=attr(head,/<title>([^<]*)<\/title>/);
    const desc=attr(head,/<meta\s+name="description"\s+content="([^"]*)"/);
    const og=attr(head,/<meta\s+property="og:description"\s+content="([^"]*)"/);
    assert(title.startsWith(item.name+(kind==='daeri'?'대리운전':'탁송')),route+' exact city/service title');
    assert.equal(desc,approvedDescription(item.full,kind),route+' approved localized description');
    assert.equal(desc,og,route+' meta and OG parity');
    assert([...desc].length<=80,route+' Naver description bound');
    assert(!allTitles.has(title)&&!allDescriptions.has(desc),route+' title/description must be unique to region/service');
    allTitles.add(title);allDescriptions.add(desc);
    assert(head.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+route+'">'),route+' own canonical');
    assert(!/<meta\s+name="robots"\s+content="noindex/i.test(head),route+' no accidentally introduced noindex');
    assert.equal((html.match(/<h1\b/g)||[]).length,1,route+' one H1');
    assert.equal((html.match(/id="southeast-five-locality-seo-20261123"/g)||[]).length,1,route+' focused editorial exactly once');
    assert(html.includes('id="regional-direct-answer"'),route+' existing region answer retained');
    assert(html.includes('href="/'+kind+'/'+item.parent+'"'),route+' parent canonical linked');
    assert(html.includes('href="/fare/?service='+kind+'&amp;from='),route+' correct fare action');
    assert(html.includes('href="tel:18114294"'),route+' click to national consulting');
    assert(html.includes('href="/reviews/history/?kind='+kind),route+' evidence review link');
    assert(html.includes('southeast-five-locality-seo-20261123')&&html.indexOf('id="regional-direct-answer"')<html.indexOf('id="southeast-five-locality-seo-20261123"'),route+' reader gets direct answer first');
    for(const phrase of item.terms)assert(html.includes(phrase),route+' relevant actual local landmark '+phrase);
    if(kind==='taksong'){
     assert(!/실시간 배차현황|빠른배차/.test(title),route+' no fake live dispatch title');
     assert(html.includes('차량 인수')&&html.includes('주행 가능'),route+' real handover explanation');
    }else{
     assert(title.includes('예약'),route+' driver booking intent');
     assert(!title.includes('후기'),route+' driver not forced review-first');
     assert(html.includes('희망 시각')||html.includes('희망 시간'),route+' driver pickup preference');
    }
    console.log('PASS southeast locality service',route,title,[...desc].length);
   }
  }
  assert.equal(allTitles.size,10);
  assert.equal(allDescriptions.size,10);
 }finally{child.kill('SIGTERM');}
});

test('New editorial contains no invented completed trips, quoted historical fares or separate contact phones',()=>{
 const source=fs.readFileSync(modulePath,'utf8');
 assert(!/제주탁송 전용|1877-5245|100% 배차|기사 상주 보장/.test(source));
 assert(!/\d+[,.]?\d*\s*만원/.test(source),'Never invent or transplant old fare examples');
 assert.equal(targets.length,5);
});

test('Metro and innovation focus: all 60 legal localities and 476 directed service quote links',()=>{
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('const metroLongDistanceFocus=new Map(');
 const end=source.indexOf('function regionalDecisionPanel(',start);
 assert.ok(start>=0&&end>start);
 const vm=require('node:vm');
 const context={esc:x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;'),servicePath:(r,k)=>'/'+k+'/'+r.slug+'/'};
 vm.createContext(context);
 vm.runInContext(source.slice(start,end)+'\nthis.focus=metroLongDistanceFocus;this.render=metroLongDistancePanel;',context);
 const legal=new Set(fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8')).full_names));
 assert.equal(context.focus.size,60);
 let links=0;
 for(const [name,row] of context.focus){
  assert.ok(legal.has(name),name);
  for(const city of row.slice(5))assert.ok(legal.has(city),city);
  for(const kind of ['daeri','taksong']){
   const html=context.render({full_name:name,slug:'test'},kind);
   assert.ok(html.includes('id="metro-innovation-long-distance-20261127"'));
   assert.ok(html.includes(kind==='daeri'?'장거리대리운전':'장거리탁송'));
   assert.ok(html.includes('예약 견적 예시'));
   assert.ok(html.includes('/reviews/history/?kind='+kind));
   const urls=[...html.matchAll(/href="(\/fare\/\?[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr'));
   assert.equal(urls.length,(row.length-5)*2);
   for(const city of row.slice(5)){
    for(const [from,to] of [[name,city],[city,name]])assert.ok(urls.some(u=>u.searchParams.get('service')===kind&&u.searchParams.get('from')===from&&u.searchParams.get('to')===to));
   }
   links+=urls.length;
  }
 }
 assert.equal(links,476);
 assert.equal(context.render({full_name:'unrelated'},'daeri'),'');
});

test('Priority locality directory links all 120 existing service routes and reports missing sitemap ownership without inventing indexing',async()=>{
 const {regionsFromLegal}=await import('../scripts/dynamic-url-inventory.mjs');
 const regionByFullName=new Map(regionsFromLegal(root).map(r=>[r.full_name,r]));
 const owners=JSON.parse(fs.readFileSync(path.join(root,'data/sitemap-url-owners.json'),'utf8'));
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('const metroLongDistanceFocus=new Map('),end=source.indexOf('function regionalDecisionPanel(',start);
 const vm=require('node:vm');
 const context={regionByFullName,servicePath:(r,k)=>'/'+k+'/'+r.path+'/',esc:x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;')};
 vm.createContext(context);
 vm.runInContext(source.slice(start,end)+'\nthis.focus=metroLongDistanceFocus;this.directory=metroLongDistanceDirectory;',context);
 assert.equal(context.focus.size,60);
 const missing=[];
 for(const kind of ['daeri','taksong']){
  const targets=[...context.focus.keys()].map(name=>{
   const r=regionByFullName.get(name);assert.ok(r,name);
   const url=context.servicePath(r,kind);
   if(!owners[url])missing.push({region:name,kind,url});
   return {r,url};
  });
  const extract=html=>[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(extract(context.directory(kind)).sort(),targets.map(x=>x.url).sort());
  for(const province of new Set(targets.map(x=>x.r.province))){
   assert.deepEqual(extract(context.directory(kind,province)).sort(),targets.filter(x=>x.r.province===province).map(x=>x.url).sort());
  }
 }
 assert.ok(source.includes('metroLongDistanceDirectory(kind,r.full_name)'));
 assert.ok(source.includes('+nationalDriverGuide+metroLongDistanceDirectory(kind)+'));
 console.log('PRIORITY_LOCALITY_SITEMAP '+JSON.stringify({total:120,owned:120-missing.length,missing}));
 assert.deepEqual(missing,[],'All priority service routes must have exactly one existing sitemap owner');
});

test('Priority locality review panel preserves older canonical public rides and distinguishes exact endpoints from broader regional guidance',()=>{
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('const metroLongDistanceFocus=new Map('),end=source.indexOf('function regionalDecisionPanel(',start);
 const vm=require('node:vm');
 const parent={full_name:'광주광역시 서구',slug:'parent'};
 const ctx={esc:x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;'),servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',regionByFullName:new Map([[parent.full_name,parent]])};
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end)+'\nthis.render=metroLongDistancePanel;',ctx);
 const area={full_name:'광주광역시 서구 치평동',slug:'local'};
 const record={url:'/reviews/0123456789abcdef/',date:'2026-11-14',departure:'광주 서구 치평동',destination:'전주',fare:'80,000원',origin:true,destinationMatch:false};
 const arrival={...record,url:'/reviews/history/excel-1/',departure:'전주',destination:'광주 서구 치평동',origin:false,destinationMatch:true};
 const html=ctx.render(area,'taksong',[record,record,arrival,{...record,url:'/reviews/history/invalid/',origin:false}]);
 assert.equal((html.match(/href="\/reviews\/0123456789abcdef\/"/g)||[]).length,1);
 assert.ok(html.includes('이 지역 출발')&&html.includes('이 지역 도착'));
 assert.ok(html.includes(arrival.url));
 assert.ok(!html.includes('이 지역의 출발·도착이 확인된 공개 완료 운행기록은 현재'));
 assert.ok(!html.includes('href="/taksong/parent/"'));
 const empty=ctx.render(area,'daeri',[{...record,origin:false,destinationMatch:false},{...record,destination:'지역 비공개'},{...record,url:'https://example.org/reviews/123/'}]);
 assert.ok(empty.includes('현재 이 안내에서 확인되지 않습니다'));
 assert.ok(empty.includes('href="/daeri/parent/"'));
 assert.ok(empty.includes('상위 행정구역 안내이며 이 동·읍·면의 운행 실적을 뜻하지 않습니다'));
 assert.ok(!empty.includes(record.url));
});

test('Legacy public ride backlinks preserve reviewed hubs and add only matching sitemap-owned focus localities',()=>{
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('function ridePriorityRegionLinks(x){'),end=source.indexOf('function tripLine(',start);
 const vm=require('node:vm');
 const original={full_name:'광주광역시',slug:'gwangju'};
 const focus={full_name:'광주광역시 서구 치평동',slug:'chipyeong'};
 const unrelated={full_name:'경기도 광주시',slug:'other'};
 const missing={full_name:'전북특별자치도 익산시 부송동',slug:'busong'};
 const names=[original,focus,unrelated,missing];
 const servicePath=(r,k)=>'/'+k+'/'+r.slug+'/';
 const context={esc:String,seoRegionLabel:r=>r.full_name,servicePath,
  priorityRegionalPages:[{kind:'daeri',region:original.full_name},{kind:'daeri',region:focus.full_name}],
  regionByFullName:new Map(names.map(r=>[r.full_name,r])),
  metroLongDistanceFocus:new Map(names.slice(1).map(r=>[r.full_name,[]])),
  sitemapOwnerByPath:{'/daeri/chipyeong/':'/sitemap-priority.xml','/daeri/other/':'/sitemap-priority.xml'},
  tripMatchesRegion:(ride,r)=>ride.matches.includes(r.full_name)};
 vm.createContext(context);
 vm.runInContext(source.slice(start,end)+'\nthis.render=ridePriorityRegionLinks;',context);
 const result=context.render({service:'daeri',matches:[original.full_name,focus.full_name,missing.full_name]});
 const links=[...result.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(links,['/daeri/chipyeong/','/daeri/gwangju/']);
 assert.equal(context.render({service:'taksong',matches:[focus.full_name]},'taksong'),'');
 assert.equal(context.render({service:'mixed',matches:[focus.full_name]}),'');
});

test('Published case focus backlinks distinguish real source endpoints, preserve existing links, and require sitemap ownership',()=>{
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('function publishedFocusRegionLinks('),end=source.indexOf('function tripLine(',start);
 const vm=require('node:vm');
 const a={full_name:'광주광역시 서구 치평동',slug:'chipyeong'},b={full_name:'전라남도 목포시 옥암동',slug:'okam'},c={full_name:'경기도 광주시',slug:'unrelated'},d={full_name:'전북특별자치도 익산시 부송동',slug:'unowned'};
 const candidates=[a,b,c,d],reviewPath='/reviews/verified/0123456789abcdef/';
 const context={esc:String,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',
  metroLongDistanceFocus:new Map(candidates.map(r=>[r.full_name,[]])),
  regionByFullName:new Map(candidates.map(r=>[r.full_name,r])),
  sitemapOwnerByPath:{[reviewPath]:'/sitemap-published.xml','/taksong/chipyeong/':'/sitemap-priority.xml','/taksong/okam/':'/sitemap-priority.xml','/taksong/unrelated/':'/sitemap-priority.xml'},
  tripMatchesRegion:(ride,r)=>[ride.departure,ride.destination].some(place=>place.split('|').includes(r.full_name))};
 vm.createContext(context);
 vm.runInContext(source.slice(start,end)+'\nthis.render=publishedFocusRegionLinks;',context);
 const ride={path:reviewPath,service:'taksong',departure:a.full_name+'|'+d.full_name,destination:b.full_name};
 const html=context.render(ride);
 assert.deepEqual([...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),['/taksong/chipyeong/','/taksong/okam/']);
 assert.ok(html.includes(a.full_name+' 자동차탁송 출발 지역 안내'));
 assert.ok(html.includes(b.full_name+' 자동차탁송 도착 지역 안내'));
 assert.ok(!context.render(ride,'<a href="https://jeongukdaeri.kr/taksong/chipyeong/">기존</a>').includes('/taksong/chipyeong/'));
 assert.equal(context.render({...ride,path:'/reviews/verified/not-published/'}),'');
 assert.equal(context.render({...ride,service:'mixed'}),'');
 assert.equal(context.render({...ride,departure:'지역 비공개',destination:'지역 비공개'}),'');
 assert.ok(source.includes('publishedFocusRegionLinks(publishedRide,html)'));
});

test('Second evidence-priority batch has 11 exact legal localities, completed source records and both canonical service owners',async()=>{
 const {regionsFromLegal}=await import('../scripts/dynamic-url-inventory.mjs');
 const regions=new Map(regionsFromLegal(root).map(r=>[r.full_name,r]));
 const owners=JSON.parse(fs.readFileSync(path.join(root,'data/sitemap-url-owners.json'),'utf8'));
 const queue=JSON.parse(fs.readFileSync(path.join(root,'data/verified-ride-publication-queue.json'),'utf8'));
 const names=['인천광역시 서해구 연희동','강원특별자치도 양양군 서면','경기도 화성시 만세구 남양읍','경기도 화성시 만세구 향남읍','경기도 용인시 처인구 양지읍','강원특별자치도 고성군 간성읍','경상북도 영덕군 영덕읍','경상북도 안동시 옥동','경기도 화성시 동탄구 방교동','경상북도 안동시 수하동','경상북도 청송군 진보면'];
 for(const name of names){
  const r=regions.get(name);assert.ok(r,name+' exact legal region');
  assert.ok(queue.some(x=>x.verified===true&&x.status==='completed'&&[x.departure,x.destination].includes(name)),name+' exact existing completed source endpoint; not publication proof');
  for(const kind of ['daeri','taksong'])assert.ok(owners['/'+kind+'/'+r.path+'/'],name+' '+kind+' canonical owner');
 }
});

test('Municipal focus discovery links only exact owned descendants and preserves service separation',async()=>{
 const {regionsFromLegal}=await import('../scripts/dynamic-url-inventory.mjs');
 const regionByFullName=new Map(regionsFromLegal(root).map(r=>[r.full_name,r]));
 const owners=JSON.parse(fs.readFileSync(path.join(root,'data/sitemap-url-owners.json'),'utf8'));
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('const metroLongDistanceFocus=new Map('),end=source.indexOf('function regionalDecisionPanel(',start);
 const vm=require('node:vm'),servicePath=(r,k)=>'/'+k+'/'+r.path+'/';
 const ctx={regionByFullName,sitemapOwnerByPath:owners,servicePath,esc:x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;')};
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end)+'\nthis.focus=metroLongDistanceFocus;this.render=municipalFocusDiscovery;',ctx);
 const extract=html=>[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
 let hubs=0,links=0;
 const parents=new Set([...ctx.focus.keys()].flatMap(name=>{
  const parts=name.split(' ');return parts.slice(1,-1).map((_,i)=>parts.slice(0,i+2).join(' '));
 }));
 for(const name of parents){
  const parent=regionByFullName.get(name);
  if(!parent||!['시','군','구'].includes(parent.level))continue;
  for(const kind of ['daeri','taksong']){
   const expected=owners[servicePath(parent,kind)]?[...ctx.focus.keys()].filter(n=>n.startsWith(name+' ')).map(n=>servicePath(regionByFullName.get(n),kind)).filter(url=>owners[url]):[];
   const html=ctx.render(parent,kind);
   assert.deepEqual(extract(html).sort(),[...new Set(expected)].sort(),name+' '+kind);
   if(expected.length){hubs++;links+=expected.length;assert.equal((html.match(/id="municipal-focus-discovery-20261128"/g)||[]).length,1);}
  }
 }
 const andong=regionByFullName.get('경상북도 안동시');
 const html=ctx.render(andong,'taksong');
 assert.ok(html.includes('안동 옥동')&&html.includes('안동 수하동'));
 assert.ok(!html.includes('울산 옥동'));
 assert.equal(ctx.render(andong,'mixed'),'');
 assert.equal(ctx.render(regionByFullName.get('경상북도'),'taksong'),'');
 assert.ok(source.includes(':municipalFocusDiscovery(r,kind))+regionalDecisionPanel'));
 assert.ok(hubs>0&&links>=hubs);
 console.log('MUNICIPAL_FOCUS_DISCOVERY '+JSON.stringify({hubs,links}));
});

test('Regional recovery discovery uses 14 exact owned taksong pages and five existing course canonicals',async()=>{
 const {regionsFromLegal}=await import('../scripts/dynamic-url-inventory.mjs');
 const regionByFullName=new Map(regionsFromLegal(root).map(r=>[r.full_name,r]));
 const owners=JSON.parse(fs.readFileSync(path.join(root,'data/sitemap-url-owners.json'),'utf8'));
 const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=source.indexOf('const routeRecoveryRegionGuides=new Map('),end=source.indexOf('function regionalDecisionPanel(',start);
 const vm=require('node:vm'),servicePath=(r,k)=>'/'+k+'/'+r.path+'/';
 const ctx={sitemapOwnerByPath:owners,servicePath,esc:String};
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end)+'\nthis.guides=routeRecoveryRegionGuides;this.render=routeRecoveryRegionalDiscovery;',ctx);
 assert.equal(ctx.guides.size,14);
 const targets=new Set();
 for(const [name,row] of ctx.guides){
  const r=regionByFullName.get(name);
  assert.ok(r,name);assert.ok(owners[servicePath(r,'taksong')],name+' service owner');
  assert.ok(owners[row[1]],row[1]+' guide owner');
  const html=ctx.render(r,'taksong');
  assert.ok(html.includes('href="'+row[1]+'"')&&html.includes(row[3])&&html.includes('실제 완료 운행이나 고정요금을 뜻하지 않습니다'));
  assert.equal(ctx.render(r,'daeri'),'');
  assert.equal(ctx.render({...r,full_name:name+' 다른 지역'},'taksong'),'');
  targets.add(row[1]);
 }
 assert.equal(targets.size,5);
 assert.ok(source.includes('+routeRecoveryRegionalDiscovery(r,kind)+regionalDecisionPanel'));
 console.log('REGIONAL_ROUTE_RECOVERY_DISCOVERY '+JSON.stringify({regionalPages:14,canonicalGuides:targets.size,links:14}));
});
