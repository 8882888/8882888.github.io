'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {TARGETS,PROVINCE_DAERI_TARGETS,PROVINCE_TAKSONG_TARGETS,YETI,noindex,inspectHtml,checkOne,run}=require('../scripts/check-yeti-priority-indexability.cjs');
const url='https://jeongukdaeri.kr/taksong/busan/gijang-gun/';
const body=(canonical=url,robots='index,follow')=>'<html><head><title>기장군탁송 | 24시상담</title><meta name="description" content="기장군 차량 인계·요금 안내"><link href="'+canonical+'" rel="canonical"><meta content="'+robots+'" name="robots"></head><body><h1>기장군탁송</h1></body></html>';
test('priority audit covers indexable nationwide and regional URLs',()=>{
 assert.ok(TARGETS.length>=10);
 assert.equal(PROVINCE_DAERI_TARGETS.length,17,'must audit all 17 provincial daeri landing pages');
 assert.equal(PROVINCE_TAKSONG_TARGETS.length,17,'must audit all 17 provincial taksong landing pages');
 assert.ok(PROVINCE_TAKSONG_TARGETS.every(route=>TARGETS.includes(route)),'provincial taksong coverage must not be silently dropped');
 assert.ok(PROVINCE_DAERI_TARGETS.every(route=>TARGETS.includes(route)),'province coverage cannot be silently dropped');
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
 assert.ok(!html.issues.includes('header_noindex'), 'Googlebot-only noindex is not a Yeti exclusion');
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

test('SEO report flags duplicate provincial daeri titles across otherwise valid HTTP pages',async()=>{
 const fake=async(url)=>({
  status:200,
  headers:new Headers({'content-type':'text/html; charset=utf-8'}),
  text:async()=>'<html><head><title>공통 지역 대리운전</title><meta name="description" content="지역별 대리운전 예약 안내"><link rel="canonical" href="'+url+'"></head><body><h1>대리운전</h1></body></html>'
 });
 const report=await run(fake);
 assert.equal(report.provincialDaeriCount,17);
 assert.equal(report.provincialDaeriFailed,17);
 assert.ok(report.results.filter(x=>PROVINCE_DAERI_TARGETS.includes(x.route)).every(x=>x.issues.includes('duplicate_provincial_title')));
});
test('GEO/AEO province and national direct answers must exist in server-rendered HTML',()=>{
 const plain=inspectHtml(body(),url,new Headers(),{provinceHub:true});
 assert.ok(plain.issues.includes('missing_regional_answer_first'));
 assert.ok(plain.issues.includes('missing_regional_answer_question'));
 assert.ok(plain.issues.includes('missing_regional_fare_lookup'));
 assert.ok(plain.issues.includes('missing_regional_history_lookup'));
 const enriched=body().replace('<h1>기장군탁송</h1>',
  '<section id="regional-direct-answer"><h2 id="regional-direct-question">탁송 예약은?</h2>'+
  '<p><a href="/fare/?service=taksong">요금조회</a> <a href="/reviews/history/?region=busan">운행기록</a></p></section><h1>기장군탁송</h1>');
 assert.deepEqual(inspectHtml(enriched,url,new Headers(),{provinceHub:true}).issues,[]);
 assert.ok(inspectHtml(body(),url,new Headers(),{nationalService:'taksong'}).issues.includes('missing_national_answer_first'));
});
test('missing description is reported separately from canonical and indexability',()=>{
 const html=body().replace(/<meta name="description"[^>]+>/,'');
 const report=inspectHtml(html,url,new Headers());
 assert.deepEqual(report.issues,['missing_description']);
});

test('X-Robots-Tag Yeti / generic exclusions block Naver but Googlebot-only does not',()=>{
 assert.ok(!inspectHtml(body(),url,new Headers({'x-robots-tag':'googlebot: noindex'})).issues.includes('header_noindex'));
 assert.ok(inspectHtml(body(),url,new Headers({'x-robots-tag':'Yeti: noindex, Googlebot: index'})).issues.includes('header_noindex'));
 assert.ok(inspectHtml(body(),url,new Headers({'x-robots-tag':'noindex, follow'})).issues.includes('header_noindex'));
 assert.ok(!inspectHtml(body(),url,new Headers({'x-robots-tag':'googlebot: noindex, Yeti: index'})).issues.includes('header_noindex'));
});
