'use strict';
const fs = require('node:fs');
const QUERY = '전국대리운전';
const DOMAIN = 'jeongukdaeri.kr';
function inspect(items) {
  return items.map((item, index) => {
    try {
      const url = new URL(item.link);
      if (!['http:', 'https:'].includes(url.protocol) || !(url.hostname === DOMAIN || url.hostname.endsWith('.' + DOMAIN))) return null;
      return { position: index + 1, url: url.href, title: String(item.title || '').replace(/<[^>]*>/g, '') };
    } catch { return null; }
  }).filter(Boolean);
}
async function main() {
  const id = process.env.NAVER_SEARCH_CLIENT_ID, secret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('NAVER_SEARCH_CLIENT_ID and NAVER_SEARCH_CLIENT_SECRET are required');
  const endpoint = new URL('https://naverapihub.apigw.ntruss.com/search/v1/webkr');
  endpoint.search = new URLSearchParams({ query: QUERY, display: '100', start: '1' }).toString();
  const response = await fetch(endpoint, {headers: {'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret}, signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error(`Naver Search API returned HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.items)) throw new Error('Invalid Naver Search API response: items missing');
  const result = { source: 'Naver Search API: web documents', query: QUERY, checkedAt: new Date().toISOString(), inspected: data.items.length, total: data.total, matches: inspect(data.items), limitation: 'Positions are within the returned web-document API results, not Naver integrated search rankings.' };
  fs.writeFileSync('naver-web-monitor-result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { inspect };
