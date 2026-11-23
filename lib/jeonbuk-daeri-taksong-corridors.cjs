'use strict';
// Jeonbuk: customer booking and handover guidance. Not observed ride/order/fare evidence.
const source=require('../data/jeonbuk-daeri-taksong-local-corridors-20261123.json');
const PROVINCE='전북특별자치도';

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
    typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Jeonbuk local guides require canonical region objects');
 const official=regions.filter(r=>r.full_name.startsWith(PROVINCE+' ')&&
   ['시','군'].includes(r.level));
 if(official.length!==14||source.rows.length!==14)
  throw Error('Jeonbuk guide must cover the official six cities and eight counties');
 const byFull=new Map(),paths=new Set();
 for(const item of source.rows){
  const region=regionByFullName.get(item.region);
  if(!region||!official.some(r=>r.full_name===item.region)||byFull.has(item.region))
   throw Error('Invalid or duplicate Jeonbuk region '+item.region);
  if(!Array.isArray(item.local)||item.local.length!==2||
     new Set(item.local).size!==2||!Array.isArray(item.nearby)||
     item.nearby.length!==2||!Array.isArray(item.long)||item.long.length!==2||
     typeof item.daeri!=='string'||item.daeri.length<75||
     typeof item.taksong!=='string'||item.taksong.length<75)
   throw Error('Missing distinct regional content '+item.region);
  for(const place of item.local){
   const full=item.region+' '+place;
   if(!regionByFullName.has(full))
    throw Error('Unknown pickup/destination place '+full);
  }
  for(const distant of [...item.nearby,...item.long]){
   if(!regionByFullName.has(distant)||distant===item.region)
    throw Error('Unknown target or same-origin region '+distant);
  }
  if(item.nearby.some(t=>!t.startsWith(PROVINCE+' '))||
     item.long.some(t=>t.startsWith(PROVINCE+' ')))
   throw Error('Local/long-distance target mixed '+item.region);
  byFull.set(item.region,Object.freeze({...item,region}));
  for(const kind of ['daeri','taksong'])paths.add(servicePath(region,kind));
 }
 for(const r of official)if(!byFull.has(r.full_name))
  throw Error('Jeonbuk city or county missing '+r.full_name);
 const province=regionByFullName.get(PROVINCE);
 if(!province||province.level!=='시도')
  throw Error('Jeonbuk province canonical not found');
 for(const kind of ['daeri','taksong'])paths.add(servicePath(province,kind));
 const service=kind=>kind==='daeri'?'대리운전':'자동차탁송';
 const short=r=>r.full_name===PROVINCE?'전북':
  r.name.replace(/[시군]$/,'');
 const destLabel=r=>r.full_name==='광주광역시'?'광주(종전 광주광역시)':
  r.full_name==='서울특별시'?'서울':
  r.full_name==='대전광역시'?'대전':
  r.full_name==='대구광역시'?'대구':
  r.full_name==='부산광역시'?'부산':short(r);
 const fare=(kind,from,to)=>'/fare/?service='+kind+
  '&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 const link=(kind,from,to,text,target)=>{
  return '<a href="'+fare(kind,from,to)+'">'+esc(text)+'</a>'+
   (target?' · <a href="'+esc(servicePath(target,kind))+'">'+
     esc(destLabel(target)+' '+service(kind)+' 지역정보')+'</a>':'');
 };
 function municipality(row,kind){
  const r=row.region,place=short(r),label=service(kind),other=kind==='daeri'?'taksong':'daeri';
  const from=r.full_name+' '+row.local[0],to=r.full_name+' '+row.local[1];
  const exampleText=row.local[0]+' → '+row.local[1]+' '+label+' 요금·거리 조회';
  const near=row.nearby.map(full=>{
   const target=regionByFullName.get(full);
   return '<li>'+link(kind,r.full_name,full,place+'→'+short(target)+' '+
     (kind==='daeri'?'인접지역대리운전':'인접지역탁송')+' 예상요금',target)+'</li>';
  }).join('');
  const long=row.long.map(full=>{
   const target=regionByFullName.get(full);
   return '<li>'+link(kind,r.full_name,full,place+'→'+destLabel(target)+' '+
    (kind==='daeri'?'장거리대리운전':'장거리자동차탁송')+' 예상요금',target)+'</li>';
  }).join('');
  const advice=kind==='daeri'
   ?'고객이 차량에 동승하는 대리운전은 기사와 만나는 주차장·층수, 출발 희망시각, 경유지 및 기사 귀환 조건을 확인해야 합니다.'
   :'고객 없이 차량을 인계하는 로드탁송은 차량 운행 가능상태, 키 전달 담당자, 출고 승인, 도착지 수령인과 인수 가능시각을 확인해야 합니다.';
  const localTitle=kind==='daeri'?'단거리대리운전·지역대리운전':'지역탁송·단거리자동차탁송';
  const nearbyTitle=kind==='daeri'?'인접지역대리운전':'인접지역탁송';
  const longTitle=kind==='daeri'?'장거리대리운전':'장거리탁송·로드탁송';
  const scenarioNote=r.full_name==='전북특별자치도 무주군'
   ?'<p>산행 연계 검색어: <strong>무주탁송·덕유산탁송·육십령탁송</strong>. 덕유산 설천면과 육십령(장수·함양권)은 서로 다른 장소로, 산행 일정·차량 인계·복귀 교통편을 구분합니다.</p>'
   :'';
  return '<section id="jeonbuk-mobility-corridors-20261123" aria-label="'+
   esc(r.full_name+' '+label+' 단거리·인접지역·장거리 이동 예약 안내')+'">'+
   '<h2>'+esc(place+label+' | 지역별·인접지역·장거리 예약 안내')+'</h2>'+
   '<h3>'+esc(place+' '+localTitle)+'</h3><p>'+esc(row[kind])+'</p>'+
   '<p>'+esc(advice)+' 같은 시군 안에서도 출발·도착 거리에 따라 단거리가 아닐 수 있습니다.</p>'+
   '<p>'+link(kind,from,to,exampleText,null)+'</p>'+
   '<h3>'+esc(place+' '+nearbyTitle)+'</h3>'+
   '<p>실제 차량 위치가 다르면 같은 지역이라도 접근 여건과 견적이 달라집니다. 아래는 인접 시군으로 이동하려는 고객이 목적지 입력을 시작할 수 있는 예시입니다.</p><ul>'+near+'</ul>'+
   '<h3>'+esc(place+' '+longTitle)+'</h3>'+
   '<p>광주·대전·서울·부산·대구 방면의 장거리 운행은 기사 접근·복귀, 통행료, 출발 시간대와 도착지 인계 조건에 따라 견적과 예약 가능 여부가 다릅니다.</p><ul>'+long+'</ul>'+
   scenarioNote+
   '<p>위 경로는 <strong>이용 준비 및 요금조회 예시</strong>이며, 실제 스마트24 접수 오더·배차완료·운행완료·현재 확정요금 또는 주행거리의 증거가 아닙니다. 광주광역시는 종전 지명을 사용하는 기존 검색 URL이며 현재 광역단위 명칭은 전남광주통합특별시입니다.</p>'+
   '<p><a href="'+esc(servicePath(r,other))+'">'+esc(place+service(other)+' 기존 지역 안내')+'</a> · '+
   '<a href="'+esc(servicePath(province,kind))+'">'+esc('전북 14개 시군 '+label+' 안내')+'</a> · '+
   '<a href="/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(r.name)+'">기존 원본 운행기록 별도 검색</a> · '+
   '<a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function provinceHub(kind){
  const label=service(kind);
  const rows=[...byFull.values()].map(row=>'<li><a href="'+esc(servicePath(row.region,kind))+'">'+
   esc(short(row.region)+label)+'</a> — '+esc(row.local.join('·'))+
   ' 단거리·인접지역·장거리 '+esc(label)+' 요금조회</li>').join('');
  const prefix=kind==='daeri'?'전북대리운전·전라북도대리운전':
   '전북탁송·전라북도탁송·전북특별자치도자동차탁송';
  return '<section id="jeonbuk-14-city-county-service-hub-20261123" aria-label="'+esc(prefix)+'">'+
   '<h2>'+esc(prefix+' | 14개 시·군 지역별 예상요금·예약')+'</h2>'+
   '<p>현행 명칭 <strong>전북특별자치도</strong>(2024년 1월 18일 출범)와 기존 검색어 전라북도를 함께 안내합니다. 전주·군산·익산·정읍·김제·남원 및 8개 군에서 단거리대리운전·인접지역대리운전·장거리대리운전, 지역탁송·로드탁송을 구분합니다.</p>'+
   '<p>광주·대전·서울·부산·대구 방면은 각 기존 시·군 페이지의 거리·요금조회 링크에서 출발지와 도착지를 직접 조정할 수 있습니다. 지역 예시는 실제 접수·완료 운행이나 확정요금이 아닙니다.</p>'+
   '<h3>전북특별자치도 14개 시·군 '+esc(label)+' 검색</h3><ul>'+rows+'</ul>'+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(PROVINCE)+'">전북 '+esc(label)+' 예상요금 조회</a> · '+
   '<a href="tel:18114294">대표 상담 1811-4294</a></p></section>';
 }
 function searchMeta(region,kind){
  if(!region||!['daeri','taksong'].includes(kind))return null;
  const isProvince=region.full_name===PROVINCE;
  const row=byFull.get(region.full_name);
  if(!isProvince&&!row)return null;
  const place=isProvince?'전북':short(region);
  const a=kind==='taksong'
   ?{title:isProvince?'전북탁송 | 전라북도탁송·14개 시군 지역탁송·장거리 차량탁송':
      place+'탁송 | 지역탁송·인접지역·장거리 자동차탁송',
     description:place+' 지역탁송·자동차탁송. '+(isProvince?'전주·군산·익산 등 14개 시군':row.local.join('·'))+
      ' 차량 인수·인계, 광주·대전·서울·부산·대구 장거리 로드탁송·예약·거리조회 1811-4294.'}
   :{title:isProvince?'전북대리운전 | 전라북도대리운전·단거리·장거리·인접지역':
      place+'대리운전 | 지역대리운전·단거리·인접지역·장거리',
     description:place+' 지역대리운전·단거리·인접지역·장거리대리운전. '+(isProvince?'전북 14개 시군':row.local.join('·'))+
      ' 출발과 광주·대전·서울·부산·대구 귀가, 골프장·법인·심야 예약 상담 1811-4294.'};
  return a;
 }
 function regionSection(region,kind){
  if(!region||!['daeri','taksong'].includes(kind))return '';
  if(region.full_name===PROVINCE)return provinceHub(kind);
  const row=byFull.get(region.full_name);
  return row?municipality(row,kind):'';
 }
 if(paths.size!==30)throw Error('Jeonbuk existing canonical set must have only 30 routes, got '+paths.size);
 return Object.freeze({sourceCount:byFull.size,canonicalPaths:[...paths],searchMeta,regionSection});
}
module.exports={create};
