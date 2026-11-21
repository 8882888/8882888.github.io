// Source-only evidence triage. Never assigns locations to archived trips, writes
// new SEO pages, or exposes dispatch addresses and customer details to reports.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=path.join(ROOT,'data');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const squash=s=>clean(s).replace(/\s/g,'');
const hash=s=>createHash('sha256').update(clean(s)).digest('hex').slice(0,16);
const toCsv=v=>'"'+String(v??'').replace(/"/g,'""').replace(/[\r\n]/g,' ')+'"';
const writeJson=(name,v)=>fs.writeFileSync(path.join(ROOT,name),JSON.stringify(v,null,2)+'\n');
const writeCsv=(name,headers,rows)=>fs.writeFileSync(path.join(ROOT,name),
 headers.join(',')+'\n'+rows.map(r=>headers.map(h=>toCsv(r[h])).join(',')).join('\n')+'\n');

const archives=Array.from({length:9},(_,i)=>
  read('data/regional-review-links-batch-'+String(i+1).padStart(3,'0')+'-'+(i===8?'191':'300')+'.json'))
  .flatMap(x=>x.items);
const raw=read('data/ride-history.json');
if(archives.length!==2591||raw.length!==2591)throw Error('Preserve 2,591 original archive records');
const regionFiles=fs.readdirSync(path.join(d,'legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort();
if(regionFiles.length!==17)throw Error('Incomplete legal regions');
const legalNames=regionFiles.flatMap(x=>read('data/legal-regions/'+x).full_names);
const legalSet=new Set(legalNames);
const aliases=new Map();
const candidates=legalNames.filter(x=>{
 const last=x.split(/\s+/).at(-1);
 return /[시군]$/.test(last)&&last.length>=3&&
  (x.includes(' ')||x==='세종특별자치시');
});
for(const name of candidates){
 const last=name.split(/\s+/).at(-1);
 const items=aliases.get(last)||new Set();
 items.add(name);aliases.set(last,items);
}
const uniqueAliases=[...aliases].filter(([x,fulls])=>fulls.size===1).map(([name,fulls])=>({name,full:[...fulls][0]}))
 .sort((a,b)=>b.name.length-a.name.length);
const fullCandidates=candidates.map(name=>({name,normalized:squash(name)}))
 .sort((a,b)=>b.normalized.length-a.normalized.length);
const legalNameHint=s=>{
 const v=squash(s),result=new Map();
 if(!v)return [];
 for(const item of fullCandidates)if(v.includes(item.normalized)){
  result.set(item.name,{region:item.name,signal:'explicit_full_admin_name'});
 }
 // A unique city/county legal name is a REVIEW CLUE, not proof of the
 // customer's city, pickup locality or ride completion.
 for(const item of uniqueAliases)if(v.includes(item.name)&&!result.has(item.full)){
  result.set(item.full,{region:item.full,signal:'unique_admin_city_or_county_token'});
 }
 return [...result.values()].sort((a,b)=>
  (a.signal===b.signal?0:a.signal==='explicit_full_admin_name'?-1:1)||
  a.region.localeCompare(b.region,'ko')).slice(0,12);
};
let alreadyClassified=0,unresolved=0,invalidClassification=0;
const review=[],seenIds=new Set();
for(let i=0;i<archives.length;i++){
 const entry=archives[i];
 const match=/^excel-(\d{4})$/.exec(String(entry.id||''));
 if(!match)throw Error('Invalid archive identifier');
 const position=Number(match[1])-1;
 if(position<0||position>=raw.length||seenIds.has(entry.id))
  throw Error('Out-of-range or duplicate archive identifier: '+entry.id);
 seenIds.add(entry.id);
 const ride=raw[position];
 if(entry.region){
  if(!legalSet.has(entry.region))invalidClassification++;
  alreadyClassified++;
  continue;
 }
 unresolved++;
 const from=legalNameHint(ride.departure);
 const to=legalNameHint(ride.destination);
 const found=[...new Set([...from,...to].map(x=>x.region))];
 let stage='NO_EXPLICIT_UNIQUE_CITY_CLUE';
 if(from.length&&to.length&&from[0].region!==to[0].region)stage='MULTIPLE_ORIGIN_DESTINATION_CLUES';
 else if(from.length>1||to.length>1)stage='MULTIPLE_ADMINISTRATIVE_CLUES';
 else if(from.length===1)stage='POTENTIAL_ORIGIN_ADMIN_TOKEN';
 else if(to.length===1)stage='DESTINATION_ONLY_ADMIN_TOKEN';
 review.push({archiveId:entry.id,date:entry.date,service:entry.service,
  stage,originHints:from.map(x=>x.region),destinationHints:to.map(x=>x.region),
  source:'ride-history.json',requiresHumanConfirmation:true,confirmedRegion:null});
}
if(seenIds.size!==2591)throw Error('Missing archive references');
if(unresolved!==2183||alreadyClassified!==408||invalidClassification!==0)
 throw Error('Historical 2,183 unresolved / 408 classified inventory must not silently change');
const stageCounts={};
for(const x of review)stageCounts[x.stage]=(stageCounts[x.stage]||0)+1;
const reviewSorted=[...review].sort((a,b)=>{
 const weight={POTENTIAL_ORIGIN_ADMIN_TOKEN:0,MULTIPLE_ORIGIN_DESTINATION_CLUES:1,
  MULTIPLE_ADMINISTRATIVE_CLUES:2,DESTINATION_ONLY_ADMIN_TOKEN:3,
  NO_EXPLICIT_UNIQUE_CITY_CLUE:4};
 return weight[a.stage]-weight[b.stage]||a.archiveId.localeCompare(b.archiveId);
});
writeJson('ride-2183-original-evidence-triage.json',{
 generatedAt:new Date().toISOString(),scope:'Human source review candidates only; no automatic region assignment',
 inventory:{total:2591,alreadyClassified,unresolved,invalidClassification},
 administrativeReference:{sourceFiles:17,count:legalSet.size},
 stageCounts,confirmedNewRegions:0,
 warning:'Token hints can be in a destination, business name or conflicting locality. Never infer a completed departure or publish a region from this report.',
 records:reviewSorted
});
writeCsv('ride-2183-original-evidence-triage.csv',
 ['archiveId','date','service','stage','originHints','destinationHints','requiresHumanConfirmation'],
 reviewSorted.map(x=>({...x,originHints:x.originHints.join('; '),destinationHints:x.destinationHints.join('; ')})));

const focusFiles=fs.readdirSync(d)
 .filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates')).sort();
const entries=focusFiles.flatMap(file=>(read('data/'+file).priority||[])
 .map(x=>({...x,source:'data/'+file})));
const duplicates=new Map();
for(const e of entries)for(const field of ['pickup','handover']){
 const id=field+':'+hash(e[field]);
 duplicates.set(id,(duplicates.get(id)||0)+1);
}
const priority=new Set(read('data/priority-regions.json').pages.map(x=>x.kind+'|'+x.region));
const reviewedOriginals=read('data/seo-reviewed-local-originals-20261116.json').items;
const posts=read('blog/posts.json');
const postMap=new Map(posts.filter(x=>/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(x.url||'')).map(x=>[String(x.id),x]));
const originalByKey=new Map();
for(const x of reviewedOriginals){
 if(!postMap.has(String(x.post_id)))throw Error('Missing reviewed source post '+x.post_id);
 const key=x.kind+'|'+x.region,arr=originalByKey.get(key)||[];
 arr.push({scope:x.scope,postId:String(x.post_id),url:postMap.get(String(x.post_id)).url});
 originalByKey.set(key,arr);
}
const classifiedByKey=new Map();
for(const x of archives){
 if(!x.region||!['taksong','daeri'].includes(x.service))continue;
 const k=x.service+'|'+x.region,arr=classifiedByKey.get(k)||[];
 arr.push(x.id);classifiedByKey.set(k,arr);
}
const risk=/100%\s*(?:보장|배차)|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차/;
const issues=e=>{
 const problems=[];
 if(!clean(e.region)||!clean(e.keyword))problems.push('missing_region_or_keyword');
 if(clean(e.topic).length<13)problems.push('thin_topic');
 if(clean(e.pickup).length<80)problems.push('thin_pickup_context');
 if(clean(e.handover).length<75)problems.push('thin_handover_context');
 if(!clean(e.related))problems.push('missing_related_service_link');
 if(duplicates.get('pickup:'+hash(e.pickup))>1)problems.push('repeated_pickup_text');
 if(duplicates.get('handover:'+hash(e.handover))>1)problems.push('repeated_handover_text');
 if(risk.test([e.topic,e.pickup,e.handover].join(' ')))problems.push('review_unverified_dispatch_claim');
 const name=clean(e.region).split(/\s+/).at(-1);
 if(name&&!([e.topic,e.pickup,e.handover].join(' ').includes(name)))problems.push('last_locality_not_in_guidance');
 return problems;
};
const qualityRows=entries.map(e=>{
 const key=e.kind+'|'+e.region,failures=issues(e);
 const originals=originalByKey.get(key)||[],archiveIds=classifiedByKey.get(key)||[];
 const tier=originals.length?'reviewed_published_post_scope'
  :archiveIds.length?'classified_archival_region_only'
  :priority.has(key)?'reviewed_local_preparation'
  :'additional_evidence_needed';
 return {id:e.id,source:e.source,region:e.region,kind:e.kind,keyword:e.keyword,issueCount:failures.length,
  issues:failures,evidenceTier:tier,reviewedPublishedReferences:originals,
  archivedRegionClassifications:archiveIds.length,
  archiveExampleIds:archiveIds.slice(0,2),
  naverIndexed:null,completedTripProven:null,
  action:originals.length?'Verify each original post claim and scope before specific locality copy'
   :archiveIds.length?'Review exact departure and destination in archival record before writing a completed trip'
   :priority.has(key)?'Use independently reviewed local preparation; do not pretend a completed ride'
   :'Collect an independently verified locality source; do not generate location-specific facts'};
});
if(entries.length!==2900)throw Error('Expected all 2900 original content items');
// Keep the legacy content-2535 artifact filename for consumer compatibility: 2535 is the initial review cohort, not a permanently fixed pending count.
const passed=qualityRows.filter(x=>!x.issues.length).length,needsReview=qualityRows.length-passed;
const qualityBaseline={passed:365,needsReview:2535};
if(passed<qualityBaseline.passed||needsReview>qualityBaseline.needsReview||passed+needsReview!==2900)
 throw Error('Source-quality regressed below reviewed baseline: '+passed+'/'+needsReview);
const tierOrder={reviewed_published_post_scope:0,classified_archival_region_only:1,
 reviewed_local_preparation:2,additional_evidence_needed:3};
const pending=qualityRows.filter(x=>x.issues.length).sort((a,b)=>
 tierOrder[a.evidenceTier]-tierOrder[b.evidenceTier]||
 b.archivedRegionClassifications-a.archivedRegionClassifications||
 b.issueCount-a.issueCount||a.keyword.localeCompare(b.keyword,'ko'));
const tierCounts={};
for(const x of qualityRows){
 const s=tierCounts[x.evidenceTier]||{all:0,needsReview:0};
 s.all++;if(x.issues.length)s.needsReview++;
 tierCounts[x.evidenceTier]=s;
}
writeJson('content-2535-evidence-first-review.json',{
 generatedAt:new Date().toISOString(),
 scope:'Read-only original-content editorial triage; no automatic content or Naver index claim',
 baseline:qualityBaseline,
 totals:{all:2900,passed,needsReview},
 evidenceCounts:tierCounts,
 archivedSourceCoverage:{classified:alreadyClassified,unresolved,uniqueClassifiedRegionServices:classifiedByKey.size},
 warning:'Classified archive locality and public article are candidates for manual editorial review, not independent proof that a trip took place in the named region.',
 prioritizedPending:pending
});
writeCsv('content-2535-evidence-first-review.csv',
 ['id','source','region','kind','keyword','evidenceTier','archivedRegionClassifications','issueCount','issues','action'],
 pending.map(x=>({...x,issues:x.issues.join('; ')})));
console.log(JSON.stringify({archive:{total:2591,alreadyClassified,unresolved,reviewStages:stageCounts},
 content:{all:2900,passed,needsReview,evidenceCounts:tierCounts},
 artifacts:['ride-2183-original-evidence-triage.csv','content-2535-evidence-first-review.csv'],
 sourceOnly:true,naverIndexed:null},null,2));
