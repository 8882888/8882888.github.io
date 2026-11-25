'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const {loadPublishedCases,identifier}=require('../lib/published-case-feed');
const {createRegionalEvidenceJourneys,plans}=require('../lib/regional-evidence-journeys.cjs');
const owners=read('data/sitemap-url-owners.json'),reviewedRides=read('data/public-reviewed-rides-202610.json'),publishedCases=loadPublishedCases(root);
const regionByFullName=new Map();
const servicePaths=new Map();
const legal=new Set(Array.from({length:17},(_,i)=>read('data/legal-regions/'+String(i+1).padStart(2,'0')+'.json').full_names).flat());
for(const p of plans)for(const [full,url] of [[p.fromRegion,p.fromPath],[p.toRegion,p.toPath]]){
 assert.ok(legal.has(full),full);regionByFullName.set(full,{full_name:full,name:full.split(' ').at(-1)});servicePaths.set(full,url);
}
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const options={reviewedRides,publishedCases,regionByFullName,owners,esc,servicePath:r=>servicePaths.get(r.full_name)};
test('Sixteen distinct regional pages connect to eight existing published approved records, with accurate origin and destination roles',()=>{
 const journeys=createRegionalEvidenceJourneys(options);
 assert.equal(plans.length,8);
 assert.equal(journeys.size,16);
 const notes=new Set();
 for(const p of plans){
  const id=identifier(p);
  assert.ok(publishedCases.some(x=>x.id===id),id);
  for(const [full,role,other] of [[p.fromRegion,'출발',p.toPath],[p.toRegion,'도착',p.fromPath]]){
   const r=regionByFullName.get(full),html=journeys.render(r,p.service);
   assert.ok(html.includes('이 지역 '+role+' 기록'),full);
   assert.ok(html.includes('/reviews/verified/'+id+'/'));
   assert.ok(html.includes('href="'+other+'"'));
   assert.ok(html.includes(p.date)&&html.includes(p.fare));
   const q=html.match(/href="(\/fare\/\?[^"]+)"/)?.[1];
   const url=new URL(q.replaceAll('&amp;','&'),'https://jeongukdaeri.kr');
   assert.equal(url.searchParams.get('from'),p.departure);assert.equal(url.searchParams.get('to'),p.destination);
   assert.equal(journeys.render(r,p.service==='daeri'?'taksong':'daeri'),'');
   assert.equal(url.searchParams.get('service'),p.service);
   notes.add(html.match(/<\/time>[\s\S]*?<\/p><p>(.*?)<\/p>/)?.[1]);
  }
 }
 assert.equal(notes.size,16);
 assert.equal(journeys.render({full_name:'경기도 용인시 기흥구'},'taksong'),'');
 const incomplete=createRegionalEvidenceJourneys({...options,publishedCases:[]});
 assert.equal(incomplete.size,0);
});

test('Missing sitemap ownership, mismatched published facts and unverified sources suppress only the affected pair',()=>{
 const p=plans.at(-1),id=identifier(p),recordPath='/reviews/verified/'+id+'/';
 const r=regionByFullName.get(p.fromRegion);
 const withoutOwner={...owners};delete withoutOwner[recordPath];
 const missing=createRegionalEvidenceJourneys({...options,owners:withoutOwner});
 assert.equal(missing.size,14);assert.equal(missing.render(r,p.service),'');
 const changed=createRegionalEvidenceJourneys({...options,publishedCases:publishedCases.map(x=>x.id===id?{...x,fare:'1원'}:x)});
 assert.equal(changed.size,14);assert.equal(changed.render(r,p.service),'');
 const unverified=createRegionalEvidenceJourneys({...options,reviewedRides:reviewedRides.map(x=>identifier(x)===id?{...x,verified:false}:x)});
 assert.equal(unverified.size,14);assert.equal(unverified.render(r,p.service),'');
 const bugang=plans.find(x=>x.fromRegion.includes('부강면'));
 assert.ok(!createRegionalEvidenceJourneys(options).render(regionByFullName.get(bugang.fromRegion),bugang.service).includes('(직할)'));
});
