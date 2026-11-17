import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {compareOfficialWeb,formatMarkdown,normalizeOfficialSnapshot} from '../scripts/compare-naver-web-performance-20261117.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=JSON.parse(fs.readFileSync(path.join(root,'data/naver-web-ctr-focused-cohort-20261117.json'),'utf8'));
const report=(overrides={})=>({
 sourceType:'owner_reported_naver_searchadvisor',scope:'WEB_SEARCH_ONLY',
 dataUpdatedAt:'2026-12-24',window:'최근 30일',device:'PC+모바일',
 urlTableDisplayedRows:14,keywordTableTopRows:30,
 pages:[
  {url:'/taksong/',clicks:8,impressions:320},
  {url:'/service/taksong/',clicks:5,impressions:220},
  {url:'/daeri/gangwon/gangreung-si/',clicks:2,impressions:180}
 ],...overrides
});
test('official Naver Nov 16 PC+Mobile top URL 14 rows are NOT 14 indexed pages',()=>{
 assert.equal(base.report.dataUpdatedAt,'2026-11-16');
 assert.equal(base.report.window,'최근 30일');
 assert.equal(base.report.device,'PC+모바일');
 assert.equal(base.report.urlTableDisplayedRows,14);
 assert.equal(base.report.keywordTableTopLimit,30);
 assert.match(base.report.note,/not number of URLs indexed/i);
 const a=base.pages.find(p=>p.url==='/taksong/');
 const b=base.pages.find(p=>p.url==='/service/taksong/');
 assert.deepEqual([a.reference.impressions,b.reference.impressions],[308,253]);
 assert.deepEqual([a.reference.ctrPercent,b.reference.ctrPercent],[1.6,1.6]);
 assert.deepEqual([a.reference.clicks,b.reference.clicks],[null,null]);
});
test('no new authenticated Naver report means no claimed gains or made-up clicks',()=>{
 const result=compareOfficialWeb(base,null);
 assert.equal(result.status,'UNVERIFIED_NO_LATER_OWNER_REPORT');
 assert.equal(result.performanceGainVerified,false);
 assert.deepEqual(result.rows.map(p=>p.latest),[null,null,null]);
 assert.equal(result.ranking,null);
 assert.equal(result.queryUrlPairs,null);
 assert.equal(result.indexedPages,null);
 const md=formatMarkdown(result);
 assert.match(md,/미확인/);
 assert.match(md,/NO_NEW_OFFICIAL_DATA/);
});
test('with a later compatible owner report, show observed impressions and CTR but not invented baseline clicks',()=>{
 const result=compareOfficialWeb(base,report());
 assert.equal(result.status,'DESCRIPTIVE_ROLLING_REPORT_NOT_CAUSAL');
 const a=result.rows[0],b=result.rows[1],gang=result.rows[2];
 assert.equal(a.impressionsDelta,12);
 assert.equal(a.latest.clicks,8);
 assert.equal(a.latest.ctrPercent,2.5);
 assert.equal(a.ctrDeltaPercentagePoints,0.9);
 assert.equal(a.clicksDelta,null);
 assert.equal(a.status,'CTR_AND_IMPRESSIONS_TREND_ONLY_NO_CLICK_BASELINE');
 assert.equal(b.impressionsDelta,-33);
 assert.equal(b.latest.ctrPercent,2.27);
 assert.equal(b.ctrDeltaPercentagePoints,0.67);
 assert.equal(gang.status,'INCOMPARABLE_URL_BASELINE','Nov 05 Gangneung cannot be compared as Nov 16');
 assert.equal(gang.clicksDelta,null);
 assert.equal(result.fullMetricsAvailableForRows,0);
 assert.equal(result.performanceGainVerified,false);
 assert.equal(result.queryUrlPairs,null);
});
test('later report with different time period or device cannot be falsely compared',()=>{
 for(const input of [report({window:'최근 7일'}),report({device:'모바일'}),report({dataUpdatedAt:'2026-11-16'}),report({dataUpdatedAt:'2026-11-15'})]){
  const r=compareOfficialWeb(base,input);
  assert.equal(r.status,'INCOMPARABLE_REPORT_DATE_WINDOW_OR_DEVICE');
  assert.equal(r.rows[0].impressionsDelta,null);
  assert.equal(r.performanceGainVerified,false);
 }
});
test('missing pages in TOP list are unknown rather than zero',()=>{
 const r=compareOfficialWeb(base,report({pages:[{url:'/taksong/',clicks:4,impressions:180}]}));
 assert.equal(r.rows[1].status,'NOT_IN_REPORTED_URL_TOP_LIST');
 assert.equal(r.rows[1].latest,null);
 assert.equal(r.rows[1].clicksDelta,null);
});
test('reject inferred rankings, query-url joins, non-owner sources or unusable counts',()=>{
 const wrong=[
  report({sourceType:'web_crawler'}),
  report({scope:'VIEW_BLOG'}),
  report({dataUpdatedAt:'unknown'}),
  report({pages:[{url:'/taksong/',clicks:5,impressions:null}]}),
  report({pages:[{url:'/taksong/',clicks:7,impressions:6}]}),
  report({pages:[{url:'/taksong/',clicks:6,impressions:180,averagePosition:3}]}),
  report({pages:[{url:'/taksong/',clicks:6,impressions:180,queryUrlPairs:[{query:'탁송',clicks:6}]}]}),
  report({urlTableDisplayedRows:31})
 ];
 for(const x of wrong)assert.throws(()=>normalizeOfficialSnapshot(x));
});
test('read-only CLI returns an honest no-new-data scorecard without using Naver login',()=>{
 const p=spawnSync(process.execPath,['scripts/compare-naver-web-performance-20261117.mjs'],{cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/UNVERIFIED_NO_LATER_OWNER_REPORT/);
 assert.match(p.stdout,/\/taksong\//);
 assert.doesNotMatch(p.stdout,/OFFICIAL_INCREASE/);
});
