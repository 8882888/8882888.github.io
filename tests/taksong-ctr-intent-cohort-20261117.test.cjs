'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const seo=JSON.parse(read('data/seo-pages.json')).pages;
const cohort=JSON.parse(read('data/naver-web-ctr-focused-cohort-20261117.json'));
const host='http://127.0.0.1:39884';
const routes=['/taksong/','/service/taksong/'];
const parsedTag=(html,pattern)=>html.match(pattern)?.[1]||null;
test('CTR target cohort has exact owner-provided observations, never fabricated clicks or rankings',()=>{
 assert.equal(cohort.pages.length,3);
 assert.deepEqual(cohort.pages.slice(0,2).map(x=>x.reference.impressions),[308,253]);
 assert.deepEqual(cohort.pages.slice(0,2).map(x=>x.reference.ctrPercent),[1.6,1.6]);
 for(const x of cohort.pages) {
  assert.equal(x.latestOfficial,null,x.url+' should have no invented post-change performance');
  assert.equal(x.averagePosition,null,x.url+' average position unknown');
  assert.deepEqual(x.queryUrlPairs,[],x.url+' query-page linkage unknown');
  assert.equal(x.indexStatus,null,x.url+' indexing still unknown');
 }
 assert.deepEqual(cohort.pages.slice(0,2).map(x=>x.reference.clicks),[null,null]);
 assert.equal(cohort.pages[2].url,'/daeri/gangwon/gangreung-si/');
 assert.equal(cohort.pages[2].reference.reportDate,'2026-11-05');
 assert.equal(cohort.pages[2].reference.clicks,0);
});
test('nationwide transport metadata and distinct service guide explain users actual intent',()=>{
 const national=seo.find(x=>x.path==='/taksong/');
 const detail=read('service/taksong/index.html');
 assert(national);
 assert(/전국\s*자동차탁송/.test(national.title)&&national.title.includes('요금'),'national title preserves nationwide fare intent');
 assert(/실제 운행(?:후기|기록)/.test(national.title), 'keep verified archive intent');
 assert([...national.description].length<=80,'short Naver descriptive metadata');
 assert(national.description.includes('출발지')&&national.description.includes('도착지')&&/실제 운행(?:후기|기록)/.test(national.description),'description ties real rides to route and current quote');
 const staticTitle=parsedTag(detail,/<title>([^<]+)<\/title>/);
 const staticDesc=parsedTag(detail,/<meta name="description" content="([^"]+)"/);
 const staticOg=parsedTag(detail,/<meta property="og:description" content="([^"]+)"/);
 assert(/서비스센터탁송/.test(staticTitle)&&/(?:자동차|차량)탁송/.test(staticTitle)&&/정비센터|입고/.test(staticTitle),'service title should identify service-center delivery intent');
 assert(detail.includes('<h1>서비스센터탁송 · 자동차탁송 예약과 차량 인수·인계</h1>'),'handover remains visible in the service H1');
 assert(staticDesc.length<=80 && staticDesc!==national.description, 'distinct two search snippets');
 assert.equal(staticOg,staticDesc,'static meta and OG parity');
 const section=detail.match(/<section id="service-taksong-handover-intent-20261117"[^>]*>([\s\S]*?)<\/section>/)?.[1];
 assert(section?.length>480,'visible handover explanation');
 assert(detail.indexOf('service-taksong-handover-intent-20261117')<detail.indexOf('service-center-brand-routes-20261102'),'service user intent before brand lists');
 for(const url of ['/taksong/','/fare/?service=taksong','/설악산탁송/','/지리산탁송/','/route-taksong/','/route-taksong/centers/'])assert(section.includes('href="'+url+'"'), 'service guide link '+url);
 for(const phrase of ['주차 위치','인계 가능 시각','요금','견인','따로'])assert(section.includes(phrase));
 const source=read('server.js');
 assert(source.includes("answerFirst=(isT?nationalRideReviewLead('taksong'):'')+answerFirst+taksongIntentChoice+(isT?'':nationalRideReviewLead('daeri'));")&&source.includes("answerFirst+nationwidePlaceIntentLinks(kind)+nationwideEvidenceSection(kind)"),'transport verified rides lead, while designated-driver booking comes first, ahead of regional discovery');
 assert(source.includes('id="national-taksong-intent-choice-20261117"'),'national intent visible');
 assert(source.includes('taksongTrustFirst+nationwideServiceIntentHub(kind)+operationalNotice'),'preserve source-first navigation');
});
test('both canonical pages render short distinct meta titles and practical links with correct HTTP',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39884',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<110;i++){
   if(child.exitCode!==null)throw Error('local service stopped with code '+child.exitCode);
   try{if((await fetch(host+'/health',{signal:AbortSignal.timeout(850)})).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,180));
  }
  assert(ready,'server should start');
  const titles=new Set(),descs=new Set();
  for(const route of routes){
   const response=await fetch(host+route,{redirect:'manual',headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'},signal:AbortSignal.timeout(24000)});
   assert.equal(response.status,200,route+' HTTP 200');
   assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),route+' not blocked in header');
   const html=await response.text(),head=html.split('</head>')[0];
   const title=parsedTag(head,/<title>([^<]+)<\/title>/);
   const desc=parsedTag(head,/<meta name="description" content="([^"]+)"/);
   assert(title&&/(?:자동차|차량)탁송/.test(title),route+' title');
   assert(desc&&[...desc].length<=80,route+' short metadata');
   assert(!titles.has(title)&&!descs.has(desc),'two distinct user intents');
   titles.add(title);descs.add(desc);
   assert(head.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+route+'">'),route+' self canonical');
   assert(!/name="robots" content="noindex/.test(head),route+' noindex meta absent');
   assert.equal((html.match(/<h1\b/g)||[]).length,1,route+' one H1');
   assert(html.includes('href="/fare/?service=taksong"'),route+' exact fare route');
   assert(html.includes('href="tel:18114294"'),route+' phone');
   for(const destination of ['/설악산탁송/','/지리산탁송/','/route-taksong/','/route-taksong/centers/'])assert(html.includes('href="'+destination+'"'),route+' route '+destination);
   if(route==='/taksong/')assert(html.includes('id="national-taksong-intent-choice-20261117"'),'national first purpose');
   else assert(html.includes('id="service-taksong-handover-intent-20261117"'),'service handover first');
  }
  const gang=await fetch(host+'/daeri/gangwon/gangreung-si/',{redirect:'manual',signal:AbortSignal.timeout(18000)});
  assert.equal(gang.status,200,'leave Gangneung page intact, no unverified edits');
 }finally{child.kill()}
});
