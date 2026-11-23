'use strict';
// Trust boundary: real Seoul legal-dong canonical routes + user-supplied operating observations.
// Business demand signals never imply completed rides, claimed partnerships, prices or actual driver stock.
const data=require('../data/gangnam-yulhyeon-b2b-20261122.json');
const DISTRICT=data.region,FOCUS=data.focus,PROVINCE='서울특별시';
const serviceNames=[['자동차탁송','taksong'],['차량탁송','taksong'],['로드탁송','taksong'],['대리운전','daeri'],['탁송','taksong']];
const norm=x=>String(x||'').normalize('NFKC').replace(/[\s·_,.()\/\-]+/g,'').toLowerCase();
const daeriTags=['프리미엄','임원의전','기업행사','비즈니스','vip','고급','임원','의전','법인후불','법인카드','법인','후불정산','후불결제','후불','월말정산','기업','회사','정기','단체','회식','호텔','장거리','예약','심야','야간','골프장','배차'];
const taksongTags=['시승차량회송','법인차량회송','수입차시승','시승차량','시승차','시승용','시승','전시차량','전시차','전시장','쇼룸차량','쇼룸','법인차량','법인차','리스차','회송','고급차','고객인도','자동차매매단지','중고차매매단지','강남자동차매매단지','매매단지','중고차매매','수입중고차','수입차','외제차','중고차','매매','딜러','벤츠','bmw','비엠더블유','포르쉐','아우디','법인','고가차량','정비소','서비스센터','차량회수','차량인수','매입차','판매차','업체','장거리','예약','탁송'];
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')throw Error('Gangnam editorial guide requires original legal region registry');
 const district=regionByFullName.get(DISTRICT),focus=regionByFullName.get(FOCUS),province=regionByFullName.get(PROVINCE);
 if(!district||district.level!=='구'||!focus||focus.level!=='동'||!province||province.level!=='시도')throw Error('Invalid Gangnam/Yulhyeon official location');
 const dongs=data.relatedDongs.map(name=>{
  const r=regionByFullName.get(DISTRICT+' '+name);
  if(!r||r.level!=='동')throw Error('Unregistered Gangnam neighborhood '+name);
  return r;
 });
 if(dongs.length!==14||dongs[0].full_name!==FOCUS||new Set(dongs.map(x=>x.full_name)).size!==dongs.length)throw Error('Gangnam 14 legal-dong links must be unique');
 const neighbor=new Map();
 for(const [name,description] of Object.entries(data.adjacentAreaExamples)){
  const r=regionByFullName.get(DISTRICT+' '+name);
  if(!r||!dongs.some(x=>x.full_name===r.full_name))throw Error('Gangnam neighbor not legal '+name);
  if(description.length<100)throw Error('Empty customer-specific neighboring guide '+name);
  neighbor.set(r.full_name,{r,description});
 }
 const aliases=new Map();
 const add=(word,r)=>{
  const x=norm(word);
  if(x.length<2)return;
  if(aliases.has(x)&&aliases.get(x).full_name!==r.full_name)throw Error('Conflicting Gangnam alias '+word);
  aliases.set(x,r);
 };
 for(const alias of ['강남','강남구','서울강남','서울강남구','서울특별시강남구'])add(alias,district);
 for(const r of dongs){
  for(const prefix of ['서울특별시강남구','서울강남구','서울강남','강남구','강남'])add(prefix+r.name,r);
  add(r.name,r);
  if(r.full_name===FOCUS){add('율현동',r);add('강남율현',r);add('서울율현동',r);}
 }
 const label=k=>k==='daeri'?'대리운전':'탁송';
 const rootLinks=(k)=>'<p><a href="'+esc(servicePath(district,k))+'">서울강남'+label(k)+'</a> · <a href="'+esc(servicePath(focus,k))+'">강남율현동'+label(k)+'</a> · <a href="/business/used-car/">중고차딜러·매매단지탁송</a> · <a href="/service/corporate/">법인·후불대리운전 정산 안내</a> · <a href="/fare/?service='+k+'&amp;from='+encodeURIComponent(k==='taksong'?FOCUS:DISTRICT)+'">예상요금 확인</a> · <a href="tel:18114294">1811-4294 상담</a></p>';
 const dongLinks=k=>'<ul>'+dongs.map(r=>'<li><a href="'+esc(servicePath(r,k))+'">'+esc('강남'+r.name+label(k))+'</a> · '+esc(r.full_name)+'</li>').join('')+'</ul>';
 function faq(k,short){
  const records=short?(k==='taksong'?[data.faq[0],data.faq[3]]:[data.faq[1],data.faq[2]]):data.faq;
  return '<section class="local-question-answer"><h3>강남·율현동 자주 묻는 질문</h3>'+records.map(row=>'<h4>'+esc(row.question)+'</h4><p>'+esc(row.answer)+'</p>').join('')+'</section>';
 }
 function districtSection(k){
  const topic=k==='daeri'?'대리운전':'자동차탁송';
  const lines=k==='daeri'?data.cityDaeri:data.cityTaksong;
  const heading=k==='daeri'?'서울강남대리운전·강남법인대리운전 | 고급·VIP·임원·후불 예약':'강남탁송·강남수입차탁송 | 법인·시승차·율현동 매매단지';
  return '<section id="gangnam-b2b-local-seo-20261122" aria-label="강남구 법인·수입차 서비스 이용 안내">'+
   '<h2>'+heading+'</h2><p><strong>서울특별시 강남구</strong> 실제 출발지별 '+topic+' 예약 안내입니다. 강남역·테헤란로 등 도심 업무지, 율현동·수서동·세곡동 외곽 출발을 같은 기사 대기지점으로 취급하지 않습니다.</p>'+
   lines.map(x=>'<p>'+esc(x)+'</p>').join('')+
   (k==='daeri'?'<h3>법인·후불·월말정산은 계약 조건 확인이 먼저입니다</h3><p>기업 담당자에게 이용 차량·출발 시간·예상 호출 건수·정산 희망 방식을 확인합니다. 후불대리운전과 법인카드대리운전은 사전 승인·계약을 조건으로 상담하며 무조건 이용 가능하거나 특정 기업이 고정거래처라는 뜻이 아닙니다.</p>':
   '<h3>수입중고차·매매상사 이동의 세 가지 인계 업무</h3><p>매입차가 매매단지에 들어오는 경우, 중고차 매매상사가 성능점검·상품화 업체로 보내는 경우, 구매고객에게 인도하는 경우는 차량 반출 승인·차키 담당자·도착지 수령인이 서로 다릅니다. 율현동 수입차탁송과 강남 자동차탁송을 상담할 때 실제 인수 장소부터 확인합니다.</p>')+
   '<h3>강남구 법정동별 '+topic+' 지역 연결</h3><p>율현동·수서동·세곡동·자곡동과 역삼동·삼성동·청담동·논현동은 동명이 아닌 정확한 법정동 주소를 기준으로 링크합니다.</p>'+
   dongLinks(k)+faq(k,false)+rootLinks(k)+
   '<p>위 지역 수요와 배차 관련 내용은 상담 전 확인사항입니다. 상주 기사·즉시 배차·실제 완료 후기·매매상사 제휴나 확정요금을 주장하지 않습니다.</p></section>';
 }
 function focusSection(k){
  const topic=k==='daeri'?'율현동대리운전·강남율현동법인대리운전':'율현동매매탁송·율현동수입차탁송';
  const lines=k==='daeri'?data.yulhyeonDaeri:data.yulhyeonTaksong;
  const checklist=k==='daeri'?
  '<h3>율현동 대리운전 배차·예약 체크리스트</h3><ol><li>율현동 실제 차량 주차장·상가·매매단지 입구와 출발 희망 시각</li><li>동승 고객·경유지·성남·용인·수서 등 최종 도착지</li><li>법인카드·후불 정산 요청인 경우 계약 담당자 및 사전 승인 여부</li><li>심야 기사 접근·복귀시간과 가능 요금 상담</li></ol>':
  '<h3>율현동 매매단지·수입차탁송 출고 체크리스트</h3><ol><li>매매단지 차량 보관 동·층·구역 및 실제 출차 가능시각</li><li>매매상사 담당자의 출고 승인·차량 키·서류 전달방식</li><li>벤츠·bmw·포르쉐·아우디 등 차종·차고·주행 가능 상태와 보험 적용</li><li>구매 고객 또는 성능점검장 도착지 담당자와 인수 가능시각</li><li>기사 접근·복귀 동선, 통행료와 최종 견적 협의</li></ol>';
  return '<section id="yulhyeon-auto-dealer-imported-seo-20261122" aria-label="율현동 중고차 매매단지와 대리운전">'+
   '<h2>'+esc(topic)+' | 강남구 율현동 지역 전문 안내</h2><p>서울특별시 강남구 율현동. 자동차매매단지·수입차 차량인수 및 강남 남동부 법인·장거리 대리운전의 실제 출발 조건을 구분합니다.</p>'+
   lines.map(x=>'<p>'+esc(x)+'</p>').join('')+checklist+
   '<h3>율현동과 수서·세곡·자곡의 실제 차량 위치 구분</h3>'+
   '<p>율현동 주차장에서 출발하는 차량은 수서동·세곡동·자곡동 소재 차량과 다릅니다. 매매상사·업무지와 도로로 가까워도 출발 법정동과 차량 인수인은 반드시 별도로 확인합니다.</p>'+
   ['수서동','세곡동','자곡동','역삼동','삼성동'].map(x=>{
     const region=regionByFullName.get(DISTRICT+' '+x);
     return '<a href="'+esc(servicePath(region,k))+'">'+esc('강남'+x+label(k))+'</a>';
   }).join(' · ')+faq(k,true)+rootLinks(k)+
   '<p>고객이 알려준 수요·배차 상황을 설명하는 이용 안내이며, 특정 매매상사와 제휴하거나 임의의 운행을 완료한 것으로 표시하지 않습니다.</p></section>';
 }
 function neighborSection(r,k){
  const row=neighbor.get(r.full_name);
  if(!row)return '';
  const t=k==='daeri'?'대리운전':'차량탁송';
  return '<section id="gangnam-dong-related-original-20261122"><h2>'+esc('서울강남 '+r.name+t)+' | 율현동·강남구 출발 지역 비교</h2>'+
   '<p>'+esc(row.description)+'</p><p>해당 행정동에서 차량을 맡기거나 대리운전을 요청하면 실제 출발 주차구역·희망시간·최종 목적지를 먼저 확인합니다. 다른 법정동의 운행사례를 여기 완료 실적으로 표시하지 않습니다.</p>'+rootLinks(k)+'</section>';
 }
 function provinceSection(k){
  return '<section id="seoul-gangnam-b2b-district-discovery-20261122"><h2>서울강남'+label(k)+' | 율현동 자동차매매단지·법인 정산</h2>'+
   '<p>서울 강남구에서 <a href="'+esc(servicePath(district,k))+'">강남구'+label(k)+' 자세히</a>와 <a href="'+esc(servicePath(focus,k))+'">율현동'+label(k)+' 상세</a>를 연결합니다. 율현동 매매단지 출고, 수입차 인수·인계와 강남 기업 법인·후불 대리운전은 각각 차량 위치·시간·정산 조건을 상담해 주세요.</p></section>';
 }
 function regionSection(r,k){
  if(!r||!['daeri','taksong'].includes(k))return '';
  if(r.full_name===DISTRICT)return districtSection(k);
  if(r.full_name===FOCUS)return focusSection(k);
  if(r.full_name===PROVINCE)return provinceSection(k);
  return neighborSection(r,k);
 }
 function searchMeta(r,k){
  if(!r||!['daeri','taksong'].includes(k))return null;
  if(r.full_name===DISTRICT)return k==='daeri'
  ?{title:'서울강남대리운전 | 법인·후불·고급·VIP·임원 예약',description:'강남역·역삼·삼성·청담 고급대리운전·법인대리운전. VIP·임원 차량 출발·대기·보험과 법인 후불·월말정산 사전 상담 1811-4294.'}
  :{title:'강남탁송·강남수입차탁송 | 법인·시승차·율현동',description:'강남법인탁송·수입차탁송·시승차탁송. 전시장 시승차 회송과 율현동 매매단지 출고 승인·보험·차량 인계 상담 1811-4294.'};
  if(r.full_name===FOCUS)return k==='daeri'
  ?{title:'율현동대리운전 | 강남 법인·후불·고급·야간 예약',description:'강남율현동대리운전 법인·고급·임원 귀가, 매매단지·상가 출발, 후불 사전승인과 심야 기사 접근·복귀·장거리 예약 상담 1811-4294.'}
  :{title:'율현동매매탁송·율현동수입차탁송 | 법인·시승차 인수',description:'율현동매매탁송·수입차탁송·법인탁송, 매입차·시승차·판매차 출고 승인, 차량상태·인계 장소와 요금 상담 1811-4294.'};
  return null;
 }
 function resolve(query){
  const q=norm(query);
  if(q.length<4||q.length>100)return null;
  const service=serviceNames.find(([s])=>q.endsWith(s));
  if(!service)return null;
  const [suffix,k]=service;
  let rest=q.slice(0,-suffix.length);
  const intents=(k==='daeri'?daeriTags:taksongTags).slice().sort((a,b)=>b.length-a.length);
  let intentCount=0;
  // A precise place + up to three independent commercial intents all share its ORIGINAL canonical.
  // e.g. 강남수입차시승탁송, 역삼동법인프리미엄대리운전.
  for(let n=0;n<3;n++){
   const term=intents.find(x=>rest.endsWith(norm(x)));
   if(!term)break;
   rest=rest.slice(0,-norm(term).length);
   intentCount++;
  }
  if(!intentCount||!rest)return null; // generic exact administrative keywords remain on legacy resolver
  const place=aliases.get(rest);
  if(!place)return null;
  return servicePath(place,k);
 }
 return Object.freeze({regionSection,searchMeta,resolve,DISTRICT,FOCUS,district,focus,dongs,neighborCount:neighbor.size});
}
module.exports={create,DISTRICT,FOCUS,norm};
