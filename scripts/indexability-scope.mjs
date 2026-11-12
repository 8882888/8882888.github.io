// Pure URL classification for trustworthy regional SEO audit metrics.
// No network access and no inferred ride history.
const provinces=new Set(['seoul','busan','daegu','incheon','gwangju','daejeon','ulsan','sejong',
'gyeonggi','gangwon','chungbuk','chungnam','jeonbuk','jeonnam','gyeongbuk','gyeongnam','jeju']);
export function isRegionalServiceUrl(value){
 let pathname;try{pathname=new URL(value,'https://jeongukdaeri.kr/').pathname}catch{return false}
 const parts=pathname.split('/').filter(Boolean);
 return (parts[0]==='daeri'||parts[0]==='taksong')&&provinces.has(parts[1])&&
   parts.slice(2).every(p=>/^[a-z0-9-]+$/.test(p))&&
   pathname.endsWith('/');
}
export function reviewLinkCoverage(results){
 const pages=results.filter(r=>r?.status===200&&isRegionalServiceUrl(r.url));
 return {regionalServicePages:pages.length,
         regionalPagesWithoutReviewLink:pages.filter(r=>!r.hasRideLink).length};
}
