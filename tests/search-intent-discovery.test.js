'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
assert(home.includes('href="/recruit/daeri/"'));
assert(home.includes('href="/recruit/taksong/"'));
assert(home.includes('href="/daeri/gangnam-food-guide/"'));
assert(sitemap.includes('https://jeongukdaeri.kr/daeri/gangnam-food-guide/'));
const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3149'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
(async()=>{
 try{
  for(let i=0;i<100&&!output.includes('listening');i++)await new Promise(r=>setTimeout(r,100));
  assert(output.includes('listening'),output);
  for(const uri of ['/recruit/daeri/','/recruit/taksong/','/daeri/gangnam-food-guide/']){
   const response=await fetch('http://127.0.0.1:3149'+uri);
   assert.equal(response.status,200,uri);
   const html=await response.text();
   assert(html.includes('rel="canonical"')||html.includes('rel=\"canonical\"'),uri+' canonical');
   assert(html.includes('tel:18114294'),uri+' phone');
   if(uri.includes('food-guide')){
    assert(html.includes('양산도 역삼점')&&html.includes('신사 모소리'),'confirmed restaurants');
    assert(html.includes('제휴')&&html.includes('주차장'),'non-affiliation and pickup notes');
   }
  }
  console.log('PASS search-intent-discovery: driver recruitment + grounded Gangnam dining discovery');
 }finally{child.kill()}
})().catch(err=>{console.error(err);process.exitCode=1});
