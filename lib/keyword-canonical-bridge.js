'use strict';
// Keyword records are search intents, not 823,160 independently indexable pages.
// Resolve each result to the existing, authoritative regional service URL.
const LABEL={daeri:'대리운전',taksong:'탁송'};
const variants={
 daeri:['24시대리운전','대리','대리기사','대리기사예약','대리운전','대리운전기사',
 '대리운전문의','대리운전배차','대리운전비용','대리운전상담','대리운전서비스',
 '대리운전업체','대리운전예약','대리운전예약문의','대리운전요금','대리운전전화',
 '대리운전회사','심야대리운전','야간대리운전','장거리대리운전'],
 taksong:['24시탁송','심야탁송','야간탁송','자동차탁송','자동차탁송비용',
 '자동차탁송요금','장거리탁송','차량탁송','차량탁송업체','차량탁송예약',
 '탁송','탁송기사','탁송문의','탁송비용','탁송상담','탁송서비스',
 '탁송업체','탁송예약','탁송요금','탁송회사']
};
const endings=Object.entries(variants).flatMap(([kind,words])=>words.map(word=>({kind,word})))
 .sort((a,b)=>b.word.length-a.word.length);
const clean=q=>String(q??'').normalize('NFKC').replace(/[\s·_,.()\-/]+/g,'').trim();
const safePath=(path,kind)=>typeof path==='string'&&new RegExp('^/'+kind+'/[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?/$').test(path);
function canonicalForKeywordRecord(record,regionByFullName,servicePath){
 if(!record||!Object.hasOwn(LABEL,record.service)||!regionByFullName||typeof servicePath!=='function')return null;
 const full=String(record.region??record.region_name??'').trim();
 const r=regionByFullName.get(full);
 if(!r)return null; // Ambiguous / unknown regions never get invented destination URLs.
 const path=servicePath(r,record.service);
 return safePath(path,record.service)?path:null;
}
function resolveRegionalKeywordVariant(query,lookup){
 if(typeof lookup!=='function')return null;
 const q=clean(query);
 if(q.length<4||q.length>160)return null;
 for(const {word,kind} of endings){
  if(!q.endsWith(word))continue;
  const place=q.slice(0,-word.length);
  if(place.length<2)continue;
  const found=lookup(place+LABEL[kind]);
  if(found&&found.kind===kind&&safePath(found.canonical,kind))return found.canonical;
 }
 return null;
}
module.exports={canonicalForKeywordRecord,resolveRegionalKeywordVariant,variants};
