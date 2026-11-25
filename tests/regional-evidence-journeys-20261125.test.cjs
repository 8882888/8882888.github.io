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
test('Ten distinct regional pages connect to five existing published approved records, with accurate origin and destination roles',()=>{
 const journeys=createRegionalEvidenceJourneys(options);
 assert.equal(journeys.size,10);
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
 assert.equal(notes.size,10);
 assert.equal(journeys.render({full_name:'경기도 용인시 기흥구'},'taksong'),'');
 const incomplete=createRegionalEvidenceJourneys({...options,publishedCases:[]});
 assert.equal(incomplete.size,0);
});
