'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const source=read('server.js');
const reviewed=JSON.parse(read('data/priority-regions.json')).pages;
const baseline=JSON.parse(read('data/naver-searchadvisor-official-baseline.json'));
const base='http://127.0.0.1:39892';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('do not label 14 shown Naver URL top-list rows as official indexed pages',()=>{
 assert.equal(baseline.officialIndexBaseline.indexed,null);
 assert.equal(baseline.officialIndexBaseline.observedAt,null);
 assert.equal(baseline.historicalUnverifiedClaim.countAsOfficialIndexBaseline,false);
 const script=read('scripts/report-naver-official-scorecard.mjs');
 assert(!script.includes('**출처 제한:** 정상 색인 14개'),'old false baseline claim should be absent');
 assert(script.includes('URL TOP 표의 14개 표시 행'),'explicit correction must be documented');
});
test('national city/county/district directory only promotes reviewed guides without deleting URLs',()=>{
 assert(source.includes('const reviewedLocalGuideNames=new Set(priorityRegionalPages'));
 assert(source.includes('&&reviewedLocalGuideNames.has(r.full_name)'));
 assert(source.includes('href="/coverage/"'),'regional coverage remains discoverable');
 assert(source.includes('href="/region/"'),'region navigation remains');
 assert(source.includes("priorityRegionLinks(kind)"),'existing evidence-linked regional navigation remains');
 assert(source.includes('nationwideEvidenceSection(kind)'),'verified historical ride links remain');
 assert(reviewed.length>=59,'source-reviewed region inventory unchanged');
});
test('real local Node server renders two limited national directories with 17 provinces and source-reviewed local links',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:'39892',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ok=false;
  for(let i=0;i<125;i++){
   if(child.exitCode!==null)throw Error('server unexpectedly stopped');
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1500)})).ok){ok=true;break;}}catch{}
   await wait(200);
  }
  assert(ok,'Node server running');
  for(const kind of ['taksong','daeri']){
   const r=await fetch(base+'/'+kind+'/',{headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'},redirect:'manual',signal:AbortSignal.timeout(20000)});
   assert.equal(r.status,200,kind+' hub HTTP');
   assert(!/noindex/i.test(r.headers.get('x-robots-tag')||''),'do not blanket noindex');
   const html=await r.text(),start=html.indexOf('<section id="national-commercial-intents-'+kind+'"'),end=html.indexOf('</section>',start);
   assert(start>=0&&end>start,'visible national regional-hub section '+kind);
   const section=html.slice(start,end+10);
   assert(section.includes('검토된 주요 도시'),kind+' source-reviewed region summary');
   assert(section.includes('href="/coverage/"')&&section.includes('href="/region/"'),kind+' full region search');
   assert(section.includes('href="/fare/?service='+kind+'"'),kind+' fare action');
   assert(section.includes('href="tel:18114294"'),kind+' consultation');
   const localityStart=section.indexOf('<h3>개별 정보가 검토된 주요 지역'),localityEnd=section.indexOf('</ul>',localityStart);
   assert(localityStart>=0&&localityEnd>localityStart,'source-reviewed destinations section');
   // Details contains nested lists: inspect from heading to footer rather than first ul end.
   const beforeFooter=section.slice(localityStart,section.indexOf('<p><a href="/coverage/"',localityStart));
   const localityAnchors=[...beforeFooter.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
   const permitted=new Set(reviewed.filter(x=>x.kind===kind).map(x=>x.region+' '+(kind==='daeri'?'대리운전':'자동차탁송')));
   assert(localityAnchors.length>4 && localityAnchors.length<=59,'bounded reviewed links only: '+kind+' '+localityAnchors.length);
   for(const a of localityAnchors)assert(permitted.has(a[2]),kind+' unreviewed locality leaked: '+a[2]);
   const distinct=new Set(localityAnchors.map(x=>x[1]));
   assert.equal(distinct.size,localityAnchors.length,'duplicate locality link');
   assert(html.includes('id="national-verified-history-links"'),'preserve verified ride links');
   assert(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr/'+kind+'/">'),'preserve canonical');
   assert(html.includes('href="/region/"'),'users still can find all localities');
  }
 }finally{child.kill()}
});
