#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
for (const [slug, city] of [['busan','부산'],['daegu','대구']]) {
  const html = fs.readFileSync('region/'+slug+'-daeri-taksong/index.html','utf8');
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1] || '';
  assert(h1.includes(city+'탁송 후기'),slug+': H1 must start with a local review');
  assert.equal((html.match(/<h1\b/gi)||[]).length,1,slug+': exactly one H1');
  assert(html.includes('rel="canonical"'),slug+': canonical required');
  assert(html.includes('tel:18114294'),slug+': consultation phone required');
  assert(html.includes('/fare/'),slug+': fare link required');
  const main = html.indexOf('<main>');
  const reviewHeading = html.indexOf(city+' 자동차탁송 실제 완료후기부터 확인',main);
  const localHeading = html.indexOf(city+'탁송 요금·실제 운행후기',main);
  if(slug==='daegu'){
    const reviewSection = html.indexOf('id="daegu-route-real-review-first-202611"');
    const genericSection = html.indexOf('id="daegu-intent-reviews-partners-20261102"');
    assert(reviewSection>main && genericSection>reviewSection,'Daegu verified review must precede generic service information');
    assert(html.includes('/reviews/taksong/#taksong-daemyeong-toseong'),'Daegu real record link must persist');
  } else {
    assert(html.includes('부산 연산동→경산 중산동'),'Busan verified route must persist');
  }
}
console.log('PASS: Busan/Daegu review-first heading, canonical, call and fare links');
