'use strict';
// Region-specific, evidence-safe Chungcheong reservation guidance.
// Four provinces, 32 existing municipal/district hubs, and deep official locality links.
// Never present a potential pickup as a completed trip, fixed fare, hotel partnership or driver stock.
const curated=require('../data/chungcheong-four-region-stay-golf-20261122.json');
const chungnam=require('../data/chungnam-ports-pension-fishing-20261122.json');
const PROVINCES=['충청남도','충청북도','대전광역시','세종특별자치시'];
const HUB='/region/chungcheong-daeri-taksong/';
const label=k=>k==='daeri'?'대리운전':'탁송';
const compact=x=>String(x||'').normalize('NFKC').replace(/[\s·_,.()\/\-]+/g,'').toLowerCase();
const shortProvince={충청남도:'충남',충청북도:'충북',대전광역시:'대전',세종특별자치시:'세종'};
const endings=['장거리대리운전','자동차탁송','차량탁송','대리운전','탁송'];
const venueSuffix=['펜션','팬션','숙박시설','리조트','호텔','골프장','골프','낚시터','낙시터','관광지','유원지','캠핑장','맛집','횟집','장거리'];
const isLocal=r=>r&&['시','군','구'].includes(r.level);
function create({regions,regionByFullName,servicePath,esc,nationwideExplorer}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function'||!nationwideExplorer)
  throw Error('Chungcheong guide requires original legal regions, escaping, and existing locality explorer');
 const provinceRows=PROVINCES.map(p=>regionByFullName.get(p));
 if(provinceRows.some(r=>!r||r.level!=='시도'))throw Error('Missing one of four Chungcheong legal province canonicals');
 const originals=new Map();
 for(const row of chungnam.municipalities){
  const r=regionByFullName.get(row.region);
  if(!isLocal(r)||!r.full_name.startsWith('충청남도 '))throw Error('Bad Chungnam existing town '+row.region);
  originals.set(row.region,Object.freeze({...row,r,group:'충청남도'}));
 }
 if(originals.size!==15)throw Error('Need all existing 15 Chungnam municipality guides');
 const newGuides=new Map();
 for(const row of curated.newGuides){
  const r=regionByFullName.get(row.region),region=PROVINCES.find(p=>row.region===p||row.region.startsWith(p+' '));
  if(!r||!region||region==='충청남도'||newGuides.has(row.region))throw Error('Bad new Chungcheong municipality '+row.region);
  if(!Array.isArray(row.areas)||row.areas.length<2||!row.context||row.daeri.length<85||row.taksong.length<85)throw Error('Incomplete real service guidance '+row.region);
  const areas=row.areas.map(name=>{
   const full=row.region==='세종특별자치시'?'세종특별자치시 (직할) '+name:row.region+' '+name;
   const item=regionByFullName.get(full);
   if(!item||!['구','읍','면','동'].includes(item.level))throw Error('Unknown legal locality '+full);
   return item;
  });
  if(new Set(areas.map(x=>x.full_name)).size!==areas.length)throw Error('Duplicate locality in '+row.region);
  newGuides.set(row.region,Object.freeze({...row,r,group:region,areas}));
 }
 if(newGuides.size!==17)throw Error('Need 11 Chungbuk, 5 Daejeon and 1 Sejong original guides');
 const counts={충청남도:0,충청북도:0,대전광역시:0,세종특별자치시:0};
 for(const r of [...originals.values(),...newGuides.values()])counts[r.group]++;
 if(counts.충청남도!==15||counts.충청북도!==11||counts.대전광역시!==5||counts.세종특별자치시!==1)
  throw Error('Chungcheong 15+11+5+1 regional coverage mismatch');
 const targetGroups=new Map(PROVINCES.map(p=>[p,[]]));
 for(const row of originals.values())targetGroups.get(row.group).push(row.r);
 for(const row of newGuides.values())targetGroups.get(row.group).push(row.r);
 const provinces=PROVINCES.map(p=>({province:p,r:regionByFullName.get(p),short:shortProvince[p]}));
 const aliases=new Map(),ambiguous=new Set();
 function addAlias(name,r){
  const key=compact(name);
  if(key.length<2||ambiguous.has(key))return;
  const prev=aliases.get(key);
  if(prev&&prev.full_name!==r.full_name){aliases.delete(key);ambiguous.add(key)}
  else if(!prev)aliases.set(key,r);
 }
 for(const p of provinces){addAlias(p.province,p.r);addAlias(p.short,p.r);addAlias(p.short+'시',p.r)}
 for(const row of [...originals.values(),...newGuides.values()]){
  const r=row.r,p=shortProvince[row.group],short=r.name.replace(/[시군구]$/,'');
  addAlias(r.full_name,r);
  addAlias(p+r.name,r);
  addAlias(p+short,r);
  addAlias(row.group+r.name,r);
  if(r.level!=='구'){addAlias(r.name,r);addAlias(short,r)}
  for(const sub of row.areas){
   addAlias(r.full_name+' '+sub.name,sub);
   addAlias(p+r.name+sub.name,sub);
   addAlias(p+short+sub.name,sub);
   if(row.group==='세종특별자치시')addAlias('세종'+sub.name,sub);
  }
 }
 // 4-province family navigation; never fabricate a location specific to an unnamed hotel/pension.
 const provinceNav=(kind)=>'<nav aria-label="충청권 '+label(kind)+' 4대 권역"><p>'+
  provinces.map(p=>'<a href="'+esc(servicePath(p.r,kind))+'">'+esc(p.short+label(kind))+'</a>').join(' · ')+
  ' · <a href="'+HUB+'">충청도 펜션·골프장·호텔·낚시터 대리운전·탁송</a></p></nav>';
 const regionalAreaLinks=(row,kind,limit=8)=>'<ul>'+row.areas.slice(0,limit).map(a=>'<li><a href="'+esc(servicePath(a,kind))+'">'+esc(a.name+label(kind))+'</a> · '+esc(a.full_name)+'</li>').join('')+'</ul>';
 function localGuide(row,kind){
  const r=row.r,service=label(kind),area=row.areas.map(x=>x.name).join('·'),prefix=shortProvince[row.group];
  const advice=kind==='daeri'?
   '<h3>펜션·팬션·호텔·맛집·골프장 출발 대리운전</h3><p>숙박시설의 대표 주소와 실제 차량 주차장, 펜션 진입로·현관, 골프장 클럽하우스·주차장은 서로 다를 수 있습니다. 출발 예정 시각·인수 장소·동승 여부와 목적지·기사 복귀조건을 확인하고, 심야 외곽 배차는 미리 상담해 주세요.</p>':
   '<h3>펜션 차량 회수·골프장 장거리 자동차탁송</h3><p>기사가 고객 소유 차량을 정상 주행 가능한 상태에서 직접 운전해 인수·인계하는 로드탁송입니다. 실제 주차 장소, 차량 키 전달자, 정비·중고차 출고 승인, 도착지 인수자, 통행료와 기사 복귀조건을 확인합니다. 주행불가 차량의 견인·캐리어 운송과 구분합니다.</p>';
  return '<section id="chungcheong-stay-tourism-'+kind+'-20261122">'+
   '<h2>'+esc(prefix+r.name+service)+' | '+esc(row.context)+'</h2>'+
   '<p>'+esc(row[kind])+'</p>'+advice+
   '<h3>'+esc(r.name+' 읍·면·동·구별 '+service+' 출발지')+'</h3><p>'+esc(area)+' 등 실제 행정구역 아래에서 차가 놓인 위치를 정확히 선택해야 합니다. 같은 명칭의 리·동이 있으면 시군구까지 확인하세요.</p>'+
   regionalAreaLinks(row,kind)+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">'+esc(r.name+service)+' 출발 예상요금</a> · '+
   '<a href="'+(kind==='daeri'?'/service/long-distance-daeri/':'/service/long-distance-taksong/')+'">장거리 '+service+'</a> · '+
   '<a href="'+(kind==='daeri'?'/service/golf/':'/service/taksong-purpose/')+'">'+esc(kind==='daeri'?'골프장·단체 대리운전':'정비소·서비스센터 차량탁송')+'</a> · '+
   '<a href="/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(r.name)+'">원본 운행기록 확인</a> · <a href="tel:18114294">1811-4294 예약상담</a></p>'+
   '<p>여기 표기된 숙소·관광·골프 이용 상황은 고객 상담을 위한 준비 정보이며, 해당 업체 제휴·상주기사·완료 운행후기·확정 요금을 뜻하지 않습니다.</p>'+
   provinceNav(kind)+'</section>';
 }
 function chungnamBridge(row,kind){
  const area=row.areas.slice(0,3).map(name=>{
   const full=row.r.full_name+' '+name,area=regionByFullName.get(full);
   return area?'<a href="'+esc(servicePath(area,kind))+'">'+esc(name+label(kind))+'</a>':'';
  }).filter(Boolean);
  return '<section id="chungnam-stay-corridor-20261122">'+
   '<h2>'+esc(row.r.name+' 펜션·팬션·호텔·골프장 '+label(kind)+' 연계')+'</h2>'+
   '<p>'+esc(row.r.full_name)+'에서 펜션·숙박시설·낚시터·관광지 출발 및 장거리 이동을 요청할 때는 실제 차량 주차 위치와 목적지·희망 출발시각을 함께 알려주세요. '+esc(row.r.name)+' 기존 항구·읍면동 원본 지역 안내를 그대로 사용합니다.</p>'+
   '<p>'+area.join(' · ')+' · <a href="'+HUB+'">충청권 다른 지역 연결</a> · <a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(row.r.full_name)+'">예상요금</a></p>'+
   '<p>실제 숙박업체와의 제휴, 즉시 배차 또는 완료 운행을 주장하지 않습니다.</p></section>';
 }
 function provinceSection(r,kind){
  const territory=targetGroups.get(r.full_name)||[],service=label(kind),short=shortProvince[r.full_name];
  const items=territory.map(x=>'<li><a href="'+esc(servicePath(x,kind))+'">'+esc(x.name+service)+'</a> — '+esc(x.full_name)+'</li>').join('');
  return '<section id="chungcheong-provincial-stay-'+kind+'-20261122">'+
   '<h2>'+esc(short+service+' | '+territory.length+'개 시군구·세종 관광·펜션·골프장 예약')+'</h2>'+
   '<p>'+esc(short)+' 펜션·팬션 대리운전, 호텔·리조트·골프장 대리운전, 외곽 낚시터·관광지 귀가, 장거리 차량탁송을 실제 출발지의 법정 주소로 구분합니다. 광고용 키워드마다 새로운 지역 페이지를 대량 생성하지 않고 기존 대표 URL로 안내합니다.</p>'+
   '<h3>'+esc(short+' 지역별 '+service+' 검색')+'</h3><ul>'+items+'</ul>'+
   provinceNav(kind)+
   '<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">출발·도착 예상요금 조회</a> · <a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function regionSection(r,kind){
  if(!r||!['daeri','taksong'].includes(kind))return '';
  if(PROVINCES.includes(r.full_name)){
   const row=newGuides.get(r.full_name);
   return (row?localGuide(row,kind):'')+provinceSection(r,kind);
  }
  const row=newGuides.get(r.full_name);
  return row?localGuide(row,kind):originals.has(r.full_name)?chungnamBridge(originals.get(r.full_name),kind):'';
 }
 function searchMeta(r,kind){
  if(!r||!['daeri','taksong'].includes(kind)||r.full_name.startsWith('충청남도'))return null;
  const service=label(kind),row=newGuides.get(r.full_name),p=PROVINCES.includes(r.full_name),s=shortProvince[p?r.full_name:row?.group]||'';
  if(!row&&!p)return null;
  if(p){
   return {title:s+service+' | 충청권 펜션·골프장·호텔·장거리 예약',
    description:s+service+' 펜션·팬션·골프장·호텔·관광지 출발 상담. 충청남도·충청북도·대전·세종 지역별 인수·인계·장거리 예상요금과 예약 1811-4294.'};
  }
  return {title:r.name+service+' | '+(kind==='daeri'?'펜션·골프장·장거리 예약':'숙박 차량회수·서비스센터·장거리'),
   description:r.name+service+' '+row.areas.slice(0,3).map(x=>x.name).join('·')+' 펜션·호텔·골프장 출발, '+(kind==='daeri'?'장거리 귀가·기사 복귀조건':'로드탁송 차량인수·인계조건')+' 상담. 1811-4294.'};
 }
 function resolve(query){
  const q=compact(query);
  if(q.length<4||q.length>115)return null;
  const suffix=endings.find(x=>q.endsWith(x));
  if(!suffix)return null;
  const kind=suffix.includes('대리')?'daeri':'taksong';
  let place=q.slice(0,-suffix.length);
  if(!place)return null;
  let venue='';
  for(const s of venueSuffix)if(place.endsWith(s)){venue=s;place=place.slice(0,-s.length);break}
  if(!place)return null;
  if(place==='충청도'||place==='충청권')return HUB;
  if(!venue)return null; // Never intercept plain legal-region search.
  const match=aliases.get(place);
  if(match)return servicePath(match,kind);
  if(ambiguous.has(place))return null;
  const known=nationwideExplorer.resolve(place+(kind==='daeri'?'대리운전':'탁송'));
  if(known&&known.kind===kind&&PROVINCES.some(p=>known.region.full_name===p||known.region.full_name.startsWith(p+' ')))
   return servicePath(known.region,kind);
  return null;
 }
 function hubPage({layout,host='jeongukdaeri.kr'}){
  const sections=provinces.map(p=>{
   const candidates=targetGroups.get(p.province),rows=candidates.map(r=>'<li><strong>'+esc(r.full_name)+'</strong> · '+
     '<a href="'+esc(servicePath(r,'daeri'))+'">'+esc(r.name+'대리운전')+'</a> · '+
     '<a href="'+esc(servicePath(r,'taksong'))+'">'+esc(r.name+'탁송')+'</a></li>').join('');
   return '<section><h2>'+esc(p.short+' 대리운전·탁송 | 펜션·골프장·관광지·호텔')+'</h2>'+
    '<p>'+esc(p.province)+'의 실제 법정 시·군·구와 읍면동리 안내로 연결합니다. 숙소나 골프장 명칭만으로 실제 차량 주차장 위치와 배차 가능 여부를 판단할 수 없습니다.</p>'+
    '<p><a href="'+esc(servicePath(p.r,'daeri'))+'">'+esc(p.short+'대리운전 전체')+'</a> · '+
    '<a href="'+esc(servicePath(p.r,'taksong'))+'">'+esc(p.short+'탁송 전체')+'</a></p>'+
    '<ul>'+rows+'</ul></section>';
  }).join('');
  const body='<section><h1>충청도대리운전·충청도탁송 | 충남·충북·대전·세종 펜션·팬션·골프장·호텔·낚시터</h1>'+
   '<p>충청남도 15개 시군, 충청북도 11개 시군, 대전광역시 5개 구와 세종특별자치시를 기존 법정행정구역 안내로 연결합니다. 펜션·호텔·맛집·캠핑장·낚시터·골프장·관광지·법인 단체 및 장거리 이용의 실제 출발 위치와 차량 인수·인계조건을 구분해 상담합니다.</p>'+
   '<h2>펜션·팬션·숙박시설 출발 대리운전 예약</h2><p>펜션이 모여 있는 외곽 읍·면·리에서는 기사 접근·복귀거리가 배차에 영향을 줍니다. 차량 주차장과 정확한 숙소 주소, 출발 희망시각·목적지를 먼저 알려주세요. 새벽·심야 장거리 대리운전과 여러 대 동시 요청은 예약 가능 여부를 상담합니다.</p>'+
   '<h2>펜션 차량회수·정비소·중고차 장거리 탁송</h2><p>운행 가능한 고객 차량을 기사가 직접 이동하는 로드탁송으로, 차량 상태·키 전달·도착지 수령자·보험조건을 확인합니다. 적재 화물 운송이나 주행 불가능 차량의 견인·운송과 구분합니다. 동·리 검색도 원래 법정 주소를 사용하며 별도 복제 키워드 페이지는 만들지 않습니다.</p>'+
   '<p><a href="/fare/?service=daeri">대리운전 예상요금</a> · <a href="/fare/?service=taksong">자동차탁송 예상요금</a> · <a href="/reviews/history/">완료 운행기록 확인</a> · <a href="tel:18114294">1811-4294 상담</a></p>'+
   '<p>이 페이지의 지역·업종 예시는 제휴 업체·완료 운행·고정요금·상주기사·즉시 배차를 뜻하지 않습니다.</p></section>'+sections;
  return layout('충청도대리운전·탁송 | 충남·충북·대전·세종 펜션·골프장 예약',
   '충청도대리운전·충청도탁송. 충남·충북·대전·세종 펜션·골프장·낚시터·호텔 장거리 예약과 요금조회. 1811-4294.',
   body,'https://'+host+HUB);
 }
 return Object.freeze({regionSection,searchMeta,resolve,hubPage,HUB,counts,originalGuideCount:17,existingChungnamCount:15,provinceCount:4});
}
module.exports={create,HUB,compact};
