// Read-only editorial quality signals for full-sitemap HTTP audits.
// These are human-review flags, NOT Naver indexing rules or automatic noindex decisions.
function attribute(tag,name){
 const found=String(tag||'').match(new RegExp('(?:\\s|<)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
 return String(found?.[1]??found?.[2]??found?.[3]??'').trim();
}
function decodeEntities(value){
 return String(value||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&#(\\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([\\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}
export function contentQualitySignals(html){
 const source=String(html||'');
 const body=source.match(/<body\\b[^>]*>([\\s\\S]*?)<\\/body>/i)?.[1]||source;
 const main=body.match(/<main\\b[^>]*>([\\s\\S]*?)<\\/main>/i)?.[1]||body;
 const h1Count=[...main.matchAll(/<h1\\b/gi)].length;
 const visible=main.replace(/<(script|style|noscript|svg|template)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ')
  .replace(/\\s+/g,' ').trim();
 const wordCount=visible?visible.split(/\\s+/).filter(Boolean).length:0;
 const descriptionTag=[...source.matchAll(/<meta\\b[^>]*>/gi)].map(x=>x[0])
  .find(tag=>attribute(tag,'name').toLowerCase()==='description');
 const description=decodeEntities(attribute(descriptionTag,'content'));
 const descriptionLength=Array.from(description).length;
 const flags=[];
 if(wordCount<100)flags.push('thin_content_under_100_words');
 if(descriptionTag&&descriptionLength>0&&descriptionLength<70)flags.push('short_meta_description_under_70_chars');
 if(h1Count===0)flags.push('missing_h1');
 if(h1Count>1)flags.push('multiple_h1');
 return {wordCount,descriptionLength,h1Count,contentReviewFlags:flags};
}
