'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const rows=[
 {slug:'used-car',id:'used-car-step-by-step-20261117',source:'224451107355',distinction:['매입 현장에서','성능점검·상품화','구매고객에게']},
 {slug:'rental-car',id:'rental-car-step-by-step-20261117',source:'224430950314',distinction:['고객 인도 시점','사고대차·장기렌트 반납','지점 간 여러 대']},
 {slug:'export-port',id:'export-port-step-by-step-20261117',source:'224363608182',distinction:['매매단지·경매장','수출단지 지정 장소','항만 출입·선적']},
 {slug:'scrapyard',id:'scrapyard-step-by-step-20261117',source:'224371924577',distinction:['운전 가능한 차량','폐차장 접수 담당자','기록과 현재 접수']},
 {slug:'auction',id:'auction-step-by-step-20261117',source:'224421653506',distinction:['낙찰 이후 출고 권한','주차구역·반출 마감','낙찰 차량의 다음 목적지']}
];
test('five existing canonical business guides have distinguishable source-scoped practical steps',()=>{
 const unique=new Set();
 for(const row of rows){
  const html=read('business/'+row.slug+'/index.html');
  const canonical='https://jeongukdaeri.kr/business/'+row.slug+'/';
  assert(html.includes('<link rel="canonical" href="'+canonical+'">'),row.slug+' self canonical');
  const section=html.match(new RegExp('<section id="'+row.id+'">([\\s\\S]*?)<\\/section>'))?.[1];
  assert(section,row.slug+' exact source-specific section');
  assert.equal(html.split('id="'+row.id+'"').length-1,1,'one source block '+row.slug);
  assert.equal((section.match(/<h3>/g)||[]).length,3,row.slug+' three real operational phases');
  assert(section.length>480,row.slug+' decision-grade explanation, not empty SEO padding');
  for(const term of row.distinction)assert(section.includes(term),'missing separate stage '+row.slug+' '+term);
  assert(section.includes('href="https://blog.naver.com/wjdtnr4757/'+row.source+'"'),row.slug+' existing original link');
  assert(!/확정 요금은|100% 배차|기사 상주 보장|공식 계약 확정/.test(section),row.slug+' no unsupported marketing claim');
  assert(html.indexOf('id="'+row.id+'"')>html.indexOf('<main'),'live visible SSR main '+row.slug);
  assert(html.indexOf('id="'+row.id+'"')<html.indexOf('id="'+row.slug.split('-')[0]),'new steps precede the preexisting original section');
  assert(html.includes('href="tel:18114294"'),row.slug+' original phone intact');
  assert(html.includes('href="/fare/?service=taksong"'),row.slug+' quote path intact');
  assert(!/name="robots" content="noindex/.test(html),row.slug+' no forced noindex');
  const title=(html.match(/<title>([^<]+)<\/title>/)||[])[1],desc=(html.match(/<meta name="description" content="([^"]+)"/)||[])[1];
  assert(title&&desc,row.slug+' original title/description intact');
  assert(!unique.has(section),row.slug+' duplicate page sections');
  unique.add(section);
 }
});
test('business hub preserves five existing navigable business service URLs and original source disclosures',()=>{
 const hub=read('business/index.html');
 for(const row of rows)assert(hub.includes('href="/business/'+row.slug+'/"'),row.slug+' business hub link');
 assert(hub.includes('href="tel:18114294"'),'hub phone');
 assert(hub.includes('<link rel="canonical" href="https://jeongukdaeri.kr/business/">'),'hub self canonical');
 const robots=read('robots.txt');
 assert(!/^Disallow:/mi.test(robots),'do not add blanket crawler blocking');
});
