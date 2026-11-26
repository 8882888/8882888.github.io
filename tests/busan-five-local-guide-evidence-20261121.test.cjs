'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const expected=[
 ['eighth','부산기장읍탁송회사','부산광역시 기장군 기장읍','taksong',['기장시장','주차장','반출','수령인','복귀']],
 ['eighth','부산녹산동탁송','부산광역시 강서구 녹산동','taksong',['녹산동','게이트','승인','수령','법인차량']],
 ['eighth','부산온천동자동차탁송','부산광역시 동래구 온천동','taksong',['온천동','주차권','키','출고','수령인']],
 ['eighth','부산기장읍대리운전업체','부산광역시 기장군 기장읍','daeri',['기장시장','출발','목적지','법인카드','복귀']],
 ['ninth','부산일광읍탁송회사','부산광역시 기장군 일광읍','taksong',['일광읍','일광역','주차장','차량','수령']]
];
test('five existing Busan guides preserve identities and provide distinct locality-specific booking instructions',()=>{
 const groups=new Map();
 for(const batch of ['eighth','ninth']){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'-100.json'),'utf8')).priority;
  assert.equal(rows.length,100,'Preserve all original 100 guides in '+batch);
  assert.equal(new Set(rows.map(x=>x.keyword)).size,100,'Do not add duplicate keywords in '+batch);
  groups.set(batch,rows);
 }
 const topics=[],pickups=[],handovers=[];
 for(const [batch,keyword,region,kind,terms] of expected){
  const found=groups.get(batch).filter(x=>x.keyword===keyword);
  assert.equal(found.length,1,'Keep original keyword: '+keyword);
  const row=found[0];
  assert.equal(row.region,region,'Keep original legal region for '+keyword);
  assert.equal(row.kind,kind,'Do not reclassify service '+keyword);
  assert(row.related?.startsWith('/'),'Keep useful source service link for '+keyword);
  assert(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,
   'Full topic, pickup, and handover practical value required for '+keyword);
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert(whole.includes(term),keyword+' missing practical term '+term);
  assert(!/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/u.test(whole),
   'No invented fare, trip or guaranteed staffing for '+keyword);
  assert(!/실제\s*운행\s*후기|완료\s*운행\s*기록/u.test(whole),
   'Local service advice cannot be presented as completed travel evidence');
  topics.push(row.topic);pickups.push(row.pickup);handovers.push(row.handover);
 }
 assert.equal(new Set(topics).size,5,'Each local title must be distinct');
 assert.equal(new Set(pickups).size,5,'Each location must have its own pickup context');
 assert.equal(new Set(handovers).size,5,'Each service requires its own handover context');
});
test('five additional Busan locality guides preserve existing identities and service-specific advice',()=>{
 const targets=[
 ['eleventh-daeri-50',859,'부산장안읍대리운전회사','부산광역시 기장군 장안읍','daeri',['회식','출입','하차','복귀']],
 ['eleventh-taksong-50',809,'부산장안읍탁송회사','부산광역시 기장군 장안읍','taksong',['반출','승인','열쇠','수령인','통행료']],
 ['ninth-100',662,'부산일광읍대리운전회사','부산광역시 기장군 일광읍','daeri',['일광역','해수욕장','숙소','차량 대수']],
 ['eighth-100',515,'부산감전동탁송업체','부산광역시 사상구 감전동','taksong',['정비','출고 승인','주행','수령']],
 ['eighth-100',565,'부산감전동법인대리운전','부산광역시 사상구 감전동','daeri',['법인차량','이용 승인','법인카드','하차지','복귀']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);
  assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five second-round Busan guides preserve identities and distinct local service advice',()=>{
 const targets=[
 ['tenth-100',711,'부산철마면탁송','부산광역시 기장군 철마면','taksong',['반출','열쇠','주행','수령인','통행료']],
 ['tenth-100',761,'부산철마면골프장대리운전','부산광역시 기장군 철마면','daeri',['라운딩','클럽하우스','식사','하차','복귀']],
 ['seventh-100',407,'부산정관읍탁송업체','부산광역시 기장군 정관읍','taksong',['아파트','방문차량 등록','반출 승인','수령인']],
 ['eighth-100',516,'부산대연동탁송회사','부산광역시 남구 대연동','taksong',['경성대','대연역','주차권','수령인','입고 승인']],
 ['eighth-100',517,'부산연산동탁송','부산광역시 연제구 연산동','taksong',['연산역','시청','정산','이동 승인','수령 장소']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,100);
  assert.equal(new Set(rows.map(r=>r.id)).size,100);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five third-round Busan daeri guides retain identities and distinct local booking advice',()=>{
 const targets=[
 ['next-50',81,'부산기장군골프장대리운전','부산광역시 기장군',['골프장','클럽하우스','식사','차량','일일기사']],
 ['seventh-100',457,'부산정관읍대리운전회사','부산광역시 기장군 정관읍',['신도시','게이트','하차','복귀']],
 ['nineteenth-daeri-100',2417,'부산기장군기장읍교리대리업체','부산광역시 기장군 기장읍 교리',['주택가','골목','동승','결제','복귀']],
 ['eighth-100',563,'부산녹산동법인카드대리운전','부산광역시 강서구 녹산동',['산업단지','보안시설','법인카드','증빙','반납']],
 ['eighth-100',564,'부산온천동대리운전회사','부산광역시 동래구 온천동',['온천장','숙박시설','주차권','하차','심야']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,'daeri');
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five fourth-round Busan guides preserve identities and practical service-specific local advice',()=>{
 const targets=[
 ['nineteenth-taksong-100',2317,'부산기장군기장읍교리검사소탁송','부산광역시 기장군 기장읍 교리','taksong',['검사기관','서류','입고','정산','인수']],
 ['twentieth-daeri-100',2616,'부산기장군기장읍내리호텔대리운전','부산광역시 기장군 기장읍 내리','daeri',['숙박시설','로비','주차권','하차','복귀']],
 ['twentieth-daeri-100',2617,'부산기장군일광읍원리출장대리운전','부산광역시 기장군 일광읍 원리','daeri',['출장','업무','반납','증빙','복귀']],
 ['eighth-100',566,'부산대연동대리운전업체','부산광역시 남구 대연동','daeri',['경성대','대연역','주차권','동승','경유']],
 ['eighth-100',567,'부산연산동법인카드대리운전','부산광역시 연제구 연산동','daeri',['연산역','법인카드','승인','영수증','복귀']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,100);
  assert.equal(new Set(rows.map(r=>r.id)).size,100);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five fifth-round Busan guides preserve original identities and distinct consultation guidance',()=>{
 const targets=[
 ['twentieth-taksong-100',2516,'부산기장군기장읍내리중고차매매탁송','부산광역시 기장군 기장읍 내리','taksong',['중고차','반출 승인','구매자','서류','이전등록']],
 ['twentieth-taksong-100',2517,'부산기장군일광읍원리자동차탁송','부산광역시 기장군 일광읍 원리','taksong',['열쇠','인수 승인','수령인','부재','복귀']],
 ['eleventh-daeri-50',858,'부산송정동대리운전업체','부산광역시 해운대구 송정동','daeri',['송정해수욕장','공영주차장','숙소','하차','복귀']],
 ['eleventh-daeri-50',860,'부산화전동법인대리운전','부산광역시 강서구 화전동','daeri',['산업단지','이용 승인','법인카드','반납','복귀']],
 ['eleventh-daeri-50',862,'부산덕천동대리운전회사','부산광역시 북구 덕천동','daeri',['덕천역','주차권','동승','하차','복귀']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five sixth-round Busan and Daegu guides retain identities and distinct local service advice',()=>{
 const targets=[
 ['eleventh-daeri-50',863,'부산민락동대리운전','부산광역시 수영구 민락동','daeri',['민락수변공원','광안리','주차권','하차','복귀']],
 ['eleventh-taksong-50',808,'부산송정동탁송업체','부산광역시 해운대구 송정동','taksong',['송정해수욕장','체크아웃','열쇠','수령인','통행료']],
 ['eleventh-taksong-50',810,'부산화전동차량탁송','부산광역시 강서구 화전동','taksong',['산업단지','반출 승인','게이트','인계','복귀']],
 ['eighth-100',518,'대구두산동자동차탁송','대구광역시 수성구 두산동','taksong',['수성못','두산오거리','방문 등록','입고 승인','수령인']],
 ['eighth-100',568,'대구두산동프리미엄대리운전','대구광역시 수성구 두산동','daeri',['수성못','프리미엄','동승','하차','증빙']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five seventh-round Busan and Daegu guides preserve local identities and distinct service guidance',()=>{
 const targets=[
 ['eleventh-taksong-50',812,'부산덕천동자동차탁송','부산광역시 북구 덕천동','taksong',['덕천역','주차권','열쇠','수령인','통행료']],
 ['eleventh-taksong-50',813,'부산민락동탁송업체','부산광역시 수영구 민락동','taksong',['민락수변공원','광안리','반출 동의','수령인','복귀']],
 ['fourteenth-taksong-100',1315,'부산미음동차량탁송','부산광역시 강서구 미음동','taksong',['미음산업단지','출입 허가','반출','출고 서류','인계']],
 ['eighth-100',571,'대구침산동법인카드대리운전','대구광역시 북구 침산동','daeri',['침산네거리','법인카드','이용 승인','영수증','복귀']],
 ['eleventh-daeri-50',865,'대구태전동대리운전회사','대구광역시 북구 태전동','daeri',['태전역','칠곡','주차권','하차','복귀']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five eighth-round Busan and Daegu guides preserve existing identities and differentiated service advice',()=>{
 const targets=[
 ['fourteenth-taksong-100',1318,'부산토성동1가탁송업체','부산광역시 서구 토성동1가','taksong',['토성역','일방통행','주차료','수령인','복귀']],
 ['fourteenth-taksong-100',1320,'부산범일동차량탁송','부산광역시 동구 범일동','taksong',['범일역','부산진시장','이동 승인','출고 서류','인계']],
 ['ninth-100',611,'부산해운대중동탁송업체','부산광역시 해운대구 중동','taksong',['해운대해수욕장','미포','체크아웃','수령인','통행료']],
 ['eleventh-taksong-50',815,'대구태전동차량탁송','대구광역시 북구 태전동','taksong',['태전역','칠곡','방문 등록','입고 승인','복귀']],
 ['fourteenth-daeri-100',1426,'대구감삼동대리운전업체','대구광역시 달서구 감삼동','daeri',['감삼역','주차권','하차','경유','복귀']]
 ];
 const records=[];
 for(const [batch,id,keyword,region,kind,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);
  assert.ok(row.related.startsWith('/'));
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five ninth-round Busan and Daegu transport guides preserve identities, links and distinct service advice',()=>{
 const targets=[
  [
    "ninth-100",
    613,
    "부산전포동탁송",
    "부산광역시 부산진구 전포동",
    "/service/long-distance-taksong/",
    [
      "전포카페거리",
      "골목",
      "주차권",
      "수령인",
      "통행료"
    ]
  ],
  [
    "ninth-100",
    614,
    "부산하단동자동차탁송",
    "부산광역시 사하구 하단동",
    "/service/long-distance-taksong/",
    [
      "하단오거리",
      "동아대",
      "반출 승인",
      "반납",
      "복귀"
    ]
  ],
  [
    "ninth-100",
    615,
    "부산화명동탁송업체",
    "부산광역시 북구 화명동",
    "/service/long-distance-taksong/",
    [
      "화명역",
      "화명생태공원",
      "방문 등록",
      "입고 접수",
      "수령인"
    ]
  ],
  [
    "fourteenth-taksong-100",
    1323,
    "대구욱수동탁송업체",
    "대구광역시 수성구 욱수동",
    "/service/taksong/",
    [
      "대구스타디움",
      "통행 제한",
      "소유자 승인",
      "수령인",
      "복귀"
    ]
  ],
  [
    "fourteenth-taksong-100",
    1326,
    "대구감삼동탁송",
    "대구광역시 달서구 감삼동",
    "/service/taksong/",
    [
      "감삼역",
      "반출 허가",
      "대리운전과 달리",
      "검수",
      "입고 접수"
    ]
  ]
];
 const records=[];
 for(const [batch,id,keyword,region,related,terms] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,'taksong');
  assert.equal(row.related,related);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('five tenth-round Busan and Daegu guides preserve identities, links and differentiated services',()=>{
 const targets=[
  [
    661,
    "부산해운대중동대리운전회사",
    "부산광역시 해운대구 중동",
    "daeri",
    "/service/daily-driver/",
    [
      "미포",
      "해운대해수욕장",
      "하차",
      "경유",
      "복귀"
    ]
  ],
  [
    664,
    "부산하단동대리운전업체",
    "부산광역시 사하구 하단동",
    "daeri",
    "/service/corporate/",
    [
      "하단오거리",
      "동아대",
      "주차타워",
      "법인 결제",
      "복귀"
    ]
  ],
  [
    665,
    "부산화명동대리운전업체",
    "부산광역시 북구 화명동",
    "daeri",
    "/service/corporate/",
    [
      "화명역",
      "화명생태공원",
      "차량 진입구",
      "경유",
      "복귀"
    ]
  ],
  [
    619,
    "대구죽전동탁송업체",
    "대구광역시 달서구 죽전동",
    "taksong",
    "/service/taksong/",
    [
      "죽전역",
      "감삼생활권",
      "반출 승인",
      "입고 접수",
      "복귀"
    ]
  ],
  [
    620,
    "대구현풍읍탁송회사",
    "대구광역시 달성군 현풍읍",
    "taksong",
    "/service/taksong/",
    [
      "테크노폴리스",
      "반출 승인",
      "출고 서류",
      "검수",
      "복귀"
    ]
  ]
];
 const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-ninth-100.json'),'utf8')).priority;
 assert.equal(rows.length,100);
 assert.equal(new Set(rows.map(r=>r.id)).size,100);
 const records=[];
 for(const [id,keyword,region,kind,related,terms] of targets){
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(row.keyword,keyword);assert.equal(row.region,region);assert.equal(row.kind,kind);assert.equal(row.related,related);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality));
  const whole=[row.topic,row.pickup,row.handover].join(' ');
  for(const term of terms)assert.ok(whole.includes(term),keyword+' missing '+term);
  assert.doesNotMatch(whole,/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,5);
});

test('all 2900 source guides render exact administrative region searches and corrected objective particles',()=>{
 const vm=require('node:vm');
 const dir=path.join(root,'data');
 const files=fs.readdirSync(dir).filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates'));
 assert.equal(files.length,33);
 const rows=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).priority);
 assert.equal(rows.length,2900);
 const keys=new Map(rows.map(r=>[r.kind+'|'+r.region,r]));
 assert.equal(keys.size,2900);
 assert.equal(new Set(rows.map(r=>r.keyword)).size,2900);
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=server.indexOf('function naverFocus50Guide('),end=server.indexOf('function naverFocus50Hub(',start);
 assert.ok(start>=0&&end>start);
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const render=vm.runInNewContext(server.slice(start,end)+';naverFocus50Guide',{focus50ByKey:keys,esc,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/'});
 const particle=/(절차|게이트|출입구|위치|장소|방법|여부|시간|구역|담당자|권한|조건|주소|승인|상태|차종|구분|출구|입구|층|차고지|주차장|수령인|일정|서류|등록|방식|정산|계획|연락처|인계자|인수자|차량|목적지|출발지|인수지|보관지|제약|요건|동선|경로|차선|운행|인수|인계)(을|를)(?=\s|[,.])/g;
 for(const [i,row] of rows.entries()){
  for(const field of ['topic','pickup','handover']){
   for(const [,word,actual] of row[field].matchAll(particle)){
    const expected=(word.charCodeAt(word.length-1)-44032)%28?'을':'를';
    assert.equal(actual,expected,row.keyword+' '+word);
   }
  }
  const slug='test-region-'+i;
  const html=render({full_name:row.region,slug},row.kind);
  assert.ok(html.includes('region='+slug+'"'),row.keyword);
  assert.ok(html.includes('kind='+row.kind+'&amp;region='),row.keyword);
  assert.ok(html.includes('href="/recruit/'+row.kind+'/"'),row.keyword);
  assert.ok(html.includes(esc(row.pickup))&&html.includes(esc(row.handover)),row.keyword);
  assert.ok(html.includes('from='+encodeURIComponent(row.region)),row.keyword);
  assert.ok(html.includes('to='+encodeURIComponent(row.region)),row.keyword);
  const otherKind=row.kind==='taksong'?'daeri':'taksong';
  const companion=keys.get(otherKind+'|'+row.region);
  const otherPath='/'+otherKind+'/'+slug+'/';
  if(companion){
   assert.ok(html.includes('href="'+otherPath+'"'),row.keyword);
   assert.ok(html.includes(esc(companion.keyword+' · '+companion.topic)),row.keyword);
  }else assert.ok(!html.includes('href="'+otherPath+'"'),row.keyword);
  assert.ok(html.includes(row.kind==='taksong'?'키 전달 권한':'최종 하차지와 경유 순서'),row.keyword);

  if(row.related)assert.ok(html.includes('href="'+row.related+'"'),row.keyword);
  else assert.ok(html.includes(row.kind==='taksong'?'href="/service/long-distance-taksong/"':'href="/service/corporate/"'),row.keyword);
  assert.doesNotMatch(html,/verified-post-links|blog\.naver\.com/);
 }
 assert.equal(render({full_name:'없는 행정구역',slug:'missing'},'daeri'),'');
});

test('all 2900 original regional guides have explicit related service links, including 17 restored contextual links',()=>{
 const dir=path.join(root,'data');
 const files=fs.readdirSync(dir).filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates'));
 const rows=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).priority);
 assert.equal(files.length,33);assert.equal(rows.length,2900);
 assert.equal(new Set(rows.map(row=>row.kind+'|'+row.region)).size,2900);
 for(const row of rows)assert.match(row.related,/^\/(?:service|business|fare|route-taksong|special|daeri|taksong)\/[a-z0-9\-/]*$/,row.keyword);
 const originalBatch=JSON.parse(fs.readFileSync(path.join(dir,'naver-regional-focus-50.json'),'utf8')).priority;
 const targets=[[18,"/service/taksong-purpose/"],[19,"/service/long-distance-taksong/"],[20,"/service/long-distance-taksong/"],[21,"/service/heavy-truck-taksong/"],[23,"/business/rental-car/"],[24,"/service/taksong-purpose/"],[25,"/service/taksong/"],[27,"/service/taksong-purpose/"],[28,"/service/long-distance-taksong/"],[30,"/service/long-distance-taksong/"],[32,"/service/long-distance-taksong/"],[34,"/service/taksong-purpose/"],[36,"/service/taksong-purpose/"],[38,"/service/heavy-truck-taksong/"],[39,"/service/taksong/"],[40,"/fare/jeju/"],[46,"/service/long-distance-daeri/"]];
 const edited=targets.map(([id,related])=>{
  const row=originalBatch.find(r=>r.id===id);assert.ok(row,id);assert.equal(row.related,related);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
  const locality=row.region.split(' ').at(-1);assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality),row.keyword);
  return row;
 });
 for(const field of ['topic','pickup','handover'])assert.equal(new Set(edited.map(r=>r[field])).size,17);
 assert.ok(edited.find(r=>r.id===40).handover.includes('1877-5245'));
});

test('29 nationwide local guides retain exact identities and distinct source-based guidance across 16 provinces',()=>{
 const targets=[["fourteenth-taksong-100",1304,"서울특별시 송파구 신천동","서울신천동탁송회사","taksong","/service/taksong/"],["fourteenth-taksong-100",1327,"대구광역시 동구 신암동","대구신암동자동차탁송","taksong","/service/long-distance-taksong/"],["fourteenth-taksong-100",1339,"경기도 수원시 권선구 세류동","수원세류동탁송회사","taksong","/service/long-distance-taksong/"],["fourteenth-taksong-100",1357,"강원특별자치도 강릉시 성산면","강릉성산면자동차탁송","taksong","/service/long-distance-taksong/"],["fourteenth-taksong-100",1364,"충청북도 청주시 흥덕구 송절동","청주송절동탁송회사","taksong","/service/taksong/"],["fourteenth-taksong-100",1369,"충청남도 천안시 동남구 원성동","천안원성동탁송회사","taksong","/service/taksong/"],["fourteenth-taksong-100",1372,"전북특별자치도 전주시 완산구 서신동","전주서신동자동차탁송","taksong","/service/taksong/"],["fourteenth-taksong-100",1376,"전라남도 여수시 국동","여수국동탁송","taksong","/service/long-distance-taksong/"],["fourteenth-taksong-100",1382,"경상북도 포항시 남구 효자동","포항효자동자동차탁송","taksong","/service/taksong/"],["fourteenth-taksong-100",1387,"경상남도 창원시 의창구 사림동","창원사림동자동차탁송","taksong","/service/long-distance-taksong/"],["fourteenth-taksong-100",1391,"제주특별자치도 제주시 건입동","제주건입동탁송","taksong","/business/export-port/"],["fourteenth-taksong-100",1395,"울산광역시 중구 태화동","울산태화동차량탁송","taksong","/service/long-distance-taksong/"],["fourteenth-taksong-100",1397,"광주광역시 서구 농성동","광주농성동자동차탁송","taksong","/service/taksong/"],["tenth-100",707,"부산광역시 해운대구 반여동","부산반여동자동차탁송","taksong","/service/taksong/"],["tenth-100",709,"부산광역시 강서구 대저2동","부산대저2동차량탁송","taksong","/business/rental-car/"],["tenth-100",757,"부산광역시 해운대구 반여동","부산반여동대리운전회사","daeri","/service/corporate/"],["ninth-100",667,"대구광역시 수성구 만촌동","대구만촌동법인카드대리운전","daeri","/service/corporate/"],["ninth-100",669,"대구광역시 달서구 죽전동","대구죽전동법인카드대리운전","daeri","/service/corporate/"],["fourteenth-daeri-100",1409,"서울특별시 관악구 신림동","서울신림동대리운전회사","daeri","/daeri/"],["fourteenth-daeri-100",1427,"대구광역시 동구 신암동","대구신암동대리운전회사","daeri","/daeri/"],["fourteenth-daeri-100",1439,"경기도 수원시 권선구 세류동","수원세류동대리운전업체","daeri","/daeri/"],["fourteenth-daeri-100",1441,"경기도 성남시 분당구 이매동","성남이매동대리운전","daeri","/daeri/"],["fourteenth-daeri-100",1457,"강원특별자치도 강릉시 성산면","강릉성산면대리운전","daeri","/service/daily-driver/"],["fourteenth-daeri-100",1464,"충청북도 청주시 흥덕구 송절동","청주송절동법인카드대리운전","daeri","/service/corporate/"],["fourteenth-daeri-100",1482,"경상북도 포항시 남구 효자동","포항효자동대리운전업체","daeri","/daeri/"],["fourteenth-daeri-100",1487,"경상남도 창원시 의창구 사림동","창원사림동대리운전회사","daeri","/daeri/"],["fourteenth-daeri-100",1491,"제주특별자치도 제주시 건입동","제주건입동법인대리운전","daeri","/service/corporate/"],["fifteenth-daeri-100",1628,"인천광역시 계양구 평동","인천계양구평동예약대리운전","daeri","/daeri/"],["fifteenth-daeri-100",1640,"대전광역시 유성구 노은동","대전유성구노은동대리업체","daeri","/daeri/"]];
 const records=[];
 for(const [batch,id,region,keyword,kind,related] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  const row=rows.find(r=>r.id===id);assert.ok(row,id);
  assert.equal(row.region,region);assert.equal(row.keyword,keyword);assert.equal(row.kind,kind);assert.equal(row.related,related);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,keyword);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality),keyword);
  assert.doesNotMatch([row.topic,row.pickup,row.handover].join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  records.push(row);
 }
 assert.equal(records.length,29);
 assert.equal(new Set(records.map(r=>r.region.split(' ')[0])).size,16);
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,29);
});

test('additional 19 source-locality guides preserve exact original identity and service links',()=>{
 const targets=[["tenth-100",701,"서울특별시 강남구 압구정동","강남압구정동탁송","taksong","/service/taksong/"],["tenth-100",702,"서울특별시 강남구 개포동","강남개포동자동차탁송","taksong","/service/taksong/"],["tenth-100",703,"서울특별시 서초구 잠원동","서초잠원동탁송업체","taksong","/service/taksong/"],["tenth-100",704,"서울특별시 송파구 석촌동","송파석촌동차량탁송","taksong","/service/taksong/"],["tenth-100",705,"서울특별시 마포구 공덕동","마포공덕동탁송회사","taksong","/service/taksong/"],["tenth-100",706,"서울특별시 성동구 성수동2가","성동성수동2가탁송","taksong","/service/taksong/"],["tenth-100",708,"부산광역시 금정구 구서동","부산구서동탁송업체","taksong","/service/taksong/"],["tenth-100",710,"부산광역시 남구 용호동","부산용호동탁송회사","taksong","/service/taksong/"],["tenth-100",712,"대구광역시 수성구 지산동","대구지산동자동차탁송","taksong","/service/taksong/"],["tenth-100",714,"대구광역시 달성군 옥포읍","대구옥포읍차량탁송","taksong","/service/taksong/"],["tenth-100",715,"인천광역시 연수구 동춘동","인천동춘동탁송회사","taksong","/service/taksong/"],["tenth-100",716,"인천광역시 서해구 청라동","인천청라동탁송","taksong","/service/taksong/"],["tenth-100",719,"경기도 수원시 영통구 이의동","수원광교이의동차량탁송","taksong","/service/taksong/"],["tenth-100",720,"경기도 성남시 분당구 삼평동","판교삼평동탁송회사","taksong","/service/taksong/"],["tenth-100",724,"경기도 평택시 포승읍","평택포승읍차량탁송","taksong","/service/taksong/"],["tenth-100",758,"부산광역시 금정구 구서동","부산구서동법인대리운전","daeri","/service/corporate/"],["tenth-100",759,"부산광역시 강서구 대저2동","부산대저2동법인카드대리운전","daeri","/service/corporate/"],["tenth-100",762,"대구광역시 수성구 지산동","대구지산동대리운전회사","daeri","/service/corporate/"],["ninth-100",670,"대구광역시 달성군 현풍읍","대구현풍읍법인카드대리운전","daeri","/service/corporate/"]];
 const records=[];
 for(const [batch,id,region,keyword,kind,related] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  const row=rows.find(r=>r.id===id);assert.ok(row,id);
  assert.equal(row.region,region);assert.equal(row.keyword,keyword);assert.equal(row.kind,kind);assert.equal(row.related,related);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,keyword);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality),keyword);
  records.push(row);
 }
 assert.equal(records.length,19);
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(records.map(r=>r[k])).size,19);
});

test('68 archive-candidate region and service guides retain their exact original identities and useful distinct guidance',()=>{
 const targets=[["sixth-100",312,"광주광역시 북구","광주북구탁송","taksong","/business/rental-car/"],["sixth-100",319,"경기도 연천군","연천탁송","taksong","/service/long-distance-taksong/"],["sixth-100",323,"강원특별자치도 정선군","정선탁송","taksong","/service/long-distance-taksong/"],["sixth-100",328,"전라남도 장성군","장성탁송","taksong","/service/taksong/"],["sixth-100",333,"전라남도 신안군","신안탁송","taksong","/business/export-port/"],["sixth-100",338,"경상북도 봉화군","봉화탁송","taksong","/service/long-distance-taksong/"],["sixth-100",347,"경상남도 의령군","의령탁송","taksong","/service/long-distance-taksong/"],["sixth-100",350,"경상남도 함안군","함안탁송","taksong","/service/taksong/"],["sixth-100",373,"강원특별자치도 정선군","정선강원랜드대리운전","daeri","/service/daily-driver/"],["sixth-100",381,"전라남도 보성군","보성대리운전","daeri","/service/daily-driver/"],["sixth-100",399,"경상남도 하동군","하동대리운전","daeri","/service/daily-driver/"],["fifth-taksong-50",206,"경기도 광주시","경기광주시탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",207,"경기도 이천시","이천탁송","taksong","/service/taksong/"],["fifth-taksong-50",208,"경기도 안성시","안성탁송","taksong","/service/taksong/"],["fifth-taksong-50",209,"경기도 양주시","양주탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",211,"경기도 여주시","여주탁송","taksong","/service/taksong/"],["fifth-taksong-50",215,"경기도 오산시","오산탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",218,"경기도 양평군","양평탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",219,"강원특별자치도 태백시","태백탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",224,"충청북도 영동군","영동탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",227,"충청남도 계룡시","계룡탁송","taksong","/service/taksong/"],["fifth-taksong-50",230,"충청남도 서천군","서천탁송","taksong","/business/export-port/"],["fifth-taksong-50",235,"전라남도 영암군","영암탁송","taksong","/service/taksong/"],["fifth-taksong-50",240,"경상북도 청도군","청도탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",243,"경상북도 상주시","상주탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",245,"경상북도 울진군","울진탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",246,"경상남도 사천시","사천탁송","taksong","/service/taksong/"],["fifth-taksong-50",247,"경상남도 밀양시","밀양탁송","taksong","/service/long-distance-taksong/"],["fifth-taksong-50",250,"제주특별자치도 제주시","제주시탁송","taksong","/business/rental-car/"],["third-50",109,"경기도 화성시","화성탁송","taksong","/service/heavy-truck-taksong/"],["third-50",112,"경기도 시흥시","시흥탁송","taksong","/service/taksong/"],["third-50",114,"경기도 파주시","파주탁송","taksong","/service/long-distance-taksong/"],["third-50",120,"충청남도 서산시","서산탁송","taksong","/service/long-distance-taksong/"],["third-50",122,"충청북도 청주시","청주탁송","taksong","/service/long-distance-taksong/"],["third-50",123,"충청북도 충주시","충주탁송","taksong","/service/taksong/"],["third-50",124,"충청북도 제천시","제천탁송","taksong","/service/long-distance-taksong/"],["third-50",126,"전라남도 여수시","여수탁송","taksong","/service/long-distance-taksong/"],["third-50",130,"전북특별자치도 남원시","남원탁송","taksong","/route-taksong/"],["third-50",139,"경기도 화성시","화성골프장대리운전","daeri","/service/golf/"],["third-50",140,"경기도 시흥시","시흥대리운전","daeri","/service/corporate/"],["third-50",142,"경기도 남양주시","남양주골프장대리운전","daeri","/service/golf/"],["third-50",143,"경기도 광명시","광명대리운전","daeri","/service/corporate/"],["third-50",144,"경기도 하남시","하남일일기사","daeri","/service/daily-driver/"],["third-50",146,"충청북도 청주시","청주법인대리운전","daeri","/service/corporate/"],["third-50",147,"충청남도 천안시","천안골프장대리운전","daeri","/service/golf/"],["fourth-50",151,"강원특별자치도 홍천군","홍천탁송","taksong","/service/long-distance-taksong/"],["fourth-50",152,"강원특별자치도 횡성군","횡성탁송","taksong","/service/long-distance-taksong/"],["fourth-50",165,"충청남도 태안군","태안탁송","taksong","/service/long-distance-taksong/"],["fourth-50",175,"경상북도 경산시","경산탁송","taksong","/service/taksong/"],["fourth-50",176,"경상북도 안동시","안동탁송","taksong","/service/long-distance-taksong/"],["fourth-50",180,"경상남도 통영시","통영탁송","taksong","/service/long-distance-taksong/"],["fifth-daeri-50",261,"경기도 광주시","경기광주골프장대리운전","daeri","/service/golf/"],["fifth-daeri-50",262,"경기도 이천시","이천법인대리운전","daeri","/service/corporate/"],["fifth-daeri-50",264,"경기도 양주시","양주일일기사","daeri","/service/daily-driver/"],["fifth-daeri-50",265,"경기도 포천시","포천골프장대리운전","daeri","/service/golf/"],["fifth-daeri-50",266,"경기도 여주시","여주골프장대리운전","daeri","/service/golf/"],["fifth-daeri-50",278,"강원특별자치도 인제군","인제대리운전","daeri","/service/corporate/"],["fifth-daeri-50",281,"충청북도 충주시","충주법인대리운전","daeri","/service/corporate/"],["fifth-daeri-50",290,"충청남도 태안군","태안펜션대리운전","daeri","/special/pension-daeri/"],["fifth-daeri-50",294,"전라남도 목포시","목포법인대리운전","daeri","/service/corporate/"],["fifth-daeri-50",295,"전라남도 순천시","순천골프장대리운전","daeri","/service/golf/"],["next-50",76,"강원특별자치도 춘천시","춘천탁송","taksong","/service/long-distance-taksong/"],["next-50",77,"강원특별자치도 동해시","동해시탁송","taksong","/service/long-distance-taksong/"],["next-50",78,"강원특별자치도 삼척시","삼척탁송","taksong","/service/long-distance-taksong/"],["next-50",95,"경기도 수원시","수원법인대리운전","daeri","/service/corporate/"],["next-50",96,"경기도 고양시","고양골프장대리운전","daeri","/service/golf/"],["next-50",97,"경기도 성남시","성남법인카드대리운전","daeri","/service/corporate/"],["next-50",99,"제주특별자치도 제주시","제주시대리운전","daeri","/service/corporate/"]];
 const edited=[];
 for(const [batch,id,region,keyword,kind,related] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  assert.equal(rows.length,Number(batch.split('-').at(-1)));
  const row=rows.find(r=>r.id===id);assert.ok(row,id);
  assert.equal(row.region,region);assert.equal(row.keyword,keyword);assert.equal(row.kind,kind);assert.equal(row.related,related);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,keyword);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality),keyword);
  assert.doesNotMatch([row.topic,row.pickup,row.handover].join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  edited.push(row);
 }
 assert.equal(edited.length,68);
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(edited.map(r=>r[k])).size,68);
});

test('15 paired-locality guides retain exact identity and independently useful service guidance',()=>{
 const targets=[["ninth-100",617,667,"대구광역시 수성구 만촌동","대구만촌동탁송","taksong","/service/long-distance-taksong/"],["ninth-100",663,613,"부산광역시 부산진구 전포동","부산전포동대리운전업체","daeri","/service/corporate/"],["tenth-100",751,701,"서울특별시 강남구 압구정동","강남압구정동프리미엄대리운전","daeri","/service/corporate/"],["tenth-100",752,702,"서울특별시 강남구 개포동","강남개포동법인대리운전","daeri","/service/corporate/"],["tenth-100",753,703,"서울특별시 서초구 잠원동","서초잠원동대리운전","daeri","/service/corporate/"],["tenth-100",754,704,"서울특별시 송파구 석촌동","송파석촌동대리운전업체","daeri","/service/corporate/"],["tenth-100",755,705,"서울특별시 마포구 공덕동","마포공덕동법인카드대리운전","daeri","/service/corporate/"],["tenth-100",756,706,"서울특별시 성동구 성수동2가","성동성수동2가법인대리운전","daeri","/service/corporate/"],["tenth-100",760,710,"부산광역시 남구 용호동","부산용호동대리운전업체","daeri","/service/corporate/"],["tenth-100",764,714,"대구광역시 달성군 옥포읍","대구옥포읍법인카드대리운전","daeri","/service/corporate/"],["tenth-100",765,715,"인천광역시 연수구 동춘동","인천동춘동대리운전업체","daeri","/service/corporate/"],["tenth-100",766,716,"인천광역시 서해구 청라동","인천청라동법인대리운전","daeri","/service/corporate/"],["tenth-100",769,719,"경기도 수원시 영통구 이의동","수원광교이의동법인카드대리운전","daeri","/service/corporate/"],["tenth-100",770,720,"경기도 성남시 분당구 삼평동","판교삼평동법인대리운전","daeri","/service/corporate/"],["tenth-100",774,724,"경기도 평택시 포승읍","평택포승읍법인대리운전","daeri","/service/corporate/"]];
 const edited=[];
 for(const [batch,id,companionId,region,keyword,kind,related] of targets){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-'+batch+'.json'),'utf8')).priority;
  const row=rows.find(r=>r.id===id),companion=rows.find(r=>r.id===companionId);
  assert.ok(row&&companion,id);
  assert.equal(row.region,region);assert.equal(companion.region,region);
  assert.equal(row.keyword,keyword);assert.equal(row.kind,kind);assert.equal(row.related,related);
  assert.notEqual(row.kind,companion.kind);
  assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,keyword);
  const locality=region.split(' ').at(-1);
  assert.ok(row.pickup.includes(locality)&&row.handover.includes(locality),keyword);
  for(const field of ['topic','pickup','handover'])assert.notEqual(row[field],companion[field]);
  assert.doesNotMatch([row.topic,row.pickup,row.handover].join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  edited.push(row);
 }
 assert.equal(edited.length,15);
 for(const k of ['topic','pickup','handover'])assert.equal(new Set(edited.map(r=>r[k])).size,15);
});

test('recruitment search uses only existing national or validated provincial destinations, and guides link to matching application pages',()=>{
 const vm=require('node:vm');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const start=server.indexOf('function recruitmentIntent('),end=server.indexOf('const recruitProvinceRows=',start);
 assert.ok(start>=0&&end>start);
 const province={full_name:'부산광역시',level:'시도',slug:'busan'};
 const district={full_name:'부산광역시 해운대구',level:'구',slug:'haeundae-gu'};
 const regionByFullName=new Map([[province.full_name,province]]);
 const nationwideExplorer={resolve(q){
  const match=q.match(/^(부산|부산해운대구)(대리운전|탁송)$/);
  return match?{kind:match[2]==='탁송'?'taksong':'daeri',region:match[1]==='부산'?province:district}:null;
 }};
 const resolve=vm.runInNewContext(server.slice(start,end)+';recruitmentIntent',{regionByFullName,nationwideExplorer});
 for(const q of ['대리기사모집','전국 대리운전기사 모집','대리기사등록'])assert.equal(resolve(q),'/recruit/daeri/',q);
 for(const q of ['탁송기사모집','전국 자동차탁송기사 모집','화물차탁송기사모집','특장차탁송기사 지원','로드탁송기사구인'])assert.equal(resolve(q),'/recruit/taksong/',q);
 assert.equal(resolve('부산대리기사모집'),'/recruit/daeri/busan/');
 assert.equal(resolve('부산해운대구탁송기사모집'),'/recruit/taksong/busan/');
 for(const q of ['부산대리운전','부산탁송','가짜지역탁송기사모집','서울에서부산탁송기사모집','부산탁송기사'])assert.equal(resolve(q),null,q);
 assert.ok(server.includes('const recruitTarget=recruitmentIntent(searchIntent);'));
 assert.ok(server.includes('id="recruit-taksong-vehicle-experience"'));
 assert.ok(server.includes('id="recruit-daeri-work-types"'));
 assert.ok(server.includes('id="recruit-registration-questions"'));
 const source=JSON.parse(fs.readFileSync(path.join(root,'data/seo-pages.json'),'utf8'));
 for(const kind of ['daeri','taksong']){
  const rule=source.pages.find(x=>x.path==='/recruit/'+kind+'/');
  assert.ok(rule.title.startsWith(kind==='daeri'?'대리기사모집':'탁송기사모집'));
  assert.ok(rule.description.includes('1811-4294'));
 }
 const heavy=fs.readFileSync(path.join(root,'service/heavy-truck-taksong/index.html'),'utf8');
 assert.ok(heavy.includes('id="heavy-truck-driver-recruitment-20261126"'));
 assert.ok(heavy.includes('href="/recruit/taksong/"'));
 assert.ok(heavy.includes('확정 채용·수입·배차를 보장하지 않습니다.'));
});

test('all 34 existing provincial recruitment pages have distinct application guidance grounded in legal areas',()=>{
 const vm=require('node:vm');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/recruitment-province-guidance-20261126.json'),'utf8'));
 const legal=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8')).full_names);
 const legalSet=new Set(legal);
 const regions=data.rows.map((x,i)=>({full_name:x.province,level:'시도',slug:'province-'+i}));
 const regionByFullName=new Map(regions.map(x=>[x.full_name,x]));
 for(const row of data.rows)for(const area of row.areas){
  const name=row.province+' '+area;
  assert.ok(legalSet.has(name),'Unknown legal locality '+name);
  regionByFullName.set(name,{full_name:name,slug:'area-'+regionByFullName.size});
 }
 const start=server.indexOf('const recruitProvinceRows='),end=server.indexOf('function recruitmentPage(',start);
 const render=vm.runInNewContext(server.slice(start,end)+';recruitmentLocalGuidance',{
  load:()=>data,regions,regionByFullName,esc:x=>String(x),servicePath:(r,k)=>'/'+k+'/'+r.slug+'/'
 });
 const textValues=new Set();
 for(const r of regions)for(const kind of ['daeri','taksong']){
  const row=data.rows.find(x=>x.province===r.full_name),html=render(r,kind);
  assert.ok(html.includes(row[kind])&&html.includes(r.full_name));
  assert.ok(html.includes(kind==='daeri'?'대리기사모집':'탁송기사모집'));
  assert.ok(row[kind].length>=65);
  assert.ok(!textValues.has(row[kind]));textValues.add(row[kind]);
  for(const a of row.areas)assert.ok(html.includes('/'+kind+'/'+regionByFullName.get(r.full_name+' '+a).slug+'/'));
  assert.ok(html.includes('일감 보장을 의미하지 않습니다'));
  assert.ok(html.includes('tel:18114294'));
 }
 assert.equal(textValues.size,34);
 assert.equal(render(null,'taksong'),'');
 assert.equal(render({full_name:'가짜지역',level:'시도'},'daeri'),'');
 assert.ok(server.includes('supportFocus+recruitmentLocalGuidance(region,kind)+registration'));
});

test('sixteen paired Dogok, Ilwon, Naegok, Ogeum, Jayang, Deungchon, Sangdo and Dadae guides retain original identities and distinct instructions',()=>{
 const daeri=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-eleventh-daeri-50.json'),'utf8')).priority;
 const taksong=JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-eleventh-taksong-50.json'),'utf8')).priority;
 const ids=[801,802,803,804,805,806,807,811];
 const fields=['topic','pickup','handover'];
 assert.equal(daeri.length,50);assert.equal(taksong.length,50);
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const id of ids){
  const a=taksong.find(r=>r.id===id),b=daeri.find(r=>r.id===id+50);
  assert.ok(a&&b,id);assert.equal(a.region,b.region);assert.equal(a.kind,'taksong');assert.equal(b.kind,'daeri');
  for(const row of [a,b]){
   const local=row.region.split(' ').at(-1);
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,16);
});

test('eighteen Gyeonggi and Yeongjong paired guides preserve exact identities and differentiated booking instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-eleventh-'+kind+'-50.json'),'utf8')).priority]));
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 const localities=['을왕동','창곡동','동천동','태전동','옥정동','화정동','병점동','장곡동','궐동'];
 for(const [i,local] of localities.entries()){
  const t=rows.taksong.find(r=>r.id===821+i),d=rows.daeri.find(r=>r.id===871+i);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');
  assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,18);
});

test('28 Daegu, Incheon, Gangwon and Chungcheong paired locality guides retain identity and distinct practical guidance',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-eleventh-'+kind+'-50.json'),'utf8')).priority]));
 const pairs=[[814,'본리동'],[816,'화원읍'],[817,'학익동'],[818,'서창동'],[819,'청학동'],[820,'작전동'],[830,'토성면'],[831,'천곡동'],[832,'석사동'],[834,'산남동'],[835,'연수동'],[836,'둔포면'],[837,'신방동'],[838,'합덕읍']];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+50);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,28);
});

test('22 southern and Jeju paired locality guides retain identity and differentiated customer instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-eleventh-'+kind+'-50.json'),'utf8')).priority]));
 const pairs=[[839,'중화산동2가'],[840,'나운동'],[841,'영등동'],[842,'학동'],[843,'중동'],[844,'양덕동'],[845,'옥계동'],[846,'합성동'],[847,'고현동'],[849,'이도이동'],[850,'강정동']];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+50);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,22);
});

test('22 Seoul twelfth-batch paired guides preserve locality identity and separate practical service instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-twelfth-'+kind+'-100.json'),'utf8')).priority]));
 const pairs=[[902,'세곡동'],[903,'논현동'],[904,'우면동'],[905,'신원동'],[906,'거여동'],[907,'삼전동'],[908,'신길동'],[909,'대림동'],[910,'가산동'],[911,'목동'],[912,'행당동']];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+100);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,22);
});

test('18 Busan twelfth-batch paired guides preserve locality identity and separate practical service instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-twelfth-'+kind+'-100.json'),'utf8')).priority]));
 const pairs=[[914,"안락동"],[915,"가야동"],[916,"개금동"],[917,"장전동"],[918,"신호동"],[919,"엄궁동"],[920,"장림동"],[921,"괴정동"],[922,"거제동"]];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+100);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,18);
});

test('14 Daegu twelfth-batch paired guides preserve locality identity and separate practical service instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-twelfth-'+kind+'-100.json'),'utf8')).priority]));
 const pairs=[[924,"봉무동"],[925,"시지동"],[926,"수성동4가"],[927,"진천동"],[928,"장기동"],[929,"구암동"],[930,"동천동"]];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+100);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,14);
});

test('14 Incheon twelfth-batch paired guides preserve locality identity and separate practical service instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-twelfth-'+kind+'-100.json'),'utf8')).priority]));
 const pairs=[[932,"십정동"],[933,"갈산동"],[934,"청천동"],[935,"고잔동"],[936,"임학동"],[937,"운북동"],[938,"강화읍"]];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+100);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,14);
});

test('26 Gyeonggi twelfth-batch paired guides preserve locality identity and separate practical service instructions',()=>{
 const fields=['topic','pickup','handover'];
 const rows=Object.fromEntries(['taksong','daeri'].map(kind=>[kind,JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-twelfth-'+kind+'-100.json'),'utf8')).priority]));
 const pairs=[[940,"상대원동"],[941,"청계동"],[942,"봉담읍"],[943,"초지동"],[944,"행신동"],[945,"원흥동"],[946,"고촌읍"],[947,"양촌읍"],[948,"별내동"],[949,"진접읍"],[950,"용문면"],[951,"청평면"],[952,"안중읍"]];
 const seen=Object.fromEntries(fields.map(k=>[k,new Set()]));
 for(const [id,local] of pairs){
  const t=rows.taksong.find(r=>r.id===id),d=rows.daeri.find(r=>r.id===id+100);
  assert.ok(t&&d,local);assert.equal(t.region,d.region);assert.equal(t.kind,'taksong');assert.equal(d.kind,'daeri');assert.equal(t.region.split(' ').at(-1),local);
  for(const row of [t,d]){
   assert.ok(row.topic.length>=13&&row.pickup.length>=80&&row.handover.length>=75,row.keyword);
   assert.ok(row.related,row.keyword);
   for(const field of fields){assert.ok(row[field].includes(local),row.keyword);assert.ok(!seen[field].has(row[field]),row.keyword);seen[field].add(row[field]);}
   assert.doesNotMatch(fields.map(k=>row[k]).join(' '),/\d{1,3}(?:,\d{3})*원|\d{1,4}만원|배차\s*완료|운행\s*완료|100%\s*(?:보장|배차)|무조건\s*배차/);
  }
 }
 for(const field of fields)assert.equal(seen[field].size,26);
});
