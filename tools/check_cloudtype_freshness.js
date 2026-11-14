'use strict';
// Compare the official Cloudtype release with the exact GitHub checkout.
// Unlike a Pages backup deployment, this confirms the running Node server.
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const base=(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr').replace(/\/$/,'');
const sha=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',name))).digest('hex');
const serverHash=sha('server.js'),homeHash=sha('index.html');
const serverSource=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const guardCounts=[...serverSource.matchAll(/naverFocus(\d+)\.length!==(\d+)/g)]
 .filter(match=>match[1]===match[2])
 .map(match=>Number(match[1]));
const expectedCount=Math.max(...guardCounts);
if(!Number.isInteger(expectedCount)||expectedCount<500)throw Error('Cannot determine complete curated guide count from source');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(){
 const u=base+'/health/seo.json?deploy_check='+serverHash.slice(0,14);
 const resp=await fetch(u,{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json','Cache-Control':'no-cache'},redirect:'error'});
 if(!resp.ok)throw Error('Cloudtype SEO health HTTP '+resp.status);
 const raw=await resp.text();
 let data;try{data=JSON.parse(raw)}catch{throw Error('Cloudtype returned non-JSON health content')};
 const hashes=data.deployment_hashes||{};
 const actualCount=Number(data.naver_focus_region_count);
 const mismatches=[];
 if(hashes['server.js']!==serverHash)mismatches.push('server.js fingerprint does not match GitHub');
 if(hashes['index.html']!==homeHash)mismatches.push('index.html fingerprint does not match GitHub');
 if(actualCount!==expectedCount)mismatches.push('curated guide count: live '+actualCount+' / source '+expectedCount);
 if(!String(resp.headers.get('cache-control')||'').includes('no-store'))mismatches.push('health endpoint not marked no-store');
 if(mismatches.length)throw Error(mismatches.join('; '));

 // A matching release hash alone does not prove the newly published tourism
 // landing page or its crawl entry is present on the real Cloudtype server.
 const touristPath='/daeri/tourist-spots/';
 const touristRes=await fetch(base+touristPath,{
  signal:AbortSignal.timeout(15000),
  headers:{Accept:'text/html','Cache-Control':'no-cache'},redirect:'error'
 });
 if(!touristRes.ok)throw Error('Live tourism daeri HTML HTTP '+touristRes.status);
 const touristHtml=await touristRes.text();
 const expectedTouristHtml=[
  '<h1>전국 유명 관광지·전통시장 대리운전·대리 검색</h1>',
  '속초관광시장대리운전',
  '인천광역시 제물포구',
  '인천광역시 영종구',
  'rel="canonical" href="'+base+touristPath+'"'
 ];
 for(const marker of expectedTouristHtml){
  if(!touristHtml.includes(marker))throw Error('Live tourism daeri page missing marker: '+marker);
 }
 if(/noindex/i.test(touristRes.headers.get('x-robots-tag')||'')||
    /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(touristHtml)){
  throw Error('Live canonical tourism guide is incorrectly noindex');
 }
 const priorityRes=await fetch(base+'/sitemap-priority.xml',{
  signal:AbortSignal.timeout(15000),
  headers:{Accept:'application/xml','Cache-Control':'no-cache'},redirect:'error'
 });
 if(!priorityRes.ok)throw Error('Live priority sitemap HTTP '+priorityRes.status);
 const priorityXml=await priorityRes.text();
 const touristLoc='<loc>'+base+touristPath+'</loc>';
 if(priorityXml.split(touristLoc).length!==2){
  throw Error('Live priority sitemap must include exactly one canonical tourism guide URL');
 }
 const queryRes=await fetch(base+touristPath+'?q='+encodeURIComponent('속초관광시장대리운전'),{
  signal:AbortSignal.timeout(15000),
  headers:{Accept:'text/html','Cache-Control':'no-cache'},redirect:'error'
 });
 if(!queryRes.ok)throw Error('Live tourism search HTTP '+queryRes.status);
 if(!/noindex/i.test(queryRes.headers.get('x-robots-tag')||'')){
  throw Error('Live tourism search-result variation must carry X-Robots-Tag noindex');
 }
 return {release:serverHash.slice(0,16),guideCount:expectedCount,homepageSha:homeHash.slice(0,16),tourismGuide:'canonical+priority-sitemap+search-noindex verified'};
}
async function main(){
 const attempts=Math.min(6,Math.max(1,Number(process.env.DEPLOY_CHECK_ATTEMPTS)||4));
 let last;
 for(let i=1;i<=attempts;i++){
  try{
   const passed=await check();
   console.log('PASS Cloudtype official release equals GitHub main:',JSON.stringify(passed));
   if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Cloudtype deployment freshness: PASS\n\n'+
    '- Server SHA256: `'+passed.release+'`\n- Homepage SHA256: `'+passed.homepageSha+'`\n- Curated guide count: **'+passed.guideCount+'**\n');
   return;
  }catch(err){
   last=err;
   console.error('Cloudtype release check '+i+'/'+attempts+': '+err.message);
   if(i<attempts)await sleep(20000);
  }
 }
 const message='Cloudtype is not verified as the latest GitHub release: '+(last&&last.message||'unknown');
 console.error('::error::'+message);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Cloudtype deployment freshness: NOT VERIFIED\n\n'+
  message.replace(/[<>]/g,'')+'\n\nInspect the Cloudtype deployment associated with GitHub `main` (GitHub Pages is only a noindex backup).\n');
 process.exitCode=1;
}
main().catch(err=>{console.error('::error::Cloudtype verification crashed: '+err.message);process.exitCode=1});
