'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {create,CITY,FOCUS}=require('../lib/iksan-busong-seo.cjs');
const original=require('../data/iksan-busong-seo-20261122.json');
const docs=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort();
const official=docs.flatMap(x=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',x),'utf8')).full_names);
const byFull=new Map(),regions=[];
for(const full of official){
 const name=full.split(' ').at(-1);
 const level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const r={name,full_name:full,level,slug:'area-'+(regions.length+1)};
 regions.push(r);byFull.set(full,r);
}
const servicePath=(r,k)=>'/'+k+'/test-'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const guide=create({regionByFullName:byFull,servicePath,esc});
test('Iksan and Busong are grounded in official legal regions, not a duplicate manufactured place',()=>{
 assert.equal(docs.length,17);assert.ok(official.length>20000);
 assert.equal(CITY,'전북특별자치도 익산시');assert.equal(FOCUS,'전북특별자치도 익산시 부송동');
 assert.equal(guide.city.full_name,CITY);assert.equal(guide.focus.full_name,FOCUS);
 assert.equal(guide.regions.length,14);assert.equal(guide.regions[0].full_name,FOCUS);
 assert.equal(guide.adjacentCount,4);
 for(const r of guide.regions)assert.ok(official.includes(r.full_name));
 assert.ok(byFull.has(CITY+' 모현동1가')&&byFull.has(CITY+' 모현동2가'));
 assert.ok(!byFull.has(CITY+' 모현동'),'Do not invent a single legal 모현동');
});
test('City and Busong have distinct real customer guidance, existing 14 local links and both services',()=>{
 for(const kind of ['daeri','taksong']){
  const cityHtml=guide.regionSection(guide.city,kind);
  const focusHtml=guide.regionSection(guide.focus,kind);
  assert.ok(cityHtml.length>2500);
  assert.ok(focusHtml.length>1700);
  assert.ok(cityHtml.includes('부송동 생활상권')&&cityHtml.includes('영등동')&&cityHtml.includes('어양동'));
  assert.ok(cityHtml.includes(original.cityGuide[kind][0])&&cityHtml.includes(original.cityGuide[kind][2]));
  assert.ok(focusHtml.includes(original.focusGuide[kind][1]));
  assert.ok(focusHtml.includes(servicePath(guide.city,kind)));
  assert.ok(cityHtml.includes(servicePath(guide.focus,kind)));
  for(const r of guide.regions)assert.ok(cityHtml.includes(servicePath(r,kind)),'Missing genuine locality '+r.full_name);
  assert.ok(cityHtml.includes('1811-4294')&&focusHtml.includes('1811-4294'));
  assert.ok(cityHtml.includes('/fare/?service='+kind));
  assert.ok(!cityHtml.includes('부송동의 완료 운행')&&!cityHtml.includes('기사 상주 보장'));
  const metaCity=guide.searchMeta(guide.city,kind);
  const metaFocus=guide.searchMeta(guide.focus,kind);
  assert.ok(metaCity.title.startsWith('익산')&&metaFocus.title.startsWith('익산부송동'));
  assert.ok(metaCity.title!==metaFocus.title&&metaCity.description!==metaFocus.description);
  assert.ok([...metaCity.description].length<=80&&[...metaFocus.description].length<=80);
  assert.ok(metaCity.title.includes('부송동')&&metaFocus.title.includes('부송동'));
 }
});
test('Existing four adjacent dong pages guide the user back to Busong and Iksan without inventing a verified completed call',()=>{
 for(const n of ['영등동','어양동','팔봉동','신동']){
  const r=byFull.get(CITY+' '+n);
  for(const k of ['daeri','taksong']){
   const html=guide.regionSection(r,k);
   assert.ok(html.includes(n));
   assert.ok(html.includes(servicePath(guide.focus,k)));
   assert.ok(html.includes(servicePath(guide.city,k)));
   assert.ok(html.includes('부송동과'));
   assert.ok(!/완료(했|된|한) 운행/.test(html));
   assert.equal(guide.searchMeta(r,k),null,'Do not overwrite local metadata elsewhere');
  }
 }
 const other=byFull.get('전북특별자치도 군산시');
 assert.equal(guide.regionSection(other,'daeri'),'');
 assert.equal(guide.regionSection(other,'taksong'),'');
 assert.equal(guide.regionSection(guide.city,'golf'),'');
 const province=byFull.get('전북특별자치도');
 assert.ok(guide.regionSection(province,'daeri').includes(servicePath(guide.focus,'daeri')));
 assert.ok(guide.regionSection(province,'taksong').includes(servicePath(guide.city,'taksong')));
});
test('Qualified local commercial intent aliases resolve only to original Iksan / Busong / adjacent canonicals',()=>{
 const city=guide.city,focus=guide.focus;
 const examples=[
  ['익산부송동맛집대리운전',servicePath(focus,'daeri')],
  ['익산시부송동회식대리운전',servicePath(focus,'daeri')],
  ['전북익산부송동장거리대리운전',servicePath(focus,'daeri')],
  ['익산부송동야간대리운전',servicePath(focus,'daeri')],
  ['익산부송동골프장대리운전',servicePath(focus,'daeri')],
  ['익산부송동서비스센터탁송',servicePath(focus,'taksong')],
  ['익산부송동렌트카탁송',servicePath(focus,'taksong')],
  ['익산부송동장거리탁송',servicePath(focus,'taksong')],
  ['익산시영등동호텔대리운전',servicePath(byFull.get(CITY+' 영등동'),'daeri')],
  ['익산어양동맛집대리운전',servicePath(byFull.get(CITY+' 어양동'),'daeri')],
  ['익산시팔봉동야간대리운전',servicePath(byFull.get(CITY+' 팔봉동'),'daeri')],
  ['익산신동정비소탁송',servicePath(byFull.get(CITY+' 신동'),'taksong')],
  ['익산시맛집대리운전',servicePath(city,'daeri')],
  ['전북특별자치도익산시중고차탁송',servicePath(city,'taksong')]
 ];
 for(const [q,target] of examples)assert.equal(guide.resolve(q),target,q);
 for(const q of ['익산부송동대리운전','익산부송동탁송','익산부송동자동차탁송','부송동골프장대리운전','전주부송동맛집대리운전','익산역회식대리운전','군산대리운전','익산모현동1가탁송','부송동장거리탁송','부송동펜션대여'])assert.equal(guide.resolve(q),null,q);
});
test('Server appends Busong source to legal regional HTML and preserves verified rides, sitemap and all nationwide general pages',()=>{
 const s=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.ok(s.includes('iksanBusongSeo.regionSection(r,kind)'));
 assert.ok(s.includes('iksanBusongSeo.searchMeta(r,kind)'));
 assert.ok(s.includes('iksanBusongSeo.resolve(searchIntent)'));
 assert.ok(s.includes('iksan-busong-national-locality-20261122'));
 assert.ok(s.includes('!priorityMeta&&!focus50Info&&!historicalTitleTrip&&!verifiedTitleTrip&&!verifiedDaeriTitleTrip'));
 assert.ok(s.includes('const body=answerFirst+nationwidePlaceIntentLinks(kind)+nationwideEvidenceSection(kind)'));
 assert.equal((fs.readFileSync(path.join(root,'robots.txt'),'utf8').match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(!s.includes('sitemap-iksan')&&!s.includes('noindex,follow"; // Iksan'));
});
test('Real HTTP server renders existing Iksan/Busong canonicals with unique source and qualified keyword redirects',async()=>{
 const port=39941,base='http://127.0.0.1:'+port;
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let t=0;t<100;t++){
   if(cp.exitCode!==null)throw Error('Iksan test server exited '+cp.exitCode);
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(900)})).ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(ready,'Iksan server should start');
  const cityPath='/daeri/jeonbuk/iksan-si/';
  const focusPath='/daeri/jeonbuk/iksan-si/busong-dong/';
  for(const [url,phrase] of [[cityPath,'익산대리운전 | 부송동'],[focusPath,'익산부송동대리운전'],['/taksong/jeonbuk/iksan-si/','익산탁송'],['/taksong/jeonbuk/iksan-si/busong-dong/','익산부송동탁송']]){
   const response=await fetch(base+url,{signal:AbortSignal.timeout(25000)}),html=await response.text();
   assert.equal(response.status,200,url);
   assert.ok(html.includes(phrase),url+' expected local phrase');
   assert.ok(html.includes('익산부송동')||html.includes('부송동 생활상권'));
   assert.ok(html.includes('https://jeongukdaeri.kr'+url),'Canonical original URL must remain');
   assert.ok(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html),'Iksan main pages indexable');
  }
  for(const [q,target] of [['익산부송동맛집대리운전',focusPath],['익산부송동서비스센터탁송','/taksong/jeonbuk/iksan-si/busong-dong/'],['익산어양동맛집대리운전','/daeri/jeonbuk/iksan-si/eoyang-dong/']]){
   const res=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(25000)});
   assert.equal(res.status,302,q);
   assert.equal(res.headers.get('location'),target,q);
  }
 }finally{cp.kill('SIGTERM')}
});
