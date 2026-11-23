'use strict';
// 2026 legal region guidance on existing service canonicals.
// Route links are indicative customer inputs, NOT completed journeys or fixed prices.
const data=require('../data/gyeonggi-south-hwaseo-corridors-20261123.json');
const ROOT='경기도';
const KINDS=['daeri','taksong'];
const service=kind=>kind==='daeri'?'대리운전':'자동차탁송';
const HWA='경기도 수원시 팔달구 화서동';
const HWA_CITY='경기도 화성시';

function create({regions,regionByFullName,servicePath,esc}){
 if(!Array.isArray(regions)||!(regionByFullName instanceof Map)||
     typeof servicePath!=='function'||typeof esc!=='function')
   throw Error('Southern Gyeonggi SEO requires legal region index and renderer');
 const names=[
  '경기도 용인시','경기도 화성시','경기도 평택시','경기도 안성시',
  '경기도 수원시','경기도 수원시 팔달구',HWA
 ];
 if(data.rows.length!==7||new Set(data.rows.map(r=>r.region)).size!==7)
   throw Error('Require exactly seven distinct prior canonical page groups');
 const byName=new Map(),canonicalPaths=new Set();
 for(const item of data.rows){
   const region=regionByFullName.get(item.region);
   if(!names.includes(item.region)||!region||byName.has(item.region))
     throw Error('Missing or duplicated original legal locality '+item.region);
   if(!Array.isArray(item.local)||item.local.length!==2||
      !Array.isArray(item.targets)||item.targets.length!==4||
      new Set(item.targets).size!==4||
      !Array.isArray(item.long)||item.long.length!==2||
      new Set(item.long).size!==2||
      typeof item.daeri!=='string'||item.daeri.length<90||
      typeof item.taksong!=='string'||item.taksong.length<90)
     throw Error('Missing genuine area-specific content '+item.region);
   const local=item.hwaseo?item.local:item.local.map(x=>item.region+' '+x);
   for(const loc of local)
     if(!regionByFullName.has(loc))
       throw Error('Cannot use unknown official legal neighborhood '+loc);
   for(const target of [...item.targets,...item.long])
     if(!regionByFullName.has(target)||target===item.region)
       throw Error('Cannot link an unverified or same-origin place '+target);
   if(Boolean(item.hwaseo)!==(item.region===HWA))
     throw Error('화서 must map only to 수원 팔달구 화서동');
   byName.set(item.region,Object.freeze({...item,legalRegion:region,localFull:local}));
   for(const k of KINDS)canonicalPaths.add(servicePath(region,k));
 }
 if(byName.size!==7||canonicalPaths.size!==14||
    !byName.has(HWA)||!byName.has(HWA_CITY))
   throw Error('Preserve 14 existing service canonicals; do not merge 화서와 화성');
 const suwon=regionByFullName.get('경기도 수원시');
 const paldal=regionByFullName.get('경기도 수원시 팔달구');
 const hwaseo=regionByFullName.get(HWA);
 const hwaseong=regionByFullName.get(HWA_CITY);
 const label=r=>{
   switch(r.full_name){
    case '서울특별시':return '서울';
    case '부산광역시':return '부산';
    case '대전광역시':return '대전';
    case '경기도 수원시 팔달구 화서동':return '수원화서동';
    case '경기도 수원시 팔달구':return '수원팔달구';
   }
   return r.full_name.startsWith(ROOT+' ')?r.name.replace(/시$/,''):r.name;
 };
 const quote=(k,from,to)=>'/fare/?service='+k+
   '&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 function route(k,from,to,caption,target){
   return '<a href="'+quote(k,from,to)+'">'+esc(caption+' 예상요금 조회')+'</a>'+
     (target?' · <a href="'+esc(servicePath(target,k))+'">'+
       esc(label(target)+' '+service(k)+' 지역안내')+'</a>':'');
 }
 function one(item,kind){
   const region=item.legalRegion,name=label(region),
    localFrom=item.localFull[0],localTo=item.localFull[1];
   const sectionTitle=kind==='daeri'?'지역대리운전·단거리대리운전':
    '지역탁송·단거리로드탁송';
   const note=kind==='daeri'?
    '대리운전은 고객 차량 주차장의 출입구와 실제 출발 희망시각, 경유·하차 목적지, 기사 복귀 조건을 확인합니다. 골프장·법인·심야 이동은 각 차량 출발지를 별도로 안내해야 합니다.':
    '로드탁송은 차량을 직접 인수해 목적지에서 전달합니다. 차키 인계자, 출고 승인, 주행 가능상태, 차량 수령인과 인계 가능시각을 먼저 확인합니다.';
   const cross=item.targets.map(dest=>{
     const destination=regionByFullName.get(dest),targetName=label(destination);
     return '<li>'+route(kind,region.full_name,dest,
       name+'→'+targetName+' '+(kind==='daeri'?'지역간대리운전':'지역간탁송'),destination)+
       ' · '+route(kind,dest,region.full_name,
       targetName+'→'+name+' '+(kind==='daeri'?'장거리대리운전':'역방향 자동차탁송'),null)+'</li>';
   }).join('');
   const long=item.long.map(dest=>{
     const target=regionByFullName.get(dest);
     return '<li>'+route(kind,region.full_name,dest,
        name+'→'+label(target)+' '+(kind==='daeri'?'장거리대리운전':'장거리자동차탁송'),target)+'</li>';
   }).join('');
   const hwaseoNote=item.hwaseo?
    '<p><strong>화서 ≠ 화성</strong>: 화서동은 수원시 팔달구의 법정동이며 화서1동·화서2동은 행정동입니다. 별도의 도시인 화성시는 동탄구·만세구·병점구·효행구의 4개 일반구로 구성되므로 정확한 출발지 주소로 검색·조회해야 합니다.</p>':
    region.full_name===HWA_CITY?
    '<p><strong>현행 화성시 행정구역</strong>: 2026년 2월부터 동탄구·만세구·병점구·효행구의 4개 일반구로 나누어 안내합니다. 화성시와 수원 화서동은 서로 다른 출발지입니다.</p>':
    region.full_name==='경기도 수원시'||region.full_name==='경기도 수원시 팔달구'?
    '<p>수원 화서동은 팔달구의 법정동이며 화서1동·화서2동 생활권을 포함합니다. 화성시를 의미하는 표현이 아니므로 탁송·대리운전 주소 입력 시 반드시 구분하세요.</p>':'';
   const more='<p><a href="'+esc(servicePath(hwaseo,kind))+'">'+
    esc('수원화서동 '+service(kind)+' 안내')+'</a> · '+
    '<a href="'+esc(servicePath(hwaseong,kind))+'">'+
    esc('화성시 '+service(kind)+' 별도 안내')+'</a> · '+
    '<a href="'+esc(servicePath(region,kind==='daeri'?'taksong':'daeri'))+'">'+
    esc(name+' '+service(kind==='daeri'?'taksong':'daeri')+' 안내')+'</a> · '+
    '<a href="tel:18114294">1811-4294 상담</a></p>';
   return '<section id="gyeonggi-south-hwaseo-corridors-20261123" aria-label="'+
      esc(region.full_name+' '+service(kind)+' 지역간·장거리 예약 안내')+'">'+
      '<h2>'+esc(name+service(kind)+' | 용인·화성·평택·안성·수원 화서 지역간 이동')+'</h2>'+
      '<h3>'+esc(name+' '+sectionTitle)+'</h3>'+
      '<p>'+esc(item[kind])+'</p><p>'+esc(note)+' 같은 시 안에서도 원거리 구·읍면 이동은 반드시 단거리 호출이 아닙니다.</p>'+
      '<p>'+route(kind,localFrom,localTo,item.hwaseo?'화서동→인계동 '+service(kind):
        name+' '+item.local[0]+'→'+item.local[1]+' '+service(kind),null)+'</p>'+
      hwaseoNote+
      '<h3>'+esc(name+' ↔ 경기남부 지역간 '+(kind==='daeri'?'대리운전':'탁송'))+'</h3>'+
      '<p>용인·화성·평택·안성과 수원 화서동 간 이동은 출발 방향·도착 방향을 각각 입력해 조회하세요. 운행 시간대·기사 접근·복귀와 차량 인계조건에 따라 상담 결과가 달라집니다.</p>'+
      '<ul>'+cross+'</ul>'+
      '<h3>'+esc(name+' '+(kind==='daeri'?'장거리대리운전·법인 이동':'장거리자동차탁송·서비스센터 인계'))+'</h3>'+
      '<p>서울·대전·부산 등 장거리 이동은 실제 도로거리·통행료, 차량 상태, 인수 시각을 확인한 후 상담합니다.</p><ul>'+long+'</ul>'+
      '<p>위 링크는 <strong>고객이 직접 출발지·도착지를 입력하는 요금조회 예시</strong>입니다. 확인된 접수 오더·배차완료·운행완료 후기, 확정거리·확정요금 또는 기사 상주를 뜻하지 않습니다. 외부 도로거리 API 장애 시 자동 요금계산을 보장하지 않습니다.</p>'+
      more+'</section>';
 }
 function regionSection(region,kind){
   if(!region||!KINDS.includes(kind))return '';
   const item=byName.get(region.full_name);
   return item?one(item,kind):'';
 }
 function searchMeta(region,kind){
   if(!region||!KINDS.includes(kind))return null;
   const item=byName.get(region.full_name);
   if(!item)return null;
   const name=label(region),isT=kind==='taksong',hw=item.hwaseo;
   const title=hw?(
     isT?'화서동탁송 | 수원 화서동·용인·화성·평택·안성 지역간·장거리':
       '화서동대리운전 | 수원 화서동·용인·화성·평택·안성 장거리'
   ):isT?name+'탁송 | 용인·화성·평택·안성·화서 지역간·장거리':
         name+'대리운전 | 경기남부 지역대리운전·장거리대리운전';
   const disambiguate=hw?'수원시 팔달구 화서동(화성시와 별개). ':
     region.full_name===HWA_CITY?'경기도 화성시(수원 화서동과 별개). ':
     region.full_name.includes('수원시')?'수원시 팔달구 화서동 포함. ':'';
   const description=disambiguate+(isT?
       name+' 지역탁송·자동차탁송. '+item.localFull.map(v=>v.split(' ').at(-1)).join('·')+
       ' 인수, 용인·화성·평택·안성·수원화서 양방향 지역간탁송과 서울·대전·부산 장거리 차량탁송 상담 1811-4294.':
       name+' 지역대리운전·단거리·법인·장거리대리운전. '+item.localFull.map(v=>v.split(' ').at(-1)).join('·')+
       ' 출발, 용인·화성·평택·안성·수원화서 양방향 귀가 및 장거리 예약 상담 1811-4294.');
   if([...title].length>80||description.length<70||description.length>160)
     throw Error('Gyeonggi South title/description size '+region.full_name+' '+kind);
   return {title,description};
 }
 return Object.freeze({sourceCount:byName.size,canonicalPaths:[...canonicalPaths],regionSection,searchMeta});
}
module.exports={create};
