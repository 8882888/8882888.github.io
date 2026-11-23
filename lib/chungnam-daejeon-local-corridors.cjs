'use strict';
// Locality-specific search/help guidance. Route links are quote inputs, not completed orders.
const source=require('../data/chungnam-daejeon-local-corridors-20261123.json');
const CH='충청남도',DJ='대전광역시';
const serviceName=kind=>kind==='daeri'?'대리운전':'자동차탁송';

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
    typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Chungnam/Daejeon guides require verified official regions');
 const gbAll=regions.filter(r=>r.full_name.startsWith(CH+' ')&&
   (r.level==='시'||r.level==='군'));
 const daAll=regions.filter(r=>r.full_name.startsWith(DJ+' ')&&
   (r.level==='구'||r.level==='군'));
 if(gbAll.length!==15||daAll.length!==5||
    source.chungnam.length!==15||source.daejeon.length!==5)
  throw Error('Official regional coverage must be 15 Chungnam plus nine Daejeon');
 const byName=new Map(),paths=new Set();
 const supported=[...gbAll,...daAll],fullSet=new Set(supported.map(r=>r.full_name));
 for(const item of [...source.chungnam,...source.daejeon]){
  const r=regionByFullName.get(item.region);
  if(!r||!fullSet.has(item.region)||byName.has(item.region))
   throw Error('Region is missing or repeated: '+item.region);
  if(!Array.isArray(item.local)||item.local.length!==2||
     item.local[0]===item.local[1]||
     typeof item.daeri!=='string'||item.daeri.length<85||
     typeof item.taksong!=='string'||item.taksong.length<85||
     !Array.isArray(item.long)||item.long.length!==2)
   throw Error('Missing distinct source guidance '+item.region);
  for(const sub of item.local)if(!regionByFullName.has(item.region+' '+sub))
   throw Error('No verified sub-area '+item.region+' '+sub);
  for(const dest of [
   ...item.long,
   ...(item.neighbors||[]),
   ...(item.metroNeighbors||[]),
   ...(item.chungnam||[]),
   ...(item.daejeon?[item.daejeon]:[])
  ])if(!regionByFullName.has(dest)||dest===item.region)
   throw Error('No official target area '+item.region+' -> '+dest);
  if(item.region.startsWith(CH+' ')){
   if(!item.daejeon.startsWith(DJ+' ')||item.neighbors.length!==2)
    throw Error('Every Chungnam locality must have a Daejeon link and two region neighbors');
  } else if(
    item.region.startsWith(DJ+' ')&&
    (item.chungnam.length!==2||item.metroNeighbors.length!==2)
   )throw Error('Every Daejeon district/county needs two Chungnam destinations and two metro neighbors');
  byName.set(item.region,Object.freeze({...item,region:r}));
  for(const kind of ['daeri','taksong'])paths.add(servicePath(r,kind));
 }
 for(const r of supported)if(!byName.has(r.full_name))
  throw Error('Missing local source guidance '+r.full_name);
 for(const full of [CH,DJ]){
  const province=regionByFullName.get(full);
  if(!province||province.level!=='시도')throw Error('Missing official province '+full);
  for(const kind of ['daeri','taksong'])paths.add(servicePath(province,kind));
 }
 if(paths.size!==44)throw Error('Must preserve only 44 pre-existing regional service canonical paths');
 const small=r=>r.full_name===CH?'충남':r.full_name===DJ?'대전':
  r.full_name.startsWith(DJ+' ')?'대전'+r.name.replace(/[군구]$/,''):
  r.name.replace(/[시군]$/,'');
 const query=(kind,from,to)=>'/fare/?service='+kind+'&amp;from='+
  encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 const label=r=>small(r);
 function linkPair(kind,from,to,destination,term,{island=false}={}){
 return '<a href="'+query(kind,from,to)+'">'+esc(term+' 요금조회')+'</a>'+
   ' · <a href="'+esc(servicePath(destination,kind))+'">'+
   esc(label(destination)+' '+serviceName(kind)+' 기존 지역안내')+'</a>';
 }
 const line=(kind,from,to,dest,term,flag=false)=>
  '<li>'+linkPair(kind,from,to,dest,term,{island:flag})+'</li>';
 function municipal(item,kind){
  const r=item.region,isG=r.full_name.startsWith(CH+' '),short=small(r);
  const island=false,kindLabel=serviceName(kind);
  const localFrom=r.full_name+' '+item.local[0],localTo=r.full_name+' '+item.local[1];
  const localText=item.local[0]+' → '+item.local[1]+' '+kindLabel;
  const advice=kind==='daeri'
   ?'대리운전은 고객 차량과 고객의 이동 조건을 확인합니다. 차량 주차장 출입구, 출발 희망시간과 기사 복귀 가능 여건을 알려주세요.'
   :'자동차탁송은 차량을 인수·인계하는 운송입니다. 출고 승인, 차량 주행 가능 여부, 차키 전달자와 도착지 수령인이 먼저 확인되어야 합니다.';
  const closeList=isG
   ?item.neighbors.map(name=>{
     const dest=regionByFullName.get(name);
     return line(kind,r.full_name,name,dest,short+'→'+small(dest)+
      (kind==='daeri'?' 인접지역대리운전':' 지역간탁송'),island);
    }).join('')
   :item.metroNeighbors.map(name=>{
     const dest=regionByFullName.get(name);
     return line(kind,r.full_name,name,dest,short+'→'+small(dest)+
      (kind==='daeri'?' 대전 시내대리운전':' 대전 지역탁송'));
    }).join('');
  const coreRows=isG?[item.daejeon]:item.chungnam;
  const daeguAndChungnam=coreRows.map(full=>{
    const dest=regionByFullName.get(full),islandRoute=island;
    return '<li>'+linkPair(kind,r.full_name,full,dest,
     short+'→'+small(dest)+(kind==='daeri'?' 장거리대리운전':' 자동차탁송'),
     {island:islandRoute})+
     (islandRoute?'':' · <a href="'+query(kind,full,r.full_name)+'">'+
      esc(small(dest)+'→'+short+(kind==='daeri'?' 대리운전':' 역방향탁송')+' 요금조회')+'</a>')+
     '</li>';
  }).join('');
  const otherProvince=regionByFullName.get(isG?DJ:CH);
  const crossProvince=isG
    ?line(kind,r.full_name,DJ,otherProvince,short+'→대전 '+
       (kind==='daeri'?'장거리대리운전':'지역간탁송'),island)
    :line(kind,r.full_name,CH,otherProvince,short+'→충남 '+
       (kind==='daeri'?'장거리대리운전':'지역간탁송'));
  const beyond=item.long.map(full=>{
    const dest=regionByFullName.get(full);
    return line(kind,r.full_name,full,dest,short+'→'+small(dest)+
     (kind==='daeri'?' 장거리대리운전':' 장거리탁송'),island);
  }).join('');
  const localPart='<h3>'+esc(short+' '+(kind==='daeri'?'단거리·지역대리운전':'지역탁송·단거리자동차탁송'))+'</h3>'+
   '<p>'+esc(item[kind])+'</p>'+
   '<p>'+esc(advice)+' 같은 시·군·구 안에서도 외곽 읍면동으로 멀리 이동하면 단거리로 보지 않을 수 있습니다.</p>'+
   '<p><a href="'+query(kind,localFrom,localTo)+'">'+
    esc(localText+' 출발·도착 예상요금 조회')+'</a></p>';
  const ferryNotice='';
  return '<section id="chungnam-daejeon-corridors-20261123" aria-label="'+
   esc(r.full_name+' '+kindLabel+' 단거리·인접지역·대전충남 장거리 이동')+'">'+
   '<h2>'+esc(short+kindLabel+' | 대전·충남 지역간 이동과 장거리 예약')+'</h2>'+
   localPart+
   '<h3>'+esc(short+' 인접지역'+(kind==='daeri'?'대리운전':'탁송'))+'</h3>'+
   '<p>인근 생활권도 기사 접근·복귀와 차량 인계 위치에 따라 별도의 예약 조건이 있습니다. 목적지는 실제 주차장 주소로 조정해야 합니다.</p><ul>'+closeList+'</ul>'+
   '<h3>'+esc(short+' '+(isG?'대전':'충남')+' 양방향 '+
     (kind==='daeri'?'대리운전·장거리대리운전':'지역간탁송·자동차탁송'))+'</h3>'+
   '<p>대전광역시와 충남 지역을 오가는 출발→도착·도착→출발 양방향 수요를 구분합니다. 실제 기사 접근과 귀환·차량 인계를 확인하기 전에는 배차확정이 아닙니다.</p><ul>'+daeguAndChungnam+crossProvince+'</ul>'+
   '<h3>'+esc(short+' '+(kind==='daeri'?'수도권·부산 장거리대리운전':'서울·부산 등 장거리탁송'))+'</h3>'+
   '<p>장거리 운행은 출발·도착 시각, 통행료, 기사 복귀 교통편, 차량 상태와 최종 인수자 일정을 확인해야 합니다.</p><ul>'+beyond+'</ul>'+
   ferryNotice+
   '<p>위 경로는 <strong>고객이 요금을 조회하기 위한 이동 예시</strong>입니다. 실제 스마트24 접수·배차완료·운행완료·확정요금·주행거리 증거가 아니며, 지역 기사 상주를 보장하지 않습니다.</p>'+
   '<p><a href="'+esc(servicePath(r,kind==='daeri'?'taksong':'daeri'))+'">'+
    esc(short+' '+serviceName(kind==='daeri'?'taksong':'daeri')+' 안내')+'</a> · '+
   '<a href="tel:18114294">1811-4294 예약·상담</a></p>'+
   '</section>';
 }
 function hub(r,kind){
  const isG=r.full_name===CH,entries=isG?source.chungnam:source.daejeon,
   title=isG?'충남 15개 시·군':'대전 5개 자치구';
  const links=entries.map(item=>{
   const rr=regionByFullName.get(item.region);
   return '<li><a href="'+esc(servicePath(rr,kind))+'">'+
    esc(small(rr)+serviceName(kind))+'</a> — '+esc(item.local.join('·'))+
    ' 출발, 대전↔충남 지역간 이동·장거리 '+esc(serviceName(kind))+' 요금조회</li>';
  }).join('');
  const other=regionByFullName.get(isG?DJ:CH);
  const keyword=kind==='daeri'?(isG?'충남대리운전·충청남도장거리대리운전':'대전충남대리운전·대전장거리대리운전'):
   (isG?'충남탁송·충청남도탁송·대전충남지역간탁송':'대전탁송·대전광역시탁송·대전충남자동차탁송');
  return '<section id="chungnam-daejeon-regional-hub-20261123" aria-label="'+esc(title+' '+serviceName(kind))+'">'+
   '<h2>'+esc(keyword+' | '+title+' 예약과 예상요금')+'</h2>'+
   '<p>충남 15개 시·군과 대전 5개 자치구은 서로 다른 광역 행정구역입니다. 대전에서 계룡·공주·금산·논산·천안 등 충남으로 출발하는 구간과 충남에서 대전로 들어오는 구간을 구분해 '+esc(serviceName(kind))+' 요금조회·예약 정보를 제공합니다.</p>'+
   '<p>대전 도심 단거리 호출, 충남 시군 간 지역간 이동, 수도권·부산 등 장거리 운행은 차량 인수·인계와 기사 복귀조건이 다릅니다. 충남 해안·항만 차량 출고는 승인과 수령인 가능 시간을 따로 확인합니다.</p>'+
   '<h3>'+esc(title+' '+serviceName(kind)+' 지역별 안내')+'</h3><ul>'+links+'</ul>'+
   '<p><a href="'+esc(servicePath(other,kind))+'">'+esc(small(other)+' '+serviceName(kind)+' 생활권 안내')+'</a> · '+
   '<a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">'+esc(keyword+' 출발지 직접 요금조회')+'</a> · '+
   '<a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function regionSection(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return '';
  if(r.full_name===CH||r.full_name===DJ)return hub(r,kind);
  const item=byName.get(r.full_name);
  return item?municipal(item,kind):'';
 }
 function searchMeta(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return null;
  const full=r.full_name,isG=full===CH,isD=full===DJ,
   item=byName.get(full);
  if(!isG&&!isD&&!item)return null;
  const name=small(r),isT=kind==='taksong',prefix=isG?'충남':isD?'대전':name;
  const title=isT?(
   isG?'충남탁송 | 충청남도탁송·대전충남지역간탁송·장거리 자동차탁송':
   isD?'대전탁송 | 대전광역시탁송·충남지역간탁송·장거리 차량탁송':
   prefix+'탁송 | 대전충남 지역간탁송·장거리 자동차탁송'
  ):(
   isG?'충남대리운전 | 시군 간 대리운전·대전 장거리대리운전':
   isD?'대전대리운전 | 충남 인접지역·장거리대리운전':
   prefix+'대리운전 | 대전충남 지역간·장거리대리운전'
  );
  const summary=item?item.local.join('·'):(isG?'15개 시군':'5개 구군');
  const description=isT
   ?prefix+' 지역탁송·로드탁송. '+summary+' 차량 인수·인계, 대전↔충남 양방향 차량탁송과 서울·부산 장거리탁송 출발·도착 예상요금·예약 상담 1811-4294.'
   :prefix+' 지역대리운전·인접지역대리운전·장거리대리운전. '+summary+' 출발, 대전↔충남 양방향 이동·수도권 귀가·기사 복귀조건과 예약 상담 1811-4294.';
  if([...title].length>80)throw Error('Too long Chungnam/Daejeon title '+r.full_name);
  return {title,description};
 }
 return Object.freeze({sourceCount:byName.size,canonicalPaths:[...paths],regionSection,searchMeta});
}
module.exports={create};
