'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const server=read('server.js'),fare=read('fare/index.html');
const begin=server.indexOf('function regionalDecisionPanel(r,kind,verified,history){');
const end=server.indexOf('async function servicePage(r,kind){',begin);
assert(begin>0&&end>begin,'Source of shared nationwide booking panel must be present');
const ctx={
 esc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 seoRegionLabel:r=>r.name,
 childrenByParent:new Map(),
 bySlug:new Map(),
 regionalNationwideSubareaChooser:()=>'<details id="test-national-subarea"></details>',
 rideUrl:x=>'/reviews/'+x.id+'/',
 servicePath:(r,kind)=>'/'+kind+'/region/'
};
const panel=vm.runInNewContext(server.slice(begin,end)+'\nregionalDecisionPanel',ctx);
const samples=[
 {name:'부산광역시',full_name:'부산광역시',slug:'busan'},
 {name:'강남구',full_name:'서울특별시 강남구',slug:'gangnam'},
 {name:'혁신도시',full_name:'세종특별자치시 (직할) 나성동',slug:'sejong-na'},
 {name:'강화군',full_name:'인천광역시 강화군',slug:'ganghwa'},
 {name:'서귀포시',full_name:'제주특별자치도 서귀포시',slug:'seogwipo'}
];
for(const r of samples)for(const kind of ['daeri','taksong']){
 const html=panel(r,kind,[],[]);
 assert.equal(html.split('id="regional-direct-route-quote-20261107"').length-1,1,
  'One customer-facing quote form per locality: '+r.full_name);
 assert(html.includes('action="/fare/" method="get"'),'Only the real fare calculator may receive route input');
 assert(html.includes('name="service" value="'+kind+'"'),'Service must not silently switch');
 assert(html.includes('name="from" value="'+r.full_name+'"'),'Departure must be pre-filled with actual legal locality');
 assert(html.includes('name="to" placeholder="도착지 주소 또는 지명 입력"')&&html.includes('name="auto" value="1"'),
  'Destination must be required and customer quote must be explicit');
 assert(html.includes('sessionStorage.setItem("smart24_explicit_quote_submit",String(Date.now()))'),
  'Explicit user submit marker must be sent for safe automatic quote');
 assert(html.includes('href="tel:18114294"'),'Call action must remain above long region text');
 const f=html.indexOf('id="regional-direct-route-quote-20261107"'),sub=html.indexOf('id="test-national-subarea"'),review=html.indexOf('공개된 실제 완료 운행');
 assert(f>0&&f<sub&&sub<review,'One-step regional route entry must precede lists and ride history');
}
assert(server.includes("const caption='<figcaption style=\\\"text-align:center\\\">'+esc(displayBrand)+' · 출발지·도착지 확인 후"),
 'Regional card captions must use natural locality/service labels');
assert(!server.includes("esc(seoRegionLabel(r)+' '+serviceBrand(kind))"),
 'Do not duplicate city-plus-brand boilerplate in service card captions');
assert(fare.includes("preset.get('auto')==='1'")&&fare.includes("stamp>0&&Date.now()>=stamp")&&fare.includes('form.requestSubmit()'),
 'Fare page must auto-calculate only after a recent explicit submit');
assert.equal(JSON.parse(read('data/ride-history.json')).length,2591,
 'No route UI change may invent or modify original ride history');
console.log('PASS nationwide regional one-step quote, real departure, phone call and explicit-submit gating');
