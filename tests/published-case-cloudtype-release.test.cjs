'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {loadPublishedCases}=require('../lib/published-case-feed');
const entries=loadPublishedCases(root),server='http://127.0.0.1:39869';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('historical publication manifest keeps exactly the saved, canonical and verified cases',()=>{
 const published=JSON.parse(fs.readFileSync(path.join(root,'data/published-ride-case-ids.json'),'utf8'));
 assert(entries.length>=26);
 assert.equal(entries.length,published.length,'do not claim unpublished or missing cases');
 assert.equal(new Set(entries.map(x=>x.path)).size,entries.length);
 assert(entries.every(x=>x.path.match(/^\/reviews\/verified\/[0-9a-f]{16}\/$/)));
 assert(entries.every(x=>x.publishedAt&&Date.parse(x.publishedAt)>0));
});
test('archive publication explicitly dispatches Cloudtype; live proof follows release',()=>{
 const archive=fs.readFileSync(path.join(root,'.github/workflows/update-naver-blog.yml'),'utf8');
 const deploy=fs.readFileSync(path.join(root,'.github/workflows/deploy-main.yml'),'utf8');
 const verify=fs.readFileSync(path.join(root,'.github/workflows/verify-live-seo.yml'),'utf8');
 assert.match(archive,/actions: write/);
 assert.match(archive,/if: steps\.publication\.outputs\.changed == 'true'/);
 assert.match(archive,/actions\/workflows\/deploy-main\.yml\/dispatches/);
 assert.match(deploy,/workflow_dispatch:/);
 assert.match(verify,/workflows: \["Deploy to Cloudtype"\]/);
 assert.match(verify,/github\.event\.workflow_run\.conclusion == 'success'/);
});
test('Node health, published sitemap, RSS and latest actual case agree on the same boot snapshot',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39869',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<70;i++){
   if(child.exitCode!==null)throw Error('Node app stopped unexpectedly');
   try{if((await fetch(server+'/health',{signal:AbortSignal.timeout(900)})).ok){ready=true;break}}catch{}
   await sleep(250);
  }
  assert(ready,'Node startup');
  const health=await(await fetch(server+'/health')).json();
  assert.equal(health.publishedCases.count,entries.length);
  assert.equal(health.publishedCases.latestId,entries[0].id);
  assert.equal(health.publishedCases.latestPublishedAt,entries[0].publishedAt);
  const sitemap=await(await fetch(server+'/sitemap-published.xml')).text();
  const rss=await(await fetch(server+'/rss.xml')).text();
  const index=await(await fetch(server+'/sitemap-all.xml')).text();
  assert(index.includes('https://jeongukdaeri.kr/sitemap-published.xml'));
  for(const x of entries){
   assert(sitemap.includes('<loc>https://jeongukdaeri.kr'+x.path+'</loc>'),x.path+' sitemap');
  }
  for(const x of entries.slice(0,20)){
   assert(rss.includes('<link>https://jeongukdaeri.kr'+x.path+'</link>'),x.path+' rss');
  }
  const latest=entries[0],page=await fetch(server+latest.path);
  assert.equal(page.status,200);
  const html=await page.text();
  assert(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+latest.path+'">'));
  assert(!/<meta[^>]*name="robots"[^>]*noindex/i.test(html));
 }finally{child.kill()}
});
