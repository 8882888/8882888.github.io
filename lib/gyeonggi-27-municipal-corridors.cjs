'use strict';
// Gyeonggi 27 existing municipal canonicals (excluding Yongin, Hwaseong,
// Pyeongtaek and Anseong). Paths are examples for customer quotes, not rides.
const source=require('../data/gyeonggi-27-municipal-corridors-20261123.json');
const ROOT='경기도';
const kinds=['daeri','taksong'];
const excluded=new Set(['경기도 용인시','경기도 화성시','경기도 평택시','경기도 안성시']);
const service=kind=>kind==='daeri'?'대리운전':'자동차탁송';
const short=region=>{
 if(region.full_name===ROOT)return '경기도';
 if(region.full_name==='경기도 광주시')return '경기광주';
 if(region.full_name==='서울특별시')return '서울';
 if(region.full_name==='대전광역시')return '대전';
 if(region.full_name==='부산광역시')return '부산';
 if(region.full_name==='인천광역시')return '인천';
 return region.name.replace(/[시군]$/,'');
};
function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
    typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Gyeonggi 27 guide requires original legal region registry');
 const municipalities=regions.filter(r=>r.full_name.startsWith(ROOT+' ')&&['시','군'].includes(r.level));
 if(municipalities.length!==31||source.rows.length!==27||
    source.municipality_count!==27||source.exclusions.length!==4||
    source.exclusions.some(x=>!excluded.has(x))||source.exclusions.some(x=>!regionByFullName.has(x)))
  throw Error('Gyeonggi municipal count or four exclusions changed');
 const hub=regionByFullName.get(ROOT);
 if(!hub||hub.level!=='시도')throw Error('Missing Gyeonggi province canonical');
 const entries=new Map(),canonicalPaths=new Set();
 for(const row of source.rows){
  const r=regionByFullName.get(row.region);
  if(!r||!['시','군'].includes(r.level)||excluded.has(row.region)||
     !municipalities.some(v=>v.full_name===row.region)||entries.has(row.region))
   throw Error('Invalid or excluded Gyeonggi municipality '+row.region);
  if(!Array.isArray(row.local)||row.local.length!==2||new Set(row.local).size!==2||
     !Array.isArray(row.neighbors)||row.neighbors.length!==2||
     new Set(row.neighbors).size!==2||!Array.isArray(row.long)||row.long.length!==2||
     typeof row.daeri!=='string'||row.daeri.length<85||
     typeof row.taksong!=='string'||row.taksong.length<85)
   throw Error('Missing independently written local service advice '+row.region);
  for(const v of row.local)
   if(!regionByFullName.has(row.region+' '+v))
    throw Error('Unknown original legal pickup area '+row.region+' '+v);
  for(const name of row.neighbors)
   if(excluded.has(name)||name===row.region||!name.startsWith(ROOT+' ')||
      !regionByFullName.has(name))
    throw Error('Unverified or excluded internal route '+row.region+' → '+name);
  for(const name of row.long)
   if(name.startsWith(ROOT+' ')||!regionByFullName.has(name)||row.neighbors.includes(name))
    throw Error('Unverified external route '+row.region+' → '+name);
  entries.set(row.region,Object.freeze({...row,legalRegion:r}));
  for(const kind of kinds)canonicalPaths.add(servicePath(r,kind));
 }
 const included=municipalities.filter(r=>!excluded.has(r.full_name));
 if(included.length!==27||included.some(r=>!entries.has(r.full_name)))
  throw Error('Every included Gyeonggi city/county must have a unique local guide');
 for(const kind of kinds)canonicalPaths.add(servicePath(hub,kind));
 if(canonicalPaths.size!==56)throw Error('Expected existing 27x2 plus province 2 canonical routes');
 const quote=(kind,from,to)=>'/fare/?service='+kind+
  '&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 const link=(kind,from,to,caption,target)=>{
  const guide=target?' · <a href="'+esc(servicePath(target,kind))+'">'+
   esc(short(target)+' '+service(kind)+' 지역안내')+'</a>':'';
  return '<a href="'+quote(kind,from,to)+'">'+esc(caption+' 예상요금·거리 조회')+'</a>'+guide;
 };
 const note=kind=>kind==='daeri'
  ?'대리운전은 고객 차를 고객의 도착지까지 운전하는 서비스입니다. 실제 차량 주차장 출구, 경유지, 심야 출발 희망시각, 기사 복귀와 배차 가능 여부를 확인합니다.'
  :'로드탁송은 정상 운행 가능한 차량을 인수해 목적지에 전달합니다. 차키 전달자, 차량 주행 가능 여부, 출고 승인, 도착지 수령인·인계 가능시각을 확인합니다.';
 function citySection(entry,kind){
  const r=entry.legalRegion,name=short(r),isDaeri=kind==='daeri';
  const from=r.full_name+' '+entry.local[0],to=r.full_name+' '+entry.local[1];
  const neighbors=entry.neighbors.map(full=>{
   const v=regionByFullName.get(full),n=short(v);
   return '<li>'+link(kind,r.full_name,full,name+'→'+n+
      (isDaeri?' 지역간대리운전':' 지역간탁송'),v)+
    ' · '+link(kind,full,r.full_name,n+'→'+name+
      (isDaeri?' 지역대리운전':' 역방향탁송'),r)+'</li>';
  }).join('');
  const long=entry.long.map(full=>{
   const v=regionByFullName.get(full),n=short(v);
   return '<li>'+link(kind,r.full_name,full,name+'→'+n+
    (isDaeri?' 장거리대리운전':' 장거리자동차탁송'),v)+
    ' · '+link(kind,full,r.full_name,n+'→'+name+
    (isDaeri?' 장거리대리운전':' 장거리로드탁송'),r)+'</li>';
  }).join('');
  return '<section id="gyeonggi-27-municipal-corridors-20261123" aria-label="'+
    esc(r.full_name+' '+service(kind)+' 지역·장거리 안내')+'">'+
    '<h2>'+esc(name+(isDaeri?'대리운전':'탁송')+' | 지역'+(isDaeri?'대리운전':'탁송')+'·장거리 이동')+'</h2>'+
    '<h3>'+esc(name+' '+(isDaeri?'지역대리운전·단거리대리운전':'지역탁송·자동차탁송'))+'</h3>'+
    '<p>'+esc(entry[kind])+'</p>'+
    '<p>'+esc(note(kind))+' 같은 시·군 안에서도 먼 읍·면·구 이동은 단거리가 아닐 수 있습니다.</p>'+
    '<p>'+link(kind,from,to,entry.local[0]+'→'+entry.local[1]+' '+service(kind),null)+'</p>'+
    '<h3>'+esc(name+(isDaeri?' 지역간대리운전·왕복 방향별 상담':' 지역간탁송·양방향 차량 인계'))+'</h3>'+
    '<p>경기도 인접 생활권의 출발·도착을 바꾸면 기사 접근 및 인계 조건이 달라집니다. 각 방향의 예상요금을 개별 조회하세요.</p>'+
    '<ul>'+neighbors+'</ul>'+
    '<h3>'+esc(name+' '+(isDaeri?'장거리대리운전·법인대리운전':'장거리자동차탁송·법인차량 이동'))+'</h3>'+
    '<p>장거리 이동은 실제 도로거리·통행료, 출발 시간대, 차량 상태와 기사 복귀·인계 조건을 확인해야 합니다.</p><ul>'+long+'</ul>'+
    '<p>위 출발지·도착지는 <strong>직접 입력하는 예상요금 조회 예시</strong>이며, 접수·배차·완료된 실제 운행기록, 확정요금이나 기사 상주를 뜻하지 않습니다. 외부 거리 API 장애 시 자동요금계산을 보장할 수 없으며 상담 시 조건을 확인해야 합니다.</p>'+
    '<p><a href="'+esc(servicePath(hub,kind))+'">경기도 27개 시군 '+esc(service(kind))+' 안내</a> · '+
    '<a href="'+esc(servicePath(r,isDaeri?'taksong':'daeri'))+'">'+esc(name+' '+service(isDaeri?'taksong':'daeri')+' 안내')+'</a> · '+
    '<a href="tel:18114294">상담 1811-4294</a></p></section>';
 }
 function provinceSection(kind){
  const isDaeri=kind==='daeri';
  const municipal=source.rows.map(row=>{
   const r=regionByFullName.get(row.region);
   return '<li><a href="'+esc(servicePath(r,kind))+'">'+esc(short(r)+service(kind))+
    '</a> — '+esc(row.local.join('·')+' 지역 출발, 지역간·장거리 안내')+'</li>';
  }).join('');
  return '<section id="gyeonggi-27-municipal-hub-20261123" aria-label="'+
   esc('경기도 27개 시군 '+service(kind))+'">'+
   '<h2>경기도 '+esc(isDaeri?'지역대리운전·장거리대리운전':'지역탁송·자동차탁송')+' | 27개 시군</h2>'+
   '<p>용인시·화성시·평택시·안성시를 제외한 경기도 27개 시·군의 별도 안내입니다. 각 지역 생활권, 인근 시군 이동 및 서울·대전·부산 등 장거리 운행의 출발·도착 방향을 구분해 안내합니다. 이미 존재하는 지역 페이지로 연결하며 새 지점이나 실제 배차 후기를 만들어 내지 않습니다.</p>'+
   '<h3>경기도 27개 시·군 지역별 '+esc(service(kind))+' 검색</h3><ul>'+municipal+'</ul>'+
   '<p>모든 경로는 고객 예상요금조회 예시입니다. 실시간 기사배차, 거리 및 확정 요금이 보장되지 않으므로 차량이 있는 정확한 주소를 넣어 상담하세요.</p>'+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(ROOT)+'">경기도 '+esc(service(kind))+' 예상요금 조회</a> · <a href="tel:18114294">상담 1811-4294</a></p></section>';
 }
 function regionSection(region,kind){
  if(!region||!kinds.includes(kind))return '';
  if(region.full_name===ROOT)return provinceSection(kind);
  const entry=entries.get(region.full_name);
  return entry?citySection(entry,kind):'';
 }
 function searchMeta(region,kind){
  if(!region||!kinds.includes(kind))return null;
  const isHub=region.full_name===ROOT,entry=entries.get(region.full_name);
  if(!isHub&&!entry)return null;
  const isDaeri=kind==='daeri',place=short(region);
  const neighbor=entry?entry.neighbors.map(v=>short(regionByFullName.get(v))).join('·'):'27개 시군';
  const local=entry?entry.local.join('·'):'경기도 지역별';
  const title=isHub?
    (isDaeri?'경기도대리운전 | 27개 시군 지역대리운전·장거리대리운전':
       '경기도탁송 | 27개 시군 지역탁송·장거리자동차탁송'):
    (isDaeri?place+'대리운전 | 지역대리운전·'+neighbor+'·장거리대리운전':
       place+'탁송 | 지역탁송·'+neighbor+'·장거리자동차탁송');
  const description=isDaeri?
   place+' 지역대리운전·장거리대리운전. '+local+' 출발, '+neighbor+
   ' 양방향 지역간대리운전과 서울·대전 등 장거리 귀가 예약·요금 상담 1811-4294.':
   place+' 지역탁송·화물차·버스탁송. '+local+' 차량 인수, '+neighbor+
   ' 양방향 지역간탁송과 대전·부산 등 장거리로드탁송 인계·요금 상담 1811-4294.';
  if([...title].length>80||description.length<70||description.length>160)
    throw Error('Invalid SEO title/description length '+region.full_name+' '+kind+' '+description.length);
  return {title,description};
 }
 return Object.freeze({sourceCount:entries.size,canonicalPaths:[...canonicalPaths],regionSection,searchMeta});
}
module.exports={create};
