import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('sitemap crawler distinguishes blockers, quality warnings and shared sitemap entries', { timeout: 30000 }, async () => {
  const server = http.createServer((req, res) => {
    const base = 'http://' + req.headers.host;
    const sitemap = (items) => '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      items.map(item => '<url><loc>' + base + item + '</loc></url>').join('') + '</urlset>';
    const page = (canonical, robots, description) => '<!doctype html><html><head><title>전국 자동차탁송 안내</title>' +
      '<link rel="canonical" href="' + base + canonical + '">' +
      (robots ? '<meta name="robots" content="' + robots + '">' : '') +
      (description ? '<meta name="description" content="' + description + '">' : '') +
      '</head><body><h1>실제 탁송 예약</h1></body></html>';
    res.setHeader('content-type', req.url.endsWith('.xml') ? 'application/xml' : 'text/html; charset=utf-8');
    if (req.url.endsWith('.xml')) {
      res.end(sitemap(req.url === '/sitemap-priority.xml' ? ['/healthy/', '/blocked/', '/warning/'] :
        req.url === '/sitemap.xml' ? ['/healthy/'] : []));
    } else if (req.url === '/healthy/') res.end(page('/healthy/', '', '완료 운행기록 및 상담 안내'));
    else if (req.url === '/blocked/') res.end(page('/blocked/', 'noindex', '검색 제외 테스트'));
    else if (req.url === '/warning/') res.end(page('/warning/', '', ''));
    else { res.statusCode = 404; res.end('missing'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const reportDir = await mkdtemp(path.join(os.tmpdir(), 'smart24-sitemap-audit-'));
  try {
    const url = 'http://127.0.0.1:' + server.address().port;
    const child = spawn(process.execPath, ['scripts/audit-live-sitemap-indexability-20261121.mjs'], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, SEO_AUDIT_ORIGIN: url, SEO_AUDIT_CONCURRENCY: '2',
        SEO_AUDIT_PAUSE_MS: '100', SEO_AUDIT_REPORT_DIR: reportDir }
    });
    const exit = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    assert.equal(exit, 0, 'all local sitemap roots responded');
    const report = JSON.parse(await readFile(path.join(reportDir, 'live-sitemap-indexability.json'), 'utf8'));
    assert.equal(report.summary.completeness, 'complete');
    assert.equal(report.summary.uniqueUrls, 3);
    const healthy = report.pages.find(p => p.url.endsWith('/healthy/'));
    const blocked = report.pages.find(p => p.url.endsWith('/blocked/'));
    const warning = report.pages.find(p => p.url.endsWith('/warning/'));
    assert.equal(healthy.technicalCandidate, true);
    assert(healthy.warnings.includes('multiple_sitemap_entries'));
    assert.equal(blocked.technicalCandidate, false);
    assert(blocked.reasons.includes('noindex'));
    assert.equal(warning.technicalCandidate, true);
    assert(warning.warnings.includes('missing_description'));
    assert.equal(report.summary.needsReview, 1);
    const csv = await readFile(path.join(reportDir, 'live-sitemap-indexability.csv'), 'utf8');
    assert(csv.split('\n', 1)[0].split(',').includes('warnings'), 'CSV header exports warning column');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(reportDir, { recursive: true, force: true });
  }
});
