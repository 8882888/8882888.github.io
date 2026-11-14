'use strict';
// All tourist landmark search variants reuse the existing legal-region canonical.
// A source keyword is a service intent, never evidence of a completed dispatch.
const curated=require('../data/tourist-daeri-places-20261114.json');
const clean=v=>String(v??'').normalize('NFKC').replace(/[\s·_,.()\/-]+/g,'').toLowerCase();
const eligible=new Set(['시도','시','군','구']);
function create({landmarks,regionByFullName,servicePath,esc,layout,host='jeongukdaeri.kr'}){
 const regions=[...regionByFullName.values()];
 function knownRegion(areas){
  if(!Array.isArray(areas)||!areas.length)return null;
  const fullNames=areas.map(x=>regionByFullName.get(x)).filter(x=>x&&eligible.has(x.level));
  const province=fullNames.find(x=>x.level==='시도');
  const exact=fullNames.find(x=>x.level!=='시도');
  if(exact)return exact;
  const local=regions.filter(r=>eligible.has(r.level)&&r.level!=='시도'&&areas.includes(r.name)&&(!province||r.full_name.startsWith(province.full_name+' ')));
  if(local.length===1)return local[0];
  if(local.length>1)return null; // Ambiguous district labels cannot be routed to another city.
  return province||null;
 }
 const byName=new Map();
 function add(name,region,category,aliases=[]){
  if(!region||!eligible.has(region.level))return;
  const id=clean(name);
  if(id.length<2||byName.has(id))return;
  byName.set(id,{name,region,category,aliases:[...new Set(aliases)].filter(x=>clean(x)!==id)});
 }
 for(const item of curated.places){
  const region=regionByFullName.get(item.region);
  if(!region)throw Error('Tourist keyword has unknown legal region: '+item.region+' / '+item.name);
  add(item.name,region,item.category,item.aliases);
 }
 for(const [name,areas] of landmarks||[]){
  if(/(?:혁신도시|(?:^|.)역$|톨게이트|주차장|환타지아)/.test(name))continue;
  const region=knownRegion(areas);
  if(region)add(name,region,/(해수욕장|해변|비치|항$)/.test(name)?'해변·항구':/(시장|장터)/.test(name)?'전통시장':/(계곡|산|호수|폭포)/.test(name)?'산행·호수':'관광명소');
 }
 const entries=[...byName.values()];
 const exactQueries=new Map();
 for(const item of entries)for(const alias of [item.name,...item.aliases]){
  for(const suffix of ['대리운전','대리']){
   const query=clean(alias+suffix),old=exactQueries.get(query);
   if(old&&old.region.full_name!==item.region.full_name)exactQueries.set(query,null);
   else if(!exactQueries.has(query))exactQueries.set(query,item);
  }
 }
 const resolve=query=>{
  const q=clean(query);
  if(!q||q.length>110)return null;
  const match=exactQueries.get(q);
  return match?servicePath(match.region,'daeri'):null;
 };
 function regionSection(region,kind){
  if(kind!=='daeri'||!['시','군','구','시도'].includes(region.level))return '';
  const nearby=entries.filter(x=>x.region.full_name===region.full_name).slice(0,9);
  if(!nearby.length)return '';
  return '<section id="tourist-landmark-daeri-guide"><h2>'+esc(region.name)+' 주요 관광지·전통시장 대리운전</h2>'+
   '<p>아래는 '+esc(region.name)+'의 관광지와 시장 이름을 기준으로 찾는 대리운전 상담 검색어입니다. 실제 운행완료 후기나 해당 장소 기사 상주를 의미하지 않습니다. 주차장·출발시각·도착지·기사 복귀 조건을 먼저 확인하세요.</p><ul>'+
   nearby.map(x=>'<li><strong>'+esc(x.name+'대리운전')+'</strong> · '+esc(x.name+'대리')+
    ' · <a href="/fare/?service=daeri&amp;from='+encodeURIComponent(x.name)+'">출발·도착 예상요금</a></li>').join('')+
   '</ul><p><a href="/daeri/tourist-spots/">전국 관광지 대리운전·대리 검색 더 보기</a> · <a href="tel:18114294">1811-4294 예약 상담</a></p></section>';
 }
 function page(query=''){
  const q=clean(String(query||'').slice(0,80));
  const matches=q?entries.filter(x=>[x.name,...x.aliases].some(v=>clean(v).includes(q)||clean(v+'대리운전').includes(q)||clean(v+'대리').includes(q))):entries;
  const byProvince=new Map();
  for(const x of matches){const p=x.region.full_name.split(' ')[0];if(!byProvince.has(p))byProvince.set(p,[]);byProvince.get(p).push(x)}
  const sections=[...byProvince].map(([province,items])=>
   '<section><h2>'+esc(province)+' 주요 관광지·전통시장 대리운전</h2><ul>'+
   items.map(x=>'<li><strong>'+esc(x.name+'대리운전')+'</strong> · <span>'+esc(x.name+'대리')+'</span>'+
    (x.aliases.length?' · 통칭 '+x.aliases.map(a=>esc(a+'대리운전')+' / '+esc(a+'대리')).join(', '):'')+
    '<p>'+esc(x.region.full_name)+' · '+esc(x.category)+' · <a href="'+esc(servicePath(x.region,'daeri'))+'">지역 대리운전 안내</a> · <a href="/fare/?service=daeri&amp;from='+encodeURIComponent(x.name)+'">출발·도착 요금조회</a></p></li>').join('')+
   '</ul></section>').join('');
  const body='<section><h1>전국 유명 관광지·전통시장 대리운전·대리 검색</h1>'+
   '<p>속초관광시장대리운전·속초관광시장대리처럼 현장에서 사용하는 통칭도 검색할 수 있습니다. 속초관광시장·속초관광수산시장·속초중앙시장은 같은 장소로 묶고 속초시 대리운전 안내로 연결합니다.</p>'+
   '<p>전국 주요 관광시장·해변·항구·관광단지·계곡·관광명소의 출발지 상담 안내이며, 개별 장소마다 새로운 중복 검색 페이지를 만들지 않습니다. 실제 배차 확정이나 완료 운행기록을 뜻하지 않습니다.</p>'+
   '<form method="get" action="/daeri/tourist-spots/"><label for="tourist-daeri-q">관광지 또는 시장명 검색</label> '+
   '<input id="tourist-daeri-q" name="q" type="search" maxlength="80" value="'+esc(String(query||'').slice(0,80))+'" placeholder="속초관광시장대리운전"> <button type="submit">관광지 찾기</button></form>'+
   '<p><a href="/fare/?service=daeri">대리운전 예상요금 조회</a> · <a href="/reviews/history/?kind=daeri">확인된 완료 운행기록</a> · <a href="tel:18114294">1811-4294 예약 상담</a></p>'+
   '<p>검색 결과: '+matches.length+'개 장소 · '+(q?'검색 결과는 같은 대표 페이지 주소를 사용합니다.':'전국 17개 시·도 명소를 기존 지역 안내로 연결합니다.')+'</p></section>'+
   (sections||'<section><p>일치하는 관광지 명칭이 없습니다. 정확한 지역을 알고 있다면 <a href="/region/">행정구역 검색</a>에서 조회하세요.</p></section>')+
   '<section><h2>관광지에서 대리운전 부를 때</h2><p>시장·축제장·관광지 출입구와 실제 차량 주차장이 다를 수 있습니다. 기사와 만날 위치와 목적지, 출발 희망 시각을 알려주고 야간·주말·외곽 지역은 미리 배차 가능 여부를 확인하세요. 상담 가능 지역 안내는 상주 기사 또는 즉시 배차 보장이 아닙니다.</p><p>기록되지 않은 실제 운행후기나 지역별 고정요금을 만들어 표시하지 않습니다.</p></section>';
  return layout('전국 관광지·전통시장 대리운전·대리 검색 | 속초관광시장·지역별 예약',
   '속초관광시장대리운전·속초관광시장대리·속초중앙시장대리운전부터 전국 유명 관광지·전통시장·해변·항구 대리운전 검색. 실제 출발지·도착지 요금조회 및 예약 상담 1811-4294.',
   body,'https://'+host+'/daeri/tourist-spots/');
 }
 return {resolve,page,regionSection,entries,keywordVariants:exactQueries.size,sourcePlaces:curated.places.length};
}
module.exports={create,clean};
