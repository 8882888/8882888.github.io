'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=read('server.js'),home=read('index.html'),seo=read('tools/audit_live_seo.py');
const names=[];
for(let n=1;n<=17;n++){
 const d=JSON.parse(read('data/legal-regions/'+String(n).padStart(2,'0')+'.json'));
 names.push(d.full_names[0]);
}
assert.equal(names.length,17);
assert.equal(new Set(names).size,17,'Province names must be unique');
assert(server.includes('function nationwideCoveragePage()'),'17-province coverage page required');
assert(server.includes("provinces.length!==17||unique.size!==17"),'All provinces must remain verified at runtime');
assert(server.includes("pathname==='/coverage/'"),'Coverage route must serve over HTTP');
assert(server.includes("'/coverage/','/taksongdaeri/'"),'Primary sitemap must include coverage page');
assert(home.includes('href="/coverage/"'),'Homepage must link to nationwide province index');
assert(server.includes("servicePath(r,'taksong')")&&server.includes("servicePath(r,'daeri')"),'Province hub must link both services');
assert(server.includes('matchingHistoryRegion(x,matchedRegion,regions)'),'Region ride matching must stay evidence-backed');
assert(server.includes('href="/reviews/history/?region=\'+encodeURIComponent(r.slug)'),'Province links must filter verified records');
assert(server.includes('href="/fare/?service=taksong&amp;from=\'+encodeURIComponent(r.full_name)'),'Province must link prepared fare search');
assert(seo.includes('"/coverage/": "nationwide-seventeen-province-coverage-20261105"'),'Production SEO must check the new national index');
console.log('PASS: 17 real administrative provinces, homepage/sitemap/SEO routes and evidence-only review links');
