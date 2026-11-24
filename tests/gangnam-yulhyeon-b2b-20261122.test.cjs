'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const raw=require('../data/gangnam-yulhyeon-b2b-20261122.json');
const {create,DISTRICT,FOCUS}=require('../lib/gangnam-yulhyeon-b2b-seo.cjs');
const official=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort()
 .flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',f),'utf8')).full_names);
const regions=new Map();
for(const full of official){
 const name=full.split(' ').at(-1),level=full.split(' ').length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 regions.set(full,{name,full_name:full,level,slug:'area-'+(regions.size+1)});
}
const servicePath=(r,k)=>'/'+k+'/legal-'+r.slug+'/';
const esc=s=>String(s).replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
const guide=create({regionByFullName:regions,servicePath,esc});
const district=regions.get(DISTRICT),focus=regions.get(FOCUS),province=regions.get('서울특별시');
test('Original legal Seoul Gangnam and Yulhyeon with 14 registered existing neighborhoods, no synthetic region URLs',()=>{
 assert.equal(DISTRICT,'서울특별시 강남구');
 assert.equal(FOCUS,'서울특별시 강남구 율현동');
 assert.equal(guide.dongs.length,14);
 assert.equal(guide.dongs[0].full_name,FOCUS);
 assert.equal(guide.neighborCount,5);
 for(const r of guide.dongs)assert.ok(official.includes(r.full_name));
 assert.ok(!raw.cityDaeri.join('').includes('배차완료'));
 assert.ok(!raw.cityTaksong.join('').includes('운행완료'));
});
test('Gangnam and Yulhyeon each has distinct valuable daeri and vehicle taksong customer instructions',()=>{
 const titles=new Set(),descs=new Set();
 for(const kind of ['daeri','taksong']){
  const g=guide.regionSection(district,kind),y=guide.regionSection(focus,kind);
  assert.ok(g.length>2300,'Gangnam real customer guide must be substantial');
  assert.ok(y.length>1500,'Yulhyeon service guide must contain substantial original actionable detail');
  assert.ok(y.includes(kind==='daeri'?'율현동 대리운전 배차·예약 체크리스트':'율현동 매매단지·수입차탁송 출고 체크리스트'),'Verify real service-specific checklist rather than padding characters');
  assert.ok(g.includes('후불')&&g.includes('율현동')&&g.includes('기사 접근'));
  assert.ok(y.includes('율현동')&&y.includes('기사'));
  assert.ok(g.includes(raw[kind==='daeri'?'cityDaeri':'cityTaksong'][1]));
  assert.ok(y.includes(raw[kind==='daeri'?'yulhyeonDaeri':'yulhyeonTaksong'][1]));
  assert.ok(g.includes(servicePath(focus,kind)));
  assert.ok(y.includes(servicePath(district,kind)));
  assert.ok(g.includes('1811-4294')&&y.includes('1811-4294'));
  assert.ok(g.includes('실제')&&g.includes('계약'));
  assert.ok(y.includes('<ol>')&&y.includes('장거리'));
  for(const r of guide.dongs)assert.ok(g.includes(servicePath(r,kind)),r.full_name);
  const cityMeta=guide.searchMeta(district,kind),dongMeta=guide.searchMeta(focus,kind);
  for(const m of [cityMeta,dongMeta]){
   assert.ok(m.title.length<65);
   assert.ok([...m.description].length<=85);
   assert.ok(!titles.has(m.title));titles.add(m.title);
   assert.ok(!descs.has(m.description));descs.add(m.description);
  }
  assert.ok(cityMeta.title.includes(kind==='daeri'?'후불':'수입차탁송'));
  assert.ok(dongMeta.title.includes(kind==='daeri'?'율현동대리운전':'율현동매매탁송'));
 }
 assert.equal(titles.size,4);assert.equal(descs.size,4);
});
test('Five distinct nearby Gangnam legal dongs point back to focused Yulhyeon and district source',()=>{
 for(const name of ['수서동','세곡동','자곡동','역삼동','삼성동']){
  const r=regions.get(DISTRICT+' '+name);
  for(const kind of ['daeri','taksong']){
   const html=guide.regionSection(r,kind);
   assert.ok(html.includes(raw.adjacentAreaExamples[name]));
   assert.ok(html.includes(servicePath(district,kind)));
   assert.ok(html.includes(servicePath(focus,kind)));
   assert.equal(guide.searchMeta(r,kind),null);
  }
 }
 for(const kind of ['daeri','taksong']){
  assert.ok(guide.regionSection(province,kind).includes(servicePath(focus,kind)));
  assert.equal(guide.regionSection(regions.get('서울특별시 종로구'),kind),'');
 }
});
test('Commercial longtail intent resolves only real matching canonical regions and preserves plain and unrelated routes',()=>{
 const scenarios=[
  ['강남법인대리운전',servicePath(district,'daeri')],
  ['서울강남구후불대리운전',servicePath(district,'daeri')],
  ['강남월말정산대리운전',servicePath(district,'daeri')],
  ['서울강남기업대리운전',servicePath(district,'daeri')],
  ['강남수입차탁송',servicePath(district,'taksong')],
  ['강남율현동매매탁송',servicePath(focus,'taksong')],
  ['율현동매매탁송',servicePath(focus,'taksong')],
  ['율현동수입차탁송',servicePath(focus,'taksong')],
  ['서울강남구율현동중고차매매단지탁송',servicePath(focus,'taksong')],
  ['강남율현동벤츠탁송',servicePath(focus,'taksong')],
  ['강남율현동bmw탁송',servicePath(focus,'taksong')],
  ['율현동후불대리운전',servicePath(focus,'daeri')],
  ['강남율현동장거리대리운전',servicePath(focus,'daeri')],
  ['강남수서동수입차탁송',servicePath(regions.get(DISTRICT+' 수서동'),'taksong')],
  ['강남역삼동법인대리운전',servicePath(regions.get(DISTRICT+' 역삼동'),'daeri')],
  ['강남삼성동후불대리운전',servicePath(regions.get(DISTRICT+' 삼성동'),'daeri')]
 ];
 for(const [q,url] of scenarios)assert.equal(guide.resolve(q),url,'exact Gangnam intent '+q);
 for(const q of ['강남구대리운전','율현동탁송','강남구탁송','수입차탁송','강남외제차대리운전','전북익산법인대리운전','서울서초후불대리운전','강남콜센터','강남율현동일일기사'])assert.equal(guide.resolve(q),null,'do not hijack canonical/general '+q);
});
test('Original national corporate and used-car hubs visibly link to existing Gangnam / Yulhyeon pages',()=>{
 const used=fs.readFileSync(path.join(root,'business/used-car/index.html'),'utf8');
 const corp=fs.readFileSync(path.join(root,'service/corporate/index.html'),'utf8');
 assert.ok(used.includes('gangnam-yulhyeon-dealer-imported-20261122'));
 assert.ok(used.includes('/taksong/seoul/gangnam-gu/yulhyeon-dong/'));
 assert.ok(used.includes('율현동매매탁송')&&used.includes('수입차'));
 assert.ok(corp.includes('gangnam-corporate-postpay-20261122'));
 assert.ok(corp.includes('/daeri/seoul/gangnam-gu/')&&corp.includes('/daeri/seoul/gangnam-gu/yulhyeon-dong/'));
 assert.ok(corp.includes('강남후불대리운전')&&corp.includes('월말'));
 for(const html of [used,corp])assert.ok(html.includes('1811-4294'));
});
test('Regional SSR and national discovery preserve source-priority order, reviews, and 8 existing robots sitemap declarations',()=>{
 const s=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.ok(s.includes('gangnamYulhyeonSeo.regionSection(r,kind)'));
 assert.ok(s.includes('gangnamYulhyeonSeo.searchMeta(r,kind)'));
 assert.ok(s.includes('gangnamYulhyeonSeo.resolve(searchIntent)'));
 assert.ok(s.includes("const body=answerFirst+nationwidePlaceIntentLinks(kind)+nationwideEvidenceSection(kind)+"),'real original source must lead national service discovery');
 assert.ok(s.includes('gangnam-yulhyeon-national-b2b-20261122'));
 assert.equal((fs.readFileSync(path.join(root,'robots.txt'),'utf8').match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(!s.includes('/sitemap-gangnam-market.xml'));
});
test('Real HTTP renders Gangnam / Yulhyeon unique SEO and returns canonical keyword redirects',async()=>{
 const port=39964,base='http://127.0.0.1:'+port;
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let t=0;t<100;t++){
   if(cp.exitCode!==null)throw Error('Region server exited '+cp.exitCode);
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(900)})).ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,260));
  }
  assert.ok(ready,'Gangnam SEO HTTP server must start');
  for(const [url,phrase] of [
   ['/daeri/seoul/gangnam-gu/','강남대리운전 | 강남역·테헤란로 법인·후불·고급·장거리'],
   ['/taksong/seoul/gangnam-gu/','강남탁송·강남수입차탁송'],
   ['/daeri/seoul/gangnam-gu/yulhyeon-dong/','율현동대리운전'],
   ['/taksong/seoul/gangnam-gu/yulhyeon-dong/','율현동매매탁송']
  ]){
   const resp=await fetch(base+url,{signal:AbortSignal.timeout(25000)});
   const html=await resp.text();
   assert.equal(resp.status,200,url);
   assert.ok(html.includes('<title>'+phrase),url+' missing intended page title');
   assert.ok(html.includes('https://jeongukdaeri.kr'+url),url+' bad canonical');
   assert.ok(html.includes('1811-4294')&&html.includes('율현동'),url+' missing real local context');
   assert.ok(!/<meta[^>]+name="robots"[^>]+content="noindex/i.test(html));
  }
  for(const [q,loc] of [
   ['강남후불대리운전','/daeri/seoul/gangnam-gu/'],
   ['강남율현동법인대리운전','/daeri/seoul/gangnam-gu/yulhyeon-dong/'],
   ['율현동매매탁송','/taksong/seoul/gangnam-gu/yulhyeon-dong/'],
   ['강남수입차탁송','/taksong/seoul/gangnam-gu/']
  ]){
   const resp=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(25000)});
   assert.equal(resp.status,302,q);
   assert.equal(resp.headers.get('location'),loc,q);
  }
 }finally{cp.kill('SIGTERM')}
});
