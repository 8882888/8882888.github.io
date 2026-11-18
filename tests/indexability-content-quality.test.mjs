import test from 'node:test';
import assert from 'node:assert/strict';
import {contentQualitySignals} from '../scripts/indexability-content-quality.mjs';

test('substantial unique HTML with one H1 and a 70+ character description has no review flags',()=>{
 const text=Array.from({length:120},(_,i)=>'운행정보'+i).join(' ');
 const description='전국 자동차탁송 예약과 차량 인수인계 절차 및 실제 완료 운행기록을 확인하고 출발지와 도착지별 예상요금, 예약 전 준비사항, 상담 방법까지 확인하세요.';
 const html='<html><head><meta name="description" content="'+description+'"></head><body><main><h1>전국 자동차탁송 안내</h1><p>'+text+'</p></main></body></html>';
 const r=contentQualitySignals(html);
 assert.equal(r.wordCount,123);
 assert.equal(r.h1Count,1);
 assert.ok(r.descriptionLength>=70);
 assert.deepEqual(r.contentReviewFlags,[]);
});
test('short individual completed-ride pages are flagged for human review, not automatically blocked',()=>{
 const text=Array.from({length:85},(_,i)=>'실제운행기록'+i).join(' ');
 const html='<html><head><meta name="description" content="하안동에서 연수구까지 자동차탁송 실제 운행일과 당시 기록요금 안내"></head><body><main><h1>하안동 → 연수구 자동차탁송</h1><p>'+text+'</p></main></body></html>';
 const r=contentQualitySignals(html);
 assert.equal(r.wordCount,89);
 assert.ok(r.contentReviewFlags.includes('thin_content_under_100_words'));
 assert.ok(r.contentReviewFlags.includes('short_meta_description_under_70_chars'));
 assert.equal(r.h1Count,1);
});
test('scripts, styles, SVG text and head metadata do not inflate editorial word count',()=>{
 const html='<html><head><title>Title words do not count</title><meta name="description" content="description"></head><body><script>hidden fake words</script><main><h1>본문</h1><style>.x{content:"many hidden words"}</style><svg><text>not editorial words</text></svg><p>실제 본문</p></main></body></html>';
 const r=contentQualitySignals(html);
 assert.equal(r.wordCount,3);
 assert.ok(r.contentReviewFlags.includes('thin_content_under_100_words'));
});
test('missing and multiple H1 headings are reported separately',()=>{
 const noH1=contentQualitySignals('<html><body><main><p>본문</p></main></body></html>');
 assert.equal(noH1.h1Count,0);
 assert.ok(noH1.contentReviewFlags.includes('missing_h1'));
 const multi=contentQualitySignals('<html><body><main><h1>첫째</h1><h1>둘째</h1><p>본문</p></main></body></html>');
 assert.equal(multi.h1Count,2);
 assert.ok(multi.contentReviewFlags.includes('multiple_h1'));
});
test('HTML entities in descriptions are decoded before measuring character length',()=>{
 const html='<html><head><meta name="description" content="A &amp; B &lt; C &quot;D&quot; 설명 안내"></head><body><main><h1>제목</h1><p>본문</p></main></body></html>';
 const r=contentQualitySignals(html);
 assert.equal(r.descriptionLength,Array.from('A & B < C "D" 설명 안내').length);
});
