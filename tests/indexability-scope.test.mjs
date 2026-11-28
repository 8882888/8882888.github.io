import {test} from 'node:test';
import assert from 'node:assert/strict';
import {focusLinkObservation,focusLinkCoverage,isRegionalServiceUrl,isRegionalIntentGuideUrl,hasDirectRideRecordLink,regionalGuideCoverage,reviewLinkCoverage,blockedMetaIndexAgents,blockedXRobotsIndexAgents,naverRobotsDisallowAll} from '../scripts/indexability-scope.mjs';
test('actual nationwide region/service canonical pages count as locality landings',()=>{
 for(const route of ['/taksong/busan/','/daeri/sejong/','/taksong/busan/gijang-gun/',
 '/daeri/gangwon/wonju-si/','/taksong/sejong/jikhal/naseong-dong/'])
  assert.equal(isRegionalServiceUrl('https://jeongukdaeri.kr'+route),true,route);
});
test('recruitment, vehicle, travel, activities and route pages are NOT missing local ride evidence',()=>{
 for(const route of ['/recruit/daeri/area-494/','/recruit/taksong/area-494/',
  '/taksong/type/eba089ecb9b4ed8381ec86a1/','/taksong/types/',
  '/taksong/route/busan-gijang-gyeongsan/','/daeri/travel/samgilpo/',
  '/daeri/activities/food/','/taksong/activities/cycling/','/region/innovation-cities/',
  '/keyword-search/?q=부산탁송','/taksong/'])
  assert.equal(isRegionalServiceUrl('https://jeongukdaeri.kr'+route),false,route);
});
test('count only region landing evidence links, not unrelated service information pages',()=>{
 const reports=[
 {url:'https://jeongukdaeri.kr/taksong/busan/',status:200,hasRideLink:true},
 {url:'https://jeongukdaeri.kr/daeri/sejong/',status:200,hasRideLink:false},
 {url:'https://jeongukdaeri.kr/recruit/taksong/area-494/',status:200,hasRideLink:false},
 {url:'https://jeongukdaeri.kr/taksong/type/special/',status:200,hasRideLink:false},
 {url:'https://jeongukdaeri.kr/daeri/gangwon/wonju-si/',status:404,hasRideLink:false}
 ];
 assert.deepEqual(reviewLinkCoverage(reports),{regionalServicePages:2,regionalPagesWithoutReviewLink:1});
});

test('intent guides and regional canonical landings have different scope',()=>{
 for(const path of ['/taksong/busan/gijang-gun/fare/','/daeri/sejong/long-distance/',
                    '/taksong/gyeonggi/icheon-si/yulhyeon-dong/handover/']){
  const url='https://jeongukdaeri.kr'+path;
  assert.equal(isRegionalServiceUrl(url),false,path);
  assert.equal(isRegionalIntentGuideUrl(url),true,path);
 }
 assert.equal(isRegionalIntentGuideUrl('https://jeongukdaeri.kr/daeri/busan/handover/'),false);
 assert.equal(isRegionalServiceUrl('https://jeongukdaeri.kr/taksong/busan/gijang-gun/'),true);
});
test('ride evidence means a specific history document, not a search archive',()=>{
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/history/excel-1955/">기록</a>'),true);
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/history/?kind=taksong">검색</a>'),false);
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/history/">목록</a>'),false);
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/local/taksong/busan/">안내</a>'),false);
 const reports=[
  {url:'https://jeongukdaeri.kr/taksong/busan/fare/',status:200,hasRideLink:false},
  {url:'https://jeongukdaeri.kr/taksong/busan/handover/',status:200,hasRideLink:true},
  {url:'https://jeongukdaeri.kr/taksong/busan/',status:200,hasRideLink:false}
 ];
 assert.deepEqual(regionalGuideCoverage(reports),{regionalIntentGuidePages:2,regionalGuidesWithoutDirectRideLink:1});
 assert.deepEqual(reviewLinkCoverage(reports),{regionalServicePages:1,regionalPagesWithoutReviewLink:1});
});


test('verified public ride documents and anchored completed-call items count as direct evidence',()=>{
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/0123456789abcdef/">공개 운행기록</a>'),true);
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/verified/0123456789abcdef/">검증 운행기록</a>'),true);
 assert.equal(hasDirectRideRecordLink('<a href="https://jeongukdaeri.kr/reviews/0123456789abcdef/">공개 운행기록</a>'),true);
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/completed-calls-20261114/#record-12">개별 종료 기록</a>'),true);
 assert.equal(hasDirectRideRecordLink('<a href="/reviews/completed-calls-20261114/">전체 모음</a>'),false);
 assert.equal(hasDirectRideRecordLink('<a href="https://example.com/reviews/0123456789abcdef/">외부 링크</a>'),false);
});

test('Yeti/Googlebot-specific noindex cannot silently pass the full sitemap audit',()=>{
 assert.deepEqual(blockedMetaIndexAgents('<meta name="Yeti" content="NOINDEX, FOLLOW">'),['yeti']);
 assert.deepEqual(blockedMetaIndexAgents('<meta content="none" NAME="googlebot">'),['googlebot']);
 assert.deepEqual(blockedMetaIndexAgents("<meta name='robots' content='INDEX, FOLLOW'>"),[]);
 assert.deepEqual(blockedMetaIndexAgents('<meta name="description" content="NOINDEX">'),[]);
 assert.deepEqual(blockedMetaIndexAgents('<meta name="bingbot" content="noindex"><meta name="robots" content="noindex">'),['bingbot','robots']);
});

test('Naver Yeti is not blocked by Googlebot/Bingbot-only X-Robots-Tag',()=>{
 assert.deepEqual(blockedXRobotsIndexAgents('googlebot: noindex, nofollow'),['googlebot']);
 assert.deepEqual(blockedXRobotsIndexAgents('Googlebot: noindex, Yeti: index'),['googlebot']);
 assert.deepEqual(blockedXRobotsIndexAgents('Yeti: noindex, Googlebot: index'),['yeti']);
 assert.deepEqual(blockedXRobotsIndexAgents('noindex, follow'),['robots']);
 assert.deepEqual(blockedXRobotsIndexAgents('googlebot: noindex\nYeti: noindex'),['googlebot','yeti']);
 assert.deepEqual(blockedXRobotsIndexAgents('googlebot: noindex, bingbot: noindex'),['googlebot','bingbot']);
 assert.deepEqual(blockedXRobotsIndexAgents('index, follow'),[]);
});


test('Yeti robots.txt rules ignore disallow set only for Googlebot',()=>{
 const cases=[
  ['User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nAllow: /\n',false],
  ['User-agent: *\nDisallow: /\n',true],
  ['User-agent: *\nDisallow: /\nUser-agent: Yeti\nAllow: /\n',false],
  ['User-agent: Yeti\nDisallow: /\nUser-agent: *\nAllow: /\n',true],
  ['User-agent: *\nDisallow: /private/\nAllow: /\n',false],
  ['User-agent: Yeti\nDisallow: /\nAllow: /\n',false],
  ['User-agent: *\nAllow: /\n',false]
 ];
 for(const [robots,blocked] of cases)
  assert.equal(naverRobotsDisallowAll(robots),blocked,robots);
});

test('focus evidence and reciprocal link metrics count only rendered in-scope links, not quote calls or archive search',()=>{
 const region='/taksong/gyeongbuk/andong-si/ok-dong/',ride='/reviews/verified/0123456789abcdef/',outside='/reviews/history/excel-0010/';
 const focusHtml='<a href="/reviews/history/excel-0099/">unrelated outer section</a>'+
 '<section id="metro-innovation-long-distance-20261127"><a href="'+ride+'">record</a>'+
 '<a href="'+ride+'">duplicate</a><a href="'+outside+'">archive record</a>'+
 '<a href="/reviews/history/?kind=taksong">search</a>'+
 '<a href="https://example.org/reviews/verified/1234567890abcdef/">external</a>'+
 '<a href="/fare/?service=taksong&amp;from=안동&amp;to=서울">quote</a>'+
 '<a href="/fare/?service=taksong&amp;from=서울&amp;to=안동">reverse quote</a>'+
 '<a href="/fare/?service=taksong&amp;from=서울&amp;to=안동&amp;auto=1">not counted</a>'+
 '<script>const fake=\'<a href="/reviews/history/excel-1234/">fake</a>\';</script></section>';
 const observed=focusLinkObservation(region,focusHtml);
 assert.deepEqual(observed,{focusPanel:true,focusRidePaths:[ride,outside],focusQuoteCount:2});
 const backlink=focusLinkObservation(ride,'<a href="'+region+'">regional service</a><a href="'+region+'?auto=1">not canonical</a>');
 assert.deepEqual(backlink,{reviewRegionPaths:[region]});
 const noEvidence='/daeri/gyeongbuk/andong-si/ok-dong/';
 const summary=focusLinkCoverage([
  {url:region,status:200,...observed},
  {url:noEvidence,status:200,...focusLinkObservation(noEvidence,'<section id="metro-innovation-long-distance-20261127">No public record</section>')},
  {url:ride,status:200,...backlink},
  {url:outside,status:404,reviewRegionPaths:[region]},
  {url:'/taksong/',status:200,...focusLinkObservation('/taksong/',focusHtml)}
 ]);
 assert.deepEqual(summary,{focusServicePagesObserved:2,focusPagesWithPanelRideLink:1,focusPagesWithoutPanelRideLink:1,focusQuoteLinksObserved:2,focusRideLinkPairs:2,focusRidePairsWithAuditedTarget:1,focusRidePairsWithReciprocalLink:1,focusRidePairsTargetNotAudited:1});
});
