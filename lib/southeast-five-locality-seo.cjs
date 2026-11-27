'use strict';
// Independently authored, location-specific guidance for five pre-existing
// canonical region pages (two services each). No invented trips, rates, driver
// staffing, branch offices, or affiliations; the archive is the sole ride source.
const ITEMS=Object.freeze({
 '부산광역시 해운대구':{
  name:'해운대구',parent:'부산광역시',
  nearby:['부산광역시 수영구','부산광역시 기장군','부산광역시 동래구'],
  locations:'해운대해수욕장·구남로·센텀시티·우동·좌동',
  daeri:{
   title:'해운대구대리운전 | 부산 해운대장거리대리운전 예약',
   description:'해운대구대리운전·해운대장거리대리운전. 해운대해수욕장·센텀시티 출발 전국 장거리 귀가 예약·요금 1811-4294.',
   heading:'해운대·센텀시티에서 기사와 만날 곳',
   body:'해운대해수욕장·구남로 상권에서 식사 후 출발한다면 고객이 기다리는 장소보다 차량이 있는 주차장과 실제 출입구를 먼저 알려주세요. 우동·중동 호텔과 센텀시티 업무시설은 건물·주차층에 따라 픽업 장소가 다릅니다. 좌동·반여동·재송동 귀가와 부산 다른 구·군으로 이동하는 경우 출발 희망시각과 경유·대기 여부를 구분합니다.'
  },
  taksong:{
   title:'해운대구탁송 | 부산 해운대장거리탁송·차량 인수',
   description:'해운대구탁송·해운대장거리탁송. 부산 해운대 호텔·센텀시티 차량 인수, 전국 로드탁송 견적 상담 1811-4294.',
   heading:'센텀·우동·좌동 차량 인수 및 정비 출고',
   body:'센텀시티·우동 업무시설과 좌동·재송동 주거단지 출발 차량은 주차장 출구와 실제 보관 위치를 구분해야 합니다. 정비소 입출고·개인 간 차량 인계는 차량 키 담당자, 주행 가능 상태와 출고 승인 시각을 확인합니다. 부산항·기장·양산 등 다른 지역 도착은 수령 담당자와 인계 마감시간을 별도로 확인하세요.'
  }
 },
 '울산광역시 남구':{
  name:'울산남구',parent:'울산광역시',
  nearby:['울산광역시 중구','울산광역시 동구','울산광역시 울주군'],
  locations:'삼산동·달동·신정동·옥동·무거동',
  daeri:{
   title:'울산남구대리운전 | 삼산동·달동·무거동 예약·요금',
   description:'울산남구대리운전·울산삼산동대리운전. 삼산동·달동·신정동·무거동 출발 심야·법인·장거리 예약요금 상담 1811-4294.',
   heading:'삼산동·달동 식사·모임 뒤 대리운전',
   body:'삼산동 상권과 달동 식당가의 출발 주차장은 이용 업소와 떨어져 있을 수 있으므로 건물명·주차층·출구를 확인해 주세요. 신정동 업무시설과 옥동·무거동 주거지역은 차량이 있는 정확한 위치를 기사에게 전달해야 합니다. 울주군 언양·온산 또는 부산 방향 장거리 이동은 기사 복귀 여건과 경유 여부를 미리 상담합니다.'
  },
  taksong:{
   title:'울산남구탁송 | 삼산·옥동·무거동 차량 인수·요금',
   description:'울산남구탁송·울산삼산동탁송. 삼산·옥동·무거동 차량 인수·정비 출고·장거리 로드탁송, 현재 예상요금 상담 1811-4294.',
   heading:'삼산·옥동 차량 인수와 산업·정비시설 출고',
   body:'울산 남구 삼산동 업무시설과 신정동·옥동·무거동 차량 인계는 건물 주차층, 열쇠 보관 담당자와 출입 가능한 시간을 확인해야 합니다. 차량 정비 출고·법인 차량 이동은 반출 승인 여부와 정상 운행 가능 상태를 구분합니다. 울산 북구·울주군·양산 등 목적지 인수자가 차량을 받을 수 있는 시각과 장소를 사전에 확인하세요.'
  }
 },
 '경상남도 창원시 성산구':{
  name:'창원성산구',parent:'경상남도 창원시',
  nearby:['경상남도 창원시 의창구','경상남도 창원시 마산합포구','경상남도 창원시 진해구'],
  locations:'상남동·중앙동·가음정동·성주동',
  daeri:{
   title:'창원성산구대리운전 | 상남동·중앙동·골프장 예약',
   description:'창원성산구대리운전·창원상남동대리운전. 상남동·중앙동 식당·법인·골프장 모임 후 심야·장거리 예약 1811-4294.',
   heading:'상남동 식당가·중앙동 업무시설 대리운전',
   body:'창원 성산구 상남동 식당가와 중앙동 업무시설 출발은 차량을 주차한 위치와 만날 출입구를 구분해 주세요. 가음정동·성주동 방향 이동 및 의창·마산·진해 등 다른 구 귀가는 도착지와 경유 여부를 구체적으로 안내해야 합니다. 골프장 라운딩 뒤 단체 차량을 여러 대 예약하면 차량별 종료 시각·목적지·결제수단을 따로 확인합니다.'
  },
  taksong:{
   title:'창원성산구탁송 | 상남·성주·가음정 차량 출고·인계',
   description:'창원성산구탁송·창원상남동탁송. 상남·성주·가음정 산업시설·정비소 차량 출고, 부산·김해 방면 로드탁송 상담 1811-4294.',
   heading:'성산구 산업시설·정비센터 차량 출고 인계',
   body:'창원 성산구 성주동·가음정동 등 산업시설 주변에서 차량을 인수한다면 보관구역과 반출 허가 담당자, 출입 가능한 시각을 확인합니다. 상남동 업무용 차량과 중고차·정비센터 입출고는 차종·차키·서류 전달자 및 주행 가능 상태가 중요합니다. 마산·진해·부산·김해 방면 인계는 도착지 수령인과 기사 복귀 조건을 함께 상담하세요.'
  }
 },
 '경상남도 양산시 물금읍':{
  name:'양산물금읍',parent:'경상남도 양산시',
  nearby:['경상남도 양산시 동면','경상남도 양산시 평산동','경상남도 양산시 하북면'],
  locations:'물금신도시·범어리·가촌리·증산',
  daeri:{
   title:'양산물금대리운전 | 물금읍·범어리·증산 예약·요금',
   description:'양산물금대리운전·물금읍대리운전. 범어리·가촌리·증산 출발 심야·장거리 예약, 부산·울산 방면 요금 상담 1811-4294.',
   heading:'물금신도시·범어리·가촌리 출발 대리운전',
   body:'양산 물금읍 범어리·가촌리와 증산 일대는 단지·상가마다 주차장 진입로가 다르므로 차량 위치·출입구를 함께 알려주세요. 물금신도시의 저녁 모임 뒤 부산·김해·울산 방면 이동은 최종 목적지와 경유·대기 유무를 확인해야 합니다. 동면·하북면 또는 원동면 외곽으로 이동할 때는 기사 복귀 조건에 따라 예약 가능한 시각이 달라질 수 있습니다.'
  },
  taksong:{
   title:'양산물금탁송 | 물금읍·범어리·가촌리 차량 인수',
   description:'양산물금탁송·물금읍탁송. 범어리·가촌리·증산 주거·정비시설 차량 인수·인계, 부산·울산 장거리 견적 상담 1811-4294.',
   heading:'물금읍 아파트·정비소 차량 인수·인계',
   body:'물금읍 범어리·가촌리·증산 일대에서 차량을 인수하려면 실제 주차층과 출차 가능한 출입구, 차량 키 전달자를 확인합니다. 정비시설 출고·개인 간 중고차 인계는 승인 시각과 정상 주행 가능 여부가 서로 달라 사전 확인이 필요합니다. 부산·김해·울산 등 목적지 이동은 인수자 도착 시각과 기사 복귀 동선까지 고려해 현재 견적을 상담합니다.'
  }
 },
 '부산광역시 기장군 정관읍':{
  name:'정관읍',parent:'부산광역시 기장군',
  nearby:['부산광역시 기장군 기장읍','부산광역시 기장군 일광읍','부산광역시 기장군 장안읍'],
  locations:'정관신도시·모전리·매학리·용수리',
  daeri:{
   title:'정관읍대리운전 | 정관신도시·모전리·매학리 예약',
   description:'정관읍대리운전·부산정관대리운전. 정관신도시·모전리·매학리 출발 심야·장거리 예약과 부산·울산 요금 상담 1811-4294.',
   heading:'정관신도시·모전리·매학리 심야 출발',
   body:'기장군 정관읍 정관신도시·모전리·매학리의 식당가·아파트 출발은 건물명과 차량이 있는 주차장 출입구를 구체적으로 알려주세요. 용수리·장안읍 등 외곽 출발과 기장읍·일광읍·울산 방향 이동은 시각별 기사 접근·복귀 여건이 다를 수 있습니다. 회식·골프 모임 이후 여러 대의 차량이 이동하면 차량별 목적지와 희망 시간을 개별 확인합니다.'
  },
  taksong:{
   title:'정관읍탁송 | 정관신도시·모전리 차량 인수·요금',
   description:'정관읍탁송·부산정관탁송. 정관신도시·모전리·매학리 차량 인수·정비 출고·중고차 인계, 장거리 요금 상담 1811-4294.',
   heading:'정관신도시 차량 인수와 정비·중고차 인계',
   body:'부산 기장군 정관읍 정관신도시·모전리·매학리의 지하주차장 차량은 층수·출차 경로와 열쇠 담당자를 확인합니다. 정비센터 출고·개인 간 중고차 인계는 차종과 주행 가능 상태, 차량 인수자·수령자·희망 인계 시각을 구분해야 합니다. 일광읍·기장읍·양산·울산 이동은 기사 복귀 거리와 주차장 출입 조건에 따라 현재 요금이 달라질 수 있습니다.'
  }
 }
});
const NAMES=Object.freeze(Object.keys(ITEMS));
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')throw Error('Five focus neighborhoods need existing legal regions');
 for(const full of NAMES){
  const item=ITEMS[full],region=regionByFullName.get(full);
  if(!region||!['구','읍'].includes(region.level))throw Error('Not a valid existing focused locality: '+full);
  if(!regionByFullName.has(item.parent)||item.nearby.some(n=>!regionByFullName.has(n)))throw Error('Invalid canonical related locality for '+full);
  for(const kind of ['daeri','taksong']){
   const c=item[kind];
   if(!c.title.startsWith(item.name.replace('양산물금읍','양산물금')+(kind==='daeri'?'대리운전':'탁송'))&&!(item.name==='정관읍'&&c.title.startsWith('정관읍'+(kind==='daeri'?'대리운전':'탁송'))))
    throw Error('Unclear SEO title '+full+' '+kind);
   if([...c.description].length>80||[...c.description].length<40||!c.description.includes('1811-4294'))
    throw Error('Unsafe or oversized SEO description '+full+' '+kind);
  }
 }
 function meta(region,kind){
  const c=ITEMS[region?.full_name]?.[kind];
  return c&&['daeri','taksong'].includes(kind)?{title:c.title,description:c.description}:null;
 }
 function section(region,kind,{hasVerifiedRide=false}={}){
  const item=ITEMS[region?.full_name],c=item?.[kind];
  if(!c||!['daeri','taksong'].includes(kind))return '';
  const isT=kind==='taksong',label=isT?'탁송':'대리운전';
  const parent=regionByFullName.get(item.parent);
  const localLinks=item.nearby.map(full=>{
   const r=regionByFullName.get(full);
   return '<a href="'+esc(servicePath(r,kind))+'">'+esc(r.name+label)+'</a>';
  }).join(' · ');
  const fare='/fare/?service='+kind+'&amp;from='+encodeURIComponent(region.full_name);
  const history='/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent(item.name);
  return '<section id="southeast-five-locality-seo-20261123" aria-label="'+esc(region.full_name+' '+label+' 지역별 안내')+'">'+
   '<h2>'+esc(c.title.split(' | ')[0]+' | '+item.locations+' 이용 안내')+'</h2>'+
   '<p>출발 위치 확인 범위: '+esc(item.locations)+'. 이 지역은 '+esc(item.parent)+'의 실제 행정구역에 해당하며 지역별 기사 상주나 별도 지점·제휴를 뜻하지 않습니다.</p>'+
   '<h3>'+esc(c.heading)+'</h3><p>'+esc(c.body)+'</p>'+
   (isT?
    '<h3>자동차탁송 인수·인계와 실제 운행기록 확인</h3><p>로드탁송은 정상 주행 가능한 차량을 기사가 직접 운전해 이동하는 방식입니다. 차량번호를 포함한 개인 식별 정보는 공개하지 않습니다. 차량이 주행 불가능하면 견인·적재 운송과 별도로 구분해야 합니다.</p>'+
    (hasVerifiedRide?'<p>아래 별도 운행기록에서 실제 완료 구간·운행일·당시 요금을 확인할 수 있습니다. 과거 요금은 오늘 확정금액이 아닙니다.</p>':'<p>원본이 없는 출발·도착 구간이나 실주행거리(km)를 후기로 만들지 않습니다. 공개된 완료 운행 여부는 별도 기록 검색에서 확인해 주세요.</p>'):
    '<h3>심야·법인·골프장 대리운전 예약 전 확인</h3><p>출발지·목적지·희망 시각·경유·대기 여부와 실제 차량 주차 위치를 준비해야 합니다. 외곽이나 심야에는 기사 접근·복귀에 따른 배차 가능 여부를 상담으로 확인합니다. 즉시 배차를 보장하지 않습니다.</p>')+
   '<h3>'+esc(item.name+' 가까운 행정구역 '+label)+' 안내</h3>'+
   '<p><a href="'+esc(servicePath(parent,kind))+'">'+esc(parent.name+label+' 대표 안내')+'</a> · '+localLinks+'</p>'+
   '<p><a href="'+fare+'">'+esc(item.name+label+' 현재 예상요금 조회')+'</a> · <a href="'+history+'">'+esc(isT?'해당 지역 실제 탁송 완료기록 찾기':'완료 대리운전 기록 참고')+'</a> · <a href="'+esc(servicePath(region,isT?'daeri':'taksong'))+'">'+esc(item.name+(isT?'대리운전':'탁송')+' 안내')+'</a> · <a href="tel:18114294">예약 상담 1811-4294</a></p>'+
   '<p><small>도로거리와 시간대·차종·톨비·기사 복귀 여건에 따라 최종 견적이 다를 수 있습니다. 기록 당시 요금은 현재 확정요금이 아닙니다.</small></p></section>';
 }
 return Object.freeze({meta,section,regions:NAMES});
}
function approvedDescription(region,kind){return ITEMS[region]?.[kind]?.description||null;}
module.exports={create,approvedDescription};
