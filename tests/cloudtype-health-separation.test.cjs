'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const flow=fs.readFileSync(path.join(__dirname,'../.github/workflows/cloudtype-health.yml'),'utf8');
test('website checks remain independent and cannot consume live customer routing quota',()=>{
 assert(flow.includes('Check Cloudtype production routes independently of GitHub Pages'));
 assert(flow.includes('Check Naver crawler access to previously restricted URLs'));
 assert(!flow.includes('white-voice-6eab.k337711.workers.dev'));
 assert(!flow.includes('road-distance-provider:'));
 assert(!flow.includes('Verify real driving-distance API response'));
 assert(flow.includes('road-distance-mock:'));
 assert(flow.includes('node --test tests/road-provider-outage-20261121.test.cjs'));
});
