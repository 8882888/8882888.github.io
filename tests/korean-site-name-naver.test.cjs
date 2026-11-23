'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.join(__dirname,'..'),base='http://127.0.0.1:39849';
const brand='전국대리운전',canonical='https://jeongukdaeri.kr/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function inspect(html){
 const head=html.split('</head>')[0]||'',tags=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
 const value=(s,k)=>s.match(new RegExp('\\b'+k+'=["\\x27]([^"\\x27]+)["\\x27]','i'))?.[1]||'';
 const find=(k,v)=>tags.filter(t=>value(t,k)===v).map(t=>value(t,'content'));
 const ld=[...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 return {head,site:find('property','og:site_name'),app:find('name','application-name'),ld};
}
test('homepage keeps one unified Korean name in canonical metadata and WebSite/Organization',()=>{
 const s=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const seo=require('../data/seo-pages.json').pages.find(x=>x.path==='/');
 const {head,site,app,ld}=inspect(s);
 assert.deepEqual(site,[brand]);assert.deepEqual(app,[brand]);
 assert(head.includes('<title>'+seo.title+'</title>'));
 assert(head.includes('property="og:title" content="'+seo.title+'"'));
 assert(head.includes('name="description" content="'+seo.description+'"'));
 assert(head.includes('property="og:description" content="'+seo.description+'"'));
 assert(head.includes('rel="canonical" href="'+canonical+'"'));
 const web=ld.filter(x=>x['@type']==='WebSite');
 assert.equal(web.length,1);assert.equal(web[0].name,brand);
 assert.equal(web[0].url,canonical);assert.equal(web[0]['@id'],canonical+'#website');
 assert.equal(web[0].publisher['@id'],canonical+'#organization');
 assert(!web[0].alternateName?.includes('스마트24'));
 const org=ld.filter(x=>x['@type']==='Organization');
 assert.equal(org.length,1);assert.equal(org[0].name,brand);
 assert.equal(org[0]['@id'],canonical+'#organization');
 assert.equal(ld.find(x=>x['@type']==='Service').provider['@id'],org[0]['@id']);
});
test('Yeti fetches unified Korean site name, indexable service canonical and homepage WebSite',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'39849',PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<80;i++){
   if(child.exitCode!==null)throw Error('server exited before ready');
   try{if((await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break}}catch{}
   await sleep(250);
  }
  assert(ready);
  for(const uri of ['/','/daeri/','/taksong/','/coverage/','/service/corporate/','/설악산탁송/']){
   const resp=await fetch(base+uri,{signal:AbortSignal.timeout(18000),headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'}});
   assert.equal(resp.status,200,uri);
   const {head,site,app,ld}=inspect(await resp.text());
   assert.deepEqual(site,[brand],uri+' og:site_name');
   assert.deepEqual(app,[brand],uri+' application-name');
   assert(head.includes('href="'+canonical.replace(/\/$/,'')+uri+'"'),uri+' canonical');
   assert(!/<meta\b[^>]*content="[^"]*\bnoindex\b/i.test(head),uri+' noindex');
   if(uri==='/'||uri==='/taksong/'){
    const description=require('../data/seo-pages.json').pages.find(x=>x.path===uri).description;
    assert(Array.from(description).length<=80,uri+' Naver short description');
    assert(head.includes('name="description" content="'+description+'"'),uri+' runtime description');
    assert(head.includes('property="og:description" content="'+description+'"'),uri+' runtime Open Graph description');
   }
   if(uri==='/')assert.equal(ld.filter(x=>x['@type']==='WebSite').length,1);
  }
 }finally{child.kill();}
});
