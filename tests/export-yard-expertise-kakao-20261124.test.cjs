'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=read('business/export-port/index.html');
const chat='https://open.kakao.com/o/sGV88r7h';
const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
const description=page.match(/<meta name="description" content="([^"]+)"/)?.[1];
test('Export-yard Kakao consultation is prominent before long legacy text and present at three distinct touchpoints',()=>{
 const hero=page.indexOf('카카오 오픈채팅 상담 바로가기');
 const expert=page.indexOf('카카오 오픈채팅에서 수출단지탁송 문의');
 const footer=page.indexOf('중고차수출단지탁송 카카오 오픈채팅 상담');
 const old=page.indexOf('id="exporter-ceo-b2b-sales-20261123"');
 assert.ok(hero>page.indexOf('<main>')&&hero<expert&&expert<old&&footer>old,'Kakao CTA appears in the first view, expert section and footer');
 assert.equal(page.split('href="'+chat+'"').length-1,3,'Use precisely three verified site open-chat destinations');
 assert.equal(page.split('class="kakao-cta"').length-1,2);
 assert.ok(page.includes('class="kakao-cta" href="'+chat+'" target="_blank" rel="noopener noreferrer"'));
 assert.ok(page.includes('카카오 문의 안내 시간 08:00~20:00'));
 assert.ok(page.includes('답변 시각과 배차 가능 여부는 상담 상황에 따라 다릅니다'));
 assert.equal((page.match(/href="tel:18114294"/g)||[]).length>=3,true);
 assert.ok(page.includes('min-height:52px')&&page.includes('flex-wrap:wrap')&&page.includes('@media(max-width:560px)'),'mobile targets and responsive layout');
 assert.ok(page.includes(':focus-visible'),'keyboard focus');
});
test('Export client expertise has concrete four-stage road-delivery boundaries, not unsupported guarantees',()=>{
 const section=page.match(/<section id="export-yard-expert-process-20261124"[\s\S]*?<\/section>/)?.[0];
 assert.ok(section?.length>1500,'substantial original and visible expert service guidance');
 assert.equal((section.match(/<li><strong>[1-4]\./g)||[]).length,4);
 for(const keyword of ['경매장·매매단지 출고 승인','운행 적합성과 보험 확인','수출단지 지정 장소 입고','다대수·반복 거래 일정','열쇠·서류 담당자',
  '번호판','송도유원지','평택항','법인 정산','통관·선박 선적은 별도 업무','카카오 상담으로 차량탁송 견적 요청하는 방법'])
  assert.ok(section.includes(keyword),'missing professional booking requirement: '+keyword);
 assert.ok(section.includes('차량번호 전체·신분증·차량 소유자 연락처처럼 민감한 정보는 공개 대화방에 먼저 올리지 마세요'));
 assert.ok(section.includes('완료 기록으로 확인되지 않은 업체 제휴·거래량·운행 후기는 주장하지 않으며'));
 assert.ok(section.includes('href="/blog/archive/vehicle-taksong/"'));
 assert.ok(section.includes('href="/business/#export"'));
 assert.ok(section.includes('href="/fare/?service=taksong"'));
});
test('Existing exporter canonical, source-backed SEO, evidence and structured data survive change',()=>{
 assert.equal(title,'중고차수출단지탁송 | 송도·경매장 출고·수출업체 반입');
 assert.ok(description.includes('카카오 오픈채팅·1811-4294 상담'));
 assert.ok([...description].length<=80,'business page concise Naver metadata');
 assert.ok(page.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/export-port/"'));
 assert.equal(page.match(/<h1\b/g)?.length,1);
 assert.equal((page.match(/<meta property="og:description" content="([^"]+)"/)||[])[1],description);
 assert.equal((page.match(/<meta property="og:title" content="([^"]+)"/)||[])[1],title);
 const schema=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const web= schema.find(x=>x['@type']==='WebPage');
 assert.equal(web.name,title);
 assert.equal(web.description,description);
 assert.equal(schema.find(x=>x['@type']==='BreadcrumbList').itemListElement[2].name,title);
 const service=schema.find(x=>x['@type']==='Service');
 assert.equal(service.provider.telephone,'1811-4294');
 assert.equal('offers' in service,false);
 for(const id of ['exporter-ceo-b2b-sales-20261123','export-port-step-by-step-20261117',
  'export-original-blog-guide','export-b2b-operating-guide-20261103','export-practical-questions','container-shoring'])
  assert.ok(page.includes('id="'+id+'"'),'original specialist material lost '+id);
 assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/224363608182'));
 assert.ok(page.includes('https://blog.naver.com/wjdtnr4757/224421653506'));
 assert.ok(page.includes('말소·무번호판·주행불가 차량은 일반 도로 로드탁송으로 운행한다고 약속하지 않고'));
 assert.equal((read('robots.txt').match(/^Sitemap:/gm)||[]).length,8);
 assert.ok(read('package.json').includes('tests/export-yard-expertise-kakao-20261124.test.cjs'));
});

test('All existing ten export example corridors lead to owned regional guides without changing either estimate direction',()=>{
 const nav=page.match(/<nav id="export-booking-jumps-20261125"[\s\S]*?<\/nav>/)?.[0]||'';
 for(const id of ['export-yard-expert-process-20261124','exporter-ceo-b2b-sales-20261123','export-port-step-by-step-20261117']){
  assert.ok(nav.includes('href="#'+id+'"'));assert.equal(page.split('id="'+id+'"').length,2);
 }
 assert.ok(nav.includes('href="/business/#export"'));
 const owners=JSON.parse(read('data/sitemap-url-owners.json'));
 const routes=JSON.parse(read('data/exporter-b2b-sales-20261123.json')).routes;
 const origins=["/taksong/gyeonggi/osan-si/","/taksong/gyeonggi/anseong-si/","/taksong/gyeonggi/suwon-si/","/taksong/gyeonggi/yongin-si/","/taksong/gyeonggi/goyang-si/","/taksong/chungnam/cheonan-si/","/taksong/chungbuk/cheongju-si/","/taksong/gyeonggi/pyeongtaek-si/","/taksong/seoul/gangnam-gu/","/taksong/chungnam/asan-si/"];
 const names=["경기도 오산시","경기도 안성시","경기도 수원시","경기도 용인시","경기도 고양시","충청남도 천안시","충청북도 청주시","경기도 평택시","서울특별시 강남구","충청남도 아산시"];
 const section=page.match(/<section id="exporter-ceo-b2b-sales-20261123"[\s\S]*?<\/section>/)?.[0]||'';
 const q=(a,b)=>'/fare/?service=taksong&amp;from='+encodeURIComponent(a)+'&amp;to='+encodeURIComponent(b);
 assert.equal(routes.length,10);
 for(const [i,row] of routes.entries()){
  assert.equal(row.from,names[i]);
  const dest=row.to==='인천광역시 연수구 옥련동'?'/taksong/incheon/yeonsu-gu/okryeon-dong/':'/taksong/gyeonggi/pyeongtaek-si/';
  assert.ok(owners[origins[i]]&&owners[dest]);
  const end=section.indexOf('href="'+q(row.to,row.from)+'"');
  assert.ok(end>=0);
  const block=section.slice(end,section.indexOf('</li>',end));
  assert.ok(block.includes('href="'+origins[i]+'"'));
  assert.ok(block.includes('href="'+dest+'"'));
  assert.ok(section.includes('href="'+q(row.from,row.to)+'"'));
 }
 assert.ok(section.includes('실제 완료 운행이나 수출업체 제휴 실적이 아닙니다'));
});
