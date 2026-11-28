import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareOfficial,searchComparison,delta,fromDatedOwnerReport} from '../scripts/report-naver-official-scorecard.mjs';
const baseline={officialIndexBaseline:{indexed:14,collectionLimited:1,excluded:0,observedAt:'2026-11-05'}};
const searchBase={source:'owner',period:'최근 30일',last_updated:'2026-11-05',totals:{clicks:69,impressions_approx:1800,ctr_percent:3.8}};
test('no current owner data means no invented Naver index gains',()=>{
 const result=compareOfficial(baseline,null);
 assert.equal(result.baseline.indexed,14);
 assert.equal(result.current,null);
 assert.equal(result.indexDelta,null);
 assert.equal(result.status,'UNVERIFIED_NO_CURRENT_OFFICIAL_DATA');
 assert.equal(searchComparison(searchBase,null).clickDelta,null);
 assert.equal(delta(undefined,14),null);
});
test('compare owner-reported index, limited and excluded counts independently',()=>{
 const r=compareOfficial(baseline,{sourceType:'owner_reported_naver_searchadvisor',observedAt:'2026-11-16',indexed:18,collectionLimited:0,excluded:1});
 assert.equal(r.indexDelta,4);
 assert.equal(r.collectionLimitedDelta,-1);
 assert.equal(r.excludedDelta,1);
 assert.equal(r.status,'OFFICIAL_INCREASE');
});
test('same report windows and dated provenance are mandatory',()=>{
 assert.throws(()=>compareOfficial(baseline,{indexed:2000,collectionLimited:0,excluded:0,observedAt:'2026-11-16'}));
 assert.equal(searchComparison(searchBase,{search:{period:'최근 7일',updatedAt:'2026-11-16',clicks:83,impressions:2000}}).status,'UNVERIFIED_OR_INCOMPARABLE_WINDOW');
 assert.equal(searchComparison(searchBase,{search:{period:'최근 30일',updatedAt:'2026-11-16',clicks:83,impressions:2000}}).clickDelta,14);
});

test('undated official historical index cannot prove an increase even with new owner figures',()=>{
 const unknownDate={officialIndexBaseline:{indexed:14,collectionLimited:1,excluded:0,observedAt:null}};
 const result=compareOfficial(unknownDate,{sourceType:'owner_reported_naver_searchadvisor',observedAt:'2026-11-17',indexed:22,collectionLimited:0,excluded:0});
 assert.equal(result.current.indexed,22);
 assert.equal(result.indexDelta,null);
 assert.equal(result.collectionLimitedDelta,null);
 assert.equal(result.status,'UNVERIFIED_HISTORICAL_BASELINE_DATE');
});
test('CTR is computed only from authenticated later period totals, not presumed Naver growth',()=>{
 const missing=searchComparison(searchBase,null);
 assert.equal(missing.current,null);
 assert.equal(missing.ctrDeltaPercentagePoints,undefined);
 const compared=searchComparison(searchBase,{search:{period:'최근 30일',updatedAt:'2026-11-17',clicks:83,impressions:2000}});
 assert.equal(compared.current.ctrPercent,4.15);
 assert.equal(compared.ctrDeltaPercentagePoints,0.35);
 assert.match(compared.dataWindowCaution,/rolling recent-30-day windows can overlap/);
});

test('full sitemap audit separates the 10k first milestone from technical URL counts',()=>{
 const source=readFileSync(new URL('../scripts/audit-all-meta-jsonld.mjs',import.meta.url),'utf8');
 assert.match(source,/firstNaverIndexMilestoneTarget:10000/);
 assert.match(source,/longTermNaverIndexTargetRange:\[50000,100000\]/);
 assert.match(source,/naverIndexed:null/);
 assert.match(source,/First Naver confirmed-index milestone target: 10,000/);
 assert.doesNotMatch(source,/targetNaverIndexed|technicalGapTo50000|Technical pool gap/);
 assert.match(source,/duplicate_meta_description_across_urls/);
 assert.match(source,/descriptionDuplicateGroups/);
 assert.match(source,/descriptionMultipleTags/);
});

test('dated Nov 25 owner diagnosis feeds actual scorecard, preserves displayed CTR and approximate totals',()=>{
 const s=JSON.parse(readFileSync(new URL('../data/naver-search-advisor-baseline-20261125.json',import.meta.url),'utf8'));
 const x=fromDatedOwnerReport(s);
 assert.deepEqual([x.indexed,x.collectionLimited,x.excluded,x.seoIssues],[14,0,0,0]);
 assert.equal(x.observedAt,'2026-11-25');
 assert.equal(x.crawl.completed,null);
 assert.equal(searchComparison(searchBase,x).current.ctrPercent,2.2);
 assert.equal(searchComparison(searchBase,x).current.approximate,true);
 assert.equal(compareOfficial({officialIndexBaseline:{indexed:null,observedAt:null}},x).indexDelta,null);
});

test('Nov 27 search and Nov 26 diagnosis retain independent dates and unchanged 14 indexed',()=>{
 const prior=fromDatedOwnerReport(JSON.parse(readFileSync(new URL('../data/naver-search-advisor-baseline-20261125.json',import.meta.url),'utf8')));
 const raw=JSON.parse(readFileSync(new URL('../data/naver-search-advisor-baseline-20261127.json',import.meta.url),'utf8'));
 const current=fromDatedOwnerReport(raw);
 assert.equal(current.observedAt,'2026-11-26');
 assert.equal(current.search.updatedAt,'2026-11-27');
 assert.equal(current.crawl.updatedAt,'2026-11-28');
 assert.equal(current.crawl.completed,null);
 const result=compareOfficial({officialIndexBaseline:prior},current);
 assert.equal(result.status,'OFFICIAL_UNCHANGED');
 assert.equal(result.indexDelta,0);
 const comparison=searchComparison({period:prior.search.period,last_updated:prior.search.updatedAt,totals:{clicks:150,impressions_approx:6700,ctr_percent:2.2}},current);
 assert.equal(comparison.impressionsDeltaApprox,800);
 assert.equal(comparison.clickDelta,0);
 assert.equal(comparison.ctrDeltaPercentagePoints,-0.2);
 assert.equal(raw.topDocuments.find(x=>x.path==='/daeri/gangwon/gangreung-si/').impressions,2184);
 assert.throws(()=>fromDatedOwnerReport({...raw,diagnosis:{...raw.diagnosis,updatedAt:'2026-11-29'}}));
});
