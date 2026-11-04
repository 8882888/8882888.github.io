'use strict';
const assert=require('node:assert/strict');
const {changedPaths,priorityPaths,blogHashtagPaths,sitemapWindow}=require('../scripts/indexnow-notify');
assert(sitemapWindow.focusCount>=2900,'All curated locality SEO guides must be included in priority sitemap size guard');
assert.equal(sitemapWindow.maximumCount,sitemapWindow.focusCount+500,'IndexNow ceiling must scale with the guide count');
assert(sitemapWindow.minimumCount<=sitemapWindow.focusCount,'IndexNow minimum must accommodate curated guide URLs');
assert.equal(priorityPaths.length,10);
assert.equal(new Set(priorityPaths).size,10);
assert.equal(blogHashtagPaths.length,30);
assert.equal(new Set(blogHashtagPaths).size,30);
assert.equal(changedPaths(['README.md']).length,0,'docs-only commits must not repeat 115 IndexNow URLs');
assert.deepEqual(changedPaths(['scripts/indexnow-notify.js','.github/workflows/indexnow-notify.yml']),[],'notifier-only changes have no published page changes');
for(const file of ['server.js','data/region-journey-links.json','data/priority-regions.json','data/priority-blog-links.json','lib/regional-history-evidence.js']){
 assert.deepEqual(changedPaths([file]),priorityPaths,'changing '+file+' selects ten canonical region pages');
}
assert.deepEqual(changedPaths(['data/blog-hashtags-priority.json','server.js']),blogHashtagPaths.slice(-10));
for(const url of blogHashtagPaths)assert.deepEqual(changedPaths([url.slice(1)+'index.html']),[url],'one updated article maps to one submitted URL');
assert.deepEqual(changedPaths(['index.html']),['/']);
assert.deepEqual(changedPaths(['data/seo-pages.json']),['/','/taksong/','/daeri/','/region/']);
assert.deepEqual(changedPaths(['blog/posts.json']),['/blog/','/blog/archive/']);
assert.deepEqual(changedPaths(['data/ride-history.json']),['/reviews/history/','/reviews/taksong/']);
assert.equal(changedPaths(['server.js','index.html','data/seo-pages.json']).length,10,'never flood more than ten URLs');
assert.deepEqual(changedPaths([], '/taksong/busan/,/taksong/daegu/'),['/taksong/busan/','/taksong/daegu/']);
assert.throws(()=>changedPaths([], 'https://other.example/taksong/busan/'),/Foreign host/);
assert.throws(()=>changedPaths([], '/taksong/busan/?campaign=1'),/Noncanonical manual URL/);
assert.throws(()=>changedPaths([],Array(11).fill('/taksong/busan/').join(',')),/Only ten/);
console.log('PASS: changed-page IndexNow targeting limits submissions to ten canonical URLs, preserving docs-only skip and manual validation');
