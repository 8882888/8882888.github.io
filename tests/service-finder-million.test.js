'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {create,serviceNames,intentNames}=require('../lib/service-finder-million');
const folder='data/legal-regions';
const files=fs.readdirSync(folder).filter(x=>/^\d\d\.json$/.test(x)).sort();
const regions=[],byFull=new Map();
for(const file of files)for(const full_name of require('../'+folder+'/'+file).full_names){
 const parts=full_name.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
 assert(parts.length===1||parent,'missing parent '+full_name);
 const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const region={slug:'area-'+(regions.length+1),name,full_name,level};
 regions.push(region);byFull.set(full_name,region);
}
assert.equal(regions.length,20562);
assert.equal(Object.keys(serviceNames).length,5);
assert.equal(intentNames.length,10);
const find=create(regions,(r,kind)=>'/'+kind+'/'+r.slug+'/','example.com');
assert.equal(find.combinations,1028100,'real lookup matrix over one million');
for(const kind of Object.keys(serviceNames)){
 const result=find.search('강화',kind);
 assert.equal(result.count,1028100);
 assert.equal(result.selectedService,kind);
 assert(result.results.some(x=>x.name==='인천광역시 강화군'),'Ganghwa exact city-county lookup');
 const link=result.results.find(x=>x.name==='인천광역시 강화군').links;
 assert.equal(link.length,1);
 assert(link[0].url.startsWith(kind==='daeri'||kind==='taksong'?'/'+kind+'/':'/reviews/local/'+kind+'/'));
}
assert(find.search('양도면').results.some(x=>x.name.includes('강화군 양도면')),'town lookup');
assert(find.search('강화대리운전').results.some(x=>x.name==='인천광역시 강화군'),'trailing service phrase stripped');
assert(find.search('부산 해운대구').results.some(x=>x.full_name==='부산광역시 해운대구'||x.name==='부산광역시 해운대구'),'full region query');
assert(find.page().includes('content="index,follow"'),'only main finder indexable');
const qPage=find.page('<script>alert(1)</script>');
assert(qPage.includes('content="noindex,follow"'),'search query pages must not be indexed');
assert(!qPage.includes('<script>alert(1)</script>'),'input escaped');
assert(qPage.includes('rel="canonical" href="https://example.com/find/"'));
assert(find.page('강화').includes('1,028,100')&&find.page('강화').includes('1811-4294'));
const home=fs.readFileSync('index.html','utf8');
assert(home.includes('class="hero-local-finder"')&&home.includes('action="/find/"'));
assert.equal(require('../data/ride-history.json').length,2591,'2,591 original records preserved');
const server=fs.readFileSync('server.js','utf8');
assert(server.includes("pathname==='/api/find-regions'")&&server.includes("pathname==='/find/'"));
assert(server.includes("'/region/','/find/'"),'single canonical finder in priority sitemap');
console.log('PASS: 20,562 regions x 5 services x 10 intents = 1,028,100 lookup choices; 2,591 original rides preserved, search pages noindex, homepage and sitemap linked');
