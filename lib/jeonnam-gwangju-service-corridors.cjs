'use strict';
// Human-edited customer travel guidance on existing Jeonnam/Gwangju canonical pages.
// NOT a source for actual orders, rides, fares, mileage, partnerships or driver availability.
const source=require('../data/jeonnam-gwangju-service-corridors-20261123.json');
const JEONNAM='전라남도',GWANGJU='광주광역시',CURRENT_PROVINCE='전남광주통합특별시';
const LONG_JEONNAM=[GWANGJU,'서울특별시','부산광역시','대구광역시'];
const LONG_GWANGJU=['전라남도 목포시','전라남도 여수시','서울특별시','부산광역시','대구광역시'];
const MAX_TITLE=80;

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
    typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Jeonnam/Gwangju service guides require the official legal locality index');
 const cities=regions.filter(r=>r.full_name.startsWith(JEONNAM+' ')&&['시','군'].includes(r.level));
 const districts=regions.filter(r=>r.full_name.startsWith(GWANGJU+' ')&&r.level==='구');
 if(cities.length!==22||districts.length!==5||source.regions.length!==27)
  throw Error('Jeonnam (22) and Gwangju (5) locality guide coverage mismatch');
 const byFull=new Map(),canonicals=new Set();
 for(const entry of source.regions){
  const r=regionByFullName.get(entry.region),isJ=entry.region.startsWith(JEONNAM+' ');
  if(!r||byFull.has(entry.region)||(isJ?!['시','군'].includes(r.level):r.level!=='구')||
     ![...cities,...districts].some(x=>x.full_name===r.full_name))
   throw Error('Invalid or duplicated legal region '+entry.region);
  if(!Array.isArray(entry.local)||entry.local.length!==2||
     new Set(entry.local).size!==2||!Array.isArray(entry.nearby)||
     entry.nearby.length!==2||new Set(entry.nearby).size!==2||
     typeof entry.daeri!=='string'||entry.daeri.length<75||
     typeof entry.taksong!=='string'||entry.taksong.length<75)
   throw Error('Incomplete distinct locality/service guidance: '+entry.region);
  for(const area of entry.local){
   const full=entry.region+' '+area;
   if(!regionByFullName.has(full))
    throw Error('Unverified legal 읍/면/동 origin or destination: '+full);
  }
  for(const target of entry.nearby){
   if(!regionByFullName.has(target)||target===entry.region)
    throw Error('Invalid adjacent locality '+entry.region+' → '+target);
  }
  byFull.set(entry.region,Object.freeze({...entry,region:r}));
  for(const kind of ['daeri','taksong'])canonicals.add(servicePath(r,kind));
 }
 for(const r of [...cities,...districts])if(!byFull.has(r.full_name))
  throw Error('Missing original locality guidance for '+r.full_name);
 for(const prov of [JEONNAM,GWANGJU]){
  const region=regionByFullName.get(prov);
  if(!region)throw Error('Missing province canonical '+prov);
  for(const kind of ['daeri','taksong'])canonicals.add(servicePath(region,kind));
 }
 for(const full of [...LONG_JEONNAM,...LONG_GWANGJU])
  if(!regionByFullName.has(full))throw Error('Missing existing cross-regional canonical '+full);
 const label=kind=>kind==='daeri'?'대리운전':'자동차탁송';
 const plainRegion=r=>r.name==='광주광역시'?'광주':r.name==='전라남도'?'전남':
   r.full_name.startsWith(GWANGJU+' ')?'광주'+r.name:r.name==='고성군'?'경남고성':r.name.replace(/[시군]$/,'');
 const quote=(kind,from,to)=>'/fare/?service='+kind+'&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 const anchor=(kind,from,to,text,region)=>{
  const p=quote(kind,from,to);
  return '<a href="'+p+'">'+esc(text)+'</a>'+(region?' · <a href="'+esc(servicePath(region,kind))+'">'+esc(plainRegion(region)+' '+label(kind)+' 지역안내')+'</a>':'');
 };
 function routeSection(row,kind){
  const origin=row.region,place=plainRegion(origin),kindLabel=label(kind),pair=row.local;
  const regionPrefix=origin.full_name+' ';
  const longDest=origin.full_name.startsWith(JEONNAM+' ')?LONG_JEONNAM:LONG_GWANGJU;
  const shortTitle=kind==='daeri'?place+' 단거리대리운전·지역대리운전':place+' 지역탁송·단거리 자동차탁송';
  const nearTitle=kind==='daeri'?place+' 인접지역대리운전':place+' 인접지역탁송';
  const longTitle=kind==='daeri'?place+' 장거리대리운전':place+' 장거리 자동차탁송·로드탁송';
  const intro=kind==='daeri'
   ?'대리운전은 고객 차량을 기사에게 맡겨 이동하는 이용 형태입니다. 차량 위치·동승 및 귀가 조건·주차장 출입구·기사 복귀 여건을 확인합니다.'
   :'차량탁송은 차량 인수·인계가 중심입니다. 키 전달자·차량 주행 가능상태·출고 승인·도착지 인수 가능시간을 확인합니다.';
  const nearList=row.nearby.map(full=>{
   const dest=regionByFullName.get(full);
   return '<li>'+anchor(kind,origin.full_name,full,place+'→'+plainRegion(dest)+' '+kindLabel+' 예상요금 조회',dest)+'</li>';
  }).join('');
  const longList=longDest.map(full=>{
   const dest=regionByFullName.get(full);
   return '<li>'+anchor(kind,origin.full_name,full,place+'→'+plainRegion(dest)+' '+(kind==='daeri'?'장거리대리운전':'장거리탁송')+' 요금조회',dest)+'</li>';
  }).join('');
  return '<section id="jeonnam-gwangju-corridors-20261123" aria-label="'+esc(origin.full_name+' '+kindLabel+' 출발 도착 지역별 안내')+'">'+
   '<p>현행 행정구역은 <strong>'+esc(CURRENT_PROVINCE)+'</strong>입니다. 2026년 7월 1일 통합 이후에도 기존 전남·광주 지역명과 검색 URL을 이용할 수 있도록 안내합니다. 실제 차량 주소와 관할 행정구역 표기를 확인하세요.</p>'+
   '<h3>'+esc(shortTitle)+'</h3><p>'+esc(row[kind])+'</p>'+
   '<p>예시 출발·도착: '+esc(pair[0]+' → '+pair[1])+'. '+esc(intro)+'</p>'+
   '<p>'+anchor(kind,regionPrefix+pair[0],regionPrefix+pair[1],
     pair[0]+'→'+pair[1]+' '+kindLabel+' 거리·예상요금 계산',null)+'</p>'+
   '<h3>'+esc(nearTitle)+'</h3><p>인접 생활권을 오가는 차량 이동은 해당 시·군의 실제 출발지와 목적지를 확인한 후 요금을 조회합니다. 가까운 지역이라도 기사 접근과 복귀에 따라 운행 여건이 달라집니다.</p><ul>'+nearList+'</ul>'+
   '<h3>'+esc(longTitle)+'</h3><p>광주·목포·여수 등 전남권 연결과 서울·부산·대구 방면 장거리 이동은 정확한 차량 위치와 목적지에 따라 요금이 달라집니다. 출발지·도착지의 주소와 희망시각을 직접 입력하고 상담하세요.</p><ul>'+longList+'</ul>'+
   '<p>위 출발·도착지는 <strong>고객용 경로 입력 예시</strong>일 뿐, 스마트24 접수 오더·배차완료·실제 완료 운행이나 확인된 요금·주행거리가 아닙니다. 시·군 안이라도 거리가 멀면 단거리로 볼 수 없습니다. 현재 요금과 배차 가능 여부는 별도 조회·상담이 필요합니다.</p>'+
   '<p><a href="tel:18114294">1811-4294 '+esc(kindLabel)+' 상담</a> · '+
   '<a href="'+esc(servicePath(origin,kind==='daeri'?'taksong':'daeri'))+'">'+esc(place+(kind==='daeri'?' 자동차탁송':' 대리운전')+' 안내')+'</a> · '+
   '<a href="/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(origin.name)+'">검증 가능한 원본 운행기록 별도 검색</a></p></section>';
 }
 function provinceHub(region,kind){
  const isJ=region.full_name===JEONNAM,area=isJ?'전남 22개 시·군':'광주광역시 5개 구';
  const local=[...byFull.values()].filter(x=>x.region.full_name.startsWith(region.full_name+' '));
  const title=isJ?'전남 '+label(kind)+' | 광주·목포·여수·순천·나주':
   '광주 '+label(kind)+' | 광산구·서구·남구·북구·동구';
  const links=local.map(x=>'<li><a href="'+esc(servicePath(x.region,kind))+'">'+
   esc(plainRegion(x.region)+' '+label(kind))+'</a> — '+esc(x.local.join('·'))+
   ' 출발, 인접지역 및 장거리 요금조회 안내</li>').join('');
  const cross=isJ?[
   regionByFullName.get(GWANGJU),
   regionByFullName.get('전라남도 목포시'),
   regionByFullName.get('전라남도 여수시'),
   regionByFullName.get('전라남도 순천시')
  ]:[
   regionByFullName.get(JEONNAM),
   regionByFullName.get('전라남도 나주시'),
   regionByFullName.get('전라남도 목포시'),
   regionByFullName.get('전라남도 여수시')
  ];
  const crossLinks=cross.map(x=>'<a href="'+esc(servicePath(x,kind))+'">'+esc(plainRegion(x)+' '+label(kind))+'</a>').join(' · ');
  return '<section id="jeonnam-gwangju-hub-20261123" aria-label="'+esc(area+' 지역별 '+label(kind))+'">'+
   '<p><strong>현행 행정구역 '+esc(CURRENT_PROVINCE)+'</strong>: 2026년 7월 1일 종전 전라남도·광주광역시가 통합되었습니다. 이 페이지는 과거 지역명으로도 찾을 수 있도록 기존 주소를 유지하며, 실제 접수 주소는 통합특별시 기준으로 재확인합니다.</p>'+
   '<h2>'+esc(title)+' 지역별 예약과 거리조회</h2>'+
   '<p>'+esc(area)+' 기존 대표 페이지에서 지역탁송·지역대리운전, 읍·면·동 단거리, 인접지역 및 광주·목포·여수·서울·부산·대구 장거리 이동을 구분하여 조회합니다. 아래는 신규 오더 또는 운행완료가 아닌 이용 준비 정보입니다.</p>'+
   '<h3>'+esc(area+' '+label(kind)+' 지역 검색')+'</h3><ul>'+links+'</ul>'+
   '<h3>전남·광주 생활권 '+esc(label(kind))+' 연결</h3><p>'+crossLinks+'</p>'+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(region.full_name)+'">지역별 예상요금 계산</a> · '+
   '<a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function regionSection(region,kind){
  if(!region||!['daeri','taksong'].includes(kind))return '';
  if([JEONNAM,GWANGJU].includes(region.full_name))return provinceHub(region,kind);
  const row=byFull.get(region.full_name);
  return row?routeSection(row,kind):'';
 }
 function searchMeta(region,kind){
  if(!region||!['daeri','taksong'].includes(kind))return null;
  const name=region.full_name,own=byFull.get(name),isJ=name===JEONNAM,isG=name===GWANGJU;
  if(!own&&!isJ&&!isG)return null;
  const isT=kind==='taksong',place=own?plainRegion(region):isJ?'전남':'광주';
  const title=(isJ||isG)?(
   isT?place+'탁송 | 목포·여수·광주 지역탁송·서울·부산 장거리 로드탁송':
    place+'대리운전 | 지역·단거리·인접지역·장거리 대리운전 예약'
  ):(
   isT?place+'탁송 | 지역탁송·광주·부산·대구 장거리 차량탁송':
    place+'대리운전 | 지역·단거리·인접지역·장거리 대리운전'
  );
  const description=isT
   ?place+' 지역탁송·자동차탁송. '+(isJ?'22개 시군':isG?'5개 구':own.local.join('·'))+' 차량 인수·인계, 광주·목포·여수·서울·부산·대구 장거리 로드탁송 예상요금 상담 1811-4294.'
   :place+' 지역대리운전·단거리·인접지역·장거리대리운전. '+(isJ?'22개 시군':isG?'5개 구':own.local.join('·'))+' 출발, 광주·목포·여수·서울·부산·대구 이동과 기사 복귀조건 상담 1811-4294.';
  if([...title].length>MAX_TITLE)throw Error('Jeonnam/Gwangju SEO title exceeds '+MAX_TITLE+': '+name);
  const current=own?'':CURRENT_PROVINCE+'(종전 전남·광주). ';
  return {title,description:current+description};
 }
 const paths=[...canonicals];
 if(paths.length!==58||new Set(paths).size!==58)
  throw Error('Jeonnam/Gwangju canonical path set must keep exactly 58 existing service routes');
 return Object.freeze({regionSection,searchMeta,canonicalPaths:paths,sourceCount:byFull.size});
}
module.exports={create};
