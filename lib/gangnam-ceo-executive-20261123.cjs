'use strict';
// CEO is a customer search intent, never a claim of completed CEO transport, certified VIP staff,
// special partnerships, driver availability or automatic corporate billing.
const source=require('../data/gangnam-ceo-executive-20261123.json');
const existing=require('../data/gangnam-premium-corporate-intents-20261123.json');
const DISTRICT=source.district;
const trim=x=>String(x||'').normalize('NFKC').toLowerCase().replace(/[\s·_,.()\/\-]+/g,'');
const META_DONGS=new Set(['역삼동','삼성동','청담동','압구정동']);
function create({regionByFullName,servicePath,esc}){
 if(!(regionByFullName instanceof Map)||typeof servicePath!=='function'||typeof esc!=='function')
  throw Error('CEO SEO requires original legal region canonical URLs');
 const city=regionByFullName.get(DISTRICT);
 if(!city||city.level!=='구'||source.locations.length!==8||
    existing.rows.length!==14||source.terms.short.length!==11||source.terms.day.length!==12)
  throw Error('CEO source registry or original corporate inventory mismatch');
 const originalNames=new Set(existing.rows.map(x=>x.region));
 const rows=new Map(),routes=new Map();
 function add(term,url){
  const key=trim(term);
  if(key.length<5||routes.has(key)&&routes.get(key)!==url)
   throw Error('Ambiguous CEO search term '+term+' → '+url);
  routes.set(key,url);
 }
 const c=servicePath(city,'daeri'),daily='/service/daily-driver/',corp='/service/corporate/';
 const toRegion=(r,name)=>'<a href="'+esc(servicePath(r,'daeri'))+'">'+esc(name||r.name+' CEO대리운전')+'</a>';
 const bill='법인카드·후불·월말정산은 기업 담당자와 사전 승인·계약을 확인해야 하며, 즉시 배차·전담기사·고가차량 보험 보장·확정요금을 약속하지 않습니다.';
 for(const term of source.terms.short){
  add(term,corp);
  for(const prefix of ['강남','서울강남','강남구','서울강남구'])
   add(prefix+term,c);
 }
 for(const term of source.terms.day){
  add(term,daily);
  for(const prefix of ['강남','서울강남','강남구','서울강남구'])
   add(prefix+term,daily);
 }
 for(const row of source.locations){
  const r=regionByFullName.get(row.region);
  if(!r||r.level!=='동'||!originalNames.has(row.region)||
    row.dong!==r.name||rows.has(row.region)||row.short.length<70||row.day.length<70)
   throw Error('Unsupported or thin real Gangnam CEO location '+row.region);
  rows.set(row.region,Object.freeze({...row,regionObj:r}));
  const target=servicePath(r,'daeri');
  for(const term of source.terms.short.concat(source.terms.day)){
   for(const prefix of [row.dong,'강남'+row.dong,'서울강남'+row.dong]){
    add(prefix+term,target);
   }
  }
 }
 if(rows.size!==8)throw Error('CEO neighborhood coverage must not create empty or phantom legal dongs');
 for(const query of ['고급CEO대리운전','CEO고급법인대리운전','CEO법인고급대리운전','강남고급CEO대리운전','강남CEO프리미엄대리운전','강남CEO임원대리운전'])
  add(query,query.startsWith('강남')?c:corp);
 for(const query of ['CEO전담기사','대표이사전담기사','강남CEO전담기사','강남대표이사수행운전기사'])
  add(query,daily);
 function intro(){
  return '<p>CEO·대표이사·임원의 이동에는 고객이 자신의 차량에 함께 타는 <strong>고급대리운전</strong>과, 여러 회의·고객 방문 사이에 대기하는 <strong>수행기사·일일기사</strong>가 있습니다. 고객 동승이 없는 법인차량 자체 이동은 <a href="/business/">법인탁송</a> 상담으로 구분합니다. '+
   esc(bill)+'</p>';
 }
 function scenarios(){
  return '<h3>CEO 귀가 대리운전과 대표이사 수행기사는 무엇이 다른가요?</h3>'+
   '<dl><dt><strong>'+esc(source.shortTrip.title)+'</strong></dt><dd>'+esc(source.shortTrip.body)+'</dd>'+
   '<dt><strong>'+esc(source.dayChauffeur.title)+'</strong></dt><dd>'+esc(source.dayChauffeur.body)+'</dd>'+
   '<dt><strong>'+esc(source.corporateBilling.title)+'</strong></dt><dd>'+esc(source.corporateBilling.body)+'</dd></dl>';
 }
 function citySection(){
  const areas=[...rows.values()].map(row=>'<li>'+
   toRegion(row.regionObj,'강남'+row.dong+'CEO대리운전')+' — '+esc(row.short)+
   ' <a href="'+esc(servicePath(row.regionObj,'daeri'))+'">'+esc(row.dong+' 대표이사·임원 수행 일정 안내')+'</a></li>').join('');
  const phrase='강남CEO대리운전·대표이사대리운전·임원 수행기사';
  return '<section id="gangnam-ceo-executive-20261123" aria-label="강남 CEO·대표이사·임원 예약 상담">'+
   '<h2>'+phrase+'</h2>'+intro()+scenarios()+
   '<h3>강남 CEO·법인 고급대리운전 지역별 출발 안내</h3><ul>'+areas+'</ul>'+
   '<p>강남 CEO 운전 상담은 ① 고객 동승 귀가 ② 일정 중 대기·경유가 있는 대표이사 수행 ③ 고객 미동승 차량 회송 중 어느 서비스인지부터 확인합니다. 운전자의 법정 면허·실제 보험 적용, 차량 인수 장소, 희망 시각과 배차 가능 여부는 상담 후 판단합니다.</p>'+
   '<p><a href="'+esc(corp)+'">CEO·법인 후불 대리운전 예약 조건</a> · '+
   '<a href="'+esc(daily)+'">CEO 일일기사·임원 수행기사 일정</a> · '+
   '<a href="/fare/?service=daeri&amp;from='+encodeURIComponent(DISTRICT)+'">강남구 대리비·지역간 예상요금</a> · '+
   '<a href="tel:18114294">강남 CEO·법인 운전 상담 1811-4294</a></p>'+
   '<p>위 키워드와 출발 장소는 상담 안내이며, 특정 회사·CEO 고객 계약 실적이나 확인되지 않은 완료 운행을 나타내지 않습니다.</p></section>';
 }
 function localSection(row){
  const r=row.regionObj;
  return '<section id="gangnam-ceo-local-20261123" aria-label="'+esc(r.full_name+' CEO·임원 고급대리운전')+'">'+
   '<h2>'+esc(row.dong+'CEO대리운전·대표이사 수행기사 예약')+'</h2>'+
   '<p><strong>'+esc(r.full_name+' | '+row.place)+'</strong></p>'+
   '<h3>'+esc(row.dong+' 대표이사·CEO 귀가 고급대리운전')+'</h3><p>'+esc(row.short)+'</p>'+
   '<h3>'+esc(row.dong+' CEO·임원 수행기사와 일일기사')+'</h3><p>'+esc(row.day)+'</p>'+
   '<p>'+esc(bill)+' 고객 동승 한 번의 이동과 장시간 대기·수행 일정은 실제 서비스가 다릅니다.</p>'+
   '<p>'+toRegion(city,'강남구 CEO대리운전 전체 안내')+' · '+
   '<a href="/service/corporate/">CEO 법인대리운전·후불정산</a> · '+
   '<a href="/service/daily-driver/">CEO 수행기사·임원 일일기사</a> · '+
   '<a href="/fare/?service=daeri&amp;from='+encodeURIComponent(r.full_name)+'">'+esc(row.dong+' 출발 예상요금·거리 조회')+'</a> · '+
   '<a href="tel:18114294">1811-4294 예약 상담</a></p>'+
   '<p>실제 운행완료·대표이사 고객실적·기사 상주·확정 요금이 아닌 고객 이용 조건 안내입니다.</p></section>';
 }
 function regionSection(r,k){
  if(k!=='daeri'||!r)return '';
  if(r.full_name===DISTRICT)return citySection();
  const row=rows.get(r.full_name);
  return row?localSection(row):'';
 }
 function searchMeta(r,k){
  if(k!=='daeri'||!r||!rows.has(r.full_name)||!META_DONGS.has(r.name))return null;
  const row=rows.get(r.full_name);
  const title=row.dong+'CEO대리운전 | 대표이사·임원 고급 예약';
  const description=row.dong+' CEO·대표이사 고급대리운전. '+row.place+' 출발, 임원 귀가와 수행기사 대기 일정 구분, 법인카드·후불 사전계약, 실제 보험·요금·배차 상담 1811-4294.';
  if(title.length>65||description.length>160||description.length<70)
   throw Error('CEO title/description not original or bounded '+row.dong);
  return {title,description};
 }
 function nationalSection(k){
  if(k!=='daeri')return '';
  return '<section id="gangnam-ceo-national-discovery-20261123"><h2>강남 CEO대리운전·대표이사 고급대리운전·임원 수행기사 안내</h2>'+
   '<p>고객 동승 귀가를 위한 CEO·대표이사 대리운전과 업무 중 대기하는 임원 수행기사·일일기사를 구분합니다. 강남 출발 위치와 정산 조건을 확인하고 <a href="'+esc(c)+'">강남 CEO대리운전 지역 안내</a>, '+
   '<a href="'+esc(corp)+'">법인 CEO 귀가·후불 계약</a>, <a href="'+esc(daily)+'">CEO 수행기사 일정</a>에서 적합한 상담을 선택하세요. 특정 CEO 실적이나 전담 배차를 주장하지 않습니다.</p></section>';
 }
 function resolve(query){return routes.get(trim(query))||null}
 return Object.freeze({regionSection,searchMeta,nationalSection,resolve,
  localityCount:rows.size,aliases:routes.size,metaCount:META_DONGS.size,district:city});
}
module.exports={create,trim,DISTRICT};
