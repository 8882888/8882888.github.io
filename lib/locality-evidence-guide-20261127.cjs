'use strict';
// Deterministic evidence-limited guidance for the existing editorial backlog.
// This is navigation and address disambiguation, NOT local ride evidence.
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const key=x=>x.kind+'|'+x.region;
function reviewTargets(rows){
 const counts=new Map();
 for(const row of rows)for(const f of ['pickup','handover']){
  const k=f+'|'+clean(row[f]);counts.set(k,(counts.get(k)||0)+1);
 }
 const out=new Map();
 for(const row of rows){
  const region=clean(row.region),keyword=clean(row.keyword),topic=clean(row.topic);
  const pickup=clean(row.pickup),handover=clean(row.handover),related=clean(row.related),issues=[];
  if(!region||!keyword)issues.push('missing_region_or_keyword');
  if(topic.length<13)issues.push('thin_topic');
  if(pickup.length<80)issues.push('thin_pickup_context');
  if(handover.length<75)issues.push('thin_handover_context');
  if(!related)issues.push('missing_related_service_link');
  if(counts.get('pickup|'+pickup)>1)issues.push('repeated_pickup_text');
  if(counts.get('handover|'+handover)>1)issues.push('repeated_handover_text');
  if(/100%\s*(?:보장|배차)|즉시\s*배차\s*보장|상시\s*상주|무조건\s*배차/.test([topic,pickup,handover].join(' ')))issues.push('review_unverified_dispatch_claim');
  if(region.split(' ').at(-1)&&![topic,pickup,handover].join(' ').includes(region.split(' ').at(-1)))issues.push('last_locality_not_in_guidance');
  if(issues.length)out.set(key(row),issues);
 }
 return out;
}
function intentGuide(info){
 const text=info.keyword+' '+info.topic+' '+info.related;
 if(info.kind==='taksong'){
  if(/렌트|렌터|rental/i.test(text))return ['렌터카 반납·회수','계약상 반납점과 업체 승인 여부','반납 검수 시각, 추가 정산 담당자'];
  if(/서비스센터|정비|출고|repair|service-center/i.test(text))return ['정비 입출고','정비 접수 또는 완료 상태, 운행 가능 여부','센터 인계 담당자와 영업시간'];
  if(/수출|항만|항구|선적|export-port/i.test(text))return ['항만·선적 연계','반출 승인, 선적 접수 번호 및 실제 인수 장소','선적과 육상 이동 구간을 분리해 견적'];
  if(/화물|특수|트럭|truck/i.test(text))return ['화물·특수차','차종·톤수·제원, 정상 주행 및 면허 조건','차량 제원에 맞는 기사와 운행 가능 조건'];
  if(/중고|매매|경매|used-car|auction/i.test(text))return ['거래 차량 인수','차량 인도 승인, 차키 보관자 및 차량 상태','판매·구매 당사자 인계 시각'];
  if(/법인|기업|corporate/i.test(text))return ['법인 차량 이동','차량별 반출 승인 및 담당자','정산 증빙과 수령 부서'];
  if(/장거리|시외|long-distance/i.test(text))return ['장거리 차량 이동','시·군·구가 포함된 양쪽 주소와 정상 주행 여부','도착 시각, 통행료·주차료 및 기사 복귀 조건'];
  return ['일반 차량 이동','차량 주차 위치, 차키와 소유자 이동 승인','수령인, 도착지 주차 위치 및 인계 방식'];
 }
 if(/법인|기업|회식|corporate/i.test(text))return ['법인·단체 귀가','차량별 출발시간과 탑승자','정산 담당자, 증빙 조건 및 목적지별 배차'];
 if(/골프|golf/i.test(text))return ['골프장 이동','실제 골프장 명칭과 차량 주차 구역','라운드 종료 예상 시간과 기사 대기 여부'];
 if(/일일기사|왕복|daily-driver/i.test(text))return ['일일기사·왕복','출발·경유지·종료지 및 전체 일정','대기 시간과 추가 경유, 종료 조건'];
 if(/장거리|시외|long-distance/i.test(text))return ['장거리 동승 이동','탑승 위치, 최종 하차지 및 경유 순서','유료도로, 대기, 기사 복귀 교통 조건'];
 return ['일반 동승 이동','차량 위치와 고객 탑승 지점을 구분','최종 하차지, 경유 및 대기 여부'];
}
function create({rows,regions,servicePath,esc}){
 const targets=reviewTargets(rows);
 const byName=new Map(regions.map(r=>[r.full_name,r]));
 const byShort=new Map();
 for(const r of regions){
  const last=r.full_name.split(' ').at(-1),list=byShort.get(last)||[];
  list.push(r);byShort.set(last,list);
 }
 const plans=new Map();
 for(const info of rows){
  const issues=targets.get(key(info));if(!issues)continue;
  const r=byName.get(info.region);
  if(!r)throw Error('Unresolved reviewed locality: '+info.region);
  const hierarchy=info.region.split(' ');
  const parent=byName.get(hierarchy.slice(0,-1).join(' '))||null;
  const homonyms=(byShort.get(hierarchy.at(-1))||[]).filter(x=>x.full_name!==info.region);
  plans.set(key(info),{region:r,parent,homonyms,issues,info,intent:intentGuide(info)});
 }
 function render(r,kind){
  const plan=plans.get(kind+'|'+r.full_name);if(!plan)return '';
  const {parent,homonyms,info,intent,issues}=plan;
  const label=kind==='taksong'?'자동차탁송':'대리운전';
  // Retain every original field in source files and in existing SSR copy.
  // Add only actual registry distinctions and booking checks, not invented local landmarks.
  const parentLink=parent?'<p>상위 행정구역 안내: <a href="'+esc(servicePath(parent,kind))+'">'+esc(parent.full_name+' '+label)+'</a></p>':'';
  const otherPlaces=homonyms.length?'<p>같은 마지막 행정구역 명칭이 다른 주소에도 '+homonyms.length+'곳 있습니다. '+esc(homonyms.slice(0,3).map(x=>x.full_name).join(' · '))+(homonyms.length>3?' 등':'')+'과 구분해 전체 주소를 확인해 주세요.</p>':'';
  const exact='<dl><dt>행정구역</dt><dd>'+esc(r.full_name)+'</dd><dt>이용 유형</dt><dd>'+esc(intent[0])+'</dd><dt>출발 전</dt><dd>'+esc(intent[1])+'</dd><dt>도착·정산 전</dt><dd>'+esc(intent[2])+'</dd></dl>';
  const route='<p><a href="/fare/?service='+kind+'&amp;from='+encodeURIComponent(r.full_name)+'">이 주소에서 출발</a> · <a href="/fare/?service='+kind+'&amp;to='+encodeURIComponent(r.full_name)+'">이 주소로 도착</a> · <a href="/reviews/history/?kind='+kind+'&amp;region='+encodeURIComponent(r.slug)+'">해당 행정구역 기록 확인</a></p>';
  return '<div class="locality-evidence-guide" id="locality-evidence-guide-20261127"><h3>'+esc(r.full_name+' '+label+' 주소 확인 및 예약 조건')+'</h3>'+exact+otherPlaces+parentLink+route+'</div>';
 }
 return {targets,plans,render};
}
module.exports={reviewTargets,intentGuide,create};
