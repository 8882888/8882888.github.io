'use strict';
const assert=require('node:assert/strict');
const manifest=require('../data/review-first-500-services.json');
const {create,names}=require('../lib/review-first-500');
const fs=require('node:fs');
const files=fs.readdirSync('data/legal-regions').filter(x=>/^\d\d\.json$/.test(x)).sort();
const regions=[],byFull=new Map();let n=0;
for(const file of files){
 const doc=require('../data/legal-regions/'+file);
 for(const full of doc.full_names){
  const pieces=full.split(' '),name=pieces.at(-1),parent=byFull.get(pieces.slice(0,-1).join(' '));
  const level=pieces.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
  const r={slug:'area-'+(++n),full_name:full,name,level,parent_name:parent?.name||'대한민국'};regions.push(r);byFull.set(full,r);
 }
}
assert.equal(regions.length,20562);
assert.equal(manifest.regions.length,100);
assert.equal(manifest.services.length,5);
assert.equal(new Set(manifest.regions.map(r=>r.slug)).size,100);
const provinces=new Set(manifest.regions.map(r=>r.full_name.split(' ')[0]));
assert.equal(provinces.size,17,'include all 17 provinces');
for(const r of manifest.regions)assert.equal(regions.find(x=>x.slug===r.slug)?.full_name,r.full_name,'region slug is accurate');
const entries=require('../data/public-reviewed-rides-202610.json');
const posts=require('../blog/posts.json');
const hub=create(regions,entries,posts,'jeongukdaeri.kr');
let count=0,eligible=0;
for(const r of manifest.regions)for(const service of manifest.services){
 const html=hub.render(service,r.slug);
 assert(html,'each of 500 review hub routes must render');
 assert(html.includes('rel="canonical" href="https://jeongukdaeri.kr/reviews/local/'+service+'/'+r.slug+'/'));
 assert(html.includes('1811-4294')&&html.includes('/fare/'));
 assert(html.includes('<h1>')&&html.includes('후기'));
 const indexable=html.includes('content="index,follow"');
 if(indexable){eligible++;assert(['daeri','taksong'].includes(service),'unsupported specialist completion may not be indexed');assert(html.includes('실제 운행기록'),'indexed page must have verified evidence')}
 else assert(html.includes('content="noindex,follow"'));
 if(['corporate','daily-driver','golf'].includes(service))assert(!indexable,'never classify general dispatch as specialist completion');
 count++;
}
assert.equal(count,500);
assert(hub.index().includes('500개'));
assert.equal(hub.render('golf','area-999999'),null);
assert.deepEqual(Object.keys(names),manifest.services);
console.log('PASS: '+count+' complete 5-service region pages, 17 provinces; verified-only indexing '+eligible+' cases; phone/fare/canonical preserved');
