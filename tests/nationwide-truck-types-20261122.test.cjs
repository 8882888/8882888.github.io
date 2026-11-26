'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const docs=fs.readdirSync(path.join(root,'data/legal-regions')).filter(x=>/^\d{2}\.json$/.test(x)).sort();
const legal=docs.flatMap(file=>JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8')).full_names);
const data=require('../data/nationwide-truck-types-20261122.json');
const {create,HEAVY,AERIAL,LADDER}=require('../lib/nationwide-truck-taksong.cjs');
const {createNationwideLocalityExplorer}=require('../lib/nationwide-locality-explorer');
const regions=[],byFull=new Map(),childrenByParent=new Map(),bySlug=new Map();
for(const full of legal){
 const parts=full.split(' '),name=parts.at(-1),parent=byFull.get(parts.slice(0,-1).join(' '));
 const level=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'시':'dong';
 // Correct towns/counties/districts independently of test source shortcut.
 const actual=parts.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
 const r={full_name:full,name,level:actual,slug:'area-'+(regions.length+1),parent_slug:parent?.slug||null};
 regions.push(r);byFull.set(full,r);bySlug.set(r.slug,r);
 if(parent){if(!childrenByParent.has(parent.slug))childrenByParent.set(parent.slug,[]);childrenByParent.get(parent.slug).push(r)}
}
const esc=x=>String(x).replace(/[&<>"']/g,y=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[y]));
const servicePath=(r,k)=>'/'+k+'/test-'+r.slug+'/';
const explorer=createNationwideLocalityExplorer({regions,bySlug,childrenByParent,servicePath,escapeHtml:esc});
const guide=create({regions,servicePath,esc,nationwideExplorer:explorer});
const target=(full,kind='taksong')=>servicePath(byFull.get(full),kind);
test('vehicle registry has 26 unambiguous actual truck names, 27 search weight examples and all 17 provinces',()=>{
 assert.equal(docs.length,17);
 assert.ok(legal.length>20000);
 assert.equal(guide.provinceCount,17);
 assert.equal(guide.types.length,26);
 assert.equal(guide.weights.length,27);
 assert.equal(new Set(data.types.map(x=>x.slug)).size,26);
 assert.equal(data.weights[0],'1');
 assert.equal(data.weights.at(-1),'25');
 assert.ok(guide.types.find(t=>t.name==='탱크로리').description.includes('위험물'));
 assert.ok(guide.types.find(t=>t.name==='냉동탑차').description.includes('냉동'));
});
test('all seventeen provincial body-style aliases use original province canoncial URLs, no fake city pages',()=>{
 const samples=['카고','윙바디','탑차','냉동탑차','냉장탑차','덤프트럭','탱크로리','집게차','고소차','사다리차','추레라','특장차'];
 const provinceNames={
 '서울특별시':'서울','부산광역시':'부산','대구광역시':'대구','인천광역시':'인천',
 '광주광역시':'광주광역시','대전광역시':'대전','울산광역시':'울산','세종특별자치시':'세종',
 '경기도':'경기','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남',
 '전북특별자치도':'전북','전라남도':'전남','경상북도':'경북','경상남도':'경남','제주특별자치도':'제주'
 };
 for(const [full,short] of Object.entries(provinceNames)){
  for(const type of samples)assert.equal(guide.resolve(short+type+'탁송'),target(full),short+type+'탁송');
  assert.equal(guide.resolve(full+'25톤윙바디탁송'),target(full),full+'25톤윙바디탁송');
  const html=guide.regionSection(byFull.get(full),'taksong');
  assert.ok(html.includes(full)&&html.includes(short+'1톤카고탁송'));
  assert.ok(html.includes('화물차 종류별 준비사항'));
  assert.ok(html.includes('1811-4294'));
  assert.ok(!guide.regionSection(byFull.get(full),'daeri'));
 }
});
test('city/county/district and legally distinct 읍면동리 phrases resolve only to existing official region canonicals',()=>{
 const cases=[
 ['수원1톤카고탁송','경기도 수원시'],
 ['경기도수원시3.5톤윙바디탁송','경기도 수원시'],
 ['부산해운대구5톤탑차탁송','부산광역시 해운대구'],
 ['서울특별시강남구역삼동1톤냉동탑차탁송','서울특별시 강남구 역삼동'],
 ['충청남도당진시석문면장고항리25톤집게차탁송','충청남도 당진시 석문면 장고항리'],
 ['서산시대산읍5톤카고탁송','충청남도 서산시 대산읍'],
 ['당진시석문면11톤화물차탁송','충청남도 당진시 석문면'],
 ['경상남도창원시5톤특장차탁송','경상남도 창원시'],
 ['부산25톤윙바디탁송','부산광역시'],
 ['25톤윙바디부산탁송','부산광역시'],
 ['윙바디25톤부산탁송','부산광역시'],
 ['서울5톤화물차윙바디탁송','서울특별시'],
 ['충남5톤탁송','충청남도'],
 ['광주광역시 카고 자동차탁송','광주광역시'],
 ['전국부산3.5톤냉동탑차차량탁송','부산광역시'],
 ['전국 서울특별시 강남구 탑차 로드탁송','서울특별시 강남구']
 ];
 for(const [keyword,full] of cases){
  assert.ok(byFull.has(full),'missing real region '+full);
  assert.equal(guide.resolve(keyword),target(full),keyword);
 }
 assert.equal(guide.resolve('광주시카고탁송'),null,'Do not guess between Gwangju city aliases');
 assert.equal(guide.resolve('사다리작업차량탁송'),null,'Existing ladder service must not be confused with a village named 사다리');
 assert.equal(guide.resolve('서울에서부산까지25톤윙바디탁송'),null,'Do not invent a directional route');
 assert.equal(guide.resolve('25톤윙바디탁송'),null,'Existing exact body-type route keeps precedence');
 assert.equal(guide.resolve('서울카고화물운송'),null,'Cargo transport is not vehicle taksong');
 assert.equal(guide.resolve('1톤사다리차대여'),null,'Equipment rental must not be claimed');
 assert.equal(guide.resolve('서울25톤사다리차임대'),null);
});
test('unserved standalone aliases resolve to verified heavy-truck guide or dedicated safe special vehicle guides',()=>{
 const keywords=[
 ['탱크로리탁송',HEAVY+'#truck-type-tanker'],
 ['1톤카고탁송',HEAVY+'#truck-type-cargo'],
 ['25톤특장차탁송',HEAVY+'#truck-type-special'],
 ['냉장탑차탁송',HEAVY+'#truck-type-chilled'],
 ['3.5톤고소차탁송',AERIAL],
 ['5톤사다리차탁송',LADDER]
 ];
 for(const [q,to] of keywords)assert.equal(guide.resolveGeneral(q),to,q);
 assert.equal(guide.resolveGeneral('25톤윙바디화물운송'),null);
});
test('main cargo hub lists every distinct body style and all 17 existing legal province canonical URLs',()=>{
 const html=guide.hubSection();
 assert.ok(html.includes('1톤화물차탁송')&&html.includes('25톤화물차탁송'));
 assert.ok(html.includes('화물차 자체')&&html.includes('적재 화물'));
 assert.ok(html.includes('위험물'));
 for(const type of data.types)assert.ok(html.includes('truck-type-'+type.slug));
 for(const province of regions.filter(r=>r.level==='시도'))assert.ok(html.includes(target(province.full_name)));
 const staticHtml=fs.readFileSync(path.join(root,'service/heavy-truck-taksong/index.html'),'utf8');
 assert.ok(staticHtml.includes('id="nationwide-truck-types-20261122"'));
 for(const type of data.types)assert.ok(staticHtml.includes('id="truck-type-'+type.slug+'"'),'missing static anchor '+type.slug);
 for(const name of ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'])
  assert.ok(staticHtml.includes(name+'화물차탁송'));
 assert.ok(staticHtml.includes('25톤 카고 탱크로리'),'Keep previous original request record');
});
test('bounded region guidance does not invent thousands of dong/village landing pages or corrupt unrelated daeri SEO',()=>{
 const levels=['시도','시','군','구'];
 const seen=new Set();
 for(const level of levels){
  const r=regions.find(x=>x.level===level);
  assert.ok(r,'Missing region level '+level);
  const html=guide.regionSection(r,'taksong');
  assert.ok(html.includes('화물차탁송'));
  assert.ok(html.includes('1톤')&&html.includes('25톤'));
  assert.ok(html.includes(servicePath(r,'taksong'))===false,'Avoid self-links');
  assert.ok(!seen.has(html),'Duplicate guide '+level);
  seen.add(html);
  assert.equal(guide.regionSection(r,'daeri'),'');
 }
 for(const r of regions.filter(x=>['읍','면','동','리'].includes(x.level)).slice(0,1200))
  assert.equal(guide.regionSection(r,'taksong'),'');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.ok(server.includes('nationwideTruckTaksong.regionSection(r,kind)'));
 assert.ok(server.includes('nationwideTruckTaksong.resolve(searchIntent)'));
 assert.ok(server.includes('nationwideTruckTaksong.resolveGeneral(searchIntent)'));
 assert.ok(!fs.readFileSync(path.join(root,'robots.txt'),'utf8').includes('truck-type-'));
});

test('expanded nationwide special-truck taxonomy preserves base types and resolves all declared specialty weight queries',()=>{
 const extra=require('../data/special-truck-types-20261126.json');
 assert.equal(guide.allTypes.length,66);
 assert.equal(guide.allWeights.length,42);
 assert.equal(new Set(guide.allTypes.map(t=>t.slug)).size,66);
 assert.equal(new Set(guide.allWeights).size,42);
 assert.equal(guide.types.length,26);
 const sourceKeys=new Set(extra.sources.map(x=>x.key));
 assert.equal(sourceKeys.size,extra.sources.length);
 for(const t of extra.types){
  for(const source of t.sources)assert.ok(sourceKeys.has(source),source);
  assert.ok(t.description.length>=35&&t.note.length>=10,t.slug);
  for(const alias of t.aliases){
   assert.equal(guide.resolveGeneral(alias+'탁송'),HEAVY+'#truck-type-'+t.slug,alias);
   assert.equal(guide.resolve('부산'+alias+'탁송'),target('부산광역시'),alias);
   for(const weight of t.weights){
    const q=weight+'톤'+alias+'탁송';
    assert.equal(guide.resolveGeneral(q),HEAVY+'#truck-type-'+t.slug,q);
    assert.equal(guide.resolve('부산'+q),target('부산광역시'),q);
   }
  }
 }
 assert.equal(guide.resolveGeneral('추레라탁송'),HEAVY+'#truck-type-tractor');
 assert.equal(guide.resolveGeneral('추레라헤드탁송'),HEAVY+'#truck-type-tractor-head');
 assert.equal(guide.resolveGeneral('25톤탱크로리탁송'),HEAVY+'#truck-type-tanker');
 assert.equal(guide.resolveGeneral('1톤준설차탁송'),HEAVY+'#truck-type-dredger');
 assert.equal(guide.resolveGeneral('3.5톤스크린차탁송'),HEAVY+'#truck-type-screen');
 assert.equal(guide.resolveGeneral('1톤푸드차량탁송'),HEAVY+'#truck-type-foodtruck');
 assert.equal(guide.resolveGeneral('군용차탁송'),HEAVY+'#truck-type-military');
 assert.equal(guide.resolve('충청남도당진시석문면장고항리5톤준설차탁송'),target('충청남도 당진시 석문면 장고항리'));
 assert.equal(guide.resolve('서울1톤준설차임대'),null);
 assert.equal(guide.resolveGeneral('25톤탱크로리위험물운송'),null);
 assert.equal(guide.resolve('서울에서부산까지5톤준설차탁송'),null);
 assert.equal(guide.resolveGeneral('푸드트럭대여'),null);
 const html=fs.readFileSync(path.join(root,'service/heavy-truck-taksong/index.html'),'utf8');
 const expanded=guide.expandedSection();
 for(const t of extra.types){
  assert.ok(html.includes('id="truck-type-'+t.slug+'"'),t.slug);
  assert.ok(expanded.includes('id="truck-type-'+t.slug+'"'),t.slug);
  for(const w of t.weights)assert.ok(html.includes(w+'톤'+t.name+'탁송'),t.name);
 }
 for(const w of guide.allWeights)assert.ok(html.includes(w+'톤화물차탁송'),w);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(html.includes('1톤·3.5톤은 고객 문의 톤급으로 별도 제원 확인'));
 assert.ok(html.includes('비무장 일반 도로 운행용 차량'));
 assert.ok(html.includes('탱크 용량, 작업 높이와 차량 적재톤수'));
 assert.ok(html.includes('제휴')&&html.includes('제작사'));
 assert.ok(html.includes('https://jeongukdaeri.kr/service/heavy-truck-taksong/'));
});

test('water trucks, cargo, tankers and armroll spelling variants retain precise type anchors across weight classes',()=>{
 const examples=[
 ['1톤물차탁송','water-tanker'],['16톤물차탁송','water-tanker'],['25톤물차탁송','water-tanker'],
 ['7.5톤살수차탁송','sprinkler'],['8.5톤살수차탁송','sprinkler'],['16톤살수차탁송','sprinkler'],
 ['25톤탱크로리탁송','tanker'],['11.5톤탱크롤리탁송','tanker'],
 ['25톤카고탁송','cargo'],['14.5톤카고탁송','cargo'],
 ['25톤암롤탁송','armroll'],['25톤암롯탁송','armroll'],['11.5톤압롤탁송','armroll'],
 ['25톤암롤살수차탁송','armroll-water'],['25.5톤덤프트럭탁송','dump']
 ];
 for(const [query,slug] of examples){
  assert.equal(guide.resolveGeneral(query),HEAVY+'#truck-type-'+slug,query);
  assert.equal(guide.resolve('부산'+query),target('부산광역시'),query);
 }
 const html=fs.readFileSync(path.join(root,'service/heavy-truck-taksong/index.html'),'utf8');
 for(const [query] of examples.filter(([q])=>!q.includes('탱크롤리')&&!q.includes('11.5톤압롤')))assert.ok(html.includes(query),query);
 assert.ok(html.includes('2.5~25톤')&&html.includes('5·7.5·8.5·14·16톤'));
 assert.ok(guide.expandedSection().includes('66종'));
 assert.ok(guide.expandedSection().includes('42개 톤급'));
});
