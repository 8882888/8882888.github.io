'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('business/used-car/index.html');
const hub=read('business/index.html');
const server=read('server.js');
const section=page.match(/<section id="national-usedcar-complex-pickup-20261124"[\s\S]*?<\/section>/)?.[0]||'';
const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
const desc=page.match(/<meta name="description" content="([^"]+)"/)?.[1];

test('One nationwide used-car canonical has a concise Naver title and accurately describes dispatch',()=>{
 assert.equal(title,'전국 중고차매매단지탁송 | 단지 현장 인수·일반고객·딜러');
 assert.ok(desc.startsWith('전국 중고차매매단지탁송.'));
 assert.ok(desc.includes('카카오 상담 1811-4294'));
 assert.ok([...desc].length>55&&[...desc].length<=80);
 assert.equal((page.match(/<h1>/g)||[]).length,1);
 assert.ok(page.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/used-car/"'));
 assert.equal(page.match(/<meta property="og:title" content="([^"]+)"/)?.[1],title);
 assert.equal(page.match(/<meta property="og:description" content="([^"]+)"/)?.[1],desc);
 const graph=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 assert.equal(graph.find(x=>x['@type']==='WebPage').name,title);
 assert.equal(graph.find(x=>x['@type']==='WebPage').description,desc);
 assert.equal(graph.find(x=>x['@type']==='BreadcrumbList').itemListElement.at(-1).name,title);
 const service=graph.find(x=>x['@type']==='Service');
 assert.equal(service.provider.telephone,'1811-4294');
 assert.ok(service.description.includes('매매단지 내 탁송 사무실 상주나 공식 제휴를 뜻하지 않습니다'));
 assert.ok(!graph.some(x=>x['@type']==='LocalBusiness' || x['@type']==='AutoDealer'));
 assert.equal((page.match(/href="https:\/\/open\.kakao\.com\/o\/sGV88r7h"/g)||[]).length,4);
});
test('Verified 13 nationwide market examples link to sources and explain genuine vehicle handover',()=>{
 assert.ok(section.length>6000,'substantive customer guide and no thin doorway text');
 assert.ok(section.includes('대표 매매단지 예시 13곳'));
 assert.equal((section.match(/<li><h3>/g)||[]).length,13);
 for(const place of ['서울 장안평 중고차시장','인천 가좌동 엠파크 랜드·타워·허브',
 '수원 도이치오토월드','대구 엠월드','부산 KC오토월드','부산 경동오토필드',
 '창원 KC월드카프라자','사천 경남매매단지','구미 금오자동차매매단지',
 '안동 중고자동차유통단지','포항 대잠중고매매단지','순천 IC매매단지','순천 강변매매단지']){
  assert.ok(section.includes(place),'verified market name '+place);
 }
 for(const source of ['www.m-park.co.kr/information/directions','www.dautoworld.com/about/location.asp',
 'www.kcautoworld.com/','carku.kr/regional/regional.html','mediahub.seoul.go.kr/archives/1115950']){
  assert.ok(section.includes(source),'missing known public source '+source);
 }
 assert.equal((section.match(/단지 위치·명칭 확인 자료/g)||[]).length,13);
 assert.ok(section.includes('매매단지 내 입점한 업체')||section.includes('매매단지 안에 입점한 업체'));
 assert.ok(section.includes('고정 사무실, 상주 기사나 공식 지정업체라는 뜻은 아닙니다'));
 assert.ok(section.includes('고객이 매매단지에 가서 직접 운전해 올 필요가 없는'));
 assert.ok(section.includes('명함·인터넷 검색·네이버로 문의한 고객'));
 assert.ok(section.includes('차량이 실제 있는 단지 이름, 주소, 매매상사와 주차동·층·구역'));
 assert.ok(section.includes('기사 이동·복귀 조건'));
 assert.ok(section.includes('href="https://open.kakao.com/o/sGV88r7h"'));
 assert.ok(section.includes('href="tel:18114294"'));
});
test('National entry and original M Park/dealer/exporter guides remain distinct and reachable',()=>{
 assert.ok(page.indexOf('id="national-usedcar-complex-pickup-20261124"')<page.indexOf('id="usedcar-public-mpark-20261124"'));
 for(const id of ['usedcar-public-mpark-20261124','gangnam-imported-testdrive-corporate-20261123',
  'gangnam-yulhyeon-dealer-imported-20261122','dealer-b2b-operating-guide-20261103',
  'used-car-practical-questions','used-car-exporter-b2b-20261123'])
  assert.ok(page.includes('id="'+id+'"'),'source guide preserved '+id);
 assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/224451107355'));
 assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/224421653506'));
 assert.ok(hub.includes('href="/business/used-car/#national-usedcar-complex-pickup-20261124"'));
 assert.ok(hub.includes('href="/business/used-car/#usedcar-public-mpark-20261124"'));
 assert.ok(hub.includes('스마트24가 엠파크에 입점하거나 공식 제휴한 업체라는 뜻은 아닙니다'));
 assert.ok(read('package.json').includes('tests/nationwide-usedcar-market-20261124.test.cjs'));
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
});
test('Only exact market-taksong service phrases resolve to original canonical, not market-location or inventory queries',()=>{
 const aliases=['전국중고차매매단지탁송','전국매매단지탁송','서울장안평중고차시장탁송','장안평중고차시장탁송',
 '수원도이치오토월드탁송','도이치오토월드탁송','대구엠월드탁송','엠월드탁송',
 '부산KC오토월드탁송','KC오토월드탁송','부산경동오토필드탁송','경동오토필드탁송',
 '창원KC월드카프라자탁송','사천경남매매단지탁송','구미금오자동차매매단지탁송',
 '안동중고자동차유통단지탁송','포항대잠중고매매단지탁송','순천IC매매단지탁송','순천강변매매단지탁송'];
 assert.equal(aliases.length,19);
 for(const term of aliases)assert.ok(server.includes("'"+term+"':'/business/used-car/'"),term);
 assert.ok(server.includes('||usedCarBuyerTarget||'));
 for(const term of ['엠월드','도이치오토월드','장안평중고차시장','KC오토월드']){
  assert.ok(!server.includes("'"+term+"':'/business/used-car/'"),'bare market name hijack '+term);
 }
});
test('Real HTTP national market search returns original booking URL and preserves unrelated lookup',async()=>{
 const port=39809,base='http://127.0.0.1:'+port;
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<110;n++){
   if(cp.exitCode!==null)throw Error('server quit');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,180));
  }
  assert.ok(ready);
  const main=await fetch(base+'/business/used-car/',{signal:AbortSignal.timeout(20000)});
  assert.equal(main.status,200);
  const html=await main.text();
  assert.ok(html.includes('전국 주요 중고차매매단지별 출고·입고 준비'));
  for(const q of ['전국중고차매매단지탁송','장안평중고차시장탁송','수원도이치오토월드탁송','대구엠월드탁송','부산KC오토월드탁송','창원KC월드카프라자탁송','순천강변매매단지탁송']){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(25000)});
   assert.equal(r.status,302,q);
   assert.equal(r.headers.get('location'),'/business/used-car/',q);
   await r.body?.cancel();
  }
  for(const q of ['엠월드','도이치오토월드','장안평중고차시장']){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(q),{redirect:'manual',signal:AbortSignal.timeout(25000)});
   assert.notEqual(r.headers.get('location'),'/business/used-car/','bare location should not pretend commercial service '+q);
   await r.body?.cancel();
  }
 }finally{cp.kill('SIGTERM');}
});
