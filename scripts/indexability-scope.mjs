// Pure URL classification for trustworthy regional SEO audit metrics.
// No network access and no inferred ride history.
const provinces=new Set(['seoul','busan','daegu','incheon','gwangju','daejeon','ulsan','sejong',
'gyeonggi','gangwon','chungbuk','chungnam','jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju']);
const intentTopics=new Set(['fare','long-distance','handover']);
function scopedRegionalParts(value){
 let pathname;try{pathname=new URL(value,'https://jeongukdaeri.kr/').pathname}catch{return null}
 if(!pathname.endsWith('/'))return null;
 const parts=pathname.split('/').filter(Boolean);
 if(parts.length<3||!['daeri','taksong'].includes(parts[0])||!provinces.has(parts[1])||
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
// An archive/search link is NOT a deep link to an actual preserved ride document.
export function hasDirectRideRecordLink(html){
 return /href\s*=\s*["'][^"']*\/reviews\/history\/[a-z0-9_-]+\/(?:[?#][^"']*)?["']/i.test(String(html||''));
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
