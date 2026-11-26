#!/usr/bin/env node
/**
 * Read-only live sitemap indexability audit.
 * Usage: node scripts/audit-live-sitemap-indexability-20261121.mjs
 * Set SEO_AUDIT_ORIGIN and SEO_AUDIT_CONCURRENCY to override defaults.
 * Results: reports/live-sitemap-indexability.json and .csv (gitignored locally).
 * This checks technical eligibility, NOT Naver's actual indexed URL inventory.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import yetiChecks from './check-yeti-priority-indexability.cjs';
const {YETI,attribute,noindex,xRobotsIndexAgents}=yetiChecks;

const origin = new URL(process.env.SEO_AUDIT_ORIGIN || 'https://jeongukdaeri.kr');
const concurrency = Math.max(1, Math.min(8, Number(process.env.SEO_AUDIT_CONCURRENCY || 3)));
const pauseMs = Math.max(100, Number(process.env.SEO_AUDIT_PAUSE_MS || 250));
const reportDir = process.env.SEO_AUDIT_REPORT_DIR || 'reports';
const roots = [
  '/sitemap-priority.xml', '/sitemap.xml', '/sitemap-reviewed-routes.xml',
  '/sitemap-published.xml', '/sitemap-taksong.xml', '/sitemap-daeri.xml',
  '/sitemap-all.xml', '/sitemap-history.xml'
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const blocks = (xml, tag) => [...xml.matchAll(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi'))].map(m => m[1]);
const loc = xml => xml.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
const normal = raw => {
  try {
    const u = new URL(raw, origin);
    u.hash = '';
    return u.href;
  } catch { return null; }
};
const sameHost = url => { try { return new URL(url).origin === origin.origin; } catch { return false; } };
const report = { generatedAt: new Date().toISOString(), origin: origin.origin, source: 'public Yeti User-Agent compatibility crawl; not verified Naver IP or Search Advisor', roots, sitemaps: [], errors: [], pages: [], summary: {} };

// AbortSignal.timeout also covers slow response bodies read by callers.
async function get(url, method = 'GET') {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        method, redirect: 'follow', signal: AbortSignal.timeout(16000),
        headers: { 'user-agent': YETI, 'x-smart24-monitor': 'github-health-probe' }
      });
      if (![429, 502, 503, 504].includes(response.status) || attempt === 2) return response;
      await response.body?.cancel();
      console.warn('RETRY_TRANSIENT_HTTP', response.status, url);
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      console.warn('RETRY_TRANSIENT_FETCH', url, String(error));
    }
    await sleep(800);
  }
  throw lastError || new Error('Unexpected audit fetch retry state');
}
const seenMaps = new Set();
const urls = new Map();
const priorityUrls = new Set();
async function collectSitemap(input) {
  const url = normal(input);
  if (!url || !sameHost(url) || seenMaps.has(url)) return;
  seenMaps.add(url);
  try {
    const res = await get(url);
    const text = await res.text();
    const sitemap = { url, httpStatus: res.status, contentType: res.headers.get('content-type') || '', items: 0 };
    report.sitemaps.push(sitemap);
    if (!res.ok || !/<(?:urlset|sitemapindex)\b/i.test(text)) {
      report.errors.push({ url, reason: 'sitemap_http_or_xml_invalid', status: res.status });
      return;
    }
    const children = blocks(text, 'sitemap').map(loc).filter(Boolean);
    for (const child of children) {
      const target = normal(decode(child));
      if (!target || !sameHost(target)) { report.errors.push({url,reason:'external_or_invalid_sitemap',value:child}); continue; }
      await collectSitemap(target);
    }
    const entries = blocks(text, 'url').map(loc).filter(Boolean);
    sitemap.items = entries.length;
    for (const raw of entries) {
      const item = normal(decode(raw));
      if (!item || !sameHost(item)) { report.errors.push({ url, reason: 'external_or_invalid_url', value: raw }); continue; }
      urls.set(item, (urls.get(item) || 0) + 1);
      if (url === new URL('/sitemap-priority.xml', origin).href) priorityUrls.add(item);
    }
  } catch (e) { report.errors.push({ url, reason: 'sitemap_fetch_failed', detail: String(e) }); }
}
const match = (html, re) => html.match(re)?.[1]?.trim() || '';
const tag = (html, name) => [...html.matchAll(/<meta\b[^>]*>/gi)].map(x => x[0]).find(t => new RegExp('(?:name|property)\\s*=\\s*["\\x27]' + name + '["\\x27]', 'i').test(t)) || '';
const attr = (html, name) => match(html, new RegExp('\\b' + name + '\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]', 'i'));
const canonicalTag = html => [...html.matchAll(/<link\b[^>]*>/gi)].map(x => x[0]).find(t => /\brel\s*=\s*["']canonical["']/i.test(t)) || '';
async function audit(url, appearances) {
  try {
    const res = await get(url);
    const type = res.headers.get('content-type') || '';
    const html = type.includes('html') ? (await res.text()).slice(0, 250000) : '';
    const canonicalTags = [...html.matchAll(/<link\b[^>]*>/gi)].map(x=>x[0]).filter(t=>attribute(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
    const rawCanonical = canonicalTags.length===1 ? attribute(canonicalTags[0], 'href') : '';
    const canonical = rawCanonical ? normal(rawCanonical) : '';
    const metaRobots = [...html.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]).filter(t=>/^(robots|yeti)$/i.test(attribute(t,'name'))).map(t=>attribute(t,'content')).join(',');
    const xRobots = res.headers.get('x-robots-tag') || '';
    const title = match(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const h1 = match(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '').trim();
    const description = attr(tag(html, 'description'), 'content');
    const reasons = [];
    const warnings = [];
    if (res.status !== 200) reasons.push('non_200');
    if (res.url !== url) reasons.push('redirect');
    if (!html) reasons.push('not_html');
    if (noindex(metaRobots) || xRobotsIndexAgents(xRobots).some(a=>a==='robots'||a==='yeti')) reasons.push('noindex');
    if (/\bnofollow\b/i.test(metaRobots + ',' + xRobots)) warnings.push('nofollow');
    if (canonicalTags.length>1) reasons.push('multiple_canonical');
    else if (!canonical) warnings.push('missing_canonical');
    else if (canonical !== url) reasons.push('canonical_mismatch');
    if (!title) warnings.push('missing_title');
    if (!h1) warnings.push('missing_h1');
    if (!description) warnings.push('missing_description');
    if (appearances > 1) warnings.push('multiple_sitemap_entries');
    return { url, status: res.status, finalUrl: res.url, appearances, title, h1, description, canonical, metaRobots, xRobots, reasons, warnings, technicalCandidate: reasons.length === 0 };
  } catch (e) { return { url, appearances, technicalCandidate: false, reasons: ['fetch_failed'], warnings: [], error: String(e) }; }
}
// The official site deliberately allows all crawlers. Detect unexpected
// changes to this known policy rather than guessing arbitrary robots semantics.
try {
  const res=await get(new URL('/robots.txt',origin).href);
  const body=await res.text();
  const declared=body.split(/\r?\n/).map(line=>line.split('#')[0].trim()).filter(line=>/^sitemap:/i.test(line)).map(line=>line.replace(/^sitemap:\s*/i,'').trim());
  const restrictions=body.split(/\r?\n/).map(line=>line.split('#')[0].trim()).filter(line=>/^disallow:\s*\S/i.test(line));
  report.robots={status:res.status,finalUrl:res.url,declared,restrictions};
  if(res.status!==200||res.url!==new URL('/robots.txt',origin).href||!/^user-agent:\s*\*\s*$/mi.test(body)||restrictions.length)
    report.errors.push({url:new URL('/robots.txt',origin).href,reason:'unexpected_live_robots_policy',status:res.status,restrictions});
  for(const item of declared){
    const target=normal(item);
    if(!target||!sameHost(target))report.errors.push({url:'/robots.txt',reason:'foreign_or_invalid_declared_sitemap',value:item});
    else if(!roots.includes(new URL(target).pathname))roots.push(new URL(target).pathname);
  }
  for(const root of roots)if(!declared.some(item=>normal(item)===new URL(root,origin).href))
    report.errors.push({url:'/robots.txt',reason:'missing_declared_sitemap',value:root});
}catch(e){report.errors.push({url:'/robots.txt',reason:'robots_fetch_failed',detail:String(e)});}
for (const root of roots) await collectSitemap(new URL(root, origin).href);
const work = [...urls];
await fs.mkdir(reportDir, { recursive: true });
const progressPath = path.join(reportDir, 'live-sitemap-indexability-progress.json');
const writeProgress = async () => {
  const visited = report.pages.filter(Boolean);
  const reasons = {};
  const warnings = {};
  for (const page of visited) {
    for (const reason of page.reasons) reasons[reason] = (reasons[reason] || 0) + 1;
    for (const warning of page.warnings) warnings[warning] = (warnings[warning] || 0) + 1;
  }
  const snapshot = {
    updatedAt: new Date().toISOString(), state: completed === work.length ? 'finished' : 'partial',
    origin: origin.origin, sitemapsDiscovered: seenMaps.size, sitemapErrors: report.errors.length,
    urlsDiscovered: work.length, urlsChecked: visited.length,
    technicallyEligibleSoFar: visited.filter(page => page.technicalCandidate).length,
    reasons, warnings,
    note: 'Intermediate technical audit counts only; not Naver indexed URLs and not a full crawl until finished.'
  };
  await fs.writeFile(progressPath, JSON.stringify(snapshot, null, 2) + '\n');
};
let cursor = 0;
let completed = 0;
await writeProgress();
async function worker() {
  while (cursor < work.length) {
    const index = cursor++;
    const [url, count] = work[index];
    report.pages[index] = await audit(url, count);
    report.pages[index].prioritySitemap = priorityUrls.has(url);
    completed++;
    if (completed % 250 === 0 || completed === work.length) {
      console.log('AUDIT_PROGRESS ' + completed + '/' + work.length);
      await writeProgress();
    }
    await sleep(pauseMs);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
const counts = {};
const warnings = {};
const pageFetchFailures = report.pages.filter(p => p.reasons.includes('fetch_failed')).length;
const priorityPages = report.pages.filter(p => p.prioritySitemap);
const priorityBlockers = priorityPages.filter(p => !p.technicalCandidate);
for (const p of report.pages) {
  for (const r of p.reasons) counts[r] = (counts[r] || 0) + 1;
  for (const w of p.warnings) warnings[w] = (warnings[w] || 0) + 1;
}
report.summary = {
  sitemapCount: seenMaps.size, uniqueUrls: urls.size,
  technicallyEligible: report.pages.filter(p => p.technicalCandidate).length,
  needsReview: report.pages.filter(p => !p.technicalCandidate).length,
  warningPages: report.pages.filter(p => p.warnings.length > 0).length,
  reasonCounts: counts, warningCounts: warnings, errors: report.errors.length,
  pageFetchFailures,
  prioritySitemapUrls: priorityPages.length,
  prioritySitemapBlockers: priorityBlockers.length,
  prioritySitemapBlockingUrls: priorityBlockers.slice(0, 50).map(p => ({ url: p.url, reasons: p.reasons })),
  completeness: report.errors.length === 0 && pageFetchFailures === 0 && urls.size > 0 ? 'complete' : 'incomplete'
};
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(path.join(reportDir, 'live-sitemap-indexability.json'), JSON.stringify(report, null, 2));
const columns = ['url','prioritySitemap','status','finalUrl','appearances','canonical','title','h1','description','reasons','warnings','technicalCandidate','error'];
const csv = [columns.join(','), ...report.pages.map(p => columns.map(k => '"' + String(k === 'reasons' ? p.reasons.join(';') : k === 'warnings' ? p.warnings.join(';') : (p[k] ?? '')).replace(/"/g, '""') + '"').join(','))].join('\n');
await fs.writeFile(path.join(reportDir, 'live-sitemap-indexability.csv'), csv + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.errors.length) console.error('Sitemap errors:', report.errors.slice(0, 10));
if (report.summary.completeness !== 'complete') {
  console.error('INCOMPLETE AUDIT: sitemap roots failed, page requests failed, or no URLs were discovered. Do not interpret a zero count as a clean indexability result.');
  process.exitCode = 1;
} else if (report.summary.needsReview>0) {
  console.error('TECHNICAL BLOCKERS: inspect per-URL report; completed crawl is not a clean crawl.');
  process.exitCode=1;
}
