'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeSeoHead,briefDescription,MAX}=require('../lib/seo-head-guard.cjs');
const prefix='서울특별시 강남구 역삼동 자동차탁송';
const long=prefix+' 출발과 도착 정확한 인수 위치 확인, 예상요금, 기사 복귀 동선과 시간대, 예약일자, 서비스센터 출고 담당자 안내를 상세하게 제공합니다. 요금과 배차는 상담 후 결정됩니다.';
const html=(robots='index,follow',ld='',description=long,path='/taksong/seoul/gangnam-gu/yeoksam-dong/')=>'<html><head><title>역삼동탁송 | 스마트24</title><link rel="canonical" href="https://jeongukdaeri.kr'+path+'"><meta name="robots" content="'+robots+'"><meta name="description" content="'+description+'"><meta property="og:description" content="'+description+'">'+ld+'</head><body><p>본문은 변경 금지</p></body></html>';
const meta=(html,k)=>html.match(new RegExp('<meta[^>]*'+k+'[^>]*>','i'))?.[0]||'';
test('80 chars, OG parity, canonical and visible body remain',()=>{
 const result=normalizeSeoHead(html()),m=meta(result,'name="description"'),o=meta(result,'property="og:description"');
 const content=x=>x.match(/content="([^"]*)"/)?.[1]||'';
 assert.ok([...content(m)].length<=MAX);assert.equal(content(m),content(o));assert.match(m,/역삼동 자동차탁송/);
 assert.match(result,/canonical" href="https:\/\/jeongukdaeri.kr\/taksong\/seoul\/gangnam-gu\/yeoksam-dong\//);
 assert.match(result,/본문은 변경 금지/);
});
test('WebPage schema added only for indexable pages and without duplicates',()=>{
 const first=normalizeSeoHead(html()),second=normalizeSeoHead(first);
 assert.equal((first.match(/"@type":"WebPage"/g)||[]).length,1);
 assert.equal((second.match(/"@type":"WebPage"/g)||[]).length,1);
 assert.match(first,/"@id":"https:\/\/jeongukdaeri.kr\/taksong\/seoul\/gangnam-gu\/yeoksam-dong\/#webpage"/);
});
test('intentional noindex remains and receives no page schema',()=>{
 const value=normalizeSeoHead(html('noindex,follow','','','/routes/daeri/area-1/'));
 assert.match(value,/noindex,follow/);assert.doesNotMatch(value,/"@type":"WebPage"/);
 assert.doesNotMatch(normalizeSeoHead(html(),{xRobotsTag:'noindex'}),/"@type":"WebPage"/);
});
test('existing WebPage stays, ImageObject gets companion only if indexable',()=>{
 const page='<script type="application/ld+json">{"@type":"WebPage"}</script>';
 const picture='<script type="application/ld+json">{"@type":"ImageObject"}</script>';
 assert.equal(normalizeSeoHead(html('index,follow',page,'짧은 메타 설명')),html('index,follow',page,'짧은 메타 설명'));
 assert.equal((normalizeSeoHead(html('index,follow',picture)).match(/"@type":"WebPage"/g)||[]).length,1);
 assert.doesNotMatch(normalizeSeoHead(html('noindex,follow',picture)),/"@type":"WebPage"/);
});
test('safe Unicode and HTML entity counting',()=>{
 assert.ok([...briefDescription(('경기도 성남시 분당구 자동차탁송 예약 ').repeat(10)+'&amp;')].length<=80);
});

test('important regional hotline survives shortening without breaking 80 chars',()=>{
 const value='강원특별자치도 대리운전과 장거리대리운전, 외곽 골프장 이동은 출발지 주소, 기사 복귀, 운행 일정과 요금조건, 인수 위치를 확인합니다. 전화 1811-4294';
 const text=briefDescription(value);
 assert.ok([...text].length<=80);assert.match(text,/강원특별자치도/);assert.match(text,/1811-4294/);
});

test('source-reviewed priority topic and 16-char locality context survive shortening',()=>{
 const topic='신서혁신도시 공공기관·동대구역 자동차탁송·입출고 상담';
 const detail='대구 동구 신서혁신도시 공공';
 const preferred='대구광역시 동구 · '+topic+'. '+detail+' 상담 1811-4294';
 const result=normalizeSeoHead(html('index,follow','',long),{preferredDescription:preferred});
 const tag=meta(result,'name="description"'),og=meta(result,'property="og:description"');
 assert.ok([...preferred].length<=80);assert.match(tag,/신서혁신도시 공공기관/);
 assert.match(tag,/대구 동구 신서혁신도시 공공/);
 assert.match(tag,/1811-4294/);
 assert.equal(tag.match(/content="([^"]*)"/)?.[1],og.match(/content="([^"]*)"/)?.[1]);
});

test('845-million possible route pairs are never bulk-promoted with generic schema',()=>{
 const value=normalizeSeoHead(html('index,follow','',long,'/routes/taksong/area-1/area-2/'));
 assert.doesNotMatch(value,/"@type":"WebPage"/);
 assert.match(value,/index,follow/);
});

test('existing verified WebPage JSON-LD description equals final 80-char meta',()=>{
 const sourceDesc='대구광역시 동구탁송 · 신서혁신도시 공공기관·동대구역 자동차탁송·입출고 상담. 대구 동구 신서혁신도시 공공시설에서 탁송 차량의 실제 주차 위치와 인계 시간을 확인합니다. 문의 1811-4294';
 const pageSchema={ '@context':'https://schema.org','@graph':[
  {'@type':'WebPage',name:'신서혁신도시 탁송',url:'https://jeongukdaeri.kr/taksong/daegu/dong-gu/',description:sourceDesc},
  {'@type':'Service',name:'자동차탁송',description:'기존 서비스 설명 유지'}
 ]};
 const ld='<script type="application/ld+json">'+JSON.stringify(pageSchema)+'</script>';
 const preferred='대구광역시 동구 · 신서혁신도시 공공기관·동대구역 자동차탁송·입출고 상담. 대구 동구 신서혁신도시 공공 상담 1811-4294';
 const page=html('index,follow',ld,sourceDesc,'/taksong/daegu/dong-gu/');
 const out=normalizeSeoHead(page,{preferredDescription:preferred});
 const finalDesc=meta(out,'name="description"').match(/content="([^"]*)"/)[1];
 const graph=JSON.parse(out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 assert.ok([...finalDesc].length<=80);
 assert.equal(graph[0].description,finalDesc);
 assert.equal(graph[1].description,'기존 서비스 설명 유지');
 assert.equal(normalizeSeoHead(out,{preferredDescription:preferred}),out);
});
test('unrelated BreadcrumbList and Service JSON-LD remain unmodified',()=>{
 const ld='<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Service',description:'unchanged original service'})+'</script>';
 const out=normalizeSeoHead(html('noindex,follow',ld,long));
 assert.match(out,/unchanged original service/);
 assert.match(out,/noindex,follow/);
});

test('only verified route-pair paths can receive a factual WebPage JSON-LD',()=>{
 const path='/routes/taksong/area-1175/area-2468/';
 const unverified=normalizeSeoHead(html('index,follow','',long,path));
 assert.doesNotMatch(unverified,/"@type":"WebPage"/);
 const verified=normalizeSeoHead(html('index,follow','',long,path),{allowVerifiedRoute:true});
 assert.equal((verified.match(/"@type":"WebPage"/g)||[]).length,1);
 assert.match(verified,/"url":"https:\/\/jeongukdaeri.kr\/routes\/taksong\/area-1175\/area-2468\/"/);
 assert.equal(normalizeSeoHead(verified,{allowVerifiedRoute:true}),verified);
});
test('even a verified route must respect noindex and never override robots',()=>{
 const out=normalizeSeoHead(html('noindex,follow','',long,'/routes/daeri/area-1/area-2/'),{allowVerifiedRoute:true});
 assert.match(out,/noindex,follow/); assert.doesNotMatch(out,/"@type":"WebPage"/);
});
test('airport and other arbitrary route combinations are excluded without exact evidence',()=>{
 const result=normalizeSeoHead(html('index,follow','',long,'/routes/taksong/airport-gimhae/area-2/'));
 assert.doesNotMatch(result,/"@type":"WebPage"/);
});
