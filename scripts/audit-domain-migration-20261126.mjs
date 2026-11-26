// Read-only domain migration audit: never equate HTTP tests with Naver indexing.
import {resolve4,resolve6,resolveCname} from 'node:dns/promises';
import {pathToFileURL} from 'node:url';
const official='https://jeongukdaeri.kr';
const legacy='https://8882888.github.io';
const direct='https://port-0-smart24-taksong-backup-mviupa4l4c8a9dbf.sel3.cloudtype.app';
const www='https://www.jeongukdaeri.kr';
const http='http://jeongukdaeri.kr';
export const hosts=[{kind:'official',base:official},{kind:'http',base:http},{kind:'www',base:www},{kind:'legacy',base:legacy},{kind:'cloudtype-direct',base:direct}];
const paths=['/','/taksong/','/daeri/','/taksong/sejong/','/daeri/sejong/','/robots.txt','/sitemap.xml'];
const manusOfficial='https://smartdaeritaksong.kr';
export const manusHosts=[{kind:'official',base:manusOfficial,target:manusOfficial},{kind:'http',base:'http://smartdaeritaksong.kr',target:manusOfficial},{kind:'www',base:'https://www.smartdaeritaksong.kr',target:manusOfficial},{kind:'manus-original-candidate',base:'https://taksongkorea-fqwxknsy.manus.space',target:manusOfficial}];
const attr=(tag,k)=>tag.match(new RegExp('\\b'+k+'\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]','i'))?.[1]||'';
export function classify({kind,status,location,url,canonical,robots,blockedHeader,body='',contentType='',targetOrigin=official}) {
 const p=new URL(url).pathname+new URL(url).search;
 const target=targetOrigin+p;
 if(kind==='manus-original-candidate')return 'CANDIDATE_RELATION_UNCONFIRMED';
 if(kind==='official'){
  if(status!==200)return 'OFFICIAL_HTTP_ERROR';
  if(p==='/robots.txt')return /Disallow:\s*\/\s*(?:\r?\n|$)/i.test(body)?'OFFICIAL_ROBOTS_REVIEW':'OFFICIAL_ROBOTS_AVAILABLE';
  if(p==='/sitemap.xml')return /<(urlset|sitemapindex)\b/i.test(body)?'OFFICIAL_SITEMAP_AVAILABLE':'OFFICIAL_SITEMAP_INVALID';
  if(!/text\/html/i.test(contentType)||canonical!==target||/\b(noindex|none)\b/i.test(robots||'')||blockedHeader)return 'OFFICIAL_INDEX_SIGNAL_REVIEW';
  return 'OFFICIAL_SELF_CANONICAL';
 }
 if([301,308].includes(status)&&location===target)return 'PERMANENT_REDIRECT';
 if([302,307].includes(status)&&location===target)return 'TEMPORARY_REDIRECT_REVIEW';
 if([301,302,307,308].includes(status))return 'WRONG_REDIRECT_REVIEW';
 if([404,410].includes(status))return 'RETIRED_NO_CONTENT';
 if(status===200){
  if(p==='/robots.txt')return 'ALIAS_ROBOTS_SERVED';
  if(p==='/sitemap.xml')return 'ALIAS_SITEMAP_SERVED';
  return canonical===target?'DUPLICATE_200_CANONICAL_ONLY':'DUPLICATE_200_WRONG_OR_MISSING_CANONICAL';
 }
 return 'ALIAS_HTTP_REVIEW';
}
async function probe(h,p,agent='Smart24-Domain-Migration-ReadOnly/1.0'){
 const url=h.base+p;
 try{
  const res=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':agent,'X-Smart24-Monitor':'github-health-probe','Cache-Control':'no-cache'}});
  const body=await res.text();
  const canonical=[...body.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(t=>attr(t,'rel').toLowerCase().split(/\s+/).includes('canonical')).map(t=>attr(t,'href'));
  const robots=[...body.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).filter(t=>/^(robots|yeti)$/i.test(attr(t,'name'))).map(t=>attr(t,'content')).join(',');
  const x=res.headers.get('x-robots-tag')||'';
  const blockedHeader=x.split(/,|\n/).some(t=>/^\s*(?:(?:yeti|robots):\s*)?(?:noindex|none)(?:\s|$)/i.test(t));
  const location=res.headers.get('location')?new URL(res.headers.get('location'),url).href:null;
  const raw={kind:h.kind,url,agent,targetOrigin:h.target||official,status:res.status,location,canonical:canonical.length===1?canonical[0]:null,robots,blockedHeader,contentType:res.headers.get('content-type')||''};
  return {...raw,result:classify({...raw,body}),title:body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]||null,ssrTextChars:p==='/'?body.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().length:null,sitemapLocCount:p==='/sitemap.xml'?[...body.matchAll(/<loc>([^<]+)<\/loc>/gi)].length:null,sitemapLocHosts:p==='/sitemap.xml'?[...new Set([...body.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>{try{return new URL(m[1].trim()).hostname}catch{return 'invalid'}}))].slice(0,20):null,...(p==='/robots.txt'?{robotsRules:body.split(/\r?\n/).filter(l=>/^(User-agent|Allow|Disallow|Sitemap):/i.test(l)).slice(0,30)}:{})};
 }catch(e){return {kind:h.kind,url,result:'UNREACHABLE_UNVERIFIED',error:String(e.message)}}
}
async function dns(host){
 const output={host};
 for(const [key,fn] of [['A',resolve4],['AAAA',resolve6],['CNAME',resolveCname]])try{output[key]=await fn(host)}catch(e){output[key]={error:e.code||e.message}}
 return output;
}

// Bounded same-origin sitemap traversal. Never follow an external host or redirect.
export async function collectSitemapPages(origin, read, {maxMaps=12,maxDepth=2}={}){
 const queue=[{url:origin+'/sitemap.xml',depth:0}],seen=new Set(),pages=new Set(),issues=[];
 while(queue.length&&seen.size<maxMaps){
  const {url,depth}=queue.shift();
  if(seen.has(url))continue;
  seen.add(url);
  try{
   const xml=await read(url);
   const index=/<sitemapindex\b/i.test(xml);
   if(!index&&!/<urlset\b/i.test(xml))throw Error('invalid sitemap root');
   const locs=[...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
   if(!locs.length)throw Error('empty sitemap');
   for(const m of locs){
    let u;try{u=new URL(m[1].trim().replace(/&amp;/g,'&'))}catch{issues.push('invalid loc in '+url);continue}
    if(u.origin!==origin||u.username||u.password||u.hash){issues.push('off-origin or invalid loc in '+url);continue}
    if(index){
     if(u.search){issues.push('unexpected sitemap query in '+url);continue}
     if(depth>=maxDepth){issues.push('depth limit at '+u.pathname);continue}
     if(!seen.has(u.href)&&!queue.some(x=>x.url===u.href))queue.push({url:u.href,depth:depth+1});
    }else if(u.pathname!=='/'&&!u.search&&!/^\/(?:api|orders)(?:\/|$)/.test(u.pathname))pages.add(u.pathname);
   }
  }catch(e){issues.push(url+': '+String(e.message))}
 }
 if(queue.length)issues.push('map limit reached; '+queue.length+' pending');
 return {mapsVisited:seen.size,pages:[...pages],issues};
}

async function main(){
 const records=[];
 for(const p of paths)records.push(...await Promise.all(hosts.map(h=>probe(h,p))));
 const manusRecords=[];
 for(const p of ['/','/robots.txt','/sitemap.xml'])manusRecords.push(...await Promise.all(manusHosts.map(h=>probe(h,p))));
 const yeti='Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)';
 const manusYeti=[];
 for(const p of ['/','/robots.txt','/sitemap.xml'])manusYeti.push(await probe(manusHosts[0],p,yeti));
 let samplePaths=[];let sampleError=null;
 const traversal=await collectSitemapPages(manusOfficial,async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'manual',headers:{'User-Agent':yeti,'X-Smart24-Monitor':'github-health-probe'}});
  if(response.status!==200)throw Error('HTTP '+response.status);
  return response.text();
 });
 const local=traversal.pages;
 const positions=[...new Set(Array.from({length:Math.min(6,local.length)},(_,i)=>Math.floor(i*(local.length-1)/Math.max(1,Math.min(6,local.length)-1))))];
 samplePaths=positions.map(i=>local[i]);
 if(traversal.issues.length||!samplePaths.length)sampleError=traversal.issues.join('; ')||'No eligible page paths';
 for(const p of samplePaths){manusYeti.push(await probe(manusHosts[0],p,yeti));manusRecords.push(await probe(manusHosts[0],p));}
 const dnsRecords=await Promise.all([...new Set([...hosts,...manusHosts].map(h=>new URL(h.base).hostname))].map(dns));
 const totals={};for(const row of records)totals[row.result]=(totals[row.result]||0)+1;
 const report={at:new Date().toISOString(),scope:'HTTP/DNS public read-only; NOT Naver index count',manus:'Separate official domain; original Manus host is an unconfirmed candidate, not a proven previous binding',totals,dns:dnsRecords,records,manusRecords,manusYeti,samplePaths,sampleError,manusSitemapTraversal:{mapsVisited:traversal.mapsVisited,eligiblePaths:local.length,issues:traversal.issues}};
 console.log(JSON.stringify(report,null,2));
 // Explicitly distinguish open technical issues from an unavailable alias.
 if(sampleError||[...records,...manusRecords,...manusYeti].some(r=>/^(OFFICIAL_.*(?:ERROR|REVIEW|INVALID)|DUPLICATE_200|TEMPORARY_REDIRECT|WRONG_REDIRECT|ALIAS_SITEMAP_SERVED)/.test(r.result)))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e);process.exitCode=1});
