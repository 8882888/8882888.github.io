'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('server.js','utf8');
const home=fs.readFileSync('index.html','utf8');
const posts=require('../blog/posts.json');
const rides=require('../data/public-reviewed-rides-202610.json');
const page='/daeri/incheon/ganghwa-gun/';
assert(/const priorityLocalities=\[[\s\S]{0,120}'인천광역시 강화군'/.test(src)&&
 src.includes('const priorityLocalityRoutes=')&&src.includes('servicePath(r,\'daeri\')'),
 'Priority sitemap must include the canonical Ganghwa region through the legal-region route builder');
assert(src.includes("r.full_name==='인천광역시 강화군'"),'use canonical region not ambiguous Ganghwa name');
assert(src.includes('ganghwa-daeri-verified-editorial-20261104'),'unique editorial review above generic region template');
assert(src.includes('강화대리운전 실제 후기｜강화읍·선원면'),'unique Ganghwa title');
assert(src.includes('강화대리운전 완료 운행후기 2건'),'unique Ganghwa meta summary');
assert(src.includes('ganghwaReviewLead+ganghwaArchiveTable+regionHistoryAllLink+(busanReviewPage||ganghwaReviewPage?'),'put original evidence at top without redundant generic review section');
assert(home.includes('href="'+page+'"'),'homepage must link canonical Ganghwa region');
const verified=rides.filter(x=>x.service==='daeri'&&x.verified===true&&x.status==='completed'&&/강화|갑곳|선원|검단아라/.test([x.departure,x.destination].join(' ')));
for(const trip of [
 {dep:'강화읍',dest:'검단아라동',fare:'45,000원',date:'2026-10-21'},
 {dep:'강화갑곳리',dest:'선원면',fare:'20,000원',date:'2026-10-20'}
]){
 assert(verified.some(x=>x.departure===trip.dep&&x.destination===trip.dest&&x.fare===trip.fare&&x.date===trip.date),'unverified detail '+JSON.stringify(trip));
}
for(const id of ['224406966987','224405882853','224404751909','224380144582','224379337352','224408166759']){
 assert(posts.some(p=>p.url==='https://blog.naver.com/wjdtnr4757/'+id),'original blog proof missing '+id);
 assert(src.includes('https://blog.naver.com/wjdtnr4757/'+id),'regional editorial link missing '+id);
}
assert(home.includes('1811-4294'),'do not change official site number');
assert.equal(JSON.parse(fs.readFileSync('data/ride-history.json','utf8')).length,2591,'ride history must be kept');
console.log('PASS Ganghwa real dispatch cases, six published area sources, canonical sitemap and homepage discovery; original 2591 rides preserved');
