'use strict';

// Remove retired homepage promotional wording only. Keep the search form,
// keyword-specific preview cards, service links and regional data unchanged.
function removeRetiredHomepageCopy(source) {
 let html=String(source);
 const retiredTitle=/^지역\s*[·ㆍ∙]\s*코스\s*[·ㆍ∙]\s*서비스\s*키워드별\s*동적\s*(?:명함|이미지)\s*자동보기$/;
 html=html.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,(entire,level,content)=>{
  const plain=content.replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  return retiredTitle.test(plain)?'':entire;
 });
 // Older Cloudtype/GitHub Pages revisions called the search button "auto expand".
 // This changes its caption, never its submit behavior or event listeners.
 html=html.replace(/(>)(\s*)지역별 명함 자동확장 보기(\s*)(<\/button>)/g,'$1$2지역 검색$3$4');
 html=html.replace(/(>)(\s*)지역·코스·서비스 키워드(\s*)(<input\b)/g,'$1$2지역·서비스 검색어$3$4');
 return html;
}
module.exports={removeRetiredHomepageCopy};
