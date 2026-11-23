'use strict';
// Exporter-oriented commercial road-transfer guide. Never conflate yard delivery with customs,
// restricted port entry, stuffing/shoring, ocean shipping, purchase decisions or a completed ride.
const data=require('../data/exporter-b2b-sales-20261123.json');
const PORT='/business/export-port/';
const sanitize=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[\s·_,.()\/\-→]+/g,'');
const quote=(from,to)=>'/fare/?service=taksong&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Exporter SEO requires source-backed region inventory and existing canonical URL resolver');
 if(data.version!==1||data.routes.length!==10||data.intentAliases.length!==18)
  throw Error('Unverified source data for exporter B2B');
 const outgoing=new Map(),incoming=new Map(),aliases=new Map(),destinations=new Set(),canonicalPaths=new Set();
 function register(term,url){
  const normalized=sanitize(term);
  if(normalized.length<4||aliases.has(normalized)&&aliases.get(normalized)!==url)
   throw Error('Exporter duplicate/unqualified keyword '+term);
  aliases.set(normalized,url);
 }
 for(const term of data.intentAliases)register(term,PORT);
 for(const row of data.routes){
  const from=regionByFullName.get(row.from),to=regionByFullName.get(row.to);
  if(!from||!to||outgoing.has(row.from)||from.name!==row.from.split(' ').at(-1)||
    !['시','구','군'].includes(from.level)||
    !['동','읍'].includes(to.level)||row.body.length<100||
    !['인천광역시 연수구 옥련동','경기도 평택시 포승읍'].includes(row.to))
   throw Error('Exporter region source or destination is not registered '+row.from+' → '+row.to);
  const payload=Object.freeze({...row,fromRegion:from,toRegion:to});
  outgoing.set(row.from,payload);
  destinations.add(row.to);
  canonicalPaths.add(servicePath(from,'taksong'));
  canonicalPaths.add(servicePath(to,'taksong'));
  const port=row.to.startsWith('인천')?'송도수출단지':'평택항';
  for(const q of [
   row.fromLabel+'중고차수출업체탁송',
   row.fromLabel+'수출차량탁송',
   row.fromLabel+port+'탁송',
   row.fromLabel+port+'수출차량탁송'
  ])register(q,servicePath(from,'taksong'));
  if(!incoming.has(row.to))incoming.set(row.to,[]);
  incoming.get(row.to).push(payload);
 }
 if(outgoing.size!==10||destinations.size!==2||canonicalPaths.size!==12)
  throw Error('Exporter origin/destination registries are incomplete');
 function sourceLi(r){
  return '<li><a href="'+esc(servicePath(r.fromRegion,'taksong'))+'">'+
   esc(r.fromLabel+'→'+r.toLabel+' '+r.focus)+'</a> — '+esc(r.body)+
   ' <a href="'+quote(r.from,r.to)+'">'+esc('출발→도착 예상요금')+'</a> · '+
   '<a href="'+quote(r.to,r.from)+'">역방향 조회</a></li>';
 }
 function sourcePage(r){
  return '<section id="exporter-b2b-origin-20261123">'+
   '<h2>'+esc(r.fromLabel+'중고차수출업체탁송 | '+r.toLabel+' 입고')+'</h2>'+
   '<p><strong>'+esc(r.focus)+'</strong>: '+esc(r.body)+'</p>'+
   '<p>수출차량의 경매·매매 반출은 업체별 출고 승인, 차량 키 담당자·주행 가능 상태, 인천·평택 인계지의 지정 주차장과 영업시간을 반드시 확인합니다. 통관·선적·컨테이너 적입·쇼링은 별도 담당 업무입니다.</p>'+
   '<p><a href="'+quote(r.from,r.to)+'">'+esc(r.fromLabel+'→'+r.toLabel+' 수출매입차 탁송 예상요금')+'</a> · '+
   '<a href="'+quote(r.to,r.from)+'">출발지·도착지 역방향 조회</a> · '+
   '<a href="'+esc(servicePath(r.toRegion,'taksong'))+'">'+esc(r.toLabel+' 차량 인계지 정보')+'</a> · '+
   '<a href="'+PORT+'">중고차 수출업체 다대수·정기거래 상담</a> · '+
   '<a href="tel:18114294">1811-4294</a></p>'+
   '<p>구간은 상담과 요금조회 예시입니다. 실제 완료 운행, 확정 거리(km), 고정요금, 수출업체 정기계약, 현장 전담기사 또는 항만 출입허가를 의미하지 않습니다.</p></section>';
 }
 function destinationPage(r,k){
  const incomingRows=incoming.get(r.full_name)||[];
  return '<section id="exporter-b2b-destination-20261123"><h2>'+esc(r.name+' 수출차량탁송·중고차수출단지 입고')+'</h2>'+
   '<p>'+ (r.full_name.includes('옥련동')
    ?'송도유원지 인근 수출차량 보관·인계지의 법정동은 인천 연수구 옥련동입니다. 사업장 위치에 따라 실제 수령 지점은 달라지므로 단지 명칭만으로 게이트나 항만 출입을 확정하지 않습니다.'
    :'평택항 인근 수출업체 지정 인계지는 평택시 포승읍 일대의 실제 사업장 주소와 담당자를 확인해야 합니다. 항만 보안구역·터미널 출입은 일반 로드탁송에 자동 포함되지 않습니다.')+'</p>'+
   '<h3>출발 지역별 수출매입차 회송·예상요금</h3><ul>'+incomingRows.map(sourceLi).join('')+'</ul>'+
   '<p><a href="'+PORT+'">수출업체·무역업체 대표/물류 담당자 상담</a> · '+
   '<a href="tel:18114294">차량 출고·단지 입고 문의 1811-4294</a></p></section>';
 }
 function regionSection(region,kind){
  if(kind!=='taksong'||!region)return '';
  const source=outgoing.get(region.full_name);
  if(source)return sourcePage(source);
  if(incoming.has(region.full_name))return destinationPage(region,kind);
  return '';
 }
 function nationalSection(kind){
  if(kind!=='taksong')return '';
  const featured=[...outgoing.values()].filter(x=>['오산','안성','강남','천안','아산'].includes(x.fromLabel));
  return '<section id="exporter-b2b-national-20261123"><h2>중고차수출업체탁송 | 경매장 매입차·수출단지 입고·법인 정기거래</h2>'+
   '<p>중고차 수출업체·무역업체 대표, 매입·차량물류 담당자는 전국 경매장·매매단지·고객 보관지 출발 차량을 <strong>인천 송도유원지 인근 수출단지</strong> 또는 <strong>평택항 인근 지정 인계지</strong>로 보내는 로드탁송을 상담할 수 있습니다. 실제 시설 인수·반출 승인, 차종·주행 가능 상태, 여러 대 이동 일정과 법인 정산 조건을 먼저 확인합니다.</p>'+
   '<ul>'+featured.map(sourceLi).join('')+'</ul>'+
   '<p><a href="'+PORT+'">중고차 수출업체 수송·정기거래·쇼링 협력 구분</a> · <a href="/business/#export">수출업체 상담 문의서</a> · <a href="tel:18114294">업체 상담 1811-4294</a></p>'+
   '<p>수출차량 운송 문의와 수출업 면허·차량 매입·통관·선박선적은 별도 업무입니다. 특정 수출업체와의 계약이나 확정 배차를 나타내지 않습니다.</p></section>';
 }
 function resolve(query){return aliases.get(sanitize(query))||null}
 return Object.freeze({regionSection,nationalSection,resolve,originCount:outgoing.size,
  destinationCount:destinations.size,canonicalPaths:[...canonicalPaths],keywordAliases:aliases.size});
}
module.exports={create,sanitize,PORT};
