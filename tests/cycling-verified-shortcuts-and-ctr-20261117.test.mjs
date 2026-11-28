import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('existing cycling hub presents real decision links before long table, no new thin URL',()=>{
 const html=read('route-taksong/index.html');
 const head=html.split('</head>')[0],main=html.split('<main>')[1]||html;
 const start=main.indexOf('id="cycling-course-user-shortcuts-20261117"');
 assert(start>=0,'user-facing decision navigation visible');
 assert(start<main.indexOf('<table'),'real cycling help must precede long fare table');
 const nav=main.slice(start,main.indexOf('</nav>',start));
 for(const url of ['/route-taksong/courses/eastcoast/','/route-taksong/courses/yeongsan/','/route-taksong/courses/seomjin/','/route-taksong/centers/','/reviews/history/?kind=taksong','/fare/?service=taksong'])
  assert(nav.includes('href="'+url+'"'),'explicit useful link '+url);
 assert(nav.includes('과거 요금은 현재 확정 견적이 아니며'),'separate historical tariff and live quote');
 assert(nav.includes('차량이 주차된 장소'),'not a bicycle cargo transport claim');
 assert(head.includes('rel="canonical" href="https://jeongukdaeri.kr/route-taksong/"'),'preserve canonical');
 assert(head.includes('전국자전거종주완벽정리'),'do not change high-intent existing title without new official query data');
 assert(!/name="robots" content="noindex/.test(head),'keep indexable');
 assert(html.includes('tel:18114294'),'business contact preserved');
});
test('new scorecard is offline read-only; does not imply Naver login or index growth',()=>{
 const script=read('scripts/compare-naver-web-performance-20261117.mjs');
 assert(!/fetch\s*\(|https\.request\s*\(/.test(script),'local JSON only, no web scraping');
 assert(script.includes('performanceGainVerified:false'),'no unsupported causal ranking claim');
 assert(script.includes('indexedPages:null'),'14 top URLs must not be indexed count');
 assert(script.includes('sourceType'),'owner authenticated source required');
 const meta=JSON.parse(read('data/naver-web-ctr-focused-cohort-20261117.json'));
 assert.equal(meta.report.urlTableDisplayedRows,14);
 assert.equal(meta.report.keywordTableTopLimit,30);
});


test('course fare directory keeps four historical rates and separate forward and reverse quote links',()=>{
 const hub=read('route-taksong/index.html'), detail=read('special/cycling-trail-transport/index.html');
 const table=hub.match(/<table id="cycling-course-fare-directory-20261128"[\s\S]*?<\/table>/)?.[0];
 assert.ok(table);
 const rows=[...table.matchAll(/<tr data-course-fare="\d+">([\s\S]*?)<\/tr>/g)].map(m=>m[1]);
 assert.equal(rows.length,20);
 assert.equal(rows.filter(r=>r.includes('과거 8만~9만원')||r.includes('기존 안내 10만원')).length,4);
 assert.equal(rows.filter(r=>r.includes('<strong>개별 견적</strong>')).length,16);
 for(const row of rows){
  if(row.includes('제주환상')){assert.ok(row.includes('/route-taksong/centers/#course-center-77'));continue;}
  const links=[...row.matchAll(/href="(\/fare\/\?service=taksong[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr').searchParams);
  assert.equal(links.length,2);
  assert.ok(links[0].get('from')&&links[0].get('to'));
  assert.notEqual(links[0].get('from'),links[0].get('to'));
  assert.equal(links[0].get('from'),links[1].get('to'));
  assert.equal(links[0].get('to'),links[1].get('from'));
 }
 for(const name of ['국토종주','아라뱃길','한강','남한강','새재','북한강','낙동강','금강','오천','영산강','섬진강','동해안','제주환상','백두대간'])assert.ok(table.includes(name),name);
 assert.ok(hub.includes('역방향의 동일 금액을 보장하지 않습니다'));
 assert.ok(hub.includes('백두대간은 별도 라이딩 상담 구간'));
 assert.ok(detail.includes('href="/route-taksong/#cycling-visible-fare-table-20261103"'));
 assert.ok(hub.indexOf('id="cycling-visible-fare-table-20261103"')<hub.indexOf('id="priority-cycle-discovery-20261128"'));
});


test('owner supplied full and partial cycling fares remain separate from completed rides and old rates',()=>{
 const hub=read('route-taksong/index.html');
 const east=read('route-taksong/courses/eastcoast/index.html');
 const nak=read('route-taksong/courses/nakdonggang/index.html');
 const yeong=read('route-taksong/courses/yeongsan/index.html');
 const seom=read('route-taksong/courses/seomjin/index.html');
 const detail=read('special/cycling-trail-transport/index.html');
 for(const page of [hub,detail]) {
  assert.ok(page.includes('풀코스 라이딩 약 320km, 자동차탁송 약 17만원'));
  assert.ok(page.includes('낙동강 300km 이상 풀코스 금액은 별도 견적'));
  assert.ok(page.includes('각각 자동차탁송 10만원 안내입니다'));
  assert.ok(page.includes('영산강 133km, 섬진강 149km'));
  assert.ok(!page.includes('라이딩 약 110km'));
 }
 for(const page of [east,nak,yeong,seom]) assert.ok(page.includes('2026년 11월 28일 운영자 안내 기준'));
 assert.ok(east.includes('약 17만원 (라이딩 약 320km)'));
 assert.ok(east.includes('경포대 → 고성 통일전망대</th>')&&east.includes('통일전망대 → 강릉 경포대</th>'));
 assert.ok(east.includes('>8만원</td>')&&east.includes('>10만원</td>'));
 assert.ok(east.includes('기존 경포대→통일전망대 8만~9만원은 과거 안내요금'));
 assert.ok(nak.includes('풀코스 별도 견적'));
 assert.ok(nak.includes('>10만원</td>'));
 assert.ok(yeong.includes('영산강자전거길 양방향 차량회수 탁송 10만원'));
 assert.ok(yeong.includes('<p>133km</p>'));
 assert.ok(seom.includes('섬진강자전거길 양방향 차량회수 탁송 10만원'));
 assert.ok(seom.includes('<p>149km</p>'));
 assert.ok(seom.includes('섬진강댐 출발은 서로 다른 인수 지점'));
 assert.ok(hub.includes('섬진강 생활체육공원 → 배알도'));
});

test('corrected operator rates are explicit in both directions, no starting-price wording',()=>{
 const hub=read('route-taksong/index.html'),detail=read('special/cycling-trail-transport/index.html');
 const pages=[hub,detail,...['eastcoast','nakdonggang','yeongsan','seomjin'].map(x=>read('route-taksong/courses/'+x+'/index.html'))];
 for(const html of pages)assert.ok(!html.includes('10만원부터'));
 assert.ok(hub.includes('정방향 8만원 · 역방향 8만원'));
 assert.ok(hub.includes('정방향 약 17만원 · 역방향 약 17만원'));
 const check=(html,a,b,fee)=>{
  for(const [from,to] of [[a,b],[b,a]]) {
   const row=[...html.matchAll(/<tr><th scope="row"[^>]*>([^<]+)<\/th><td[^>]*>([^<]+)<\/td>/g)].find(m=>m[1]===from+' → '+to);
   assert.ok(row,from+' → '+to);
   assert.equal(row[2],fee);
  }
 };
 check(pages[2],'강릉 경포대','고성 통일전망대','8만원');
 check(pages[2],'울진 은어다리','영덕 해맞이공원','10만원');
 check(pages[3],'안동댐','상주보','10만원');
 check(pages[4],'담양댐','목포 영산강하굿둑','10만원');
 check(pages[5],'임실 섬진강생활체육공원','광양 배알도수변공원','10만원');
});


test('Original colorful course design preserves fare data, 55 real center cards and mobile actions',()=>{
 const directory=read('route-taksong/index.html');
 const block=directory.match(/<section id="smart24-cycle-visual-directory-20261128"[\s\S]*?<\/section>/)?.[0]||'';
 assert.equal((block.match(/class="cycle-rich-card"/g)||[]).length,6);
 const data=JSON.parse(read('data/cycling-certification-centers.json')).centers;
 let total=0;
 for(const [slug,course] of [['seomjin','섬진강'],['yeongsan','영산강'],['eastcoast','동해안'],['nakdonggang','낙동강'],['geumgang','금강'],['ocheon','오천']]){
  const html=read('route-taksong/courses/'+slug+'/index.html');
  assert.ok(block.includes('/route-taksong/courses/'+slug+'/'));
  assert.ok(block.includes('/assets/cycling-routes/'+slug+'-taksong.svg'));
  assert.ok(html.includes('id="smart24-course-menu-20261128"'));
  assert.ok(html.includes('aria-current="page"'));
  for(const i of [2,3,4,6,13])assert.ok(html.includes('href="/route-taksong/#national-cycle-bidirectional-'+i+'"'));
  assert.ok(html.includes('href="/special/cycling-trail-transport/#baekdu-cycling-priority-20261128"'));
  assert.ok(html.includes('class="course-hero-summary"'));
  assert.ok(html.includes('id="smart24-course-handover-20261128"'));
  const section=html.match(/<section id="smart24-course-centers-20261128"[\s\S]*?<\/section>/)?.[0]||'';
  const stops=data.filter(c=>slug==='eastcoast'?c.course.startsWith(course):c.course===course);
  assert.equal((section.match(/class="course-stop"/g)||[]).length,stops.length);
  for(const c of stops){
   assert.ok(section.includes(c.name));
   assert.ok(section.includes('/route-taksong/centers/?from='+c.id));
   assert.ok(section.includes('/route-taksong/centers/?to='+c.id));
  }
  total+=stops.length;
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.ok(html.includes('name="robots" content="index,follow'));
  assert.ok(html.includes('class="cycle-course-mobile-call" href="tel:18114294"'));
  assert.ok(!html.includes('10만원부터'));
 }
 assert.equal(total,55);
});
