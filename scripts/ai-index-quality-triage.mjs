// Evidence-first AI editorial review queue for Naver/Google discoverability.
// This is transparent heuristic triage, NOT an LLM inference, ranking prediction,
// official Search Advisor measurement or permission to auto-publish AI content.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
const dir=path.join(root,'data');
const files=fs.readdirSync(dir).filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates')).sort();
const rows=[];
for(const filename of files){
  const parsed=JSON.parse(fs.readFileSync(path.join(dir,filename),'utf8'));
  for(const [position,item] of (parsed.priority||[]).entries()){
    if(!['taksong','daeri'].includes(item.kind))continue;
    rows.push({...item,source:'data/'+filename,position:position+1});
  }
}
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const sha=value=>createHash('sha256').update(clean(value)).digest('hex').slice(0,16);
const duplicateCounts=new Map();
for(const row of rows){
  for(const field of ['pickup','handover']){
    const k=field+':'+sha(row[field]);
    duplicateCounts.set(k,(duplicateCounts.get(k)||0)+1);
  }
}
const searchPriorities=['세종','원주','진주','나주','김천','기장','부산','대구','설악','지리산','동해안','영산강','섬진강'];
const riskPattern=/100%\s*(?:보장|배차)|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차/;
const judged=rows.map(row=>{
  const region=clean(row.region), keyword=clean(row.keyword), topic=clean(row.topic);
  const pickup=clean(row.pickup), handover=clean(row.handover);
  const related=clean(row.related);
  const issues=[];
  if(!region||!keyword)issues.push('missing_region_or_keyword');
  if(topic.length<13)issues.push('thin_topic');
  if(pickup.length<80)issues.push('thin_pickup_context');
  if(handover.length<75)issues.push('thin_handover_context');
  if(!related)issues.push('missing_related_service_link');
  if(duplicateCounts.get('pickup:'+sha(pickup))>1)issues.push('repeated_pickup_text');
  if(duplicateCounts.get('handover:'+sha(handover))>1)issues.push('repeated_handover_text');
  if(riskPattern.test([topic,pickup,handover].join(' ')))issues.push('review_unverified_dispatch_claim');
  const regionParts=region.split(/\s+/).filter(Boolean);
  const placeSpecific=regionParts.slice(-1)[0]||'';
  if(placeSpecific&&!([topic,pickup,handover].join(' ').includes(placeSpecific)))issues.push('last_locality_not_in_guidance');
  const focus=searchPriorities.find(v=>region.includes(v)||keyword.includes(v))||null;
  const weighted={
    missing_region_or_keyword:35,thin_topic:8,thin_pickup_context:10,
    thin_handover_context:12,missing_related_service_link:10,
    repeated_pickup_text:20,repeated_handover_text:22,
    review_unverified_dispatch_claim:30,last_locality_not_in_guidance:12
  };
  const score=Math.max(0,100-issues.reduce((v,i)=>v+weighted[i],0));
  // Rank for human editorial work, not for search engines. Poor pages first,
  // with extra attention to user-identified service areas.
  const reviewPriority=(100-score)+(focus?25:0)+(issues.some(i=>i.startsWith('repeated_'))?20:0);
  return {id:row.id,region,keyword,kind:row.kind,source:row.source,position:row.position,
    score,reviewPriority,focus,issues,topic,pickup,handover,related,
    evidence:'not_verified_in_this_dataset',naverIndexed:null,
    action:issues.length?'Human-review exact locality facts, add only verified service details and suitable links':'No automatic rewrite needed; validate live URL and real Search Advisor data'};
});
// Source-evidence crosswalk: a published article is NOT itself proof of an
// exactly matched completed ride; each source's editorial scope is preserved.
const priorityEditorial=JSON.parse(fs.readFileSync(path.join(dir,'priority-regions.json'),'utf8')).pages;
const originalReferences=JSON.parse(fs.readFileSync(path.join(dir,'seo-reviewed-local-originals-20261116.json'),'utf8')).items;
const published=JSON.parse(fs.readFileSync(path.join(root,'blog/posts.json'),'utf8'));
const publishedById=new Map(published.filter(p=>/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/.test(String(p.url||''))).map(p=>[String(p.id),p]));
const reviewedEditorialKeys=new Set(priorityEditorial.map(p=>p.kind+'|'+p.region));
const originalsByKey=new Map();
for(const ref of originalReferences){
 const post=publishedById.get(String(ref.post_id));
 if(!post)continue;
 const key=ref.kind+'|'+ref.region;
 if(!originalsByKey.has(key))originalsByKey.set(key,[]);
 originalsByKey.get(key).push({postId:String(ref.post_id),url:post.url,scope:ref.scope,note:ref.note});
}
for(const row of judged){
 const key=row.kind+'|'+row.region;
 const originals=originalsByKey.get(key)||[];
 row.reviewedEditorial=reviewedEditorialKeys.has(key);
 row.originalSources=originals;
 row.evidenceTier=originals.length?'published-reference-linked':row.reviewedEditorial?'reviewed-editorial-guidance':'additional-local-evidence-needed';
 row.evidence=originals.length?'source-metadata-linked-not-trip-verified':row.reviewedEditorial?'editorial-local-conditions-not-trip-verified':'not_verified_in_this_dataset';
 row.nextAction=originals.length
  ?'Review existing published source in its exact scope before improving the local answer; never infer completed rides from a general guide'
  :row.reviewedEditorial
   ?'Check reviewed local preparation guidance against current locality facts and add only independently supported details'
   :'Require independently confirmed locality details or a correctly attributed original source before expanding index discovery';
}
judged.sort((a,b)=>b.reviewPriority-a.reviewPriority||a.source.localeCompare(b.source)||a.position-b.position);
// Reserve review slots for each named priority locality before filling by severity.
// This prevents one area's many tied rows from hiding Sejong/innovation-city
// candidates. The queue remains read-only and never invents service evidence.
const reviewable=judged.filter(item=>item.issues.length>0);
const priorityFocus=['세종','원주','진주','나주','김천','기장','부산','대구'];
const selected=[], selectedKeys=new Set();
const addCandidate=item=>{
  const key=item.source+'|'+item.position+'|'+item.kind+'|'+item.keyword;
  if(selectedKeys.has(key)||selected.length>=100)return;
  selectedKeys.add(key);
  selected.push(item);
};
for(const focus of priorityFocus){
  for(const item of reviewable.filter(x=>x.focus===focus).slice(0,3))addCandidate(item);
}
for(const item of reviewable)addCandidate(item);
const candidates=selected;
const groups={};
for(const item of judged){for(const reason of item.issues)groups[reason]=(groups[reason]||0)+1}
const uniqueSourceRows=new Set(judged.map(x=>x.kind+'|'+x.region)).size;
const evidenceCounts=Object.fromEntries(['published-reference-linked','reviewed-editorial-guidance','additional-local-evidence-needed'].map(tier=>
 [tier,{total:judged.filter(x=>x.evidenceTier===tier).length,needsReview:judged.filter(x=>x.evidenceTier===tier&&x.issues.length).length}]));
// Unlike the 100 highest-severity items, this queue starts with source-linked
// and manually reviewed pages. It helps editors improve valuable pages first
// without changing sitemap/robots or mass AI-rewriting weak locality copy.
const evidenceOrder={'published-reference-linked':0,'reviewed-editorial-guidance':1,'additional-local-evidence-needed':2};
const evidenceQueue=judged.filter(x=>x.issues.length>0)
 .sort((a,b)=>evidenceOrder[a.evidenceTier]-evidenceOrder[b.evidenceTier]||
  b.reviewPriority-a.reviewPriority||String(a.keyword).localeCompare(String(b.keyword),'ko'))
 .slice(0,100)
 .map(x=>({id:x.id,region:x.region,kind:x.kind,keyword:x.keyword,source:x.source,
  score:x.score,reviewPriority:x.reviewPriority,issues:x.issues,
  evidenceTier:x.evidenceTier,reviewedEditorial:x.reviewedEditorial,originalSources:x.originalSources,
  nextAction:x.nextAction,naverIndexed:null}));
const output={
  generatedAt:new Date().toISOString(),
  scope:'source editorial evidence-quality triage; no live URL crawling or official index count',
  method:'transparent deterministic rules suitable for AI-assisted human review; no model invocation or autopublishing',
  naverIndexed:null,googleIndexed:null,
  totals:{reviewed:judged.length,distinctRegionServicePairs:uniqueSourceRows,
    needsReview:judged.filter(x=>x.issues.length).length,fullyPassing:judged.filter(x=>!x.issues.length).length},
  issueCounts:groups,
  evidenceCounts,
  evidenceQueueCount:evidenceQueue.length,
  note:'A page can be technically indexable without being indexed. Actual ride completion and dispatch availability require separate verified records.',
  candidates
};

// Nationwide cohort evidence audit: inspect ALL 2,900 records across ALL 17
// legal provinces and both services. The existing top-100 preview is retained
// for familiar dashboards, but must not hide the national backlog.
const legalProvinceFiles=fs.readdirSync(path.join(dir,'legal-regions'))
 .filter(filename=>/^\d{2}\.json$/.test(filename)).sort();
const legalProvinces=legalProvinceFiles.map(filename=>{
 const registry=JSON.parse(fs.readFileSync(path.join(dir,'legal-regions',filename),'utf8'));
 return String(registry.full_names?.[0]||registry.province||'').trim();
});
if(legalProvinces.length!==17||new Set(legalProvinces).size!==17||
 legalProvinces.some(x=>!x))throw Error('Expected 17 distinct official province references');
const regionProvince=region=>
 legalProvinces.find(province=>region===province||region.startsWith(province+' '))||null;
const nationalEntries=judged.map(row=>({
 id:row.id,province:regionProvince(row.region),region:row.region,keyword:row.keyword,
 kind:row.kind,source:row.source,position:row.position,score:row.score,
 reviewPriority:row.reviewPriority,issues:row.issues,
 evidenceTier:row.evidenceTier,originalSourceScopes:row.originalSources.map(x=>x.scope),
 nextAction:row.nextAction,naverIndexed:null
}));
const missingProvince=nationalEntries.filter(row=>!row.province);
const provinceBreakdown=legalProvinces.map(province=>{
 const items=nationalEntries.filter(row=>row.province===province);
 const services=Object.fromEntries(['daeri','taksong'].map(kind=>{
  const byKind=items.filter(x=>x.kind===kind);
  return [kind,{total:byKind.length,passing:byKind.filter(x=>!x.issues.length).length,
   review:byKind.filter(x=>x.issues.length).length}];
 }));
 const issueCounts={};
 const evidenceTiers={};
 for(const item of items){
  evidenceTiers[item.evidenceTier]=(evidenceTiers[item.evidenceTier]||0)+1;
  for(const issue of item.issues)issueCounts[issue]=(issueCounts[issue]||0)+1;
 }
 return {province,total:items.length,passing:items.filter(x=>!x.issues.length).length,
  review:items.filter(x=>x.issues.length).length,services,evidenceTiers,issueCounts,
  warning:items.length===0?'No source-backed curated guide inventory for this province':null};
});
// A national queue must not be dominated by one early city or province.
// Round-robin across all 17 official provinces and both services, while
// retaining evidence-first severity order *within* each province/service.
const nationalGroups=legalProvinces.flatMap(province=>['daeri','taksong']
 .map(kind=>({
  province,kind,
  pending:nationalEntries.filter(x=>x.province===province&&x.kind===kind&&x.issues.length)
   .sort((a,b)=>{
    const tierRank={'published-reference-linked':0,'reviewed-editorial-guidance':1,
     'additional-local-evidence-needed':2};
    return tierRank[a.evidenceTier]-tierRank[b.evidenceTier]||
     b.reviewPriority-a.reviewPriority||
     String(a.keyword).localeCompare(String(b.keyword),'ko');
   })
 })));
const nationwideQueue=[];
while(nationalGroups.some(group=>group.pending.length)){
 for(const group of nationalGroups){
  const next=group.pending.shift();
  if(next)nationwideQueue.push(next);
 }
}
// Cross-reference the entire backlog with preserved original sources, without
// turning a candidate match into an editorial approval or a completed ride.
const {matchingHistoryRegion}= (await import('../lib/regional-history-evidence.js')).default;
const officialRegions=legalProvinceFiles.flatMap(filename=>{
 const registry=JSON.parse(fs.readFileSync(path.join(dir,'legal-regions',filename),'utf8'));
 return registry.full_names.map(full_name=>{
  const parts=full_name.split(' '),name=parts.at(-1);
  return {full_name,name,level:parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동'};
 });
});
const officialByName=new Map(officialRegions.map(r=>[r.full_name,r]));
const archiveFiles=fs.readdirSync(dir).filter(f=>/^regional-review-links-batch-\d{3}-\d+\.json$/.test(f)).sort();
const archiveRefs=archiveFiles.flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).items);
const archiveRaw=JSON.parse(fs.readFileSync(path.join(dir,'ride-history.json'),'utf8'));
if(archiveRefs.length!==2591||new Set(archiveRefs.map(r=>r.id)).size!==2591)
 throw Error('Original archival references must remain exactly 2591 unique records');
const exactArchiveByKey=new Map();
let rejectedArchiveRefs=0;
for(const ref of archiveRefs){
 const id=/^excel-(\d{4})$/.exec(ref.id);
 const original=id&&archiveRaw[Number(id[1])-1];
 const region=officialByName.get(ref.region);
 if(!original||!region||!['daeri','taksong'].includes(ref.service)||ref.source!=='ride-history.json'||
    ref.url!=='/reviews/history/'+ref.id+'/'||original.date!==ref.date||
    !matchingHistoryRegion({rawDeparture:original.departure,rawDestination:original.destination},region,officialRegions)){
  rejectedArchiveRefs++;continue;
 }
 const key=ref.service+'|'+ref.region, entries=exactArchiveByKey.get(key)||[];
 entries.push({id:ref.id,url:ref.url,date:ref.date,scope:'classified-archive-location-not-completion'});
 exactArchiveByKey.set(key,entries);
}
const guideKey=new Map(judged.map(r=>[r.kind+'|'+r.region,r]));
const sourceDossiers=nationalEntries.map(entry=>{
 const key=entry.kind+'|'+entry.region,region=officialByName.get(entry.region);
 if(!region)throw Error('Unknown original locality '+entry.region);
 // The original blog title must explicitly name the locality AND just one service.
 // No short-name substring, parent-only match, or mixed service article qualifies.
 const titleCandidates=published.filter(p=>{
  if(!publishedById.has(String(p.id)))return false;
  const title=String(p.title||'');
  const taksong=/탁송|차량이동/.test(title),daeri=/대리운전|일일기사/.test(title);
  if(taksong===daeri||(entry.kind==='taksong'?!taksong:!daeri))return false;
  const qualified=title.replace(/\s+/g,'').includes(entry.region.replace(/\s+/g,''));
  return qualified&&matchingHistoryRegion({rawDeparture:title,rawDestination:''},region,officialRegions);
 }).map(p=>({id:String(p.id),url:p.url,scope:'qualified-title-candidate-not-verified-trip'}));
 const archiveCandidates=exactArchiveByKey.get(key)||[];
 const paired=guideKey.get((entry.kind==='daeri'?'taksong':'daeri')+'|'+entry.region);
 const own=guideKey.get(key);
 return {...entry,archiveCandidates,titleCandidates,
  existingReviewedSources:own.originalSources,
  companionGuide:paired?{id:paired.id,kind:paired.kind,source:paired.source,position:paired.position,topic:paired.topic,scope:'same locality other service; validate before reuse'}:null,
  ownTopic:own.topic,
  hasSourceCandidate:Boolean(archiveCandidates.length||titleCandidates.length||own.originalSources.length),
  editorialStatus:entry.issues.length?'review-required':'passes-existing-heuristic-only'};
});
const dossierByKey=new Map(sourceDossiers.map(x=>[x.kind+'|'+x.region,x]));
const pendingDossiers=nationwideQueue.map(x=>dossierByKey.get(x.kind+'|'+x.region));
const sourceCandidateSummary={
 total:sourceDossiers.length,pending:pendingDossiers.length,archiveReferences:archiveRefs.length,
 exactArchiveReferences:archiveRefs.length-rejectedArchiveRefs,archiveReferencesExcluded:rejectedArchiveRefs,
 publishedTitles:publishedById.size,
 withSourceCandidate:sourceDossiers.filter(x=>x.hasSourceCandidate).length,
 pendingWithSourceCandidate:pendingDossiers.filter(x=>x.hasSourceCandidate).length,
 pendingWithoutSourceCandidate:pendingDossiers.filter(x=>!x.hasSourceCandidate).length,
 pendingWithCompanion:pendingDossiers.filter(x=>x.companionGuide).length
};
if(sourceDossiers.length!==2900||pendingDossiers.length!==output.totals.needsReview||
 sourceCandidateSummary.pendingWithSourceCandidate+sourceCandidateSummary.pendingWithoutSourceCandidate!==pendingDossiers.length)
 throw Error('Nationwide source dossier accounting mismatch');
console.log('NATIONWIDE_ORIGINAL_EVIDENCE_CROSSWALK '+JSON.stringify(sourceCandidateSummary));
const nationalAudit={
 generatedAt:output.generatedAt,
 scope:'all 17 legal provinces, all source-defined region/service guides and both services; editorial only',
 sourceFiles:files.length,officialProvinceCount:legalProvinces.length,
 totals:output.totals,evidenceCounts,issueCounts:groups,
 provinceBreakdown,
 coverageWarnings:provinceBreakdown.filter(x=>x.warning).map(x=>x.province),
 missingProvinceCount:missingProvince.length,
 missingProvinceRecords:missingProvince.slice(0,20),
 nationalReviewQueueCount:nationwideQueue.length,
 originalEvidenceCrosswalk:sourceCandidateSummary,
 originalEvidenceQueue:pendingDossiers,
 balancedQueue:nationwideQueue,
 records:nationalEntries,
 naverRealIndexed:null,naverRealImpressions:null,naverRealClicks:null,naverRealCtr:null,
 warning:'An entire-country source audit is NOT proof of completion in every place or Naver indexing. Do not automatically rewrite or index thin village pages, fabricate fares, dispatches or backlinks.'
};
if(nationalEntries.length!==output.totals.reviewed||
 nationwideQueue.length!==output.totals.needsReview||
 provinceBreakdown.reduce((sum,x)=>sum+x.total,0)+missingProvince.length!==output.totals.reviewed)
 throw Error('Nationwide source review does not reconcile with the 2,900-record original audit');
fs.writeFileSync('ai-index-nationwide-coverage.json',JSON.stringify(nationalAudit,null,2)+'\n');
const nationalCsvHeaders=['province','kind','region','keyword','score','reviewPriority','issues','evidenceTier','source','position','nextAction','archiveCandidateIds','publishedTitleCandidateIds','companionSource'];
fs.writeFileSync('ai-index-nationwide-queue.csv',
 nationalCsvHeaders.join(',')+'\n'+pendingDossiers.map(item=>
  nationalCsvHeaders.map(key=>csvSafeNational(key==='issues'?item.issues.join('; '):key==='archiveCandidateIds'?item.archiveCandidates.map(x=>x.id).join('; '):key==='publishedTitleCandidateIds'?item.titleCandidates.map(x=>x.id).join('; '):key==='companionSource'?item.companionGuide?.source:item[key])).join(',')
 ).join('\n')+'\n');
function csvSafeNational(value){return '"'+String(value??'').replace(/"/g,'""').replace(/[\r\n]/g,' ')+'"'}
const nationalMd=[
 '# 17개 시·도 전국 SEO 고유 콘텐츠 전수 점검',
 '',
 '- 총 '+output.totals.reviewed+'건 / 품질 기준 통과 '+output.totals.fullyPassing+
  '건 / 전수 재검토 '+output.totals.needsReview+'건',
 '- 원본 파일 '+files.length+'개 / 공식 시·도 '+legalProvinces.length+'개 / 출처 없음·지역 표시 불명확 건 별도 추적',
 '- 전수 검토 대기열은 상위 100건으로 자르지 않습니다. 매 차례 17개 시·도 × 대리·탁송 두 서비스에서 순환 선택합니다.',
 '- 실제 네이버 공식 색인·노출·클릭·CTR는 모두 미확인입니다. 보고서 수치를 색인 증가로 표시하지 않습니다.',
 '',
 '| 시·도 | 대리운전 | 자동차탁송 | 품질 통과 | 재검토 |',
 '|---|---:|---:|---:|---:|',
 ...provinceBreakdown.map(x=>'| '+x.province+' | '+x.services.daeri.total+' | '+
 x.services.taksong.total+' | '+x.passing+' | '+x.review+' |'),
 '',
 '## 근거 중심 전국 개선 순서',
 '',
 '1. 공식 행정구역과 서비스 유형을 확인하고 실제 공개 운행기록을 지역에 오귀속하지 않습니다.',
 '2. 각 시·도의 재검토 행을 번갈아 처리하며 중복 본문, 인수·인계 정보, 상담 동선부터 개선합니다.',
 '3. 출처가 충분하지 않은 페이지의 색인을 대량으로 열거나 임의 거리·요금·완료 후기를 만들지 않습니다.',
 '4. 운영 HTTP·8개 사이트맵 검사 결과와 네이버 소유자 공식 통계를 분리해 추적합니다.',
 ''
].join('\n');
fs.writeFileSync('ai-index-nationwide-coverage.md',nationalMd);
console.log('NATIONWIDE_PROVINCE_SOURCE_COVERAGE '+JSON.stringify({
 officialProvinces:legalProvinces.length,sourceGuides:nationalEntries.length,
 pendingForReview:nationwideQueue.length,missingProvinceCount:missingProvince.length,
 provinces:provinceBreakdown.map(x=>({province:x.province,total:x.total,
  daeri:x.services.daeri.total,taksong:x.services.taksong.total,
  passing:x.passing,review:x.review}))
}));

fs.writeFileSync('ai-index-quality-review.json',JSON.stringify(output,null,2)+'\n');
const evidenceReport={
 generatedAt:output.generatedAt,scope:output.scope,naverIndexed:null,googleIndexed:null,
 totals:output.totals,evidenceCounts,issueCounts:groups,
 evidenceDefinitions:{
  'published-reference-linked':'Exact locality+service matched to an existing published post in the reviewed source registry; its scope may be guide/related service, not a verified completed dispatch',
  'reviewed-editorial-guidance':'Locality+service has a separately reviewed preparation guide; not automatic trip evidence',
  'additional-local-evidence-needed':'Region-name substitution and generic operational advice cannot be treated as confirmed local facts'
 },
 queue:evidenceQueue,
 warning:'No automatic publication, no bulk noindex changes, and no official Naver crawl/index measurement. Historical ride details require a separate exact source match.'
};
fs.writeFileSync('ai-index-evidence-priority.json',JSON.stringify(evidenceReport,null,2)+'\n');
const csvCell=value=>'"'+String(value??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
const evidenceCols=['evidenceTier','reviewPriority','score','kind','region','keyword','source','issues','originalPostUrls','nextAction'];
fs.writeFileSync('ai-index-evidence-priority.csv',evidenceCols.join(',')+'\n'+evidenceQueue.map(row=>
 evidenceCols.map(key=>csvCell(key==='issues'?row.issues.join('; '):key==='originalPostUrls'?row.originalSources.map(p=>p.url).join('; '):row[key])).join(',')).join('\n')+'\n');
const columns=['reviewPriority','score','kind','region','keyword','focus','source','issues','evidence','action'];
fs.writeFileSync('ai-index-quality-review.csv',columns.join(',')+'\n'+candidates.map(row=>columns.map(k=>csvCell(k==='issues'?row.issues.join('; '):row[k])).join(',')).join('\n')+'\n');
let md='# AI-assisted index quality review — source evidence triage\n\n';
md+='- Source entries checked: **'+judged.length+'**; distinct region/service pairs: **'+uniqueSourceRows+'**\n';
md+='- Needs human editorial review: **'+output.totals.needsReview+'**; clean by this limited rubric: **'+output.totals.fullyPassing+'**\n';
md+='- **Naver indexed count: not connected / not measured.** Never use candidate or sitemap totals as indexed counts.\n';
md+='- Evidence tiers (not Search Advisor verdicts): '+Object.entries(evidenceCounts).map(([name,count])=>name+': '+count.total+' total / '+count.needsReview+' needs review').join('; ')+'\n';
md+='- Read-only ranking by missing local value, duplicate text, and high-priority service areas; no AI-generated pages, no fabricated rides, no automatic submissions.\n\n';
md+='## Top 30 editorial review candidates\n\n| Priority | Location / keyword | Service | Issues | Source |\n|---:|---|---|---|---|\n';
for(const row of candidates.slice(0,30)){
  const safe=value=>String(value).replace(/\|/g,'/').replace(/\n/g,' ');
  md+='| '+row.reviewPriority+' | '+safe(row.region)+' / '+safe(row.keyword)+' | '+row.kind+' | '+row.issues.join(', ')+' | '+row.source+' |\n';
}
md+='\n## Actions\n\n1. Confirm genuine locality-specific advice, not just a substituted place name.\n2. Where original dispatch evidence exists, link only the matching verified ride; otherwise use accurate service-preparation guidance without review claims.\n3. Resolve duplicate/near-identical regional copy before expanding sitemap coverage.\n4. Verify live HTTP, self-canonical, non-noindex and internal links; compare official Naver Search Advisor indexed/excluded counts separately.\n';
fs.writeFileSync('ai-index-quality-review.md',md);
console.log(JSON.stringify({files:files.length,...output.totals,evidenceCounts,top:candidates.slice(0,5).map(x=>({keyword:x.keyword,issues:x.issues}))}));
