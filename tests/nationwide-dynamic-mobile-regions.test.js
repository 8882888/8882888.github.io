'use strict';
// Coverage is generated from the committed 17 province files; no fake branch,
// fare, ride record or 20,562 duplicate keyword pages are created.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {createNationwideLocalityExplorer}=require('../lib/nationwide-locality-explorer');
const regions=[],byFull=new Map(),bySlug=new Map(),childrenByParent=new Map(),provinces=[];
for(let i=1;i<=17;i++){
 const file='data/legal-regions/'+String(i).padStart(2,'0')+'.json';
 const doc=JSON.parse(read(file));const names=doc.full_names;
 assert(names.length>0&&new Set(names).size===names.length,file+' must be nonempty and duplicate-free');
 assert(names[0]===doc.province,file+' must begin with its province');
 provinces.push(doc.province);
 for(const full of names){
  assert(!byFull.has(full),'Nationwide duplicate full locality: '+full);
  const parts=full.split(' '),parentName=parts.slice(0,-1).join(' '),parent=byFull.get(parentName);
  if(parts.length>1)assert(parent,'Parent not found for '+full);
  const r={name:parts.at(-1),full_name:full,slug:'test-'+regions.length,parent_slug:parent?.slug||null};
  regions.push(r);byFull.set(full,r);bySlug.set(r.slug,r);
  if(parent){const kids=childrenByParent.get(parent.slug)||[];kids.push(r);childrenByParent.set(parent.slug,kids)}
 }
}
assert.equal(provinces.length,17,'All seventeen provinces must be loaded');
assert(regions.length>=20562,'Preserve at least the current 20,562 legal locality paths while allowing future region additions');
const explorer=createNationwideLocalityExplorer({regions,bySlug,childrenByParent,servicePath:(r,kind)=>'/'+kind+'/'+r.slug+'/'});
assert(explorer.indexedAliases>regions.length,'Region aliases should include qualified and unique shorthand names');
for(const full of provinces){
 const r=byFull.get(full),children=explorer.childrenFor(r);
 assert(children.length>0,full+' must present useful descendants or children');
 assert.equal(new Set(children.map(x=>x.full_name)).size,children.length,'No repeated subareas in '+full);
 for(const kind of ['daeri','taksong']){
  const page=explorer.chooser(r,kind);
  assert(page.includes('id="nationwide-subareas-20261107"'),full+' mobile chooser missing');
  assert(page.includes('<summary')&&page.includes('<details'),full+' must be collapsed on mobile');
  assert.equal(page.split('class="nationwide-child-region"').length-1,children.length,
    full+' must display each child exactly once');
  assert.equal(page.split('href="/fare/?service=').length-1,children.length,
    full+' must provide one quote link for every child');
 }
}
// Every *complete, unambiguous legal address* must resolve to itself.
for(const r of regions){
 if(r.name==='(직할)')continue;
 const ride=explorer.resolve(r.full_name+'대리운전');
 const price=explorer.resolve(r.full_name+'탁송비견적');
 assert(ride&&ride.region.full_name===r.full_name&&ride.kind==='daeri',
  'Wrong full-name driver route: '+r.full_name);
 assert(price&&price.region.full_name===r.full_name&&price.kind==='taksong'&&price.quote,
  'Wrong full-name vehicle quote route: '+r.full_name);
 assert(price.url.startsWith('/fare/?service=taksong&from=')&&!price.url.includes('%25'),
  'Encoded quote destination must not be encoded twice');
}
const ganghwa=byFull.get('인천광역시 강화군');
const official=['강화읍','선원면','불은면','길상면','화도면','양도면','내가면','하점면','양사면','송해면','교동면','삼산면','서도면'];
assert.deepEqual(explorer.childrenFor(ganghwa).map(r=>r.name),official,
 'Ganghwa 13 official subdivisions must come from the nationwide dataset');
const ganghwaHtml=explorer.chooser(ganghwa,'daeri');
for(const town of official){
 const child=byFull.get('인천광역시 강화군 '+town);
 assert(ganghwaHtml.includes('href="/fare/?service=daeri&amp;from='+encodeURIComponent(child.full_name)+'"'),
  'Prefilled town estimate missing '+town);
}
assert.equal(explorer.childrenFor(byFull.get('서울특별시')).length,25,'Seoul 25 districts');
assert.equal(explorer.childrenFor(byFull.get('세종특별자치시')).length,33,
 'Sejong direct districts/towns must skip the internal (직할) grouping');
const cases=[
 ['강화군양도면대리운전','인천광역시 강화군 양도면','daeri'],
 ['인천광역시 강화군 화도면탁송','인천광역시 강화군 화도면','taksong'],
 ['강화읍대리비견적','인천광역시 강화군 강화읍','daeri'],
 ['서울강남구역삼동대리운전','서울특별시 강남구 역삼동','daeri'],
 ['부산해운대구우동탁송','부산광역시 해운대구 우동','taksong'],
 ['세종나성동대리운전','세종특별자치시 (직할) 나성동','daeri'],
 ['제주제주시연동탁송견적','제주특별자치도 제주시 연동','taksong']
];
for(const [keyword,locality,kind] of cases){
 const result=explorer.resolve(keyword);
 assert(result&&result.region.full_name===locality&&result.kind===kind,keyword+' wrong service or locality');
}
for(const keyword of ['중구대리운전','고성군대리운전','대구양도면대리운전']){
 assert.equal(explorer.resolve(keyword),null,'Ambiguous or invalid locality must not choose a false address: '+keyword);
}
const server=read('server.js');
for(const phrase of [
 "createNationwideLocalityExplorer({regions,bySlug,childrenByParent,servicePath,escapeHtml:esc})",
 "const nationwideSubareaChoices=regionalNationwideSubareaChooser(r,kind);",
 "nationwideRegionTarget(searchIntent)||regionalServiceTarget(searchIntent)",
 "const nationalDirect=rawQuery?nationwideExplorer.resolve(rawQuery):null",
 "const national=nationwideExplorer.resolve(query)",
 "if(pathname==='/api/nationwide-locality-card.svg')"
])assert(server.includes(phrase),'Missing nationwide server integration: '+phrase);
assert(server.indexOf('  nationwideSubareaChoices+')<
 server.indexOf("'<h3>공개된 실제 완료 운행 '+distinct.length"),'Mobile town chooser must appear above long ride lists');
assert(server.includes('const childLinks=!nationwideSubareaChoices&&related.length?'),
 'Do not duplicate nearby region links when the full nationwide selector is shown');
assert(!server.includes('ganghwaTownTarget('),'No special county-only query routing may survive');
assert(server.includes("location:target.startsWith('/fare/?')?target:encodeURI(target)"),
 'Protect query-string percent encodings from double encoding');
const history=JSON.parse(read('data/ride-history.json'));
assert.equal(history.length,2591,'The original 2591 completed ride records must stay intact');
console.log('PASS 17 provinces, 20,562 complete localities, mobile chooser, service intents, no ambiguous matching or invented prices');
