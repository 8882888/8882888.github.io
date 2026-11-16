'use strict';
// Shared SEO metadata guard; canonical, robots/noindex and visible content are unchanged.
const MAX=80;
const attribute=(tag,key)=>{const m=String(tag).match(new RegExp('(?:\\s|<)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));return m?(m[1]??m[2]??m[3]??''):''};
const decode=s=>String(s||'').replace(/&(#(?:x[0-9a-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi,(w,k)=>{if(k[0]==='#'){const n=/^#x/i.test(k)?parseInt(k.slice(2),16):parseInt(k.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):w}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[k.toLowerCase()]||w});
const encode=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function briefDescription(value){
 const valueClean=decode(value).replace(/\s+/g,' ').trim();
 if([...valueClean].length<=MAX)return valueClean;
 const hotline=valueClean.match(/\b(?:1811-4294|1877-5245)\b/)?.[0]||'';
 const suffix=hotline?' · 상담 '+hotline:'';
 const budget=MAX-[...suffix].length;
 let text='';
 for(const word of valueClean.split(' ')){const next=text?text+' '+word:word;if([...next].length>budget)break;text=next}
 const prefix=(text||[...valueClean].slice(0,budget).join('')).replace(/[,:;·\s]+$/u,'').trim();
 return hotline&&!prefix.includes(hotline)?prefix+suffix:prefix;
}
function withContent(tag,value){
 const replacement='"'+encode(value)+'"';
 return /\bcontent\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i.test(tag)
  ?tag.replace(/(\bcontent\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s>]+)/i,(_,prefix)=>prefix+replacement)
  :tag.replace(/\/?>$/,x=>' content='+replacement+x);
}
function normalizeSeoHead(html,{xRobotsTag='',preferredDescription=''}={}){
 if(typeof html!=='string')return html;
 const close=html.search(/<\/head\s*>/i);if(close<0)return html;
 let head=html.slice(0,close),tail=html.slice(close);
 const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
 const descriptions=metas.filter(x=>attribute(x,'name').toLowerCase()==='description');
 const ogs=metas.filter(x=>attribute(x,'property').toLowerCase()==='og:description');
 const original=decode(attribute(descriptions[0]||'','content')),og=decode(attribute(ogs[0]||'','content'));
 const over=[...original].length>MAX,ogOver=[...og].length>MAX;
 const short=over?briefDescription(preferredDescription||original):original;
 if(over||ogOver)head=head.replace(/<meta\b[^>]*>/gi,tag=>{
  if(over&&attribute(tag,'name').toLowerCase()==='description')return withContent(tag,short);
  if((over||ogOver)&&attribute(tag,'property').toLowerCase()==='og:description')return withContent(tag,short||briefDescription(og));
  return tag;
 });
 const excluded=/\bnoindex\b/i.test(String(xRobotsTag))||[...head.matchAll(/<meta\b[^>]*>/gi)].some(m=>
  ['robots','yeti'].includes(attribute(m[0],'name').toLowerCase())&&/\bnoindex\b/i.test(attribute(m[0],'content')));
 const pageTypes=new Set(['WebPage','CollectionPage','Article','BlogPosting','ItemPage','ProfilePage','FAQPage']);
 let hasPageSchema=false;
 function visit(node){if(Array.isArray(node)){node.forEach(visit);return}if(!node||typeof node!=='object')return;
  if([node['@type']].flat().some(t=>pageTypes.has(t)))hasPageSchema=true;
  if(node['@graph'])visit(node['@graph']);
 }
 for(const script of (head+tail).matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)){
  try{visit(JSON.parse(script[1]))}catch{ /* preserve malformed source for audit */ }
 }
 if(!excluded&&!hasPageSchema){
  const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(t=>attribute(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const address=links.length===1?decode(attribute(links[0],'href')):'';
  const title=decode((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').trim();
  try{const url=new URL(address);
   if(url.protocol==='https:'&&url.hostname==='jeongukdaeri.kr'&&!url.search&&!url.hash&&title
     && !/^\/routes\/(?:daeri|taksong)\/area-\d+\/area-\d+\/?$/.test(url.pathname)){
    // Keep combinatorial route pairs out of blanket schema promotion.
    const schema={'@context':'https://schema.org','@type':'WebPage','@id':url.href+'#webpage',url:url.href,name:title,description:briefDescription(original||og||title),isPartOf:{'@id':'https://jeongukdaeri.kr/#website'}};
    head+='<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>';
   }
  }catch{ /* invalid or noncanonical page: no synthetic schema */ }
 }
 // Keep the existing source-backed WebPage JSON-LD consistent with the final
 // visible meta description, without touching Service, BreadcrumbList or the
 // page body. This is required after shortening a long regional snippet.
 return synchronizeWebPageDescription(head+tail,short);
}
function synchronizeWebPageDescription(html,description){
 if(!description)return html;
 return html.replace(/(<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>)([\s\S]*?)(<\/script>)/gi,
 (whole,open,source,close)=>{
  try{
   const parsed=JSON.parse(source);let changed=false;
   const visit=node=>{
    if(Array.isArray(node)){node.forEach(visit);return}
    if(!node||typeof node!=='object')return;
    if([node['@type']].flat().includes('WebPage') && Object.prototype.hasOwnProperty.call(node,'description') && node.description!==description){
     node.description=description;changed=true;
    }
    if(node['@graph'])visit(node['@graph']);
   };
   visit(parsed);
   return changed?open+JSON.stringify(parsed).replace(/</g,'\\u003c')+close:whole;
  }catch{ return whole; }
 });
}
module.exports={normalizeSeoHead,briefDescription,MAX};
