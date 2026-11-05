'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('server.js'),seo=read('tools/audit_live_seo.py'),home=read('index.html');
const slugs=['seoul','busan','incheon','daegu','gwangju','daejeon','ulsan','sejong','gyeonggi','gangwon','chungbuk','chungnam','jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju'];
const targets=[...slugs.map(s=>'/taksong/'+s+'/'),'/reviews/history/','/fare/','/coverage/'];
assert.equal(targets.length,20);
assert.equal(new Set(targets).size,20);
assert(seo.includes('NATIONWIDE_BATCH_20'),'Live audit must include priority 20 URLs');
for(const route of targets){
 assert(seo.includes('"'+route+'"'),'Missing monitored target '+route);
}
assert(server.includes('function nationwideCoveragePage()'),'Nationwide hub route must exist');
assert(server.includes("pathname==='/coverage/'"),'Nationwide public URL must resolve');
assert(home.includes('href="/coverage/"'),'Nationwide hub must be discoverable from homepage');
assert(server.includes('function historyIndexPage('),'Actual history search must be preserved');
assert(server.includes('matchingHistoryRegion(x,matchedRegion,regions)'),'History attribution must not fabricate region');
assert(server.includes('historicalRides.length!==2591'),'Original 2,591 records protected');
assert(fs.existsSync(path.join(root,'fare/index.html')),'Public fare calculator must exist');
console.log('PASS: 20 distinct nationwide SEO monitoring targets, official service routes and truthful review source');
