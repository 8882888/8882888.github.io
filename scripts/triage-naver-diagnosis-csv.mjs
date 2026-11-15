// Parse an operator-exported Naver Search Advisor diagnosis CSV.
// Never infer actual indexed counts from a crawl test or a sitemap.
import fs from 'node:fs';
import path from 'node:path';

const input=process.argv[2];
if(!input){console.error('Usage: node scripts/triage-naver-diagnosis-csv.mjs <naver-export.csv> [output.json]');process.exit(2);}
const bytes=fs.readFileSync(input);
const text=new TextDecoder(bytes[0]===0xef?'utf-8':'utf-8',{fatal:false}).decode(bytes).replace(/^\uFEFF/,'');
function csvRows(s){
 const rows=[];let row=[],cell='',quote=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];if(quote){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')quote=false;else cell+=c;}
  else if(c==='"')quote=true;else if(c===','){row.push(cell.trim());cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,'').trim());rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quote)throw new Error('Unclosed CSV quote');
 if(cell||row.length){row.push(cell.trim());rows.push(row)}
 return rows.filter(r=>r.some(Boolean));
}
const rows=csvRows(text);if(rows.length<2)throw new Error('No data rows');
const header=rows[0].map(s=>s.toLowerCase().replace(/\s+/g,''));
function col(names){return header.findIndex(x=>names.some(n=>x.includes(n)));}
const urlCol=col(['url','주소','페이지url','페이지주소']);
const reasonCol=col(['진단유형','진단항목','색인제외사유','문제유형','오류유형','상세유형','reason','issue','type']);
if(urlCol<0)throw new Error('Cannot locate URL column. Preserve original column headings from Naver export.');
const origin='https://jeongukdaeri.kr';
const grouped=new Map(),invalid=[],otherHosts=[];
const classify=s=>{
 const t=s.toLowerCase();
 if(/canonical|대표\s*url|중복/.test(t))return 'representative_url_or_duplicates';
 if(/404|내용\s*없|소프트|빈\s*문서/.test(t))return 'empty_or_soft404';
 if(/robot|noindex|차단/.test(t))return 'robots_or_noindex';
 if(/redirect|리다이렉트|3xx/.test(t))return 'redirect';
 if(/http|서버|접근|수집제한|5xx|403/.test(t))return 'http_or_crawl';
 if(/제목|설명문|리소스|seo/i.test(t))return 'seo';
 return 'official_reason_manual_review';
};
for(const [offset,values] of rows.slice(1).entries()){
 const raw=(values[urlCol]||'').trim(),reason=(reasonCol>=0?values[reasonCol]:'')||'사유 열 없음';
 let url;try{url=new URL(raw);}catch{invalid.push({line:offset+2,url:raw});continue;}
 if(url.origin!==origin){otherHosts.push({line:offset+2,url:raw});continue;}
 url.search='';url.hash='';
 const category=classify(reason);
 const item={url:url.href,officialReason:reason,category,sourceLine:offset+2,officialIndexStatus:'unverified_per_url'};
 const list=grouped.get(category)||[];list.push(item);grouped.set(category,list);
}
const priority=['robots_or_noindex','http_or_crawl','redirect','representative_url_or_duplicates','empty_or_soft404','seo','official_reason_manual_review'];
const out={
 sourceFile:path.basename(input),dataSource:'operator-supplied Naver Search Advisor diagnosis export',
 note:'This file is a category-specific diagnostic URL list, NOT a complete list of indexed pages. Reason is preserved from the supplied file.',
 counts:{inputRows:rows.length-1,accepted: [...grouped.values()].reduce((s,a)=>s+a.length,0),invalid:invalid.length,otherHosts:otherHosts.length},
 byReason:priority.filter(k=>grouped.has(k)).map(k=>({category:k,count:grouped.get(k).length,items:grouped.get(k)})),
 invalid,otherHosts
};
const output=process.argv[3]||'naver-official-diagnosis-triage.json';
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({output,counts:out.counts,reasons:out.byReason.map(x=>({category:x.category,count:x.count}))},null,2));
