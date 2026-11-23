'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const source=require('../data/gangnam-ceo-executive-20261123.json');
const previous=require('../data/gangnam-premium-corporate-intents-20261123.json');
const {create}=require('../lib/gangnam-ceo-executive-20261123.cjs');
const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(f=>JSON.parse(read('data/legal-regions/'+f)).full_names);
const names=new Map();
for(const full of legal){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 names.set(full,{full_name:full,name,level,slug:'test-'+(names.size+1)});
}
const servicePath=(r,k)=>'/'+k+'/existing-'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seo=create({regionByFullName:names,servicePath,esc});
const city=names.get(source.district);
test('Eight legally registered Gangnam CEO origination neighborhoods and 23 curated intent variants',()=>{
 assert.equal(seo.localityCount,8);
 assert.equal(seo.metaCount,4);
 assert.deepEqual(source.terms.short.length,11);
 assert.deepEqual(source.terms.day.length,12);
 assert.equal(new Set(source.locations.map(x=>x.region)).size,8);
 for(const row of source.locations){
  assert(names.has(row.region),row.region);
  assert(previous.rows.some(x=>x.region===row.region));
  assert(row.short.length>=70&&row.day.length>=70);
 }
 assert(!source.policy.includes('guarantee of booking'));
 assert(seo.aliases>600,'Exact CEO search navigation should cover legal locality prefixes');
});
test('CEO premium daeri is not generic driver escort or corporate vehicle-only transport',()=>{
 const html=seo.regionSection(city,'daeri');
 for(const x of ['강남CEO대리운전','대표이사대리운전','임원 수행기사','고급대리운전',
  '고객 동승','차량 자체','일일기사','법인카드','월말정산','실제 보험 적용',
  '1811-4294','상담 안내'])
  assert(html.includes(x),x);
 for(const key of ['shortTrip','dayChauffeur','corporateBilling'])
  assert(html.includes(source[key].body),key);
 assert(html.includes('/service/corporate/'));
 assert(html.includes('/service/daily-driver/'));
 assert(!html.includes('운행완료 대표이사'));
 assert.equal(seo.regionSection(city,'taksong'),'');
});
test('Every CEO legal-dong page has actual bespoke short-trip and extended chauffeur schedule copy',()=>{
 const unique=new Set();
 for(const row of source.locations){
  const r=names.get(row.region),html=seo.regionSection(r,'daeri');
  assert(html.includes(row.place));
  assert(html.includes(row.short));
  assert(html.includes(row.day));
  assert(html.includes(row.dong+'CEO대리운전'));
  assert(html.includes(servicePath(city,'daeri')));
  assert(html.includes('/service/corporate/'));
  assert(html.includes('/service/daily-driver/'));
  assert(html.includes(encodeURIComponent(row.region)));
  assert(html.includes('1811-4294'));
  assert(html.includes('실제 운행완료'));
  assert(!unique.has(html));unique.add(html);
 }
 assert.equal(unique.size,8);
 assert.equal(seo.regionSection(names.get('서울특별시 서초구'),'daeri'),'');
 assert.equal(seo.regionSection(names.get('경기도 성남시'),'daeri'),'');
});
test('Four CEO-focused titles are unique, concise and repeatable; source-priority Gangnam title remains intact',()=>{
 const unique=new Set();
 for(const row of source.locations){
  const r=names.get(row.region),meta=seo.searchMeta(r,'daeri');
  if(!['역삼동','삼성동','청담동','압구정동'].includes(row.dong)){
   assert.equal(meta,null);
   continue;
  }
  assert(meta.title.includes('CEO대리운전'));
  assert(meta.description.includes('대표이사'));
  assert(meta.title.length<65&&meta.description.length<160);
  assert.deepEqual(seo.searchMeta(r,'daeri'),meta,'SEO metadata must be pure across multiple crawls');
  assert(!unique.has(meta.title));
  unique.add(meta.title);
 }
 assert.equal(unique.size,4);
 assert.equal(seo.searchMeta(city,'daeri'),null);
 assert.equal(seo.searchMeta(city,'taksong'),null);
});
test('CEO and representative intent redirects resolve exact corporate, daily-driver and legal regional destinations',()=>{
 const cases=[
  ['CEO대리운전','/service/corporate/'],
  ['고급CEO대리운전','/service/corporate/'],
  ['대표이사대리운전','/service/corporate/'],
  ['CEO수행기사','/service/daily-driver/'],
  ['CEO일일기사','/service/daily-driver/'],
  ['대표이사수행기사','/service/daily-driver/'],
  ['강남CEO수행기사','/service/daily-driver/'],
  ['강남대표이사수행운전기사','/service/daily-driver/'],
  ['강남CEO대리운전',servicePath(city,'daeri')],
  ['서울강남CEO대리운전',servicePath(city,'daeri')],
  ['강남고급CEO대리운전',servicePath(city,'daeri')],
  ['강남CEO법인대리운전',servicePath(city,'daeri')],
  ['역삼동CEO대리운전',servicePath(names.get('서울특별시 강남구 역삼동'),'daeri')],
  ['강남청담동CEO의전대리운전',servicePath(names.get('서울특별시 강남구 청담동'),'daeri')],
  ['삼성동대표이사대리운전',servicePath(names.get('서울특별시 강남구 삼성동'),'daeri')],
  ['신사동CEO일일기사',servicePath(names.get('서울특별시 강남구 신사동'),'daeri')]
 ];
 for(const [word,url] of cases)assert.equal(seo.resolve(word),url,word);
 for(const term of ['법인대리운전','강남대리운전','CEO기사모집','서초CEO대리운전','인천대표이사대리운전','전국CEO대리운전','대통령수행기사'])
  assert.equal(seo.resolve(term),null,'Unrelated/general search must remain legacy '+term);
});
test('Static corporate and daily-driver copy preserve original sources and contain distinct CEO service guidance',()=>{
 const c=read('service/corporate/index.html'),d=read('service/daily-driver/index.html');
 assert(c.includes('id="gangnam-ceo-premium-driver-20261123"'));
 assert(d.includes('id="ceo-executive-daily-driver-20261123"'));
 assert(c.includes('CEO·임원 고급 예약 스마트24'));
 assert(c.includes('meta name="description"'));
 assert(c.includes('CEO·대표이사·임원 고급대리운전'));
 assert(d.includes('CEO수행기사·대표이사수행기사·임원일일기사'));
 assert(d.includes('고객의 차량'));
 assert(c.includes('/daeri/seoul/gangnam-gu/'));
 assert(c.includes('/service/daily-driver/#ceo-executive-daily-driver-20261123'));
 assert(d.includes('/service/corporate/#gangnam-ceo-premium-driver-20261123'));
 assert(c.includes('id="gangnam-premium-corporate-driver-20261123"'));
 assert(d.includes('id="daily-driver-keyword-focus"'));
 assert(d.includes('대구 범어동')&&d.includes('뉴코리아CC'),'Original verified ride must be retained');
 for(const html of [c,d])assert(html.includes('1811-4294'));
});
test('SSR keeps original meta priority, national trust first, rides and 8 sitemap declarations',()=>{
 const s=read('server.js');
 for(const x of ['gangnamCEO.regionSection(r,kind)','gangnamCEO.searchMeta(r,kind)',
 'gangnamCEO.nationalSection(kind)','gangnamCEO.resolve(searchIntent)',
 'gangnamFocusedSearchMeta?.title||gangnamCEOSearchMeta?.title||gangnamPremiumSearchMeta?.title',
 'gangnamFocusedSearchMeta?.description||gangnamCEOSearchMeta?.description',
 'regionalReviewBatch300.length!==2591',
 'taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice'])assert(s.includes(x),x);
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
 assert(JSON.parse(read('package.json')).scripts['check:seo'].includes('gangnam-ceo-executive-20261123.test.cjs'));
});
test('Real HTTP pages and CEO client keyword 302 redirects preserve original canonical SEO',async()=>{
 const base='http://127.0.0.1:39741',cp=spawn(process.execPath,['server.js'],{
  cwd:root,env:{...process.env,PORT:'39741',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'
 });
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   if(cp.exitCode!==null)throw Error('Server terminated before tests');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1600)});if(r.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,190));
  }
  assert(ready,'Need local HTTP server for real SEO smoke tests');
  for(const [url,term] of [
   ['/daeri/seoul/gangnam-gu/','강남CEO대리운전'],
   ['/daeri/seoul/gangnam-gu/yeoksam-dong/','역삼동CEO대리운전'],
   ['/daeri/seoul/gangnam-gu/cheongdam-dong/','청담동CEO대리운전'],
   ['/service/corporate/','강남CEO대리운전'],
   ['/service/daily-driver/','CEO수행기사']
  ]){
   const r=await fetch(base+url,{signal:AbortSignal.timeout(28000)});
   const html=await r.text();
   assert.equal(r.status,200,url);
   assert(html.includes(term),url+' missing '+term);
   assert(html.includes('https://jeongukdaeri.kr'+url),url+' canonical mismatch');
   assert(html.includes('1811-4294'));
   assert(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  }
  for(const [q,url] of [
   ['CEO대리운전','/service/corporate/'],
   ['CEO수행기사','/service/daily-driver/'],
   ['강남CEO대리운전','/daeri/seoul/gangnam-gu/'],
   ['역삼동CEO대리운전','/daeri/seoul/gangnam-gu/yeoksam-dong/'],
   ['청담동CEO의전대리운전','/daeri/seoul/gangnam-gu/cheongdam-dong/']
  ]){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(27000)});
   assert.equal(r.status,302,q);
   assert.equal(r.headers.get('location'),url,q);
  }
 }finally{cp.kill('SIGTERM')}
});
