'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {getFocus,matchesFocus}=require('../lib/innovation-search-focus');
const cases=[
 ['세종대리운전','/daeri/sejong/'],['세종탁송','/taksong/sejong/'],
 ['원주혁신도시대리운전','/daeri/gangwon/wonju-si/'],
 ['진주혁신도시탁송','/taksong/gyeongnam/jinju-si/'],
 ['나주혁신도시대리운전','/daeri/jeonnam/naju-si/'],
 ['김천혁신도시탁송','/taksong/gyeongbuk/gimcheon-si/']
];
const wonju=getFocus('강원특별자치도 원주시','daeri');
assert(matchesFocus({rawDeparture:'원주시 반곡동',rawDestination:'서울'},wonju));
assert(!matchesFocus({rawDeparture:'원주시 무실동',rawDestination:'서울'},wonju),'city-wide record is not innovation-city evidence');
assert(!matchesFocus({rawDeparture:'원주시 무실동',rawDestination:'나주 혁신도시'},wonju),'cannot combine endpoint locations');
assert(!matchesFocus({rawDeparture:'공원주차장 혁신도시'},wonju),'substring is not city evidence');
assert(!matchesFocus({rawDeparture:'반곡동'},wonju),'unqualified locality is insufficient');
const jinju=getFocus('경상남도 진주시','taksong');
assert(matchesFocus({rawDestination:'진주 충무공동'},jinju));
assert(!matchesFocus({rawDestination:'진주 상대동'},jinju));
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:'3136'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
(async()=>{
 try{
  for(let n=0;n<100&&!output.includes('listening');n++)await new Promise(r=>setTimeout(r,100));
  assert(output.includes('listening'),output);
  const home=await (await fetch('http://127.0.0.1:3136/')).text();
  const sitemap=await (await fetch('http://127.0.0.1:3136/sitemap.xml')).text();
  for(const [keyword,path] of cases){
   assert(sitemap.includes('https://jeongukdaeri.kr'+path+'</loc>'),keyword+' sitemap discovery');
   assert(home.includes('href="'+path+'">'+keyword+'</a>'),keyword+' home link');
   const response=await fetch('http://127.0.0.1:3136'+path);
   assert.equal(response.status,200,path);
   const html=await response.text();
   assert(html.includes('<title>'+keyword+'｜'),keyword+' title');
   assert(html.includes('href="https://jeongukdaeri.kr'+path+'"'),path+' canonical');
   const panel=html.split('id="innovation-city-guide"')[1].split('</section>')[0];
   assert(panel.includes(keyword+' 요금·예약 안내'));
   assert(panel.includes('tel:18114294'));
   assert(!panel.includes('&amp;q='),'history links must use the actual region filter');
   assert(panel.includes('완료 운행정보는 확인되지 않아')||panel.includes('출발 또는 도착 장소가 확인된 기존 운행정보'));
   console.log('PASS',keyword,path);
  }
 }finally{child.kill()}
})().catch(error=>{console.error(error);process.exitCode=1});
