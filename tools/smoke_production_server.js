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
function request(port,pathname,extraHeaders={}){
 return new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port,path:pathname,timeout:15000,headers:extraHeaders},res=>{
   const parts=[];
   res.on('data',chunk=>parts.push(chunk));
   res.on('end',()=>{const buffer=Buffer.concat(parts);resolve({status:res.statusCode,headers:res.headers,body:buffer.toString('utf8'),byteLength:buffer.length})});
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
  // Regression: show the three most important historical fare tables before long prose.
  for(const [route,tableId,imageId] of [
    ['/설악산탁송/','mountain-route-fare-table-202611','original-mountain-fare-visual'],
    ['/지리산탁송/','mountain-route-fare-table-202611','original-mountain-fare-visual'],
    ['/special/cycling-trail-transport/','cycling-route-fare-table-202611','keyword-image-first-202611']
  ]){
    const r=await request(port,encodeURI(route));
    assert.equal(r.status,200,route+' must open');
    const fareAt=r.body.indexOf('<section id="'+tableId+'"');
    const imageAt=r.body.indexOf('<figure id="'+imageId+'"');
    if(route.includes('탁송/')){
      assert(imageAt>0&&fareAt>imageAt,'original mountain fare image must be the first visual: '+route);
      assert(imageAt<r.body.indexOf('<header'),'mountain visual is buried below menu: '+route);
    }else assert(fareAt>0&&imageAt>fareAt,'cycling fare table should be before banner: '+route);
    assert(r.body.includes('<table')&&r.body.includes('만원'),'real historical fare table missing: '+route);
    assert(r.body.includes('https://jeongukdaeri.kr'+route),'canonical URL missing: '+route);
  }
  for(const [id,label] of [['yeongsan','영산강길'],['seomjin','섬진강길'],['eastcoast','동해안길'],['geumgang','금강길'],['ocheon','오천길'],['nakdonggang','낙동강길']]){
    const route='/route-taksong/courses/'+id+'/',pic='/assets/cycling-routes/'+id+'-taksong.svg';
    const page=await request(port,route);
    assert.equal(page.status,200,'cycling course route '+route);
    assert(page.body.includes('property="og:image" content="https://jeongukdaeri.kr'+pic+'"'),'bad course primary image '+route);
    assert(page.body.includes('src="'+pic+'"')&&page.body.includes(label+'자전거종주탁송'),'missing contextual image '+route);
    const image=await request(port,pic);
    assert.equal(image.status,200,'cycling illustration missing '+pic);
    assert.equal(image.headers['content-type'],'image/svg+xml','wrong cycling illustration MIME '+pic);
  }
  // Dynamic, automatically scaled region cards must be visible near the first
  // service block and carry the correct locality into the same OG image URL.
  for(const route of ['/taksong/busan/','/taksong/daegu/','/taksong/incheon/','/taksong/ulsan/','/daeri/busan/','/daeri/seoul/']){
    const page=await request(port,route);
    assert.equal(page.status,200,'regional dynamic card page '+route);
    const kind=route.startsWith('/taksong/')?'taksong':'daeri';
    const match=page.body.match(new RegExp('src="(/card/area-[0-9]+-'+kind+'-brand-v3\\.png)"'));
    assert(match,'missing automatically generated regional PNG: '+route);
    assert(page.body.includes('property="og:image" content="https://jeongukdaeri.kr'+match[1]+'"'),'region OG image not matching visible card '+route);
    assert(page.body.includes('href="'+match[1]+'" target="_blank"'),'regional card not tap-to-enlarge '+route);
    assert(page.body.includes('class="regional-responsive-card"'),'regional card not responsive '+route);
    assert(page.body.indexOf('class="regional-responsive-card"')<page.body.indexOf('<h2>주변 지역'),'card appears only below long local page '+route);
    console.log('CHECK dynamic regional PNG',route,match[1]);
    const png=await request(port,match[1]);
    assert.equal(png.status,200,'dynamic regional image missing '+route);
    assert.equal(png.headers['content-type'],'image/png');
    assert(png.byteLength>5000,'regional card too small for Naver image metadata '+route+' actual bytes='+png.byteLength);
  }
  const preview=await request(port,'/region/?q='+encodeURIComponent('강릉'));
  assert.equal(preview.status,200);
  assert(preview.body.includes('class="dynamic-region-card-preview" open'),'Gangneung should auto-expand the correct card');
  assert(preview.body.includes('-taksong-brand-v3.png'),'preview should use region-specific v3 PNG');
  const cycleHub=await request(port,'/route-taksong/');
  assert.equal(cycleHub.status,200);
  assert(cycleHub.body.includes('id="cycling-visible-fare-table-20261103"'),'cycling hub lost its visible fare table');
  assert(cycleHub.body.includes('생활체육공원 → 배알도'),'cycling price table missing a verified route');
  const warmAt=Date.now(),homePage=await request(port,'/');
  const warmMs=Date.now()-warmAt;
  assert.equal(homePage.status,200,'homepage must open');
  assert(homePage.body.includes('id="mountain-cycling-fare-first-20261103"'),'homepage first-screen fare links missing');
  assert(homePage.body.indexOf('id="mountain-cycling-fare-first-20261103"')-homePage.body.indexOf('<body')<5500,'fare/image links buried below long body text');
  for(const path of ['/assets/seoraksan-taksong-original-fare.png','/assets/jirisan-taksong-original-fare.png','/assets/smart24-taksong-brand.webp','/assets/smart24-business-card-inline.webp']){
    const img=await request(port,path);
    assert.equal(img.status,200,'image asset HTTP failed: '+path);
    assert(/^image\//.test(img.headers['content-type']||''),'image MIME missing: '+path);
    assert((img.headers['cache-control']||'').includes('max-age=3600'),'image caching missing: '+path);
    assert((Number(img.headers['content-length'])||0)>10000,'image asset too small or empty: '+path);
    const cached=await request(port,path,{'If-None-Match':img.headers.etag});
    assert.equal(cached.status,304,'image ETag revalidation failed: '+path);
  }
  const favicon=await request(port,'/favicon.ico');
  assert.equal(favicon.status,200,'favicon must render immediately from bundled file');
  assert.equal(favicon.headers['content-type'],'image/x-icon');
  console.log('PASS: mountain and cycling fare tables restored to top, image assets stream/cached, home visual links visible; warm homepage '+warmMs+'ms in local CI');
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
  const journeyPlans=JSON.parse(fs.readFileSync('data/region-journey-links.json','utf8')).pages;
  assert.equal(journeyPlans.length,10,'exactly ten useful regional cross-links');
  for(const entry of journeyPlans){
    const page=await request(port,entry.path);
    assert.equal(page.status,200,'related region page: '+entry.path);
    assert(page.body.includes('rel="canonical" href="https://jeongukdaeri.kr'+entry.path+'"'),'wrong canonical '+entry.path);
    assert(page.body.includes('id="verified-region-journey-links"'),'missing customer region navigation: '+entry.path);
    assert(page.body.includes(entry.heading),'region-specific navigation heading missing: '+entry.path);
    for(const link of entry.related)assert(page.body.includes('href="'+link.path+'"'),entry.path+' missing real region link '+link.path);
    for(const faq of entry.faq){
      assert(page.body.includes(faq.question),'missing local customer question: '+entry.path);
      assert(page.body.includes(faq.answer),'missing grounded customer answer: '+entry.path);
    }
    assert(page.body.includes('id="regional-original-source-links-20261103"'),'regional source evidence section missing: '+entry.path);
    for(const item of entry.handover)assert(page.body.includes(item),'regional vehicle handover instruction missing: '+entry.path);
    for(const item of entry.originals){
      const expected='https://blog.naver.com/wjdtnr4757/'+item.id;
      assert(page.body.includes('href="'+expected+'"'),'original Naver source link missing: '+entry.path+' / '+item.id);
      assert(page.body.includes(item.note),'contextual original-source note missing: '+entry.path+' / '+item.id);
    }
    assert.equal((page.body.match(/<dt><strong>/g)||[]).length>=2,true,'FAQ missing: '+entry.path);
  }
  const kw=await request(port,'/taksong/gwangju/');
  assert(!kw.body.includes('광산구·풍암매매단지·송도수출단지 장거리탁송'),'misleading Gwangju/remote Incheon location wording');
  for(const file of ['data/priority-regions.json','data/region-journey-links.json'])
    assert.match(diagnostic.deployment_hashes[file],/^[0-9a-f]{64}$/,'missing geographic page source hash: '+file);
  const blogArticles=JSON.parse(fs.readFileSync('data/blog-hashtags-priority.json','utf8')).articles;
  assert.equal(blogArticles.length,30);
  const priorityBlogSitemap=await request(port,'/sitemap-priority.xml');
  const mainBlogSitemap=await request(port,'/sitemap.xml');
  assert.equal(priorityBlogSitemap.status,200);assert.equal(mainBlogSitemap.status,200);
  for(const article of blogArticles){
    const route='/blog/daeri-regions/'+article.slug+'/';
    for(const xml of [priorityBlogSitemap.body,mainBlogSitemap.body])
      assert(xml.includes('https://jeongukdaeri.kr'+route),'updated blog page missing from sitemap: '+route);
    const page=await request(port,route);
    assert.equal(page.status,200,'regional blog URL '+route);
    assert(page.body.includes('rel="canonical" href="https://jeongukdaeri.kr'+route+'"'),'wrong blog canonical '+route);
    assert(!/name="robots" content="[^"]*noindex/i.test(page.body),'blog noindex '+route);
    const section=page.body.match(/<section id="blog-local-hashtags-30"[\s\S]*?<\/section>/);
    assert(section,'30-hashtag region section absent: '+route);
    const p=section[0].match(/<p class="tags"[^>]*>([^<]+)<\/p>/);
    assert(p,'visible tags paragraph missing: '+route);
    assert.deepEqual(p[1].trim().split(/\s+/),article.tags,'deployed tag mismatch: '+route);
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
 }catch(err){
  console.error('SERVER DIAGNOSTIC exit='+exited+'; '+logs.slice(-4000));
  throw err;
 }finally{
  srv.kill('SIGTERM');
 }
}
main().catch(err=>{console.error('FAIL: production Node startup and route smoke test:',err.stack||err);process.exitCode=1});
