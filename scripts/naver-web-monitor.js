'use strict';
const fs = require('node:fs');
const QUERY = '전국대리운전';
const DOMAIN = 'jeongukdaeri.kr';
const CORE_PAGES = ['/', '/daeri/', '/taksong/', '/fare/', '/reviews/', '/service/golf/', '/service/daily-driver/', '/service/corporate/', '/daeri/busan/', '/taksong/busan/', '/taksong/daegu/', '/taksong/gangwon/'];
const QUERIES = [QUERY, '전국자동차탁송', '골프대리운전', '일일기사', '스마트24', DOMAIN, DOMAIN+'/fare/', DOMAIN+'/reviews/', DOMAIN+'/service/daily-driver/', DOMAIN+'/service/corporate/', '부산인천탁송', '기장군대구탁송', '대구서울대리운전', '서울부산탁송', '김해공항서울탁송', '김해공항인천탁송', '강릉서울탁송', '서울대구대리운전', '강릉인천탁송', '울진영덕탁송', '부산탁송', '부산대리운전', '대구탁송', '강원도탁송'];
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
