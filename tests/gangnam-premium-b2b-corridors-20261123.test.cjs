'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=require('../data/gangnam-premium-b2b-corridors-20261123.json');
const original=require('../data/gangnam-premium-corporate-intents-20261123.json');
const {create}=require('../lib/gangnam-premium-b2b-intercity.cjs');
const names=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(f=>JSON.parse(read('data/legal-regions/'+f)).full_names);
const regionByFullName=new Map();
for(const full of names){
 const n=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(n)?'리':/읍$/.test(n)?'읍':/면$/.test(n)?'면':/구$/.test(n)?'구':/군$/.test(n)?'군':/시$/.test(n)?'시':'동';
 regionByFullName.set(full,{full_name:full,name:n,level,slug:'source-'+(regionByFullName.size+1)});
}
const servicePath=(r,k)=>'/'+k+'/source-'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guide=create({regionByFullName,servicePath,esc});
const home=regionByFullName.get('서울특별시 강남구');
const target=(name,k)=>servicePath(regionByFullName.get(name),k);
test('2026 source registry proves exactly 14 Gangnam origins and current Yeongjong-gu airport-side locality',()=>{
 assert.equal(source.rows.length,14);
 assert.equal(guide.originCount,14);
 assert.equal(guide.uniqueDestinations,11);
 assert.equal(guide.canonicalOrigins.length,28);
 assert.equal(new Set(guide.canonicalOrigins).size,28);
 assert.deepEqual(new Set(source.rows.map(x=>x.from)),new Set(original.rows.map(x=>x.region)));
 for(const r of source.rows){
  assert(regionByFullName.has(r.from),'legal original '+r.from);
  assert(regionByFullName.has(r.to),'legal arrival '+r.to);
  assert(r.to!==r.from);
  assert(!r.to.startsWith('서울특별시 강남구 '));
  assert(r.taksongContext.length>=72&&r.daeriContext.length>=72);
  for(const k of ['daeri','taksong'])assert(guide.canonicalOrigins.includes(target(r.from,k)));
 }
 assert(source.rows.some(x=>x.to==='인천광역시 영종구 운서동'));
 assert(!names.includes('인천광역시 중구 운서동'),'Obsolete Incheon Jung-gu is not 2026 legal district');
});
test('Every district and legal-dong route page shows meaningful two-way quotes, receiving municipality and no fake guaranteed km',()=>{
 for(const k of ['taksong','daeri']){
  const district=guide.regionSection(home,k);
  assert(district.includes('id="gangnam-corporate-intercity-14-20261123"'));
  assert(district.includes('인천광역시 영종구 운서동'));
  for(const r of source.rows){
   const html=guide.regionSection(regionByFullName.get(r.from),k);
   const encoded=encodeURIComponent(r.from),to=encodeURIComponent(r.to);
   const outward='/fare/?service='+k+'&amp;from='+encoded+'&amp;to='+to;
   const returnTrip='/fare/?service='+k+'&amp;from='+to+'&amp;to='+encoded;
   assert(html.includes('id="gangnam-corporate-intercity-route-20261123"'));
   assert(html.includes(r[k+'Context']),'distinct route rationale '+r.from+' '+k);
   assert(html.includes(r[k+'Intent']),'intent '+r.from+' '+k);
   assert(html.includes(outward),r.from+' departure quote');
   assert(html.includes(returnTrip),r.from+' reverse quote');
   assert(html.includes('href="'+target(r.to,k)+'"'),r.from+' arrival service canonical');
   assert(district.includes('href="'+target(r.from,k)+'"'));
   assert(district.includes(outward));
   assert(html.includes('1811-4294')===false,'Region module should leave primary phone to existing canonical layout');
   assert(html.includes('고정요금')&&html.includes('예약 검색 예시'));
  }
  assert(district.includes('tel:18114294')&&district.includes('월말정산'));
 }
 assert(guide.regionSection(regionByFullName.get('서울특별시 서초구'),'taksong')==='');
 assert(guide.regionSection(regionByFullName.get('경기도 성남시'),'daeri')==='');
});
test('Only curated regional paired search intents redirect to existing legal origination canonicals',()=>{
 const cases=[
  ['역삼동판교법인탁송','서울특별시 강남구 역삼동','taksong'],
  ['강남역삼동판교법인탁송','서울특별시 강남구 역삼동','taksong'],
  ['서울강남역삼동판교법인탁송','서울특별시 강남구 역삼동','taksong'],
  ['강남판교법인탁송','서울특별시 강남구','taksong'],
  ['강남인천공항법인탁송','서울특별시 강남구','taksong'],
  ['삼성동인천공항시승차탁송','서울특별시 강남구 삼성동','taksong'],
  ['삼성동인천공항VIP대리운전','서울특별시 강남구 삼성동','daeri'],
  ['강남인천공항고급대리운전','서울특별시 강남구','daeri'],
  ['강남청담동용인수지수입차탁송','서울특별시 강남구 청담동','taksong'],
  ['압구정동분당시승차탁송','서울특별시 강남구 압구정동','taksong'],
  ['강남일산고급대리운전','서울특별시 강남구','daeri'],
  ['율현동위례법인차량탁송','서울특별시 강남구 율현동','taksong'],
  ['강남판교장거리법인대리운전','서울특별시 강남구','daeri']
 ];
 for(const [q,place,k] of cases)assert.equal(guide.resolveRouteIntent(q),target(place,k),q);
 for(const q of ['서울서초판교법인탁송','인천공항고급대리운전','법인탁송','강남법인탁송','강남고급대리운전','역삼동수원법인탁송','강남서울부산고급대리운전']){
  assert.equal(guide.resolveRouteIntent(q),null,'no overly broad keyword swallowing '+q);
 }
 assert(guide.aliasCount>=115);
});
test('National and business corporate customer hubs expose a navigable qualified route with service-specific enquiries',()=>{
 for(const k of ['taksong','daeri']){
  const national=guide.nationalSection(k);
  assert(national.includes('id="gangnam-corporate-intercity-national-20261123"'));
  for(const start of ['역삼동','삼성동','청담동','수서동']){
   const r=source.rows.find(x=>x.fromLabel===start);
   assert(national.includes(start+'→'+r.destinationLabel));
   assert(national.includes(target(r.from,k)));
  }
  assert(national.includes(target('서울특별시 강남구',k)));
  assert(national.includes('1811-4294'));
 }
 const b=read('business/index.html'),c=read('service/corporate/index.html');
 assert(b.includes('id="gangnam-b2b-intercity-taksong-20261123"'));
 assert(c.includes('id="gangnam-b2b-intercity-daeri-20261123"'));
 assert(b.includes('id="b2b-inquiry"')&&b.includes('href="#b2b-inquiry"'));
 assert(b.includes('/taksong/seoul/gangnam-gu/'));
 assert(c.includes('/daeri/seoul/gangnam-gu/'));
 assert(b.includes('인천광역시 영종구'));
 for(const page of [b,c])assert(page.includes('1811-4294'));
});
test('Existing evidence/metadata order, no sitemap keyword bloat and 2,591 original rides preserved',()=>{
 const server=read('server.js');
 for(const phrase of [
  "gangnamPremiumIntercity.regionSection(r,kind)",
  "gangnamPremiumIntercity.nationalSection(kind)",
  "gangnamPremiumIntercity.resolveRouteIntent(searchIntent)",
  "gangnamPremiumCorporate.regionSection(r,kind)",
  "gangnamYulhyeonSeo.searchMeta(r,kind)",
  "taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice"
 ])assert(server.includes(phrase),'original route wiring '+phrase);
 assert(server.includes("regionalReviewBatch300.length!==2591"));
 assert(!read('robots.txt').includes('gangnam-premium-intercity'));
 const p=JSON.parse(read('package.json'));
 assert(p.scripts['check:seo'].includes('gangnam-premium-b2b-corridors-20261123.test.cjs'));
});
test('Real HTTP shows existing Gangnam legal canonicals and tested source-authored intercity keyword redirects',async()=>{
 const base='http://127.0.0.1:39723';
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39723',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<125;i++){
   if(cp.exitCode!==null)throw Error('Server failed '+cp.exitCode);
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,150));
  }
  assert(ready,'Gangnam B2B route test server cannot start');
  for(const [url,phrase] of [
   ['/taksong/seoul/gangnam-gu/','강남 판교·분당·인천공항'],
   ['/daeri/seoul/gangnam-gu/','강남 판교·분당·인천공항'],
   ['/taksong/seoul/gangnam-gu/samseong-dong/','삼성동→인천공항'],
   ['/daeri/seoul/gangnam-gu/yeoksam-dong/','역삼동→판교']
  ]){
   const r=await fetch(base+url,{signal:AbortSignal.timeout(28000)});
   const html=await r.text();
   assert.equal(r.status,200,url);
   assert(html.includes(phrase),url+' missing exact new local route context');
   assert(html.includes('https://jeongukdaeri.kr'+url),url+' lost original canonical');
   assert(html.includes('1811-4294'));
   assert(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  }
  for(const [q,to] of [
   ['강남판교법인탁송','/taksong/seoul/gangnam-gu/'],
   ['삼성동인천공항시승차탁송','/taksong/seoul/gangnam-gu/samseong-dong/'],
   ['강남인천공항고급대리운전','/daeri/seoul/gangnam-gu/'],
   ['역삼동판교법인탁송','/taksong/seoul/gangnam-gu/yeoksam-dong/']
  ]){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,302,q);
   assert.equal(r.headers.get('location'),to,q);
  }
 }finally{cp.kill('SIGTERM')}
});
