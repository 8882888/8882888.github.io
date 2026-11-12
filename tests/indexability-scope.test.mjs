import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRegionalServiceUrl,reviewLinkCoverage} from '../scripts/indexability-scope.mjs';
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
