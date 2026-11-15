'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');

test('Gijang blog list includes Gijang-only sources and excludes stadium false substring matches',async()=>{
 const port=39631;
 const server=spawn(process.execPath,['server.js'],{
  cwd:path.join(__dirname,'..'),
  env:{...process.env,PORT:String(port),PUBLIC_HOST:'jeongukdaeri.kr'},
  stdio:'ignore'
 });
 try{
  let html='',ready=false;
  for(let i=0;i<80;i++){
   if(server.exitCode!==null)throw Error('server stopped before ready: '+server.exitCode);
   try{
    const r=await fetch('http://127.0.0.1:'+port+'/taksong/busan/gijang-gun/',{signal:AbortSignal.timeout(1200)});
    if(r.status===200){html=await r.text();ready=true;break}
   }catch{}
   await new Promise(resolve=>setTimeout(resolve,300));
  }
  assert(ready,'Gijang page must return HTTP 200');
  const section=html.match(/<section id="regional-blog-links">([\s\S]*?)<\/section>/);
  assert(section,'regional Naver blog section must exist');
  assert.match(section[1],/부산기장군탁송|부산동부권탁송|경동오토필드|기장군탁송/,'real local source still linked');
  assert.doesNotMatch(section[1],/완주군\s*봉동|도원동\s*축구전용경기장|경기장까지/,'unrelated stadium title must not be attributed to Gijang');
  assert.match(html,/현재 이 지역의 확인된 완료 운행기록을 이 페이지에 연결하지 않았습니다|현재 공개 가능한/,'unknown completion records still appropriately qualified');
  assert.match(html,/1811-4294/,'homepage contact must be preserved');
 }finally{
  server.kill();
 }
});
