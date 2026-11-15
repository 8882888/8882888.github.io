'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('production sitemap smoke is deployed-commit-aware and runs after Cloudtype succeeds',()=>{
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/smart24-seo-production-check.yml'),'utf8');
 assert.match(workflow,/workflow_run:\s*\n\s*workflows: \[Deploy to Cloudtype\]/);
 assert.match(workflow,/types: \[completed\]/);
 assert.match(workflow,/branches: \[main\]/);
 assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(workflow,/ref: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/);
 assert.match(workflow,/run: python tests\/production-seo-smoke\.py/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/schedule:/);
 assert.doesNotMatch(workflow,/pull_request:/,'Do not audit predeployment PR code as if it is already live');
});
