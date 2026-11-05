'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {getFocus,matchesFocus,entries,findFocus}=require('../lib/innovation-search-focus');
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
assert.equal(entries.length,24);
assert.equal(new Set(entries.map(x=>x.keyword)).size,24);
assert.equal(findFocus('충북혁신도시대리운전'),null,'shared two-county name must not choose an arbitrary county');
assert.equal(findFocus('전북혁신도시탁송'),null,'shared city/county name stays ambiguous');
const w=getFocus('전북특별자치도 완주군','taksong');
assert(!matchesFocus({rawDeparture:'완주군 이서면'},w),'town-wide trip is not innovation-area evidence');
assert(matchesFocus({rawDeparture:'완주군 이서면 전북혁신도시'},w));
const cityPaths={
 '세종특별자치시':'sejong','강원특별자치도 원주시':'gangwon/wonju-si',
 '경상남도 진주시':'gyeongnam/jinju-si','전라남도 나주시':'jeonnam/naju-si',
 '경상북도 김천시':'gyeongbuk/gimcheon-si','전북특별자치도 전주시':'jeonbuk/jeonju-si',
 '전북특별자치도 완주군':'jeonbuk/wanju-gun','충청북도 진천군':'chungbuk/jincheon-gun',
 '충청북도 음성군':'chungbuk/eumseong-gun','대구광역시 동구':'daegu/dong-gu',
 '울산광역시 중구':'ulsan/jung-gu','부산광역시 영도구':'busan/yeongdo-gu'
};
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:'3136'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
(async()=>{
 try{
  for(let n=0;n<100&&!output.includes('listening');n++)await new Promise(r=>setTimeout(r,100));
  assert(output.includes('listening'),output);
  const home=await (await fetch('http://127.0.0.1:3136/')).text();
  const sitemap=await (await fetch('http://127.0.0.1:3136/sitemap.xml')).text();
  const hubResponse=await fetch('http://127.0.0.1:3136/region/innovation-cities/');
  assert.equal(hubResponse.status,200);
  const hub=await hubResponse.text();
  assert(home.includes('href="/region/innovation-cities/"'));
  assert(sitemap.includes('/region/innovation-cities/</loc>'));
  assert.equal((hub.match(/<h1[ >]/g)||[]).length,1);
  assert(hub.includes('전주·완주')&&hub.includes('진천·음성'));
  for(const keyword of ['전북혁신도시탁송','충북혁신도시대리운전']){
   const response=await fetch('http://127.0.0.1:3136/region/?q='+encodeURIComponent(keyword),{redirect:'manual'});
   assert.equal(response.status,302);
   assert.equal(response.headers.get('location'),'/region/innovation-cities/');
  }
  for(const entry of entries){
   const path='/'+entry.kind+'/'+cityPaths[entry.region]+'/';
   assert(hub.includes('href="'+path+'">'+entry.keyword+'</a>'));
   assert(sitemap.includes('https://jeongukdaeri.kr'+path+'</loc>'));
   for(const root of ['/','/region/']){
    const redir=await fetch('http://127.0.0.1:3136'+root+'?q='+encodeURIComponent(entry.keyword),{redirect:'manual'});
    assert.equal(redir.status,302,entry.keyword+' search redirect');
    assert.equal(redir.headers.get('location'),path);
   }
   const page=await (await fetch('http://127.0.0.1:3136'+path)).text();
   assert(page.includes('<title>'+entry.keyword+'｜'));
   assert(page.includes('href="https://jeongukdaeri.kr'+path+'"'));
  }
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
