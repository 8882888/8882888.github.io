'use strict';
const assert = require('node:assert/strict');
const { TOPICS, allowedPost, matchTopics, renderSearchTopics } = require('../lib/blog-search-topics');
const esc = x => String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const u = id => 'https://blog.naver.com/wjdtnr4757/' + id;
const feed = [
  {title:'영산강길자전거종주탁송｜담양댐→영산강하구둑 요금',link:u('224453077688')},
  {title:'세종대리운전 장거리 이용 안내',link:u('224453077689')},
  {title:'세종탁송 차량 인수·인계 안내',link:u('224453077690')},
  {title:'원주 반곡동 대리운전 출발 위치 안내',link:u('224453077691')},
  {title:'세종대리운전 악성 링크',link:'https://evil.example/224453077693'},
  {title:'<script>alert(1)</script> 울산 대리운전 안내',link:u('224453077692')}
];
const saved = [
  {title:'영산강길자전거종주탁송｜담양댐→영산강하구둑 요금 (중복)',url:u('224453077688')},
  {title:'설악산 오색탁송 백담사 차량회수',url:u('224453077695')}
];
const results = matchTopics(feed,saved);
assert.equal(TOPICS.length, 18, 'regional and route hub topics');
assert.equal(new Set(TOPICS.map(t=>t.path)).size, TOPICS.length,'no duplicate target paths');
assert(results.find(t=>t.query==='영산강 자전거길 종주').posts.some(p=>p.url===u('224453077688')));
assert.equal(results.find(t=>t.query==='세종 대리운전').posts[0].url,u('224453077689'));
assert.equal(results.find(t=>t.query==='세종 탁송').posts[0].url,u('224453077690'));
assert.equal(results.find(t=>t.query==='원주혁신도시 대리운전').posts[0].url,u('224453077691'));
assert.equal(results.find(t=>t.query==='영산강 자전거길 종주').totalMatches,1,'RSS/archive duplicate removal');
assert.equal(allowedPost('https://m.blog.naver.com/wjdtnr4757/224453077688?tracking=a'),u('224453077688'));
assert.equal(allowedPost('https://blog.naver.com/wjdtnr4757/224453077688'),u('224453077688'));
assert.equal(allowedPost('https://blog.naver.com/other/224453077688'),null);
assert.equal(allowedPost('http://blog.naver.com/wjdtnr4757/224453077688'),null);
assert(!results.some(t=>t.posts.some(p=>p.url.includes('evil.example'))),'no untrusted external links');
const html=renderSearchTopics(feed,esc);
assert(html.includes('href="tel:18114294"'),'one-tap direct native call link');
assert(html.includes('min-height:48px'),'mobile targets should be at least 44px');
assert(html.includes('href="/fare/?service=taksong"'),'taksong fare action');
assert(html.includes('href="/fare/?service=daeri"'),'daeri fare action');
assert(html.includes('href="/route-taksong/courses/yeongsan/"'),'canonical course link');
assert(html.includes('href="/taksong/busan/gijang-gun/"'),'original Gijang hub preserved');
assert(!html.includes('https://evil.example'),'do not print malicious URL');
assert(!html.includes('<script>alert(1)</script>'),'HTML-escape external titles');
assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),'preserve safe plain-text title');
assert.equal((html.match(/href="https:\/\/blog\.naver\.com\/wjdtnr4757\/224453077688"/g)||[]).length,1,'avoid duplicate external links');
console.log('PASS 18 editorial topics; Naver URL validation; service intent; deduplication; HTML escaping; mobile CTAs');
