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
 assert.ok(legal.has(full),full);regionByFullName.set(full,{full_name:full,name:full.split(' ').at(-1)});servicePaths.set(p.service+'|'+full,url);
}
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const publicationQueue=read('data/verified-ride-publication-queue.json');
const options={reviewedRides,publicationQueue,publishedCases,regionByFullName,owners,esc,servicePath:(r,kind)=>servicePaths.get(kind+'|'+r.full_name)};
test('Fifty-four distinct regional pages connect to twenty-seven existing published approved records, with accurate origin and destination roles',()=>{
 const journeys=createRegionalEvidenceJourneys(options);
 assert.equal(plans.length,27);
 assert.equal(journeys.size,54);
 const notes=new Set();
 assert.equal(new Set(plans.flatMap(p=>[p.service+'|'+p.fromRegion,p.service+'|'+p.toRegion])).size,54);
 assert.equal(new Set(plans.map(identifier)).size,27);
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
   const opposite=p.service==='daeri'?'taksong':'daeri';
   const otherService=journeys.render(r,opposite);
   const otherPlan=plans.find(x=>x.service===opposite&&[x.fromRegion,x.toRegion].includes(full));
   if(otherPlan){
    assert.ok(otherService.includes('/reviews/verified/'+identifier(otherPlan)+'/'),full+' independent opposite service');
    assert.ok(!otherService.includes('/reviews/verified/'+id+'/'),full+' no cross-service attribution');
   }else assert.equal(otherService,'',full);
   assert.equal(url.searchParams.get('service'),p.service);
   notes.add(html.match(/<\/time>[\s\S]*?<\/p><p>(.*?)<\/p>/)?.[1]);
  }
 }
 assert.equal(notes.size,54);
 assert.equal(journeys.render({full_name:'경기도 용인시 기흥구'},'taksong'),'');
 const incomplete=createRegionalEvidenceJourneys({...options,publishedCases:[]});
 assert.equal(incomplete.size,0);
});

test('Missing sitemap ownership, mismatched published facts and unverified sources suppress only the affected pair',()=>{
 const p=plans.at(-1),id=identifier(p),recordPath='/reviews/verified/'+id+'/';
 const r=regionByFullName.get(p.fromRegion);
 const withoutOwner={...owners};delete withoutOwner[recordPath];
 const missing=createRegionalEvidenceJourneys({...options,owners:withoutOwner});
 assert.equal(missing.size,52);assert.equal(missing.render(r,p.service),'');
 const changed=createRegionalEvidenceJourneys({...options,publishedCases:publishedCases.map(x=>x.id===id?{...x,fare:'1원'}:x)});
 assert.equal(changed.size,52);assert.equal(changed.render(r,p.service),'');
 const unverified=createRegionalEvidenceJourneys({...options,reviewedRides:reviewedRides.map(x=>identifier(x)===id?{...x,verified:false}:x)});
 assert.equal(unverified.size,52);assert.equal(unverified.render(r,p.service),'');
 const bugang=plans.find(x=>x.fromRegion.includes('부강면'));
 assert.ok(!createRegionalEvidenceJourneys(options).render(regionByFullName.get(bugang.fromRegion),bugang.service).includes('(직할)'));
});

test('Published reviews link back to both verified service regions without broadening source facts',()=>{
 const journeys=createRegionalEvidenceJourneys(options);
 assert.equal(journeys.reviewCount,27);
 for(const p of plans){
  const route='/reviews/verified/'+identifier(p)+'/',html=journeys.renderReviewLinks(route);
  assert.ok(html.includes('id="verified-review-region-links-20261126"'));
  assert.ok(html.includes('href="'+p.fromPath+'"')&&html.includes('href="'+p.toPath+'"'));
  assert.ok(html.includes(p.departure+' 출발 기록')&&html.includes(p.destination+' 도착 기록'));
  assert.ok(!html.includes('(직할)'));
  const missing={...owners};delete missing[p.toPath];
  assert.equal(createRegionalEvidenceJourneys({...options,owners:missing}).renderReviewLinks(route),'');
 }
 assert.equal(journeys.renderReviewLinks('/reviews/verified/not-published/'),'');
 assert.equal(createRegionalEvidenceJourneys({...options,publishedCases:[]}).reviewCount,0);
});

test('Twelve mapped queue records are displayed only with a verified original and published canonical',()=>{
 const fromQueue=plans.filter(p=>publicationQueue.some(r=>identifier(r)===identifier(p))&&!reviewedRides.some(r=>identifier(r)===identifier(p)));
 assert.equal(fromQueue.length,12);
 const withoutQueue=createRegionalEvidenceJourneys({...options,publicationQueue:[]});
 assert.equal(withoutQueue.size,30);
 for(const p of fromQueue){
  const id=identifier(p),route='/reviews/verified/'+id+'/';
  assert.equal(withoutQueue.renderReviewLinks(route),'');
  const invalid=createRegionalEvidenceJourneys({...options,publicationQueue:publicationQueue.map(r=>identifier(r)===id?{...r,verified:false}:r)});
  assert.equal(invalid.renderReviewLinks(route),'');
  assert.equal(invalid.size,52);
  const html=createRegionalEvidenceJourneys(options).render(regionByFullName.get(p.fromRegion),p.service);
  if(publishedCases.find(r=>r.id===id)?.tollIncluded)assert.ok(html.includes('통행료 포함'),id);
 }
});

test('Five new public records use exact owned localities or a named parent, without unsupported new ride facts',()=>{
 const pairs=[["950a26e35e8260b6","경기도 광주시 초월읍","경기도 광주시 곤지암읍"],["c9ee297b053a9d70","서울특별시 영등포구","인천광역시 미추홀구"],["f327906c0442fa2b","경기도 김포시","서울특별시 강동구 길동"],["46c6e421152e5c9e","경기도 안성시","경기도 여주시 교동"],["eeef086e59b4ad4a","경기도 하남시","인천광역시 연수구 옥련동"]];const journeys=createRegionalEvidenceJourneys(options);
 for(const [id,from,to] of pairs){const p=plans.find(x=>identifier(x)===id);assert.ok(p,id);assert.equal(p.fromRegion,from);assert.equal(p.toRegion,to);assert.ok(p.departure===from||p.departure.startsWith(from+' '));assert.ok(p.destination===to||p.destination.startsWith(to+' '));assert.ok(journeys.renderReviewLinks('/reviews/verified/'+id+'/').includes(p.fromPath));}
});
