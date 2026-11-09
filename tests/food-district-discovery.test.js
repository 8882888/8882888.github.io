'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const {guides,page}=require('../lib/food-district-discovery');
assert.equal(guides.length,5);
assert.equal(new Set(guides.map(g=>g.slug)).size,5);
for(const guide of guides){
 assert(guide.venues.length>0,guide.city);
 for(const venue of guide.venues)assert(venue.length===4 && venue.every(Boolean),guide.city);
}
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const map=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const guide of guides){
 const url='/daeri/food-district/'+guide.slug+'/';
 assert(home.includes('href="'+url+'"'),'missing home navigation: '+url);
 // Node-only guides have no generated static HTML: do not list broken URLs in Pages sitemap.
 assert(!map.includes('https://jeongukdaeri.kr'+url),
  'Server-only food district guide must not be advertised as a static Pages sitemap URL: '+url);
 const html=page(guide.slug,{layout:(title,desc,body,canonical)=>'<title>'+title+'</title><meta name="description" content="'+desc+'"><link rel="canonical" href="'+canonical+'">'+body,esc:v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;'),host:'jeongukdaeri.kr'});
 assert(html.includes('<h1>'));
 assert(html.includes('음식점'));
 assert(html.includes('제휴'));
 assert(html.includes('tel:18114294'));
 for(const venue of guide.venues)assert(html.includes(venue[0]),venue[0]);
}
const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3154'},stdio:['ignore','pipe','pipe']});
let logs=''; child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
(async()=>{
 try{
  for(let i=0;i<120&&!logs.includes('listening');i++)await new Promise(r=>setTimeout(r,100));
  assert(logs.includes('listening'),logs);
  for(const guide of guides){
   const url='/daeri/food-district/'+guide.slug+'/';
   const response=await fetch('http://127.0.0.1:3154'+url);
   assert.equal(response.status,200,url);
   const html=await response.text();
   assert(html.includes('https://jeongukdaeri.kr'+url),url+' canonical');
   assert(html.includes('tel:18114294'),url+' consultation');
  }
  console.log('PASS 5 food district routes: sitemap, canonical, sources, customer advice, phone');
 } finally {child.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
