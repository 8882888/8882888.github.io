#!/usr/bin/env node
'use strict';
// Smart24 exactly 50 integration checks, run against a locally started Node server.
// These assertions test public HTML, navigation, service identity, actual bytes,
// SEO plumbing and privacy. They DO NOT measure Naver ranking or prove indexing.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=new URL(process.argv[2]||'http://127.0.0.1:3000/');
const saved=new Map(),binary=new Map(),checks=[],results=[];
const timeout=25000;
const href=path=>new URL(path,base);
async function request(route,options={}){
 return fetch(href(route),{signal:AbortSignal.timeout(timeout),...options});
}
async function page(route){
 if(!saved.has(route)){
  const res=await request(route);
  saved.set(route,{res,body:await res.text()});
 }
 return saved.get(route);
}
async function bytes(route){
 if(!binary.has(route)){
  const res=await request(route);
  binary.set(route,{res,body:Buffer.from(await res.arrayBuffer())});
 }
 return binary.get(route);
}
async function json(route){
 const {res,body}=await page(route);
 assert.equal(res.status,200,'API HTTP code');
 assert.match(res.headers.get('content-type')||'',/application\/json/);
 return JSON.parse(body);
}
function check(name,action){checks.push({name,action})}
function has(text,part,message){assert.ok(text.includes(part),message||part)}
function hasAll(text,parts){parts.forEach(p=>has(text,p))}
const home=async()=>(await page('/')).body;
const asset=async(path,type)=>{
 const r=await bytes(path);
 assert.equal(r.res.status,200,path);
 assert.match(r.res.headers.get('content-type')||'',new RegExp(type));
 assert.ok(r.body.length>80,'nonempty image '+path);
 return r;
};
const card=async(query,service)=>{
 const params=new URLSearchParams({q:query});
 if(service)params.set('service',service);
 return json('/api/region-card-preview?'+params);
};
// A — hosting and search-engine entrypoints
check('01 Homepage HTTP 200 and HTML',async()=>{const {res,body}=await page('/');assert.equal(res.status,200);has(body,'<html')});
check('02 Homepage canonical primary domain',async()=>{has(await home(),'<link rel="canonical" href="https://jeongukdaeri.kr/">')});
check('03 Homepage nonempty SEO title',async()=>{assert.match(await home(),/<title>[^<]*자동차탁송[^<]*대리운전[^<]*<\/title>/)});
check('04 Homepage description',async()=>{assert.match(await home(),/<meta name="description" content="[^"]{40,}"/)});
check('05 Homepage robots not blocked',async()=>{const head=(await home()).split('</head>')[0];assert.doesNotMatch(head,/<meta[^>]*name="robots"[^>]*noindex/i)});
check('06 Robots public HTTP 200',async()=>{const r=await page('/robots.txt');assert.equal(r.res.status,200);has(r.body,'User-agent:')});
check('07 Robots includes priority sitemap',async()=>{has((await page('/robots.txt')).body,'Sitemap: https://jeongukdaeri.kr/sitemap-priority.xml')});
check('08 Priority sitemap valid XML URL set',async()=>{const r=await page('/sitemap-priority.xml');assert.equal(r.res.status,200);has(r.body,'<urlset')});
check('09 Taksong sitemap points to service',async()=>{has((await page('/sitemap-taksong.xml')).body,'/taksong/')});
check('10 Daeri sitemap points to service',async()=>{has((await page('/sitemap-daeri.xml')).body,'/daeri/')});
// B — mobile user experience and customer conversion
check('11 Core nav has five functional destinations',async()=>{
 const h=await home(),nav=h.match(/<nav class="top-nav"[\s\S]*?<\/nav>/);
 assert.ok(nav,'core nav exists');
 const links=[...nav[0].matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(links,['/daeri/','/taksong/','/service/corporate/','/service/golf/','https://open.kakao.com/o/sGV88r7h']);
});
check('12 Mountain and southeast shortcuts preserved',async()=>{const h=await home();hasAll(h,['id="priority-region-shortcuts-20261103"','/설악산탁송/','/지리산탁송/','/taksong/busan/','/taksong/daegu/','/taksong/ulsan/','/taksong/gyeongnam/changwon-si/'])});
check('13 Mobile viewport declaration',async()=>{assert.match(await home(),/<meta name="viewport" content="width=device-width[^"]*"/)});
check('14 Mobile two-column core menu CSS',async()=>{has(await home(),'.top-nav>.top-nav-inner{grid-template-columns:repeat(2,minmax(0,1fr))!important}')});
check('15 Representative call link is dialable',async()=>{has(await home(),'href="tel:18114294"')});
check('16 Kakao open chat link retains security attrs',async()=>{const h=await home();assert.match(h,/<a[^>]*href="https:\/\/open.kakao.com\/o\/sGV88r7h"[^>]*rel="noopener noreferrer"/)});
check('17 Quote lookup preserves all three inputs',async()=>{const h=await home(),start=h.indexOf('id="homepage-fare-top"');assert.ok(start>0);const form=h.slice(start,start+2200);hasAll(form,['name="from"','name="to"','name="service"'])});
check('18 Homepage card search is an actual form',async()=>{hasAll(await home(),['id="dynamic-service-card-search-20261103"','data-card-preview-form','data-card-preview-output'])});
check('19 Responsive card stylesheet served',async()=>{const r=await page('/assets/region-card-preview.css');assert.equal(r.res.status,200);has(r.body,'.smart24-card-grid')});
check('20 Card interaction script served',async()=>{const r=await page('/assets/region-card-preview.js');assert.equal(r.res.status,200);hasAll(r.body,['openZoom','previewImage','AbortController'])});
// C — product/service navigation and locality semantics
check('21 Daeri hub HTTP 200 and service heading',async()=>{const r=await page('/daeri/');assert.equal(r.res.status,200);has(r.body,'대리운전')});
check('22 Taksong hub HTTP 200 and service heading',async()=>{const r=await page('/taksong/');assert.equal(r.res.status,200);has(r.body,'탁송')});
check('23 Corporate service hub HTTP 200',async()=>{assert.equal((await page('/service/corporate/')).res.status,200)});
check('24 Golf driving service hub HTTP 200',async()=>{assert.equal((await page('/service/golf/')).res.status,200)});
check('25 Region directory accessible',async()=>{const r=await page('/region/');assert.equal(r.res.status,200);has(r.body,'지역')});
check('26 Exact Busan daeri search expands regional card',async()=>{has((await page('/region/?q='+encodeURIComponent('부산대리운전'))).body,'class="dynamic-region-card-preview" open')});
check('27 Typed Busan daeri keyword chooses driver',async()=>{const r=await card('부산대리운전');assert.equal(r.status,'matched');assert.deepEqual(r.cards.map(x=>x.kind),['daeri'])});
check('28 Typed Ulsan taksong keyword chooses taksong',async()=>{const r=await card('울산탁송');assert.equal(r.status,'matched');assert.equal(r.region,'울산광역시');assert.deepEqual(r.cards.map(x=>x.kind),['taksong'])});
check('29 Ambiguous Gwangju never silently chooses',async()=>{const r=await card('광주');assert.equal(r.status,'ambiguous');assert.equal(r.cards.length,0)});
check('30 Jeju taksong dedicated consultation preserved',async()=>{const r=await card('제주도탁송');assert.equal(r.cards[0].phone,'1877-5245')});
// D — generated image correctness, delivery and caching
check('31 Busan driver PNG is genuine PNG',async()=>{const r=await card('부산대리운전');const p=await asset(r.cards[0].image,'image/png');assert.equal(p.body.subarray(0,8).toString('hex'),'89504e470d0a1a0a')});
check('32 Ulsan taksong PNG is genuine PNG',async()=>{const r=await card('울산탁송');const p=await asset(r.cards[0].image,'image/png');assert.equal(p.body.subarray(0,8).toString('hex'),'89504e470d0a1a0a')});
check('33 Busan driver optimized WebP delivered',async()=>{const r=await card('부산대리운전');const p=await asset(r.cards[0].previewImage,'image/webp');assert.equal(p.body.toString('ascii',8,12),'WEBP')});
check('34 Ulsan taksong optimized WebP delivered',async()=>{const r=await card('울산탁송');const p=await asset(r.cards[0].previewImage,'image/webp');assert.equal(p.body.toString('ascii',8,12),'WEBP')});
check('35 Optimized WebP smaller than crawler PNG',async()=>{const r=await card('울산탁송'),v=r.cards[0];const p=await bytes(v.image),w=await bytes(v.previewImage);assert.ok(w.body.length<p.body.length,'responsive WebP size should be smaller')});
check('36 Optimized WebP has ETag',async()=>{const r=await card('울산탁송');const p=await bytes(r.cards[0].previewImage);assert.ok(p.res.headers.get('etag'))});
check('37 Conditional image cache responds 304',async()=>{const r=await card('울산탁송'),p=await bytes(r.cards[0].previewImage);const c=await request(r.cards[0].previewImage,{headers:{'if-none-match':p.res.headers.get('etag')}});assert.equal(c.status,304)});
check('38 Driver and taksong cards have separate image URLs',async()=>{const r=await card('부산');assert.deepEqual(r.cards.map(x=>x.kind),['daeri','taksong']);assert.notEqual(r.cards[0].image,r.cards[1].image)});
check('39 Seoraksan original fare PNG available',async()=>{await asset('/assets/seoraksan-taksong-original-fare.png','image/png')});
check('40 Jirisan original fare PNG available',async()=>{await asset('/assets/jirisan-taksong-original-fare.png','image/png')});
// E — fare integrity, authentic review evidence and tracking privacy
check('41 Seoraksan six legacy price routes preserved',async()=>{const r=await page('/설악산탁송/');assert.equal(r.res.status,200);hasAll(r.body,['mountain-route-fare-table-202611','오색','한계령','백담사','남교리','7만원','8만원'])});
check('42 Jirisan six legacy price routes preserved',async()=>{const r=await page('/지리산탁송/');assert.equal(r.res.status,200);hasAll(r.body,['mountain-route-fare-table-202611','성삼재','중산리','대원사','화엄사','12만원','10만원'])});
check('43 Cycling historical fares and anchor preserved',async()=>{const r=await page('/special/cycling-trail-transport/');assert.equal(r.res.status,200);hasAll(r.body,['cycling-route-fare-table-202611','경포대','통일전망대','영산강','섬진강','금강','오천'])});
check('44 Current fares explicitly not guaranteed',async()=>{const h=(await page('/special/cycling-trail-transport/')).body;assert.ok(h.includes('현재 확정 견적이 아닙니다')||h.includes('현재 확정견적이 아닙니다'))});
check('45 Completed rides explicitly separated from Naver posts',async()=>{const r=await page('/reviews/history/');assert.equal(r.res.status,200);hasAll(r.body,['history-original-distinction','네이버 블로그 공개 원문 자료실'])});
check('46 Naver blog archive directory works',async()=>{const r=await page('/blog/');assert.equal(r.res.status,200);has(r.body,'네이버 블로그')});
check('47 Taksong historical reviews filter works',async()=>{const r=await page('/reviews/history/?kind=taksong');assert.equal(r.res.status,200);has(r.body,'자동차탁송')});
check('48 Daeri historical reviews filter works',async()=>{const r=await page('/reviews/history/?kind=daeri');assert.equal(r.res.status,200);has(r.body,'대리운전')});
check('49 Homepage counters labelled, not called search impressions',async()=>{const h=await home();hasAll(h,['오늘 접속','누적 기록','누적 전화클릭','네이버 검색'])});
check('50 Public rides API excludes precise departure times',async()=>{const data=await json('/api/public-rides');assert.ok(Array.isArray(data));assert.ok(data.every(r=>!('time' in r)&&!('departure_time' in r)))});
async function main(){
 assert.equal(checks.length,50,'Exactly 50 independent checks');
 for(const {name,action} of checks){
  try{await action();results.push({name,passed:true});console.log('PASS '+name)}
  catch(error){results.push({name,passed:false,error:String(error?.message||error)});console.error('FAIL '+name+': '+String(error?.message||error))}
 }
 const passed=results.filter(r=>r.passed).length;
 console.log('SMART24_50_AUDIT '+passed+'/50 passed; failed '+(50-passed));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['## Smart24 site 50-point pre-deploy audit','','| # | Check | Result |','|---:|---|---|'];
  results.forEach((r,i)=>lines.push('| '+(i+1)+' | '+r.name.replace(/^\d+ /,'')+' | '+(r.passed?'PASS':'FAIL: '+r.error.replaceAll('|','/'))+' |'));
  lines.push('', '**Passed '+passed+'/50**','');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
 if(passed!==50)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
