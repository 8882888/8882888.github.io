#!/usr/bin/env node
// Read-only browser vs synthetic-Yeti HTTP parity. Not proof of genuine
// Naver/Yeti access: no verified crawler IP, Search Advisor or Cloudtype logs.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin=(process.env.SMART24_ORIGIN||'https://jeongukdaeri.kr').replace(/\/$/,'');
export const pages=['/','/business/','/business/used-car/','/business/rental-car/',
 '/business/export-port/','/business/scrapyard/','/business/auction/'];
export const resources=[
 {route:'/assets/traffic-summary.css?v=20261030',mime:'text/css'},
 {route:'/assets/traffic-analytics.js?v=20261109-overnight-visit',mime:'javascript'},
 {route:'/assets/region-card-preview.js?v=20261112-mobile-v12',mime:'javascript'},
 {route:'/assets/cycling/east-coast-certification-centers.svg',mime:'image/svg+xml'},
 {route:'/assets/smart24-business-card-inline-v2.png',mime:'image/png'}
];
export const agents={
 browser:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
 simulatedYeti:'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'
};
export const blocked=value=>/(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(String(value||''));
export function normalizeRobotsRules(source){
 return String(source||'').split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#'))
  .map(line=>{const colon=line.indexOf(':');return colon<0?line:line.slice(0,colon).toLowerCase()+':'+line.slice(colon+1).trim()})
  .join('\n');
}
export function attr(tag,name){
 const match=String(tag||'').match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'));
 return match?(match[1]??match[2]??''):'';
}
export function inspectHead(html,url,xrobots){
 const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
 const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0])
  .filter(tag=>attr(tag,'rel').toLowerCase().split(/\s+/).includes('canonical'));
 const canonical=links.length===1?attr(links[0],'href'):'';
 const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
 const directives=metas.filter(tag=>['robots','yeti'].includes(attr(tag,'name').toLowerCase()))
  .map(tag=>attr(tag,'content'));
 const titles=[...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(m=>m[1].replace(/<[^>]+>/g,'').trim());
 const h1=[...html.matchAll(/<h1\b[^>]*>/gi)];
 let normalized='';
 try{if(canonical)normalized=new URL(canonical,url).href}catch{}
 return {canonical:normalized,canonicalCount:links.length,titlePresent:titles.length===1&&Boolean(titles[0]),
  h1Count:h1.length,noindex:blocked([...directives,xrobots].join(', '))};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function retrieve(route,agent,needHtml=false){
 const started=Date.now();
 const requestUrl=new URL(route,origin);
 // Self-identified synthetic probes must never be counted as real Yeti visits.
 const response=await fetch(requestUrl,{redirect:'manual',signal:AbortSignal.timeout(20000),
  headers:{'user-agent':agents[agent],'x-smart24-monitor':'github-health-probe',
   'accept':'text/html,text/plain,text/css,application/javascript,image/svg+xml,image/png,*/*',
   'cache-control':'no-cache'}});
 const data={route,agent,status:response.status,contentType:response.headers.get('content-type')||'',
  location:response.headers.get('location')||'',xRobotsTag:response.headers.get('x-robots-tag')||'',
  durationMs:Date.now()-started};
 if(needHtml)data.body=await response.text();
 else await response.body?.cancel();
 return data;
}
export function issuesForSample(row,kind,expectedMime){
 const problems=[];
 if(row.status!==200)problems.push('http_'+row.status);
 if(row.location)problems.push('redirect');
 if(kind==='page'&&blocked(row.xRobotsTag))problems.push('x_robots_noindex');
 if(kind==='robots'&&!/^text\/plain(?:;|$)/i.test(row.contentType))problems.push('robots_not_text_plain');
 if(kind==='page'&&!/^text\/html(?:;|$)/i.test(row.contentType))problems.push('not_html');
 if(kind==='resource'&&!row.contentType.toLowerCase().includes(expectedMime))problems.push('resource_wrong_mime');
 if(kind==='page'&&row.html){
  if(row.html.canonical!==new URL(row.route,origin).href||row.html.canonicalCount!==1)
   problems.push('canonical_mismatch');
  if(row.html.noindex)problems.push('meta_noindex');
  if(!row.html.titlePresent||row.html.h1Count!==1)problems.push('missing_or_duplicate_title_h1');
 }
 return problems;
}
async function main(){
 const results=[],issues=[];
 const sourceRobots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
 for(const [kind,routes] of [['robots',['/robots.txt']],['page',pages],['resource',resources.map(x=>x.route)]]){
  for(const route of routes){
   const samples=[];
   for(const agent of Object.keys(agents)){
    let row;
    try{
     row=await retrieve(route,agent,kind==='page'||kind==='robots');
     if(kind==='page'){row.html=inspectHead(row.body,new URL(route,origin).href,row.xRobotsTag)}
     if(kind==='robots'){
      row.robotsSourceMatch=normalizeRobotsRules(row.body)===normalizeRobotsRules(sourceRobots);
      if(!row.robotsSourceMatch)issues.push({route,agent,reason:'robots_source_live_mismatch'});
      if(/^\s*Disallow:/mi.test(row.body))issues.push({route,agent,reason:'unexpected_robots_disallow_manual_review'});
     }
     delete row.body;
     const mime=kind==='resource'?resources.find(x=>x.route===route).mime:'';
     for(const reason of issuesForSample(row,kind,mime))issues.push({route,agent,reason});
    }catch(err){
     row={route,agent,status:null,error:String(err?.message||err).slice(0,140)};
     issues.push({route,agent,reason:'fetch_exception'});
    }
    samples.push(row);
    await sleep(140);
   }
   if(samples.every(x=>x.status!==null)){
    const [browser,yeti]=samples;
    if(browser.status!==yeti.status)issues.push({route,reason:'user_agent_http_status_difference',browser:browser.status,simulatedYeti:yeti.status});
    if(browser.contentType.split(';')[0]!==yeti.contentType.split(';')[0])
     issues.push({route,reason:'user_agent_content_type_difference'});
    if(kind==='page'&&browser.html?.canonical!==yeti.html?.canonical)
     issues.push({route,reason:'user_agent_canonical_difference'});
   }
   results.push({kind,route,samples});
  }
 }
 const report={checkedAt:new Date().toISOString(),origin,scope:'read-only two synthetic UA checks; not Naver crawler IP evidence',
  officialNaverIndexed:null,officialCollectionLimitedReason:null,pages:pages.length,resources:resources.length,results,issues};
 fs.writeFileSync('naver-fetch-parity.json',JSON.stringify(report,null,2)+'\n');
 const lines=[
  '# Smart24 browser vs simulated Yeti HTTP parity',
  '',
  'This is NOT real Naver crawler access verification. The synthetic Yeti requests carry a monitoring marker and do not count as genuine Yeti visits.',
  '',
  '| Target | Browser HTTP | Synthetic Yeti HTTP | Diagnostics |',
  '|---|---:|---:|---|',
  ...results.map(r=>'| '+r.route.replace(/\|/g,'%7C')+' | '+(r.samples[0].status??'error')+
   ' | '+(r.samples[1].status??'error')+' | '+(issues.filter(e=>e.route===r.route).map(e=>e.reason).join(', ')||'PASS')+' |'),
  '',
  '**Official Naver indexed count and Cloudtype inbound bot IP status:** unknown. Use Search Advisor diagnostic and actual Cloudtype request logs.',
  ''
 ];
 fs.writeFileSync('naver-fetch-parity.md',lines.join('\n'));
 console.log(JSON.stringify({checked:results.length,browserSamples:results.length,yetiSamples:results.length,issues,officialNaverIndexed:null},null,2));
 if(issues.length)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{console.error(String(err));process.exitCode=1});
