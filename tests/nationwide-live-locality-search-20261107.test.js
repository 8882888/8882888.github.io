'use strict';
// Protect real 17-province location autocomplete, homonym disambiguation,
// and the one-tap mobile quote/telephone path without fabricated location data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {createNationwideLocalityExplorer}=require('../lib/nationwide-locality-explorer');
const regions=[],byFull=new Map(),bySlug=new Map(),childrenByParent=new Map();
for(let i=1;i<=17;i++){
 const doc=JSON.parse(read('data/legal-regions/'+String(i).padStart(2,'0')+'.json'));
 for(const full_name of doc.full_names){
  if(byFull.has(full_name))continue;
  const parts=full_name.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
  if(parts.length>1)assert(parent,'Missing actual administrative parent '+full_name);
  const region={name,full_name,slug:'locality-'+regions.length,parent_slug:parent?.slug||null};
  regions.push(region);byFull.set(full_name,region);bySlug.set(region.slug,region);
  if(parent){const xs=childrenByParent.get(parent.slug)||[];xs.push(region);childrenByParent.set(parent.slug,xs)}
 }
}
assert(regions.length>=20562,'Preserve nationwide 20,562 locality baseline');
const explorer=createNationwideLocalityExplorer({regions,bySlug,childrenByParent,servicePath:(r,kind)=>'/'+kind+'/area/'+r.slug+'/'});
const expectFirst=(input,service,fullName)=>{
 const suggestions=explorer.suggestions(input,{kind:service});
 assert(suggestions.length>0&&suggestions.length<=8,'Suggestion count must be bounded '+input);
 assert.equal(suggestions[0].full_name,fullName,'Wrong first administrative match '+input);
 assert(suggestions[0].service_url.startsWith('/'+service+'/'),'Wrong customer service detail '+input);
 assert(suggestions[0].quote_url.startsWith('/fare/?service='+service+'&from='),'Missing honest route quote link');
};
expectFirst('부산','taksong','부산광역시');
expectFirst('서울 강남구','daeri','서울특별시 강남구');
expectFirst('세종 나성동','daeri','세종특별자치시 (직할) 나성동');
expectFirst('강화군 양도면','daeri','인천광역시 강화군 양도면');
expectFirst('부산해운대구우동탁송비견적','taksong','부산광역시 해운대구 우동');
expectFirst('제주제주시연동탁송견적','taksong','제주특별자치도 제주시 연동');
const homonyms=explorer.suggestions('중구',{kind:'daeri',limit:12});
assert(homonyms.length>1,'Do not collapse different 중구 regions');
assert.equal(new Set(homonyms.map(x=>x.full_name)).size,homonyms.length,'Disambiguate with full addresses');
assert.equal(explorer.resolve('중구대리운전'),null,'Never redirect ambiguous shorthand to a random city');
assert.deepEqual(explorer.suggestions(''),[],'No all-country suggestions for a blank query');
assert.deepEqual(explorer.suggestions('서'),[],'Avoid a huge result for one character');
assert.deepEqual(explorer.suggestions('대구양도면대리운전'),[],'Do not invent a non-existent subarea');
const max=explorer.suggestions('동',{kind:'taksong',limit:40});
assert.equal(max.length,0,'Single-letter search must be limited');
assert(explorer.suggestions('서울',{limit:100}).length<=12,'Hard cap to 12 suggestions');
const server=read('server.js'),home=read('index.html');
assert(server.includes("if(pathname==='/api/locality-suggest'){"),'Autocomplete JSON API route missing');
assert(server.includes('nationwideExplorer.suggestions(query,{kind,limit:8})'),'API must use real 17-province dataset');
assert(server.includes("res.setHeader('x-robots-tag','noindex, nofollow')"),'Autocomplete must not be indexed');
const first=home.indexOf('id="homepage-fare-form"'),search=home.indexOf('id="nationwide-live-locality-20261107"'),services=home.indexOf('id="homepage-primary-services-20261106"');
assert(first>0&&first<services&&services<search,'Keep the quote first, primary services directly below it, and live locality search afterward');
assert(!home.includes('id="dynamic-service-card-search-20261103"'),'Retired dynamic card search must not reappear');
assert(home.includes('id="nationwide-live-query-20261107"')&&home.includes('id="nationwide-live-results-20261107"'),'Accessible input and live results missing');
assert(home.includes("fetch('/api/locality-suggest?'"),'Client must query actual locality suggestions');
assert(home.includes("document.createElement('a')")&&home.includes("a.textContent=text"),'Safe DOM links are required');
assert(home.includes('href="tel:18114294"'),'National quote consultation phone must remain');
const match=home.match(/<script id="nationwide-live-search-client-20261107">([\s\S]*?)<\/script>/);
assert(match,'Live client script missing');
assert.doesNotThrow(()=>new Function(match[1]),'Live search JavaScript syntax invalid');
assert.equal(JSON.parse(read('data/ride-history.json')).length,2591,'Verified ride history must be preserved');
console.log('PASS 17-province live locality search, 20562 actual places, ambiguity safeguards, mobile quote/phone');
