'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=require('../data/exporter-b2b-sales-20261123.json');
const {create,PORT}=require('../lib/exporter-b2b-sales-20261123.cjs');
const actual=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(file=>JSON.parse(read('data/legal-regions/'+file)).full_names);
const regions=new Map();
for(const full of actual){
 const n=full.split(' ').at(-1),level=full.split(' ').length===1?'시도':/리$/.test(n)?'리':/읍$/.test(n)?'읍':/면$/.test(n)?'면':/구$/.test(n)?'구':/군$/.test(n)?'군':/시$/.test(n)?'시':'동';
 regions.set(full,{full_name:full,name:n,level,slug:'verified-'+(regions.size+1)});
}
const servicePath=(r,kind)=>'/'+kind+'/original-'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seo=create({regionByFullName:regions,servicePath,esc});
const quote=(a,b)=>'/fare/?service=taksong&amp;from='+encodeURIComponent(a)+'&amp;to='+encodeURIComponent(b);
test('Exactly 10 source-backed commercial exporter origination municipalities and 2 lawful destination localities',()=>{
 assert.equal(data.version,1);
 assert.equal(data.routes.length,10);
 assert.equal(data.intentAliases.length,18);
 assert.equal(seo.originCount,10);
 assert.equal(seo.destinationCount,2);
 assert.equal(seo.canonicalPaths.length,12);
 assert.equal(new Set(seo.canonicalPaths).size,12);
 assert.equal(seo.keywordAliases,58);
 assert.equal(new Set(data.routes.map(x=>x.from)).size,10);
 for(const row of data.routes){
  assert(regions.has(row.from),'registered origin '+row.from);
  assert(regions.has(row.to),'registered destination '+row.to);
  assert(row.body.length>=100);
  assert(row.focus&&row.fromLabel);
  for(const place of [row.from,row.to])assert(seo.canonicalPaths.includes(servicePath(regions.get(place),'taksong')));
 }
 assert.deepEqual(new Set(data.routes.map(x=>x.to)),new Set(['인천광역시 연수구 옥련동','경기도 평택시 포승읍']));
});
test('Commercial exporter source pages give differentiated instructions, two-way quote and destination canonical',()=>{
 const seen=new Set();
 for(const r of data.routes){
  const output=seo.regionSection(regions.get(r.from),'taksong');
  assert(output.includes('id="exporter-b2b-origin-20261123"'));
  assert(output.includes(r.body));
  assert(output.includes(r.focus));
  assert(output.includes(quote(r.from,r.to)),r.from+' forward quote');
  assert(output.includes(quote(r.to,r.from)),r.from+' reverse quote');
  assert(output.includes('href="'+servicePath(regions.get(r.to),'taksong')+'"'));
  assert(output.includes('href="/business/export-port/"'));
  assert(output.includes('1811-4294'));
  assert(output.includes('실제 완료 운행'));
  assert(output.includes('통관·선적·컨테이너'));
  assert(!seen.has(output),'unique local copy');
  seen.add(output);
 }
 assert.equal(seen.size,10);
 assert.equal(seo.regionSection(regions.get('서울특별시 서초구'),'taksong'),'');
 assert.equal(seo.regionSection(regions.get('경기도 안성시'),'daeri'),'');
});
test('Incoming legal export handover locality pages distinguish Ongnyeon yard and Poseung port from customs access',()=>{
 for(const dest of ['인천광역시 연수구 옥련동','경기도 평택시 포승읍']){
  const html=seo.regionSection(regions.get(dest),'taksong');
  assert(html.includes('id="exporter-b2b-destination-20261123"'));
  assert(html.includes('수출차량탁송'));
  assert(html.includes('수출업체·무역업체'));
  assert(html.includes('/business/export-port/'));
  assert(html.includes('tel:18114294'));
  for(const origin of data.routes.filter(x=>x.to===dest))
   assert(html.includes(quote(origin.from,origin.to)),origin.from+' missing incoming quote');
  if(dest.includes('포승읍'))assert(html.includes('항만 보안구역'));
  else assert(html.includes('송도유원지'));
 }
});
test('Naver-focused exact export and auction/yard keyword queries reuse existing canonical landing or city URLs',()=>{
 const cases=[
  ['중고차수출업체탁송',PORT],
  ['중고차수출업체차량탁송',PORT],
  ['수출차량회송',PORT],
  ['송도수출단지탁송',PORT],
  ['평택항수출차량탁송',PORT],
  ['경매장수출단지탁송',PORT],
  ['수출차량탁송견적',PORT],
  ['오산중고차수출업체탁송',servicePath(regions.get('경기도 오산시'),'taksong')],
  ['오산송도수출단지탁송',servicePath(regions.get('경기도 오산시'),'taksong')],
  ['안성수출차량탁송',servicePath(regions.get('경기도 안성시'),'taksong')],
  ['아산평택항탁송',servicePath(regions.get('충청남도 아산시'),'taksong')],
  ['평택평택항수출차량탁송',servicePath(regions.get('경기도 평택시'),'taksong')],
  ['강남송도수출단지탁송',servicePath(regions.get('서울특별시 강남구'),'taksong')]
 ];
 for(const [phrase,url] of cases)assert.equal(seo.resolve(phrase),url,phrase);
 for(const q of ['중고차수출업체','중고차수출판매가격','중고차수출고가매입','중고차수출사기','서초수출차량탁송','수출자동차해상운임','평택항통관대행']){
  assert.equal(seo.resolve(q),null,'do not hijack unrelated buy/export services '+q);
 }
});
test('Export-focused webpage SEO and JSON-LD match human readable verified service content without changing canonical',()=>{
 const page=read('business/export-port/index.html');
 const headline='중고차수출단지탁송 | 송도·경매장 출고·수출업체 반입';
 assert(page.includes('<title>'+headline+'</title>'));
 assert(page.includes('property="og:title" content="'+headline+'"'));
 assert(page.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/export-port/"'));
 assert(page.includes('name="robots" content="index,follow"'));
 assert(page.includes('<h1>중고차수출단지탁송'));
 assert(page.includes('중고차수출업체탁송 | 수출·무역업체 대표'));// Existing B2B commercial audience stays visible.
 assert(page.includes('name="description" content="중고차수출단지탁송·수출업체탁송'));
 assert(page.includes('id="exporter-ceo-b2b-sales-20261123"'));
 assert(page.includes('href="/business/#export"'));
 assert(page.includes('수출업체 대표·CEO, 매입팀·물류팀·차량관리 담당자'));
 assert(page.includes('말소·무번호판·주행불가'));
 assert(page.includes('선박 선적'));
 for(const row of data.routes){
  assert(page.includes(quote(row.from,row.to)));
  assert(page.includes(quote(row.to,row.from)));
  assert(page.includes(row.body));
 }
 const match=page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(match,'Original JSON-LD script');
 const graph=JSON.parse(match[1])['@graph'];
 assert(graph.some(o=>o['@type']==='WebPage'&&o.name===headline));
 assert(graph.some(o=>o['@type']==='BreadcrumbList'&&o.itemListElement[2].name===headline));
 const service=graph.find(o=>o['@type']==='Service');
 assert(service&&service.provider.telephone==='1811-4294');
 assert(!('offers' in service),'do not infer a price or fixed contract');
 assert.equal((page.match(/<h1>/g)||[]).length,1);
});
test('Source-backed commercial sales and lead enquiry form complete service-specific customer pathway',()=>{
 const b=read('business/index.html'),used=read('business/used-car/index.html'),auction=read('business/auction/index.html');
 const national=seo.nationalSection('taksong');
 assert(national.includes('id="exporter-b2b-national-20261123"'));
 assert(national.includes('중고차수출업체탁송'));
 assert(national.includes('/business/#export'));
 assert(!seo.nationalSection('daeri'));
 assert(b.includes('id="exporter-merchant-sales-funnel-20261123"'));
 assert(b.includes('id="export"'));
 assert(b.includes("label: '중고차 수출업체·매입차탁송'"));
 assert(b.includes('말소·무번호판·고장차량'));
 assert(b.includes('회사')||b.includes('업체명'));
 assert(b.includes("if (Object.hasOwn(profiles, key)) filterBy(key)"),'direct hash loads export intake');
 for(const h of [b,used,auction]){
  assert(h.includes('href="/business/#export"'));
  assert(h.includes('href="tel:18114294"'));
 }
 assert(used.includes('id="used-car-exporter-b2b-20261123"'));
 assert(auction.includes('id="auction-to-exporter-b2b-20261123"'));
 assert(!read('robots.txt').includes('export-b2b-fake-url'));
});
test('SSR retains original 2,591 rides, priority topic metadata, region and trust-first content hierarchy',()=>{
 const s=read('server.js');
 for(const term of ['exporterB2BSales.regionSection(r,kind)','exporterB2BSales.nationalSection(kind)',
  'exporterB2BSales.resolve(searchIntent)','regionalReviewBatch300.length!==2591',
  'taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice',
  'gangnamCEO.regionSection(r,kind)','gangnamPremiumIntercity.regionSection(r,kind)'])
  assert(s.includes(term),term);
 assert(JSON.parse(read('package.json')).scripts['check:seo'].includes('exporter-b2b-sales-20261123.test.cjs'));
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
});
test('Real HTTP 200 original business and export origin pages, 302 only grounded export-client keywords',async()=>{
 const base='http://127.0.0.1:39747',cp=spawn(process.execPath,['server.js'],{
  cwd:root,env:{...process.env,PORT:'39747',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'
 });
 try{
  let ready=false;
  for(let t=0;t<120;t++){
   if(cp.exitCode!==null)throw Error('Server exited before smoke test');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1600)});if(r.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,190));
  }
  assert(ready,'Original HTTP server missing');
  for(const [url,term] of [
   ['/business/export-port/','중고차수출업체탁송'],
   ['/business/','중고차수출업체탁송·무역업체 매입차 입고'],
   ['/business/used-car/','수출업체·무역업체 매입차량'],
   ['/business/auction/','수출업체 낙찰차량 출고'],
   ['/taksong/gyeonggi/osan-si/','오산중고차수출업체탁송'],
   ['/taksong/gyeonggi/anseong-si/','안성중고차수출업체탁송']
  ]){
   const r=await fetch(base+url,{signal:AbortSignal.timeout(30000)});
   const html=await r.text();
   assert.equal(r.status,200,url);
   assert(html.includes(term),url+' missing '+term);
   assert(html.includes('https://jeongukdaeri.kr'+url),url+' original canonical mismatch');
   assert(html.includes('1811-4294'));
   assert(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  }
  for(const [keyword,redirect] of [
   ['중고차수출업체탁송','/business/export-port/'],
   ['송도수출단지탁송','/business/export-port/'],
   ['오산송도수출단지탁송','/taksong/gyeonggi/osan-si/'],
   ['안성중고차수출업체탁송','/taksong/gyeonggi/anseong-si/']
  ]){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(keyword),{redirect:'manual',signal:AbortSignal.timeout(25000)});
   assert.equal(r.status,302,keyword);
   assert.equal(r.headers.get('location'),redirect,keyword);
  }
 }finally{cp.kill('SIGTERM')}
});
