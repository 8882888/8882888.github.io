#!/usr/bin/env node
// Read-only, public response comparison. Not a search index count or ranking tool.
const fs=require('node:fs');
const path=require('node:path');
const HOSTS={manus:'https://daeriapp-yjhdsujh.manus.space',smart24:'https://jeongukdaeri.kr'};
const pairs=[
 {topic:'홈페이지',manus:'/',smart24:'/'},
 {topic:'설악산탁송',manus:'/delivery/mountain/seoraksan',smart24:'/%EC%84%A4%EC%95%85%EC%82%B0%ED%83%81%EC%86%A1/'},
 {topic:'대전대리운전',manus:'/regions/%EB%8C%80%EC%A0%84',smart24:'/daeri/daejeon/'},
 {topic:'원주대리운전',manus:'/regions/%EC%9B%90%EC%A3%BC',smart24:'/daeri/gangwon/wonju-si/'},
 {topic:'수원대리운전',manus:'/regions/%EC%88%98%EC%9B%90',smart24:'/daeri/gyeonggi/suwon-si/'}
];
const attr=(tag,key)=>{
 const m=String(tag||'').match(new RegExp('(?:\\s|<)'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
 return m?(m[1]??m[2]??m[3]??''):'';
};
const tags=(html,tag)=>html.match(new RegExp('<'+tag+'\\b[^>]*>','gi'))||[];
const noindex=(input)=>/(?:^|[\s,;])(?:noindex|none)(?=$|[\s,;])/i.test(input||'');
function xRobotsExcludesYeti(header){
 let agent='robots';
 for(const chunk of String(header||'').split(/[,\n]/)){
  const segment=chunk.trim(),scoped=segment.match(/^([a-z][a-z0-9_-]*)\s*:\s*(.*)$/i);
  if(scoped)agent=scoped[1].toLowerCase();
  if(noindex(scoped?scoped[2]:segment)&&(agent==='robots'||agent==='yeti'))return true;
 }
 return false;
}
async function inspect(site,route){
 const url=HOSTS[site]+route;
 try{
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(17000),
   headers:{'user-agent':'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
    accept:'text/html,application/xhtml+xml,application/xml,text/plain'}});
  const html=await response.text(),mtags=tags(html,'meta'),links=tags(html,'link');
  const scoped=mtags.filter(t=>['robots','yeti'].includes(attr(t,'name').toLowerCase()));
  const robots=scoped.map(t=>attr(t,'content')).join('; ');
  const canonicals=links.filter(t=>attr(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const target=canonicals.length===1?attr(canonicals[0],'href'):'';
  const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g,'').trim()||'';
  const h1s=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>m[1].replace(/<[^>]*>/g,'').trim());
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  const header=response.headers.get('x-robots-tag')||'';
  let canonical='';try{canonical=target?new URL(target,url).href:''}catch{}
  return {url,status:response.status,location:response.headers.get('location')||'',canonical,title,h1:h1s[0]||'',h1Count:h1s.length,
    robots,headerRobots:header,htmlCharacters:html.length,visibleCharacters:text.length,
    internalLinkCount:[...html.matchAll(/<a\b[^>]*href=["']([^"']+)/gi)].filter(x=>x[1].startsWith('/')).length,
    indexableSignal:response.status===200&&!scoped.some(t=>noindex(attr(t,'content')))&&!xRobotsExcludesYeti(header)
      &&(!canonical||canonical===url),
    note:'synthetic Yeti request, not verified Naver crawler IP or indexed status'};
 }catch(e){return {url,error:String(e).slice(0,220),note:'fetch failure; cannot infer Naver index exclusion'};}
}
async function run(){
 const rows=[];
 for(const pair of pairs){
  const [manus,smart24]=await Promise.all([inspect('manus',pair.manus),inspect('smart24',pair.smart24)]);
  rows.push({topic:pair.topic,manus,smart24});
 }
 const comparison={generatedAt:new Date().toISOString(),scope:'Public pages only; no Search Advisor authentication; no claim about actual Naver indexing',rows};
 fs.mkdirSync('audit',{recursive:true});
 fs.writeFileSync('audit/manus-smart24-comparison.json',JSON.stringify(comparison,null,2)+'\n');
 const table=[
  '| 검색 의도 | 마너스 HTTP | 스마트24 HTTP | 마너스 canonical | 스마트24 canonical | 마너스 색인 가능 신호 | 스마트24 색인 가능 신호 |',
  '|---|---:|---:|---|---|---|---|',
  ...rows.map(r=>'| '+r.topic+' | '+(r.manus.status??'실패')+' | '+(r.smart24.status??'실패')+
   ' | '+(r.manus.canonical||'미확인').replaceAll('|','/')+' | '+(r.smart24.canonical||'미확인').replaceAll('|','/')+
   ' | '+String(r.manus.indexableSignal??'미확인')+' | '+String(r.smart24.indexableSignal??'미확인')+' |')
 ];
 fs.writeFileSync('audit/manus-smart24-comparison.md',
  '# Manus vs Smart24: live crawler-facing HTML\n\nDate: '+comparison.generatedAt+
  '\n\nThe dashboard counts supplied by the owner belong to different domains. This comparison is a crawler-facing HTTP smoke test, **not** an actual indexed-page count, and cannot prove Naver ranking or Yeti IP access.\n\n'+table.join('\n')+'\n');
 for(const row of rows)console.log(JSON.stringify({topic:row.topic,
  manus:{status:row.manus.status,robots:row.manus.robots,canonical:row.manus.canonical,visible:row.manus.visibleCharacters,error:row.manus.error},
  smart24:{status:row.smart24.status,robots:row.smart24.robots,canonical:row.smart24.canonical,visible:row.smart24.visibleCharacters,error:row.smart24.error}}));
 console.log('Public comparative report saved under audit/');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
