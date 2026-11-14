'use strict';
const assert=require('node:assert/strict');
const {changedPaths,priorityPaths,blogHashtagPaths,sitemapWindow}=require('../scripts/indexnow-notify');
assert(sitemapWindow.focusCount>=2900,'All curated locality SEO guides must be included in priority sitemap size guard');
assert.equal(sitemapWindow.maximumCount,sitemapWindow.focusCount+500,'IndexNow ceiling must scale with the guide count');
assert(sitemapWindow.minimumCount<=sitemapWindow.focusCount,'Curated priority entries must fit within the overall regional focus');
assert.equal(sitemapWindow.sparseVillageAllowance,140,'140 low-evidence villages are explicitly excluded from indexing targets');
assert.equal(sitemapWindow.minimumCount,sitemapWindow.requiredPaths.length,'Priority sitemap minimum is the unique known published entry URL count, not the 2,900 keyword focus count');
assert(sitemapWindow.minimumCount>=50,'All source-reviewed and service entry pages remain required for IndexNow readiness');
assert(2865>=sitemapWindow.minimumCount&&2865<=sitemapWindow.maximumCount,'a larger regional sitemap remains permitted');
assert.equal(priorityPaths.length,10);
assert.equal(new Set(priorityPaths).size,10);
assert.equal(blogHashtagPaths.length,30);
assert.equal(new Set(blogHashtagPaths).size,30);
assert.equal(changedPaths(['README.md']).length,0,'docs-only commits must not repeat 115 IndexNow URLs');
assert.deepEqual(changedPaths(['scripts/indexnow-notify.js','.github/workflows/indexnow-notify.yml']),[],'notifier-only changes have no published page changes');
for(const file of ['data/region-journey-links.json','data/priority-regions.json','data/priority-blog-links.json']){
 assert.deepEqual(changedPaths([file]),priorityPaths,'changing reviewed source '+file+' selects canonical region pages');
}
assert.deepEqual(changedPaths(['server.js']),[],'infrastructure-only changes do not announce old unrelated URLs');
assert.deepEqual(changedPaths(['lib/regional-history-evidence.js']),[],'renderer-only change does not announce old URLs');
const saved='7a16f0c7b1ea3380';
assert.deepEqual(changedPaths(['reviews/verified/'+saved+'/index.html','data/published-ride-case-ids.json']),
 ['/reviews/verified/'+saved+'/'],'new confirmed case gets exactly one canonical notification');
assert.deepEqual(changedPaths(['data/published-ride-case-ids.json']),[],
 'manifest without a saved document must not trigger a false publication');
assert.throws(()=>changedPaths(Array.from({length:11},(_,i)=>'reviews/verified/'+String(i).padStart(16,'0')+'/index.html')),
 /More than ten/,'never silently lose bulk notifications');

assert.deepEqual(changedPaths(['data/blog-hashtags-priority.json','server.js']),blogHashtagPaths.slice(-10));
for(const url of blogHashtagPaths)assert.deepEqual(changedPaths([url.slice(1)+'index.html']),[url],'one updated article maps to one submitted URL');
assert.deepEqual(changedPaths(['index.html']),['/']);
assert.deepEqual(changedPaths(['data/seo-pages.json']),['/','/taksong/','/daeri/','/region/']);
assert.deepEqual(changedPaths(['blog/posts.json']),['/blog/','/blog/archive/']);
assert.deepEqual(changedPaths(['data/ride-history.json']),['/reviews/history/','/reviews/taksong/']);
assert.equal(changedPaths(['server.js','index.html','data/seo-pages.json']).length,4,'only genuinely changed homepage and service metadata are announced');
assert.deepEqual(changedPaths([], '/taksong/busan/,/taksong/daegu/'),['/taksong/busan/','/taksong/daegu/']);
assert.throws(()=>changedPaths([], 'https://other.example/taksong/busan/'),/Foreign host/);
assert.throws(()=>changedPaths([], '/taksong/busan/?campaign=1'),/Noncanonical manual URL/);
assert.throws(()=>changedPaths([],Array(11).fill('/taksong/busan/').join(',')),/Only ten/);
console.log('PASS: verified saved-case IndexNow selection is one URL per changed document; code-only commits skip');
