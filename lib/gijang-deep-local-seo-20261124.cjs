'use strict';
// Focused original copy for six EXISTING Gijang canonical localities, two services each.
// Published trip evidence remains in the original verified feeds and blog links.
// No fabricated route-km, fixed price, partner, staffed office, or instant-dispatch assertion.
const ROOT='부산광역시 기장군';
const AREAS=Object.freeze({
 [ROOT]:{
  label:'기장군',anchors:'기장읍·정관읍·일광읍·장안읍·철마면',
  daeri:{
   scene:'기장읍 대변항·오시리아 관광권, 일광해수욕장 숙박·식당가, 정관읍 아파트·업무시설, 장안읍 골프장·임랑해변, 철마면 외곽의 출발 환경은 서로 다릅니다. 식당에서 기다리는 위치보다 실제 차량 주차장과 기사 접근 가능한 출입구를 우선 알려주세요.',
   detail:'골프장 라운딩 종료 후 귀가하는 경우 클럽하우스와 차량 주차장 위치, 종료 시각 및 차량 대수를 구분합니다. 법인 회식·행사나 CEO·임원 수행은 편도 대리운전인지 대기·왕복형 일일기사인지, 결제 승인 및 목적지별 차량 수를 상담합니다.',
   routes:'기장군 → 해운대·수영·김해·양산·울산 장거리 대리운전 문의',
   faq:'기장군 골프장 대리운전은 어떻게 예약하나요?',
   answer:'골프장 이름, 고객 차량이 있는 주차장, 라운딩 종료 예상 시각, 목적지와 차량 대수·경유지를 알려주세요. 기사 수급과 복귀 여건을 확인한 뒤 요금을 안내합니다.'
  },
  taksong:{
   scene:'기장읍 차량매매·정비시설, 정관읍 주거단지, 일광읍 해안권, 장안읍 산업시설과 철마면 외곽에서 차량을 인수할 때는 주차층·출고 승인·차량 키 담당자가 각기 다릅니다. 중고차 매매단지와 정비소는 방문자 출입 및 차량 반출 권한을 먼저 확인하세요.',
   detail:'법인 차량 회송, 중고차 거래, 수입차 서비스센터, 렌트카·사고대차, 장거리 로드탁송은 정상 주행 가능한 차량을 기사가 직접 운전하는 서비스로 안내합니다. 화물차·버스는 차량 규격, 보험·면허 자격 및 정상 주행 가능 여부를 별도로 확인하고, 운행 불가 차량은 견인·적재 운송을 구분합니다.',
   routes:'기장군 → 경산·대구·울산·김해·창원 자동차탁송 견적 문의',
   faq:'기장군에서 경산·대구까지 탁송하려면 무엇을 준비하나요?',
   answer:'차량 보관 주소, 차종·주행 가능 상태, 차키 인계자와 수령자, 희망 인수·도착 시각을 알려주세요. 공개된 과거 블로그 원문은 기존 페이지에서 구간별로 확인할 수 있으나 당시 금액이 현재 견적은 아닙니다.'
  }
 },
 [ROOT+' 기장읍']:{
  label:'기장읍',anchors:'대변항·연화리·오시리아·시랑리·기장시장 주변',
  daeri:{
   title:'기장읍대리운전 | 오시리아·대변항·기장시장 심야 예약',
   description:'부산 기장읍대리운전. 대변항·오시리아·기장시장·연화리 식당 및 숙소 출발, 법인·골프장·장거리 예약 1811-4294.',
   scene:'대변항과 연화리 해안 식당가에서는 항구 주변의 실제 주차장·출차 가능 위치가 중요합니다. 오시리아·시랑리 숙박·관광시설은 같은 장소명이라도 주차동과 건물 출입구가 다를 수 있습니다.',
   detail:'식사·모임 후 해운대·부산진구·양산 방면 이동은 최종 도착지와 경유 여부를 확인합니다. 행사·법인 차량 여러 대는 차별로 출발 시각과 결제 방식을 구분합니다.',
   routes:'기장읍 → 해운대·부산진구·김해·양산 장거리대리운전 문의',
   faq:'대변항이나 오시리아에서 대리운전을 부를 때는?',
   answer:'매장명만 전달하기보다 차량이 주차된 시설·주차층·출입구를 알리고 희망 출발 시각을 확인해 주세요.'
  },
  taksong:{
   title:'기장읍탁송 | 오시리아·경동오토필드 차량 인수·장거리',
   description:'부산 기장읍탁송. 경동오토필드·오시리아·대변항 주변 차량 인수, 중고차·정비 출고·장거리 로드탁송 1811-4294.',
   scene:'기장읍의 중고차 매매시설과 오시리아 상업시설에서 출발하는 차량은 실제 인수 구역과 반출 승인 담당자를 확인해야 합니다. 해안 숙박시설 주차장도 차량 보관 장소와 입·출차 가능 시간을 분리해 전달합니다.',
   detail:'중고차 거래 차량은 판매자·매매업체가 차량 반출을 승인했는지, 수령자는 어디에서 언제 받을 수 있는지를 확인합니다. 정비 출고는 차량이 정상 주행 가능한지도 중요합니다.',
   routes:'기장읍 → 경산·대구·울산·김해 자동차탁송 견적 문의',
   faq:'기장읍 중고차 매매시설에서 탁송할 때는?',
   answer:'차량 보관구역, 반출 승인, 차키 담당자, 차량 상태, 목적지 인수자를 확인해 출발 시각과 최종 견적을 상담합니다.'
  }
 },
 [ROOT+' 정관읍']:{
  label:'정관읍',anchors:'정관신도시·모전리·매학리·용수리·달산리',
  daeri:{
   scene:'정관신도시 모전리·매학리의 상가 및 아파트는 출입구와 지하 주차층이 복잡할 수 있습니다. 용수리·달산리 등 주변 지역은 차량 주차 위치와 기사 진입 가능한 도로를 정확히 알려주세요.',
   detail:'부산 도심·해운대·양산·울산 방면 귀가와 늦은 법인 회식 호출은 시간대별 기사 접근 및 복귀 여건을 확인해야 합니다. 골프장·단체 행사 차량은 개별 목적지와 운행 시각을 분리해 접수합니다.',
   routes:'정관읍 → 해운대·부산진구·양산·울산 대리운전 문의',
   faq:'정관신도시에서 심야 대리운전을 예약하려면?',
   answer:'아파트 단지명뿐 아니라 차량 위치와 지하주차장 출입구, 출발 예정 시각, 최종 도착지를 알려주세요.'
  },
  taksong:{
   scene:'정관읍 모전리·매학리 공동주택의 지하주차장 인수는 층수와 출차 가능한 게이트를 확인합니다. 용수리·달산리 업무·정비시설은 출고 승인 시각과 열쇠 보관 담당자를 별도로 확인해야 합니다.',
   detail:'정관 신도시 법인차량 회송, 중고차 매매 인계, 정비·수입차 서비스센터 입출고는 차종·정상 주행 가능 상태와 도착지 수령 담당자를 확인해 견적을 안내합니다.',
   routes:'정관읍 → 기장읍·양산·울산·대구 차량탁송 견적 문의',
   faq:'정관읍 아파트 주차장에서 차량을 탁송하려면?',
   answer:'단지와 동, 주차층, 차량 키 전달자, 경비실 통과 여부, 도착지 수령 시각을 구분해 알려주세요.'
  }
 },
 [ROOT+' 일광읍']:{
  label:'일광읍',anchors:'일광해수욕장·일광역·칠암항·학리·이천리',
  daeri:{
   title:'일광읍대리운전 | 일광해수욕장·칠암항·심야 예약',
   description:'부산 일광읍대리운전. 일광해수욕장·일광역·칠암항·학리 숙박·식사 후 심야·장거리 대리운전 상담 1811-4294.',
   scene:'일광해수욕장과 일광역 주변 모임 후에는 보행자가 기다리는 해변 입구와 고객 차량이 주차된 곳이 다를 수 있습니다. 칠암항·학리 주변 식당가와 숙소는 정확한 주차장 진입로를 알려주세요.',
   detail:'해수욕장 성수기나 늦은 시간 외곽 출발은 기사 접근·복귀가 배차에 영향을 줄 수 있습니다. 정관·기장읍·해운대 또는 울산으로 이동할 때는 목적지와 출발 시간을 먼저 상담합니다.',
   routes:'일광읍 → 해운대·정관·양산·울산 장거리대리운전 문의',
   faq:'일광해수욕장 출발 대리운전 예약 시 필요한 정보는?',
   answer:'차량 주차장, 숙소·식당과의 거리, 희망 출발 시각, 목적지를 알려주세요. 실제 기사 수급에 따라 배차 가능 여부가 달라집니다.'
  },
  taksong:{
   title:'일광읍탁송 | 일광해수욕장·칠암항 차량 인수·장거리',
   description:'부산 일광읍탁송. 일광해수욕장·일광역·칠암항 차량 인수, 정비 출고·개인 중고차·장거리 로드탁송 상담 1811-4294.',
   scene:'일광해수욕장·일광역 근처의 숙박시설과 주거단지에서 차량을 인수할 때는 실제 주차 위치와 인수자 연락 가능 시간을 확인합니다. 칠암항 일대는 해안도로 진입 위치와 출차 시각을 구분해 전달해 주세요.',
   detail:'정비소 입고·출고 또는 개인 간 차량 거래는 차량 상태·키 전달자와 출발·도착의 인계 시각을 구체적으로 정해야 합니다.',
   routes:'일광읍 → 기장읍·울산·대구·경산 차량탁송 견적 문의',
   faq:'일광해수욕장 주변 숙소에서 탁송하려면?',
   answer:'숙소 이름만이 아니라 차량이 있는 주차장, 차종, 차키 전달자와 도착지 인수자를 확인해 주세요.'
  }
 },
 [ROOT+' 장안읍']:{
  label:'장안읍',anchors:'좌천리·월내리·임랑해수욕장·장안산업권',
  daeri:{
   title:'장안읍대리운전 | 임랑해수욕장·좌천·골프장 예약',
   description:'부산 장안읍대리운전. 임랑해수욕장·좌천리·월내리 식사·골프장 라운딩 후 외곽·장거리 예약 1811-4294.',
   scene:'장안읍 임랑해수욕장과 월내리 식당·숙박시설 출발은 주차 구역과 차량이 있는 위치를 정확히 구분해야 합니다. 좌천리 인근 업무시설이나 외곽 골프장 방문은 시설명과 라운딩 종료 시각을 먼저 확인하세요.',
   detail:'골프장 대리운전과 다수 차량 단체 이동은 차량별 목적지·출발 시각을 따로 정하고, 부산 시내·울산·양산 등 먼 목적지에서는 기사 복귀 여건도 상담합니다.',
   routes:'장안읍 → 해운대·기장읍·울산·양산 대리운전 문의',
   faq:'장안읍 골프장 라운딩 후 대리운전은 언제 문의하나요?',
   answer:'종료 예상 시각과 주차장 위치, 차량 수와 도착지를 미리 알려주시면 배차 여건을 확인할 수 있습니다.'
  },
  taksong:{
   title:'장안읍탁송 | 좌천·월내·산업단지 차량 출고·장거리',
   description:'부산 장안읍탁송. 좌천리·월내리·산업시설 출고, 법인차량·중고차·정비센터 인수 및 울산·대구 장거리탁송 1811-4294.',
   scene:'좌천리·월내리와 장안읍 산업시설 주변 차량 출고는 외부 방문자 출입구와 반출 승인 담당자를 확인해야 합니다. 임랑해수욕장 숙박시설 인수도 주차 구역과 진입 시간을 미리 정하세요.',
   detail:'법인 차량·정비소 출고는 시설의 반출 가능 시간, 정상 주행 가능 여부, 도착지 인수자 및 기사 복귀 조건을 함께 확인합니다.',
   routes:'장안읍 → 울산·양산·대구·경산 자동차탁송 견적 문의',
   faq:'장안읍 산업시설에서 법인차량을 탁송할 때는?',
   answer:'출입 허가, 반출 가능 시각과 키 전달자, 차량 상태 및 목적지 담당자를 먼저 확인해 주세요.'
  }
 },
 [ROOT+' 철마면']:{
  label:'철마면',anchors:'철마면 중심부·고촌리·안평리·임기리',
  daeri:{
   title:'철마면대리운전 | 기장 외곽·골프장·장거리 예약',
   description:'부산 철마면대리운전. 기장 철마면 고촌리·안평리·임기리 식당·골프장·외곽 출발, 장거리 대리운전 예약 1811-4294.',
   scene:'철마면은 고촌리·안평리·임기리 등 출발지마다 차량 진입로가 다를 수 있습니다. 식당가나 골프장 방문 후에는 매장 입구 대신 실제 차량 주차구역을 기준으로 정확한 위치를 알려주세요.',
   detail:'외곽과 늦은 시간에는 출발지까지의 기사 이동과 운행 후 복귀가 부담이 될 수 있어 출발 예정 시각과 목적지, 경유·대기 여부를 구체적으로 상담합니다.',
   routes:'철마면 → 해운대·기장읍·양산·김해 대리운전 문의',
   faq:'철마면 외곽 대리운전은 예약이 필요한가요?',
   answer:'출발 가능 시각과 기사 접근 여건을 사전에 확인하는 것이 좋습니다. 현장 기사 상주나 즉시 배차를 보장하지 않습니다.'
  },
  taksong:{
   title:'철마면탁송 | 기장 외곽 차량 인수·정비출고·장거리',
   description:'부산 철마면탁송. 고촌리·안평리·임기리 차량 인수, 정비시설 출고·법인차량 회송·장거리 로드탁송 상담 1811-4294.',
   scene:'철마면 고촌리·안평리·임기리의 차량 인수는 도로명주소와 진입로, 주차장 출입 가능 시간을 확인해야 합니다. 사업장 차량 출고는 반출 담당자와 차키 보관 위치를 구분합니다.',
   detail:'법인 차량과 정비 출고 차량은 정상 주행 가능한지 확인하고, 먼 거리 운행은 인수 시각·도착지 담당자·기사 복귀 조건에 맞춰 최종 견적을 정합니다.',
   routes:'철마면 → 기장읍·양산·김해·울산 장거리탁송 문의',
   faq:'철마면 외곽에서 차량을 인수하려면?',
   answer:'정확한 도로명주소, 진입 가능한 주차 장소, 열쇠 전달자와 차량 주행 가능 상태를 알려주세요.'
  }
 }
});
const ORDER=Object.freeze([ROOT,ROOT+' 기장읍',ROOT+' 정관읍',ROOT+' 일광읍',ROOT+' 장안읍',ROOT+' 철마면']);
const REUSABLE_META=new Set([ROOT,ROOT+' 정관읍']);
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')throw Error('Gijang SEO needs the existing region registry');
 for(const full of ORDER)if(!regionByFullName.has(full))throw Error('Missing existing legal region: '+full);
 function meta(region,kind){
  const full=region?.full_name;
  // Protect both approved Gijang-gun hub snippets and the existing reviewed Jeonggwan snippets.
  if(REUSABLE_META.has(full)||!['daeri','taksong'].includes(kind))return null;
  const item=AREAS[full]?.[kind];
  return item?.title&&item?.description?{title:item.title,description:item.description}:null;
 }
 function section(region,kind){
  const full=region?.full_name,area=AREAS[full],item=area?.[kind];
  if(!item||!['daeri','taksong'].includes(kind))return '';
  const isT=kind==='taksong',label=isT?'탁송':'대리운전';
  const fare='/fare/?service='+kind+'&amp;from='+encodeURIComponent(full);
  const history='/reviews/history/?kind='+kind+'&amp;q='+encodeURIComponent('기장');
  const parent=regionByFullName.get(ROOT);
  const haeundae=regionByFullName.get('부산광역시 해운대구');
  const busan=regionByFullName.get('부산광역시');
  const serviceLinks=isT?[
   ['기장군 자동차탁송 대표 페이지',servicePath(parent,'taksong')],
   ['정비소·서비스센터 차량탁송','/service/taksong/'],
   ['장거리 차량탁송','/service/long-distance-taksong/'],
   ['화물차·특장차 종류별 탁송','/taksong/types/']
  ]:[
   ['기장군 대리운전 대표 페이지',servicePath(parent,'daeri')],
   ['골프장 대리운전','/service/golf/'],
   ['법인대리운전','/service/corporate/'],
   ['CEO·임원 일일기사','/service/daily-driver/'],
   ['기장군 장거리대리운전','/service/long-distance-daeri/']
  ];
  const siblings=ORDER.slice(1).map(name=>{
   const r=regionByFullName.get(name);
   return '<li><a href="'+esc(servicePath(r,kind))+'">'+esc(AREAS[name].label+label)+'</a> <small>'+esc(AREAS[name].anchors)+'</small></li>';
  }).join('');
  const avoidDuplicatedCountyLinks=full===ROOT?'': '<p><a href="'+esc(servicePath(parent,kind))+'">부산 기장군 '+label+' 전체 안내</a></p>';
  return '<section id="gijang-local-intent-20261124" aria-label="'+esc(full+' '+label+' 지역별 이용 안내')+'">'+
   '<h2>'+esc(area.label+label+' | '+area.anchors+' 출발·도착 상담')+'</h2>'+
   '<p>'+esc(item.scene)+'</p>'+
   '<h3>'+esc(isT?'차량탁송·법인차 회송·정비 출고':'심야·법인·골프장·장거리 대리운전')+'</h3><p>'+esc(item.detail)+'</p>'+
   '<h3>'+esc(item.routes)+'</h3>'+
   '<p>위 구간은 예약 문의를 돕는 이동 예시이며 실제 완료 운행, 고정요금, 특정 지역 기사 상주 또는 즉시 배차를 뜻하지 않습니다. 정확한 도로거리(km)와 현 시점 예상요금은 출발·도착 주소, 시간대·차종, 통행료·대기·기사 복귀 조건에 따라 별도로 조회·확정합니다.</p>'+
   '<h3>'+esc(item.faq)+'</h3><p>'+esc(item.answer)+'</p>'+
   '<p>'+serviceLinks.map(([text,url])=>'<a href="'+esc(url)+'">'+esc(text)+'</a>').join(' · ')+'</p>'+
   '<p><a href="'+fare+'">'+esc(area.label+label+' 출발·도착 예상요금 조회')+'</a> · <a href="'+history+'">기장군 기존 완료 운행기록 검색</a> · <a href="'+esc(servicePath(region,isT?'daeri':'taksong'))+'">'+esc(area.label+(isT?'대리운전':'자동차탁송')+' 함께 보기')+'</a> · <a href="tel:18114294">1811-4294 예약 상담</a></p>'+
   '<p>공개 운행기록이 없으면 후기로 표시하지 않으며, 원문에 있는 과거 요금은 현재 확정 금액과 다릅니다.</p>'+
   (busan?'<p><a href="'+esc(servicePath(busan,kind))+'">부산'+label+' 전체 안내</a></p>':'')+(haeundae?'<p><a href="'+esc(servicePath(haeundae,kind))+'">해운대'+label+' 및 장거리 예약 안내</a></p>':'')+avoidDuplicatedCountyLinks+
   (full===ROOT?'<h3>기장군 5개 읍·면 '+label+' 상세 안내</h3><ul>'+siblings+'</ul>':'')+
   '</section>';
 }
 return Object.freeze({meta,section,regions:ORDER});
}
module.exports={create};
