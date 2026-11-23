'use strict';
// Locality-specific search/help guidance. Route links are quote inputs, not completed orders.
const source=require('../data/gyeongbuk-daegu-bidirectional-20261123.json');
const GB='경상북도',DG='대구광역시';
const serviceName=kind=>kind==='daeri'?'대리운전':'자동차탁송';

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
    typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Gyeongbuk/Daegu guides require verified official regions');
 const gbAll=regions.filter(r=>r.full_name.startsWith(GB+' ')&&
   (r.level==='시'||r.level==='군'));
 const daAll=regions.filter(r=>r.full_name.startsWith(DG+' ')&&
   (r.level==='구'||r.level==='군'));
 if(gbAll.length!==22||daAll.length!==9||
    source.gyeongbuk.length!==22||source.daegu.length!==9)
  throw Error('Official regional coverage must be 22 Gyeongbuk plus nine Daegu');
 const byName=new Map(),paths=new Set();
 const supported=[...gbAll,...daAll],fullSet=new Set(supported.map(r=>r.full_name));
 for(const item of [...source.gyeongbuk,...source.daegu]){
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
   ...(item.gyeongbuk||[]),
   ...(item.daegu?[item.daegu]:[])
  ])if(!regionByFullName.has(dest)||dest===item.region)
   throw Error('No official target area '+item.region+' -> '+dest);
  if(item.region.startsWith(GB+' ')){
   if(!item.daegu.startsWith(DG+' ')||item.neighbors.length!==2)
    throw Error('Every Gyeongbuk locality must have a Daegu link and two region neighbors');
   if(Boolean(item.requires_ferry)!==(item.region===GB+' 울릉군'))
    throw Error('Ulleung requires island-specific ferry workflow');
  } else if(
    item.region.startsWith(DG+' ')&&
    (item.gyeongbuk.length!==2||item.metroNeighbors.length!==2)
   )throw Error('Every Daegu district/county needs two Gyeongbuk destinations and two metro neighbors');
  byName.set(item.region,Object.freeze({...item,region:r}));
  for(const kind of ['daeri','taksong'])paths.add(servicePath(r,kind));
 }
 for(const r of supported)if(!byName.has(r.full_name))
  throw Error('Missing local source guidance '+r.full_name);
 for(const full of [GB,DG]){
  const province=regionByFullName.get(full);
  if(!province||province.level!=='시도')throw Error('Missing official province '+full);
  for(const kind of ['daeri','taksong'])paths.add(servicePath(province,kind));
 }
 if(paths.size!==66)throw Error('Must preserve only 66 pre-existing regional service canonical paths');
 const small=r=>r.full_name===GB?'경북':r.full_name===DG?'대구':
  r.full_name.startsWith(DG+' ')?'대구'+r.name.replace(/[군구]$/,''):
  r.name.replace(/[시군]$/,'');
 const query=(kind,from,to)=>'/fare/?service='+kind+'&amp;from='+
  encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 const label=r=>small(r);
 function linkPair(kind,from,to,destination,term,{island=false}={}){
  if(island){
   return '<a href="'+esc(servicePath(destination,kind))+'">'+
    esc(label(destination)+' '+serviceName(kind)+' 안내')+'</a> · '+
    '<a href="tel:18114294">'+esc(term+' 선박 연계 가능여부·별도 운송 상담')+'</a>'+
    ' (도서 구간 육지 연결 도로요금 계산 불가)';
  }
  return '<a href="'+query(kind,from,to)+'">'+esc(term+' 요금조회')+'</a>'+
   ' · <a href="'+esc(servicePath(destination,kind))+'">'+
   esc(label(destination)+' '+serviceName(kind)+' 기존 지역안내')+'</a>';
 }
 const line=(kind,from,to,dest,term,flag=false)=>
  '<li>'+linkPair(kind,from,to,dest,term,{island:flag})+'</li>';
 function municipal(item,kind){
  const r=item.region,isG=r.full_name.startsWith(GB+' '),short=small(r);
  const island=Boolean(item.requires_ferry),kindLabel=serviceName(kind);
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
      (kind==='daeri'?' 대구 시내대리운전':' 대구 지역탁송'));
    }).join('');
  const coreRows=isG?[item.daegu]:item.gyeongbuk;
  const daeguAndGyeongbuk=coreRows.map(full=>{
    const dest=regionByFullName.get(full),islandRoute=island;
    return '<li>'+linkPair(kind,r.full_name,full,dest,
     short+'→'+small(dest)+(kind==='daeri'?' 장거리대리운전':' 자동차탁송'),
     {island:islandRoute})+
     (islandRoute?'':' · <a href="'+query(kind,full,r.full_name)+'">'+
      esc(small(dest)+'→'+short+(kind==='daeri'?' 대리운전':' 역방향탁송')+' 요금조회')+'</a>')+
     '</li>';
  }).join('');
  const otherProvince=regionByFullName.get(isG?DG:GB);
  const crossProvince=isG
    ?line(kind,r.full_name,DG,otherProvince,short+'→대구 '+
       (kind==='daeri'?'장거리대리운전':'지역간탁송'),island)
    :line(kind,r.full_name,GB,otherProvince,short+'→경북 '+
       (kind==='daeri'?'장거리대리운전':'지역간탁송'));
  const beyond=item.long.map(full=>{
    const dest=regionByFullName.get(full);
    return line(kind,r.full_name,full,dest,short+'→'+small(dest)+
     (kind==='daeri'?' 장거리대리운전':' 장거리탁송'),island);
  }).join('');
  const localPart='<h3>'+esc(short+' '+(kind==='daeri'?'단거리·지역대리운전':'지역탁송·단거리자동차탁송'))+'</h3>'+
   '<p>'+esc(item[kind])+'</p>'+
   '<p>'+esc(advice)+' 시·군 내부라도 먼 면 지역 이동은 반드시 단거리가 아닙니다.</p>'+
   '<p><a href="'+query(kind,localFrom,localTo)+'">'+
    esc(localText+' 출발·도착 예상요금 조회')+'</a></p>';
  const ferryNotice=island
   ?'<p><strong>울릉도 도서·선박 주의</strong>: 울릉도와 포항·영덕·대구 사이에는 육지 도로가 직접 이어지지 않습니다. 승객 이동 또는 차량 선적 가능한 배편, 항만 인수·인계 및 운항 일정부터 따로 확인하세요. 섬·육지 간 일반 도로요금이나 즉시 배차를 주장하지 않습니다.</p>'
   :'';
  return '<section id="gyeongbuk-daegu-bidirectional-20261123" aria-label="'+
   esc(r.full_name+' '+kindLabel+' 단거리·인접지역·대구경북 장거리 이동')+'">'+
   '<h2>'+esc(short+kindLabel+' | 대구·경북 지역간 이동과 장거리 예약')+'</h2>'+
   localPart+
   '<h3>'+esc(short+' 인접지역'+(kind==='daeri'?'대리운전':'탁송'))+'</h3>'+
   '<p>인근 생활권도 기사 접근·복귀와 차량 인계 위치에 따라 별도의 예약 조건이 있습니다. 목적지는 실제 주차장 주소로 조정해야 합니다.</p><ul>'+closeList+'</ul>'+
   '<h3>'+esc(short+' '+(isG?'대구':'경북')+' 양방향 '+
     (kind==='daeri'?'대리운전·장거리대리운전':'지역간탁송·자동차탁송'))+'</h3>'+
   '<p>대구광역시와 경북 지역을 오가는 출발→도착·도착→출발 양방향 수요를 구분합니다. 실제 기사 접근과 귀환·차량 인계를 확인하기 전에는 배차확정이 아닙니다.</p><ul>'+daeguAndGyeongbuk+crossProvince+'</ul>'+
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
  const isG=r.full_name===GB,entries=isG?source.gyeongbuk:source.daegu,
   title=isG?'경북 22개 시·군':'대구 9개 구·군';
  const links=entries.map(item=>{
   const rr=regionByFullName.get(item.region);
   return '<li><a href="'+esc(servicePath(rr,kind))+'">'+
    esc(small(rr)+serviceName(kind))+'</a> — '+esc(item.local.join('·'))+
    ' 출발, 대구↔경북 지역간 이동·장거리 '+esc(serviceName(kind))+' 요금조회</li>';
  }).join('');
  const other=regionByFullName.get(isG?DG:GB);
  const keyword=kind==='daeri'?(isG?'경북대리운전·경상북도장거리대리운전':'대구경북대리운전·대구장거리대리운전'):
   (isG?'경북탁송·경상북도탁송·대구경북지역간탁송':'대구탁송·대구시탁송·대구경북자동차탁송');
  return '<section id="gyeongbuk-daegu-regional-hub-20261123" aria-label="'+esc(title+' '+serviceName(kind))+'">'+
   '<h2>'+esc(keyword+' | '+title+' 예약과 예상요금')+'</h2>'+
   '<p>경북 22개 시·군과 대구 9개 구·군은 서로 다른 광역 행정구역입니다. 대구에서 경산·구미·칠곡·영천·청도 등 경북으로 출발하는 구간과 경북에서 대구로 들어오는 구간을 구분해 '+esc(serviceName(kind))+' 요금조회·예약 정보를 제공합니다.</p>'+
   '<p>대구 도심 단거리 호출, 경북 시군 간 지역간 이동, 수도권·부산 등 장거리 운행은 차량 인수·인계와 기사 복귀조건이 다릅니다. 울릉도는 선박 연계 가능 여부를 확인하기 전까지 육지 도로요금을 안내하지 않습니다.</p>'+
   '<h3>'+esc(title+' '+serviceName(kind)+' 지역별 안내')+'</h3><ul>'+links+'</ul>'+
   '<p><a href="'+esc(servicePath(other,kind))+'">'+esc(small(other)+' '+serviceName(kind)+' 생활권 안내')+'</a> · '+
   '<a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">'+esc(keyword+' 출발지 직접 요금조회')+'</a> · '+
   '<a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function regionSection(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return '';
  if(r.full_name===GB||r.full_name===DG)return hub(r,kind);
  const item=byName.get(r.full_name);
  return item?municipal(item,kind):'';
 }
 function searchMeta(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return null;
  const full=r.full_name,isG=full===GB,isD=full===DG,
   item=byName.get(full);
  if(!isG&&!isD&&!item)return null;
  const name=small(r),isT=kind==='taksong',prefix=isG?'경북':isD?'대구':name;
  const title=isT?(
   isG?'경북탁송 | 경상북도탁송·대구경북지역간탁송·장거리 자동차탁송':
   isD?'대구탁송 | 대구시탁송·경북지역간탁송·장거리 차량탁송':
   prefix+'탁송 | 대구경북 지역간탁송·장거리 자동차탁송'
  ):(
   isG?'경북대리운전 | 시군 간 대리운전·대구 장거리대리운전':
   isD?'대구대리운전 | 경북 인접지역·장거리대리운전':
   prefix+'대리운전 | 대구경북 지역간·장거리대리운전'
  );
  const summary=item?item.local.join('·'):(isG?'22개 시군':'9개 구군');
  const description=isT
   ?prefix+' 지역탁송·로드탁송. '+summary+' 차량 인수·인계, 대구↔경북 양방향 차량탁송과 서울·부산 장거리탁송 출발·도착 예상요금·예약 상담 1811-4294.'
   :prefix+' 지역대리운전·인접지역대리운전·장거리대리운전. '+summary+' 출발, 대구↔경북 양방향 이동·수도권 귀가·기사 복귀조건과 예약 상담 1811-4294.';
  if([...title].length>80)throw Error('Too long Gyeongbuk/Daegu title '+r.full_name);
  return {title,description};
 }
 return Object.freeze({sourceCount:byName.size,canonicalPaths:[...paths],regionSection,searchMeta});
}
module.exports={create};
