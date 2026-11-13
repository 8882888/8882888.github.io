'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {TARGETS,YETI,noindex,inspectHtml,checkOne}=require('../scripts/check-yeti-priority-indexability.cjs');
const url='https://jeongukdaeri.kr/taksong/busan/gijang-gun/';
const body=(canonical=url,robots='index,follow')=>'<html><head><title>기장군탁송 | 24시상담</title><link href="'+canonical+'" rel="canonical"><meta content="'+robots+'" name="robots"></head><body><h1>기장군탁송</h1></body></html>';
test('priority audit covers indexable nationwide and regional URLs',()=>{
 assert.ok(TARGETS.length>=10);
 assert.ok(TARGETS.includes('/taksong/busan/gijang-gun/'));
 assert.ok(TARGETS.includes('/daeri/sejong/'));
 assert.ok(TARGETS.includes('/설악산탁송/'));
 assert.ok(!TARGETS.includes('/special/seoraksan-transport/'), 'consolidated aliases are not standalone index targets');
 assert.equal(new Set(TARGETS).size,TARGETS.length);
});
test('proper Yeti agent, canonical and rendered title/H1 pass',async()=>{
 let seen;
 const fake=async(u,options)=>{
  seen={u,options};
  return {status:200,headers:new Headers({'content-type':'text/html; charset=utf-8'}),text:async()=>body()};
 };
 const result=await checkOne('/taksong/busan/gijang-gun/',fake);
 assert.equal(seen.options.headers['user-agent'],YETI);
 assert.equal(seen.options.redirect,'manual');
 assert.deepEqual(result.issues,[]);
 assert.equal(result.canonical,url);
});
test('HTML noindex, header noindex and mismatched canonical fail independently',()=>{
 assert.equal(noindex('index, follow'),false);
 assert.equal(noindex('max-image-preview:large, NOINDEX,follow'),true);
 const html=inspectHtml(body('https://jeongukdaeri.kr/taksong/busan/','noindex,follow'),url,
  new Headers({'x-robots-tag':'googlebot: noindex, nofollow'}));
 assert.ok(html.issues.includes('canonical_mismatch'));
 assert.ok(html.issues.includes('html_noindex'));
 assert.ok(html.issues.includes('header_noindex'));
});
test('robot-specific blocked status does not masquerade as a successful crawl',async()=>{
 const result=await checkOne('/taksong/busan/gijang-gun/',async()=>({
  status:403,headers:new Headers({'content-type':'text/html'}),text:async()=>body()
 }));
 assert.ok(result.issues.includes('http_403'));
});
test('generic archive or malformed head cannot pass crawl check',()=>{
 const res=inspectHtml('<html><body>hello</body></html>',url,new Headers());
 assert.ok(res.issues.includes('missing_title'));
 assert.ok(res.issues.includes('missing_server_rendered_h1'));
 assert.ok(res.issues.includes('missing_or_multiple_canonical'));
});
