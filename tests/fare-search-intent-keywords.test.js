'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const home=read('index.html'),fare=read('fare/index.html'),server=read('server.js');
const keywords=require('../lib/keyword-card-expansion');
const seo=JSON.parse(read('data/seo-pages.json'));
const rows=[
 ['대리비','daeri'],['대리비견적','daeri'],
 ['탁송비','taksong'],['탁송견적','taksong'],['탁송비견적','taksong']
];
const quote=home.indexOf('id="homepage-fare-form"');
const services=home.indexOf('id="homepage-primary-services-20261106"');
assert(quote>0&&services>quote,'Existing mobile fare form must precede category browsing without changing the approved homepage top');
assert(home.includes('action="/fare/" method="get" id="homepage-fare-form"'),'Homepage fare form must open the canonical calculator');
assert(home.includes('name="service"')&&home.includes('<option value="taksong">탁송</option>')&&home.includes('<option value="daeri">대리운전</option>'),'Homepage must offer both real service types');
assert(home.includes('href="tel:18114294"'),'Homepage phone consultation must remain available');
assert(fare.indexOf('id="fare-cost-quote-keywords-20261107"')>fare.indexOf('id="quote-form"'),
 'Keep the mobile calculator above search guidance');
assert(fare.indexOf('id="fare-cost-quote-keywords-20261107"')<fare.indexOf('id="regional-route-keyword-search"'),
 'Fare search guide must not be buried below unrelated regional content');
assert(fare.includes('현재 확정')||fare.includes('상담으로 확정'),'Do not imply reference prices are guaranteed');
for(const [term,service] of rows){
 const resolved=keywords.resolve(term);
 assert(resolved,'Keyword not recognized: '+term);
 assert.equal(resolved.kind,service,term+' must identify the correct service');
 assert.equal(resolved.url,'/fare/?service='+service,term+' must open the calculator');
 // Search-intent aliases resolve to the calculator; the approved homepage top does not require five redundant chips.
 assert(fare.includes('<strong>'+term+'</strong>'),term+' must have an honest explanation on the canonical fare page');
 assert(server.includes("'"+term+"':'/fare/?service="+service+"'"),term+' missing from direct keyword routing');
 assert(seo.pages.find(p=>p.path==='/').description.includes(term),term+' missing from canonical homepage metadata');
}
assert(server.includes("card.displayKeyword=query+' · 예상 참고요금 조회'"),
 'Cost estimates should not be incorrectly labelled mountain or cycling courses');
for(const route of ['/daeri/','/taksong/']){
 assert(seo.pages.find(p=>p.path===route).description.includes(route==='/daeri/'?'대리비견적':'탁송비견적'),
 'Main service SEO metadata must mention the appropriate fare intent');
}
console.log('PASS five quote keywords route to canonical fare page, visible mobile links and correct services');
