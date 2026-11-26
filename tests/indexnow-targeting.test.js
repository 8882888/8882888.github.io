'use strict';
const assert=require('node:assert/strict');
const {changedPaths,priorityPaths,blogHashtagPaths,sitemapWindow,batchUrls,notificationRequest}=require('../scripts/indexnow-notify');
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
const twentyNineCaseFiles=Array.from({length:29},(_,i)=>'reviews/verified/'+String(i+1).padStart(16,'0')+'/index.html');
const twentyNineCasePaths=changedPaths(twentyNineCaseFiles);
assert.equal(twentyNineCasePaths.length,29,'all 29 updated published case pages remain selected');
const caseBatches=batchUrls(twentyNineCasePaths);
assert.deepEqual(caseBatches.map(batch=>batch.length),[10,10,9],'29 verified pages are split into three requests of at most ten');
assert.deepEqual(caseBatches.flat(),twentyNineCasePaths,'batching never truncates or reorders a changed canonical URL');
assert.throws(()=>batchUrls(twentyNineCasePaths,11),/between one and ten/,'each IndexNow POST is limited to ten URLs');
assert.throws(()=>changedPaths(Array.from({length:31},(_,i)=>'reviews/verified/'+String(i+1).padStart(16,'0')+'/index.html')),
 /More than thirty/,'larger publication sets must be deliberately split into separate revisions');

const blogFile='data/blog-hashtags-priority.json';
assert.deepEqual(changedPaths([blogFile,'server.js'],'',{
 previousDocuments:{[blogFile]:{articles:[{slug:'busan',tags:['#before']},{slug:'daegu',tags:['#keep']}]}},
 currentDocuments:{[blogFile]:{articles:[{slug:'busan',tags:['#after']},{slug:'daegu',tags:['#keep']}]}}
}),['/blog/daeri-regions/busan/'],'changed hashtag source only notifies its changed original article URL');
for(const url of blogHashtagPaths)assert.deepEqual(changedPaths([url.slice(1)+'index.html']),[url],'one updated article maps to one submitted URL');
assert.deepEqual(changedPaths(['index.html']),['/']);
const seoFile='data/seo-pages.json';
const oldSeo={pages:[{path:'/',title:'home'},{path:'/taksong/',title:'old taksong'},{path:'/daeri/',title:'daeri'},{path:'/region/',title:'region'}]};
const newSeo={pages:[{path:'/',title:'home'},{path:'/taksong/',title:'new taksong'},{path:'/daeri/',title:'daeri'},{path:'/region/',title:'region'}]};
const seoOptions={previousDocuments:{[seoFile]:oldSeo},currentDocuments:{[seoFile]:newSeo}};
assert.deepEqual(changedPaths([seoFile],'',seoOptions),['/taksong/'],'only the SEO landing page whose metadata changed may be submitted');
assert.deepEqual(changedPaths([seoFile],'',{previousDocuments:{[seoFile]:newSeo},currentDocuments:{[seoFile]:newSeo}}),[],'unchanged SEO pages must not be resubmitted');
assert.deepEqual(changedPaths(['blog/posts.json']),['/blog/','/blog/archive/']);
assert.deepEqual(changedPaths(['data/ride-history.json']),['/reviews/history/','/reviews/taksong/']);
assert.deepEqual(changedPaths(['server.js','index.html',seoFile],'',seoOptions),['/','/taksong/'],'an HTML change and one SEO rule change notify only their two canonical pages');
assert.deepEqual(changedPaths([], '/taksong/busan/,/taksong/daegu/'),['/taksong/busan/','/taksong/daegu/']);
assert.throws(()=>changedPaths([], 'https://other.example/taksong/busan/'),/Foreign host/);
assert.throws(()=>changedPaths([], '/taksong/busan/?campaign=1'),/Noncanonical manual URL/);
assert.throws(()=>changedPaths([],Array(11).fill('/taksong/busan/').join(',')),/Only ten/);

// Curated source guides update the HTML of their existing locality/service
// routes. Only already-reviewed priority sitemap pages qualify, never every
// synonym or source-only village keyword from the 2,900 editorial candidates.
const fs=require('node:fs'),path=require('node:path');
const editedCurated={
 'data/naver-regional-focus-sixth-100.json':['세종시탁송','세종법인대리운전'],
 'data/naver-regional-focus-next-50.json':['원주탁송','진주탁송'],
 'data/naver-regional-focus-third-50.json':['원주일일기사'],
 'data/naver-regional-focus-fourth-50.json':['나주탁송','김천탁송'],
 'data/naver-regional-focus-fifth-daeri-50.json':['나주법인카드대리운전'],
 'data/naver-regional-focus-fifteenth-daeri-100.json':['세종반곡동대리업체','세종집현동대리운전업체'],
 'data/naver-regional-focus-fifteenth-taksong-100.json':['세종반곡동장거리탁송','세종집현동차량탁송'],
 'data/naver-regional-focus-thirteenth-daeri-100.json':['나주빛가람동법인대리운전','진주하대동대리운전'],
 'data/naver-regional-focus-thirteenth-taksong-100.json':['나주빛가람동자동차탁송','진주하대동차량탁송']
};
const verifiedCuratedUrls=new Map([
 ['taksong|세종특별자치시','/taksong/sejong/'],
 ['daeri|세종특별자치시','/daeri/sejong/'],
 ['taksong|강원특별자치도 원주시','/taksong/gangwon/wonju-si/'],
 ['daeri|강원특별자치도 원주시','/daeri/gangwon/wonju-si/'],
 ['taksong|경상남도 진주시','/taksong/gyeongnam/jinju-si/'],
 ['taksong|전라남도 나주시','/taksong/jeonnam/naju-si/'],
 ['daeri|전라남도 나주시','/daeri/jeonnam/naju-si/'],
 ['taksong|경상북도 김천시','/taksong/gyeongbuk/gimcheon-si/']
]);
const curatedOld={},curatedNew={};
let nModifiedRows=0;
for(const [filename,keywords] of Object.entries(editedCurated)){
 const now=JSON.parse(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'));
 const before={...now,priority:now.priority.map(row=>{
  if(!keywords.includes(row.keyword))return row;
  nModifiedRows++;
  return {...row,pickup:'Previous unedited source guide text'};
 })};
 curatedOld[filename]=before;curatedNew[filename]=now;
}
assert.equal(nModifiedRows,16,'Read 16 actually published source guide entries');
const curatedOptions={previousDocuments:curatedOld,currentDocuments:curatedNew,priorityHrefMap:verifiedCuratedUrls};
const publishedChangedUrls=changedPaths(Object.keys(editedCurated),'',curatedOptions);
assert.equal(publishedChangedUrls.length,8,'16 editorial records modify only eight previously reviewed canonical priority pages');
assert.deepEqual(publishedChangedUrls.slice().sort(),[...verifiedCuratedUrls.values()].sort(),
 'Do not submit unreviewed individual neighborhood/keyword permutations');
assert.deepEqual(changedPaths(Object.keys(editedCurated),'',{...curatedOptions,previousDocuments:curatedNew}),[],
 'A formatting-only curated source change cannot resubmit an unchanged page');
assert.throws(()=>changedPaths(Object.keys(editedCurated),'',{...curatedOptions,priorityHrefMap:null}),
 /Live published priority URL lookup is required/,
 'Never map an editorial data file to a guessed canonical URL');
assert.deepEqual(changedPaths(['data/naver-regional-focus-twenty-first-candidates.json']),[],
 'Draft candidate sources are not published IndexNow URL changes');
const twelveSource='data/naver-regional-focus-test-12.json';
const twelveOld={priority:Array.from({length:12},(_,i)=>({region:'가상지역'+i,kind:'taksong',pickup:'old'+i}))};
const twelveNew={priority:twelveOld.priority.map((x,i)=>({...x,pickup:'new'+i}))};
const twelveApproved=new Map(twelveNew.priority.map((x,i)=>[x.kind+'|'+x.region,'/taksong/approved-'+i+'/']));
assert.throws(()=>changedPaths([twelveSource],'',{
 previousDocuments:{[twelveSource]:twelveOld},currentDocuments:{[twelveSource]:twelveNew},
 priorityHrefMap:twelveApproved
}),/More than ten genuine changed URLs/,
 'Never silently truncate a genuine 11+ page change or send an unchecked batch');

console.log('PASS: verified saved-case IndexNow selection is one URL per changed document; code-only commits skip');

const notifyWorkflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/indexnow-notify.yml'),'utf8');
assert.match(notifyWorkflow,/fetch-depth: 0/);
assert(notifyWorkflow.includes('INDEXNOW_DEPLOY_SHA: ${{ github.event.workflow_run.head_sha }}'));
assert.doesNotMatch(notifyWorkflow,/ref: ${{ github.event.workflow_run.head_sha/);

// One URL uses the documented Naver GET shape with default root key location.
const one=notificationRequest(['https://jeongukdaeri.kr/']);
assert.equal(one.options.method,'GET');
assert.equal(new URL(one.url).origin,'https://searchadvisor.naver.com');
assert.equal(new URL(one.url).searchParams.get('url'),'https://jeongukdaeri.kr/');
assert.match(new URL(one.url).searchParams.get('key'),/^[a-z0-9]{8,128}$/i);
assert.equal(new URL(one.url).searchParams.has('keyLocation'),false);
assert.equal(one.options.body,undefined);
const korean='https://jeongukdaeri.kr/'+encodeURIComponent('설악산탁송')+'/';
assert.equal(new URL(notificationRequest([korean]).url).searchParams.get('url'),korean);
const multi=notificationRequest(['https://jeongukdaeri.kr/','https://jeongukdaeri.kr/daeri/']);
assert.equal(multi.options.method,'POST');
assert.equal(JSON.parse(multi.options.body).host,'jeongukdaeri.kr');
assert.deepEqual(JSON.parse(multi.options.body).urlList,['https://jeongukdaeri.kr/','https://jeongukdaeri.kr/daeri/']);
for(const bad of ['http://jeongukdaeri.kr/','https://www.jeongukdaeri.kr/','https://other.example/','https://jeongukdaeri.kr/?q=1'])assert.throws(()=>notificationRequest([bad]),/Invalid official canonical URL/);
