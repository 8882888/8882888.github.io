// Compare ONLY two user-authenticated Naver Search Advisor numeric snapshots.
// Arithmetic on official transcriptions is not proof of ranking or causation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const VALID_DEVICES=new Set(['PC+모바일','PC','모바일']);
const ISO=/^\d{4}-\d{2}-\d{2}$/;
const validDate=s=>typeof s==='string'&&ISO.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const time=s=>Date.parse(s+'T00:00:00Z');
const count=n=>Number.isSafeInteger(n)&&n>=0;
const precision=n=>Math.round((n+Number.EPSILON)*100)/100;
const ctr=(c,i)=>i>0?precision(c/i*100):null;
const delta=(a,b)=>typeof a==='number'&&typeof b==='number'?a-b:null;
function reqDate(s,name){if(!validDate(s))throw Error(name+' must be a valid ISO date');}
function reqCount(n,name){if(!count(n))throw Error(name+' must be an exact nonnegative integer');}
export function validateOwnerKpis(s){
 if(!s||s.sourceType!=='owner_reported_naver_searchadvisor'||s.site!=='https://jeongukdaeri.kr')
  throw Error('Use only owner-transcribed Search Advisor results for exact jeongukdaeri.kr');
 if(!s.search||s.search.scope!=='WEB_SEARCH_ONLY')throw Error('Only Naver Web Search summary, excluding VIEW/blog/ads');
 const a=s.search;
 for(const key of ['updatedAt','periodStart','periodEnd'])reqDate(a[key],key);
 if(time(a.periodStart)>time(a.periodEnd)||time(a.periodEnd)>time(a.updatedAt))throw Error('Invalid Naver report period dates');
 if(!VALID_DEVICES.has(a.device))throw Error('Naver device filter is required');
 reqCount(a.clicks,'clicks');reqCount(a.impressions,'impressions');
 if(a.clicks>a.impressions)throw Error('Naver clicks cannot exceed impressions in this report');
 if(s.index!==null&&s.index!==undefined){
  reqDate(s.index.observedAt,'index.observedAt');
  reqCount(s.index.indexed,'index.indexed');
  if(s.index.collectionLimited!==undefined&&s.index.collectionLimited!==null)reqCount(s.index.collectionLimited,'index.collectionLimited');
  if(s.index.excluded!==undefined&&s.index.excluded!==null)reqCount(s.index.excluded,'index.excluded');
 }
 if(a.ctrPercent!==undefined&&a.ctrPercent!==null){
  if(typeof a.ctrPercent!=='number'||a.ctrPercent<0||a.ctrPercent>100)throw Error('CTR invalid');
  // Naver UI CTR rounding may be less precise than click/impression ratio.
  if(Math.abs(a.ctrPercent-a.clicks/Math.max(1,a.impressions)*100)>0.11)
   throw Error('CTR inconsistent with exact official clicks/impressions');
 }
 return s;
}
export function compareFourOfficialKpis(before,after){
 if(!before||!after)return {status:'NO_VERIFIED_OWNER_REPORT_PAIR',
  metrics:{indexed:{before:null,after:null,delta:null},impressions:{before:null,after:null,delta:null},
    clicks:{before:null,after:null,delta:null},ctrPercent:{before:null,after:null,deltaPercentagePoints:null}},
  overlap:null,comparison:null,interpretation:'No exact owner-authenticated two-period values; unverified is NOT zero.'};
 const b=validateOwnerKpis(before),a=validateOwnerKpis(after);
 const bb=b.search,aa=a.search;
 const bDays=(time(bb.periodEnd)-time(bb.periodStart))/86400000+1;
 const aDays=(time(aa.periodEnd)-time(aa.periodStart))/86400000+1;
 if(bb.device!==aa.device||bDays!==aDays||time(aa.periodEnd)<=time(bb.periodEnd))
  return {status:'INCOMPARABLE_SEARCH_DEVICE_PERIOD_OR_CHRONOLOGY',
   metrics:{indexed:{before:null,after:null,delta:null},impressions:{before:null,after:null,delta:null},
    clicks:{before:null,after:null,delta:null},ctrPercent:{before:null,after:null,deltaPercentagePoints:null}},
   overlap:null,comparison:null,interpretation:'Do not compare a different device, duration, or older date.'};
 const oldCtr=ctr(bb.clicks,bb.impressions),newCtr=ctr(aa.clicks,aa.impressions);
 const overlap=time(aa.periodStart)<=time(bb.periodEnd);
 const indexComparable=Boolean(b.index&&a.index&&time(a.index.observedAt)>time(b.index.observedAt));
 const indexed={before:b.index?.indexed??null,after:a.index?.indexed??null,delta:indexComparable?delta(a.index.indexed,b.index.indexed):null};
 const impressions={before:bb.impressions,after:aa.impressions,delta:aa.impressions-bb.impressions};
 const clicks={before:bb.clicks,after:aa.clicks,delta:aa.clicks-bb.clicks};
 const ctrPercent={before:oldCtr,after:newCtr,deltaPercentagePoints:oldCtr===null||newCtr===null?null:precision((aa.clicks/aa.impressions-bb.clicks/bb.impressions)*100)};
 const metrics={indexed,impressions,clicks,ctrPercent};
 return {status:overlap?'EXACT_ARITHMETIC_OVERLAPPING_WINDOWS_NOT_ATTRIBUTABLE':'EXACT_ARITHMETIC_NONOVERLAPPING_WINDOWS_NOT_ATTRIBUTABLE',
  metrics,overlap,comparison:{device:aa.device,days:aDays,prior:[bb.periodStart,bb.periodEnd],latest:[aa.periodStart,aa.periodEnd],
   priorIndexObservedAt:b.index?.observedAt??null,latestIndexObservedAt:a.index?.observedAt??null},
  interpretation:'Exact observed arithmetic from two owner-transcribed Naver UI screenshots/exports, NOT proof of attribution to code changes, customers or Google indexing.'};
}
export function markdownFourKpis(r){
 const n=x=>x===null||x===undefined?'미확인':String(x);
 const signed=x=>x===null||x===undefined?'미확인':(x>0?'+':'')+x;
 const m=r.metrics;
 return [
 '# 네이버 공식 색인·노출·클릭·CTR 실측 증감',
 '',
 '- 판정: **'+r.status+'**',
 '- 실제 검증 출처: 소유자 서치어드바이저 인증 화면에서 전사한 두 시점의 수치만 사용',
 '- 주의: URL TOP 표 행 수는 사이트 색인 수가 아닙니다.',
 '',
 '| 지표 | 이전 | 최신 | 실제 변화 |',
 '|---|---:|---:|---:|',
 '| 색인 건수 | '+n(m.indexed.before)+' | '+n(m.indexed.after)+' | '+signed(m.indexed.delta)+'건 |',
 '| 노출수 | '+n(m.impressions.before)+' | '+n(m.impressions.after)+' | '+signed(m.impressions.delta)+'회 |',
 '| 클릭수 | '+n(m.clicks.before)+' | '+n(m.clicks.after)+' | '+signed(m.clicks.delta)+'회 |',
 '| CTR | '+n(m.ctrPercent.before)+(m.ctrPercent.before===null?'':'%')+' | '+n(m.ctrPercent.after)+(m.ctrPercent.after===null?'':'%')+' | '+signed(m.ctrPercent.deltaPercentagePoints)+'%p |',
 '',
 r.comparison?'- 비교 구간: '+r.comparison.prior.join(' ~ ')+' → '+r.comparison.latest.join(' ~ ')+' ('+r.comparison.device+')':'- 비교 가능한 기간·기기 정보가 없습니다.',
 r.overlap?'- **주의: 최근 30일 구간이 서로 겹칩니다.** 변화 수치 자체는 산술적으로 정확하지만 신규 SEO 수정의 효과로 귀속시킬 수 없습니다.':'- 기간의 비중첩 여부만으로도 SEO 수정의 인과효과가 입증되지는 않습니다.',
 '- '+r.interpretation,
 ''
 ].join('\n');
}
async function main(){
 const args=process.argv.slice(2);
 if(args.length===0){
  const r=compareFourOfficialKpis(null,null);
  process.stdout.write(markdownFourKpis(r));
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdownFourKpis(r));
  return;
 }
 if(args.length!==4||args[0]!=='--before'||args[2]!=='--after')
  throw Error('Usage: node scripts/measure-naver-four-official-kpis-20261118.mjs --before ./owner-before.json --after ./owner-after.json');
 const read=p=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8'));
 const r=compareFourOfficialKpis(read(args[1]),read(args[3]));
 const md=markdownFourKpis(r);
 process.stdout.write(md);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{console.error(err.message);process.exitCode=1});
