'use strict';
const fs = require('node:fs');
const QUERY = '전국대리운전';
const DOMAIN = 'jeongukdaeri.kr';
const QUERIES = [QUERY, '전국자동차탁송', '골프대리운전', '일일기사', '스마트24', DOMAIN];
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
  const result = {source: 'Naver Search API: web documents', query: QUERY, checkedAt: new Date().toISOString(), ...results[0], results, limitation: 'Positions are within the returned web-document API results, not Naver integrated search rankings. No match does not prove a page is not indexed.'};
  fs.writeFileSync('naver-web-monitor-result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.map(r => '| ' + r.query + ' | ' + (r.error ? 'ERROR' : r.matches.length ? r.matches.map(x => x.position).join(', ') : 'Not found in first ' + r.inspected) + ' | ' + (r.error || COMPARISONS.map(d => d + ': ' + (r.comparisons[d].map(x => x.position).join(', ') || '—')).join('; ')) + ' |');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Naver web-document visibility\n\nNot integrated search rankings; absence does not prove exclusion from the index.\n\n| Query | Smart24 positions | Comparison positions |\n|---|---|---|\n' + rows.join('\n') + '\n');
  }
  if (failures) throw new Error(failures + ' query checks failed; partial results saved');
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { inspect, QUERIES };
