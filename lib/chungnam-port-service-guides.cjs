'use strict';
// Locality-backed original sea-port, fishing departure and pension pickup guidance.
// Reuse existing canonical region URLs. These are NOT completed rides, fares or staff locations.
const raw=require('../data/chungnam-ports-pension-fishing-20261122.json');
const PROVINCE='충청남도';
const norm=x=>String(x||'').normalize('NFKC').replace(/[\s·_,.()\/\-]+/g,'').toLowerCase();
const service=kind=>kind==='taksong'?'탁송':'대리운전';
const short=r=>r.name.replace(/[시군]$/,'');
function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Chungnam port guidance requires existing official region URLs');
 const cities=regions.filter(r=>r.full_name.startsWith(PROVINCE+' ')&&['시','군'].includes(r.level));
 if(cities.length!==15||raw.municipalities.length!==15||raw.ports.length<15)
  throw Error('Chungnam guide must cover exactly 15 existing municipalities and verified coastal landmarks');
 const province=regionByFullName.get(PROVINCE);
 if(!province||province.level!=='시도')throw Error('Missing Chungnam province canonical');
 const byCity=new Map(),byParent=new Map(),portList=[],canonical=new Set(),exactQueries=new Map();
 for(const kind of ['daeri','taksong'])canonical.add(servicePath(province,kind));
 for(const item of raw.municipalities){
  const city=regionByFullName.get(item.region);
  if(!city||!['시','군'].includes(city.level)||byCity.has(item.region))
   throw Error('Invalid or duplicate Chungnam municipality: '+item.region);
  if(!Array.isArray(item.areas)||item.areas.length<2||
   !Array.isArray(item.directions)||item.directions.length<2||
   ['daeri','taksong'].some(k=>typeof item[k]!=='string'||item[k].length<80))
   throw Error('Incomplete municipality content '+item.region);
  const areas=item.areas.map(name=>{
   const found=regions.filter(r=>r.full_name.startsWith(city.full_name+' ')&&r.name===name&&['읍','면','동','구'].includes(r.level));
   if(found.length!==1)throw Error('Unknown or ambiguous local area '+item.region+' '+name);
   return found[0];
  });
  if(new Set(areas.map(r=>r.full_name)).size!==areas.length)throw Error('Duplicate locality '+item.region);
  byCity.set(item.region,Object.freeze({...item,city,areas}));
  for(const k of ['daeri','taksong'])canonical.add(servicePath(city,k));
 }
 if(cities.some(r=>!byCity.has(r.full_name)))throw Error('Not all 15 cities and counties have unique guidance');
 for(const p of raw.ports){
  const parent=regionByFullName.get(p.parent);
  if(!parent||!['읍','면','동'].includes(parent.level)||!parent.full_name.startsWith(PROVINCE+' '))
   throw Error('Incorrect city, county, town or district assigned to port '+p.name+' '+p.parent);
  const city=cities.find(x=>p.parent.startsWith(x.full_name+' '));
  if(!city)throw Error('Port municipality not found '+p.name);
  let village=null;
  if(p.village){
   village=regionByFullName.get(p.parent+' '+p.village);
   if(!village||village.level!=='리')throw Error('Incorrect legal village attributed to port '+p.name);
  }
  if(!p.name||typeof p.context!=='string'||p.context.length<43||!/^https:\/\//.test(p.source))
   throw Error('Missing factual port location context '+p.name);
  if(!Array.isArray(p.aliases)||p.aliases.length>4)throw Error('Invalid port aliases '+p.name);
  const row=Object.freeze({...p,parentRegion:parent,municipality:city,villageRegion:village});
  portList.push(row);
  if(!byParent.has(p.parent))byParent.set(p.parent,[]);
  byParent.get(p.parent).push(row);
  for(const k of ['daeri','taksong'])canonical.add(servicePath(parent,k));
  // No per-port doorway pages. Different intents all resolve to one existing local canonical.
  for(const alias of [p.name,...p.aliases]){
   for(const topic of ['', '낚시터','낙시터','펜션','팬션','횟집','낚시배','선착장']){
    for(const [suffix,k] of [['대리운전','daeri'],['대리','daeri'],['탁송','taksong'],['차량탁송','taksong'],['자동차탁송','taksong']]){
     const key=norm(alias+topic+suffix),target=servicePath(parent,k);
     const old=exactQueries.get(key);
     if(old&&old!==target)throw Error('Ambiguous port keyword '+alias+topic+suffix);
     exactQueries.set(key,target);
    }
   }
  }
 }
 // "당진 삼길포항" is a neighboring access/route search, not a false Dangjin address.
 const samgil=portList.find(x=>x.name==='삼길포항');
 if(!samgil||samgil.parentRegion.full_name!=='충청남도 서산시 대산읍')
  throw Error('Samgilpo must be anchored to Seosan Daesan-eup');
 for(const [suffix,k] of [['대리운전','daeri'],['탁송','taksong']]){
  exactQueries.set(norm('당진삼길포항'+suffix),servicePath(samgil.parentRegion,k));
  exactQueries.set(norm('당진에서삼길포항'+suffix),servicePath(samgil.parentRegion,k));
  exactQueries.set(norm('삼길포항에서당진'+suffix),servicePath(samgil.parentRegion,k));
 }
 const renderPort=(p,kind)=>'<li><strong>'+esc(p.name+service(kind))+'</strong> · '+esc(p.name+'낚시터'+service(kind))+
  ' · '+esc(p.name+'펜션'+service(kind))+
  ' — '+esc(p.context)+' <a href="'+esc(servicePath(p.parentRegion,kind))+'">'+esc(p.parentRegion.name+service(kind))+' 안내</a>'+
  (p.villageRegion?' · <a href="'+esc(servicePath(p.villageRegion,kind))+'">'+esc(p.villageRegion.name)+' 실제 주차 위치 찾기</a>':'')+'</li>';
 function municipality(row,kind){
  const city=row.city,place=short(city),txt=service(kind),harbors=portList.filter(p=>p.municipality.full_name===city.full_name);
  const areas=row.areas.map(r=>'<li><a href="'+esc(servicePath(r,kind))+'">'+esc(r.name+txt)+'</a> · '+esc(r.full_name)+' 출발 위치 상담</li>').join('');
  const guide=kind==='daeri'
   ?'<h3>'+esc(place)+' 낚시터·항구·펜션·팬션 대리운전</h3><p>낚싯배 승선 지점이나 펜션·숙박시설에서 만나는 장소가 차량 주차장과 다를 수 있습니다. 새벽 출조·밤 귀가 때는 실제 출발 주소, 차량 주차구역과 기사 접근·복귀 시간을 구분합니다. 지역에 따라 펜션·낚시터가 없는 곳은 억지로 항구 키워드를 붙이지 않습니다.</p><h3>'+esc(place)+' 법인·골프장·장거리 대리운전</h3><p>직장 모임이나 골프장 라운딩 후 식사 장소가 바뀌면 출발지를 다시 확인해야 합니다. 여러 대 동시 이동은 차량별 목적지와 출발 희망시간을 구분해 상담합니다.</p>'
   :'<h3>'+esc(place)+' 낚시 출조 차량회수·항구 자동차탁송</h3><p>차량은 실제 육상 주차장에서 인수합니다. 선박 승선이나 섬 이동이 필요한 경우 선적과 운임이 별도 가능한지 확인해야 하며, 기사가 직접 운전하는 로드탁송과 해상운송은 같은 서비스가 아닙니다.</p><h3>'+esc(place)+' 중고차·서비스센터·렌터카 탁송</h3><p>차량 정상운행 가능 상태, 출고 승인·키 전달자와 도착지 인수자의 연락 가능시간, 도로거리 및 기사 복귀조건을 확인해 예상요금을 안내합니다.</p>';
  const cross=city.name==='당진시'
   ?'<p>당진에서 삼길포항 방향으로 이동하는 상담은 가능하지만 <strong>삼길포항 주소는 서산시 대산읍 화곡리</strong>입니다. <a href="'+esc(servicePath(samgil.parentRegion,kind))+'">서산 삼길포항 '+esc(txt)+' 바로가기</a>에서 실제 항구 출발지를 선택하세요.</p>'
   :city.name==='서산시'
   ?'<p>삼길포항은 서산시 대산읍 화곡리이며 대호방조제 너머 당진시 석문면 왜목항·장고항과는 다른 출발지입니다. <a href="'+esc(servicePath(byCity.get('충청남도 당진시').city,kind))+'">당진 항구 '+esc(txt)+' 안내</a>와 구분합니다.</p>':'';
  return '<section id="chungnam-fishing-pension-port-guide-20261122" aria-label="'+esc(city.full_name+' '+txt)+'">'+
   '<h2>'+esc(place+txt+' | '+(kind==='daeri'?'장거리·낚시터·펜션·골프장 예약':'자동차탁송·차량 인수·장거리 예약'))+'</h2>'+
   '<p>'+esc(row[kind])+'</p>'+guide+cross+
   (harbors.length?'<h3>'+esc(place)+' 항구·낚시터 '+txt+' 정확한 출발지</h3><ul>'+harbors.map(p=>renderPort(p,kind)).join('')+'</ul>':'')+
   '<h3>'+esc(place)+' 읍·면·동·구 '+txt+' 검색 연결</h3><ul>'+areas+'</ul>'+
   '<h3>'+esc(place)+' 장거리 '+txt+' 예약 방향</h3><p>'+esc(row.directions.join('·'))+' 방면은 상담 목적지 예시이며 해당 방향 운행완료·고정 요금을 주장하지 않습니다. 차종·출발시각·통행료·기사 접근·복귀 조건에 따라 달라집니다.</p>'+
   '<nav aria-label="'+esc(place+txt)+' 바로가기"><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(city.full_name)+'">출발지·도착지 예상요금</a> · '+
   '<a href="'+(kind==='daeri'?'/service/long-distance-daeri/':'/service/long-distance-taksong/')+'">장거리 '+esc(txt)+'</a> · '+
   '<a href="'+(kind==='daeri'?'/service/golf/':'/business/used-car/')+'">'+esc(kind==='daeri'?'골프장·법인 대리운전':'중고차·정비소 차량탁송')+'</a> · '+
   '<a href="'+esc(servicePath(province,kind))+'">충청남도 시·군 전체</a> · <a href="tel:18114294">1811-4294 상담</a></nav>'+
   '<p>낚시터·항구·숙소 명칭은 출발지 위치 안내입니다. 실제 배차, 운행완료 후기, 확정요금 또는 상주기사를 뜻하지 않으며 확인 기록은 <a href="/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(place)+'">원본 운행기록 검색</a>에서 별도로 확인합니다.</p></section>';
 }
 function portParent(region,kind){
  const ports=byParent.get(region.full_name);
  if(!ports?.length)return '';
  const txt=service(kind);
  return '<section id="chungnam-local-harbor-pickup-20261122" aria-label="'+esc(region.full_name+' 항구 낚시터 펜션 '+txt)+'">'+
   '<h2>'+esc(region.name+' 항구·낚시터·펜션 '+txt+' | 현장 차량 위치 확인')+'</h2>'+
   '<p>'+esc(region.full_name)+' 주변의 항구·출조 장소와 펜션·횟집은 실제 차량 주차 지점을 기준으로 상담합니다. 밤이나 새벽 출발, 낚싯배 귀항 시각, 기사 접근·복귀 여건은 각각 다릅니다.</p>'+
   '<ul>'+ports.map(x=>renderPort(x,kind)).join('')+'</ul>'+
   '<p>항구별 출발지 안내는 정박지의 실제 운영, 배차 확정이나 완료 후기 증거가 아닙니다. <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(region.full_name)+'">'+esc(region.name+txt)+' 출발 예상요금</a> · <a href="'+esc(servicePath(ports[0].municipality,kind))+'">'+esc(short(ports[0].municipality)+txt)+' 지역 전체</a> · <a href="'+esc(servicePath(province,kind))+'">충남 항구·낚시터 '+esc(txt)+'</a> · <a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function provinceHub(kind){
  const txt=service(kind);
  const rows=[...byCity.values()].map(row=>'<li><a href="'+esc(servicePath(row.city,kind))+'">'+esc(short(row.city)+txt)+'</a> — '+esc(row.areas.slice(0,3).map(x=>x.name).join('·'))+' 위치와 예약 안내</li>').join('');
  const coastal=portList.map(x=>'<li>'+esc(x.name+txt)+' · <a href="'+esc(servicePath(x.parentRegion,kind))+'">'+esc(x.parentRegion.full_name)+' '+esc(txt)+'</a></li>').join('');
  return '<section id="chungnam-fifteen-coastal-service-hub-20261122" aria-label="충남 15개 시군 및 항구 낚시터 펜션 '+esc(txt)+'">'+
   '<h2>'+esc('충남'+txt+' | 충청남도 15개 시·군, 항구·낚시터·펜션·장거리 예약')+'</h2>'+
   '<p>천안·아산·당진·서산·태안·보령·서천·홍성 등 15개 시·군의 기존 지역별 대표 페이지로 연결합니다. 항구 이름·낚시터·펜션은 실제 주차위치와 육상 차량 인수를 확인하기 위한 검색 단서입니다.</p>'+
   '<p><strong>삼길포항은 당진시가 아닌 서산시 대산읍 화곡리</strong>에 있습니다. 당진 석문면 장고항·왜목항과 혼동하지 않고 대호방조제 양쪽의 실제 출발지를 확인합니다.</p>'+
   '<h3>충청남도 시·군별 '+esc(txt)+' 검색</h3><ul>'+rows+'</ul>'+
   '<h3>서해안 항구·낚시터·펜션 '+esc(txt)+' 검색</h3><ul>'+coastal+'</ul>'+
   '<p>읍·면·동·리 검색은 기존 법정 행정구역 안내를 사용하며, 지명 조합마다 중복 URL을 새로 만들지 않습니다. 실제 배차·요금은 <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(PROVINCE)+'">출발·도착 예상요금</a> 확인과 <a href="tel:18114294">1811-4294 상담</a> 후 안내합니다.</p></section>';
 }
 function regionSection(region,kind){
  if(!region||!['daeri','taksong'].includes(kind))return '';
  if(region.full_name===PROVINCE)return provinceHub(kind);
  const row=byCity.get(region.full_name);
  return row?municipality(row,kind):portParent(region,kind);
 }
 function searchMeta(region,kind){
  if(!region||!['daeri','taksong'].includes(kind))return null;
  const txt=service(kind);
  if(region.full_name===PROVINCE)return kind==='daeri'
   ?{title:'충남대리운전 | 당진·서산·삼길포항·항구·낚시터·펜션 예약',description:'충청남도대리운전, 당진·서산 삼길포항 인근·장고항·왜목항 등 15개 시군 장거리·낚시터·펜션·골프장 대리운전 안내. 출발지·요금 상담 1811-4294.'}
   :{title:'충남탁송 | 서산 삼길포항·당진 장고항·항구 차량탁송',description:'충청남도탁송, 삼길포항·장고항·대천항 등 서해안 항구 낚시 출조 차량회수·로드탁송. 15개 시군 차량 인수·인계·장거리 예상요금 상담 1811-4294.'};
  const row=byCity.get(region.full_name);
  if(!row){
   const harbors=byParent.get(region.full_name);
   if(!harbors?.length)return null;
   const main=harbors[0],names=harbors.slice(0,2).map(x=>x.name);
   const label=names.join('·')+txt;
   const place=short(main.municipality)+' '+region.name;
   return kind==='daeri'
    ?{title:label+' | '+place+' 낚시터·펜션·장거리 예약',
      description:place+' '+names.join('·')+' 항구 낚시터·펜션 대리운전. 실제 육상 주차장 위치와 출조 후 귀가 시각, 기사 접근·복귀를 확인하고 예약 상담 1811-4294.'}
    :{title:label+' | '+place+' 낚시 차량회수·로드탁송',
      description:place+' '+names.join('·')+' 출조 낚시차량 탁송. 승선지와 육상 차량 인수위치·키 전달자·목적지 수령시간을 구분하고 예상요금 상담 1811-4294.'};
  }
  const harbors=portList.filter(p=>p.municipality.full_name===region.full_name);
  const place=short(region),target=(region.name==='서산시'?'삼길포항':region.name==='당진시'?'장고항':harbors[0]?.name);
  return kind==='daeri'
   ?{title:place+'대리운전 | '+(target?target+'·낚시터·펜션':'장거리·골프장')+' 예약',description:place+'대리운전 '+(target?target+' 주변·':'')+row.areas.slice(0,3).map(x=>x.name).join('·')+' 출발. 장거리·골프장·외곽 예약 시 차량 주차장과 목적지, 기사 접근·복귀 조건 확인. 상담 1811-4294.'}
   :{title:place+'탁송 | '+(target?target+'·낚시 차량회수':'중고차·서비스센터')+'·장거리 예약',description:place+'탁송 '+(target?target+' 주변·':'')+row.areas.slice(0,3).map(x=>x.name).join('·')+' 차량 인수·인계. 중고차·정비소 로드탁송, 장거리 예상요금과 예약 상담 1811-4294.'};
 }
 return Object.freeze({regionSection,searchMeta,resolve:q=>exactQueries.get(norm(q))||null,portList,sourceCount:byCity.size,canonicalPaths:[...canonical],queryCount:exactQueries.size});
}
module.exports={create};
