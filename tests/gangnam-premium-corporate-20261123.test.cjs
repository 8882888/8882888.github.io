'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=require('../data/gangnam-premium-corporate-intents-20261123.json');
const originals=require('../data/gangnam-yulhyeon-b2b-20261122.json');
const {create}=require('../lib/gangnam-premium-corporate-20261123.cjs');
const {create:oldCreate}=require('../lib/gangnam-yulhyeon-b2b-seo.cjs');
const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(file=>JSON.parse(read('data/legal-regions/'+file)).full_names);
const byFull=new Map();
for(const full of legal){
 const name=full.split(' ').at(-1),level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':
 /면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 byFull.set(full,{name,level,full_name:full,slug:'region-'+(byFull.size+1)});
}
const servicePath=(r,kind)=>'/'+kind+'/existing/'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guide=create({regionByFullName:byFull,servicePath,esc});
const previous=oldCreate({regionByFullName:byFull,servicePath,esc});
const district=byFull.get('서울특별시 강남구');
const focus=byFull.get('서울특별시 강남구 율현동');
test('14 independently grounded legal Gangnam dongs and 30 existing original service canonicals',()=>{
 assert.equal(data.rows.length,14);
 assert.equal(guide.sourceCount,14);
 assert.equal(guide.canonicalPaths.length,30);
 assert.equal(new Set(guide.canonicalPaths).size,30);
 assert.deepEqual(new Set(data.rows.map(x=>x.dong)),new Set(originals.relatedDongs));
 for(const row of data.rows){
  assert(byFull.has(row.region));
  assert(row.daeri.length>=65&&row.taksong.length>=65);
  for(const kind of ['daeri','taksong'])
   assert(guide.canonicalPaths.includes(servicePath(byFull.get(row.region),kind)));
 }
 for(const kind of ['daeri','taksong'])assert(guide.canonicalPaths.includes(servicePath(district,kind)));
 for(const full of ['서울특별시 서초구','서울특별시 송파구','경기도 성남시'])assert(byFull.has(full));
});
test('Corporate test drive and import taksong differ explicitly from a conducted demo drive and chartered trip',()=>{
 assert.equal(data.scenarios.length,5);
 assert.equal(data.services.taksong.length,15);
 assert.equal(data.services.daeri.length,13);
 const html=guide.regionSection(district,'taksong');
 for(const term of ['법인탁송','수입차탁송','시승차탁송','시승차량','전시장','차량 자체','반출 승인','보험'])
  assert(html.includes(term),term);
 for(const scenario of data.scenarios.slice(0,3))assert(html.includes(scenario.detail));
 assert(html.includes('/business/used-car/'));
 assert(html.includes('tel:18114294'));
 assert(!html.includes('실제 시승 운행완료'));
});
test('Gangnam premium driver guides distinguish qualified driver and monthly corporate contract from service labels',()=>{
 const html=guide.regionSection(district,'daeri');
 for(const term of ['고급대리운전','법인대리운전','VIP','임원대리운전','후불','월말정산','면허','보험','특정 등급','계약'])
  assert(html.includes(term),term);
 for(const scenario of data.scenarios.slice(3))assert(html.includes(scenario.detail));
 assert(html.includes('/service/corporate/'));
 assert(html.includes('/service/daily-driver/'));
 assert(html.includes('1811-4294'));
});
test('All 14 local pages have distinct sector-specific copy, real reverse corridor links, other-kind safety',()=>{
 const seen=new Set();
 for(const entry of data.rows){
  const region=byFull.get(entry.region);
  for(const kind of ['daeri','taksong']){
   const html=guide.regionSection(region,kind);
   assert(html.includes(entry[kind]),entry.region+' '+kind);
   assert(html.includes('href="'+servicePath(district,kind)+'"'));
   assert(html.includes('service='+kind));
   assert(html.includes(encodeURIComponent(region.full_name)));
   assert(html.includes('역방향 예상요금'));
   assert(html.includes('1811-4294'));
   assert(!seen.has(html));seen.add(html);
   assert(guide.searchMeta(region,kind)!==null||entry.region===focus.full_name);
   assert(html.includes(kind==='daeri'?'고급대리운전':'시승차탁송'));
  }
 }
 assert.equal(seen.size,28);
 assert.equal(guide.regionSection(byFull.get('서울특별시 서초구'),'daeri'),'');
 assert.equal(guide.regionSection(byFull.get('서울특별시 종로구'),'taksong'),'');
});
test('Prioritize previous Gangnam/Yulhyeon metadata; unique concise editorial titles for other 13 dongs',()=>{
 assert.equal(guide.searchMeta(district,'taksong'),null);
 assert.equal(guide.searchMeta(district,'daeri'),null);
 assert.equal(guide.searchMeta(focus,'daeri'),null);
 assert.equal(guide.searchMeta(focus,'taksong'),null);
 const titles=new Set(),descriptions=new Set();
 for(const entry of data.rows)for(const kind of ['daeri','taksong']){
  const region=byFull.get(entry.region),meta=guide.searchMeta(region,kind);
  if(region===focus)continue;
  assert(meta);
  assert(meta.title.length<70&&meta.description.length>=70&&meta.description.length<=160);
  assert(!titles.has(meta.title));assert(!descriptions.has(meta.description));
  titles.add(meta.title);descriptions.add(meta.description);
 }
 assert.equal(titles.size,26);
 assert(previous.searchMeta(district,'daeri').title.includes('후불·고급'));
 assert(previous.searchMeta(district,'taksong').title.includes('법인·시승차'));
 for(const kind of ['daeri','taksong'])
  for(const r of [district,focus]){
   const meta=previous.searchMeta(r,kind);
   assert(meta.title.length<65&&meta.description.length<=85);
  }
});
test('Existing exact legal Gangnam aliases support combinations of corporate, test drive and premium',()=>{
 const expected=[
 ['강남법인탁송',district,'taksong'],
 ['서울강남수입차시승탁송',district,'taksong'],
 ['강남시승차탁송',district,'taksong'],
 ['강남법인차량탁송',district,'taksong'],
 ['강남청담동시승차탁송',byFull.get('서울특별시 강남구 청담동'),'taksong'],
 ['압구정동전시차량탁송',byFull.get('서울특별시 강남구 압구정동'),'taksong'],
 ['강남삼성동법인시승차탁송',byFull.get('서울특별시 강남구 삼성동'),'taksong'],
 ['강남율현동시승차량탁송',focus,'taksong'],
 ['강남고급대리운전',district,'daeri'],
 ['강남VIP대리운전',district,'daeri'],
 ['강남프리미엄대리운전',district,'daeri'],
 ['강남임원의전대리운전',district,'daeri'],
 ['역삼동법인프리미엄대리운전',byFull.get('서울특별시 강남구 역삼동'),'daeri'],
 ['청담동고급대리운전',byFull.get('서울특별시 강남구 청담동'),'daeri'],
 ['강남삼성동기업행사대리운전',byFull.get('서울특별시 강남구 삼성동'),'daeri']
 ];
 for(const [keyword,r,kind] of expected)
  assert.equal(previous.resolve(keyword),servicePath(r,kind),keyword);
 for(const term of ['고급대리운전','서울서초고급대리운전','수입차시승탁송','강남외제차대리운전','강남일일기사','강남대리운전'])
  assert.equal(previous.resolve(term),null,'avoid hijacking generic '+term);
});
test('Original national trust-first and Gangnam premium links in customer source hubs remain intact',()=>{
 const server=read('server.js');
 for(const s of ['gangnamYulhyeonSeo.regionSection(r,kind)','gangnamPremiumCorporate.regionSection(r,kind)',
 'gangnamFocusedSearchMeta?.title||gangnamPremiumSearchMeta?.title',
 'gangnamPremiumCorporate.nationalSection(kind)','gangnamYulhyeonSeo.resolve(searchIntent)',
 "gangnamPremiumCorporate.searchMeta(r,kind)"])
  assert(server.includes(s),s);
 assert(server.includes('taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice'));
 const c=read('service/corporate/index.html'),u=read('business/used-car/index.html');
 assert(c.includes('id="gangnam-premium-corporate-driver-20261123"'));
 assert(u.includes('id="gangnam-imported-testdrive-corporate-20261123"'));
 assert(c.includes('/daeri/seoul/gangnam-gu/cheongdam-dong/'));
 assert(u.includes('/taksong/seoul/gangnam-gu/apgujeong-dong/'));
 assert(c.includes('고급대리운전')&&c.includes('후불')&&u.includes('반출 승인'));
 assert(c.includes('gangnam-corporate-postpay-20261122'));
 assert(u.includes('gangnam-yulhyeon-dealer-imported-20261122'));
 const scripts=JSON.parse(read('package.json')).scripts;
 assert(scripts['check:seo'].includes('gangnam-premium-corporate-20261123.test.cjs'));
 assert(!read('robots.txt').includes('sitemap-gangnam-premium.xml'));
});
test('Live HTTP shows strong Gangnam corporate/import/test-drive/premium pages and exact canonical keyword redirects',async()=>{
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39717',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 const base='http://127.0.0.1:39717';
 try{
  let ok=false;
  for(let t=0;t<100;t++){
   if(cp.exitCode!==null)throw Error('server exit '+cp.exitCode);
   try{const h=await fetch(base+'/health',{signal:AbortSignal.timeout(1400)});if(h.ok){ok=true;break}}catch{}
   await new Promise(r=>setTimeout(r,180));
  }
  assert(ok,'Gangnam premium SEO HTTP server did not start');
  for(const [url,match] of [
   ['/taksong/seoul/gangnam-gu/','강남법인탁송'],
   ['/daeri/seoul/gangnam-gu/','강남고급대리운전'],
   ['/taksong/seoul/gangnam-gu/cheongdam-dong/','시승차탁송'],
   ['/daeri/seoul/gangnam-gu/yeoksam-dong/','고급대리운전']
  ]){
   const r=await fetch(base+url,{signal:AbortSignal.timeout(27000)});
   const html=await r.text();
   assert.equal(r.status,200,url);
   assert(html.includes(match),url+' missing '+match);
   assert(html.includes('https://jeongukdaeri.kr'+url),url+' missing original canonical');
   assert(html.includes('1811-4294'));
   assert(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  }
  for(const [query,canonical] of [
   ['강남수입차시승탁송','/taksong/seoul/gangnam-gu/'],
   ['강남청담동시승차탁송','/taksong/seoul/gangnam-gu/cheongdam-dong/'],
   ['강남프리미엄대리운전','/daeri/seoul/gangnam-gu/'],
   ['역삼동법인프리미엄대리운전','/daeri/seoul/gangnam-gu/yeoksam-dong/']
  ]){
   const res=await fetch(base+'/keyword-search/?q='+encodeURIComponent(query),{redirect:'manual',signal:AbortSignal.timeout(27000)});
   assert.equal(res.status,302,query);
   assert.equal(res.headers.get('location'),canonical,query);
  }
 }finally{cp.kill('SIGTERM')}
});
