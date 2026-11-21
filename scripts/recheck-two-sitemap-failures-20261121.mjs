#!/usr/bin/env node
// Follow-up for two transport failures in full sitemap audit #44856095669.
// Read-only checks only; results are not Naver indexed URL counts.
import fs from 'node:fs/promises';
const base=process.env.SEO_RECHECK_BASE||'https://jeongukdaeri.kr';
const routes=[
  '/routes/daeri/area-12945/area-12117/',
  '/daeri/jeonnam/hwasun-gun/'
];
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const urls=routes.map(route=>new URL(route,base).href);
async function inspect(url){
  const record={url,status:null,attempts:0,technicalCandidate:false,issues:[],observations:[]};
  for(let attempt=1;attempt<=3;attempt++){
    record.attempts=attempt;
    try{
      const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(18000),
        headers:{accept:'text/html','cache-control':'no-cache','user-agent':'Smart24-Sitemap-Failed-URL-Recheck/1.0'}});
      record.status=response.status;
      if([429,502,503,504].includes(response.status)&&attempt<3){
        record.observations.push('temporary_http_'+response.status);
        await response.body?.cancel();await sleep(1200*attempt);continue;
      }
      if(response.status!==200){record.issues.push('http_'+response.status);break;}
      const contentType=response.headers.get('content-type')||'';
      if(!contentType.includes('text/html'))record.issues.push('not_html');
      const body=await response.text();
      const title=body.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'';
      const h1=body.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]?.trim()||'';
      const canonical=body.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1]||'';
      const metaRobots=body.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1]||'';
      const xRobots=response.headers.get('x-robots-tag')||'';
      record.canonical=canonical;record.title=title;record.h1=h1;record.metaRobots=metaRobots;record.xRobots=xRobots;
      if(!title)record.issues.push('title_missing');
      if(!h1)record.issues.push('h1_missing');
      if(!canonical)record.issues.push('canonical_missing');
      else if(canonical!==new URL(new URL(url).pathname,'https://jeongukdaeri.kr').href)record.issues.push('canonical_mismatch');
      if(/noindex/i.test(metaRobots+' '+xRobots))record.issues.push('noindex');
      record.technicalCandidate=record.issues.length===0;
      break;
    }catch(error){
      record.observations.push('attempt_'+attempt+': '+String(error?.message||error).slice(0,180));
      if(attempt===3){record.issues.push('fetch_failed');break;}
      await sleep(1200*attempt);
    }
  }
  return record;
}
const results=await Promise.all(urls.map(inspect));
const report={generatedAt:new Date().toISOString(),referenceRun:44856095669,
  note:'Only two previously failed URL requests; a passing response is not official Naver indexing.',results};
const dir=process.env.SEO_RECHECK_REPORT_DIR||'reports';
await fs.mkdir(dir,{recursive:true});
await fs.writeFile(dir+'/sitemap-two-failed-urls-recheck.json',JSON.stringify(report,null,2)+'\n');
const lines=['## Targeted sitemap request failure recheck','',
'Two URL fetch failures observed during the 5,900-URL full crawl. This is not Naver indexed URL data.',''];
for(const r of results)lines.push('- '+r.url+' — '+(r.technicalCandidate?'PASS':'REVIEW')+'; HTTP '+(r.status??'unavailable')+
  '; attempts '+r.attempts+'; issues '+(r.issues.join(', ')||'none')+
  (r.observations.length?'; retry observations '+r.observations.join(', '):''));
if(process.env.GITHUB_STEP_SUMMARY)await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
if(results.some(r=>!r.technicalCandidate))process.exitCode=1;
