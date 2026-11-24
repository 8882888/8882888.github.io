'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('business/used-car/index.html');
const server=read('server.js');
const business=read('business/index.html');
const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
const desc=page.match(/<meta name="description" content="([^"]+)"/)?.[1];
test('Original used-car canonical now serves private buyers, sellers and dealers without confusing its location',()=>{
 assert.equal(title,'중고차매매단지탁송 | 가좌엠파크·일반고객·딜러 차량인수');
 assert.ok(desc.startsWith('중고차매매단지탁송.'));
 for(const text of ['가좌엠파크','일반 구매자','판매자','딜러','1811-4294'])assert.ok(desc.includes(text),text);
 assert.ok([...desc].length>55&&[...desc].length<=80);
 assert.ok(page.includes('href="https://open.kakao.com/o/sGV88r7h"'));
 assert.equal(page.split('href="https://open.kakao.com/o/sGV88r7h"').length-1,3);
 assert.ok(page.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/used-car/"'));
 assert.equal(page.match(/<h1>/g)?.length,1);
 assert.equal(page.match(/<meta property="og:title" content="([^"]+)"/)?.[1],title);
 assert.equal(page.match(/<meta property="og:description" content="([^"]+)"/)?.[1],desc);
 const graph=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 assert.equal(graph.find(x=>x['@type']==='WebPage').name,title);
 assert.equal(graph.find(x=>x['@type']==='WebPage').description,desc);
 assert.equal(graph.find(x=>x['@type']==='BreadcrumbList').itemListElement[2].name,title);
 const service=graph.find(x=>x['@type']==='Service');
 assert.equal(service.provider.telephone,'1811-4294');
 assert.ok(service.description.includes('공식 입점 업체나 제휴사라는 뜻이 아니며'));
 assert.equal('offers' in service,false);
});
test('Gajwa M Park consumer guide is detailed, locality-accurate and makes no office/partnership claims',()=>{
 const s=page.match(/<section id="usedcar-public-mpark-20261124"[\s\S]*?<\/section>/)?.[0];
 assert.ok(s&&s.length>2300);
 for(const w of ['인천 서구 가좌동 엠파크','가좌엠파크탁송','엠파크허브','중고차 구매자','중고차 판매자',
 '가족·지인 차량 인수','매매상사·중고차딜러','네이버 검색·명함·온라인 안내','단지에 입점한 회사인지',
 '가좌엠파크 차량탁송 요청 전 5가지','보험','매매상사','출고 승인','차량번호 전체·신분증'])
  assert.ok(s.includes(w),'important consumer detail '+w);
 assert.ok(s.includes('저희 사무실이 있는 것처럼 표기하지 않습니다'));
 assert.ok(s.includes('매매단지 운영사의 공식 지정업체·제휴업체라는 뜻이 아닙니다'));
 assert.ok(s.includes('차량의 출고 승인'));
 assert.equal((s.match(/<li>/g)||[]).length,9,'four different customers + five real pickup requirements');
 for(const u of ['/business/auction/','/business/export-port/','/taksong/incheon/','/fare/?service=taksong','/blog/archive/vehicle-taksong/'])
  assert.ok(s.includes('href="'+u+'"'),u);
 assert.ok(s.includes('href="https://open.kakao.com/o/sGV88r7h"'));
 assert.ok(s.includes('href="tel:18114294"'));
});
test('Core dealer, Gangnam and exporter source-backed content preserved and new public entrypoint linked',()=>{
 for(const id of ['gangnam-imported-testdrive-corporate-20261123','gangnam-yulhyeon-dealer-imported-20261122',
 'used-car-step-by-step-20261117','usedcar-original-archive','dealer-b2b-operating-guide-20261103',
 'used-car-practical-questions','used-car-exporter-b2b-20261123'])
 assert.ok(page.includes('id="'+id+'"'),id);
 assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/224451107355'));
 assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/224421653506'));
 assert.ok(business.includes('id="mpark-consumer-usedcar-20261124"'));
 assert.ok(business.includes('href="/business/used-car/#usedcar-public-mpark-20261124"'));
 assert.ok(business.includes('일반 고객 중고차매매단지탁송'));
 assert.ok(business.includes('스마트24가 엠파크에 입점하거나 공식 제휴한 업체라는 뜻은 아닙니다'));
 assert.ok(page.indexOf('id="usedcar-public-mpark-20261124"')<page.indexOf('id="gangnam-imported-testdrive-corporate-20261123"'));
 assert.ok(page.includes('min-height:52px')&&page.includes(':focus-visible')&&page.includes('@media(max-width:560px)'));
 assert.ok(read('package.json').includes('usedcar-mpark-consumer-seo-20261124.test.cjs'));
});
test('Only specific transport searches resolve to established buyer URL without hijacking car shopping',()=>{
 const aliases=['중고차매매단지탁송','가좌엠파크탁송','인천가좌엠파크탁송',
 '가좌동엠파크탁송','인천엠파크탁송','엠파크탁송','엠파크차량탁송',
 '엠파크허브탁송','엠파크타워탁송','엠파크랜드탁송','인천중고차매매단지탁송'];
 for(const alias of aliases)assert.ok(server.includes("'"+alias+"':'/business/used-car/'"),alias);
 assert.ok(server.includes('||usedCarBuyerTarget||'));
 assert.ok(server.includes('No redirects for bare M Park/used-car shopping terms'));
 assert.ok(!server.includes("'엠파크':'/business/used-car/'"));
 assert.ok(!server.includes("'중고차매매단지':'/business/used-car/'"));
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
});
test('Real HTTP: private-buyer search aliases redirect correctly, general shopping queries not hijacked',async()=>{
 const port=39797,base='http://127.0.0.1:'+port;
 const cp=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<100;n++){
   if(cp.exitCode!==null)throw Error('Server quit before verification');
   try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(1200)});if(r.ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,170));
  }
  assert.ok(ready,'HTTP server ready');
  const route='/business/used-car/';
  const pageResponse=await fetch(base+route,{signal:AbortSignal.timeout(20000)});
  const html=await pageResponse.text();
  assert.equal(pageResponse.status,200);
  assert.ok(html.includes('일반 고객도 가좌엠파크'));
  assert.ok(html.includes('https://jeongukdaeri.kr'+route));
  for(const query of ['가좌엠파크탁송','엠파크탁송','중고차매매단지탁송','인천중고차매매단지탁송']){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(query),{redirect:'manual',signal:AbortSignal.timeout(23000)});
   assert.equal(r.status,302,query);
   assert.equal(r.headers.get('location'),route,query);
   await r.body?.cancel();
  }
  for(const query of ['엠파크','중고차매매단지','엠파크매물']){
   const r=await fetch(base+'/keyword-search/?q='+encodeURIComponent(query),{redirect:'manual',signal:AbortSignal.timeout(23000)});
   assert.notEqual(r.headers.get('location'),route,'non-transport search must not hijack: '+query);
   await r.body?.cancel();
  }
 }finally{cp.kill('SIGTERM');}
});
