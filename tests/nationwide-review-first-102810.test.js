'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {create,names,targets}=require('../lib/review-first-500');
const files=fs.readdirSync('data/legal-regions').filter(x=>/^\d{2}\.json$/.test(x)).sort();
assert.equal(files.length,17,'all provinces required');
const regions=[],seen=new Set(),byFull=new Map();
for(const filename of files){
 const doc=require('../data/legal-regions/'+filename);
 for(const full of doc.full_names){
  assert(!seen.has(full),'duplicate official region '+full);
  seen.add(full);
  const parts=full.split(' '),name=parts.at(-1);
  const parent=byFull.get(parts.slice(0,-1).join(' '));
  assert(parts.length===1||parent,'administrative parent missing '+full);
  const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
  const r={slug:'area-'+(regions.length+1),name,full_name:full,level,parent_name:parent?.name||'대한민국'};
  regions.push(r);byFull.set(full,r);
 }
}
assert.equal(regions.length,20562);
assert.equal(regions.length*Object.keys(names).length,102810);
assert.equal(targets.regions.length,100,'legacy 500-target work must remain');
const hub=create(regions,require('../data/public-reviewed-rides-202610.json'),require('../blog/posts.json'));
assert.equal(hub.totalCombinations,102810);
assert(hub.index().includes('500개'));
assert(hub.index().includes('/reviews/local/nationwide/'));
for(const level of ['시도','시','군','구','읍','면','동','리']){
 const region=regions.find(r=>r.level===level);
 assert(region,'missing '+level+' example');
 for(const kind of Object.keys(names)){
  const html=hub.render(kind,region.slug);
  assert(html&&html.includes('<h1>')&&html.includes('후기'),'no render or missing local review heading for '+level+'/'+kind);
  assert(html.includes('rel="canonical" href="https://jeongukdaeri.kr/reviews/local/'+kind+'/'+region.slug+'/'));
  assert(html.includes('1811-4294')&&html.includes('/fare/'));
  if(!targets.regions.some(x=>x.slug===region.slug))assert(html.includes('content="noindex,follow"'),'new mass-generated page must not be indexed');
 }
}
const final=regions.at(-1);
for(const kind of Object.keys(names)){
 const html=hub.render(kind,final.slug);
 assert(html,'last legal administrative area '+kind+' must resolve');
 assert(html.includes('noindex,follow'),'unverified mass URL must stay noindex');
}
assert.equal(hub.nationwideIndex(1).match(/href="\/reviews\/local\/(?:taksong|daeri|corporate|daily-driver|golf)\/area-\d+\//g).length,100,'20 areas times five services on one directory page');
assert.equal(hub.nationwideIndex(1029).includes(final.full_name),true,'final page contains last region');
assert.equal(hub.nationwideIndex(1030),null,'out of range denied');
assert.equal(hub.nationwideIndex(0),null,'invalid paging denied');
assert(!hub.render('golf','area-999999'),'unknown locality returns 404');
assert(hub.nationwideIndex(1).includes('102,810'));
console.log('PASS: 20,562 real regions × five distinct services = 102,810 valid routes; eight administrative levels; safe noindex and 1,029 paginated index entries.');
