'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { matchTopics } = require('../lib/blog-search-topics');

// Usage: node scripts/blog-search-coverage.js [observations.json] [blog/posts.json]
// Competitor ranking observations must be manually verified on the same date,
// device and result tab. This script never creates synthetic ranking claims.
function jsonFile(file) {
  const result = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!Array.isArray(result)) throw new TypeError(file+' must contain a JSON array');
  return result;
}
const observations = process.argv[2] ? jsonFile(process.argv[2]) : [];
const archive = process.argv[3] ? jsonFile(process.argv[3]) : undefined;
const archiveAvailable = Boolean(archive || fs.existsSync(path.join(__dirname,'../blog/posts.json')));
const topics = archive ? matchTopics([],archive) : matchTopics();
const fields = ['date','device','area','smart24','darigo','kDaeri','goldTaksong'];
const report = topics.map(topic => {
  const samples = observations.filter(x => x && x.query === topic.query && fields.every(k=>x[k]===undefined || ['string','number'].includes(typeof x[k])));
  return {
    query:topic.query,service:topic.kind,group:topic.group,
    page:topic.path,matchedOriginals:archiveAvailable ? topic.totalMatches : null,
    visibleOriginals:topic.posts.length,
    nextAction:topic.totalMatches ? '공개 원문·서비스 링크 정확성 및 실제 검색성과 확인' : '게시된 원문·현장 자료 확인 후 관련 글 연결',
    observations:samples.map(row => Object.fromEntries(fields.map(k=>[k,row[k]??null])))
  };
});
console.log(JSON.stringify({
  generatedAt:new Date().toISOString(),
  source:archiveAvailable?'저장된 네이버 공개 원문 제목. 검색 순위는 미수집':'원본 blog/posts.json 미제공: 매칭 건수 미확인. 검색 순위는 미수집',
  summary:{topics:report.length,withMatchedOriginals:archiveAvailable?report.filter(x=>x.matchedOriginals>0).length:null,withoutMatchedOriginals:archiveAvailable?report.filter(x=>x.matchedOriginals===0).length:null,manualObservations:report.reduce((s,x)=>s+x.observations.length,0)},
  topics:report
},null,2));
