'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=require('../data/sokcho-daeri-taksong-20261123.json');
const {create}=require('../lib/sokcho-daeri-taksong-20261123.cjs');
const priority=require('../data/priority-regions.json').pages;
const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(f=>JSON.parse(read('data/legal-regions/'+f)).full_names);
const byFull=new Map();
for(const full of legal){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 byFull.set(full,{name,full_name:full,level,slug:'test-'+(byFull.size+1)});
}
const servicePath=(r,k)=>'/'+k+'/registered-'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const guide=create({regionByFullName:byFull,servicePath,esc});
const city=byFull.get(data.city);
const quote=(kind,from,to)=>'/fare/?service='+kind+'&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
test('13 original Sokcho 2026 legal neighborhoods, two original city routes and eight verified intercity destinations',()=>{
 assert.equal(data.localities.length,13);
 assert.equal(data.intercity.length,8);
 assert.equal(guide.localityCount,13);
 assert.equal(guide.corridorCount,8);
 assert.equal(guide.seoLocalityCount,7);
 assert.equal(guide.canonicalPaths.length,28);
 assert.equal(new Set(guide.canonicalPaths).size,28);
 assert.equal(new Set(data.localities.map(x=>x.from)).size,13);
 for(const row of data.localities){
  assert(byFull.has(row.from),row.from);
  assert(row.from.startsWith(data.city+' '));
  assert(byFull.has(row.to),row.to);
  assert(row.daeri.length>=100&&row.taksong.length>=100);
  for(const kind of ['daeri','taksong'])
   assert(guide.canonicalPaths.includes(servicePath(byFull.get(row.from),kind)));
 }
 for(const k of ['daeri','taksong'])assert(guide.canonicalPaths.includes(servicePath(city,k)));
 for(const c of data.intercity){
  assert(byFull.has(c.to),c.to);
  assert(c.detail.length>80);
 }
 assert.equal(priority.filter(x=>x.region===data.city).length,2);
});
test('Every Sokcho dong has distinct service-specific user advice, regional quote and reverse quote',()=>{
 const htmls=new Set();
 for(const row of data.localities){
  const r=byFull.get(row.from),to=byFull.get(row.to);
  for(const kind of ['daeri','taksong']){
   const html=guide.regionSection(r,kind);
   assert(html.includes('id="sokcho-dong-seo-20261123"'));
   assert(html.includes(row[kind]),row.from+' '+kind+' unique service advice');
   assert(html.includes(quote(kind,row.from,row.to)),row.from+' forward quote');
   assert(html.includes(quote(kind,row.to,row.from)),row.from+' reverse quote');
   assert(html.includes('href="'+servicePath(to,kind)+'"'));
   assert(html.includes('href="'+servicePath(city,kind)+'"'));
   assert(html.includes('1811-4294'));
   assert(html.includes('완료 운행·확정 거리'));
   assert(html.includes(kind==='daeri'?'고객이 자기 차량에 동승':'고객이 동승하지 않고 차량 자체'));
   assert(!htmls.has(html));htmls.add(html);
  }
 }
 assert.equal(htmls.size,26);
 assert.equal(guide.regionSection(byFull.get('강원특별자치도 양양군'),'daeri'),'');
 assert.equal(guide.regionSection(byFull.get('강원특별자치도 고성군'),'taksong'),'');
});
test('Existing official Sokcho district priority title/detail preserved and new service distinction covers region-specific demand',()=>{
 assert.equal(guide.searchMeta(city,'daeri'),null);
 assert.equal(guide.searchMeta(city,'taksong'),null);
 const expected=priority.filter(x=>x.region===data.city);
 for(const item of expected){
  assert(item.topic.includes(item.kind==='daeri'?'대포항':'설악산'));
  const html=guide.regionSection(city,item.kind);
  assert(html.includes('id="sokcho-city-daeri-taksong-20261123"'));
  assert(html.includes('속초시 13개 법정동'));
  assert(html.includes('속초→양양·고성·강릉·인제·원주·서울·성남·인천'));
  assert(html.includes('속초해수욕장')&&html.includes('대포항')&&html.includes('설악동'));
  assert(html.includes(item.kind==='taksong'?'고객이 동승하지 않고 차량 자체':'고객이 자기 차량에 동승'));
  assert(html.includes('설악산 종주'));
  assert(html.includes('1811-4294'));
  for(const c of data.intercity){
   assert(html.includes(quote(item.kind,data.city,c.to)));
   assert(html.includes(quote(item.kind,c.to,data.city)));
  }
  for(const row of data.localities)
   assert(html.includes(servicePath(byFull.get(row.from),item.kind)));
 }
});
test('SEO meta for only seven priority-safe original Sokcho dongs is unique and pure',()=>{
 const expected=new Set(['동명동','조양동','대포동','설악동','청호동','영랑동','노학동']),seen=new Set();
 for(const row of data.localities){
  const r=byFull.get(row.from);
  for(const k of ['daeri','taksong']){
   const meta=guide.searchMeta(r,k);
   if(!expected.has(row.dong)){assert.equal(meta,null);continue;}
   assert(meta.title.includes(row.dong),row.dong);
   assert(meta.description.includes(row.place),row.dong);
   assert(meta.title.length<65&&meta.description.length>=65&&meta.description.length<160);
   assert.deepEqual(meta,guide.searchMeta(r,k));
   assert(!seen.has(meta.title));seen.add(meta.title);
  }
 }
 assert.equal(seen.size,14);
});
test('Targeted search aliases reuse original Sokcho pages without stealing mountain trek or other districts',()=>{
 const cases=[
  ['속초대리운전',city,'daeri'],
  ['속초시대리운전',city,'daeri'],
  ['속초장거리대리운전',city,'daeri'],
  ['속초탁송',city,'taksong'],
  ['속초시탁송',city,'taksong'],
  ['속초자동차탁송',city,'taksong'],
  ['속초장거리탁송',city,'taksong'],
  ['속초서울탁송',city,'taksong'],
  ['속초서울장거리대리운전',city,'daeri'],
  ['속초강릉대리운전',city,'daeri'],
  ['속초인천탁송',city,'taksong'],
  ['대포항대리운전',byFull.get(data.city+' 대포동'),'daeri'],
  ['동명항대리운전',byFull.get(data.city+' 동명동'),'daeri'],
  ['속초해수욕장대리운전',byFull.get(data.city+' 조양동'),'daeri'],
  ['속초설악동탁송',byFull.get(data.city+' 설악동'),'taksong'],
  ['속초대포동장거리대리운전',byFull.get(data.city+' 대포동'),'daeri'],
  ['속초청호동양양 강현면대리운전',byFull.get(data.city+' 청호동'),'daeri'],
  ['조양동자동차탁송',byFull.get(data.city+' 조양동'),'taksong']
 ];
 for(const [keyword,r,k] of cases)
  assert.equal(guide.resolve(keyword),servicePath(r,k),keyword);
 for(const term of ['설악산탁송','오색소공원탁송','한계령소공원탁송','강릉대리운전','고성대리운전','양양대리운전','속초탁송후기','속초기사모집','속초렌트카가격']){
  assert.equal(guide.resolve(term),null,'non-owned intent '+term);
 }
 assert(guide.aliases>=150,'Strong curated district and 13 local service search coverage');
});
test('Relevant national and existing long-distance/Seoraksan pages crosslink without invented mountain fare',()=>{
 const d=read('service/long-distance-daeri/index.html'),t=read('service/long-distance-taksong/index.html'),m=read('special/seoraksan-transport/index.html');
 assert(d.includes('id="sokcho-long-distance-daeri-20261123"'));
 assert(t.includes('id="sokcho-long-distance-taksong-20261123"'));
 assert(m.includes('id="sokcho-seoraksan-distinct-20261123"'));
 for(const c of [d,t,m]){
  assert(c.includes('/daeri/gangwon/sokcho-si/')||c.includes('/taksong/gangwon/sokcho-si/'));
  assert(c.includes('tel:18114294'));
  assert(!c.includes('속초→양양 5만원'));
 }
 assert(m.includes('오색·한계령·백담사'));
 assert(m.includes('7만원')&&m.includes('8만원'),'original trekking fares remain');
 assert(d.includes('/daeri/gangwon/sokcho-si/daepo-dong/'));
 assert(t.includes('/taksong/gangwon/sokcho-si/joyang-dong/'));
 const n=guide.nationalSection('daeri');
 assert(n.includes('id="sokcho-national-service-20261123"'));
 assert(n.includes(servicePath(city,'daeri')));
 assert(guide.nationalSection('taksong').includes('/설악산탁송/'));
});
test('SSR retains prior 2,591 rides, city SEO-priority metadata, national trust and sitemap while adding region guides',()=>{
 const s=read('server.js');
 for(const text of ['sokchoRoutes.regionSection(r,kind)','sokchoRoutes.nationalSection(kind)',
  'sokchoRoutes.resolve(searchIntent)','sokchoRoutes.searchMeta(r,kind)',
  'sokchoSearchMeta?.title','sokchoSearchMeta?.description',
  'regionalReviewBatch300.length!==2591',
  'taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice'])
  assert(s.includes(text),text);
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
 assert(JSON.parse(read('package.json')).scripts['check:seo'].includes('sokcho-daeri-taksong-20261123.test.cjs'));
});
test('Real HTTP indexable original city/locality pages with new guidance, and precise keyword redirects',async()=>{
 const base='http://127.0.0.1:39749';
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39749',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ok=false;
  for(let i=0;i<125;i++){
   if(cp.exitCode!==null)throw Error('server start failed');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ok=true;break}}catch{}
   await new Promise(r=>setTimeout(r,160));
  }
  assert(ok,'Sokcho test Node server unavailable');
  for(const [url,word] of [
   ['/daeri/gangwon/sokcho-si/','속초장거리대리운전'],
   ['/taksong/gangwon/sokcho-si/','속초자동차탁송'],
   ['/daeri/gangwon/sokcho-si/daepo-dong/','속초대포동대리운전'],
   ['/taksong/gangwon/sokcho-si/seolak-dong/','속초설악동탁송'],
   ['/daeri/gangwon/sokcho-si/joyang-dong/','속초조양동대리운전'],
   ['/service/long-distance-daeri/','속초장거리대리운전'],
   ['/service/long-distance-taksong/','속초장거리탁송'],
   ['/special/seoraksan-transport/','속초설악동탁송']
  ]){
   const r=await fetch(base+url,{signal:AbortSignal.timeout(29000)}),h=await r.text();
   assert.equal(r.status,200,url);
   assert(h.includes(word),url+' missing intended Sokcho term '+word);
   const expectedCanonical=url==='/special/seoraksan-transport/'?'https://jeongukdaeri.kr/설악산탁송/':'https://jeongukdaeri.kr'+url;
   assert(h.includes('<link rel="canonical" href="'+expectedCanonical+'"'),url+' lost its original canonical');
   assert(h.includes('1811-4294'));
   assert(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(h));
  }
  for(const [term,dest] of [
   ['속초해수욕장대리운전','/daeri/gangwon/sokcho-si/joyang-dong/'],
   ['속초대포동장거리대리운전','/daeri/gangwon/sokcho-si/daepo-dong/'],
   ['속초서울탁송','/taksong/gangwon/sokcho-si/'],
   ['속초고성장거리대리운전','/daeri/gangwon/sokcho-si/'],
   ['속초설악동탁송','/taksong/gangwon/sokcho-si/seolak-dong/']
  ]){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(term),{redirect:'manual',signal:AbortSignal.timeout(21000)});
   assert.equal(r.status,302,term);
   assert.equal(r.headers.get('location'),dest,term);
  }
 }finally{cp.kill('SIGTERM')}
});
