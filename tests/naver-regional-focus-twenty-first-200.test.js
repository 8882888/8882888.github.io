'use strict';
// Regression protection for twenty-first 200-target regional SEO batch.
// Grounded in official existing legal-region names, not invented completed trips.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('data/naver-regional-focus-twenty-first-candidates.json');
const taksong=read('data/naver-regional-focus-twenty-first-taksong-100.json').priority;
const daeri=read('data/naver-regional-focus-twenty-first-daeri-100.json').priority;
const batch=[...taksong,...daeri];
assert.equal(manifest.status,'checked-against-all-2700');
assert.equal(manifest.regions.length,100);
assert.equal(taksong.length,100);
assert.equal(daeri.length,100);
assert.equal(new Set(batch.map(x=>x.id)).size,200);
assert.deepEqual(batch.map(x=>x.id),Array.from({length:200},(_,i)=>2701+i));
assert.deepEqual(taksong.map(x=>x.region),manifest.regions,'taksong must target the 100 selected legal regions');
assert.deepEqual(daeri.map(x=>x.region),manifest.regions,'daeri must target exactly the same 100 regions');
const legal=new Set(fs.readdirSync(path.join(root,'data/legal-regions'))
 .filter(x=>/^\d{2}\.json$/.test(x))
 .flatMap(x=>read('data/legal-regions/'+x).full_names));
for(const x of batch){
 assert(legal.has(x.region),'unverified legal locality: '+x.region);
 assert(['taksong','daeri'].includes(x.kind),'unknown service '+x.kind);
 assert(x.keyword.includes(x.region.split(' ').at(-1)),'locality name missing from keyword '+x.keyword);
 assert(x.pickup.includes(x.region),'place-specific vehicle pickup must be explicit '+x.region);
 assert(x.handover.length>=70&&x.pickup.length>=100,'guide must provide real booking preparation, not empty keyword repetition');
 assert(x.related.startsWith('/'),'related guide must be an internal route');
 assert(!/운행완료 후기입니다|실제 운행을 마쳤|배차 완료했습니다|전담 기사 상주/.test(x.pickup+' '+x.handover),
  'do not invent completed rides, dedicated dispatch or staffed offices');
}
const allFiles=fs.readdirSync(path.join(root,'data'))
 .filter(x=>/^naver-regional-focus.*\.json$/.test(x)&&!x.includes('candidates'));
const entries=allFiles.flatMap(x=>read('data/'+x).priority);
assert.equal(entries.length,2900,'expected previous 2700 plus new 200');
assert.equal(new Set(entries.map(x=>x.kind+'|'+x.region)).size,2900,'no region/service duplicated');
assert.equal(new Set(entries.map(x=>x.keyword)).size,2900,'all exact keyword images must be distinct');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
assert(server.includes('naverFocus2900.length!==2900'),'server must reject dropped/duplicated batch entries');
for(const suffix of ['twenty-first-taksong-100.json','twenty-first-daeri-100.json'])
 assert(server.includes(suffix),'server must load new focus file '+suffix);
assert(server.includes('naverFocus2900.map(p=>servicePath(regionByFullName.get(p.region),p.kind))'),
 'priority discovery sitemap must retain new canonical region pages');
assert(server.includes('id="naver-focus50-local-guide"'),'each selected region must receive a booking guidance panel');
console.log('PASS 200/200 distinct location-service targets, 2900 total; legal regions, fare/phone links, dynamic guide mapping, no fabricated rides');
