import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRegionalServiceUrl,isRegionalIntentGuideUrl,hasDirectRideRecordLink,regionalGuideCoverage,reviewLinkCoverage,blockedMetaIndexAgents,blockedXRobotsIndexAgents} from '../scripts/indexability-scope.mjs';
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
