'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('service/long-distance-daeri/index.html');
const seo=JSON.parse(read('data/seo-pages.json')).pages.find(p=>p.path==='/service/long-distance-daeri/');
const server=read('server.js');
const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
test('One national intercity driving canonical has exactly the same static/runtime and OG SEO metadata',()=>{
 assert.equal(title,'전국 장거리대리운전 | 시외·심야 편도예약·요금조회');
 assert.equal(seo.title,title);
 assert.equal(seo.description,desc);
 assert.ok([...desc].length>55&&[...desc].length<=80,'shared Naver SEO head guard');
 assert.equal(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1],title);
 assert.equal(html.match(/<meta property="og:description" content="([^"]+)"/)?.[1],desc);
 const url='https://jeongukdaeri.kr/service/long-distance-daeri/';
 assert.ok(html.includes('<link rel="canonical" href="'+url+'"'));
 assert.ok(html.includes('<meta property="og:url" content="'+url+'"'));
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 const page=schema.find(x=>x['@type']==='WebPage');
 const crumbs=schema.find(x=>x['@type']==='BreadcrumbList');
 const service=schema.find(x=>x['@type']==='Service');
 assert.equal(page.url,url);
 assert.equal(page.name,title);assert.equal(page.description,desc);
 assert.equal(crumbs.itemListElement.at(-1).name,title);
 assert.equal(crumbs.itemListElement.at(-1).item,url);
 assert.equal(service.provider.telephone,'1811-4294');
 assert.equal(service.areaServed.name,'대한민국');
 assert.equal('offers' in service,false);
 assert.ok(!schema.some(x=>x['@type']==='FAQPage'),'avoid deprecated Naver FAQ rich result promises');
 assert.ok(!schema.some(x=>x['@type']==='AggregateRating'),'no invented rating');
});
test('Original dated two completed long-distance rides and source blog posts survive unchanged',()=>{
 for(const id of ['beaadac165d9d73c','df8a51b8d91f2c0a'])
 assert.ok(html.includes('/reviews/verified/'+id+'/'),id);
 for(const str of ['2026-10-23','190,000원','170,000원','224388328571','224381997772'])
 assert.ok(html.includes(str),'historical evidence '+str);
 for(const section of ['national-long-distance-records','long-distance-daeri-customer-guide',
 'sokcho-long-distance-daeri-20261123'])
 assert.ok(html.includes('id="'+section+'"'),'preserved original section '+section);
 assert.ok(html.includes('실제 완료 운행 또는 확정요금이 아닙니다'));
 assert.ok(html.includes('현재 확정 견적이 아닙니다'));
 assert.ok(html.includes('기사 복귀'));
});
test('Approved completed rides have distinct current and reverse quote links using only published location fields',()=>{
 const records=JSON.parse(read('data/public-reviewed-rides-202610.json'));
 const {identifier,loadPublishedCases}=require('../lib/published-case-feed');
 const published=new Map(loadPublishedCases(root).map(x=>[x.id,x]));
 const owners=JSON.parse(read('data/sitemap-url-owners.json'));
 const block=html.match(/<section id="national-long-distance-records">[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(html.indexOf(block)>html.indexOf('<main>'),'avoid white header text on white record section');
 assert.ok(block.includes('반대 방향은 별도 견적 안내이며 실제 운행완료 사례가 아닙니다'));
 const cases=[...block.matchAll(/<li data-case="([a-f0-9]{16})">([\s\S]*?)<\/li>/g)];
 assert.equal(cases.length,2);assert.equal(new Set(cases.map(x=>x[1])).size,2);
 for(const [,id,body] of cases){
  const record=records.find(x=>identifier(x)===id&&x.verified===true&&x.status==='completed'&&x.service==='daeri');
  assert.ok(record,'public approved source '+id);
  assert.equal(published.get(id)?.service,'daeri');
  assert.equal(owners['/reviews/verified/'+id+'/'],'/sitemap-published.xml');
  assert.ok(body.includes('href="/reviews/verified/'+id+'/"'));
  assert.ok(body.includes(record.date));assert.ok(body.includes(record.fare));
  const urls=[...body.matchAll(/href="(\/fare\/\?[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr'));
  assert.equal(urls.length,2);
  for(const [i,[from,to]] of [[record.departure,record.destination],[record.destination,record.departure]].entries()){
   assert.equal(urls[i].searchParams.get('service'),'daeri');
   assert.equal(urls[i].searchParams.get('from'),from);
   assert.equal(urls[i].searchParams.get('to'),to);
  }
 }
});
test('Nationwide conversion guide contains 17 original region links and 12 route-specific daeri fare links',()=>{
 const regions=html.match(/<section id="national-long-daeri-regions-20261124">([\s\S]*?)<\/section>/)?.[1]||'';
 const corridors=html.match(/<section id="national-long-daeri-corridors-20261124">([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(regions.length>1500&&corridors.length>1800);
 const codes=['seoul','incheon','gyeonggi','gangwon','busan','daegu','ulsan','gyeongnam',
 'gyeongbuk','daejeon','sejong','chungnam','chungbuk','gwangju','jeonnam','jeonbuk','jeju'];
 for(const code of codes)assert.ok(regions.includes('href="/daeri/'+code+'/"'),code);
 assert.equal((regions.match(/<li><a href="\/daeri\//g)||[]).length,17);
 const matches=[...corridors.matchAll(/href="(\/fare\/\?service=daeri&amp;from=[^"]+)"/g)];
 assert.equal(matches.length,12);
 for(const [,href] of matches)assert.ok(href.includes('&amp;to='),'both directions have a specific destination');
 for(const phrase of ['서울 → 부산','부산 → 경기','광주 → 인천','강릉 → 서울','속초 → 인천','창원 → 부산','제주 → 서귀포'])
 assert.ok(corridors.includes(phrase),'representative route '+phrase);
 assert.ok(corridors.includes('실제 완료 운행 또는 확정요금이 아닙니다'));
});
test('Visible booking workflow separates customer ride, unattended taksong, daily driver and consultation conditions',()=>{
 for(const section of ['national-long-daeri-service-choice-20261124','national-long-daeri-faq-20261124'])
 assert.ok(html.includes('id="'+section+'"'));
 for(const phrase of ['고객이 자기 차에 동승','고객이 타지 않고','일일기사','편도·왕복·경유지·대기시간',
 '고속도로 통행료','기사 이동·복귀 여건','기사 보험 적용 조건','장거리대리운전 금액은 거리만으로 확정할 수 없습니다'])
 assert.ok(html.includes(phrase),phrase);
 assert.equal((html.match(/href="https:\/\/open\.kakao\.com\/o\/sGV88r7h"/g)||[]).length,3);
 assert.ok(html.includes('min-height:52px'));
 assert.ok(html.includes(':focus-visible'));
 assert.ok(html.includes('공개 오픈채팅에는 신분증'));
 assert.ok(html.includes('href="tel:18114294"'));
});
test('Intercity intent synonyms route to one indexed hub without changing taksong or unrelated fares',()=>{
 const aliases=['장거리대리운전','전국장거리대리운전','시외대리운전',
  '전국시외대리운전','장거리대리운전예약','장거리대리운전요금',
  '심야장거리대리운전','지방장거리대리운전','장거리대리요금'];
 for(const alias of aliases)assert.ok(server.includes("'"+alias+"':'/service/long-distance-daeri/'"),alias);
 assert.ok(server.includes("'장거리탁송':'/service/long-distance-taksong/'"));
 assert.ok(server.includes("'/service/long-distance-daeri/'"));
 assert.ok(read('service/daeri/index.html').includes('href="/service/long-distance-daeri/"'));
 assert.ok(read('service/corporate/index.html').includes('href="/service/long-distance-daeri/"'));
 assert.ok(read('service/golf/index.html').includes('href="/service/long-distance-daeri/"'));
 assert.ok(read('package.json').includes('tests/nationwide-long-distance-daeri-20261124.test.cjs'));
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
});
test('Real HTTP responds with updated metadata, single WebPage, distinct route pricing and safe search intents',async()=>{
 const port=39937,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<110;n++){
   if(child.exitCode!==null)throw Error('server terminated unexpectedly');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,180));
  }
  assert.ok(ready,'local source server ready');
  const r=await fetch(base+'/service/long-distance-daeri/',{signal:AbortSignal.timeout(24000)});
  assert.equal(r.status,200);
  const body=await r.text();
  assert.ok(body.includes('<title>'+title+'</title>'));
  assert.ok(body.includes('content="'+desc+'"'));
  assert.ok(body.includes('17개 시·도'));
  assert.ok(body.includes('data-case="beaadac165d9d73c"')&&body.includes('data-case="df8a51b8d91f2c0a"'));
  assert.ok(body.includes('반대 방향은 별도 견적 안내이며 실제 운행완료 사례가 아닙니다'));
  assert.ok(body.includes('전국 장거리대리운전 시외 구간 12개'));
  assert.ok(body.includes('https://open.kakao.com/o/sGV88r7h'));
  const docs=[...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m=>JSON.parse(m[1]));
  const pageDocs=docs.flatMap(x=>x['@graph']||[x]).filter(x=>x['@type']==='WebPage');
  assert.equal(pageDocs.length,1,'runtime should not add a duplicate WebPage');
  assert.equal(pageDocs[0].name,title);
  for(const q of ['전국장거리대리운전','시외대리운전','장거리대리운전예약','심야장거리대리운전']){
   const a=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(18000)});
   assert.equal(a.status,302,q);
   assert.equal(a.headers.get('location'),'/service/long-distance-daeri/',q);
   await a.body?.cancel();
  }
  for(const [q,destination] of [['장거리탁송','/service/long-distance-taksong/'],['법인대리운전','/service/corporate/']]){
   const a=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(18000)});
   assert.equal(a.status,302,q);
   assert.equal(a.headers.get('location'),destination,q);
   await a.body?.cancel();
  }
 }finally{child.kill('SIGTERM');}
});
