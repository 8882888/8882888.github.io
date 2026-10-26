'use strict';

// Stable, readable regional routes; figures always come from the shared calculator.
module.exports = function createRouteGuides({regions, byPath, pathBySlug, cachedRoadDistance, roadQuote, esc, layout, servicePath, phone, host, matchingHistoricalRides}) {
  const destinations = [
    {slug:'seoul', name:'서울역'}, {slug:'incheon', name:'인천시청'},
    {slug:'daejeon', name:'대전역'}, {slug:'daegu', name:'대구역'},
    {slug:'busan', name:'부산역'}
  ];
  const fullName = r => r.full_name || (r.parent_name && r.parent_name !== '대한민국' ? r.parent_name+' '+r.name : r.name);
  const groups = new Map();
  for (const r of regions) {
    const parts = String(fullName(r)).split(' ');
    const eligible = parts.length === 2 && ['시','군','구'].includes(r.level);
    if (!eligible && fullName(r) !== '세종특별자치시') continue;
    const key = parts[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const origins = [];
  const lists = [...groups.values()];
  for (let n = 0; origins.length < 200 && lists.some(g => n < g.length); n++) {
    for (const group of lists) {
      if (group[n] && origins.length < 200) origins.push(group[n]);
    }
  }
  if (origins.length !== 200) throw Error('Expected 200 regional origins, found ' + origins.length);
  const allowed = new Set(origins.map(r => r.slug));
  const routePath = (r, d) => '/fare/route/' + pathBySlug.get(r.slug) + '/' + d.slug + '/';
  const allPaths = () => origins.flatMap(r => destinations.map(d => routePath(r,d)));
  const calcUrl = (from, to, service) => '/fare/?service=' + service + '&amp;from=' + encodeURIComponent(from) + '&amp;to=' + encodeURIComponent(to) + '&amp;auto=1';
  function index() {
    const body = '<section><h2>전국 1,000개 출발·도착 구간</h2><p>지역과 목적지를 고르면 도로거리 기준 대리운전·탁송 예상요금과 예약 방법을 확인할 수 있습니다. 출발지와 도착지는 지역 대표 위치이며 정확한 주소와 이용 시간에 따라 요금이 달라집니다.</p><p><a href="/fare/">직접 주소 입력해 요금 계산</a> · <a href="tel:18114294">전화 상담 '+esc(phone)+'</a></p></section>' +
      origins.map(r => '<section><h2>'+esc(fullName(r))+' 출발</h2><ul>'+destinations.map(d => '<li><a href="'+esc(routePath(r,d))+'">'+esc(fullName(r))+' → '+esc(d.name)+' 대리운전·탁송 예상요금</a></li>').join('')+'</ul><p><a href="'+esc(servicePath(r,'daeri'))+'">지역 대리운전 안내</a> · <a href="'+esc(servicePath(r,'taksong'))+'">지역 탁송 안내</a></p></section>').join('');
    return layout('전국 대리운전·탁송 1,000개 구간 예상요금','전국 지역별 주요 목적지의 대리운전·탁송 예상요금과 예약 방법을 확인하세요.',body,'https://'+host+'/fare/routes/');
  }
  async function page(regionPath, destinationSlug) {
    const r = byPath.get(regionPath);
    const d = destinations.find(x => x.slug === destinationSlug);
    if (!r || !allowed.has(r.slug) || !d) return null;
    const origin = fullName(r), to = d.name, path = routePath(r,d);
    const km = await cachedRoadDistance(origin,to);
    function quote(kind) {
      if (!km) return '거리 조회 후 안내';
      const band = roadQuote(km,kind,origin,to).band;
      return band.map(n => n.toLocaleString('ko-KR')+'원').join(' ~ ');
    }
    const body = '<section><h2>'+esc(origin)+' → '+esc(to)+' 예상요금</h2><p>'+(km?'도로거리 약 '+esc(String(Math.round(km*10)/10))+'km 기준':'출발지와 목적지의 도로거리를 조회해 주세요.')+'</p><ul><li>대리운전 예상요금: <strong>'+esc(quote('daeri'))+'</strong> · <a href="'+calcUrl(origin,to,'daeri')+'">주소를 입력해 다시 계산</a></li><li>자동차탁송 예상요금: <strong>'+esc(quote('taksong'))+'</strong> · <a href="'+calcUrl(origin,to,'taksong')+'">주소를 입력해 다시 계산</a></li></ul><p>지역 대표 위치 기준의 참고요금입니다. 실제 주소·차종·시간대·기사 이동과 통행료에 따라 달라집니다. 제주·섬 지역은 선박 운항과 선적비를 별도로 확인해 주세요.</p><p><a class="cta" href="tel:18114294">예약 상담 '+esc(phone)+'</a></p></section>'+
      '<section><h2>대리운전 부르는 방법</h2><ol><li>출발 주소와 차량 위치, 도착 주소를 확인합니다.</li><li>희망 출발 시간과 차종, 동승·경유·대기 여부를 알려주세요.</li><li>전화나 카카오톡으로 요금과 기사 배정 가능 여부를 상담합니다.</li><li>배정된 기사와 만날 장소 및 운행 조건을 확인합니다.</li></ol></section>'+
      '<section><h2>자동차탁송 신청 방법</h2><ol><li>차량 인수 주소와 인계 주소, 차종을 알려주세요.</li><li>차량 상태와 열쇠 전달 방법, 인수·인계 담당자와 시간을 확인합니다.</li><li>통행료·주차비와 기사 접근·복귀 조건을 상담한 후 배차를 진행합니다.</li><li>차량을 인수할 때와 목적지에 인계할 때 차량 상태를 확인합니다.</li></ol></section>'+
      '<section><h2>사전 예약과 장거리 이용</h2><p>심야·새벽, 산간·외곽, 항구나 골프장 출발은 기사 이동과 복귀 여건을 함께 확인합니다. 원하는 날짜·시간, 주차 위치, 차종을 미리 알려주시면 상담에 도움이 됩니다. 운행 날짜와 조건에 따라 배차가 달라질 수 있습니다.</p><p><a href="/reviews/">실제 운행 기록 보기</a> · <a href="'+esc(servicePath(r,'daeri'))+'">'+esc(origin)+' 대리운전</a> · <a href="'+esc(servicePath(r,'taksong'))+'">'+esc(origin)+' 탁송</a> · <a href="/fare/routes/">다른 구간 찾기</a></p></section>';
    const related = matchingHistoricalRides(origin,to);
    const relatedLinks = related.map(x=>'<li><a href="'+esc(x.url)+'">'+esc(x.date+' '+x.from+' → '+x.to)+'</a></li>').join('');
    const relatedHtml = '<section><h2>관련 실제 운행기록</h2>'+(related.length?'<ul>'+relatedLinks+'</ul>':'<p>이 구간과 일치하는 공개 운행기록은 아직 없습니다.</p>')+'<p><a href="/reviews/history/">전국 운행기록 목록</a></p></section>';
    return layout(origin+' → '+to+' 대리운전·탁송 예상요금',origin+'에서 '+to+'까지의 대리운전과 자동차탁송 예상요금, 예약·배차 상담 '+phone+'.',body+relatedHtml,'https://'+host+path);
  }
  function regionSection(r) {
    if (!allowed.has(r.slug)) return '';
    return '<section><h2>'+esc(fullName(r))+' 출발 주요 구간 안내</h2><ul>'+
      destinations.map(d => '<li><a href="'+esc(routePath(r,d))+'">'+esc(r.name)+' → '+esc(d.name)+' 예상요금과 예약</a></li>').join('')+
      '</ul><p><a href="/fare/routes/">전국 1,000개 구간 찾기</a></p></section>';
  }
  return {index,page,allPaths,origins,destinations,regionSection};
};
