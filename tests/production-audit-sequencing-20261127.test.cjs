'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..','.github','workflows',name),'utf8');
test('release-dependent production hash checks never start from source push or PR',()=>{
 const a=read('official-production-audit.yml');
 assert.match(a,/workflow_run:\s*\n\s*workflows: \['Deploy to Cloudtype'\]/);
 assert.doesNotMatch(a,/\n  push:/);
 assert.match(a,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(a,/github\.event\.workflow_run\.head_sha \|\| github\.sha/);
 assert.match(a,/Compare live Cloudtype deployment with GitHub files\n\s*if: github.event_name != 'pull_request'/);
 assert.match(a,/workflow_dispatch:/);
 assert.match(a,/schedule:/);
 assert.match(a,/exit "\$code"/,'real stale deployment errors remain hard failures');
});
test('exhaustive sitemap audit retains daily/manual scans, strict failures and reduced live load',()=>{
 const b=read('live-sitemap-indexability-audit.yml');
 assert.doesNotMatch(b,/\n  workflow_run:/);
 assert.match(b,/workflow_dispatch:/);
 assert.match(b,/cron: '17 1 \* \* \*'/);
 assert.match(b,/SEO_AUDIT_CONCURRENCY: '1'/);
 assert.match(b,/SEO_AUDIT_PAUSE_MS: '650'/);
 assert.match(b,/steps\.release\.outcome == 'failure' \|\| steps\.audit\.outcome == 'failure'/);
});
