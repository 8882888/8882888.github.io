'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const create=require('../lib/route-keyword-pages');
const provinces=['서울특별시','부산광역시','인천광역시','대전광역시','대구광역시','광주광역시'];
const regions=provinces.map((name,i)=>({slug:'area-'+(i+1),name,full_name:name,level:'시도'}));
const origin=(n)=>regions.find(r=>r.full_name===n);
const html=(title,description,body,canonical)=>'<html><head><title>'+title+'</title><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+canonical+'"><meta name="description" content="'+description+'"></head><body>'+body+'</body></html>';
function app(rides=[]){return create({regions,esc:x=>String(x),layout:html,label:r=>r.name,host:'jeongukdaeri.kr',servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',historicalRides:rides});}
const uri=pathname=>new URL('https://jeongukdaeri.kr'+pathname);
const route=(a,b,k='taksong')=>'/routes/'+k+'/'+origin(a).slug+'/'+origin(b).slug+'/';
const isNoindex=s=>/name="robots" content="noindex,nofollow"/.test(s);
test('arbitrary unverified regional pair stays usable but is not a search landing page',()=>{
 const r=route('대전광역시','인천광역시');
 const out=app().handle(r,uri(r));
 assert.equal(out.status,200);
 assert.equal(isNoindex(out.body),true);
 assert.ok(out.body.includes('rel="canonical" href="https://jeongukdaeri.kr'+r+'"'));
 assert.match(out.body,/요금·예약/);
 assert.doesNotMatch(out.body,/실제 운행완료 후기/);
});
test('hand-authored useful corridor remains indexable even without fabricated ride',()=>{
 const r=route('서울특별시','부산광역시');
 const out=app().handle(r,uri(r));
 assert.equal(out.status,200);
 assert.match(out.body,/name="robots" content="index,follow,max-image-preview:large"/);
 assert.match(out.body,/서울에서 부산 탁송: 장거리 인계 준비/);
 assert.doesNotMatch(out.body,/실제 운행완료 후기/);
});
test('a genuinely verified directional route stays indexable with actual source record',()=>{
 const rides=[{id:'excel-1',service:'taksong',rawDeparture:'서울특별시',rawDestination:'대전광역시',date:'2026-10-01',fare:'150,000원'}];
 const r=route('서울특별시','대전광역시');
 const out=app(rides).handle(r,uri(r));
 assert.equal(out.status,200);
 assert.match(out.body,/name="robots" content="index,follow,max-image-preview:large"/);
 assert.match(out.body,/실제 운행완료 후기/);
 assert.ok(out.body.includes('/reviews/history/excel-1/'));
});
test('route sitemaps list only approved and verified corridors, not arbitrary combinations',()=>{
 const r=route('대전광역시','인천광역시'),keep=route('서울특별시','부산광역시');
 const x=app().handle('/sitemap-route-taksong.xml',uri('/sitemap-route-taksong.xml'));
 assert.equal(x.status,200);
 assert.ok(x.body.includes(keep));
 assert.ok(!x.body.includes(r));
 const n=app().handle('/sitemap-nationwide-route-taksong-01.xml',uri('/sitemap-nationwide-route-taksong-01.xml'));
 assert.equal(n.status,200);
 assert.ok(!n.body.includes(r));
});
test('regional route nav advertises only editorial or actually completed corridors',()=>{
 const out=app().links(origin('서울특별시'),'taksong');
 assert.ok(out.includes(route('서울특별시','부산광역시')));
 assert.ok(!out.includes(route('서울특별시','인천광역시')));
 assert.match(out,/전국 시·군·구·읍·면·동·리 도착지 전체 조회/);
});
test('customer directory remains available for fare lookup and intentionally noindex',()=>{
 const p='/routes/taksong/area-1/';
 const out=app().handle(p,uri(p));
 assert.equal(out.status,200);
 assert.equal(isNoindex(out.body),true);
 assert.match(out.body,/area-2/);
});
