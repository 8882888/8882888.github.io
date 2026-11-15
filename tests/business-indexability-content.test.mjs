import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const categories=[
 ['used-car','used-car-practical-questions','중고차'],
 ['rental-car','rental-practical-questions','렌트카'],
 ['export-port','export-practical-questions','수출단지'],
 ['scrapyard','scrapyard-practical-questions','폐차장'],
 ['auction','auction-practical-questions','경매장']
];
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('keep the fully permissive robots.txt unchanged by business SEO work',()=>{
 const robots=read('robots.txt');
 assert.match(robots,/^User-agent: \*\s*\nAllow: \/\s*$/m);
 assert.doesNotMatch(robots,/^Disallow:/mi);
});
test('all five business detail guides have unique canonical and source-linked practical answers',()=>{
 const titles=new Set(),desc=new Set(),questions=new Set();
 for(const [slug,section,topic] of categories){
  const html=read('business/'+slug+'/index.html');
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1]||'';
  const meta=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  const can=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]||'';
  assert.ok(title.includes(topic),'title describes '+slug);
  assert.ok(meta.length>55,'description substantive '+slug);
  assert.equal(can,'https://jeongukdaeri.kr/business/'+slug+'/');
  assert.ok(!titles.has(title),'unique title '+slug);titles.add(title);
  assert.ok(!desc.has(meta),'unique description '+slug);desc.add(meta);
  const content=html.match(new RegExp('<section id="'+section+'">([\\s\\S]*?)<\\/section>'))?.[1];
  assert.ok(content,'distinct guide exists '+slug);
  assert.equal((content.match(/<h3>/g)||[]).length,2,'two practical FAQ answers '+slug);
  assert.match(content,/href="tel:18114294"/,'real consultation action '+slug);
  assert.ok(!questions.has(content),'not duplicate guidance');questions.add(content);
  assert.match(html,/href="https:\/\/blog\.naver\.com\/wjdtnr4757\//,'source links preserved '+slug);
  assert.doesNotMatch(html,/name="robots" content="noindex/,'indexable content '+slug);
 }
});
test('source audit checks all final business URLs and reports live X-Robots-Tag and MIME',()=>{
 const audit=read('scripts/audit-naver-priority-live.mjs');
 for(const [slug] of categories)assert.ok(audit.includes("'/business/"+slug+"/'"));
 assert.match(audit,/requiredBusinessPaths/);
 assert.match(audit,/robotsContentType/);
 assert.match(audit,/xRobotsTag/);
});
