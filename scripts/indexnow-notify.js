#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const key='770f921af32e749f64c1d447c607ea42';
const root=path.resolve(__dirname,'..');
const dryRun=process.argv.includes('--dry-run');
const base=new URL(dryRun?(process.argv[process.argv.indexOf('--dry-run')+1]||'http://localhost:3000/'):'https://jeongukdaeri.kr/');
const fileKey=fs.readFileSync(path.join(root,key+'.txt'),'utf8').trim();
if(fileKey!==key)throw Error('Invalid local IndexNow key file');
const expectedCount=10+require('../data/priority-regions.json').pages.length;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(rel){return fetch(new URL(rel,base),{headers:{'user-agent':'Smart24-IndexNow-Notifier/1.0','cache-control':'no-cache'},signal:AbortSignal.timeout(10000),redirect:'manual'});}
async function verify(){
 const verification=await get('/'+key+'.txt');
 if(verification.status!==200)throw Error('Key HTTP '+verification.status);
 if((await verification.text()).trim()!==key)throw Error('Key content mismatch');
 const xmlResponse=await get('/sitemap-priority.xml');
 if(xmlResponse.status!==200)throw Error('Priority sitemap HTTP '+xmlResponse.status);
 const xml=await xmlResponse.text();
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
 if(urls.length!==expectedCount||new Set(urls).size!==urls.length)throw Error('Unexpected priority sitemap URL count '+urls.length+'/'+expectedCount);
 for(const url of urls){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.hostname!=='jeongukdaeri.kr'||parsed.search||parsed.hash)throw Error('Invalid canonical URL in sitemap: '+url);
 }
 for(const url of ['https://jeongukdaeri.kr/','https://jeongukdaeri.kr/daeri/','https://jeongukdaeri.kr/taksong/','https://jeongukdaeri.kr/route-taksong/','https://jeongukdaeri.kr/special/seoraksan-transport/','https://jeongukdaeri.kr/special/jirisan-transport/','https://jeongukdaeri.kr/travel/food-map/','https://jeongukdaeri.kr/taksong/jeju/','https://jeongukdaeri.kr/recruit/daeri/','https://jeongukdaeri.kr/recruit/taksong/','https://jeongukdaeri.kr/daeri/busan/','https://jeongukdaeri.kr/taksong/busan/']){
  if(!urls.includes(url))throw Error('Missing priority path: '+url);
 }
 const busan=await get('/taksong/busan/');
 if(busan.status!==200)throw Error('Busan taksong HTTP '+busan.status);
 const body=await busan.text();
 if(!body.includes('id="priority-region-guide"')||!body.includes('항만·서비스센터 및 부산 시내 차량 인수 준비'))throw Error('Latest Busan update not deployed');
 console.log('Verified live key and '+urls.length+' canonical priority URLs on '+base.origin);
 return urls;
}
(async()=>{
 let urls;
 for(let i=0;i<(dryRun?1:16);i++){
  try{urls=await verify();break}catch(e){
   if(dryRun||i===15)throw e;
   console.log('Production deployment not ready ('+(i+1)+'/16): '+e.message);
   await pause(10000);
  }
 }
 if(dryRun){console.log('Dry run completed: no IndexNow submission performed');return;}
 const response=await fetch('https://searchadvisor.naver.com/indexnow',{
  method:'POST',headers:{'content-type':'application/json; charset=utf-8','user-agent':'Smart24-IndexNow-Notifier/1.0'},
  body:JSON.stringify({host:'jeongukdaeri.kr',key,keyLocation:'https://jeongukdaeri.kr/'+key+'.txt',urlList:urls}),
  signal:AbortSignal.timeout(20000)
 });
 const message=(await response.text()).slice(0,500);
 console.log('Naver IndexNow response HTTP '+response.status+'; URL count '+urls.length+(message?' ; response: '+message:''));
 if(response.status!==200&&response.status!==202)throw Error('Naver did not accept IndexNow notification');
 console.log('Notification received by Naver; this does not guarantee crawl, indexing, or ranking.');
})().catch(e=>{console.error(e);process.exitCode=1});
