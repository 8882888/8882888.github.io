'use strict';
const fs = require('node:fs');
const QUERY = '전국대리운전';
const DOMAIN = 'jeongukdaeri.kr';
const CORE_PAGES = ['/', '/daeri/', '/taksong/', '/fare/', '/reviews/', '/service/golf/', '/service/daily-driver/', '/service/corporate/', '/daeri/busan/', '/daeri/seoul/', '/daeri/seoul/gangnam-gu/', '/daeri/busan/haeundae-gu/', '/daeri/daegu/', '/daeri/daegu/suseong-gu/', '/daeri/incheon/', '/daeri/gyeonggi/yongin-si/', '/daeri/gangwon/sokcho-si/', '/taksong/busan/', '/taksong/daegu/', '/taksong/gangwon/', '/special/seoraksan-transport/', '/special/jirisan-transport/', '/route-taksong/', '/route-taksong/centers/'];
const QUERIES = [QUERY, '24시탁송', '전국대리운전·24시탁송', '전국자동차탁송', '부산대구장거리탁송', '대구포항자동차탁송', '목포서울자동차탁송', '목포서울장거리대리운전', '서울대구장거리대리운전', '서울부산장거리탁송', '인천공항파주탁송', '강릉서울장거리탁송', '대구포항장거리대리운전', '강원랜드횡성장거리대리운전', '장거리대리운전', '서울부산대리운전', '인천대구대리운전', '심야장거리대리운전', '강원랜드장거리대리운전', '장거리탁송', '장거리자동차탁송', '서비스센터탁송', '골프대리운전', '일일기사', '스마트24', DOMAIN, DOMAIN+'/fare/', DOMAIN+'/reviews/', DOMAIN+'/service/daily-driver/', DOMAIN+'/service/corporate/', '부산인천탁송', '기장군대구탁송', '대구서울대리운전', '서울부산탁송', '김해공항서울탁송', '김해공항인천탁송', '강릉서울탁송', '서울대구대리운전', '강릉인천탁송', '울진영덕탁송', '부산탁송', '부산대리운전', '대구탁송', '강원도탁송', '서울대리운전', '강남대리운전', '해운대대리운전', '대구대리운전', '수성구대리운전', '인천대리운전', '용인대리운전', '김해대리운전', '속초대리운전', '강원도대리운전', '설악산탁송', '설악산종주탁송', '오색소공원탁송', '지리산탁송', '지리산종주탁송', '성삼재중산리탁송', '자전거길종주탁송', '동해안자전거길종주탁송', '섬진강자전거길종주탁송', '영산강자전거길종주탁송', '금강자전거길종주탁송', '낙동강자전거길종주탁송', '동해안길종주', '섬진강길종주', '영산강길종주', '금강길종주', '낙동강길종주', '한강자전거길종주', '북한강자전거길종주', '오천자전거길종주', '새재자전거길종주', '국토종주자전거길', '영산강길자전거종주', '영산강길자전거종주 차량회수방법', '자전거길종주 완벽정리', '설악산종주 완벽정리', '지리산종주 완벽정리', '오색종주', '서북능선종주', '공룡능선종주', '성삼재중산리종주', '설악산 대청봉', '오색 소공원 하산', '한계령 대청봉', '지리산 천왕봉 중산리', '성삼재 대원사 종주', '오색 대청봉 천불동 소공원', '한계령 서북능선 백담사', '공룡능선 소공원 하산', '지리산 성중종주', '지리산 화대종주', '지리산천왕봉'];
const COMPARISONS = ['gosudaeri.com', 'k-daeri.com', '8882888.github.io'];
function inspect(items, domain = DOMAIN) {
  return items.map((item, index) => {
    try {
      const url = new URL(item.link);
      if (!['http:', 'https:'].includes(url.protocol) || !(url.hostname === domain || url.hostname.endsWith('.' + domain))) return null;
      return { position: index + 1, url: url.href, title: String(item.title || '').replace(/<[^>]*>/g, '') };
    } catch { return null; }
  }).filter(Boolean);
}
function pageEvidence(results) {
  return CORE_PAGES.map(path => {
    const found = results.flatMap(result => (result.matches || []).filter(match => {
      try { const u = new URL(match.url); return u.hostname === DOMAIN && (u.pathname.endsWith('/') ? u.pathname : u.pathname + '/') === path; } catch { return false; }
    }).map(match => ({query: result.query, position: match.position, url: match.url, title: match.title})));
    return {path, status: found.length ? 'observed-in-api-results' : 'not-observed-in-these-results', found, limitation: 'This is search-result evidence, not Search Advisor URL inspection or a complete index count.'};
  });
}
async function main() {
  const id = process.env.NAVER_SEARCH_CLIENT_ID, secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('NAVER_SEARCH_CLIENT_ID and NAVER_SEARCH_CLIENT_SECRET are required');
  const results = [];
  let failures = 0;
  for (const query of QUERIES) {
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
    }
  }
  const result = {source: 'Naver Search API: web documents', query: QUERY, checkedAt: new Date().toISOString(), ...results[0], results, pageEvidence: pageEvidence(results), limitation: 'Positions are within the returned web-document API results, not Naver integrated search rankings. No match does not prove a page is not indexed.'};
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
  if (failures) throw new Error(failures + ' query checks failed; partial results saved');
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { inspect, QUERIES, CORE_PAGES, pageEvidence };
