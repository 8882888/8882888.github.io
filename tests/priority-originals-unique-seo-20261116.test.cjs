'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const root=path.join(__dirname,'..');
const port=39817;
const origin='http://127.0.0.1:'+port;
const originals=JSON.parse(fs.readFileSync(path.join(root,'data/seo-reviewed-local-originals-20261116.json'),'utf8')).items;
const posts=JSON.parse(fs.readFileSync(path.join(root,'blog/posts.json'),'utf8'));
const byId=new Map(posts.map(x=>[String(x.id),x]));
const priority=[
 ['/daeri/sejong/','세종특별자치시','daeri'],
 ['/taksong/sejong/','세종특별자치시','taksong'],
 ['/taksong/busan/gijang-gun/','부산광역시 기장군','taksong'],
 ['/taksong/gangwon/wonju-si/','강원특별자치도 원주시','taksong'],
 ['/taksong/gyeongnam/jinju-si/','경상남도 진주시','taksong'],
 ['/taksong/jeonnam/naju-si/','전라남도 나주시','taksong'],
 ['/taksong/gyeongbuk/gimcheon-si/','경상북도 김천시','taksong']
];
const pause=ms=>new Promise(done=>setTimeout(done,ms));
async function get(route){
 const r=await fetch(origin+route,{signal:AbortSignal.timeout(16000)});
 assert.equal(r.status,200,route+' HTTP 200');
 return await r.text();
}
test('curated links only reference actual public articles, not invented rides',()=>{
 assert(originals.length>=7);
 for(const x of originals){
  const p=byId.get(x.post_id);
  assert(p,'missing original post '+x.post_id);
  assert.match(p.url,/^https:\/\/blog\.naver\.com\/wjdtnr4757\/\d+$/);
  assert(x.note&&x.scope,'every source must be scope-qualified');
 }
});
test('Sejong, Gijang, four innovation cities have distinct real sources without repeated keyword stuffing',async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:root,
  env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},
  stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<105;i++){
   if(child.exitCode!==null)throw Error('server failed to start');
   try{if((await fetch(origin+'/health',{signal:AbortSignal.timeout(1200)})).ok){ready=true;break}}catch{}
   await pause(300);
  }
  assert(ready,'server ready');
  for(const [route,region,kind] of priority){
   const html=await get(route);
   const section=html.match(/<section id="priority-original-sources">([\s\S]*?)<\/section>/);
   assert(section,route+' curated originals section missing');
   const expected=originals.filter(x=>x.region===region&&x.kind===kind);
   assert(expected.length>=1,'no expected source');
   for(const x of expected){
    const p=byId.get(x.post_id);
    assert(section[1].includes('href="'+p.url+'"'),route+' missing original '+x.post_id);
    assert(section[1].includes(x.note),'scope disclosure must remain explicit');
   }
   assert(!html.includes('id="regional-provider-keywords"'),route+' no repetitive provider keyword block');
   assert(html.includes('href="https://jeongukdaeri.kr'+route+'"'),route+' canonical preserved');
   assert(!/<meta name="robots" content="noindex/.test(html),route+' indexable');
   assert(html.includes('1811-4294'),route+' phone preserved');
  }
  const hub=await get('/region/innovation-cities/');
  assert(hub.includes('출발 장소별 확인'),'innovation hub must show specific pickup reference points');
  for(const region of ['강원특별자치도 원주시','경상남도 진주시','전라남도 나주시','경상북도 김천시']){
   const source=originals.find(x=>x.region===region&&x.kind==='taksong');
   assert(source);
   assert(hub.includes('href="'+byId.get(source.post_id).url+'"'),region+' source missing from innovation hub');
   assert(hub.includes(source.note),region+' scope caveat missing from innovation hub');
  }
  assert(!hub.includes('이 혁신도시에서 운행을 완료했습니다.'),'no invented district completion');
  console.log('PASS seven priority service pages, original published links, concise SEO and innovation city hub');
 }finally{child.kill()}
});
