'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
test('Cloudtype release verification checks real live app even after failed automatic deploy',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/cloudtype-freshness.yml'),'utf8');
 assert(workflow.includes('Check the REAL Cloudtype server (not the Pages backup)'));
 assert(workflow.includes('Report automatic deploy status and independently verify manual releases'));
 assert(!workflow.includes('Require successful Cloudtype deployment before comparing hashes'));
 assert(!workflow.includes('No production redeploy was requested'));
 assert(workflow.includes('run: node tools/check_cloudtype_freshness.js'));
 assert(workflow.includes("if: github.event_name == 'workflow_run'"));
});
