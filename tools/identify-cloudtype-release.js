'use strict';
// Read-only diagnosis. A file-hash match is source-content evidence,
// not proof that Cloudtype deployed the exact matching GitHub commit.
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const base=(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr').replace(/\/$/,'');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const show=(sha,file)=>execFileSync('git',['show',sha+':'+file],{maxBuffer:3000000,timeout:15000});
function history(limit=80){
 let shas=[];
 try{shas=execFileSync('git',['log','--format=%H','-n',String(limit)],
  {encoding:'utf8',timeout:15000}).split(/\r?\n/).filter(Boolean)}
 catch(e){return {candidates:[],error:'git history unavailable: '+e.message}}
 const candidates=[];
 for(const sha of shas){
  try{candidates.push({sha,serverHash:hash(show(sha,'server.js')),
    homeHash:hash(show(sha,'index.html'))})}
  catch(e){continue}
 }
 return {candidates};
}
function identify(hashes,candidates){
 const server=String(hashes?.['server.js']||'').replace(/^sha256-/,'');
 const home=String(hashes?.['index.html']||'').replace(/^sha256-/,'');
 const same=(a,b)=>a&&b&&a===b;
 return {
  firstMatchingBoth:candidates.find(c=>same(c.serverHash,server)&&same(c.homeHash,home))?.sha||null,
  firstMatchingServer:candidates.find(c=>same(c.serverHash,server))?.sha||null,
  firstMatchingHome:candidates.find(c=>same(c.homeHash,home))?.sha||null,
  liveServerHash:server.slice(0,16)||null,
  liveHomepageHash:home.slice(0,16)||null,
  inspectedCommits:candidates.length
 };
}
const clean=s=>String(s||'').replace(/[<>&]/g,'').slice(0,350);
async function main(){
 const res=await fetch(base+'/health/seo.json?release_history_diagnostic=1',{
  headers:{'cache-control':'no-cache','accept':'application/json'},
  signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error('Cloudtype HTTP '+res.status);
 const data=await res.json();
 const {candidates,error}=history();
 const found=identify(data.deployment_hashes,candidates);
 const result={...found,liveCuratedGuideCount:data.naver_focus_region_count||null,
  note:'Source-content fingerprints only. Matching hashes do not prove a Cloudtype deploy event or Naver indexing.',
  ...(error?{historyError:error}:{})};
 console.log('Live Cloudtype release provenance:',JSON.stringify(result));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['### Cloudtype live version identification','',
  '- Live server fingerprint: '+(result.liveServerHash||'unavailable'),
  '- Live homepage fingerprint: '+(result.liveHomepageHash||'unavailable'),
  '- Most recent GitHub commit matching both files: '+(result.firstMatchingBoth||'not found in fetched history'),
  '- Most recent server.js content match: '+(result.firstMatchingServer||'not found'),
  '- Most recent index.html content match: '+(result.firstMatchingHome||'not found'),
  '- Inspected commits: '+result.inspectedCommits,
  '','This identifies matching file content, not an exact Cloudtype deployment event or Naver index count.'];
  if(error)lines.push('History diagnostic: '+clean(error));
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
 }
}
if(require.main===module)main().catch(e=>{
 console.error('Cloudtype release history diagnostic unavailable: '+clean(e.message));
 // This is a supplementary diagnostic, never masks the original failed freshness gate.
 process.exitCode=1;
});
module.exports={identify,history};
