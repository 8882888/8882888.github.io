'use strict';
// Local commercial routes are examples for new inquiries, never completed customer trips.
// Original canonical destination and origin URLs are re-used. No new keyword doorway pages.
const source=require('../data/gangnam-premium-b2b-corridors-20261123.json');
const previous=require('../data/gangnam-premium-corporate-intents-20261123.json');
const DISTRICT='서울특별시 강남구';
const services={taksong:'자동차탁송',daeri:'대리운전'};
const normalize=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[\s·_,.()\/\-→]+/g,'');
const quote=(kind,from,to)=>'/fare/?service='+kind+'&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Gangnam corridor guides need original legal regions and canonical resolver');
 const district=regionByFullName.get(DISTRICT);
 if(!district||district.level!=='구'||source.version!==1||
    previous.rows.length!==14||source.rows.length!==14)
  throw Error('Gangnam 14-corridor source/original inventory mismatch');
 const original=new Set(previous.rows.map(r=>r.region));
 const corridors=new Map(),aliases=new Map(),allTargets=new Set();
 const add=(word,r,k)=>{
  const key=normalize(word),dest=servicePath(r,k);
  if(!key||key.length<5||aliases.has(key)&&aliases.get(key)!==dest)
   throw Error('Conflicting Gangnam intercity search term '+word);
  aliases.set(key,dest);
 };
 for(const row of source.rows){
  const start=regionByFullName.get(row.from),end=regionByFullName.get(row.to);
  if(!start||!original.has(row.from)||!row.from.startsWith(DISTRICT+' ')||
    start.level!=='동'||start.name!==row.fromLabel||corridors.has(row.from)||
    !end||!['구','시','읍','동'].includes(end.level)||
    row.to.startsWith(DISTRICT+' ')||
    !row.destinationLabel||!row.taksongIntent.endsWith('탁송')||
    !row.daeriIntent.endsWith('대리운전')||
    row.taksongContext.length<72||row.daeriContext.length<72)
   throw Error('Unsupported actual legal Gangnam commercial source or destination '+JSON.stringify(row));
  const c=Object.freeze({...row,start,end});
  corridors.set(row.from,c);
  for(const kind of ['taksong','daeri']){
   allTargets.add(servicePath(start,kind));
   for(const prefix of [row.fromLabel,'강남'+row.fromLabel,'서울강남'+row.fromLabel])
    add(prefix+row.destinationLabel+row[kind+'Intent'],start,kind);
   // Generic district corridor keywords land on the existing district canonical.
   add('강남'+row.destinationLabel+row[kind+'Intent'],district,kind);
  }
 }
 if(corridors.size!==14||allTargets.size!==28||[...original].some(x=>!corridors.has(x)))
  throw Error('Incomplete 14 Gangnam administrative origin route pairs');
 for(const [term,kind] of [
  ['강남판교법인탁송','taksong'],
  ['강남판교법인차량탁송','taksong'],
  ['강남인천공항법인탁송','taksong'],
  ['강남인천공항수입차탁송','taksong'],
  ['강남용인수지수입차탁송','taksong'],
  ['강남인천공항VIP대리운전','daeri'],
  ['강남인천공항고급대리운전','daeri'],
  ['강남일산고급대리운전','daeri'],
  ['강남판교장거리법인대리운전','daeri']
 ])add(term,district,kind);
 function info(c,k){
  const label=c.fromLabel+'→'+c.destinationLabel+' '+c[k+'Intent'];
  return '<section id="gangnam-corporate-intercity-route-20261123">'+
   '<h3>'+esc(label)+' | 지역간 예약·도로거리·예상요금</h3>'+
   '<p>'+esc(c[k+'Context'])+'</p>'+
   '<p><a href="'+quote(k,c.from,c.to)+'">'+esc(label+' 출발→도착 거리·예상요금 조회')+'</a> · '+
   '<a href="'+quote(k,c.to,c.from)+'">'+esc(c.destinationLabel+'→'+c.fromLabel+' 역방향 요금조회')+'</a> · '+
   '<a href="'+esc(servicePath(c.end,k))+'">'+esc(c.destinationLabel+' 도착지 '+services[k]+' 안내')+'</a></p>'+
   '<p>이 구간은 <strong>예약 검색 예시</strong>입니다. 실제 완료 운행·확정된 km·고정요금·기사 상주나 즉시 배차를 뜻하지 않습니다. 차량의 실제 출차 위치와 목적지 인수·인계 조건을 별도로 확인해야 합니다.</p></section>';
 }
 function districtInfo(k){
  const list=[...corridors.values()].map(c=>'<li>'+
   '<a href="'+esc(servicePath(c.start,k))+'">'+esc(c.fromLabel+'→'+c.destinationLabel+' '+c[k+'Intent']+' 지역 안내')+'</a> — '+
   esc(c[k+'Context'])+' <a href="'+quote(k,c.from,c.to)+'">'+esc('출발→도착 요금조회')+'</a>'+
   ' · <a href="'+quote(k,c.to,c.from)+'">역방향 조회</a>'+
   ' · <a href="'+esc(servicePath(c.end,k))+'">도착지역 정보</a></li>').join('');
  return '<section id="gangnam-corporate-intercity-14-20261123">'+
   '<h2>'+(k==='taksong'?'강남 판교·분당·인천공항·용인·일산 법인차·수입차·시승차탁송':'강남 판교·분당·인천공항·용인·일산 법인·VIP·고급대리운전')+'</h2>'+
   '<p>강남구의 14개 법정동에서 다른 시·구·읍·동으로 이동하는 <strong>출발→도착별 상담 예시</strong>입니다. 같은 강남 출발이라도 실제 주차 장소와 목적지, 법인 승인·인수·인계 및 기사 접근·복귀 조건이 달라 견적·예약이 달라집니다. 인천공항 인근 운서동은 현재 행정구역인 <strong>인천광역시 영종구 운서동</strong>이며 공항 터미널·제한구역 출입을 보장하지 않습니다.</p>'+
   '<ul>'+list+'</ul>'+
   '<p><a href="/fare/?service='+k+'&amp;from='+encodeURIComponent(DISTRICT)+'">강남 출발 예상요금</a> · '+
   '<a href="'+(k==='taksong'?'/business/':'/service/corporate/')+'">'+
   (k==='taksong'?'법인차량·기업탁송 상담':'기업 법인대리운전·후불 정산')+'</a> · '+
   '<a href="tel:18114294">법인 예약 1811-4294</a></p>'+
   '<p>고객 동승이 있으면 대리운전, 차량만 인계하면 자동차탁송으로 구분합니다. 시승차 운송은 고객의 시승 체험을 제공한다는 뜻이 아니며 고급·VIP 요청은 전담 기사 등급을 약속하지 않습니다. 법인카드·후불·월말정산 승인과 보험 적용은 별도로 확인합니다.</p></section>';
 }
 function regionSection(r,k){
  if(!r||!['taksong','daeri'].includes(k))return '';
  if(r.full_name===DISTRICT)return districtInfo(k);
  const found=corridors.get(r.full_name);
  return found?info(found,k):'';
 }
 function nationalSection(k){
  if(!['taksong','daeri'].includes(k))return '';
  const selected=['역삼동','삼성동','청담동','수서동']
   .map(name=>corridors.get(DISTRICT+' '+name));
  return '<section id="gangnam-corporate-intercity-national-20261123">'+
   '<h3>강남 지역간 '+(k==='taksong'?'법인탁송·수입차탁송·시승차탁송':'법인대리운전·고급·VIP대리운전')+' 예상요금</h3>'+
   '<p>'+selected.map(c=>'<a href="'+esc(servicePath(c.start,k))+'">'+
    esc(c.fromLabel+'→'+c.destinationLabel+' '+c[k+'Intent'])+'</a> · '+
    '<a href="'+quote(k,c.from,c.to)+'">요금조회</a>').join(' · ')+'</p>'+
   '<p>지역간 검색·요금조회 예시이며 완료 운행기록·승인된 기업 거래처·즉시 배차를 보장하지 않습니다. '+
   '<a href="'+esc(servicePath(district,k))+'">강남구 14개 지역간 예약 안내</a> · '+
   '<a href="tel:18114294">1811-4294 상담</a></p></section>';
 }
 function resolveRouteIntent(query){return aliases.get(normalize(query))||null}
 return Object.freeze({regionSection,nationalSection,resolveRouteIntent,
  originCount:corridors.size,uniqueDestinations:new Set([...corridors.values()].map(c=>c.to)).size,
  aliasCount:aliases.size,canonicalOrigins:[...allTargets]});
}
module.exports={create,normalize};
