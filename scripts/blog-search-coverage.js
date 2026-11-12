'use strict';

const { readFileSync } = require('node:fs');
const { matchTopics } = require('../lib/blog-search-topics');

// Observations are manually recorded from the same Naver screen and date.
const observationFile = process.argv[2];
const observations = observationFile ? JSON.parse(readFileSync(observationFile, 'utf8')) : [];
if (!Array.isArray(observations)) throw new Error('관측 파일은 JSON 배열이어야 합니다.');

const report = matchTopics().map(topic => {
  const samples = observations.filter(row => row.query === topic.query);
  return {
    query: topic.query,
    page: topic.path,
    matchedOriginals: topic.posts.length,
    nextAction: topic.posts.length === 0 ? '원문 후보와 현장 정보 확인' : '현재 원문과 예약 안내 검토',
    observations: samples.map(({ date, device, area, smart24, darigo, kDaeri, goldTaksong }) => ({
      date, device, area, smart24, darigo, kDaeri, goldTaksong
    }))
  };
});
console.log(JSON.stringify(report, null, 2));
