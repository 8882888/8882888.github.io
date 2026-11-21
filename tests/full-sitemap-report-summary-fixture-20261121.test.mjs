import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const ORIGIN='https://jeongukdaeri.kr';
const SCRIPT=resolve('scripts/audit-all-meta-jsonld.mjs');
const routes=['/daeri/','/taksong/'];
const sitemapPaths=new Set([
 '/sitemap-all.xml','/sitemap-history.xml','/sitemap.xml','/sitemap-priority.xml',
 '/sitemap-reviewed-routes.xml','/sitemap-published.xml',
 '/sitemap-taksong.xml','/sitemap-daeri.xml'
]);
const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 routes.map(route=>'<url><loc>'+ORIGIN+route+'</loc></url>').join('')+'</urlset>';
const descriptionDaeri='대리운전 예약 전 주차장 출차 위치 및 기사 만남 장소 안내';
const descriptionTaksong='자동차탁송 차량 인수 권한과 도착지 수령 시간 확인 안내';
const page=(route,sameDescriptions)=>{
 const isDaeri=route==='/daeri/';
 const title=isDaeri?'전국대리운전 이용 안내 | 스마트24':'전국 자동차탁송 이용 안내 | 스마트24';
 const description=isDaeri||sameDescriptions?descriptionDaeri:descriptionTaksong;
 const canonical=ORIGIN+route;
 return '<!doctype html><html lang="ko"><head><meta charset="utf-8">'+
  '<title>'+title+'</title><meta name="description" content="'+description+'">'+
  '<meta name="robots" content="index,follow"><meta property="og:description" content="'+description+'">'+
  '<link rel="canonical" href="'+canonical+'"></head><body><h1>'+title+'</h1>'+
  '<p>차량 운행 가능 여부와 출차 주차장, 실제 운전자 인수 위치, 목적지 수령 시각을 상담으로 구분합니다.</p>'+
  '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'WebPage',url:canonical,name:title})+
  '</script></body></html>';
};
async function startFixture(sameDescriptions){
 const server=createServer((req,res)=>{
  if(req.url==='/robots.txt'){
    res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});
    res.end('User-agent: *\nAllow: /\nSitemap: '+ORIGIN+'/sitemap-all.xml\n');
  }else if(sitemapPaths.has(req.url)){
    res.writeHead(200,{'content-type':'application/xml; charset=utf-8'});res.end(xml);
  }else if(routes.includes(req.url)){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(page(req.url,sameDescriptions));
  }else{
    res.writeHead(404,{'content-type':'text/plain'});res.end('No fixture for '+req.url);
  }
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 return {server,port:server.address().port};
}
async function runAudit(port,dir){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[SCRIPT,ORIGIN],{
   cwd:dir,
   env:{...process.env,AUDIT_TRANSPORT_ORIGIN:'http://127.0.0.1:'+port,
    AUDIT_MAX_URLS:'0',AUDIT_WORKERS:'2',AUDIT_LIVE_DELAY_MS:'0'},
   timeout:15000
  });
  let stdout='',stderr='';
  child.stdout.on('data',chunk=>stdout+=chunk);
  child.stderr.on('data',chunk=>stderr+=chunk);
  child.on('error',reject);
  child.on('close',(code,signal)=>resolve({code,signal,stdout,stderr}));
 });
}
async function checkFixture(sameDescriptions){
 const {server,port}=await startFixture(sameDescriptions);
 const dir=mkdtempSync(join(tmpdir(),'smart24-sitemap-audit-fixture-'));
 try{
  const result=await runAudit(port,dir);
  assert.equal(result.signal,null,'Fixture audit timed out: '+result.stderr);
  const file=join(dir,'full-meta-jsonld-audit.json');
  assert.ok(existsSync(file),'Audit must write final JSON summary: '+result.stderr);
  const data=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(data.complete,true,'Must finish duplicate summary after scanning');
  assert.equal(data.duplicateAnalysisComplete,true);
  assert.equal(data.counts.discovered,2);
  assert.equal(data.counts.checked,2);
  assert.equal(data.counts.sitemapErrors.length,0);
  assert.equal(data.counts.jsonldInvalid,0);
  assert.equal(data.counts.descriptionMissing,0);
  assert.equal(data.counts.descriptionOver80,0);
  assert.equal(data.counts.naverIndexed,null);
  assert.ok(existsSync(join(dir,'full-meta-jsonld-audit.csv')));
  assert.ok(existsSync(join(dir,'full-meta-jsonld-summary.md')));
  return {result,data};
 }finally{
  await new Promise(resolve=>server.close(resolve));
  rmSync(dir,{recursive:true,force:true});
 }
}
test('a complete production-sitemap report emits JSON and metadata CSV without undefined summary variables',async()=>{
 const {result,data}=await checkFixture(false);
 assert.equal(result.code,0,'Unexpected audit failure: '+result.stderr);
 assert.equal(data.counts.descriptionDuplicates,0);
 assert.equal(data.counts.descriptionDuplicateGroups,0);
 assert.equal(data.counts.descriptionDuplicateExtraUrls,0);
 assert.equal(data.results.length,2);
});
test('duplicate descriptions are accurately counted, reported and flagged (not silently approved)',async()=>{
 const {result,data}=await checkFixture(true);
 assert.equal(result.code,1,'Duplicate meta descriptions must require editorial review');
 assert.equal(data.counts.descriptionDuplicates,2);
 assert.equal(data.counts.descriptionDuplicateGroups,1);
 assert.equal(data.counts.descriptionDuplicateExtraUrls,1);
 assert.equal(data.duplicateDescriptions.length,1);
 assert.equal(data.duplicateDescriptions[0].count,2);
 assert.ok(data.results.every(r=>r.metadataWarnings.includes('duplicate_meta_description_across_urls')));
});
