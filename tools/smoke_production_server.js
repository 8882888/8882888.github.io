'use strict';
// Start the REAL Node server before deploying. Syntax-only checks missed a hardcoded
// 27-vs-34 priority-region startup crash. This test exercises production routes.
const http=require('node:http');
const net=require('node:net');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');

function freePort(){
 return new Promise((resolve,reject)=>{
  const s=net.createServer();
  s.once('error',reject);
  s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))});
 });
}
function request(port,pathname){
 return new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port,path:pathname,timeout:15000},res=>{
   const parts=[];
   res.on('data',chunk=>parts.push(chunk));
   res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts).toString('utf8')}));
  });
  req.on('timeout',()=>req.destroy(new Error('HTTP timeout: '+pathname)));
  req.on('error',reject);
 });
}
async function main(){
 const port=await freePort();
 const srv=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:['ignore','pipe','pipe']});
 let logs='';
 srv.stdout.on('data',x=>{logs+=(String(x)).slice(0,2500)});
 srv.stderr.on('data',x=>{logs+=(String(x)).slice(0,3500)});
 let exited=false;srv.on('exit',()=>{exited=true});
 try{
  const stop=Date.now()+40000;
  let healthy=false;
  while(Date.now()<stop&&!exited){
   try{const res=await request(port,'/health');if(res.status===200){const data=JSON.parse(res.body);if(data.ok&&data.regions>=20000&&/^sha256-[0-9a-f]{16}$/.test(data.release)&&String(res.headers['cache-control']||'').includes('no-store')){healthy=true;break}}}catch(_){}
   await new Promise(resolve=>setTimeout(resolve,350));
  }
  assert(healthy,'Node server failed to start with nationwide region data; output: '+logs.slice(-5000));
  const expected=JSON.parse(fs.readFileSync('data/priority-regions.json','utf8')).pages;
  assert(expected.length>=34,'Priority regions unexpectedly reduced');
  const json=await request(port,'/health/seo.json');assert.equal(json.status,200,'Deployment JSON');
  const diagnostic=JSON.parse(json.body);
  assert(String(json.headers['cache-control']||'').includes('no-store'),'SEO health JSON must not be cacheable');
  assert.equal(diagnostic.priority_region_count,expected.length,'production dynamic priority region count');
  const curatedSources=JSON.parse(fs.readFileSync('data/priority-blog-links.json','utf8')).pages;
  assert.equal(diagnostic.curated_source_groups,curatedSources.length);
  assert.equal(diagnostic.curated_source_links,curatedSources.reduce((count,item)=>count+item.ids.length,0));
  assert.equal(diagnostic.blog_source_count,630);
  for(const name of ['server.js','index.html','data/seo-pages.json','data/priority-blog-links.json','lib/regional-history-evidence.js'])
   assert.match(diagnostic.deployment_hashes[name],/^[0-9a-f]{64}$/);
  const checks=[
   ['/', 'special-business-top-links-20261103'],
   ['/taksong/', 'specialized-business-taksong-hub'],
   ['/daeri/', 'real-original-daeri-links-20261102'],
   ['/region/', 'verified-naver-region-links-20261102'],
   ['/taksong/busan/', 'local-naver-originals'],
   ['/daeri/daegu/', 'local-naver-originals'],
   ['/health/seo-report/', '서버 파일 지문:']
  ];
  for(const [url,marker] of checks){
   const r=await request(port,url);
   assert.equal(r.status,200,url+' HTTP');
   assert(r.body.includes(marker),url+' missing '+marker);
   if(url.startsWith('/health/')){
    assert.match(String(r.headers['x-robots-tag']||''),/noindex/);
    assert(String(r.headers['cache-control']||'').includes('no-store'),'Health report must not be cached');
   }
  }
  // The nationwide taksong hub must link directly to the weakly discovered
  // metropolitan and Gyeongnam canonical pages, not only to the homepage.
  const taksongHub=await request(port,'/taksong/');
  assert.equal(taksongHub.status,200,'nationwide taksong hub');
  for(const pathname of ['/taksong/gwangju/','/taksong/daejeon/',
                         '/taksong/gyeongnam/changwon-si/','/taksong/gyeongnam/gimhae-si/']){
    assert(taksongHub.body.includes('href="'+pathname+'"'),
      'Weakly discovered local landing must have a direct national hub link: '+pathname);
  }
  // Twenty concrete high-value routes. Failing any one prevents a bad Cloudtype redeploy.
  // The ten curated region routes must render directly grounded Naver original links.
  const priorityRoutes=[
   ['/',false],['/taksong/',false],['/daeri/',false],['/region/',false],
   ['/taksong/busan/',true],['/taksong/daegu/',true],
   ['/taksong/incheon/',true],['/taksong/gwangju/',true],
   ['/taksong/daejeon/',true],['/taksong/ulsan/',true],
   ['/taksong/gyeongnam/changwon-si/',true],
   ['/taksong/gyeongnam/gimhae-si/',true],
   ['/daeri/busan/',true],['/daeri/daegu/',true],
   ['/daeri/incheon/',false],['/daeri/gwangju/',false],
   ['/daeri/daejeon/',false],['/daeri/ulsan/',false],
   ['/blog/archive/',false],['/blog/taksong-categories/',false]
  ];
  assert.equal(priorityRoutes.length,20,'exactly 20 priority SEO smoke tests');
  for(const [url,requiresNaverOriginals] of priorityRoutes){
   const page=await request(port,url);
   assert.equal(page.status,200,'priority URL must return 200: '+url);
   assert(page.body.includes('rel="canonical" href="https://jeongukdaeri.kr'+url+'"'),'canonical missing/wrong: '+url);
   assert(!/name="robots" content="[^"]*noindex/i.test(page.body),'accidental noindex: '+url);
   assert(!/x-robots-tag.*noindex/i.test(String(page.headers['x-robots-tag']||'')),'noindex response header: '+url);
   const expectedPhone=url==='/blog/taksong-categories/'?'tel:18773015':'tel:18114294';
   assert(page.body.includes(expectedPhone),'service-appropriate phone CTA missing: '+url+' expected '+expectedPhone);
   const h1=(page.body.match(/<h1\b/gi)||[]).length;
   assert.equal(h1,1,'must have one H1: '+url);
   if(url==='/taksong/gwangju/')assert(page.body.includes('<title>광주탁송'),'Gwangju Metropolitan taksong title should use natural keyword');
   if(url==='/daeri/gwangju/')assert(page.body.includes('<title>광주대리운전'),'Gwangju Metropolitan driver title should use natural keyword');
   if(requiresNaverOriginals){
    assert(page.body.includes('id="local-naver-originals"'),'existing original source links missing: '+url);
    assert(page.body.includes('https://blog.naver.com/wjdtnr4757/'),'external Naver original URL missing: '+url);
   }
  }
  const newRegionalBlogPages=curatedSources.filter(item=>item.kind==='taksong'&&item.path);
  assert.equal(newRegionalBlogPages.length,10,'exactly 10 newly source-linked region service pages');
  for(const entry of newRegionalBlogPages){
    const page=await request(port,entry.path);
    assert.equal(page.status,200,'new regional blog landing HTTP: '+entry.path);
    assert(page.body.includes('rel="canonical" href="https://jeongukdaeri.kr'+entry.path+'"'),'new region canonical missing: '+entry.path);
    assert(!/name="robots" content="[^"]*noindex/i.test(page.body),'new region accidentally noindex: '+entry.path);
    assert(page.body.includes(entry.handoff),'regional pickup advice missing: '+entry.path);
    for(const id of entry.ids)assert(page.body.includes('https://blog.naver.com/wjdtnr4757/'+id),'published Naver link absent: '+id);
  }
  const trailingSlashRedirects=[
   ['/region?service=taksong','/region/?service=taksong'],
   ['/blog?kind=taksong','/blog/?kind=taksong'],
   ['/blog/archive?page=2','/blog/archive/?page=2']
  ];
  for(const [from,to] of trailingSlashRedirects){
   const redirect=await request(port,from);
   assert.equal(redirect.status,301,'canonical URL should 301: '+from);
   assert.equal(redirect.headers.location,to,'canonical redirect must preserve query: '+from);
  }
  for(const file of ['/sitemap-priority.xml','/sitemap.xml']){
   const r=await request(port,file);
   assert.equal(r.status,200,file+' HTTP');
   for(const canonical of ['/taksong/','/daeri/'])assert(r.body.includes('https://jeongukdaeri.kr'+canonical),file+' missing '+canonical);
   for(const [regionUrl,sourceLinked] of priorityRoutes){
    if(sourceLinked)assert(r.body.includes('<loc>https://jeongukdaeri.kr'+regionUrl+'</loc>'),file+' missing original-linked priority region '+regionUrl);
   }
  }
  console.log('PASS: production server boots with '+expected.length+' priority regions; 20 priority URLs HTTP 200 / H1 / canonical / index / phone checks; 630 original blog links and 10 source groups; XML routes accessible.');
 }finally{
  srv.kill('SIGTERM');
 }
}
main().catch(err=>{console.error('FAIL: production Node startup and route smoke test:',err.stack||err);process.exitCode=1});
