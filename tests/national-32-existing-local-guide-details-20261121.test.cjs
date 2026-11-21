'use strict';
// Verify the first geographically balanced editing batch changes existing
// editorial guidance only. This is NOT trip evidence or a Naver index report.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const provinces = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시',
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도',
  '제주특별자치도'
];
const changed = {
  daeri: [1601,1611,1620,1627,1634,1639,1644,1652,1672,1678,1681,1684,1687,1690,1693,1696],
  taksong: [1501,1511,1520,1527,1534,1539,1544,1552,1572,1578,1581,1584,1587,1590,1593,1596]
};
test('existing 100 daeri and 100 taksong guides retain source identity and 17-province representation', () => {
  for (const kind of ['daeri', 'taksong']) {
    const file = path.join(root, 'data', 'naver-regional-focus-fifteenth-' + kind + '-100.json');
    const rows = JSON.parse(fs.readFileSync(file, 'utf8')).priority;
    assert.equal(rows.length, 100);
    assert.equal(new Set(rows.map(x => x.id)).size, 100);
    assert.deepEqual([...new Set(rows.map(x => x.region.split(/\s+/)[0]))].sort(), [...provinces].sort());
    assert.ok(rows.every(x => x.kind === kind));
    assert.ok(rows.every(x => x.related && x.related.startsWith('/')));
  }
});
test('32 locality-specific existing guides have sufficient useful context, without new trips or prices', () => {
  const modified = [];
  for (const kind of ['daeri', 'taksong']) {
    const rows = JSON.parse(fs.readFileSync(path.join(root, 'data', 'naver-regional-focus-fifteenth-' + kind + '-100.json'), 'utf8')).priority;
    for (const id of changed[kind]) {
      const row = rows.find(x => x.id === id);
      assert.ok(row, 'missing original guide ' + id);
      assert.ok(row.topic.length >= 13, id + ' short topic');
      assert.ok(row.pickup.length >= 105, id + ' short pickup');
      assert.ok(row.handover.length >= 110, id + ' short handover');
      const locality = row.region.split(/\s+/).at(-1);
      assert.ok(row.pickup.includes(locality), id + ' pickup omits local area');
      assert.ok(row.handover.includes(locality), id + ' handover omits local area');
      assert.doesNotMatch(row.topic + row.pickup + row.handover,
        /(?:배차\s*100%\s*보장|운행\s*완료했습니다|실제\s*운행\s*후기|상시\s*상주\s*기사)/);
      modified.push(row);
    }
  }
  assert.equal(modified.length, 32);
  assert.equal(new Set(modified.map(x => x.region.split(/\s+/)[0])).size, 16);
  const texts = modified.map(x => x.pickup + ' ' + x.handover);
  assert.equal(new Set(texts).size, 32, 'identical guidance must not be duplicated');
  // 세종 집현동의 구체적인 기존 2개 안내는 인위적으로 늘리지 않는다.
  const daeri = JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-fifteenth-daeri-100.json'),'utf8')).priority;
  const taksong = JSON.parse(fs.readFileSync(path.join(root,'data/naver-regional-focus-fifteenth-taksong-100.json'),'utf8')).priority;
  assert.ok(daeri.find(x => x.id === 1649).pickup.length >= 105);
  assert.ok(taksong.find(x => x.id === 1549).handover.length >= 110);
});
