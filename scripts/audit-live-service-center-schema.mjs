'use strict';
// Real HTTP evidence only. This verifies discoverability/indexability,
// NOT whether Naver or Google has actually indexed any URL.
const base=new URL(process.env.LIVE_SITE_URL||'https://jeongukdaeri.kr');
const names=['현대서비스센터탁송','벤츠서비스센터탁송','볼보서비스센터탁송'];
const paths=['/taksong/types/',...names.map(name=>'/taksong/type/'+Buffer.from(name,'utf8').toString('hex')+'/')];
async function retrieve(path){
 const response=await fetch(new URL(path,base),{
  headers:{'User-Agent':'Smart24-indexability-audit/1.0'},
  signal:AbortSignal.timeout(18000),redirect:'manual'
 });
 return {response,text:await response.text()};
}
function assert(condition,message){if(!condition)throw Error(message)}
async function main(){
 const report={site:base.origin,checkedAt:new Date().toISOString(),source:'Public HTTP; NOT a Naver/Search Console index report',checks:[],errors:[]};
 let sitemap='';
 try{
  const {response,text}=await retrieve('/sitemap.xml');
  assert(response.status===200,'sitemap HTTP '+response.status);
  sitemap=text;
  report.checks.push({url:'/sitemap.xml',status:200});
 }catch(e){report.errors.push('/sitemap.xml '+e.message)}
 try{
  const {response,text}=await retrieve('/robots.txt');
  assert(response.status===200,'robots HTTP '+response.status);
  assert(!/Disallow:\s*\/taksong\/types?\//i.test(text),'service center hub blocked by robots');
  assert(!/Disallow:\s*\/taksong\/type\//i.test(text),'service center brand guides blocked by robots');
  report.checks.push({url:'/robots.txt',status:200});
 }catch(e){report.errors.push('/robots.txt '+e.message)}
 for(const p of paths){
  try{
   const {response,text}=await retrieve(p);
   assert(response.status===200,'HTTP '+response.status);
   const canonical=base.origin+p;
   assert(text.includes('<link rel="canonical" href="'+canonical+'">'),'canonical mismatch');
   assert((text.match(/<link rel="canonical"/g)||[]).length===1,'duplicate canonical');
   assert(!/noindex/i.test(response.headers.get('x-robots-tag')||''),'noindex HTTP header');
   assert(text.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),'non-indexable robots meta');
   assert(sitemap.includes('<loc>'+canonical+'</loc>'),'canonical URL missing from primary sitemap');
   const match=text.match(/<script id="service-center-schema-v1" type="application\/ld\+json">([\s\S]*?)<\/script>/);
   assert(match,'structured data not in visible HTML');
   const obj=JSON.parse(match[1]),graph=obj['@graph'];
   assert(Array.isArray(graph),'@graph missing');
   const page=graph.find(x=>['WebPage','CollectionPage'].includes(x['@type']));
   const service=graph.find(x=>x['@type']==='Service');
   const breadcrumb=graph.find(x=>x['@type']==='BreadcrumbList');
   assert(page?.url===canonical,'WebPage canonical mismatch');
   assert(service?.url===canonical,'Service URL mismatch');
   assert(service.provider?.name==='전국대리운전','unknown provider brand');
   assert(breadcrumb?.itemListElement?.at(-1)?.item===canonical,'breadcrumb URL mismatch');
   assert(!Object.hasOwn(service,'aggregateRating')&&!Object.hasOwn(service,'offers'),'unsupported rating/price assertion');
   if(p==='/taksong/types/'){
    const list=graph.find(x=>x['@type']==='ItemList');
    assert(list?.itemListElement?.length===3,'group list cardinality mismatch');
    for(const item of list.itemListElement)assert(text.includes('id="'+new URL(item.url).hash.slice(1)+'"'),'category missing from visible page');
   }
   report.checks.push({url:p,status:200,canonical:true,robots:'index',schemaTypes:graph.map(x=>x['@type']),inSitemap:true});
  }catch(e){report.errors.push(p+' '+e.message)}
 }
 console.log(JSON.stringify(report,null,2));
 if(report.errors.length){console.error('FAIL service-center live SEO audit: '+report.errors.join('; '));process.exitCode=1}
 else console.log('PASS live service-center HTTP + canonical + robots + primary sitemap + JSON-LD (not confirmed indexed)');
}
main().catch(e=>{console.error(e);process.exitCode=1});
