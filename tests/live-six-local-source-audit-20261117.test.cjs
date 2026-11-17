'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {check}=require('../scripts/audit-live-six-local-source-guides.cjs');
const {items}=require('../data/verified-archive-local-context-20261117.json');
const destinations={
 '인천연수구탁송':'/taksong/incheon/yeonsu-gu/',
 '오산탁송':'/taksong/gyeonggi/osan-si/',
 '양주탁송':'/taksong/gyeonggi/yangju-si/',
 '밀양탁송':'/taksong/gyeongnam/miryang-si/',
 '시흥탁송':'/taksong/gyeonggi/siheung-si/',
 '충주탁송':'/taksong/chungbuk/chungju-si/'
};
const regionToPath={
 '인천광역시 연수구':destinations['인천연수구탁송'],
 '경기도 오산시':destinations['오산탁송'],
 '경기도 양주시':destinations['양주탁송'],
 '경상남도 밀양시':destinations['밀양탁송'],
 '경기도 시흥시':destinations['시흥탁송'],
 '충청북도 충주시':destinations['충주탁송']
};
function html(item,opts={}){
 const path=regionToPath[item.region];
 const links=item.evidenceIds.filter(id=>id!==opts.omitArchive).map(id=>'<a href="/reviews/history/'+id+'/">원본</a>').join('');
 return '<!doctype html><html lang="ko"><head><title>'+item.region+' 탁송 안내</title>'+
  '<meta name="description" content="차량탁송 인계 안내">'+
  '<link rel="canonical" href="https://jeongukdaeri.kr'+path+'"></head><body>'+
  '<h1>'+item.region+' 탁송</h1>'+
  '<section id="source-backed-local-journey-20261117"><h2>'+item.heading+'</h2>'+
  '<p>'+item.context+'</p><p>'+item.preparation+'</p>'+links+
  '<a href="/fare/?service=taksong&amp;from=x">요금조회</a><a href="tel:18114294">예약 상담</a></section>'+
  '</body></html>';
}
function stubFetch(t,opts={}){
 t.mock.method(global,'fetch',async request=>{
  const url=new URL(String(request));
  if(url.pathname==='/'){
   const path=destinations[url.searchParams.get('q')];
   return new Response('',{status:path?302:404,headers:path?{location:path}:{}});
  }
  const item=items.find(x=>regionToPath[x.region]===url.pathname);
  if(!item)return new Response('Not Found',{status:404});
  return new Response(html(item,opts),{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
 });
}
test('independent real-HTTP auditor checks all six unique regions without network access',async t=>{
 stubFetch(t);
 for(const item of items){
  const verified=await check(item);
  assert.equal(verified.status,200);
  assert.equal(verified.archiveLinks,item.evidenceIds.length);
  assert.equal(verified.path,regionToPath[item.region]);
 }
});
test('auditor rejects a missing archived source link even if HTTP/canonical are valid',async t=>{
 stubFetch(t,{omitArchive:items[1].evidenceIds[0]});
 await assert.rejects(check(items[1]),/Original archive link missing/);
});
test('auditor rejects a wrong keyword canonical redirect even if a page exists',async t=>{
 t.mock.method(global,'fetch',async request=>{
  const url=new URL(String(request));
  return new Response('',{status:302,headers:{location:'/taksong/gyeonggi/wrong-si/'}});
 });
 await assert.rejects(check(items[1]),/Wrong canonical redirect/);
});
