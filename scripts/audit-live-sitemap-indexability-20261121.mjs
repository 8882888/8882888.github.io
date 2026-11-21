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
const xmlUrls = (xml, tag) => [...xml.matchAll(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi'))].map(m => decode(m[1]));
const blocks = (xml, tag) => [...xml.matchAll(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi'))].map(m => m[1]);
const loc = xml => xml.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
const normal = raw => {
  try {
    const u = new URL(raw, origin);
    u.hash = '';
    return u.href;
  } catch { return null; }
};
const sameHost = url => { try { return new URL(url).host === origin.host; } catch { return false; } };
const report = { generatedAt: new Date().toISOString(), origin: origin.origin, source: 'public technical crawl; not Naver Search Advisor', roots, sitemaps: [], errors: [], pages: [], summary: {} };

async function get(url, method = 'GET') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);
  try {
    return await fetch(url, { method, redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Smart24-SEO-Technical-Audit/1.0' } });
  } finally { clearTimeout(timeout); }
}
const seenMaps = new Set();
const urls = new Map();
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
    for (const child of children) await collectSitemap(child);
    const entries = blocks(text, 'url').map(loc).filter(Boolean);
    sitemap.items = entries.length;
    for (const raw of entries) {
      const item = normal(decode(raw));
      if (!item || !sameHost(item)) { report.errors.push({ url, reason: 'external_or_invalid_url', value: raw }); continue; }
      urls.set(item, (urls.get(item) || 0) + 1);
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
    const rawCanonical = attr(canonicalTag(html), 'href');
    const canonical = rawCanonical ? normal(rawCanonical) : '';
    const metaRobots = attr(tag(html, 'robots'), 'content');
    const xRobots = res.headers.get('x-robots-tag') || '';
    const title = match(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const h1 = match(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '').trim();
    const description = attr(tag(html, 'description'), 'content');
    const reasons = [];
    if (res.status !== 200) reasons.push('non_200');
    if (res.url !== url) reasons.push('redirect');
    if (!html) reasons.push('not_html');
    if (/\bnoindex\b/i.test(metaRobots + ',' + xRobots)) reasons.push('noindex');
    if (/\bnofollow\b/i.test(metaRobots + ',' + xRobots)) reasons.push('nofollow');
    if (!canonical) reasons.push('missing_canonical');
    else if (canonical !== url) reasons.push('canonical_mismatch');
    if (!title) reasons.push('missing_title');
    if (!h1) reasons.push('missing_h1');
    if (!description) reasons.push('missing_description');
    if (appearances > 1) reasons.push('multiple_sitemap_entries');
    return { url, status: res.status, finalUrl: res.url, appearances, title, h1, description, canonical, metaRobots, xRobots, reasons, technicalCandidate: reasons.length === 0 };
  } catch (e) { return { url, appearances, technicalCandidate: false, reasons: ['fetch_failed'], error: String(e) }; }
}
for (const root of roots) await collectSitemap(new URL(root, origin).href);
const work = [...urls];
let cursor = 0;
async function worker() {
  while (cursor < work.length) {
    const index = cursor++;
    const [url, count] = work[index];
    report.pages[index] = await audit(url, count);
    await sleep(pauseMs);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
const counts = {};
for (const p of report.pages) for (const r of p.reasons) counts[r] = (counts[r] || 0) + 1;
report.summary = {
  sitemapCount: seenMaps.size, uniqueUrls: urls.size,
  technicallyEligible: report.pages.filter(p => p.technicalCandidate).length,
  needsReview: report.pages.filter(p => !p.technicalCandidate).length,
  reasonCounts: counts, errors: report.errors.length
};
await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(path.join(reportDir, 'live-sitemap-indexability.json'), JSON.stringify(report, null, 2));
const columns = ['url','status','finalUrl','appearances','canonical','title','h1','description','reasons','technicalCandidate','error'];
const csv = [columns.join(','), ...report.pages.map(p => columns.map(k => '"' + String(k === 'reasons' ? p.reasons.join(';') : (p[k] ?? '')).replace(/"/g, '""') + '"').join(','))].join('\n');
await fs.writeFile(path.join(reportDir, 'live-sitemap-indexability.csv'), csv + '\n');
console.log(JSON.stringify(report.summary, null, 2));
if (report.errors.length) console.error('Sitemap errors:', report.errors.slice(0, 10));
