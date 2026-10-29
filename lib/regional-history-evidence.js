'use strict';
// Conservative, privacy-preserving place detection for completed Excel dispatch records.
// A city name inside a shop name or another town name is not evidence of a trip there.
const NAMES=['서울','부산','인천','대구','광주','대전','울산','세종','제주','강릉','속초','원주','춘천','수원','성남','용인','화성','평택','안산','고양','파주','김포','포천','양양','청주','천안','아산','당진','서산','전주','군산','익산','목포','여수','순천','광양','포항','경주','구미','안동','창원','진주','김해','양산','거제','통영','밀양','경산','문경','함안','울진','영덕','삼척','태백','인제','무주','구례'];
const PROVINCE_ALIASES={
 '서울특별시':['서울특별시','서울시','서울'],
 '부산광역시':['부산광역시','부산시','부산'],
 '대구광역시':['대구광역시','대구시','대구'],
 '인천광역시':['인천광역시','인천시','인천'],
 '광주광역시':['광주광역시','광주시','광주'],
 '대전광역시':['대전광역시','대전시','대전'],
 '울산광역시':['울산광역시','울산시','울산'],
 '세종특별자치시':['세종특별자치시','세종시','세종'],
 '경기도':['경기도'],
 '강원특별자치도':['강원특별자치도','강원도'],
 '충청북도':['충청북도','충북'],
 '충청남도':['충청남도','충남'],
 '전북특별자치도':['전북특별자치도','전라북도','전북'],
 '전라남도':['전라남도','전남'],
 '경상북도':['경상북도','경북'],
 '경상남도':['경상남도','경남'],
 '제주특별자치도':['제주특별자치도','제주도','제주']
};
// The region dataset is immutable for the lifetime of the server. Build its
// name counts once, rather than scanning every region for every ride field.
const regionIndexes = new WeakMap();
function regionIndex(regions){
 let index=regionIndexes.get(regions);
 if(index)return index;
 const names=new Map(),cityCountyShort=new Map();
 for(const region of regions){
  names.set(region.name,(names.get(region.name)||0)+1);
  if(['시','군'].includes(region.level)){
   const short=region.name.replace(/(시|군)$/,'');
   cityCountyShort.set(short,(cityCountyShort.get(short)||0)+1);
  }
 }
 index={names,cityCountyShort};regionIndexes.set(regions,index);return index;
}
function locationTerm(text, term, requirePlaceSuffix=false){
 const raw=String(text||'');
 if(!term)return false;
 let pos=0;
 while((pos=raw.indexOf(term,pos))!==-1){
  const preceding=pos>0?raw[pos-1]:'';
  const after=raw.slice(pos+term.length);
  pos+=term.length;
  // "의정부산곡동" is not 부산; "공원주차장" is not 원주.
  if(/[가-힣]/.test(preceding))continue;
  // "김해공항" is in 부산 강서구, not 김해시.
  if(term==='김해'&&/^공항/.test(after))continue;
  if(!requirePlaceSuffix)return true;
  // Prefer an explicit named locality, address, landmark or a separated city name.
  if(!after||/^[\s,./():;·→\-]/.test(after))return true;
  if(/^(?:특별시|광역시|특별자치시|시|도|구|군|읍|면|동|리|역|항|공항)/.test(after))return true;
  if(/^[가-힣]{1,15}(?:동|구|군|읍|면|리|역|항|로|길|주차장|터미널|해수욕장|산단|시장|공원|국립공원|골프장)/.test(after))return true;
 }
 return false;
}
// Lower level names such as 교동/서구/동산리 are not locations on their own.
// They must be accompanied by their actual administrative parent IN ONE source field.
// Never stitch a city from departure together with a district in destination.
function qualifiedLocalityInField(text,region,regions){
 const value=String(text||'').replace(/\s+/g,'');
 const names=String(region.full_name||'').split(' ').filter(Boolean);
 const child=region.name;
 if(names.length<2||!child)return false;
 const full=names.join('');
 if(locationTerm(value,full))return true;
 const parent=names[names.length-2];
 const index=regionIndex(regions);
 const parentCount=index.names.get(parent)||0;
 const aliases=[];
 if(parentCount===1){
  aliases.push(parent+child);
  if(/(시|군)$/.test(parent)){
   const short=parent.slice(0,-1);
   // Only a unique city/county short name may qualify an unqualified neighborhood.
   if(short.length>=2 && (['시','군','구'].reduce((sum,suffix)=>sum+(index.names.get(short+suffix)||0),0))===1){
    aliases.push(short+child);
   }
  }
 }
 const province=names[0];
 const prefix=names.slice(1,-1).join('');
 for(const p of PROVINCE_ALIASES[province]||[province]){
  aliases.push(p+prefix+child);
 }
 return [...new Set(aliases)].some(alias=>locationTerm(value,alias));
}
function matchingHistoryRegion(record,region,regions){
 const parts=[String(record.rawDeparture||''),String(record.rawDestination||'')];
 if(!region||!region.name||!region.full_name)return false;
 // Places with duplicated short names must not inherit an unrelated ride.
 if(['구','읍','면','동','리'].includes(region.level)){
  return parts.some(part=>qualifiedLocalityInField(part,region,regions));
 }
 if(region.level==='시도'){
  const aliases=PROVINCE_ALIASES[region.name]||[region.name];
  return parts.some(part=>aliases.some(alias=>{
   // 경기 광주시 and 광주광역시 are different localities.
   if(region.name==='광주광역시'&&alias==='광주')return false;
   return locationTerm(part,alias,alias.length<=2||['서울','부산','인천','대구','광주','대전','울산','세종','제주'].includes(alias));
  }));
 }
 return parts.some(part=>{
  if(locationTerm(part,region.full_name))return true;
  if(locationTerm(part,region.name))return true;
  if(region.level==='시'||region.level==='군'){
   const short=region.name.replace(/(시|군)$/,'');
   const otherCount=regionIndex(regions).cityCountyShort.get(short)||0;
   return short.length>1&&short!=='광주'&&otherCount===1&&locationTerm(part,short,true);
  }
  return false;
 });
}
function publicPlace(raw){
 const value=String(raw||'');
 if(/김해(?:국제)?공항/.test(value))return '김해공항(부산 강서구)';
 let first=null;
 for(const name of NAMES){
  // The first explicit place in the source field wins; list order is not geography.
  for(let pos=value.indexOf(name);pos!==-1;pos=value.indexOf(name,pos+name.length)){
   if(pos>0&&/[가-힣]/.test(value[pos-1]))continue;
   const next=value.indexOf(name,pos+name.length);
   const occurrence=value.slice(pos,next<0?undefined:next);
   if(!locationTerm(occurrence,name,true))continue;
   if(first&&first.pos<=pos)continue;
   const suffix=occurrence.match(new RegExp('^'+name+'(특별시|광역시|특별자치시|시|군|구)'));
   first={pos,label:name+(suffix?suffix[1]:'')};
  }
 }
 return first?first.label:'지역 비공개';
}
module.exports={matchingHistoryRegion,publicPlace,locationTerm};
