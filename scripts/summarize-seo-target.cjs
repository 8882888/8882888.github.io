'use strict';
const fs=require('node:fs');
const file=process.argv[2]||'indexability-report.json';
const report=JSON.parse(fs.readFileSync(file,'utf8'));
const findings=report.issues||[];
const blocked=new Set(findings.map(item=>item.url));
const target=45000;
const total=Number(report.urls)||0;
const summary={
 checkedAt:report.checkedAt,
 targetIndexedUrls:target,
 auditedSitemapUrls:total,
 urlsWithFindings:blocked.size,
 urlsWithoutReportedFindings:Math.max(0,total-blocked.size),
 sitemapUrlGapToTarget:Math.max(0,target-total),
 naverIndexedUrls:null,
 naverIndexingTargetVerified:false,
 localitySummary:report.localitySummary||{},
 note:'Sitemap URLs and HTTP checks do not measure Naver indexing or search position.'
};
fs.writeFileSync('seo-target-progress.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
