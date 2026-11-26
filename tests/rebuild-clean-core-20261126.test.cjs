'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {pages,byPath,render,origin}=require('../rebuild/render.cjs');
const server=require('../rebuild/preview.cjs');
test('24 original canonical URLs, distinct titles and service content, valid links',()=>{
 assert.equal(pages.length,24);
 for(const field of ['path','title','intro'])assert.equal(new Set(pages.map(x=>x[field])).size,24);
 for(const p of pages){
  assert(p.path.startsWith('/')&&p.path.endsWith('/'));
  assert(p.sections.length===2&&p.sections.every(s=>s.body.length>=35));
  assert(p.related.every(path=>byPath.has(path)));
  const h=render(p);
  assert(h.includes('href="'+origin+p.path+'"'));
  assert.equal((h.match(/<h1>/g)||[]).length,1);
  assert.equal((h.match(/rel="canonical"/g)||[]).length,1);
  assert(h.includes('href="tel:18114294"'));
  assert(h.includes('href="/reviews/verified/"'));
  assert(h.includes('content="index,follow"'));
  assert(!h.includes('noindex'));
  assert(!h.includes('undefined'));
  assert.equal(JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]).url,origin+p.path);
 }
});
test('isolated preview is local only, noindex, no sitemap, no mutation routes',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const home=await fetch(base+'/');
  assert.equal(home.status,200);assert.equal(home.headers.get('x-robots-tag'),'noindex, nofollow');
  const h=await home.text();assert(h.includes('content="noindex,nofollow"'));
  assert(h.includes('href="'+origin+'/fare/"'));
  assert((await (await fetch(base+'/robots.txt')).text()).includes('Disallow: /'));
  assert.equal((await fetch(base+'/sitemap.xml')).status,404);
  assert.equal((await fetch(base+'/missing/')).status,404);
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
