import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('sitemap crawler distinguishes blockers, quality warnings and shared sitemap entries', { timeout: 30000 }, async () => {
  let transientRequests = 0;
  const agentIssues=[];
  const server = http.createServer((req, res) => {
    const base = 'http://' + req.headers.host;
    if(!req.headers['user-agent']?.includes('Yeti/1.1')||req.headers['x-smart24-monitor']!=='github-health-probe')agentIssues.push(req.url);
    const sitemap = (items) => '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      items.map(item => '<url><loc>' + base + item + '</loc></url>').join('') + '</urlset>';
    const page = (canonical, robots, description) => '<!doctype html><html><head><title>전국 자동차탁송 안내</title>' +
      '<link rel="canonical" href="' + base + canonical + '">' +
      (robots ? '<meta name="robots" content="' + robots + '">' : '') +
      (description ? '<meta name="description" content="' + description + '">' : '') +
      '</head><body><h1>실제 탁송 예약</h1></body></html>';
    res.setHeader('content-type', req.url.endsWith('.xml') ? 'application/xml' : 'text/html; charset=utf-8');
    if(req.url==='/robots.txt'){
      res.setHeader('content-type','text/plain');
      res.end('User-agent: *\nAllow: /\n'+['priority','', 'reviewed-routes','published','taksong','daeri','all','history'].map(x=>'Sitemap: '+base+'/sitemap'+(x?'-'+x:'')+'.xml').join('\n'));
    } else if (req.url.endsWith('.xml')) {
      res.end(sitemap(req.url === '/sitemap-priority.xml' ? ['/healthy/', '/blocked/', '/warning/', '/no-canonical/', '/transient/', '/yeti-meta/', '/yeti-header/', '/google-header/', '/duplicate-canonical/'] :
        req.url === '/sitemap.xml' ? ['/healthy/'] : []));
    } else if (req.url === '/healthy/') res.end(page('/healthy/', '', '완료 운행기록 및 상담 안내'));
    else if (req.url === '/transient/') {
      transientRequests++;
      if (transientRequests === 1) { res.statusCode = 503; res.end('retry later'); }
      else res.end(page('/transient/', '', '재시도 성공'));
    }
    else if (req.url === '/blocked/') res.end(page('/blocked/', 'noindex', '검색 제외 테스트'));
    else if(req.url==='/yeti-meta/')res.end(page('/yeti-meta/','','Yeti 제한').replace('</head>','<meta name="Yeti" content="none"></head>'));
    else if(req.url==='/yeti-header/'){res.setHeader('x-robots-tag','Yeti: noindex');res.end(page('/yeti-header/','','Yeti 제한'));}
    else if(req.url==='/google-header/'){res.setHeader('x-robots-tag','Googlebot: noindex');res.end(page('/google-header/','','네이버 허용'));}
    else if(req.url==='/duplicate-canonical/')res.end(page('/duplicate-canonical/','','중복 canonical').replace('</head>','<link rel="canonical" href="'+base+'/other/"></head>'));
    else if (req.url === '/warning/') res.end(page('/warning/', '', ''));
    else if (req.url === '/no-canonical/') res.end('<!doctype html><html><head><title>지역 대리운전 이용 안내</title><meta name="description" content="기록 기반 안내"></head><body><h1>대리운전 안내</h1></body></html>');
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
    assert.equal(exit, 1, 'completed scan must fail if genuine blockers remain');
    assert.deepEqual(agentIssues,[],'every request uses identified Yeti simulation');
    const report = JSON.parse(await readFile(path.join(reportDir, 'live-sitemap-indexability.json'), 'utf8'));
    assert.equal(report.summary.completeness, 'complete');
    assert.equal(report.summary.uniqueUrls, 9);
    assert.equal(transientRequests, 2, 'transient 503 is retried once');
    assert.equal(report.summary.pageFetchFailures, 0);
    assert.equal(report.summary.prioritySitemapUrls, 9);
    assert.equal(report.summary.prioritySitemapBlockers, 4);
    assert.deepEqual(report.summary.prioritySitemapBlockingUrls[0].reasons, ['noindex']);
    const progress = JSON.parse(await readFile(path.join(reportDir, 'live-sitemap-indexability-progress.json'), 'utf8'));
    assert.equal(progress.state, 'finished');
    assert.equal(progress.urlsChecked, 9);
    assert.equal(progress.urlsDiscovered, 9);
    assert.equal(progress.reasons.noindex, 3);
    const healthy = report.pages.find(p => p.url.endsWith('/healthy/'));
    const blocked = report.pages.find(p => p.url.endsWith('/blocked/'));
    const warning = report.pages.find(p => p.url.endsWith('/warning/'));
    const missingCanonical = report.pages.find(p => p.url.endsWith('/no-canonical/'));
    assert.equal(healthy.technicalCandidate, true);
    assert.equal(healthy.prioritySitemap, true);
    assert(healthy.warnings.includes('multiple_sitemap_entries'));
    assert.equal(blocked.technicalCandidate, false);
    assert(blocked.reasons.includes('noindex'));
    assert.equal(warning.technicalCandidate, true);
    assert(warning.warnings.includes('missing_description'));
    assert.equal(missingCanonical.technicalCandidate, true, 'missing canonical does not independently prevent indexing');
    assert(missingCanonical.warnings.includes('missing_canonical'));
    assert.equal(report.summary.needsReview, 4);
    assert.deepEqual(report.pages.find(p=>p.url.endsWith('/yeti-meta/')).reasons,['noindex']);
    assert.deepEqual(report.pages.find(p=>p.url.endsWith('/yeti-header/')).reasons,['noindex']);
    assert.equal(report.pages.find(p=>p.url.endsWith('/google-header/')).technicalCandidate,true);
    assert.deepEqual(report.pages.find(p=>p.url.endsWith('/duplicate-canonical/')).reasons,['multiple_canonical']);
    const csv = await readFile(path.join(reportDir, 'live-sitemap-indexability.csv'), 'utf8');
    assert(csv.split('\n', 1)[0].split(',').includes('warnings'), 'CSV header exports warning column');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(reportDir, { recursive: true, force: true });
  }
});
