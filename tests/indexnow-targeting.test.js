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
const liveMap=new Map([
 ['daeri|강원특별자치도 원주시','/daeri/gangwon/wonju-si/'],
 ['taksong|강원특별자치도 원주시','/taksong/gangwon/wonju-si/'],
 ['daeri|경상남도 진주시','/daeri/gyeongnam/jinju-si/']
]);
const pfile='data/priority-regions.json';
const previous={pages:[
 {kind:'daeri',region:'강원특별자치도 원주시',topic:'원주 대리',detail:'수정 전'},
 {kind:'taksong',region:'강원특별자치도 원주시',topic:'원주 탁송',detail:'유지'},
 {kind:'daeri',region:'경상남도 진주시',topic:'진주 대리',detail:'기존'}
]};
const current={pages:[
 {...previous.pages[0],detail:'원주만 수정'},
 previous.pages[1],
 {...previous.pages[2],detail:'진주만 수정'}
]};
const options={previousDocuments:{[pfile]:previous},currentDocuments:{[pfile]:current},priorityHrefMap:liveMap};
assert.deepEqual(changedPaths([pfile],'',options),
 ['/daeri/gangwon/wonju-si/','/daeri/gyeongnam/jinju-si/'],
 'notify only two genuinely modified records, not the unrelated static region-journey list');
assert.notDeepEqual(changedPaths([pfile],'',options),priorityPaths,'old unrelated ten-URL fallback must never return');
assert.throws(()=>changedPaths([pfile],'',{...options,priorityHrefMap:null}),/Live published priority URL lookup is required/);
assert.deepEqual(changedPaths([pfile],'',{...options,currentDocuments:{[pfile]:previous}}),[],
 'reformatted but unchanged priority data must not resubmit URLs');

const journey='data/region-journey-links.json';
assert.deepEqual(changedPaths([journey],'',{
 previousDocuments:{[journey]:{pages:[{path:'/taksong/busan/',summary:'old'},{path:'/taksong/daegu/',summary:'same'}]}},
 currentDocuments:{[journey]:{pages:[{path:'/taksong/busan/',summary:'new'},{path:'/taksong/daegu/',summary:'same'}]}}
}),['/taksong/busan/'],'only updated journey guides may be submitted');

const sourceLinks='data/priority-blog-links.json';
assert.deepEqual(changedPaths([sourceLinks],'',{
 previousDocuments:{[sourceLinks]:{pages:[{kind:'daeri',region:'강원특별자치도 원주시',ids:['100']}]}},
 currentDocuments:{[sourceLinks]:{pages:[{kind:'daeri',region:'강원특별자치도 원주시',ids:['101']}]}},
 priorityHrefMap:liveMap
}),['/daeri/gangwon/wonju-si/'],'only changed region blog evidence pages may be notified');
const elevenBefore={pages:Array.from({length:11},(_,i)=>({kind:'daeri',region:'가상시'+i,detail:'old'}))};
const elevenAfter={pages:elevenBefore.pages.map(x=>({...x,detail:'new'}))};
const elevenMap=new Map(elevenAfter.pages.map((x,i)=>['daeri|'+x.region,'/daeri/region-'+i+'/']));
assert.throws(()=>changedPaths([pfile],'',{
 previousDocuments:{[pfile]:elevenBefore},currentDocuments:{[pfile]:elevenAfter},priorityHrefMap:elevenMap
}),/More than ten genuine changed URLs/,'never silently truncate a bulk source update');
assert.deepEqual(changedPaths(['server.js']),[],'infrastructure-only changes do not announce old unrelated URLs');
assert.deepEqual(changedPaths(['lib/regional-history-evidence.js']),[],'renderer-only change does not announce old URLs');
const saved='7a16f0c7b1ea3380';
assert.deepEqual(changedPaths(['reviews/verified/'+saved+'/index.html','data/published-ride-case-ids.json']),
 ['/reviews/verified/'+saved+'/'],'new confirmed case gets exactly one canonical notification');
assert.deepEqual(changedPaths(['data/published-ride-case-ids.json']),[],
 'manifest without a saved document must not trigger a false publication');
assert.throws(()=>changedPaths(Array.from({length:11},(_,i)=>'reviews/verified/'+String(i).padStart(16,'0')+'/index.html')),
 /More than ten/,'never silently lose bulk notifications');

const blogFile='data/blog-hashtags-priority.json';
assert.deepEqual(changedPaths([blogFile,'server.js'],'',{
 previousDocuments:{[blogFile]:{articles:[{slug:'busan',tags:['#before']},{slug:'daegu',tags:['#keep']}]}},
 currentDocuments:{[blogFile]:{articles:[{slug:'busan',tags:['#after']},{slug:'daegu',tags:['#keep']}]}}
}),['/blog/daeri-regions/busan/'],'changed hashtag source only notifies its changed original article URL');
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
