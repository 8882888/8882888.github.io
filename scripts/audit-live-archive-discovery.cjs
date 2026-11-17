'use strict';
// Post-release, read-only SEO check. Observes live links only; does not verify
// Naver crawl/indexing, clicks, Google rank, conversion, or source ride completion.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const {archiveEvidenceIndex}=require('../lib/archived-ride-evidence-directory.cjs');
const legalNames=fs.readdirSync(path.join(root,'data/legal-regions'))
 .filter(x=>/^\d{2}\.json$/.test(x))
 .flatMap(x=>read('data/legal-regions/'+x).full_names);
const legal=new Map(legalNames.map(full_name=>[full_name,{full_name}]));
const rows=Array.from({length:9},(_,i)=>
 read('data/regional-review-links-batch-'+String(i+1).padStart(3,'0')+'-'+(i===8?'191':'300')+'.json')).flatMap(x=>x.items);
const index=archiveEvidenceIndex(rows,legal);
const BASE=new URL(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr');
const canonicalOrigin='https://jeongukdaeri.kr';
const cases=[
 {kind:'daeri',name:'강화군',path:'/daeri/incheon/ganghwa-gun/',count:42},
 {kind:'taksong',name:'연수구',path:'/taksong/incheon/yeonsu-gu/',count:40}
];
function check(ok,what){if(!ok)throw Error(what)}
async function get(path){
 const res=await fetch(new URL(path,BASE),{redirect:'manual',
  headers:{'User-Agent':'Smart24-live-archive-evidence-check/1.0','Cache-Control':'no-cache'},
  signal:AbortSignal.timeout(16000)});
 return {res,html:await res.text()};
}
async function main(){
 check(index.overview.total===2591,'archival data changed');
 check(index.overview.regionUnresolved===2183,'unresolved region count changed; requires editorial audit');
 check(index.overview.classified===408,'classified source count changed; recheck evidence before publication');
 check(index.overview.uniqueRegionService===142,'regional evidence groups require revalidation');
 const out={checkedAt:new Date().toISOString(),site:BASE.origin,scope:'Read-only live classified ride source discovery; NOT a Naver index or CTR measurement',
  total:2591,classified:408,unresolved:2183,regionServiceGroups:142,
  renderedGroups:{daeri:index.sections.daeri.length,taksong:index.sections.taksong.length},
  urls:[],errors:[]};
 for(const x of cases){
  const row={kind:x.kind,url:'/'+x.kind+'/',pass:false};
  out.urls.push(row);
  try{
   const {res,html}=await get(row.url);
   check(res.status===200,'national page HTTP '+res.status);
   check(!/noindex/i.test(res.headers.get('x-robots-tag')||''),'blocked by X-Robots-Tag');
   check(html.includes('<link rel="canonical" href="'+canonicalOrigin+row.url+'">'),'national canonical mismatch');
   check(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),'non-indexable meta robots');
   check(html.includes('id="classified-archive-locality-links"'),'missing archive-derived discovery links on production');
   check(html.split('id="classified-archive-locality-links"').length===2,'duplicate archive discovery section');
   check(html.indexOf('id="classified-archive-locality-links"')<html.indexOf('id="naver-focused-regional-discovery"'),
    'archive evidence hidden behind generic locality list');
   check(html.includes('href="'+x.path+'"'),x.name+' original regional canonical not linked');
   check(html.includes('기존 기록 중 지역 분류 '+x.count+'건'),'source region count mismatch');
   check(html.includes('href="tel:18114294"'),'site consultation action missing');
   check(!html.includes('null 자동차탁송'),'unresolved archive classifications surfaced to users');
   const actual=await get(x.path);
   check(actual.res.status===200,x.path+' existing region page not reachable');
   check(actual.html.includes('<link rel="canonical" href="'+canonicalOrigin+x.path+'">'),x.path+' regional canonical missing');
   check(actual.html.includes('href="/reviews/history/'),x.path+' archived dispatch navigation missing');
   row.pass=true;row.status=200;row.regionCanonical=x.path;row.classifiedCount=x.count;
  }catch(e){row.error=e.message;out.errors.push(x.kind+': '+e.message)}
 }
 console.log(JSON.stringify(out,null,2));
 if(out.errors.length){console.error('FAIL live archive-backed SEO discovery: '+out.errors.join('; '));process.exitCode=1;}
 else console.log('PASS live route/archive links on existing national, regional and history pages. No Naver click/index inference.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
