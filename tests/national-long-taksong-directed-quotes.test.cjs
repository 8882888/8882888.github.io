'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'service/long-distance-taksong/index.html'),'utf8');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const owners=read('data/sitemap-url-owners.json');
const state=read('data/published-ride-case-ids.json');
const records=[...read('data/public-reviewed-rides-202610.json'),...read('data/verified-ride-publication-queue.json')];
const identifier=x=>crypto.createHash('sha256').update(['date','service','departure','destination','fare'].map(k=>String(x[k]||'')).join('|')).digest('hex').slice(0,16);
test('all three directed quotes match immutable completed records; reverse is explicitly not a completed ride',()=>{
 const section=html.match(/<section id="long-taksong-directed-quote-20261125"[\s\S]*?<\/section>/)?.[0]||'';
 assert.ok(section.includes('반대 방향은 별도 견적이며 실제 운행완료 사례가 아닙니다'));
 assert.ok(section.includes('과거 기록요금과 현재 요금은 다를 수 있습니다'));
 const cases=[...section.matchAll(/<li data-case="([a-f0-9]{16})">([\s\S]*?)<\/li>/g)];
 assert.equal(cases.length,3);
 const unique=new Set();
 for(const [,id,body] of cases){
  assert.ok(!unique.has(id));unique.add(id);
  const row=records.find(x=>identifier(x)===id&&x.verified===true&&x.status==='completed'&&x.service==='taksong');
  assert.ok(row,'verified source '+id);
  assert.ok(state.some(x=>x.id===id&&x.service==='taksong'));
  assert.equal(owners['/reviews/verified/'+id+'/'],'/sitemap-published.xml');
  assert.ok(body.includes('href="/reviews/verified/'+id+'/"'));
  const quotes=[...body.matchAll(/href="(\/fare\/\?[^"]+)"/g)].map(m=>new URL(m[1].replaceAll('&amp;','&'),'https://jeongukdaeri.kr'));
  assert.equal(quotes.length,2);
  assert.equal(quotes[0].searchParams.get('from'),row.departure);
  assert.equal(quotes[0].searchParams.get('to'),row.destination);
  assert.equal(quotes[1].searchParams.get('from'),row.destination);
  assert.equal(quotes[1].searchParams.get('to'),row.departure);
  for(const q of quotes)assert.equal(q.searchParams.get('service'),'taksong');
 }
});
test('all 17 province navigation destinations already have exclusive ownership',()=>{
 const section=html.match(/<section id="long-taksong-province-navigation-20261125"[\s\S]*?<\/section>/)?.[0]||'';
 const routes=[...section.matchAll(/href="(\/taksong\/[a-z]+\/)"/g)].map(m=>m[1]);
 assert.equal(routes.length,17);assert.equal(new Set(routes).size,17);
 for(const route of routes)assert.equal(owners[route],'/sitemap-priority.xml',route);
 assert.equal((html.match(/<link rel="canonical"/g)||[]).length,1);
 assert.ok(html.includes('href="https://jeongukdaeri.kr/service/long-distance-taksong/"'));
 assert.ok(html.includes('id="national-long-distance-records"'));
});
