'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../lib/haeundae-local-seo-20261124.cjs');
const legalNames=[
 '부산광역시 해운대구','부산광역시 해운대구 반송동',
 '부산광역시 해운대구 석대동','부산광역시 해운대구 반여동',
 '부산광역시 해운대구 재송동','부산광역시 해운대구 우동',
 '부산광역시 해운대구 중동','부산광역시 해운대구 좌동',
 '부산광역시 해운대구 송정동'
];
const map=new Map(legalNames.map((full_name,i)=>[full_name,{full_name,name:full_name.split(' ').at(-1),slug:'test-'+i}]));
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const servicePath=(r,kind)=>'/'+kind+'/busan/haeundae-gu/'+(r.full_name===legalNames[0]?'':r.name+'/');
const seo=create({regionByFullName:map,servicePath,esc});
test('Haeundae focus is limited to 9 existing legal neighborhoods, both services',()=>{
 assert.deepEqual(new Set(seo.regions),new Set(legalNames));
 const titles=new Set();
 for(const name of legalNames)for(const kind of ['daeri','taksong']){
  const region=map.get(name),m=seo.meta(region,kind);
  if(name==='부산광역시 해운대구'){
   assert.equal(m,null,'district hub keeps existing reviewed SEO metadata');
  }else{
   assert.ok(m);
   assert.match(m.title,new RegExp(region.name+'(대리운전|탁송)'));
   assert.match(m.description,/1811-4294/);
   assert.ok([...m.description].length<125);
   assert.ok(!titles.has(m.title),'duplicate title: '+m.title);
   titles.add(m.title);
  }
  const html=seo.section(region,kind);
  assert.match(html,/id="haeundae-customer-intent-20261124"/);
  assert.match(html,/\/fare\/\?service=(daeri|taksong)/);
  assert.match(html,/완료 운행기록 검색/);
  assert.match(html,/tel:18114294/);
  assert.match(html,/class="haeundae-long-distance-corridors"/);
  for(const city of ['서울특별시','경기도','인천광역시','대구광역시','울산광역시','경상남도 창원시','경상남도 김해시','경상남도 양산시','경상북도 경주시','대전광역시','광주광역시','전북특별자치도 전주시','전라남도 목포시']){
   const prefix='/fare/?service='+kind+'&amp;from=';
   assert.ok(html.includes(prefix+encodeURIComponent(name)+'&amp;to='+encodeURIComponent(city)));
   assert.ok(html.includes(prefix+encodeURIComponent(city)+'&amp;to='+encodeURIComponent(name)));
  }
  if(m)assert.ok(m.title.includes(kind==='taksong'?'장거리탁송':'장거리대리운전'));

  assert.doesNotMatch(html,/실제 운행을 완료했습니다|즉시배차 보장|고정요금 \d+/);
  assert.equal((html.match(/<section\b/g)||[]).length,1);
  assert.equal((html.match(/<\/section>/g)||[]).length,1);
 }
 assert.equal(titles.size,16);
});
test('Unrelated localities are not changed and no new canonical page is generated',()=>{
 const r={full_name:'서울특별시 강남구',name:'강남구'};
 assert.equal(seo.meta(r,'daeri'),null);
 assert.equal(seo.section(r,'taksong'),'');
 for(const name of legalNames){
  assert.equal(seo.meta(map.get(name),'daily'),null);
  assert.equal(seo.section(map.get(name),'daily'),'');
 }
});
test('Haeundae hub cross-links to existing neighborhood pages and retains other service',()=>{
 const hub=map.get('부산광역시 해운대구');
 for(const kind of ['daeri','taksong']){
  const html=seo.section(hub,kind);
  assert.equal((html.match(/<li><a href=/g)||[]).length,8);
  assert.match(html,/이 지역 (대리운전|자동차탁송) 안내/);
  assert.match(html,/과거 기록의 요금은 현재 확정 견적이 아닙니다/);
 }
});
