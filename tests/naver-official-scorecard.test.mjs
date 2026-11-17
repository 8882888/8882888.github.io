import test from 'node:test';
import assert from 'node:assert/strict';
import {compareOfficial,searchComparison,delta} from '../scripts/report-naver-official-scorecard.mjs';
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
