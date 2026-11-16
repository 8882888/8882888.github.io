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

test('all six business pages use unique concise descriptions, OG parity and factual schema',()=>{
 const slugs=['business',...categories.map(x=>x[0])], descriptions=new Set();
 for(const slug of slugs){
  const html=read(slug==='business'?'business/index.html':'business/'+slug+'/index.html');
  const route=slug==='business'?'/business/':'/business/'+slug+'/';
  const desc=html.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  const og=html.match(/<meta property="og:description" content="([^"]+)"/)?.[1]||'';
  assert.ok([...desc].length>45&&[...desc].length<=80,route+' 80 characters');
  assert.equal(og,desc,route+' OG description parity');
  assert.ok(!descriptions.has(desc),route+' unique description');
  descriptions.add(desc);
  const docs=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
  assert.ok(docs.length>0,route+' JSON-LD exists');
  if(slug==='business')continue;
  const graph=docs.flatMap(x=>Array.isArray(x['@graph'])?x['@graph']:Array.isArray(x)?x:[x]);
  const webpage=graph.find(x=>x['@type']==='WebPage');
  const breadcrumb=graph.find(x=>x['@type']==='BreadcrumbList');
  assert.equal(webpage?.url,'https://jeongukdaeri.kr'+route,route+' WebPage canonical');
  assert.equal(webpage?.description,desc,route+' WebPage description');
  assert.equal(breadcrumb?.itemListElement?.at(-1)?.item,webpage.url,route+' BreadcrumbList canonical');
 }
});
