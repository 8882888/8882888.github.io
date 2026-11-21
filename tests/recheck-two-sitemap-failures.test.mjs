import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const tests=['/routes/daeri/area-12945/area-12117/','/daeri/jeonnam/hwasun-gun/'];
test('retry only temporary network failures; fail genuine 404 while preserving URL identities',{timeout:25000},async()=>{
 let count=0,notFound=false;
 const server=http.createServer((req,res)=>{
  if(req.url===tests[0]&&notFound){res.statusCode=404;return res.end('not found');}
  if(req.url===tests[0]&&count++===0){res.statusCode=503;return res.end('service temporarily unavailable');}
  res.setHeader('content-type','text/html; charset=utf-8');
  res.end('<!doctype html><html><head><title>검사 지역</title><link rel="canonical" href="https://jeongukdaeri.kr'+req.url+'"></head><body><h1>검색 확인</h1></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const dir=await mkdtemp(path.join(os.tmpdir(),'two-url-check-'));
 const base='http://127.0.0.1:'+server.address().port;
 async function run(){
  const cwd=path.resolve(import.meta.dirname,'..');
  const cp=spawn(process.execPath,['scripts/recheck-two-sitemap-failures-20261121.mjs'],{
   cwd,env:{...process.env,SEO_RECHECK_BASE:base,SEO_RECHECK_REPORT_DIR:dir}});
  const result=await new Promise((resolve,reject)=>{cp.on('error',reject);cp.on('close',resolve);});
  const report=JSON.parse(await readFile(path.join(dir,'sitemap-two-failed-urls-recheck.json'),'utf8'));
  return {result,report};
 }
 try{
  let out=await run();
  assert.equal(out.result,0);
  assert.equal(out.report.results.length,2);
  assert(out.report.results.every(r=>r.technicalCandidate));
  assert.equal(out.report.results[0].attempts,2);
  notFound=true;
  out=await run();
  assert.equal(out.result,1);
  assert.deepEqual(out.report.results[0].issues,['http_404']);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
