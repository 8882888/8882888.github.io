'use strict';
// Sokcho route discovery must reuse verified 2026 legal region canonical URLs,
// preserve existing district priority metadata and never invent ride evidence or fares.
const data=require('../data/sokcho-daeri-taksong-20261123.json');
const C=data.city;
const kindName={daeri:'대리운전',taksong:'자동차탁송'};
const norm=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[\s·_,.()\/\-→]+/g,'');
const quote=(kind,from,to)=>'/fare/?service='+kind+'&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
const seoNames=new Set(['동명동','조양동','대포동','설악동','청호동','영랑동','노학동']);
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Sokcho guide requires official legal region and existing canonical paths');
 const city=regionByFullName.get(C);
 if(!city||city.level!=='시'||data.version!==1||data.localities.length!==13||
    data.intercity.length!==8||data.mainTerms.daeri.length!==12||data.mainTerms.taksong.length!==13)
  throw Error('Invalid Sokcho official regional source and service inventory');
 const rows=new Map(),places=new Map(),keywords=new Map(),canonicals=new Set();
 const add=(phrase,r,kind)=>{
  const term=norm(phrase),url=servicePath(r,kind);
  if(term.length<4||keywords.has(term)&&keywords.get(term)!==url)
   throw Error('Conflicting Sokcho service search term '+phrase);
  keywords.set(term,url);
 };
 const guard='전담기사 상주·즉시 배차, 특정 관광시설 제휴, 고정 요금이나 완료 운행은 보장하지 않습니다. 차량 운전자 면허·보험 적용, 출발 주차장과 도착지, 기사 접근·복귀 조건을 확인한 후 상담합니다.';
 for(const row of data.localities){
  const r=regionByFullName.get(row.from),to=regionByFullName.get(row.to);
  if(!r||r.level!=='동'||!row.from.startsWith(C+' ')||r.name!==row.dong||
     rows.has(row.from)||!to||!['읍','면','시'].includes(to.level)||
     row.daeri.length<100||row.taksong.length<100)
   throw Error('Unsupported Sokcho legal-dong or destination '+row.from);
  rows.set(row.from,Object.freeze({...row,r,toRegion:to}));
  places.set(row.dong,r);
  for(const kind of ['daeri','taksong']){
   canonicals.add(servicePath(r,kind));
   for(const term of [kind==='daeri'?'대리운전':'탁송',kind==='daeri'?'장거리대리운전':'자동차탁송']){
    add(row.dong+term,r,kind);
    add('속초'+row.dong+term,r,kind);
   }
   add('속초'+row.dong+row.toLabel+(kind==='daeri'?'대리운전':'탁송'),r,kind);
  }
 }
 if(rows.size!==13||new Set(data.localities.map(x=>x.dong)).size!==13)
  throw Error('Every one of Sokcho 13 legal neighborhoods needs unique local copy');
 for(const kind of ['daeri','taksong'])canonicals.add(servicePath(city,kind));
 const destinations=[];
 for(const c of data.intercity){
  const target=regionByFullName.get(c.to);
  if(!target||!['시','군','시도'].includes(target.level)||destinations.some(x=>x.to===c.to)||
     c.detail.length<80)throw Error('Invalid legal Sokcho long-range destination '+c.to);
  destinations.push({...c,r:target});
  for(const kind of ['daeri','taksong']){
   add('속초'+c.label+(kind==='daeri'?'장거리대리운전':'탁송'),city,kind);
   add('속초'+c.label+(kind==='daeri'?'대리운전':'자동차탁송'),city,kind);
  }
 }
 if(destinations.length!==8||canonicals.size!==28)
  throw Error('Sokcho region canonical coverage must be 26 local + 2 city');
 for(const kind of ['daeri','taksong'])
  for(const term of data.mainTerms[kind]){
   const special={속초해수욕장대리운전:'조양동',대포항대리운전:'대포동',동명항대리운전:'동명동'}[term];
   add(term,special?places.get(special):city,kind);
  }
 const link=(r,kind,title)=>'<a href="'+esc(servicePath(r,kind))+'">'+esc(title)+'</a>';
 const serviceInfo=k=>k==='daeri'
  ?'대리운전은 고객이 자기 차량에 동승하여 귀가·숙소 이동하는 운행입니다. 관광지 이름만으로는 기사와 만날 수 없으므로 실제 주차장 출입구와 주소, 동승 여부를 확인합니다. 장거리 이동은 기사 복귀와 시간대에 따라 요금·배차가 달라집니다.'
  :'자동차탁송은 고객이 동승하지 않고 차량 자체를 인수·인계하는 로드탁송입니다. 차종·주행 가능 상태·키 전달자·도착지 수령인·보험 적용과 기사 복귀를 확인합니다. 오색·한계령·백담사↔소공원 종주 차량회수는 별도 설악산 종주탁송 안내를 이용합니다.';
 const serviceLinks=k=>k==='daeri'
  ?'<a href="/service/long-distance-daeri/">장거리대리운전 예약</a> · <a href="/service/corporate/">속초 법인대리운전</a> · <a href="/service/daily-driver/">관광 일정 일일기사</a>'
  :'<a href="/service/long-distance-taksong/">장거리자동차탁송</a> · <a href="/service/taksong-purpose/">렌트카·서비스센터 차량 인계</a> · <a href="/설악산탁송/">설악산 종주 차량탁송</a>';
 function originMarkup(entry,k){
  const r=entry.r,to=entry.toRegion,label=entry.dong+'→'+entry.toLabel;
  return '<section id="sokcho-dong-seo-20261123" aria-label="'+esc('속초'+entry.dong+' '+kindName[k]+' 지역 이동')+'">'+
   '<h2>'+esc('속초'+entry.dong+(k==='daeri'?'대리운전·장거리대리운전':'탁송·자동차탁송'))+'</h2>'+
   '<p><strong>'+esc(entry.place)+'</strong> | '+esc(entry[k])+'</p>'+
   '<h3>'+esc('속초'+label+' '+kindName[k]+' 예상요금·예약')+'</h3>'+
   '<p>'+esc(serviceInfo(k))+'</p>'+
   '<p><a href="'+quote(k,entry.from,entry.to)+'">'+esc(label+' '+kindName[k]+' 출발→도착 거리·예상요금')+'</a> · '+
   '<a href="'+quote(k,entry.to,entry.from)+'">'+esc(entry.toLabel+'→'+entry.dong+' 역방향 요금조회')+'</a> · '+
   link(to,k,entry.toLabel+' '+kindName[k]+' 지역안내')+'</p>'+
   '<p>'+link(city,k,'속초시 '+kindName[k]+' 13개 동 전체')+' · '+serviceLinks(k)+' · '+
   '<a href="/fare/?service='+k+'&amp;from='+encodeURIComponent(entry.from)+'">출발지 예상요금</a> · '+
   '<a href="tel:18114294">속초 예약 상담 1811-4294</a></p>'+
   '<p>이동 구간은 고객 문의용 지역 예시이며 완료 운행·확정 거리나 요금이 아닙니다. '+esc(guard)+'</p></section>';
 }
 function cityMarkup(k){
  const isD=k==='daeri';
  const local=[...rows.values()].map(e=>'<li>'+link(e.r,k,'속초'+e.dong+(isD?'대리운전':'탁송'))+
   ' — '+esc(e.place)+' · '+esc(e[k])+
   ' <a href="'+quote(k,e.from,e.to)+'">'+esc(e.toLabel+' 방면 요금조회')+'</a></li>').join('');
  const corridor=destinations.map(e=>{
   const title='속초→'+e.label+' '+(isD?'장거리대리운전':'장거리탁송');
   return '<li><strong>'+esc(title)+'</strong> '+esc(e.detail)+
    ' <a href="'+quote(k,C,e.to)+'">출발→도착 예상요금</a> · '+
    '<a href="'+quote(k,e.to,C)+'">역방향 예상요금</a> · '+
    link(e.r,k,e.label+' 지역 안내')+'</li>';
  }).join('');
  return '<section id="sokcho-city-daeri-taksong-20261123">'+
   '<h2>'+(isD?'속초대리운전·속초장거리대리운전 | 대포항·속초해수욕장·설악동':'속초탁송·속초자동차탁송 | 설악동·대포항·장거리 로드탁송')+'</h2>'+
   '<p>'+esc(serviceInfo(k))+'</p>'+
   '<h3>속초시 13개 법정동 '+(isD?'대리운전·심야 귀가 예약':'차량 인수·인계 및 로드탁송')+'</h3><ul>'+local+'</ul>'+
   '<h3>속초→양양·고성·강릉·인제·원주·서울·성남·인천 지역간 '+kindName[k]+'</h3>'+
   '<ul>'+corridor+'</ul>'+
   '<h3>속초 관광지·호텔·설악산 예약 전 무엇을 확인하나요?</h3>'+
   '<p>속초해수욕장·대포항·동명항·장사항·아바이마을·속초관광수산시장 등은 음식점·숙박시설·관광지 명칭과 실제 차량 주차장이 다를 수 있습니다. 출발 위치와 기사 접근로, 야간 출차 가능 여부를 확인해야 합니다. 설악동 소공원 출발 대리운전과 오색·한계령·백담사 산행 종주 차량 회수는 다른 요청입니다.</p>'+
   '<p>'+serviceLinks(k)+' · <a href="/fare/?service='+k+'&amp;from='+encodeURIComponent(C)+'">속초 출발 요금조회</a> · '+
   '<a href="/reviews/history/?kind='+k+'">동일 서비스 실제 운행기록 확인</a> · '+
   '<a href="tel:18114294">속초 '+kindName[k]+' 상담 1811-4294</a></p>'+
   '<p>'+esc(guard)+' 본 목록은 검색·예약 안내이며 특정 지역 완료후기를 새로 만들어 주장하지 않습니다.</p></section>';
 }
 function searchMeta(r,k){
  if(!r||!['daeri','taksong'].includes(k)||!seoNames.has(r.name)||!rows.has(r.full_name))
   return null; // Preserve existing city-level SEO priority and verified historical titles.
  const p=rows.get(r.full_name);
  const title='속초'+p.dong+(k==='daeri'?'대리운전 | 관광지·장거리 예약':'탁송 | 차량 인수·장거리 예약');
  const description='속초'+p.dong+(k==='daeri'?'대리운전. ':'자동차탁송. ')+p.place+
    (k==='daeri'?' 출발·동승·야간 기사 복귀, '+p.toLabel+' 장거리 예상요금과 예약 상담 1811-4294.':
    ' 출고·인수 장소와 차량 상태, '+p.toLabel+' 인계·장거리 예상요금, 배차 상담 1811-4294.');
  if(title.length>65||description.length<65||description.length>160)throw Error('Bad Sokcho meta '+p.dong);
  return {title,description};
 }
 function regionSection(r,k){
  if(!r||!['daeri','taksong'].includes(k))return '';
  if(r.full_name===C)return cityMarkup(k);
  const entry=rows.get(r.full_name);
  return entry?originMarkup(entry,k):'';
 }
 function nationalSection(k){
  if(!['daeri','taksong'].includes(k))return '';
  const isD=k==='daeri';
  return '<section id="sokcho-national-service-20261123"><h3>'+
   (isD?'속초대리운전·속초장거리대리운전 예약':'속초탁송·속초자동차탁송·장거리 차량 인계')+'</h3>'+
   '<p>속초 관광지·숙박시설·설악동 출발을 강릉·양양·고성·서울 등 목적지와 연결해 상담합니다. '+
   (isD?'고객 동승 대리운전':'고객 미동승 로드탁송')+'과 산행 종주 차량회수를 구분합니다. '+
   link(city,k,'속초시 13개 동 지역 안내')+' · '+
   link(places.get('대포동'),k,'대포항 출발 안내')+' · '+
   link(places.get('설악동'),k,'설악동 출발 안내')+' · '+
   link(places.get('조양동'),k,'속초해수욕장 출발 안내')+' · '+
   serviceLinks(k)+' · <a href="tel:18114294">1811-4294 상담</a></p>'+
   '<p>실제 배차·운행완료·고정요금·기사 상주를 미리 보장하지 않습니다.</p></section>';
 }
 function resolve(query){return keywords.get(norm(query))||null}
 return Object.freeze({regionSection,nationalSection,resolve,searchMeta,
  localityCount:rows.size,corridorCount:destinations.length,aliases:keywords.size,
  canonicalPaths:[...canonicals],city,seoLocalityCount:seoNames.size});
}
module.exports={create,norm};
