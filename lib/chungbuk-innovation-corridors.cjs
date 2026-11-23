'use strict';
// Dedicated guidance for existing Chungbuk legal-region canonicals.
// These links are suggested fare inputs, never witnessed dispatches/rides or set prices.
const source=require('../data/chungbuk-innovation-corridors-20261123.json');
const CB='충청북도';
const kinds=['daeri','taksong'];
const label=k=>k==='daeri'?'대리운전':'자동차탁송';

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
    typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Chungbuk innovation guides require original legal-area index');
 const cities=regions.filter(r=>r.full_name.startsWith(CB+' ')&&
    ['시','군'].includes(r.level));
 if(cities.length!==11||source.rows.length!==11)
  throw Error('Chungbuk must retain 3 city + 8 county source coverage');
 const hub=regionByFullName.get(CB);
 if(!hub||hub.level!=='시도')throw Error('Missing Chungbuk province canonical');
 const destinations=[source.innovation.jincheon,source.innovation.eumseong];
 for(const name of destinations){
  const legal=regionByFullName.get(name);
  if(!legal||!['읍','면'].includes(legal.level))
    throw Error('Missing legal innovation-city sector '+name);
 }
 if(destinations[0]!=='충청북도 진천군 덕산읍'||
    destinations[1]!=='충청북도 음성군 맹동면')
  throw Error('Innovation city two-county location mismatch');
 const byFull=new Map(),paths=new Set();
 for(const item of source.rows){
  const r=regionByFullName.get(item.region);
  if(!r||!cities.some(x=>x.full_name===item.region)||byFull.has(item.region))
   throw Error('Unverified or repeated county '+item.region);
  if(!Array.isArray(item.local)||item.local.length!==2||
     new Set(item.local).size!==2||!Array.isArray(item.neighbors)||
     item.neighbors.length!==2||new Set(item.neighbors).size!==2||
     !Array.isArray(item.long)||item.long.length!==2||
     new Set(item.long).size!==2||
     typeof item.daeri!=='string'||item.daeri.length<85||
     typeof item.taksong!=='string'||item.taksong.length<85)
   throw Error('Missing region-specific service guidance '+item.region);
  for(const name of item.local)
   if(!regionByFullName.has(item.region+' '+name))
    throw Error('Unknown legal pickup/arrival area '+item.region+' '+name);
  for(const target of [...item.neighbors,...item.long])
   if(!regionByFullName.has(target)||target===item.region)
    throw Error('Unknown neighbor or long route '+item.region+' -> '+target);
  if(item.neighbors.some(x=>!x.startsWith(CB+' '))||
     item.long.some(x=>x.startsWith(CB+' ')))
    throw Error('Local/long categories incorrectly assigned '+item.region);
  byFull.set(item.region,Object.freeze({...item,region:r}));
  for(const kind of kinds)paths.add(servicePath(r,kind));
 }
 for(const r of cities)if(!byFull.has(r.full_name))
  throw Error('Missing official municipality '+r.full_name);
 for(const kind of kinds)paths.add(servicePath(hub,kind));
 if(paths.size!==24)throw Error('Must preserve exactly 24 existing Chungbuk service paths');
 const short=r=>r.full_name===CB?'충북':
  r.full_name==='대전광역시'?'대전':
  r.full_name==='서울특별시'?'서울':
  r.full_name==='부산광역시'?'부산':
  r.full_name==='대구광역시'?'대구':
  r.name.replace(/[시군]$/,'');
 const quote=(kind,from,to)=>'/fare/?service='+kind+
  '&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 const route=(kind,from,to,text,guide)=>{
  return '<a href="'+quote(kind,from,to)+'">'+esc(text+' 예상요금·거리 조회')+'</a>'+
   (guide?' · <a href="'+esc(servicePath(guide,kind))+'">'+
     esc(short(guide)+' '+label(kind)+' 기존 지역안내')+'</a>':'');
 };
 const junction=from=>from.startsWith('충청북도 진천군')?0:
  from.startsWith('충청북도 음성군')?1:-1;
 function bothInnovationDirections(region,kind){
  const current=region.full_name;
  return destinations.map((target,i)=>{
   const legal=regionByFullName.get(i===0?'충청북도 진천군':'충청북도 음성군');
   const place=i===0?'진천 덕산읍':'음성 맹동면';
   const descriptor=kind==='daeri'?'대리운전':'로드탁송';
   return '<li>'+route(kind,current,target,short(region)+'→충북혁신도시 '+place+' '+descriptor,legal)+
    ' · '+route(kind,target,current,'충북혁신도시 '+place+'→'+short(region)+' '+descriptor,region)+'</li>';
  }).join('');
 }
 function citySection(item,kind){
  const r=item.region,place=short(r),isCore=junction(r.full_name)!==-1;
  const close=item.neighbors.map(full=>{
   const target=regionByFullName.get(full);
   return '<li>'+route(kind,r.full_name,full,place+'→'+short(target)+
     (kind==='daeri'?' 인접지역대리운전':' 지역간탁송'),target)+'</li>';
  }).join('');
  const far=item.long.map(full=>{
   const target=regionByFullName.get(full);
   return '<li>'+route(kind,r.full_name,full,place+'→'+short(target)+
     (kind==='daeri'?' 장거리대리운전':' 장거리자동차탁송'),target)+'</li>';
  }).join('');
  const localFrom=r.full_name+' '+item.local[0],localTo=r.full_name+' '+item.local[1];
  const advice=kind==='daeri'
   ?'대리운전은 고객 차량 주차장의 정확한 출구, 출발 희망시각, 경유지와 기사 복귀 교통편을 확인합니다. 법인·단체 요청은 차량마다 다른 도착지와 결제 방식을 별도로 상담합니다.'
   :'차량탁송은 차종·차키 인수자·차량 주행 가능상태·출고 승인·도착지 수령인과 시간을 확인합니다. 공공기관이나 산업시설의 출입 승인 여부도 중요합니다.';
  const core=isCore?
   '<p><strong>충북혁신도시 핵심 출발지</strong>: 진천군 덕산읍과 음성군 맹동면은 같은 혁신도시 생활권이지만 서로 다른 군입니다. 건물과 차량의 정확한 소속 주소를 확인해야 합니다. 공공기관 근무자·법인차량은 실제 주차구역과 인계 담당자를 별도 확인합니다.</p>':'';
  return '<section id="chungbuk-innovation-corridors-20261123" aria-label="'+
    esc(r.full_name+' '+label(kind)+' 충북혁신도시 왕복·장거리 상담')+'">'+
   '<h2>'+esc(place+' '+label(kind)+' | 충북혁신도시·지역간·장거리 예약')+'</h2>'+
   '<h3>'+esc(place+(kind==='daeri'?' 지역대리운전·단거리대리운전':' 지역탁송·단거리로드탁송'))+'</h3>'+
   '<p>'+esc(item[kind])+'</p><p>'+esc(advice)+' 같은 시·군 안에서도 먼 읍면 이동은 단거리가 아닐 수 있습니다.</p>'+
   '<p>'+route(kind,localFrom,localTo,item.local[0]+'→'+item.local[1]+' '+label(kind),null)+'</p>'+
   core+
   '<h3>'+esc(place+(kind==='daeri'?' 인접지역대리운전':' 시군간 지역탁송'))+'</h3>'+
   '<p>주변 시·군 간 이동도 실제 주소·기사 접근·차량 출고시각에 따라 견적이 달라집니다.</p><ul>'+close+'</ul>'+
   '<h3>'+esc(place+' ↔ 충북혁신도시 '+(kind==='daeri'?'대리운전·법인·장거리 귀가':'탁송·공공기관 차량 인계'))+'</h3>'+
   '<p>충북혁신도시는 <strong>진천군 덕산읍 + 음성군 맹동면</strong> 두 지역으로 나뉩니다. 두 곳의 출발·도착 주소를 따로 입력하고 왕복 방향을 구분해 조회하세요. 거리만으로 배차·요금이 확정되는 것은 아닙니다.</p>'+
   '<ul>'+bothInnovationDirections(r,kind)+'</ul>'+
   '<h3>'+esc(place+' '+(kind==='daeri'?'서울·대전 등 장거리대리운전':'서울·대전 등 장거리자동차탁송'))+'</h3>'+
   '<p>장거리 운행은 기사 복귀, 통행료·경유지, 차량 수령 시각을 별도로 확인해야 합니다.</p><ul>'+far+'</ul>'+
   '<p>모든 구간은 <strong>고객 예상요금조회 입력 예시</strong>이며, 실제 스마트24 접수 오더·배차완료·운행완료·확정요금·기록 주행거리·상주기사의 증거가 아닙니다. 외부 도로거리 API 장애 시 자동 계산을 보장할 수 없으므로 상담으로 조건을 확인하세요.</p>'+
   '<p><a href="'+esc(servicePath(hub,kind))+'">충북 11개 시군 '+esc(label(kind))+' 안내</a> · '+
   '<a href="'+esc(servicePath(r,kind==='daeri'?'taksong':'daeri'))+'">'+esc(place+' '+label(kind==='daeri'?'taksong':'daeri')+' 안내')+'</a> · '+
   '<a href="tel:18114294">대표 상담 1811-4294</a></p></section>';
 }
 function provinceSection(kind){
  const regionLinks=[...byFull.values()].map(x=>'<li><a href="'+
   esc(servicePath(x.region,kind))+'">'+esc(short(x.region)+' '+label(kind))+'</a> — '+
   esc(x.local.join('·'))+' 출발, 충북혁신도시 왕복 및 지역간 이동 안내</li>').join('');
  const jin=regionByFullName.get('충청북도 진천군'),eum=regionByFullName.get('충청북도 음성군');
  return '<section id="chungbuk-innovation-hub-20261123" aria-label="'+
   esc('충북혁신도시 중심 충북 '+label(kind))+'">'+
   '<h2>'+esc('충북혁신도시 '+label(kind)+' | 진천 덕산읍·음성 맹동면')+'</h2>'+
   '<p>충북혁신도시는 진천군 덕산읍과 음성군 맹동면에 걸친 생활권입니다. 별도 시·군이 아니므로 차량 주차장 주소의 실제 진천·음성 관할을 확인합니다. 충북 3개 시·8개 군의 지역탁송·지역대리운전과 수도권·대전 장거리 연결을 안내합니다.</p>'+
   '<p><strong>진천 덕산읍 ↔ 음성 맹동면</strong> '+route(kind,destinations[0],destinations[1],'충북혁신도시 두 지역 이동 '+label(kind),eum)+
   ' · '+route(kind,destinations[1],destinations[0],'반대 방향 '+label(kind),jin)+'</p>'+
   '<h3>충북 11개 시·군 '+esc(label(kind))+' 지역별 연결</h3><ul>'+regionLinks+'</ul>'+
   '<p>해당 경로는 고객이 직접 입력하는 예상요금 조회 예시이며 실제 접수·완료 운행 또는 확정 가격이 아닙니다. 장거리 기사 복귀와 법인차량 인계 조건을 확인해야 합니다.</p>'+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(CB)+'">충북 출발 '+esc(label(kind))+' 요금조회</a> · <a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function regionSection(region,kind){
  if(!region||!kinds.includes(kind))return '';
  if(region.full_name===CB)return provinceSection(kind);
  const item=byFull.get(region.full_name);
  return item?citySection(item,kind):'';
 }
 function searchMeta(region,kind){
  if(!region||!kinds.includes(kind))return null;
  const isProvince=region.full_name===CB,entry=byFull.get(region.full_name);
  if(!isProvince&&!entry)return null;
  const s=short(region),core=junction(region.full_name)!==-1,isT=kind==='taksong';
  const title=isProvince?(
   isT?'충북탁송 | 충북혁신도시·진천덕산·음성맹동·장거리 차량탁송':
       '충북대리운전 | 충북혁신도시·청주·진천·음성·장거리대리운전'
  ):(
   isT?s+'탁송 | '+(core?'충북혁신도시 덕산읍·맹동면':'충북혁신도시')+'·지역간·장거리탁송':
       s+'대리운전 | '+(core?'충북혁신도시 덕산읍·맹동면':'충북혁신도시')+'·지역간·장거리'
  );
  const descPlace=isProvince?'충청북도(충북)':s;
  const description=isT?descPlace+' 지역탁송·자동차탁송. '+(entry?entry.local.join('·'):'충북 11개 시군')+
    ' 차량 인수, 진천 덕산읍↔음성 맹동면 충북혁신도시 양방향 및 서울·대전 장거리 로드탁송 예약 상담 1811-4294.'
   :descPlace+' 지역대리운전·단거리·법인·장거리대리운전. '+(entry?entry.local.join('·'):'충북 11개 시군')+
    ' 출발, 진천 덕산읍↔음성 맹동면 충북혁신도시 왕복과 청주·대전·서울 귀가 예약 상담 1811-4294.';
  if([...title].length>80)throw Error('Excessive SEO title for '+region.full_name);
  return {title,description};
 }
 return Object.freeze({sourceCount:byFull.size,canonicalPaths:[...paths],regionSection,searchMeta});
}
module.exports={create};
