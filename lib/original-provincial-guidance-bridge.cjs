'use strict';
// One existing, individually clarified customer-service guide per province and
// per service. This is editorial guidance discovery, NOT verified completed rides,
// local offices, guaranteed drivers, a new landing-page generator, or Naver indexing.
const IDS=Object.freeze({
 daeri:[2601,2611,2618,2625,2631,2635,2639,2643,2645,2663,2670,2675,2680,2685,2688,2692,2697],
 taksong:[2501,2511,2518,2525,2531,2535,2539,2543,2545,2563,2570,2575,2580,2585,2588,2592,2597]
});
function createBridge({daeri,taksong,regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('Province discovery requires original legal-region registry and HTML escapes');
 const source={daeri,taksong},allProvinces=new Set(
  [...regionByFullName.values()].filter(x=>x.level==='시도').map(x=>x.full_name)
 );
 if(allProvinces.size!==17)throw Error('Expected all 17 original legal provinces');
 const byService={};
 for(const kind of ['daeri','taksong']){
  const rows=source[kind],selected=[],seen=new Set();
  if(!Array.isArray(rows)||rows.length!==100)throw Error('Original twentieth service batch changed: '+kind);
  for(const id of IDS[kind]){
   const row=rows.find(x=>x.id===id);
   if(!row||row.kind!==kind||!row.related?.startsWith('/')||
      row.pickup.length<115||row.handover.length<115)
    throw Error('Unreviewed or missing service intake guidance: '+kind+'/'+id);
   const region=regionByFullName.get(row.region);
   if(!region||region.level==='리')throw Error('Unresolved or deep village SEO candidate: '+row.region);
   const province=row.region.split(/\s+/)[0];
   if(!allProvinces.has(province)||seen.has(province))
    throw Error('Duplicate or unknown provincial guide: '+kind+'/'+province);
   seen.add(province);
   selected.push(Object.freeze({
    kind,id,province,region:row.region,topic:row.topic,keyword:row.keyword,
    pickup:row.pickup,url:servicePath(region,kind)
   }));
  }
  if(selected.length!==17||seen.size!==17)throw Error('Incomplete province service coverage: '+kind);
  byService[kind]=Object.freeze(selected);
 }
 const daeriKeys=byService.daeri.map(x=>x.province).join('|');
 const taksongKeys=byService.taksong.map(x=>x.province).join('|');
 if(daeriKeys!==taksongKeys)throw Error('Taksong and daeri province discovery mismatch');
 const label=kind=>kind==='taksong'?'자동차탁송':'대리운전';
 const header='대표 지역 페이지에서 연결한 고객 예약 안내입니다. 현지 지점·기사 상주 또는 실제 완료 운행을 뜻하지 않으며, 확인된 운행기록은 별도 원본에서 확인합니다.';
 function national(kind){
  if(!byService[kind])return '';
  return '<section id="original-local-guidance-bridge-20261122" aria-label="17개 시·도 '+label(kind)+' 기존 지역 안내 연결">'+
   '<h2>17개 시·도 '+label(kind)+' 지역별 예약 준비</h2>'+
   '<p>'+header+' 각 지역의 차량 위치·인계·기사 복귀 조건을 구분해 볼 수 있습니다.</p>'+
   '<ul>'+byService[kind].map(x=>
    '<li><a href="'+esc(x.url)+'">'+esc(x.region+' '+label(kind))+'</a> · '+esc(x.topic)+'</li>'
   ).join('')+'</ul></section>';
 }
 function province(region,kind){
  if(!region||region.level!=='시도'||!byService[kind])return '';
  const x=byService[kind].find(x=>x.province===region.full_name);
  if(!x)return '';
  return '<section id="province-original-local-guidance-20261122" aria-label="'+esc(region.full_name)+' '+label(kind)+' 기존 상세 안내">'+
   '<h2>'+esc(region.full_name)+' '+label(kind)+' 실제 예약 준비 사례별 안내</h2>'+
   '<p>지역 서비스 안내이며 특정 차량의 완료 운행기록이나 확정요금이 아닙니다. 다음은 이 시·도의 기존 행정구역 중 '+esc(x.topic)+'을(를) 확인할 수 있는 상세 페이지입니다.</p>'+
   '<p><a href="'+esc(x.url)+'"><strong>'+esc(x.region+' '+label(kind))+' 자세히 보기</strong></a></p>'+
   '<p>'+esc(x.pickup)+'</p>'+
   '<p><a href="/reviews/verified/">공개 완료 운행기록 원본 확인</a> · <a href="/fare/?service='+kind+'">출발·도착 예상요금 조회</a></p>'+
   '</section>';
 }
 return Object.freeze({byService, national, province});
}
module.exports={IDS,createBridge};
