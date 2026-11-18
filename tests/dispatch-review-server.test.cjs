'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createDispatchReviewArchive } = require('../lib/dispatch-review-archive');

const archive = createDispatchReviewArchive(path.resolve(__dirname, '..'));

test('server archive generates the hub and 45 source-backed collection pages', () => {
  assert.deepEqual(archive.stats, { sourceRows: 2600, uniqueGroups: 2541, pageCount: 45, routeCount: 46,
    serviceRows: { '대리운전': 1716, '탁송': 863, '일일기사': 21 },
    distanceRecordedRows: 2546, distanceMissingRows: 54, destinationMissingRows: 11,
    duplicateValueGroups: 47, repeatedSourceRows: 59 });
  assert.match(archive.get('/reviews/dispatch-records/'), /전국 실제 운행기록 후기 자료실/);
  assert.match(archive.get('/reviews/dispatch-records/'), /원본 완료 2,600행/);
  assert.equal(archive.get('/reviews/dispatch-records/unknown/'), null);
});

test('server sitemap points to all 46 pages exactly once', () => {
  const urls = [...archive.sitemap.matchAll(/<loc>(https:\/\/jeongukdaeri\.kr[^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(urls.length, 46);
  assert.equal(new Set(urls).size, 46);
  assert.ok(urls.includes('https://jeongukdaeri.kr/reviews/dispatch-records/'));
});

test('server-rendered pages preserve every grouped record once and expose only factual columns', () => {
  const idCounts = new Map();
  let tableRows = 0;
  for (const url of [...archive.sitemap.matchAll(/<loc>https:\/\/jeongukdaeri\.kr([^<]+)<\/loc>/g)].map(m => m[1])) {
    const html = archive.get(url.replace('https://jeongukdaeri.kr',''));
    assert.ok(html, `missing route ${url}`);
    assert.match(html, /<meta name="robots" content="index,follow/);
    assert.match(html, /<link rel="canonical"/);
    if (url.endsWith('/reviews/dispatch-records/')) continue;
    for (const m of html.matchAll(/data-record-id="([a-f0-9]{16})"/g)) {
      idCounts.set(m[1], (idCounts.get(m[1]) || 0) + 1);
      tableRows++;
    }
    assert.match(html, /동일 값 원본행/);
    assert.match(html, /당시 기록요금/);
  }
  assert.equal(idCounts.size, 2541);
  assert.equal([...idCounts.values()].every(n => n === 1), true);
  assert.equal(tableRows, 2541);
});
