'use strict';
// Gangnam premium/corporate customer discovery on EXISTING legally registered URLs.
// No ride evidence, manufacturer partnership, chauffeur grade or invoice acceptance is inferred.
const data=require('../data/gangnam-premium-corporate-intents-20261123.json');
const original=require('../data/gangnam-yulhyeon-b2b-20261122.json');
const DISTRICT=data.district;
const kindNames={taksong:'자동차탁송',daeri:'대리운전'};
const places=['서울특별시 서초구','서울특별시 송파구','경기도 성남시'];
const quote=(kind,from,to)=>'/fare/?service='+kind+
 '&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Gangnam premium corporate guide requires official legal region canonical URLs');
 const district=regionByFullName.get(DISTRICT);
 if(!district||district.level!=='구'||data.rows.length!==14||
    original.relatedDongs.length!==14||!['서울특별시 강남구 율현동'].includes(original.focus))
  throw Error('Invalid original Gangnam district/14 legal-dong guide');
 const neighbors=places.map(full=>{
  const r=regionByFullName.get(full);
  if(!r||!['구','시'].includes(r.level))throw Error('Unverified corridor '+full);
  return r;
 });
 const rows=new Map(),paths=new Set(),names=new Set();
 for(const entry of data.rows){
  const r=regionByFullName.get(entry.region);
  if(!r||r.level!=='동'||!entry.region.startsWith(DISTRICT+' ')||
    r.name!==entry.dong||!original.relatedDongs.includes(entry.dong)||
    names.has(entry.dong)||entry.taksong.length<65||entry.daeri.length<65)
   throw Error('Unknown or thin premium Gangnam locality '+entry.region);
  rows.set(entry.region,Object.freeze({...entry,region:r}));
  names.add(entry.dong);
  for(const k of ['taksong','daeri'])paths.add(servicePath(r,k));
 }
 if(rows.size!==14||original.relatedDongs.some(n=>!names.has(n)))
  throw Error('Every original Gangnam legal dong requires unique dual service guidance');
 for(const k of ['taksong','daeri'])paths.add(servicePath(district,k));
 if(paths.size!==30||data.scenarios.length!==5||data.services.taksong.length!==15||
    data.services.daeri.length!==13)
  throw Error('Invalid B2B premium service inventory or canonical route count');
 const link=(r,k)=>'<a href="'+esc(servicePath(r,k))+'">'+esc((r.full_name===DISTRICT?'서울강남구':'강남'+r.name)+(k==='taksong'?'탁송':'대리운전'))+'</a>';
 const check=k=>k==='taksong'
  ?'시승차 이동은 시승 체험 운행·고객 동승이 아니라 차량 자체를 출발지에서 목적지로 전달하는 로드탁송입니다. 출고·반출 승인, 차량 상태, 인수·인계 담당자, 보험 적용 및 실제 기사 배차 가능 여부를 확인합니다.'
  :'고급·VIP·임원대리운전은 서비스 요청 표현으로 특정 등급의 전담 의전기사를 보장하지 않습니다. 고객 동승, 차량 운전 가능 상태, 운전자 면허·보험, 정차·대기 시간과 법인 후불·월말정산의 사전 계약 여부를 확인합니다.';
 const businessLinks=k=>k==='taksong'
  ?'<a href="/business/used-car/">강남 수입차·매매단지 탁송</a> · <a href="/service/taksong-purpose/">법인차·시승차 이동 목적</a> · <a href="/taksong/types/#imported-service-centers">수입차 서비스센터탁송</a>'
  :'<a href="/service/corporate/">법인·후불 대리운전</a> · <a href="/service/daily-driver/">임원 수행·대기 일일기사</a> · <a href="/service/golf/">법인 골프장 대리운전</a>';
 function bookingLinks(r,k,index){
  const dest=neighbors[index%neighbors.length];
  return '<p><a href="'+quote(k,r.full_name,dest.full_name)+'">'+
   esc(r.name+'→'+dest.name+' '+kindNames[k]+' 예상요금·거리 조회')+'</a> · '+
   '<a href="'+quote(k,dest.full_name,r.full_name)+'">'+
   esc(dest.name+'→'+r.name+' 역방향 예상요금 조회')+'</a> · '+
   '<a href="'+esc(servicePath(dest,k))+'">'+esc(dest.name+' '+kindNames[k]+' 지역정보')+'</a></p>';
 }
 function city(k){
  const isT=k==='taksong';
  const cases=data.scenarios.filter(s=>isT?!['premium-driver','corporate-driver'].includes(s.id):['premium-driver','corporate-driver'].includes(s.id))
   .map(s=>'<li><strong>'+esc(s.title)+'</strong><p>'+esc(s.detail)+'</p></li>').join('');
  const list=[...rows.values()].map(e=>{
   const r=e.region;
   return '<li>'+link(r,k)+' — '+esc(e[k])+'</li>';
  }).join('');
  return '<section id="gangnam-premium-corporate-20261123" aria-label="강남구 법인·수입차·시승차·고급대리운전 지역 안내">'+
   '<h2>'+ (isT?'강남법인탁송·강남수입차탁송·강남시승차탁송':'강남고급대리운전·강남법인대리운전·임원·VIP 예약')+'</h2>'+
   '<p>서울 강남구의 기업·전시장·업무시설·호텔·매매단지 차량 이동은 차량이 실제 있는 주차장과 회사 승인 절차에 따라 상담 조건이 다릅니다. <strong>'+esc(check(k))+'</strong></p>'+
   '<h3>강남구 서비스별 구분과 인수·운행 체크사항</h3><ul>'+cases+'</ul>'+
   '<h3>강남 14개 법정동별 '+(isT?'수입차·시승차·법인차탁송':'법인·고급·VIP대리운전')+'</h3>'+
   '<ul>'+list+'</ul>'+
   '<p>검색 표현: '+esc(data.services[k].join(' · '))+'. 차량·인수 조건별 문의 키워드이며 완료된 배차, 전담 기업고객이나 협약된 수입차 공식 딜러를 나타내지 않습니다.</p>'+
   '<p>'+businessLinks(k)+' · <a href="/fare/?service='+k+'&amp;from='+encodeURIComponent(DISTRICT)+'">강남구 출발 예상요금 조회</a> · <a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function dong(entry,k){
  const r=entry.region,index=[...rows.keys()].indexOf(entry.region),isT=k==='taksong';
  const picks=isT?data.services.taksong.slice(0,9):data.services.daeri.slice(0,9);
  const aliases=picks.map(x=>r.name+x).join(' · ');
  return '<section id="gangnam-premium-b2b-local-20261123" aria-label="'+esc(r.full_name+' '+(isT?'법인 수입차 시승차 탁송':'법인 고급 대리운전'))+'">'+
    '<h2>'+esc('강남'+r.name+(isT?'법인탁송·수입차탁송·시승차탁송':'고급대리운전·법인대리운전'))+'</h2>'+
    '<p><strong>'+esc(r.full_name+' 출발 '+kindNames[k]+' 상담')+'</strong>: '+esc(entry[k])+'</p>'+
    '<h3>'+esc(r.name+' '+(isT?'시승차 인계와 기업차량 이동':'법인·고급차 예약 절차'))+'</h3>'+
    '<p>'+esc(check(k))+'</p>'+
    '<p>관련 지역 검색어: '+esc(aliases)+'. 실제 대여·시승 체험이나 운행완료 사례, 고정 단가가 아닌 예약 조건 안내입니다.</p>'+
    bookingLinks(r,k,index)+
    '<p>'+link(district,k)+' · '+businessLinks(k)+' · '+
    '<a href="/fare/?service='+k+'&amp;from='+encodeURIComponent(r.full_name)+'">출발지 요금조회</a> · '+
    '<a href="tel:18114294">1811-4294 예약 문의</a></p></section>';
 }
 function regionSection(r,k){
  if(!r||!['taksong','daeri'].includes(k))return '';
  if(r.full_name===DISTRICT)return city(k);
  const entry=rows.get(r.full_name);
  return entry?dong(entry,k):'';
 }
 function searchMeta(r,k){
  if(!r||!['taksong','daeri'].includes(k)||r.full_name===DISTRICT||r.full_name===original.focus)return null;
  const entry=rows.get(r.full_name);
  if(!entry)return null;
  const label='강남'+r.name;
  const title=k==='taksong'
    ?label+'법인탁송·수입차탁송 | 시승차량 인수·인계'
    :label+'고급대리운전·법인대리운전 | 임원·예약';
  const description=k==='taksong'
    ?label+' 법인차량탁송·수입차탁송·시승차탁송. 차량 반출 승인, 전시장 시승차 회송, 인수·인계 담당자, 예상요금과 실제 배차 조건을 확인하세요. 1811-4294.'
    :label+' 고급대리운전·법인대리운전·임원대리운전. 출발 주차장·대기시간·기사 접근·복귀, 후불·법인카드 사전 승인 및 장거리 예약 상담 1811-4294.';
  if(title.length>70||description.length<70||description.length>160)
   throw Error('Invalid Gangnam premium metadata '+r.full_name+' '+k+' '+description.length);
  return {title,description};
 }
 function nationalSection(k){
  if(!['taksong','daeri'].includes(k))return '';
  const isT=k==='taksong';
  const focused=isT
   ?['corporate-fleet','imported-showroom','test-drive']
   :['premium-driver','corporate-driver'];
  const links=data.scenarios.filter(s=>focused.includes(s.id))
   .map(s=>'<li><strong>'+esc(s.title)+'</strong> — '+esc(s.detail)+'</li>').join('');
  return '<section id="gangnam-premium-national-discovery-20261123">'+
   '<h2>'+(isT?'강남 법인탁송·수입차탁송·시승차탁송':'강남 고급대리운전·법인대리운전·VIP 예약')+'</h2>'+
   '<ul>'+links+'</ul><p>'+link(district,k)+' · '+
   ['역삼동','삼성동','청담동','율현동'].map(n=>link(regionByFullName.get(DISTRICT+' '+n),k)).join(' · ')+
   ' · '+businessLinks(k)+' · <a href="tel:18114294">1811-4294 상담</a></p>'+
   '<p>제휴·전담 배차·기업 후불승인과 수입차 차량탁송·VIP 운행의 즉시 확약을 뜻하지 않으며, 실제 견적·운행가능 조건은 확인 후 안내합니다.</p></section>';
 }
 return Object.freeze({regionSection,searchMeta,nationalSection,sourceCount:rows.size,
   canonicalPaths:[...paths],scenarioCount:data.scenarios.length,district});
}
module.exports={create,DISTRICT};
