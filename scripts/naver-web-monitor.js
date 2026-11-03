'use strict';
const fs = require('node:fs');
const QUERY = '전국대리운전';
const DOMAIN = 'jeongukdaeri.kr';
const CORE_PAGES = ['/', '/taksong/daegu/suseong-gu/', '/taksong/daegu/dalseo-gu/', '/taksong/daegu/buk-gu/', '/taksong/daegu/dong-gu/', '/taksong/daegu/jung-gu/', '/taksong/busan/dongnae-gu/', '/taksong/busan/geumjeong-gu/', '/taksong/busan/buk-gu/', '/taksong/busan/yeonje-gu/', '/taksong/busan/suyeong-gu/', '/taksong/busan/haeundae-gu/', '/taksong/busan/gangseo-gu/', '/taksong/busan/saha-gu/', '/taksong/busan/gijang-gun/', '/service/taksong/', '/reviews/taksong/', '/region/busan-daeri-taksong/', '/region/daegu-daeri-taksong/', '/region/gangwon-daeri-taksong/', '/daeri/', '/taksong/', '/fare/', '/reviews/', '/reviews/history/', '/reviews/ride-record-stories/', '/reviews/verified/', '/special/cycling-trail-transport/', '/service/long-distance-taksong/', '/service/golf/', '/service/daily-driver/', '/service/corporate/', '/daeri/busan/', '/daeri/seoul/', '/daeri/seoul/gangnam-gu/', '/daeri/busan/haeundae-gu/', '/daeri/daegu/', '/daeri/daegu/suseong-gu/', '/daeri/incheon/', '/daeri/gyeonggi/yongin-si/', '/daeri/gangwon/sokcho-si/', '/taksong/busan/', '/taksong/ulsan/', '/taksong/ulsan/nam-gu/', '/taksong/ulsan/ulju-gun/', '/taksong/daegu/', '/taksong/gangwon/', '/설악산탁송/', '/지리산탁송/', '/taksong/gyeongnam/changwon-si/', '/route-taksong/', '/route-taksong/centers/'];
const QUERIES = [QUERY, '인천탁송', '제주도탁송', '렌트카탁송', '중고차탁송', '울산탁송', '울산전국탁송', '울산남구탁송', '울산동구탁송', '울산북구탁송', '울주군탁송', '부산해운대구탁송', '창원탁송', '창원전국탁송', '부산전국탁송', '설악산탁송 요금표', '지리산탁송 요금표', '수성구탁송', '범어동탁송', '달서구탁송', '상인동탁송', '대구북구탁송', '침산동탁송', '대구동구탁송', '신천동탁송', '대구중구탁송', '삼덕동탁송', '부산진구탁송', '대연동탁송', '토성동탁송', '초량동탁송', '남포동탁송', '동래구탁송', '온천동탁송', '사직동탁송', '금정구탁송', '장전동탁송', '구서동탁송', '북구탁송', '화명동탁송', '덕천동탁송', '연제구탁송', '연산동탁송', '수영구탁송', '광안동탁송', '민락동탁송', '기장군자동차탁송', '정관로드탁송', '일광로드탁송', '해운대구로드탁송', '부산서구토성동탁송', '자동차탁송요금', '로드탁송요금', '자동차탁송실제후기', '해운대구탁송', '우동탁송', '중동탁송', '좌동탁송', '강서구탁송', '명지동탁송', '녹산동탁송', '사하구탁송', '하단동탁송', '다대동탁송', '기장군탁송', '기장읍탁송', '정관탁송', '정관읍탁송', '일광탁송', '일광읍탁송', '기장군로드탁송', '로드탁송', '자동차탁송', '경포대통일전망대탁송', '24시탁송', '전국대리운전·24시탁송', '전국자동차탁송', '화성동탄광주광역시탁송', '청주우암동대구탁송', '서울원주장거리탁송', '인천주안대구장거리대리운전', '강원랜드횡성새벽대리운전', '인천광주장거리탁송', '부산강릉장거리탁송', '서울목포장거리탁송', '인천부산장거리대리운전', '대전서울장거리대리운전', '부산서울장거리탁송', '대구인천자동차탁송', '광주부산자동차탁송', '부산서울장거리대리운전', '강릉서울장거리대리운전', '부산대구장거리탁송', '대구포항자동차탁송', '목포서울자동차탁송', '목포서울장거리대리운전', '서울대구장거리대리운전', '서울부산장거리탁송', '인천공항파주탁송', '강릉서울장거리탁송', '대구포항장거리대리운전', '강원랜드횡성장거리대리운전', '장거리대리운전', '서울부산대리운전', '인천대구대리운전', '심야장거리대리운전', '강원랜드장거리대리운전', '장거리탁송', '장거리자동차탁송', '서비스센터탁송', '골프대리운전', '일일기사', '스마트24', DOMAIN, DOMAIN+'/fare/', DOMAIN+'/reviews/', DOMAIN+'/service/daily-driver/', DOMAIN+'/service/corporate/', '부산인천탁송', '기장군대구탁송', '대구서울대리운전', '서울부산탁송', '김해공항서울탁송', '김해공항인천탁송', '강릉서울탁송', '서울대구대리운전', '강릉인천탁송', '울진영덕탁송', '부산탁송', '부산대리운전', '대구탁송', '강원도탁송', '서울대리운전', '강남대리운전', '해운대대리운전', '대구대리운전', '수성구대리운전', '인천대리운전', '용인대리운전', '김해대리운전', '속초대리운전', '강원도대리운전', '설악산탁송', '백담사탁송', '한계령탁송', '오색탁송', '경포대탁송', '영덕탁송', '담양댐탁송', '장거리탁송후기', '자동차탁송운행완료후기', '설악산종주탁송', '오색소공원탁송', '지리산탁송', '지리산종주탁송', '성삼재중산리탁송', '자전거길종주탁송', '자전거길탁송', '동해안자전거길종주탁송', '섬진강자전거길종주탁송', '영산강자전거길종주탁송', '금강자전거길종주탁송', '낙동강자전거길종주탁송', '동해안길종주', '섬진강길종주', '영산강길종주', '금강길종주', '낙동강길종주', '한강자전거길종주', '북한강자전거길종주', '오천자전거길종주', '새재자전거길종주', '국토종주자전거길', '영산강길자전거종주', '영산강길자전거종주 차량회수방법', '자전거길종주 완벽정리', '설악산종주 완벽정리', '지리산종주 완벽정리', '오색종주', '서북능선종주', '공룡능선종주', '성삼재중산리종주', '설악산 대청봉', '오색 소공원 하산', '한계령 대청봉', '지리산 천왕봉 중산리', '성삼재 대원사 종주', '오색 대청봉 천불동 소공원', '한계령 서북능선 백담사', '공룡능선 소공원 하산', '지리산 성중종주', '지리산 화대종주', '지리산천왕봉'];
const COMPARISONS = ['gosudaeri.com', 'k-daeri.com', '8882888.github.io'];
const TARGET_LANDINGS = Object.freeze({
  '전국대리운전':'/daeri/','부산탁송':'/taksong/busan/','울산탁송':'/taksong/ulsan/',
  '대구탁송':'/taksong/daegu/','인천탁송':'/taksong/incheon/',
  '창원탁송':'/taksong/gyeongnam/changwon-si/','기장군탁송':'/taksong/busan/gijang-gun/',
  '제주도탁송':'/taksong/jeju/','렌트카탁송':'/business/rental-car/',
  '중고차탁송':'/business/used-car/',
  '설악산탁송':'/설악산탁송/','오색탁송':'/설악산탁송/','한계령탁송':'/설악산탁송/',
  '지리산탁송':'/지리산탁송/','성삼재중산리탁송':'/지리산탁송/'
});
function targetLandingEvidence(results) {
 return results.filter(r=>Object.hasOwn(TARGET_LANDINGS,r.query)).map(r=>{
  const targetPath=TARGET_LANDINGS[r.query];
  const matching=(r.matches||[]).filter(m=>{try{
   const url=new URL(m.url);
   return url.hostname===DOMAIN && (decodeURIComponent(url.pathname).replace(/\/?$/, '/')===targetPath);
  }catch{return false}});
  return {query:r.query,targetPath,position:matching.length?Math.min(...matching.map(m=>m.position)):null,
   otherSitePages:(r.matches||[]).filter(m=>!matching.includes(m)).map(m=>({position:m.position,url:m.url})),
   status:r.error?'query-failed':matching.length?'target-observed':(r.matches||[]).length?'only-other-site-pages-observed':'site-not-observed-in-returned-results',
   limitation:'Web-document API top 100 only. This does not establish Naver integrated search rank or URL-level indexing.'};
 });
}

const WEB_BASELINE=require('../audit/naver-web-baseline-2026-11-03.json');
function compareBaseline(results,baseline=WEB_BASELINE){
 const sampled=new Map(results.map(r=>[r.query,r]));
 return baseline.records.map(b=>{
  const r=sampled.get(b.query);
  if(!r)return {query:b.query,baselineBest:b.sitePositions[0]??null,currentBest:null,status:'not-sampled-today'};
  if(r.error)return {query:b.query,baselineBest:b.sitePositions[0]??null,currentBest:null,status:'query-failed'};
  const prev=b.sitePositions.length?Math.min(...b.sitePositions):null;
  const curr=(r.matches||[]).length?Math.min(...r.matches.map(m=>m.position)):null;
  let status='not-observed-in-either-top100';
  if(prev!==null&&curr===null)status='previously-observed-now-absent';
  else if(prev===null&&curr!==null)status='newly-observed-in-api-top100';
  else if(prev!==null&&curr!==null)status=curr<prev?'improved-in-api-top100':curr>prev?'lower-in-api-top100':'same-api-position';
  return {query:b.query,baselineBest:prev,currentBest:curr,status};
 });
}
const LEGACY_DRIVER_URLS = ['/service/daeri/', '/special/nationwide-daeri/'];
const ALWAYS_CHECK = ['전국대리운전','설악산탁송','지리산탁송','오색탁송','한계령탁송','부산탁송','울산탁송','대구탁송','창원탁송','기장군탁송','성삼재중산리탁송','인천탁송','제주도탁송','렌트카탁송','중고차탁송'];
const FOCUS_50=require('../data/naver-regional-focus-50.json').priority.map(p=>p.keyword);
const FOCUS_NEXT_50=require('../data/naver-regional-focus-next-50.json').priority.map(p=>p.keyword);
const FOCUS_THIRD_50=require('../data/naver-regional-focus-third-50.json').priority.map(p=>p.keyword);
const FOCUS_150=[...FOCUS_50,...FOCUS_NEXT_50,...FOCUS_THIRD_50];
if(FOCUS_50.length!==50||FOCUS_NEXT_50.length!==50||FOCUS_THIRD_50.length!==50||new Set(FOCUS_150).size!==150)
 throw Error('Invalid 150-keyword local SEO tracking inventory');
const FOCUS_OPTIONAL=FOCUS_150.filter(q=>!ALWAYS_CHECK.includes(q));
const LEGACY_OPTIONAL=QUERIES.filter(q=>!ALWAYS_CHECK.includes(q)&&!FOCUS_150.includes(q));
// Maintain 20 Naver Web Document API checks/day: 15 established search terms,
// 4 rotating region keywords from 150 curated pages, 1 long-tail. Every
// new focus term is checked within a full 45-day rotation, without API floods.
function selectQueries(now = new Date()) {
  const day=Math.floor(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())/86400000);
  const pick=(items,count)=>Array.from({length:count},(_,i)=>items[(day*count+i)%items.length]);
  return [...ALWAYS_CHECK,...pick(FOCUS_OPTIONAL,4),...pick(LEGACY_OPTIONAL,1)];
}


function inspect(items, domain = DOMAIN) {
  return items.map((item, index) => {
    try {
      const url = new URL(item.link);
      if (!['http:', 'https:'].includes(url.protocol) || !(url.hostname === domain || url.hostname.endsWith('.' + domain))) return null;
      return { position: index + 1, url: url.href, title: String(item.title || '').replace(/<[^>]*>/g, '') };
    } catch { return null; }
  }).filter(Boolean);
}
function legacyDriverEvidence(results) {
  return results.flatMap(r=>(r.matches||[]).filter(m=>{
    try{const u=new URL(m.url);return u.hostname===DOMAIN&&LEGACY_DRIVER_URLS.includes(decodeURIComponent(u.pathname.endsWith('/')?u.pathname:u.pathname+'/'))}catch{return false}
  }).map(m=>({query:r.query,position:m.position,url:m.url,title:m.title})));
}
function pageEvidence(results) {
  return CORE_PAGES.map(path => {
    const found = results.flatMap(result => (result.matches || []).filter(match => {
      try { const u = new URL(match.url); return u.hostname === DOMAIN && (decodeURIComponent(u.pathname).endsWith('/') ? decodeURIComponent(u.pathname) : decodeURIComponent(u.pathname) + '/') === path; } catch { return false; }
    }).map(match => ({query: result.query, position: match.position, url: match.url, title: match.title})));
    return {path, status: found.length ? 'observed-in-api-results' : 'not-observed-in-these-results', found, limitation: 'This is search-result evidence, not Search Advisor URL inspection or a complete index count.'};
  });
}
async function main() {
  const id = process.env.NAVER_SEARCH_CLIENT_ID, secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('NAVER_SEARCH_CLIENT_ID and NAVER_SEARCH_CLIENT_SECRET are required');
  const results = [];
  let failures = 0;
  for (const query of selectQueries()) {
    try {
      const endpoint = new URL('https://naverapihub.apigw.ntruss.com/search/v1/webkr');
      endpoint.search = new URLSearchParams({ query, display: '100', start: '1' }).toString();
      const response = await fetch(endpoint, {headers: {'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret}, signal: AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error('Naver Search API returned HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error('Invalid Naver Search API response: items missing');
      results.push({query, checkedAt: new Date().toISOString(), inspected: data.items.length, total: data.total, matches: inspect(data.items), comparisons: Object.fromEntries(COMPARISONS.map(domain => [domain, inspect(data.items, domain)]))});
    } catch (error) {
      failures++;
      results.push({query, checkedAt: new Date().toISOString(), error: error.message});
      // Respect Naver rate limits; trying the rest after HTTP 429 cannot help.
      if(/HTTP 429/.test(error.message))break;
    }
  }
  const focusedResults=results.filter(r=>FOCUS_150.includes(r.query)).map(r=>({query:r.query,checkedAt:r.checkedAt,bestApiResultPosition:r.matches?.length?Math.min(...r.matches.map(x=>x.position)):null,matchedSitePages:(r.matches||[]).map(x=>x.url),error:r.error||null,limitation:'Web-document API top 100 only; not Naver unified/mobile ranking or indexing proof'}));
  const result = {source: 'Naver Search API: web documents', query: QUERY, checkedAt: new Date().toISOString(), queryCatalogCount:new Set([...QUERIES,...FOCUS_150]).size, selectedQueries:selectQueries(), focusKeywordInventoryCount:FOCUS_150.length, focusedResults, ...results[0], results, pageEvidence: pageEvidence(results), targetLandingEvidence: targetLandingEvidence(results), baselineComparison: compareBaseline(results), legacyDriverCandidates: legacyDriverEvidence(results), limitation: 'Positions are within the returned web-document API results, not Naver integrated search rankings. This API does not expose mobile Naver sitelinks. No match does not prove a page is not indexed.'};
  fs.writeFileSync('naver-web-monitor-result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map(r => '| ' + r.query + ' | ' + (r.error ? 'ERROR' : r.matches.length ? r.matches.map(x => x.position).join(', ') : 'Not found in first ' + r.inspected) + ' | ' + (r.error || COMPARISONS.map(d => d + ': ' + (r.comparisons[d].map(x => x.position).join(', ') || '—')).join('; ')) + ' |');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Naver web-document visibility\n\nNot integrated search rankings; absence does not prove exclusion from the index.\n\n| Query | Smart24 positions | Comparison positions |\n|---|---|---|\n' + rows.join('\n') + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = result.pageEvidence.map(page => '| ' + page.path + ' | ' + (page.found.length ? '검색 결과 발견' : '이번 결과에서 미발견') + ' | ' + (page.found[0]?.title || '—') + ' |');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## 핵심 페이지 검색 결과 확인\n\n서치어드바이저 색인 검사와 다릅니다. 미발견은 색인 제외를 뜻하지 않습니다.\n\n| 페이지 | 확인 결과 | 검색에 표시된 제목 |\n|---|---|---|\n' + rows.join('\n') + '\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows=focusedResults.map(r=>'| '+r.query+' | '+(r.error || (r.bestApiResultPosition ?? '상위 100개 결과 미발견'))+' | '+r.matchedSitePages.length+' |');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## 150개 지역 키워드 순환 실측\n\n네이버 웹문서 API의 결과 순번만 의미하며 통합검색 노출·색인 등급·실제 고객 클릭을 의미하지 않습니다.\n\n| 검색어 | API 순번 | 사이트 결과 수 |\n|---|---:|---:|\n'+rows.join('\n')+'\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows=result.targetLandingEvidence.map(x=>'| '+x.query+' | '+x.targetPath+' | '+(x.position??'미발견')+' | '+x.status+' | '+x.otherSitePages.map(p=>p.position).join(', ')+' |');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## 키워드별 대표 페이지 도달 여부\n\n홈페이지가 잡혀도 해당 지역 전용 페이지가 미발견이면 별도로 표시합니다. 네이버 통합검색 순위나 URL별 색인 상태는 아닙니다.\n\n| 검색어 | 목표 URL | 웹문서 API 순번 | 상태 | 타 페이지 순번 |\n|---|---|---:|---|---|\n'+rows.join('\n')+'\n');
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows=result.baselineComparison.map(x=>'| '+x.query+' | '+(x.baselineBest??'—')+' | '+(x.currentBest??'—')+' | '+x.status+' |');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n## 11월 3일 기준 대비 웹문서 결과 변화\n\n상위 100개 웹문서 API 위치만 비교합니다. 검색 노출 총량·통합검색 순위·색인 상태의 변화라고 단정하지 않습니다.\n\n| 검색어 | 11/3 기준 위치 | 이번 검사 위치 | 변화 분류 |\n|---|---:|---:|---|\n'+rows.join('\n')+'\n');
  }
  if (failures) throw new Error(failures + ' selected query checks failed; partial results saved');
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { inspect, QUERIES, FOCUS_50, FOCUS_NEXT_50, FOCUS_THIRD_50, FOCUS_150, CORE_PAGES, pageEvidence, targetLandingEvidence, TARGET_LANDINGS, compareBaseline, legacyDriverEvidence, selectQueries };
