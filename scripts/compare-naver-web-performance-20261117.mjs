// Read-only scoring of owner-authenticated Naver Web Search CTR reports.
// Never queries Naver, guesses metrics, pairs Top 30 queries with URLs, or proves causation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baselineFile=path.join(ROOT,'data/naver-web-ctr-focused-cohort-20261117.json');
const isCount=n=>Number.isSafeInteger(n)&&n>=0;
const pct=n=>Math.round(n*100)/100;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
function validDate(s){return typeof s==='string'&&dateRe.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));}
export function normalizeOfficialSnapshot(s){
 if(!s||s.sourceType!=='owner_reported_naver_searchadvisor')throw Error('Only owner-authenticated Naver Search Advisor report transcriptions are accepted');
 if(s.scope!=='WEB_SEARCH_ONLY')throw Error('Naver VIEW/blog/ad results must not be mixed with Web Search');
 if(!validDate(s.dataUpdatedAt))throw Error('Naver report update date required');
 if(!['최근 30일','최근 7일','최근 60일','최근 90일','최근 1일'].includes(s.window))throw Error('Naver supported report period required');
 if(!['PC+모바일','PC','모바일'].includes(s.device))throw Error('Naver device filter required');
 if(!Array.isArray(s.pages))throw Error('Explicit URL top table rows required; missing URLs are unknown, not zero');
 if(s.urlTableDisplayedRows!==undefined&&(!isCount(s.urlTableDisplayedRows)||s.urlTableDisplayedRows<s.pages.length||s.urlTableDisplayedRows>30))
  throw Error('Displayed URL table row count must be bounded by 30');
 if(s.keywordTableTopRows!==undefined&&(!isCount(s.keywordTableTopRows)||s.keywordTableTopRows>30))
  throw Error('Keyword top table is a separate Top 30 list');
 const seen=new Set();
 for(const page of s.pages){
  if(typeof page.url!=='string'||!page.url.startsWith('/')||page.url.startsWith('//')||page.url.includes('?'))throw Error('A unique exact site-relative canonical URL is required');
  if(seen.has(page.url))throw Error('Duplicate URL row: '+page.url);
  seen.add(page.url);
  if(!isCount(page.impressions)||!isCount(page.clicks)||page.clicks>page.impressions)throw Error('Both observed Naver clicks and impressions are required per reported URL');
  if(page.averagePosition!==undefined&&page.averagePosition!==null)throw Error('No authenticated average-rank source is available in this report');
  if(page.queryUrlPairs!==undefined&&page.queryUrlPairs.length)throw Error('Naver separate URL and keyword Top 30 lists do not establish URL-query pairs');
 }
 if(s.totals!==undefined&&s.totals!==null){
  if(!isCount(s.totals.clicks)||!isCount(s.totals.impressions)||s.totals.clicks>s.totals.impressions)
   throw Error('Site totals must use official numeric clicks and impressions, not approximations');
 }
 return s;
}
function roundDelta(a,b){return Math.round((a-b)*100)/100;}
export function compareOfficialWeb(baseline,latest){
 if(!baseline?.report||!Array.isArray(baseline.pages))throw Error('Missing owner report cohort baseline');
 const baselineScope={updatedAt:baseline.report.dataUpdatedAt,window:baseline.report.window,device:baseline.report.device,
  displayedUrls:baseline.report.urlTableDisplayedRows,topQueries:baseline.report.keywordTableTopLimit};
 const rows=baseline.pages.map(p=>({url:p.url,reference:p.reference,latest:null,impressionsDelta:null,clicksDelta:null,ctrDeltaPercentagePoints:null,status:'NO_NEW_OFFICIAL_DATA'}));
 if(!latest)return {source:'OWNER_REPORTED_NAVER_WEB_SEARCH',baseline:baselineScope,latest:null,status:'UNVERIFIED_NO_LATER_OWNER_REPORT',rows,
   ranking:null,queryUrlPairs:null,indexedPages:null,performanceGainVerified:false};
 const current=normalizeOfficialSnapshot(latest);
 const comparable=current.dataUpdatedAt>baselineScope.updatedAt&&current.window===baselineScope.window&&current.device===baselineScope.device;
 if(!comparable)return {source:'OWNER_REPORTED_NAVER_WEB_SEARCH',baseline:baselineScope,
  latest:{updatedAt:current.dataUpdatedAt,window:current.window,device:current.device},
  status:'INCOMPARABLE_REPORT_DATE_WINDOW_OR_DEVICE',rows:rows.map(x=>({...x,status:'INCOMPARABLE'})),
  ranking:null,queryUrlPairs:null,indexedPages:null,performanceGainVerified:false};
 const byUrl=new Map(current.pages.map(p=>[p.url,p]));
 const compared=rows.map(row=>{
  const obs=byUrl.get(row.url);
  if(!obs)return {...row,status:'NOT_IN_REPORTED_URL_TOP_LIST'};
  const reference=row.reference;
  if(reference.reportDate!==baselineScope.updatedAt||reference.period!==baselineScope.window||reference.device!==baselineScope.device)
   return {...row,status:'INCOMPARABLE_URL_BASELINE',latest:{clicks:obs.clicks,impressions:obs.impressions,ctrPercent:pct(100*obs.clicks/obs.impressions)||0}};
  const latestCtr=obs.impressions? pct(100*obs.clicks/obs.impressions):null;
  return {...row,latest:{clicks:obs.clicks,impressions:obs.impressions,ctrPercent:latestCtr},
   impressionsDelta:isCount(reference.impressions)?obs.impressions-reference.impressions:null,
   clicksDelta:isCount(reference.clicks)?obs.clicks-reference.clicks:null,
   ctrDeltaPercentagePoints:typeof reference.ctrPercent==='number'&&latestCtr!==null?roundDelta(latestCtr,reference.ctrPercent):null,
   status:reference.clicks===null?'CTR_AND_IMPRESSIONS_TREND_ONLY_NO_CLICK_BASELINE':'COMPARABLE_ROLLING_TREND_NOT_CAUSAL'};
 });
 const complete=compared.filter(x=>x.status==='COMPARABLE_ROLLING_TREND_NOT_CAUSAL');
 // "Verified improvement" requires a non-overlapping source-backed before+after,
 // exact baseline clicks, and all three metrics; those requirements are not met here.
 return {source:'OWNER_REPORTED_NAVER_WEB_SEARCH',baseline:baselineScope,latest:{
   updatedAt:current.dataUpdatedAt,window:current.window,device:current.device,
   displayedUrls:current.urlTableDisplayedRows??null,totals:current.totals??null},
   status:'DESCRIPTIVE_ROLLING_REPORT_NOT_CAUSAL',rows:compared,
   overlapWarning:'Recent 30-day windows may overlap; Naver reports have a publication lag. Title/content changes cannot be attributed causally from these observations alone.',
   fullMetricsAvailableForRows:complete.length,ranking:null,queryUrlPairs:null,indexedPages:null,performanceGainVerified:false};
}
export function formatMarkdown(result){
 const lines=['# 네이버 웹 검색 공식 노출·클릭·CTR 기준표','',
  '- 출처: 사용자 소유인증 네이버 서치어드바이저 결과(직접 로그인 접근 아님)',
  '- 기준: '+result.baseline.updatedAt+' / '+result.baseline.window+' / '+result.baseline.device,
  '- 판정: **'+result.status+'** (색인·순위·성과 증가 인증 아님)',
  '- 표에 나온 URL '+result.baseline.displayedUrls+'개는 전체 네이버 색인 문서 수가 아닙니다.',
  '','| 기존 URL | 기준 노출 | 기준 CTR | 새 클릭 | 새 노출 | 새 CTR | 노출 증감 | CTR 변화(pp) | 상태 |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---|'];
 for(const p of result.rows)lines.push('| '+p.url+' | '+(p.reference.impressions??'미확인')+' | '+(p.reference.ctrPercent??'미확인')+'% | '+(p.latest?.clicks??'미확인')+' | '+(p.latest?.impressions??'미확인')+' | '+(p.latest?.ctrPercent===null||p.latest?.ctrPercent===undefined?'미확인':p.latest.ctrPercent+'%')+' | '+(p.impressionsDelta??'미확인')+' | '+(p.ctrDeltaPercentagePoints??'미확인')+' | '+p.status+' |');
 lines.push('','- 검색어 TOP 30과 URL TOP 목록은 **별도 표**입니다. URL×검색어 연결·평균순위는 추정하지 않습니다.');
 return lines.join('\n')+'\n';
}
const main=async()=>{
 const args=process.argv.slice(2),idx=args.indexOf('--latest');
 if(args.some(a=>a!=='--latest'&&(!idx||a!==args[idx+1]))||idx>=0&&!args[idx+1])throw Error('Usage: node scripts/compare-naver-web-performance-20261117.mjs [--latest ./path-to-owner-official-report.json]');
 const latest=idx<0?null:JSON.parse(fs.readFileSync(path.resolve(process.cwd(),args[idx+1]),'utf8'));
 const result=compareOfficialWeb(JSON.parse(fs.readFileSync(baselineFile,'utf8')),latest);
 const report=formatMarkdown(result);
 process.stdout.write(report);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1});
