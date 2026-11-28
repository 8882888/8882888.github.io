// Read-only owner-reported Naver Search Advisor scorecard. Never infers index totals
// from sitemaps, Naver site: searches, IndexNow, GitHub CI, or synthetic Yeti.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const optional=(p)=>{try{return read(p)}catch(error){if(error.code==='ENOENT')return null;throw error}};
const count=(v)=>Number.isSafeInteger(v)&&v>=0;
export function delta(current,base){
 return count(current)&&count(base)?current-base:null;
}
export function compareOfficial(baseline,snapshot){
 const base=baseline.officialIndexBaseline;
 if(!snapshot)return {baseline:base,current:null,indexDelta:null,collectionLimitedDelta:null,excludedDelta:null,status:'UNVERIFIED_NO_CURRENT_OFFICIAL_DATA'};
 // This file must be transcribed from the site owner's authenticated diagnosis.
 // A date and provenance are mandatory to prevent an anonymous API scrape or a
 // sitemap/keyword count from being mislabeled as an official observation.
 if(snapshot.sourceType!=='owner_reported_naver_searchadvisor'
    ||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(snapshot.observedAt||''))
  throw Error('Official snapshot must identify owner-reported Naver Search Advisor source and observation date');
 for(const key of ['indexed','collectionLimited','excluded']){
  if(!count(snapshot[key]))throw Error('Invalid official count: '+key);
 }
 // An undated historical index count cannot establish a temporal increase.
 // Still report the authenticated current count if one is supplied.
 const baselineDated=/^\d{4}-\d{2}-\d{2}$/.test(base.observedAt||'')
  &&base.observedAt<snapshot.observedAt;
 const indexDelta=baselineDated?delta(snapshot.indexed,base.indexed):null;
 return {baseline:base,current:snapshot,indexDelta,
  collectionLimitedDelta:baselineDated?delta(snapshot.collectionLimited,base.collectionLimited):null,
  excludedDelta:baselineDated?delta(snapshot.excluded,base.excluded):null,
  baselineDateVerified:baselineDated,
  status:!baselineDated?'UNVERIFIED_HISTORICAL_BASELINE_DATE':
   indexDelta>0?'OFFICIAL_INCREASE':indexDelta===0?'OFFICIAL_UNCHANGED':'OFFICIAL_DECREASE'};
}
export function searchComparison(baseline,snapshot){
 const prior={date:baseline.last_updated,period:baseline.period,
  clicks:baseline.totals.clicks,impressionsApprox:baseline.totals.impressions_approx,
  ctrPercent:baseline.totals.ctr_percent,source:baseline.source};
 if(!snapshot||!snapshot.search||snapshot.search.period!==prior.period
   ||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(snapshot.search.updatedAt||'')
   ||snapshot.search.updatedAt<=prior.date)
  return {baseline:prior,current:null,clickDelta:null,impressionsDeltaApprox:null,
    status:'UNVERIFIED_OR_INCOMPARABLE_WINDOW'};
 const now=snapshot.search;
 if(!count(now.clicks)||!count(now.impressions))throw Error('Invalid current Naver search counts');
 const currentCtrPercent=Number.isFinite(now.displayedAverageCtrPercent)
  ?now.displayedAverageCtrPercent:now.impressions>0
  ?Math.round(10000*now.clicks/now.impressions)/100:null;
 const ctrDeltaPercentagePoints=currentCtrPercent!==null
  ?Math.round((currentCtrPercent-(prior.ctrPercent||0))*100)/100:null;
 return {baseline:prior,current:{...now,ctrPercent:currentCtrPercent},
  clickDelta:delta(now.clicks,prior.clicks),
  impressionsDeltaApprox:delta(now.impressions,prior.impressionsApprox),
  ctrDeltaPercentagePoints,
  dataWindowCaution:'Owner-reported rolling recent-30-day windows can overlap; click change does not prove extra customers, calls or causal SEO growth',
  status:'OWNER_REPORTED_COMPARISON__NOT_LIVE_API'};
}
const baseline=read('data/naver-searchadvisor-official-baseline.json');
const searchBase=baseline.searchClicksBaselineOwnerReported??read(baseline.searchClicksBaselineFile);
export function fromDatedOwnerReport(s){
 if(!s)return null;
 if(s.sourceType!=='owner_reported_naver_searchadvisor'||s.site!=='https://jeongukdaeri.kr'||s.scope!=='WEB_SEARCH_ONLY'||s.devices!=='PC + Mobile'||s.diagnosis?.source!=='사이트 진단 > 진단 현황 > 색인된 페이지'||!/^\d{4}-\d{2}-\d{2}$/.test(s.diagnosis.updatedAt||'')||!/^\d{4}-\d{2}-\d{2}$/.test(s.updatedAt||'')||s.diagnosis.updatedAt>s.reportedAt||s.updatedAt>s.reportedAt)throw Error('Unrecognized dated owner report');
 return {sourceType:s.sourceType,observedAt:s.diagnosis.updatedAt,indexed:s.diagnosis.indexed,collectionLimited:s.diagnosis.collectionLimited,excluded:s.diagnosis.excluded,seoIssues:s.diagnosis.seoIssues,search:{period:s.window,updatedAt:s.updatedAt,clicks:s.siteMetrics.clicksApprox,impressions:s.siteMetrics.impressionsApprox,displayedAverageCtrPercent:s.siteMetrics.displayedAverageCtrPercent,approximate:true},crawl:s.crawl};
}
const previousDatedOwnerReport=optional('data/naver-search-advisor-baseline-20261125.json');
const datedOwnerReport=optional('data/naver-search-advisor-baseline-20261127.json')??previousDatedOwnerReport;
const supplied=process.env.NAVER_SEARCHADVISOR_SNAPSHOT_FILE
 ?JSON.parse(fs.readFileSync(process.env.NAVER_SEARCHADVISOR_SNAPSHOT_FILE,'utf8'))
 :baseline.latestOfficialSnapshot??fromDatedOwnerReport(datedOwnerReport);
const previous=fromDatedOwnerReport(previousDatedOwnerReport);
const comparisonBaseline=previous&&supplied?.observedAt>previous.observedAt?{...baseline,officialIndexBaseline:{indexed:previous.indexed,collectionLimited:previous.collectionLimited,excluded:previous.excluded,observedAt:previous.observedAt}}:baseline;
const official=compareOfficial(comparisonBaseline,supplied);
const recentSearchBase=previous&&supplied?.search?.updatedAt>previous.search.updatedAt?{source:'Previous dated owner report',period:previous.search.period,last_updated:previous.search.updatedAt,totals:{clicks:previous.search.clicks,impressions_approx:previous.search.impressions,ctr_percent:previous.search.displayedAverageCtrPercent}}:searchBase;
const search=searchComparison(recentSearchBase,supplied);
const technical=optional('seo-priority-live-report.json')?.summary??null;
const quality=optional('ai-index-quality-review.json')?.totals??null;
const report={generatedAt:new Date().toISOString(),site:baseline.site,
 scope:'OFFICIAL owner-reported data vs independent crawl and content tests',
 official,search,technical,quality,
 interpretation:'Official indexed count is only from the authenticated Search Advisor Site Diagnosis; unavailable current value means NO index-growth claim. Synthetic Yeti, sitemap and quality counts are NOT the official index count.',
 dataLag:'Naver Search Advisor exposure/click reports can lag by approximately one week; compare aligned windows and do not equate clicks with calls.',
 actionPriority:technical&&(
  technical.collectionLimitations>0||technical.excludedOrCanonical>0||
  technical.siteMapProblems>0||technical.sourceOrCrawlerProblems>0
 )?'REPAIR_TECHNICAL_CRAWL_ERRORS':official.current?.indexed===14?'TRACE_ACTUAL_YETI_DISCOVERY_AND_OWNER_URL_INSPECTION__INDEX_GROWTH_UNPROVEN':'REVIEW_DUPLICATE_AND_THIN_PRIORITY_REGION_CONTENT__VERIFY_OFFICIAL_DIAGNOSIS'
};
const safe=x=>x===null||x===undefined?'미확인':String(x);
const md=[
 '# 네이버 공식 색인·검색 성과표 (실제 측정과 자동 테스트 분리)',
 '',
 '- 생성: '+report.generatedAt,
 '- 웹사이트: '+baseline.site,
 '- 현재 최신 공식 진단: '+(official.current?'사이트 소유자 보고 '+official.current.observedAt:'미제공 — 증감 산정 금지'),
 '- 검색 노출/클릭 업데이트: '+safe(search.current?.updatedAt),
 '',
 '| 지표 | 기존 공식 또는 사용자 제공 기준 | 최신 확인값 | 변화 |',
 '|---|---:|---:|---:|',
 '| 정상 색인 | '+safe(official.baseline.indexed)+' | '+safe(official.current?.indexed)+' | '+safe(official.indexDelta)+' |',
 '| 수집제한 | '+safe(official.baseline.collectionLimited)+' | '+safe(official.current?.collectionLimited)+' | '+safe(official.collectionLimitedDelta)+' |',
 '| 색인제외 | '+safe(official.baseline.excluded)+' | '+safe(official.current?.excluded)+' | '+safe(official.excludedDelta)+' |',
 '| 검색 클릭 (30일) | '+safe(search.baseline.clicks)+' | '+(search.current?.approximate?'약 ':'')+safe(search.current?.clicks)+' | '+safe(search.clickDelta)+' |',
 '| 노출 (30일·기준 근사치) | 약 '+safe(search.baseline.impressionsApprox)+' | '+(search.current?.approximate?'약 ':'')+safe(search.current?.impressions)+' | '+safe(search.impressionsDeltaApprox)+' |',
 '| CTR (30일) | '+safe(search.baseline.ctrPercent)+'% | '+safe(search.current?.ctrPercent)+'% | '+(search.ctrDeltaPercentagePoints===undefined?'미확인':safe(search.ctrDeltaPercentagePoints))+'%p |',
 '',
 '**출처 제한:** URL TOP 표의 14개 표시 행은 공식 색인 14개라는 뜻이 아닙니다. 날짜가 확인되지 않은 과거 색인 주장도 공식 비교값에서 제외합니다. 클릭·노출 기준은 '+search.baseline.date+'의 사용자 제공 자료. 검색 클릭은 전화 상담 수가 아닙니다.',
 '',
 '## 실제 서버 자동 검사 (공식 색인 통계 아님)',
 '',
 technical?'검사 URL '+safe(technical.checkedPages)+', 정상 '+safe(technical.cleanPages)+', 8개 사이트맵 중 운영 '+safe(technical.liveSitemaps)+', 수집제한 '+safe(technical.collectionLimitations)+', canonical/색인 차단 '+safe(technical.excludedOrCanonical)+'.':'운영 서버 검사 자료 없음 — 공식 색인 증가로 간주 금지.',
 quality?'지역 서비스 항목 '+safe(quality.reviewed)+', 추가 검토 '+safe(quality.needsReview)+', 이 기준 통과 '+safe(quality.fullyPassing)+'.':'지역 고유 콘텐츠 품질 자료 없음.',
 '',
 '## 판정',
 '',
 '- 공식 색인: **'+official.status+'**',
 '- 검색 클릭·노출: **'+search.status+'**',
 '- 개선 우선순위: **'+report.actionPriority+'**',
 '- 새 페이지 양산·허위 후기·반복 수집 요청으로 지표를 부풀리지 않습니다.',
 '- 네이버 서치어드바이저 > 사이트 진단의 실제 색인·수집제한·색인제외와 노출/클릭 리포트가 추가돼야 수치를 갱신할 수 있습니다.',
 ''
].join('\n');
fs.writeFileSync(path.join(root,'naver-official-scorecard.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(root,'naver-official-scorecard.md'),md);
console.log(JSON.stringify({officialStatus:official.status,baselineIndexed:official.baseline.indexed,currentIndexed:official.current?.indexed??null,indexDelta:official.indexDelta,searchStatus:search.status,technicalSample:technical?.checkedPages??null,qualityPending:quality?.needsReview??null}));
