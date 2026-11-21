'use strict';
// Source integrity and editorial quality guard for national 3rd editing round.
// These are service-preparation guides, NOT verified completed trips.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const ids={
  daeri:[1401,1416,1424,1429,1436,1456,1465,1467,1472,1476,1480,1485,1490,1494,1498,1499],
  taksong:[1301,1316,1324,1331,1338,1356,1363,1367,1374,1378,1381,1386,1390,1394,1398,1399]
};
const base=kind=>JSON.parse(fs.readFileSync(path.join(root,'data','naver-regional-focus-fourteenth-'+kind+'-100.json'),'utf8')).priority;
const province=region=>region.split(/\s+/)[0];
test('retain all 200 source-defined originals, both services, and all 17 province groups',()=>{
  for(const kind of ['daeri','taksong']){
    const rows=base(kind);
    assert.equal(rows.length,100);
    assert.equal(new Set(rows.map(x=>x.id)).size,100);
    assert.equal(new Set(rows.map(x=>province(x.region))).size,17);
    assert.ok(rows.every(x=>x.kind===kind&&x.keyword&&x.region&&x.related.startsWith('/')));
  }
});
test('32 edited guides have distinct grounded location and service checklists, no synthetic ride histories',()=>{
  const seenPickup=new Set(),seenHandover=new Set(),seenProvinces=new Set();
  for(const kind of ['daeri','taksong']){
    const rows=base(kind);
    const edited=ids[kind].map(id=>rows.find(x=>x.id===id));
    assert.ok(edited.every(Boolean));
    for(const x of edited){
      const locality=x.region.split(/\s+/).at(-1);
      assert.ok(x.pickup.length>=110&&x.handover.length>=110,'Thin checklist '+x.id);
      assert.ok(x.topic.length>=13,'Thin topic '+x.id);
      assert.ok(x.pickup.includes(locality)&&x.handover.includes(locality),'Locality missing '+x.id);
      assert.doesNotMatch(x.pickup+x.handover,/100%\s*(?:보장|배차)|상시\s*상주|완료\s*후기|실제\s*운행\s*완료/,'Misleading history '+x.id);
      if(kind==='daeri')assert.notEqual(x.handover,'심야 출발은 정확한 귀가 목적지·경유 여부와 주차장 출차 가능시간을 정한 뒤 기사 접근·복귀를 상담합니다.');
      if(kind==='taksong')assert.notEqual(x.handover,'방문차량 등록·주차권 정산과 차량 키 전달권한을 확인하고 목적지 수령인과 인계할 장소를 지정합니다.');
      assert.ok(!seenPickup.has(x.pickup),'Duplicated pickup '+x.id);
      assert.ok(!seenHandover.has(x.handover),'Duplicated handover '+x.id);
      seenPickup.add(x.pickup);seenHandover.add(x.handover);
      seenProvinces.add(province(x.region));
    }
  }
  assert.equal(seenPickup.size,32);
  assert.equal(seenHandover.size,32);
  assert.equal(seenProvinces.size,16);
  // The existing reviewed Sejong source paragraphs are intentionally preserved.
  assert.ok(base('daeri').find(x=>x.id===1500).handover.length>75);
  assert.ok(base('taksong').find(x=>x.id===1400).handover.length>75);
});
