'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {pageGraph}=require('../lib/service-center-schema.cjs');
const data=require('../data/service-center-keywords-20261117.json');

const BASE='https://jeongukdaeri.kr';
const PORT=39872;
const LOCAL='http://127.0.0.1:'+PORT;
const ROOT=path.resolve(__dirname,'..');
const brands=['현대서비스센터탁송','벤츠서비스센터탁송','볼보서비스센터탁송'];
const brandPath=name=>'/taksong/type/'+Buffer.from(name,'utf8').toString('hex')+'/';
function extractSchema(html){
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
 const mine=scripts.filter(m=>/id="service-center-schema-v1"/.test(m[1]));
 assert.equal(mine.length,1,'one schema graph on audited page');
 return JSON.parse(mine[0][2]);
}
function inspectGraph(schema,pathName,kind){
 const pathUrl=BASE+pathName;
 assert.equal(schema['@context'],'https://schema.org');
 const graph=schema['@graph'],page=graph.find(o=>['CollectionPage','WebPage'].includes(o['@type']));
 const service=graph.find(o=>o['@type']==='Service');
 const breadcrumbs=graph.find(o=>o['@type']==='BreadcrumbList');
 assert(page&&service&&breadcrumbs);
 assert.equal(page['@type'],kind==='hub'?'CollectionPage':'WebPage');
 assert.equal(page.url,pathUrl);assert.equal(page['@id'],pathUrl+'#webpage');
 assert.equal(page.mainEntity['@id'],pathUrl+'#service');
 assert.equal(page.breadcrumb['@id'],pathUrl+'#breadcrumb');
 assert.equal(service['@id'],pathUrl+'#service');
 assert.equal(service.url,pathUrl);
 assert.equal(service.provider.name,'전국대리운전');
 assert.equal(service.provider.url,BASE+'/');
 assert(!('price' in service));assert(!('aggregateRating' in service));
 assert(!('review' in service));assert(!('offers' in service));
 const crumbs=breadcrumbs.itemListElement;
 assert.equal(crumbs[0].item,BASE+'/');
 assert.equal(crumbs[1].item,BASE+'/taksong/');
 assert.equal(crumbs.at(-1).item,pathUrl);
 assert.deepEqual(crumbs.map(x=>x.position),crumbs.map((_,i)=>i+1));
 if(kind==='hub'){
  const list=graph.find(x=>x['@type']==='ItemList');
  assert(list);
  assert.equal(list.itemListElement.length,3);
  for(const [i,g] of data.groups.entries()){
   assert.equal(list.itemListElement[i].name,g.title);
   assert.equal(list.itemListElement[i].url,pathUrl+'#'+g.id);
  }
 }else assert(!graph.some(x=>x['@type']==='ItemList'));
}

test('schema helper links only public canonical page, service and accurate breadcrumbs',()=>{
 const options={canonicalUrl:BASE+'/taksong/types/',name:'국산차·수입차·대형트럭 서비스센터 탁송 안내',description:'차량 인수·인계 조건 안내',kind:'hub',groups:data.groups};
 const schema=pageGraph(options);
 inspectGraph(schema,'/taksong/types/','hub');
 assert.throws(()=>pageGraph({...options,canonicalUrl:'http://jeongukdaeri.kr/taksong/types/'}),/HTTPS/);
 assert.throws(()=>pageGraph({...options,canonicalUrl:BASE+'/wrong/'}),/path mismatch/);
});

test('service-center pages remain indexable, are linked from sitemap, and expose truthful JSON-LD',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   if(child.exitCode!==null)throw Error('server exited '+child.exitCode);
   try{if((await fetch(LOCAL+'/health',{signal:AbortSignal.timeout(1300)})).ok){ready=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert(ready,'local server started');
  const mainSitemap=await fetch(LOCAL+'/sitemap.xml',{signal:AbortSignal.timeout(30000)});
  assert.equal(mainSitemap.status,200);
  const sitemapBody=await mainSitemap.text();
  const paths=['/taksong/types/',...brands.map(brandPath)];
  for(const p of paths){
   assert(sitemapBody.includes('<loc>'+BASE+p+'</loc>'),p+' is discoverable in primary sitemap');
  }
  const national=await fetch(LOCAL+'/taksong/',{signal:AbortSignal.timeout(30000)});
  assert.equal(national.status,200);
  assert((await national.text()).includes('href="/taksong/types/#commercial-truck-service-centers"'),'truck category linked from national page');
  for(const p of paths){
   const r=await fetch(LOCAL+p,{signal:AbortSignal.timeout(30000)});
   assert.equal(r.status,200,p);
   assert(!/noindex/i.test(r.headers.get('x-robots-tag')||''),p+' must not have noindex header');
   const html=await r.text();
   assert(html.includes('<meta name="robots" content="index,follow,max-image-preview:large">'),p+' indexable meta');
   assert(html.includes('<link rel="canonical" href="'+BASE+p+'">'),p+' canonical');
   assert.equal((html.match(/<link rel="canonical"/g)||[]).length,1,p+' one canonical');
   const graph=extractSchema(html);
   inspectGraph(graph,p,p==='/taksong/types/'?'hub':'brand');
   assert(html.includes('href="tel:18114294"'),p+' phone CTA');
   assert(!html.includes('"@type":"FAQPage"'),'FAQ-rich-result spam not permitted');
   if(p==='/taksong/types/'){
    for(const g of data.groups){
     assert(html.includes('id="'+g.id+'"'),g.id+' visible section');
     assert(html.includes('<h2>'+g.title+'</h2>'),g.title+' text matches JSON-LD category name');
    }
    assert(html.includes('타타대우모빌리티'),'true truck maker name');
   }else{
    const name=brands.find(b=>brandPath(b)===p);
    assert(html.includes(name+' 안내'),name+' visible page');
    assert(html.includes('상용차·대형트럭 서비스센터와 구분'),name+' truck/passenger distinction');
   }
  }
  const robots=await fetch(LOCAL+'/robots.txt',{signal:AbortSignal.timeout(10000)});
  assert.equal(robots.status,200);
  const robotsTxt=await robots.text();
  assert(!/Disallow:\s*\/taksong(?:\/types?|\/type\/)/.test(robotsTxt),'crawler block not allowed on audited service pages');
 }finally{child.kill();}
});
