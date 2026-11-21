#!/usr/bin/env node
// Read-only source audit: detect nationwide copy reused after changing locality names.
// This is NOT an indexability verdict, ranking score, or permission to auto-publish.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const dir = path.join(process.cwd(), 'data');
const files = fs.readdirSync(dir).filter(f => /^naver-regional-focus-.*\.json$/.test(f) && !f.includes('candidates')).sort();
const provinceFiles = fs.readdirSync(path.join(dir, 'legal-regions')).filter(f => /^\d{2}\.json$/.test(f)).sort();
const provinces = provinceFiles.map(f => {
  const r = JSON.parse(fs.readFileSync(path.join(dir, 'legal-regions', f), 'utf8'));
  return String(r.full_names?.[0] || r.province || '').trim();
});
if (provinces.length !== 17 || new Set(provinces).size !== 17 || provinces.some(x=>!x)) {
  throw Error('Expected exactly 17 official province names');
}
const clean = value => String(value || '').replace(/\s+/g,' ').trim();
const fingerprint = text => createHash('sha256').update(text).digest('hex').slice(0,16);
const provinceOf = region => provinces.find(p => region === p || region.startsWith(p+' ')) || null;
// Only mask names already present in the *same source row*. Do not strip
// service words, business names, amounts, times or route-specific details.
const maskLocality = (value, region) => {
  let text = clean(value);
  const tokens = [...new Set([region, ...region.split(/\s+/)])]
    .filter(x => x.length >= 2).sort((a,b) => b.length-a.length);
  for (const token of tokens) text = text.split(token).join('〈지역명〉');
  return text;
};
const records = [];
for (const filename of files) {
  const parsed = JSON.parse(fs.readFileSync(path.join(dir, filename),'utf8'));
  for (const [index, item] of (parsed.priority || []).entries()) {
    if (!['daeri','taksong'].includes(item.kind)) continue;
    records.push({id:item.id,region:clean(item.region),kind:item.kind,
      keyword:clean(item.keyword),source:'data/'+filename,position:index+1,
      pickup:clean(item.pickup),handover:clean(item.handover)});
  }
}
if (records.length !== 2900) throw Error('Expected complete 2,900-guide original inventory, found '+records.length);
const groups = new Map(), provinceTotals = Object.fromEntries(provinces.map(p=>[p,0]));
const provinceAffected = Object.fromEntries(provinces.map(p=>[p,new Set()]));
const missingProvince = [];
for (const item of records) {
  const province = provinceOf(item.region);
  if (!province) missingProvince.push({source:item.source,position:item.position,region:item.region});
  else provinceTotals[province]++;
  for (const field of ['pickup','handover']) {
    const normalized = maskLocality(item[field], item.region);
    // Very short noninformative text is still counted, but not misreported
    // as a meaningful template shared across places.
    const key = item.kind+'|'+field+'|'+fingerprint(normalized);
    if (!groups.has(key)) groups.set(key,{kind:item.kind,field,hash:fingerprint(normalized),
      maskedPreview:normalized.slice(0,190),normalizedLength:normalized.length,
      count:0,regionSet:new Set(),provinceSet:new Set(),examples:[],members:[]});
    const g = groups.get(key);
    g.count++;
    g.regionSet.add(item.region);
    if (province) g.provinceSet.add(province);
    g.members.push({province,region:item.region,kind:item.kind,id:item.id,
      source:item.source,position:item.position});
    if (g.examples.length < 6) g.examples.push({province,region:item.region,
      kind:item.kind,id:item.id,source:item.source,position:item.position});
  }
}
const duplicateGroups = [...groups.values()].filter(g=>g.count>=2 && g.regionSet.size>=2 && g.normalizedLength>=45);
duplicateGroups.sort((a,b)=>b.count-a.count || b.regionSet.size-a.regionSet.size || a.hash.localeCompare(b.hash));
const affected = new Set(), affectedFields={pickup:new Set(),handover:new Set()};
for (const g of duplicateGroups) {
  for (const m of g.members) {
    const key=m.source+'|'+m.position+'|'+m.kind;
    affected.add(key);affectedFields[g.field].add(key);
    if (m.province) provinceAffected[m.province].add(key);
  }
}
const serial = g=>({kind:g.kind,field:g.field,hash:g.hash,count:g.count,
  distinctRegions:g.regionSet.size,provinceCount:g.provinceSet.size,
  provinceNames:[...g.provinceSet].sort(),maskedPreview:g.maskedPreview,
  examples:g.examples});
const report={
  generatedAt:new Date().toISOString(),
  scope:'all 2,900 source-defined guides, all 17 provinces and both services; source guidance only',
  method:'exact identical text after masking only this row’s own administrative locality terms; diagnostic, not semantic similarity or verified search duplication',
  sourceFiles:files.length,totalRecords:records.length,totalParagraphs:records.length*2,
  officialProvinces:provinces.length,missingProvinceCount:missingProvince.length,
  missingProvinceExamples:missingProvince.slice(0,10),
  repeatedTemplateGroups:duplicateGroups.length,
  repeatedParagraphInstances:duplicateGroups.reduce((n,g)=>n+g.count,0),
  affectedDistinctGuideCount:affected.size,
  affectedByField:{pickup:affectedFields.pickup.size,handover:affectedFields.handover.size},
  provinceBreakdown:provinces.map(p=>({province:p,total:provinceTotals[p],
    affected:provinceAffected[p].size})),
  topGroups:duplicateGroups.slice(0,100).map(serial),
  note:'Template similarity is a prioritization signal, not proof of low-quality, plagiarism, completed drives, Naver indexing or search rankings. Source text is never modified.',
  naverIndexed:null,naverImpressions:null,naverClicks:null,naverCtr:null
};
if (files.length!==33 || missingProvince.length || provinces.reduce((n,p)=>n+provinceTotals[p],0)!==records.length) {
  throw Error('Nationwide source/province reconciliation failed');
}
fs.writeFileSync('ai-index-template-reuse.json',JSON.stringify(report,null,2)+'\n');
const markdown=[
 '# 전국 지역명 치환형 반복 문장 점검',
 '',
 '- 원본 '+records.length+'건 / '+files.length+'개 파일 / 법정행정구역 '+provinces.length+'개 시·도 / 대리운전·탁송 두 서비스',
 '- 지명 토큰만 가린 동일 본문 군집: **'+report.repeatedTemplateGroups+'개**',
 '- 같은 문장 군집에 포함된 본문 출현: **'+report.repeatedParagraphInstances+'개** (인수/인계 본문 별도 집계)',
 '- 영향을 받은 고유 지역·서비스 안내: **'+report.affectedDistinctGuideCount+'건** / '+records.length+'건',
 '- 실제 네이버 색인·노출·클릭·CTR 확인 자료가 아니며 **자동 게시/수집 요청/URL 증설을 하지 않습니다**.',
 '',
 '| 시·도 | 전체 안내 | 지명 치환형 반복 문구 영향 |',
 '|---|---:|---:|',
 ...report.provinceBreakdown.map(p=>'| '+p.province+' | '+p.total+' | '+p.affected+' |'),
 '',
 '## 우선 검토할 반복 문장 군집 (상위 20)',
 '',
 '| 서비스 | 문단 | 출현 | 지역 수 | 지문 |',
 '|---|---|---:|---:|---|',
 ...report.topGroups.slice(0,20).map(g=>'| '+g.kind+' | '+g.field+' | '+g.count+' | '+g.distinctRegions+' | '+g.hash+' |'),
 '',
 '## 편집 원칙',
 '',
 '1. 실제 지역의 정확한 출차 지점·차량 인수권한·수령 시간·비용 변수를 근거 있는 범위에서만 추가합니다.',
 '2. 예시가 충분하지 않은 지역은 지역명만 치환해서 분량을 늘리거나 운행 완료 후기·임의 요금을 만들지 않습니다.',
 '3. 17개 시·도와 두 서비스의 대기열을 균형 있게 돌며 원본·대표 URL·canonical을 보존합니다.',
 ''
].join('\n');
fs.writeFileSync('ai-index-template-reuse.md',markdown);
console.log('NATIONWIDE_LOCALITY_MASKED_TEMPLATE_AUDIT '+JSON.stringify({
  sourceFiles:report.sourceFiles,records:report.totalRecords,
  groups:report.repeatedTemplateGroups,affected:report.affectedDistinctGuideCount,
  missingProvinceCount:report.missingProvinceCount,top:report.topGroups.slice(0,3).map(g=>({kind:g.kind,field:g.field,count:g.count,distinctRegions:g.distinctRegions}))
}));
