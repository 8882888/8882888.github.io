'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..'),PORT=39221,BASE='http://127.0.0.1:'+PORT;
const services=['daeri','taksong'];
const targets=[
 {slug:'busan',full:'부산광역시',name:'부산',local:'부산광역시 부산진구'},
 {slug:'ulsan',full:'울산광역시',name:'울산',local:'울산광역시 남구'},
 {slug:'gyeongnam/changwon-si',full:'경상남도 창원시',name:'창원',local:'경상남도 창원시 성산구'},
 {slug:'gyeongnam/yangsan-si',full:'경상남도 양산시',name:'양산',local:'경상남도 양산시 물금읍'},
 {slug:'busan/gijang-gun',full:'부산광역시 기장군',name:'기장군',local:'부산광역시 기장군 정관읍'}
];
const attr=(html,part)=>html.match(part)?.[1]||'';
test('five exact legal regions have service-distinct original metadata, internal paths and proof-safe headlines',{timeout:180000},async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:ROOT,env:{...process.env,PORT:String(PORT),PUBLIC_HOST:'jeongukdaeri.kr'},stdio:'ignore'});
 try{
  let ready=false;
  for(let n=0;n<100;n++){
   if(child.exitCode!==null)throw Error('Server failed before regional SEO test');
   try{if((await fetch(BASE+'/health',{signal:AbortSignal.timeout(900)})).ok){ready=true;break}}catch{}
   await new Promise(r=>setTimeout(r,350));
  }
  assert(ready,'Server /health ready');
  const titles=new Set(),descriptions=new Set();
  for(const area of targets){
   for(const kind of services){
    const route='/'+kind+'/'+area.slug+'/';
    const resp=await fetch(BASE+route,{headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)'},signal:AbortSignal.timeout(25000)});
    assert.equal(resp.status,200,route+' HTTP 200');
    const html=await resp.text(),head=html.split('</head>')[0];
    const title=attr(head,/<title>([^<]+)<\/title>/i);
    const desc=attr(head,/<meta\s+name="description"\s+content="([^"]+)"/i);
    const og=attr(head,/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    assert(title.startsWith(area.name+(kind==='daeri'?'대리운전':'탁송')),route+' exact region + service title');
    assert(!titles.has(title),route+' must have distinct title');titles.add(title);
    assert(desc.includes(area.name)&&desc.includes('1811-4294')&&[...desc].length<=80,route+' unique Naver snippet <=80 chars');
    assert(!descriptions.has(desc),route+' must have unique description');descriptions.add(desc);
    assert.equal(desc,og,route+' description / OG parity');
    assert(head.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+route+'">'),route+' self canonical');
    assert(!/\bnoindex\b/i.test(head),route+' must not become noindex');
    assert.equal((html.match(/<h1\b/g)||[]).length,1,route+' exactly one H1');
    assert.equal((html.match(/id="southeast-five-intent-seo-20261123"/g)||[]).length,1,route+' one regional editorial');
    assert(html.includes('service='+kind),route+' correct service estimate');
    assert(html.includes('tel:18114294'),route+' actual website consultation number');
    assert(html.includes('id="regional-direct-answer"'),route+' customer-first regional answer');
    assert(html.includes('시군구')||html.includes('세부 지역'),route+' visible locality chooser');
    assert(html.includes('부산·울산·창원·양산·기장'),route+' neighboring canonical region discovery');
    if(kind==='daeri'){
     assert(title.includes('예약'),route+' driver search intent is booking');
     assert(!title.includes('후기'),route+' drivers are not forced into review-first titles');
     assert(html.includes(area.name+'대리운전: 출발 위치·심야·장거리 예약'),route+' unique driver booking explanation');
    }else{
     assert(!/배차현황|빠른배차/.test(title),route+' cannot imply real-time status in title');
     assert(html.includes(area.name+'탁송: 실제 차량 인수·인계 준비'),route+' source-backed local handover');
     if(/실제 운행(?:기록|후기)/.test(title)){
      assert(html.includes('실제 완료 운행기록이 연결된 지역입니다'),route+' only evidence-backed titles mention completed rides');
     }
    }
    console.log('PASS five-city SEO',route,title,[...desc].length);
   }
  }
  assert.equal(titles.size,10);
  assert.equal(descriptions.size,10);
 }finally{child.kill('SIGTERM');}
});
