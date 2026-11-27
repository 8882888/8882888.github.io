// Pure URL classification for trustworthy regional SEO audit metrics.
// No network access and no inferred ride history.
const provinces=new Set(['seoul','busan','daegu','incheon','gwangju','daejeon','ulsan','sejong',
'gyeonggi','gangwon','chungbuk','chungnam','jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju']);
const intentTopics=new Set(['fare','long-distance','handover']);
function scopedRegionalParts(value){
 let pathname;try{pathname=new URL(value,'https://jeongukdaeri.kr/').pathname}catch{return null}
 if(!pathname.endsWith('/'))return null;
 const parts=pathname.split('/').filter(Boolean);
 if(parts.length<2||!['daeri','taksong'].includes(parts[0])||!provinces.has(parts[1])||
    !parts.slice(2).every(p=>/^[a-z0-9-]+$/.test(p)))return null;
 return parts;
}
// A task-specific fare/booking guide is not another canonical locality landing.
export function isRegionalServiceUrl(value){
 const parts=scopedRegionalParts(value);
 return !!parts&&!intentTopics.has(parts.at(-1));
}
export function isRegionalIntentGuideUrl(value){
 const parts=scopedRegionalParts(value);
 if(!parts)return false;
 const topic=parts.at(-1);
 return parts[0]==='daeri'?['fare','long-distance'].includes(topic):['fare','handover'].includes(topic);
}
// Count both legacy archive documents and verified public ride pages.
// Search/listing links alone are not evidence. Only a specific ride document
// or an anchored item inside the privacy-reviewed completed-calls collection counts.
export function hasDirectRideRecordLink(html){
 const value=String(html||'');
 for(const match of value.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)){
  let link;
  try{link=new URL(match[2],'https://jeongukdaeri.kr')}catch{continue}
  if(!['jeongukdaeri.kr','www.jeongukdaeri.kr'].includes(link.hostname.toLowerCase()))continue;
  if(/^\/reviews\/history\/[a-z0-9_-]+\/$/i.test(link.pathname))return true;
  if(/^\/reviews\/(?:verified\/)?[a-f0-9]{16}\/$/i.test(link.pathname))return true;
  if(/^\/reviews\/completed-calls-\d{8}\/$/i.test(link.pathname)&&/^#record-\d+$/i.test(link.hash))return true;
 }
 return false;
}
export function regionalGuideCoverage(results){
 const guides=results.filter(r=>r?.status===200&&isRegionalIntentGuideUrl(r.url));
 return {regionalIntentGuidePages:guides.length,
         regionalGuidesWithoutDirectRideLink:guides.filter(r=>!r.hasRideLink).length};
}
export function reviewLinkCoverage(results){
 const pages=results.filter(r=>r?.status===200&&isRegionalServiceUrl(r.url));
 return {regionalServicePages:pages.length,
         regionalPagesWithoutReviewLink:pages.filter(r=>!r.hasRideLink).length};
}

/** Returns search bots excluded from indexing by server-rendered meta tags. */
export function blockedMetaIndexAgents(html){
 const agents=[];
 for(const match of String(html||'').matchAll(/<meta\b[^>]*>/gi)){
  const tag=match[0];
  const attribute=name=>{
   const found=tag.match(new RegExp('(?:\\s|<)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
   return String(found?.[1]??found?.[2]??found?.[3]??'').trim().toLowerCase();
  };
  const agent=attribute('name');
  if(!['robots','yeti','googlebot','bingbot'].includes(agent))continue;
  if(/(?:^|[\s,;])(?:noindex|none)(?=$|[\s,;])/i.test(attribute('content')))agents.push(agent);
 }
 return [...new Set(agents)];
}


/** Separate Yeti/global X-Robots-Tag exclusions from other engines' directives.
 * Handles agent-scoped comma lists and repeated header lines without mistaking
 * "googlebot: noindex" for an instruction to Naver.
 */
export function blockedXRobotsIndexAgents(value){
 const blocked=new Set();
 const raw=Array.isArray(value)?value.join('\n'):String(value||'');
 for(const line of raw.split(/\r?\n/)){
  let agent='robots';
  for(const piece of line.split(',')){
   const segment=piece.trim();
   const scoped=segment.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.*)$/i);
   let directive=segment;
   if(scoped){
    agent=scoped[1].toLowerCase();
    directive=scoped[2];
   }
   if(/(?:^|[\s;])(?:noindex|none)(?=$|[\s;])/i.test(directive))
    blocked.add(agent);
  }
 }
 return [...blocked];
}


/** Detect a root-wide robots.txt disallow as it applies to Yeti, not another bot.
 * This is a conservative root-block signal, not a complete robots parser.
 * An explicit Yeti group takes precedence over the wildcard group.
 */
export function naverRobotsDisallowAll(content){
 const groups=[];let current=null;let hasRules=false;
 for(const raw of String(content||'').split(/\r?\n/)){
  const line=raw.replace(/\s*#.*$/,'').trim();
  const colon=line.indexOf(':');if(colon<0)continue;
  const key=line.slice(0,colon).trim().toLowerCase();
  const value=line.slice(colon+1).trim().toLowerCase();
  if(key==='user-agent'){
   if(!current||hasRules){current={agents:[],rules:[]};groups.push(current);hasRules=false;}
   current.agents.push(value);
  }else if(current&&(key==='allow'||key==='disallow')){
   current.rules.push({key,path:value});hasRules=true;
  }
 }
 const specific=groups.filter(g=>g.agents.includes('yeti'));
 const applicable=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const rules=applicable.flatMap(g=>g.rules);
 return rules.some(r=>r.key==='disallow'&&r.path==='/')
     && !rules.some(r=>r.key==='allow'&&r.path==='/');
}


// Measure server-rendered focus links without requesting quote endpoints.
// Counts describe observed links, not verified journey completion or indexing.
function internalAnchorUrls(html){
 const visible=String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const links=[];
 for(const m of visible.matchAll(/<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1/gi)){
  try{
   const u=new URL(m[2].replace(/&amp;/g,'&'),'https://jeongukdaeri.kr');
   if(u.protocol==='https:'&&['jeongukdaeri.kr','www.jeongukdaeri.kr'].includes(u.hostname))links.push(u);
  }catch{}
 }
 return links;
}
export function focusLinkObservation(url,html){
 const pathname=new URL(url,'https://jeongukdaeri.kr').pathname;
 const panel=String(html||'').match(/<section\b[^>]*\bid=["']metro-innovation-long-distance-20261127["'][^>]*>([\s\S]*?)<\/section>/i);
 if(isRegionalServiceUrl(url)&&panel){
  const links=internalAnchorUrls(panel[1]);
  return {focusPanel:true,focusRidePaths:[...new Set(links.filter(u=>/^\/reviews\/(?:(?:verified|history)\/[a-z0-9_-]+|[a-f0-9]{16})\/$/i.test(u.pathname)&&!u.search).map(u=>u.pathname))],
   focusQuoteCount:new Set(links.filter(u=>u.pathname==='/fare/'&&['daeri','taksong'].includes(u.searchParams.get('service'))&&u.searchParams.get('from')&&u.searchParams.get('to')&&!u.searchParams.has('auto')).map(u=>u.pathname+u.search)).size};
 }
 if(/^\/reviews\/(?:(?:verified|history)\/[a-z0-9_-]+|[a-f0-9]{16})\/$/i.test(pathname)){
  return {reviewRegionPaths:[...new Set(internalAnchorUrls(html).filter(u=>isRegionalServiceUrl(u.href)&&!u.search&&!u.hash).map(u=>u.pathname))]};
 }
 return {};
}
export function focusLinkCoverage(results){
 const pathOf=r=>new URL(r.url,'https://jeongukdaeri.kr').pathname;
 const focus=results.filter(r=>r?.status===200&&r.focusPanel===true);
 const reviewMap=new Map(results.filter(r=>r?.status===200&&Array.isArray(r.reviewRegionPaths)).map(r=>[pathOf(r),r]));
 const pairs=focus.flatMap(r=>(r.focusRidePaths||[]).map(ride=>({region:pathOf(r),ride})));
 const matched=pairs.filter(p=>reviewMap.has(p.ride));
 const reciprocal=matched.filter(p=>reviewMap.get(p.ride).reviewRegionPaths.includes(p.region));
 return {focusServicePagesObserved:focus.length,
  focusPagesWithPanelRideLink:focus.filter(r=>r.focusRidePaths?.length).length,
  focusPagesWithoutPanelRideLink:focus.filter(r=>!r.focusRidePaths?.length).length,
  focusQuoteLinksObserved:focus.reduce((sum,r)=>sum+(r.focusQuoteCount||0),0),
  focusRideLinkPairs:pairs.length,
  focusRidePairsWithAuditedTarget:matched.length,
  focusRidePairsWithReciprocalLink:reciprocal.length,
  focusRidePairsTargetNotAudited:pairs.length-matched.length};
}
