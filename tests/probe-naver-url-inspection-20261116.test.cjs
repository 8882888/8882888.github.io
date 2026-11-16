'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {assess,routes,checks}=require('../scripts/probe-naver-url-inspection-20261116.cjs');
test('bounded low-concurrency probe includes homepage, robots and key regional URLs',()=>{
 assert(routes.includes('/')&&routes.includes('/robots.txt')&&routes.includes('/taksong/sejong/'));
 assert.equal(checks.filter(x=>x.agent==='compactYeti'&&x.route==='/').length,2);
});
test('intermittent timeouts, non-200 and missing canonical are real access risks',()=>{
 const sample={status:200,route:'/',elapsedMs:234,contentType:'text/html; charset=utf-8',xRobotsTag:'',body:'<head><link rel="canonical" href="https://jeongukdaeri.kr/"></head>'};
 assert.deepEqual(assess(sample),[]);
 assert(assess({...sample,status:503}).includes('http_503'));
 assert(assess({...sample,elapsedMs:10000}).includes('slow_over_10_seconds'));
 assert(assess({...sample,error:'TimeoutError: timeout'}).includes('connection_or_timeout'));
 assert(assess({...sample,body:'<head></head>'}).includes('canonical_mismatch_or_duplicate'));
 assert(assess({...sample,xRobotsTag:'noindex'}).includes('http_noindex'));
});
test('robots and sitemap probe checks remain crawler-specific',()=>{
 const robots={status:200,route:'/robots.txt',elapsedMs:20,contentType:'text/plain',body:'User-agent: *\nAllow: /\n',xRobotsTag:''};
 assert.deepEqual(assess(robots),[]);
 assert(assess({...robots,body:'User-agent: *\nDisallow: /\n'}).includes('robots_disallow_root'));
 assert(assess({...robots,status:500}).includes('http_500'));
});
