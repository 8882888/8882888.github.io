'use strict';
// Remove vehicle/person imagery while preserving text-only service and fare cards.
// Raw source images stay in repository history; public HTML must not reference them.
function isSafeVisual(raw) {
 if(!raw)return false;
 let url;try{url=new URL(String(raw).replace(/&amp;/g,'&'),'https://jeongukdaeri.kr')}catch{return false}
 const publicHost=(process.env.PUBLIC_HOST||'jeongukdaeri.kr').split(':')[0];
 if(!new Set(['jeongukdaeri.kr','www.jeongukdaeri.kr',publicHost]).has(url.hostname)||!['http:','https:'].includes(url.protocol))return false;
 const p=url.pathname;
 return /^\/card\/area-\d+/.test(p)||/^\/card\/national-(?:daeri|taksong)-brand/.test(p)||/^\/keyword-card\//.test(p)||p==='/api/nationwide-locality-card.svg'||(/^\/assets\/smart24-(?:daeri|taksong)-brand\.png$/.test(p)||/^\/assets\/smart24-business-card(?:-art|-light|-inline|-inline-v2)?\.png$/.test(p))||/^\/assets\/(?:seoraksan|jirisan)-taksong-fares\.svg$/.test(p)||/^\/assets\/service-(?:taksong|daeri|golf)-visual\.svg$/.test(p)||/^\/assets\/cycling-routes\/(?:nationwide|eastcoast|yeongsan|seomjin|geumgang|ocheon|nakdonggang)-taksong\.svg$/.test(p)||/^\/blog\/daeri-regions\/media\/(?:sanjeong-lake|baegun-valley|jangheung-valley|namhansanseong|gapyeong-hyeonri|gapyeong-seorak|ilyeong-valley|bukhansan-valley|buyeo-daeri|daegu-daeri)\.svg$/.test(p);
}
function attr(tag,key){const m=new RegExp('\\b'+key+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')','i').exec(tag);return m?(m[1]??m[2]):''}
function safeImg(tag){return isSafeVisual(attr(tag,'src'))}
function jsonSafe(obj){
 if(Array.isArray(obj))return obj.map(jsonSafe).filter(v=>v!==null);
 if(obj&&typeof obj==='object'){
  if(obj['@type']==='ImageObject'&&!isSafeVisual(obj.contentUrl||obj.url))return null;
  for(const k of Object.keys(obj)){
   if(['image','logo','thumbnailUrl','primaryImageOfPage'].includes(k)){
    const v=obj[k];if(typeof v==='string'&&!isSafeVisual(v)){delete obj[k];continue}
   }
   const v=jsonSafe(obj[k]);if(v===null)delete obj[k];else obj[k]=v;
  }
 }
 return obj;
}
function stripPersonVehicleImages(html){
 let s=String(html),scripts=[];
 // Do not corrupt JavaScript code. JSON-LD retains its SEO entities but loses unsafe image references.
 s=s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>{
  if(/\btype\s*=\s*["']application\/ld\+json["']/i.test(tag)){
   const start=tag.indexOf('>'),end=tag.toLowerCase().lastIndexOf('</script>');
   try{const parsed=JSON.parse(tag.slice(start+1,end));tag=tag.slice(0,start+1)+JSON.stringify(jsonSafe(parsed)).replace(/</g,'\\u003c')+tag.slice(end)}catch{}
  }
  const ix=scripts.push(tag)-1;return '<!-- smart24-json-script-'+ix+' -->';
 });
 s=s.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi,tag=>{
  const img=tag.match(/<img\b[^>]*>/i);
  if(!img||!safeImg(img[0]))return '';
  // A safe PNG fallback must not accidentally preserve an unsafe WebP/photo source.
  return tag.replace(/<source\b[^>]*>/gi,source=>{
   const list=attr(source,'srcset').split(',').map(v=>v.trim().split(/\s+/)[0]).filter(Boolean);
   return list.length&&list.every(isSafeVisual)?source:'';
  });
 });
 s=s.replace(/<img\b[^>]*>/gi,tag=>{
  if(!safeImg(tag))return '';
  // Keep the approved src, but strip any non-approved responsive alternatives.
  return tag.replace(/\s+srcset\s*=\s*(?:"[^"]*"|'[^']*')/gi,field=>{
   const val=field.match(/(?:="([^"]*)"|='([^']*)')/);
   const list=String(val?.[1]??val?.[2]??'').split(',').map(v=>v.trim().split(/\s+/)[0]).filter(Boolean);
   return list.length&&list.every(isSafeVisual)?field:'';
  });
 });
 s=s.replace(/<meta\b[^>]*>/gi,tag=>{
  const key=attr(tag,'property')||attr(tag,'name');
  if(/^(?:og:image|twitter:image)$/i.test(key))return isSafeVisual(attr(tag,'content'))?tag:'';
  return tag;
 });
 s=s.replace(/<link\b[^>]*>/gi,tag=>{
  if(attr(tag,'rel')==='preload'&&attr(tag,'as')==='image'&&!isSafeVisual(attr(tag,'href')))return '';
  return tag;
 });
 // Remove now-empty image-only links; preserve descriptive links, tables and other content.
 s=s.replace(/<a\b([^>]*)>\s*<\/a>/gi,tag=>tag.includes('/assets/')?'':tag);
 s=s.replace(/<!-- smart24-json-script-(\d+) -->/g,(_m,n)=>scripts[Number(n)]||'');
 return s;
}
module.exports={stripPersonVehicleImages,isSafeVisual};
