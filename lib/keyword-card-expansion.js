'use strict';
// Keyword-driven visual matching for Smart24. No claims of completed trips.
// Stable, whitelisted image assets are used for actual mountain/cycle information;
// all other categories get an original dynamically labelled service card.
const PHONE='1811-4294',consult='tel:18114294';
const serviceThemes=[
 ['pension-daeri','펜션대리운전','daeri','/special/pension-daeri/','펜션·숙박시설 출발의 기사 접근과 귀가 조건을 상담합니다.', ['펜션대리운전','숙박시설대리운전']],
 ['valley-daeri','계곡대리운전','daeri','/special/valley-daeri/','계곡·관광지 출발과 외곽 기사 복귀 여건을 상담합니다.', ['계곡대리운전','산정호수대리운전']],
 ['outskirts-daeri','외곽대리운전','daeri','/special/outskirts-service/','산간·외곽 출발 및 심야 배차 가능 여부를 상담합니다.', ['외곽대리운전','산간대리운전']],
 ['campingcar-taksong','캠핑카탁송','taksong','/special/camping-car-transport/','캠핑카 차량 제원·면허·운행 가능 상태를 사전 확인합니다.', ['캠핑카탁송','캠핑카차량탁송']],
 ['baekdudaegan-taksong','백두대간종주탁송','taksong','/special/baekdudaegan/','백두대간 산행의 실제 출발지·하산지와 기사 복귀를 상담합니다.', ['백두대간탁송','백두대간종주탁송']],
 ['night-taksong','24시탁송','taksong','/special/24-hour-service/','야간·새벽 차량 이동의 기사 배차 가능 여부를 상담합니다.', ['24시탁송','야간탁송','새벽탁송']],
 ['golf-daeri','골프장대리운전','daeri','/service/golf/','골프장 출발·왕복·대기·기사 복귀 조건을 상담합니다.', ['골프장대리운전','골프대리운전','골프장대리','골프장왕복','골프장일일기사']],
 ['corporate-daeri','법인대리운전','daeri','/service/corporate/','법인·기업 이용과 단체 일정의 배차·정산 조건을 상담합니다.', ['법인대리운전','기업대리운전','단체대리운전','법인기사']],
 ['premium-daeri','프리미엄대리운전','daeri','/daeri/','예약 시간·기사 조건·이용 범위를 확인하고 상담합니다.', ['프리미엄대리운전','고급대리운전','정장기사대리운전']],
 ['long-daeri','장거리대리운전','daeri','/daeri/','출발·도착 위치, 장거리 기사 복귀와 현장 상황을 확인합니다.', ['장거리대리운전','장거리대리','시외대리운전']],
 ['daily-driver','일일기사','daeri','/service/daily-driver/','일일 운전·골프장 왕복 시 운행·대기·복귀 조건을 상담합니다.', ['일일기사','하루기사','일일운전기사','골프장왕복기사']],
 ['night-daeri','심야대리운전','daeri','/daeri/','야간 시간대와 실제 기사 수급을 확인합니다.', ['심야대리운전','야간대리운전','24시대리운전']],
 ['general-daeri','전국대리운전','daeri','/daeri/','고객 차량을 기사가 대신 운전합니다. 현재 배차는 상담 후 확인합니다.', ['대리운전','전국대리운전','스마트대리운전']],
 ['rent-taksong','렌트카탁송','taksong','/taksong/','렌터카·렌트카 인수·반납 위치 및 출입 조건을 확인합니다.', ['렌트카탁송','렌터카탁송','렌트카반납탁송','렌터카반납탁송']],
 ['accident-taksong','사고대차탁송','taksong','/taksong/','사고대차 차량의 인수·인계와 운행 가능 상태를 확인합니다.', ['사고대차탁송','사고대차반납','사고대차차량탁송']],
 ['service-center-taksong','서비스센터탁송','taksong','/service/taksong/','서비스센터 입·출고, 차량 키 전달 및 예약시간을 확인합니다.', ['서비스센터탁송','정비소탁송','자동차정비탁송','센터입고탁송']],
 ['usedcar-taksong','중고차탁송','taksong','/taksong/','중고차 매매·인도·인수 위치와 서류·차량 상태를 확인합니다.', ['중고차탁송','중고차매매탁송','중고차딜러탁송']],
 ['auction-taksong','경매장탁송','taksong','/business/auction/','차량 경매장 반출·인수 및 기사 출입 가능 시간 확인이 필요합니다.', ['경매장탁송','경매탁송','자동차경매장탁송']],
 ['export-taksong','수출단지탁송','taksong','/taksong/','수출단지·항만 주변 차량 인수·인계 조건을 확인합니다.', ['수출단지탁송','수출차량탁송']],
 ['long-taksong','장거리탁송','taksong','/service/long-distance-taksong/','차량 인수·인계와 기사 접근·복귀 조건을 상담합니다.', ['장거리탁송','장거리자동차탁송','시외탁송']],
 ['truck-taksong','화물차탁송','taksong','/service/heavy-truck-taksong/','톤급·차량 운행 가능 상태·면허 조건을 먼저 확인합니다.', ['화물차탁송','특장차탁송','25톤탁송','윙바디탁송','덤프탁송']],
 ['airport-taksong','공항탁송','taksong','/taksong/','항공편 시간과 공항 차량 인수·주차 위치를 상담합니다.', ['공항탁송','인천공항탁송','김포공항탁송']],
 ['general-taksong','전국자동차탁송','taksong','/taksong/','차량만 지정 위치에서 인수해 목적지로 이동·인계하는 서비스입니다.', ['탁송','자동차탁송','전국탁송','전국자동차탁송','차량탁송']],
];
const visualTopics=[
 ['seoraksan','설악산탁송','taksong','/설악산탁송/','/assets/seoraksan-taksong-fares.svg','설악산 오색·한계령·백담사·소공원 기존 안내요금입니다. 현재 확정 견적은 아닙니다.', ['설악산','오색','한계령','소공원','백담사','남교리','대청봉','설악산종주','설악산탁송']],
 ['jirisan','지리산탁송','taksong','/지리산탁송/','/assets/jirisan-taksong-fares.svg','지리산 성삼재·중산리·대원사·백무동 코스별 기존 안내입니다.', ['지리산','성삼재','중산리','대원사','화엄사','백무동','지리산탁송']],
 ['deogyusan','덕유산탁송','taksong','/special/deogyusan/','/keyword-card/deogyusan.svg','덕유산 육십령·무주구천동 등의 차량 회수 구간을 상담합니다.', ['덕유산','덕유산탁송','육십령','육십령탁송','무주구천동']],
 ['eastcoast','동해안자전거길탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/eastcoast-taksong.svg','동해안 경포대·통일전망대·은어다리 구간의 기존 기록을 확인합니다.', ['동해안','경포대','통일전망대','은어다리','영덕해맞이공원','동해안자전거길','동해안종주']],
 ['yeongsan','영산강길종주탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/yeongsan-taksong.svg','담양댐·영산강하구둑 차량 회수와 기존 요금을 안내합니다.', ['영산강','영산강길','영산강종주','영산강길종주','담양댐','영산강하구둑']],
 ['seomjin','섬진강길종주탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/seomjin-taksong.svg','섬진강 생활체육공원·배알도 구간의 기존 요금을 안내합니다.', ['섬진강','섬진강길','섬진강종주','생활체육공원','배알도']],
 ['geumgang','금강자전거길탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/geumgang-taksong.svg','금강 자전거길 인증센터별 차량 회수는 개별 견적입니다.', ['금강','금강길','금강자전거길','금강종주']],
 ['ocheon','오천자전거길탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/ocheon-taksong.svg','오천 자전거길 인증센터별 차량 회수는 개별 견적입니다.', ['오천','오천길','오천자전거길','오천종주']],
 ['nakdong','낙동강자전거길탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/nakdonggang-taksong.svg','낙동강 자전거길 인증센터별 차량 회수는 개별 견적입니다.', ['낙동강','낙동강길','낙동강자전거길','낙동강종주']],
 ['cycling','전국자전거길종주탁송','taksong','/special/cycling-trail-transport/','/assets/cycling-routes/nationwide-taksong.svg','국토종주·전국 자전거길 차량회수는 구간과 기사 여건을 확인합니다.', ['자전거길','자전거종주','자전거길종주','국토종주','전국자전거길','종주탁송']],
];
const compact=value=>String(value||'').replace(/[\s·\-_.,()/]+/g,'').trim();
const suffixRe=/(?:길종주|종주|자전거길|자전거|산행)?(?:자동차|차량)?탁송$/;
const namedTopics=visualTopics.map(([slug,label,kind,url,image,description,terms])=>({slug,label,kind,url,image,description,terms}));
const serviceTopics=serviceThemes.map(([slug,label,kind,url,description,terms])=>({slug,label,kind,url,image:'/keyword-card/'+slug+'.svg',description,terms}));
const topicBySlug=new Map([...namedTopics,...serviceTopics].map(t=>[t.slug,t]));
const regionsWhitelisted=(query)=>compact(query).length>=2;
function resolve(query){
 const key=compact(query);
 if(!key)return null;
 // Ambiguous short place names, e.g. "동구", are exclusively legal-region lookups.
 // Known mountain/cycling landmarks are resolved before generic taksong phrases.
 for(const topic of namedTopics){
  if(topic.terms.some(t=>key===compact(t)||key===compact(t)+'탁송'||key===compact(t)+'차량탁송'||key===compact(t)+'자동차탁송'))return topic;
 }
 for(const topic of serviceTopics){
  if(topic.terms.some(t=>key===compact(t)))return topic;
 }
 // Handle source-specific forms "영산강길종주탁송", "오색소공원탁송" etc.
 for(const topic of namedTopics){
  const words=topic.terms.map(compact).filter(t=>t.length>=3);
  if(key.endsWith('탁송')&&words.some(t=>key.includes(t)))return topic;
 }
 // A generic service query only after rejecting all named local keywords.
 for(const topic of serviceTopics){
  if(topic.slug==='general-daeri'||topic.slug==='general-taksong')continue;
  if(key.endsWith('탁송')||key.endsWith('대리운전')){
   if(topic.terms.some(t=>key.includes(compact(t))))return topic;
  }
 }
 return null;
}
const escapeXml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function svg(slug,regionName='',regionalPhone=PHONE){
 const topic=topicBySlug.get(slug);
 if(!topic||!topic.image.startsWith('/keyword-card/'))return null;
 const isT=topic.kind==='taksong';
 const main=(regionName?String(regionName).trim()+' ':'')+topic.label;
 const mainSize=main.length>19?35:main.length>14?44:main.length>9?57:74;
 const info=topic.description;
 const phone=regionalPhone.replace(/[^0-9-]/g,'');
 const typelabel=isT?'자동차탁송 · 차량 인수·이동·인계':'대리운전 · 고객 차량 대신 운전';
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">'+
 '<title id="title">'+escapeXml(main)+' · 스마트24 상담 '+phone+'</title><desc id="desc">'+escapeXml(info)+' 안내용 서비스 명함. 실제 운행사진 아님.</desc>'+
 '<defs><linearGradient id="sky" x2="1" y2=".7"><stop stop-color="'+(isT?'#074f73':'#193c75')+'"/><stop offset="1" stop-color="'+(isT?'#0b8f84':'#5367af')+'"/></linearGradient></defs>'+
 '<rect width="1200" height="800" rx="20" fill="#edf6fe"/><rect width="1200" height="565" rx="20" fill="url(#sky)"/>'+
 '<text x="65" y="110" font-family="sans-serif" font-size="40" font-weight="700" fill="#d6efff">스마트24 전국 서비스</text>'+
 '<text x="65" y="290" font-family="sans-serif" font-size="'+mainSize+'" font-weight="900" fill="#fff04b">'+escapeXml(main)+'</text>'+
 '<rect x="62" y="345" width="1076" height="90" rx="18" fill="#ffffff" opacity=".14"/>'+
 '<text x="91" y="402" font-family="sans-serif" font-size="39" font-weight="700" fill="#fff">'+escapeXml(typelabel)+'</text>'+
 '<text x="67" y="521" font-family="sans-serif" font-size="33" fill="#e9f4ff">지역 · 시간 · 차종 · 기사 복귀 여건 확인</text>'+
 '<text x="66" y="646" font-family="sans-serif" font-size="58" font-weight="900" fill="#103f63">상담 '+escapeXml(phone)+'</text>'+
 '<text x="66" y="710" font-family="sans-serif" font-size="29" fill="#2b5577">예약 요금·배차는 상담 후 확정 · 안내용 이미지</text>'+
 '<text x="66" y="762" font-family="sans-serif" font-size="23" fill="#3c657a">스마트24 전국대리운전 · 자동차탁송</text></svg>';
}
function preview(t,place=null){
 if(!t)return null;
 const local=place&&t.image.startsWith('/keyword-card/')?place:null;
 const image=local?'/keyword-card/'+t.slug+'/'+local.slug+'.svg':t.image;
 return {kind:t.kind,label:(local?local.label+' ':'')+t.label,image,previewImage:image,
 url:local?local.url:t.url,phone:local?local.phone:PHONE,
 description:(local?local.label+' 출발·도착 지역의 기사 배정·차량 인수 가능 여부는 확인 후 안내합니다. ':'')+t.description+' 안내용 이미지이며 실제 운행완료 사진이 아닙니다.'};
}
function intentForPath(pathname,html){
 const p=String(pathname||''),title=(String(html||'').match(/<title>([^<]+)<\/title>/i)||[])[1]||'';
 if(!p||p==='/'||p.startsWith('/blog/')||p.startsWith('/reviews/')||p.startsWith('/region/')||p.startsWith('/fare/')
 ||p.startsWith('/card/')||p.startsWith('/assets/')||p.startsWith('/api/')
 ||p.includes('/recruit/')||/admin/i.test(p))return null;
 // Regional service pages already have their actual locality-aware PNG card, no duplicate.
 if(/^\/(?:daeri|taksong)\/[a-z0-9-/]+\/$/i.test(p)&&!/\/route\//.test(p))return null;
 if(/^\/(?:daeri|taksong)\/route\//.test(p))return p.startsWith('/daeri/')?topicBySlug.get('long-daeri'):topicBySlug.get('long-taksong');
 if(p==='/daeri/')return topicBySlug.get('general-daeri');
 if(p==='/taksong/')return topicBySlug.get('general-taksong');
 const specialRoutes={
  '/special/osaek/':'seoraksan','/special/hangyeryeong/':'seoraksan',
  '/special/baekdamsa/':'seoraksan','/special/namgyori/':'seoraksan',
  '/special/seoraksan/':'seoraksan',
  '/special/jirisan/':'jirisan','/special/seongjung-jongju/':'jirisan',
  '/special/seongdae-jongju/':'jirisan','/special/hwajung-jongju/':'jirisan',
  '/special/hwadae-jongju/':'jirisan','/special/jungsanri/':'jirisan',
  '/special/baekmudong/':'jirisan',
  '/special/national-cycling-tour/':'cycling',
  '/special/pension-daeri/':'pension-daeri','/special/valley-daeri/':'valley-daeri',
  '/special/outskirts-service/':'outskirts-daeri',
  '/special/camping-car-transport/':'campingcar-taksong',
  '/special/truck-transport/':'truck-taksong',
  '/special/24-hour-service/':'night-taksong',
  '/special/baekdudaegan/':'baekdudaegan-taksong'
 };
 if(specialRoutes[p])return topicBySlug.get(specialRoutes[p]);
 if(p==='/special/')return null;
 if(p==='/설악산탁송/'||p==='/special/seoraksan-transport/')return topicBySlug.get('seoraksan');
 if(p==='/지리산탁송/'||p==='/special/jirisan-transport/')return topicBySlug.get('jirisan');
 if(p.startsWith('/special/deogyusan'))return topicBySlug.get('deogyusan');
 if(p.startsWith('/special/cycling')||p.startsWith('/special/national-bicycle'))return topicBySlug.get('cycling');
 if(p.startsWith('/service/corporate/'))return topicBySlug.get('corporate-daeri');
 if(p.startsWith('/service/golf/'))return topicBySlug.get('golf-daeri');
 if(p.startsWith('/service/daily-driver/'))return topicBySlug.get('daily-driver');
 if(p.startsWith('/service/long-distance-taksong/'))return topicBySlug.get('long-taksong');
 if(p.startsWith('/service/heavy-truck-taksong/'))return topicBySlug.get('truck-taksong');
 if(p.startsWith('/business/auction/'))return topicBySlug.get('auction-taksong');
 if(/^\/service\//.test(p))return resolve(title);
 if(/^\/(?:route-taksong|special|business)\//.test(p)){
  const matched=resolve(title);
  if(matched)return matched;
  if(/대리운전/.test(title)&&!/탁송/.test(title))return topicBySlug.get('general-daeri');
  if(/탁송/.test(title)&&!/대리운전/.test(title))return topicBySlug.get('general-taksong');
  return null; // Mixed services must not randomly display the wrong card.
 }
 if(/^\/keywords\/(daeri|taksong)\//.test(p))return topicBySlug.get(p.includes('daeri')?'general-daeri':'general-taksong');
 return null;
}
function section(topic){
 const card=preview(topic);
 if(!card)return '';
 const label=escapeXml(card.label),detail=escapeXml(card.description),href=escapeXml(card.url),image=escapeXml(card.image);
 return '<section id="keyword-intent-dynamic-image" class="keyword-image-auto" aria-label="'+label+' 키워드별 자동 선택 서비스 이미지" data-keyword="'+label+'" data-kind="'+card.kind+'" style="background:#f8fbff;border:1px solid #bdd5eb;padding:16px;border-radius:13px;margin:14px auto;max-width:920px">'+
 '<h2 style="margin:0 0 8px;font-size:clamp(21px,3vw,26px)">'+label+' · 서비스 전용 안내 이미지</h2>'+
 '<p style="margin:0 0 10px">키워드에 맞는 서비스 이미지를 자동 선택했습니다. 이미지를 누르면 크게 볼 수 있습니다.</p>'+
 '<figure style="max-width:670px;margin:auto;text-align:center"><a class="keyword-image-enlarge" href="'+image+'" target="_blank" rel="noopener noreferrer" aria-label="'+label+' 이미지 크게 보기">'+
 '<img src="'+image+'" alt="'+label+' 관련 스마트24 안내 명함 이미지 · '+PHONE+'" width="1200" height="800" loading="eager" decoding="async" style="display:block;width:100%;height:auto;max-width:100%;object-fit:contain;border-radius:12px"></a>'+
 '<figcaption style="font-size:15px;margin-top:8px">'+detail+' <a href="'+href+'">관련 서비스 안내</a> · <a href="'+consult+'">상담 '+PHONE+'</a></figcaption></figure></section>';
}
function enhance(html,path){
 if(!html||!html.includes('</body>')||html.includes('id="keyword-intent-dynamic-image"'))return html;
 const intent=intentForPath(path,html);
 if(!intent)return html;
 const text=section(intent);
 // Keep the existing H1 first; this is additional navigation and visual context,
 // not a replacement for canonical price tables or the completed-trip proof.
 if(/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html))return html.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i,'$1'+text);
 if(html.includes('<main>'))return html.replace('<main>','<main>'+text);
 return html;
}
module.exports={topics:[...namedTopics,...serviceTopics],resolve,preview,svg,intentForPath,enhance,section};
