'use strict';
// Confirms production's existing national hubs actually use reviewed destinations.
// Does not report authenticated Naver indexing/rank/clicks.
const fs=require('node:fs');
const path=require('node:path');
const origin=process.env.PRODUCTION_URL||'https://jeongukdaeri.kr';
const reviewed=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/priority-regions.json'),'utf8')).pages;
const kindToService={daeri:'대리운전',taksong:'자동차탁송'};
async function main(){
 const details=[];
 for(const kind of ['daeri','taksong']){
  const route='/'+kind+'/',r=await fetch(new URL(route,origin),{redirect:'manual',headers:{'User-Agent':'Smart24-live-crawl-priority-audit/1.0','Cache-Control':'no-cache'},signal:AbortSignal.timeout(24000)});
  if(r.status!==200||/noindex/i.test(r.headers.get('x-robots-tag')||''))throw Error(route+' HTTP/index response unexpected');
  const html=await r.text(),start=html.indexOf('<section id="national-commercial-intents-'+kind+'"'),end=html.indexOf('</section>',start);
  if(start<0||end<start)throw Error(route+' edited national navigation missing');
  const section=html.slice(start,end+10),localityStart=section.indexOf('<h3>개별 정보가 검토된 주요 지역'),localityEnd=section.indexOf('<p><a href="/coverage/"',localityStart);
  if(localityStart<0||localityEnd<0)throw Error(route+' edited reviewed region directory missing');
  if(!section.includes('href="/region/"')||!section.includes('href="/coverage/"'))throw Error('National search coverage was lost: '+route);
  const current=[...section.slice(localityStart,localityEnd).matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
  const allowed=new Set(reviewed.filter(x=>x.kind===kind).map(x=>x.region+' '+kindToService[kind]));
  if(current.length<5||current.length>59)throw Error('Unbounded or unexpectedly missing reviewed links: '+route+' '+current.length);
  for(const a of current)if(!allowed.has(a[2]))throw Error('Unreviewed mass-listed city/county in '+route+': '+a[2]);
  if(!html.includes('id="national-verified-history-links"'))throw Error(route+' historical verified evidence section lost');
  if(!html.includes('<link rel="canonical" href="'+new URL(route,origin).href+'">'))throw Error(route+' canonical mismatch');
  details.push({route,http:200,reviewedLocalLinks:current.length,onlyReviewed:true,fullRegionNavigationPreserved:true,verifiedRideLinksPreserved:true});
 }
 console.log(JSON.stringify({source:'LIVE_HTTP_NOT_NAVER_INDEX_OR_CTR',checks:details,indexed:null,naverClicks:null,naverCtr:null},null,2));
 console.log('PASS two existing nationwide landing pages promote only reviewed local service content; no Naver index claim');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '\n### Reviewed local guide linking in live national hubs\n'+details.map(d=>'- '+d.route+': HTTP 200, '+d.reviewedLocalLinks+' reviewed links, full region finder preserved.').join('\n')+'\n');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
