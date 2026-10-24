'use strict';
// Short geographical names share their existing place page; never create a page per spelling.
const suffix=/(?:해수욕장|해변|포구|항|계곡|유원지|관광지)$/;
function aliases(term,known=[]){const name=String(term).trim(),short=name.replace(suffix,'').trim();return [...new Set([name,...known,...(short!==name&&short.length>=2?[short]:[])])];}
function shortName(term,known=[]){const names=aliases(term,known);return names.reduce((a,b)=>b.length<a.length?b:a,names[0]);}
module.exports={aliases,shortName};
