'use strict';
// The second nationwide editing round replaces repeated templated locality copy.
// This guard checks preservation and scope; it cannot authenticate completed rides.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = {
  daeri: 'data/naver-regional-focus-sixteenth-daeri-100.json',
  taksong: 'data/naver-regional-focus-sixteenth-taksong-100.json'
};
const ids = {
  daeri: [1801,1811,1819,1827,1833,1837,1841,1848,1868,1876,1879,1882,1886,1888,1891,1896],
  taksong: [1701,1711,1719,1727,1733,1737,1741,1748,1768,1776,1779,1782,1786,1788,1791,1796]
};
const expectedProvinces = [
  '서울특별시','부산광역시','대구광역시','인천광역시','광주광역시',
  '대전광역시','울산광역시','세종특별자치시','경기도',
  '강원특별자치도','충청북도','충청남도','전북특별자치도',
  '전라남도','경상북도','경상남도','제주특별자치도'
];
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).priority;
test('both original 100-entry sixteenth batches retain 17-province and service coverage', () => {
  for (const kind of Object.keys(files)) {
    const rows = read(files[kind]);
    assert.equal(rows.length,100);
    assert.equal(new Set(rows.map(x => x.id)).size,100);
    assert.ok(rows.every(x => x.kind === kind && x.related.startsWith('/')));
    assert.deepEqual([...new Set(rows.map(x => x.region.split(/\s+/)[0]))].sort(),expectedProvinces.slice().sort());
  }
});
test('32 revised service guides have truly distinct paragraphs without generic locality boilerplate', () => {
  const changed = [];
  for (const kind of Object.keys(files)) {
    const rows = read(files[kind]);
    for (const id of ids[kind]) {
      const row = rows.find(x => x.id === id);
      assert.ok(row, 'Original source ID missing: '+id);
      const locality = row.region.split(/\s+/).at(-1);
      const combined = row.topic+' '+row.pickup+' '+row.handover;
      assert.ok(row.topic.length >= 13, 'Thin topic: '+id);
      assert.ok(row.pickup.length >= 80 && row.handover.length >= 75, 'Thin guidance: '+id);
      assert.ok(row.pickup.includes(locality) && row.handover.includes(locality), 'Locality mismatch: '+id);
      assert.doesNotMatch(combined,/동 지역은 건물 출입구|차량 이용 안내:|출발·도착 상담:/,'Old generic boilerplate: '+id);
      assert.doesNotMatch(combined,/100%\s*(?:보장|배차)|상시\s*상주|즉시\s*배차\s*보장|운행\s*완료했습니다|실제\s*운행\s*후기/,'Unverified completion: '+id);
      changed.push(row);
    }
  }
  assert.equal(changed.length,32);
  assert.equal(new Set(changed.map(x=>x.region.split(/\s+/)[0])).size,16);
  assert.equal(new Set(changed.map(x=>x.pickup)).size,32,'Repeated pickup');
  assert.equal(new Set(changed.map(x=>x.handover)).size,32,'Repeated handover');
  assert.ok(read(files.daeri).find(x=>x.id===1845).pickup.length>=80, 'Keep already reviewed Sejong content');
  assert.ok(read(files.taksong).find(x=>x.id===1745).handover.length>=75, 'Keep already reviewed Sejong content');
});
