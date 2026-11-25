'use strict';
// Read-only production checks: they do NOT measure current Naver index status,
// impressions or clicks and do NOT request crawling or synthetic engagement.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const publicBase='https://jeongukdaeri.kr';
const fetchBase=process.env.LIVE_SITE_URL||publicBase;
const priority=read('data/priority-regions.json').pages;
const focus=read('data/naver-regional-focus-sixth-100.json').priority;
const baseline=read('data/naver-search-baseline-20261105.json');
const targets=[
 {region:'강원특별자치도 강릉시',kind:'daeri',path:'/daeri/gangwon/gangreung-si/',
  headline:'강릉대리운전 | 경포·안목·교동·주문진 예약·실제 운행기록'},
 {region:'강원특별자치도 강릉시',kind:'taksong',path:'/taksong/gangwon/gangreung-si/',
  headline:'강릉탁송 | 강릉항·경포·주문진 차량인수·요금'}
];
function ensure(ok,message){if(!ok)throw Error(message)}
function uniqueMatch(html,re,message){
 const matches=[...html.matchAll(re)];
 ensure(matches.length===1,message+' expected exactly one, found '+matches.length);
 return matches[0];
}
async function main(){
 const report={checkedAt:new Date().toISOString(),target:fetchBase,canonicalSite:publicBase,scope:'Read-only HTTP and source-backed visibility, NOT Naver search metrics',pages:[],errors:[],naver:{
  status:'NO_CURRENT_OWNER_AUTHENTICATED_SNAPSHOT',
  ownerBaselineDate:baseline.last_updated,
  period:baseline.period,
  ownerNote:'Past clicks may include owner verification; there is no proven increase in Naver indexing, impressions, CTR or calls'
 }};
 for(const item of targets){
  const out={url:item.path,pass:false};
  report.pages.push(out);
  try{
   const guide=priority.find(x=>x.kind===item.kind&&x.region===item.region);
   const editorial=focus.find(x=>x.kind===item.kind&&x.region===item.region);
   ensure(guide&&editorial,'missing independently reviewed local editorial data');
   const res=await fetch(new URL(item.path,fetchBase),{
    signal:AbortSignal.timeout(18000),
    headers:{'Cache-Control':'no-cache','Pragma':'no-cache','User-Agent':'Smart24-source-parity-readonly/1.0'},
    redirect:'manual'
   });
   ensure(res.status===200,'HTTP '+res.status);
   ensure(!/noindex/i.test(res.headers.get('x-robots-tag')||''),'noindex X-Robots-Tag');
   const html=await res.text();
   const title=uniqueMatch(html,/<title>([^<]*)<\/title>/g,'title')[1];
   const h1=uniqueMatch(html,/<h1(?:\s[^>]*)?>([^<]*)<\/h1>/g,'H1')[1];
   const expectedTitle=item.headline+' | 전국대리운전';
   ensure(title===expectedTitle,'stale or incorrect live title: '+title);
   ensure(h1===item.headline,'stale or incorrect live H1: '+h1);
   ensure(html.includes('<link rel="canonical" href="'+publicBase+item.path+'">'),'canonical URL missing or different');
   uniqueMatch(html,/<link rel="canonical"[^>]*>/g,'canonical');
   const desc=uniqueMatch(html,/<meta name="description" content="([^"]*)">/g,'description')[1];
   ensure(desc.includes(guide.topic),'description missing reviewed region topic');
   ensure(desc.includes(guide.detail.split(/[.!?。]/)[0].trim().slice(0,16)),'description missing locale-specific source details');
   ensure(desc.length<=170,'meta too long');
   ensure(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),'no indexable meta');
   ensure(html.includes(guide.detail),'source-reviewed priority guide not visible');
   ensure(html.includes(editorial.pickup)&&html.includes(editorial.handover),'substantive original pickup/handover paragraphs missing');
   ensure(html.includes('href="tel:18114294"'),'official site consultation number missing');
   const evidence=html.indexOf('id="priority-region-guide"');
   const editorialId=html.indexOf('id="naver-focus50-local-guide"');
   const generic=html.indexOf('id="priority-locality-customer-checklist-20261105"');
   ensure(evidence>=0&&editorialId>evidence&&generic>editorialId,'unique editorial evidence is buried under automated navigation');
   ensure(html.split('id="priority-region-guide"').length===2,'duplicate reviewed content block');
   ensure(html.split('id="naver-focus50-local-guide"').length===2,'duplicate original regional content block');
   const historic=baseline.pages.find(x=>x[0]===item.path);
   ensure(historic,'missing dated owner-reported Naver baseline');
   out.status=res.status;out.title=title;out.h1=h1;out.description=desc;
   out.uniqueTextBeforeNavigation=true;
   out.ownerBaseline={at:baseline.last_updated,clicks:historic[1],impressions:historic[2]};
   out.currentNaverClicks=null;out.currentNaverImpressions=null;out.pass=true;
  }catch(e){out.error=e.message;report.errors.push(item.path+': '+e.message)}
 }
 console.log(JSON.stringify(report,null,2));
 if(report.errors.length){console.error('FAIL live source-backed priority metadata/content: '+report.errors.join('; '));process.exitCode=1;}
 else console.log('PASS live source-backed priority content before generic navigation, canonical titles, H1 and descriptions (Naver results NOT measured)');
}
main().catch(e=>{console.error(e);process.exitCode=1});
