'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const cases=[
 ['reviews/ride-record-stories/index.html','운행기록','/reviews/ride-record-stories/'],
 ['reviews/taksong/index.html','자동차탁송','/reviews/taksong/'],
 ['reviews/verified/index.html','완료','/reviews/verified/']
];
function description(html){
 const m=html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
 return m?.[1]||'';
}
for(const [file,keyword,route] of cases){
 test('verified review hub has useful, evidence-safe metadata: '+route,()=>{
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const desc=description(html);
  assert(desc.length>=70&&desc.length<=160,'description length should be 70–160 characters');
  assert(desc.includes(keyword),'page-specific context should be present');
  assert(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr'+route+'">'),'canonical should be on public domain');
  assert(!/8882888\.github\.io/.test(desc),'do not advertise the old site host');
 });
}
test('dynamic reviewed route hub also has meaningful, evidence-safe metadata',()=>{
 const code=fs.readFileSync(path.join(root,'lib/route-keyword-pages.js'),'utf8');
 const match=code.match(/return layout\('전국 실제 운행완료 출발지·도착지 탁송·대리운전 후기','([^']+)'/);
 assert(match,'reviewed route hub description must exist');
 const desc=match[1];
 assert(desc.length>=70&&desc.length<=160,'dynamic description length should be 70–160 characters');
 assert(desc.includes('운행기록')&&desc.includes('출발지')&&desc.includes('도착지'));
 assert(!/상시배차|100%|확정요금|최상위노출/.test(desc),'no unsupported promises in meta');
});

test('reviewed route title should only receive the shared Smart24 brand once',()=>{
 const code=fs.readFileSync(path.join(root,'lib/route-keyword-pages.js'),'utf8');
 assert(code.includes("const html=layout(t+' 요금·예약',desc,body,") || code.includes("return layout(t+' 요금·예약',desc,body,"),'route title must use the common layout suffix');
 assert(!code.includes("t+' 요금·예약 | 스마트24'"),'no duplicate Smart24 suffix in generated titles');
});
