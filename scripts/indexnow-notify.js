#!/usr/bin/env node
'use strict';
// Submit only genuinely changed, canonical priority URLs. Naver accepts
// IndexNow notifications but a 200/202 is not evidence of indexing or rank.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const key='770f921af32e749f64c1d447c607ea42';
const root=path.resolve(__dirname,'..');
const priorityPaths=Object.freeze(require('../data/region-journey-links.json').pages.map(p=>p.path));
const blogHashtagPaths=Object.freeze(require('../data/blog-hashtags-priority.json').articles.map(p=>'/blog/daeri-regions/'+p.slug+'/'));
if(blogHashtagPaths.length!==30||new Set(blogHashtagPaths).size!==30)throw Error('Expected thirty blog canonical URLs');
if(priorityPaths.length!==10||new Set(priorityPaths).size!==10)throw Error('Expected ten unique regional source URLs');
const dryRun=process.argv.includes('--dry-run');
const base=new URL(dryRun?(process.argv[process.argv.indexOf('--dry-run')+1]||'http://localhost:3000/'):'https://jeongukdaeri.kr/');
if(fs.readFileSync(path.join(root,key+'.txt'),'utf8').trim()!==key)throw Error('Invalid local IndexNow key file');
const fixedPriorityPaths=[
 '/', '/daeri/', '/taksong/', '/route-taksong/', '/설악산탁송/', '/지리산탁송/',
 '/special/cycling-trail-transport/', '/service/long-distance-taksong/', '/fare/',
 '/reviews/history/', '/reviews/taksong/', '/reviews/ride-record-stories/',
 '/reviews/verified/', '/routes/reviewed/', '/region/daegu-daeri-taksong/',
 '/blog/', '/route-taksong/centers/', '/travel/food-map/', '/taksong/jeju/',
 '/recruit/daeri/', '/recruit/taksong/'
];
// New curated locality guides are also indexed in sitemap-priority.xml.
// Scale the coverage window with the published guide count; do not reject valid
// 2,900+ URL sitemaps against an obsolete 200-URL ceiling.
const focusFiles=fs.readdirSync(path.join(root,'data')).filter(name=>
 /^naver-regional-focus.*\.json$/.test(name)&&!name.includes('candidates'));
const focusCount=focusFiles.reduce((total,name)=>{
 const doc=JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));
 if(!Array.isArray(doc.priority))throw Error('Missing live priority list in '+name);
 return total+doc.priority.length;
},0);
// Village guides without confirmed local trips intentionally remain noindex.
// They must not be required for sitemap coverage or IndexNow notification.
const sparseVillageAllowance=focusFiles.reduce((total,name)=>total+JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8')).priority.filter(entry=>entry.region.endsWith('리')).length,0);
const minimumCount=Math.max(fixedPriorityPaths.length+require('../data/priority-regions.json').pages.length,focusCount-sparseVillageAllowance);
const maximumCount=focusCount+500;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(rel){
 return fetch(new URL(rel,base),{
  headers:{'user-agent':'Smart24-IndexNow-Notifier/2.0','cache-control':'no-cache'},
  signal:AbortSignal.timeout(10000),redirect:'manual'
 });
}
function changedPaths(files,manual=''){
 const explicit=String(manual||'').trim().split(/[\s,]+/).filter(Boolean);
 if(explicit.length){
  if(explicit.length>10)throw Error('Only ten intentional IndexNow URLs per request');
  const chosen=[...new Set(explicit.map(x=>{
   const u=new URL(x,base);
   if(u.hostname!=='jeongukdaeri.kr'&&u.origin!==base.origin)throw Error('Foreign host '+x);
   if(u.search||u.hash||!u.pathname.endsWith('/'))throw Error('Noncanonical manual URL '+x);
   return u.pathname;
  }))];
  return chosen;
 }
 const input=new Set(files);
 // A content-focused blog update should notify its actual article URLs, not
 // resubmit unrelated service landing pages in the same commit.
 if(input.has('data/blog-hashtags-priority.json'))return blogHashtagPaths.slice(-10);
 const changedBlogs=blogHashtagPaths.filter(url=>input.has(url.slice(1)+'index.html'));
 if(changedBlogs.length)return changedBlogs.slice(0,10);
 const selected=new Set();
 const include=paths=>paths.forEach(p=>selected.add(p));
 if([...input].some(p=>[
   'server.js','data/region-journey-links.json','data/priority-regions.json',
   'data/priority-blog-links.json','lib/regional-history-evidence.js'
  ].includes(p)))include(priorityPaths);
 if(input.has('index.html'))include(['/']);
 if(input.has('data/seo-pages.json'))include(['/','/taksong/','/daeri/','/region/']);
 if(input.has('blog/posts.json'))include(['/blog/','/blog/archive/']);
 if([...input].some(p=>/^(data\/ride-history\.json|data\/public-reviewed-rides-202610\.json)$/.test(p)))include(['/reviews/history/','/reviews/taksong/']);
 return [...selected].slice(0,10);
}
function filesInRevision(){
 const override=process.env.INDEXNOW_CHANGED_FILES;
 if(typeof override==='string')return override.split(/[\s,]+/).filter(Boolean);
 try{return execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{cwd:root,encoding:'utf8',timeout:10000}).split(/\r?\n/).filter(Boolean)}
 catch(e){throw Error('Cannot identify changed commit files, refusing a blanket URL resubmission: '+e.message)}
}
async function verify(){
 const verification=await get('/'+key+'.txt');
 if(verification.status!==200)throw Error('Key HTTP '+verification.status);
 if((await verification.text()).trim()!==key)throw Error('Key content mismatch');
 const xmlResponse=await get('/sitemap-priority.xml');
 if(xmlResponse.status!==200)throw Error('Priority sitemap HTTP '+xmlResponse.status);
 const xml=await xmlResponse.text();
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 const normalizedUrls=urls.map(value=>new URL(value).href);
 if(urls.length<minimumCount||urls.length>maximumCount||new Set(normalizedUrls).size!==urls.length)
  throw Error('Unexpected priority sitemap coverage or duplicates: '+urls.length);
 for(const url of urls){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.hostname!=='jeongukdaeri.kr'||parsed.search||parsed.hash)
   throw Error('Invalid canonical URL in sitemap: '+url);
 }
 for(const route of [...fixedPriorityPaths,...priorityPaths,...blogHashtagPaths]){
  const canonical=new URL(route,'https://jeongukdaeri.kr').href;
  if(!normalizedUrls.includes(canonical))throw Error('Missing priority route: '+canonical);
 }
 const busan=await get('/taksong/busan/');
 if(busan.status!==200)throw Error('Busan taksong HTTP '+busan.status);
 const body=await busan.text();
 if(!body.includes('id="priority-region-guide"'))throw Error('Busan priority source not deployed');
 console.log('Verified '+urls.length+' canonical priority URLs and index key at '+base.origin);
 return new Set(normalizedUrls);
}
async function main(){
 const files=filesInRevision();
 const targets=changedPaths(files,process.env.INDEXNOW_URLS||'');
 console.log('Changed repository files: '+(files.join(', ')||'(none)'));
 if(!dryRun&&!targets.length){console.log('No relevant published URLs changed; skipping repeat IndexNow submission');return}
 let accepted;
 for(let attempt=0;attempt<(dryRun?1:16);attempt++){
  try{accepted=await verify();break}catch(e){
   if(dryRun||attempt===15)throw e;
   console.log('Cloudtype not yet confirmed ('+(attempt+1)+'/16): '+e.message);
   await pause(10000);
  }
 }
 if(dryRun){console.log('Dry run: target paths '+targets.join(', ')+'; no IndexNow submission');return}
 const urls=targets.map(route=>new URL(route,'https://jeongukdaeri.kr').href);
 for(const url of urls)if(!accepted.has(url))throw Error('Changed URL not present in official priority sitemap: '+url);
 const response=await fetch('https://searchadvisor.naver.com/indexnow',{
  method:'POST',headers:{'content-type':'application/json; charset=utf-8','user-agent':'Smart24-IndexNow-Notifier/2.0'},
  body:JSON.stringify({host:'jeongukdaeri.kr',key,keyLocation:'https://jeongukdaeri.kr/'+key+'.txt',urlList:urls}),
  signal:AbortSignal.timeout(20000)
 });
 const message=(await response.text()).slice(0,300);
 console.log('Naver IndexNow response HTTP '+response.status+'; selectively submitted '+urls.length+' changed URLs: '+urls.join(' ')+(message?' ; '+message:''));
 if(![200,202].includes(response.status))throw Error('Naver IndexNow refused submitted URLs');
 console.log('Submission acknowledgement only; real crawler requests, URL indexing and ranking are unconfirmed.');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={priorityPaths,blogHashtagPaths,changedPaths,filesInRevision,verify,sitemapWindow:{focusCount,sparseVillageAllowance,minimumCount,maximumCount}};
