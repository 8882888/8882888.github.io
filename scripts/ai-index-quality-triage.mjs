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
const output={
  generatedAt:new Date().toISOString(),
  scope:'source editorial evidence-quality triage; no live URL crawling or official index count',
  method:'transparent deterministic rules suitable for AI-assisted human review; no model invocation or autopublishing',
  naverIndexed:null,googleIndexed:null,
  totals:{reviewed:judged.length,distinctRegionServicePairs:uniqueSourceRows,
    needsReview:judged.filter(x=>x.issues.length).length,fullyPassing:judged.filter(x=>!x.issues.length).length},
  issueCounts:groups,
  note:'A page can be technically indexable without being indexed. Actual ride completion and dispatch availability require separate verified records.',
  candidates
};
fs.writeFileSync('ai-index-quality-review.json',JSON.stringify(output,null,2)+'\n');
const csvCell=value=>'"'+String(value??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';
const columns=['reviewPriority','score','kind','region','keyword','focus','source','issues','evidence','action'];
fs.writeFileSync('ai-index-quality-review.csv',columns.join(',')+'\n'+candidates.map(row=>columns.map(k=>csvCell(k==='issues'?row.issues.join('; '):row[k])).join(',')).join('\n')+'\n');
let md='# AI-assisted index quality review — source evidence triage\n\n';
md+='- Source entries checked: **'+judged.length+'**; distinct region/service pairs: **'+uniqueSourceRows+'**\n';
md+='- Needs human editorial review: **'+output.totals.needsReview+'**; clean by this limited rubric: **'+output.totals.fullyPassing+'**\n';
md+='- **Naver indexed count: not connected / not measured.** Never use candidate or sitemap totals as indexed counts.\n';
md+='- Read-only ranking by missing local value, duplicate text, and high-priority service areas; no AI-generated pages, no fabricated rides, no automatic submissions.\n\n';
md+='## Top 30 editorial review candidates\n\n| Priority | Location / keyword | Service | Issues | Source |\n|---:|---|---|---|---|\n';
for(const row of candidates.slice(0,30)){
  const safe=value=>String(value).replace(/\|/g,'/').replace(/\n/g,' ');
  md+='| '+row.reviewPriority+' | '+safe(row.region)+' / '+safe(row.keyword)+' | '+row.kind+' | '+row.issues.join(', ')+' | '+row.source+' |\n';
}
md+='\n## Actions\n\n1. Confirm genuine locality-specific advice, not just a substituted place name.\n2. Where original dispatch evidence exists, link only the matching verified ride; otherwise use accurate service-preparation guidance without review claims.\n3. Resolve duplicate/near-identical regional copy before expanding sitemap coverage.\n4. Verify live HTTP, self-canonical, non-noindex and internal links; compare official Naver Search Advisor indexed/excluded counts separately.\n';
fs.writeFileSync('ai-index-quality-review.md',md);
console.log(JSON.stringify({files:files.length,...output.totals,top:candidates.slice(0,5).map(x=>({keyword:x.keyword,issues:x.issues}))}));
