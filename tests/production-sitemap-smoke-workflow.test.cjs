'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('production sitemap smoke is standalone and avoids deployment-triggered fan-out',()=>{
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/smart24-seo-production-check.yml'),'utf8');
 assert.doesNotMatch(workflow,/workflow_run:/,'Do not fan out another sitemap crawl after every Cloudtype deployment');
 assert.doesNotMatch(workflow,/github\\.event\\.workflow_run/,'Checkout must not depend on an event that no longer triggers this workflow');
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/schedule:/);
 assert.match(workflow,/push:\\s*\\n\\s*branches: \\[main\\]\\s*\\n\\s*paths:\\s*\\n\\s*- 'tests\\/production-seo-smoke\\.py'/);
 assert.match(workflow,/run: python tests\\/production-seo-smoke\\.py/);
 assert.match(workflow,/group: smart24-production-sitemap-smoke/);
 assert.match(workflow,/cancel-in-progress: false/);
 assert.doesNotMatch(workflow,/pull_request:/,'Do not audit predeployment PR code as if it is already live');
 assert.doesNotMatch(workflow,/smart24-seo-production-check\\.yml/,'Workflow-only edits must not trigger another production crawl');
});
