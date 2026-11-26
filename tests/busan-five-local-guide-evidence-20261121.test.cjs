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
