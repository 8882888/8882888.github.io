'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const flow=fs.readFileSync(path.join(__dirname,'../.github/workflows/cloudtype-health.yml'),'utf8');
const website=flow.split('  production-check:\n')[1]?.split('  road-distance-provider:\n')[0]||'';
const external=flow.split('  road-distance-provider:\n')[1]||'';
test('official website checks must not be marked unhealthy by unrelated external Worker',()=>{
 assert(website.includes('Check Cloudtype production routes independently of GitHub Pages'));
 assert(website.includes('Check Naver crawler access to previously restricted URLs'));
 assert(!website.includes('Verify real driving-distance API response'));
 assert(!website.includes('white-voice-6eab.k337711.workers.dev'));
});
test('external road-distance API remains a blocking independent job, not a hidden warning',()=>{
 assert(external.includes('Verify real driving-distance API response'));
 assert(external.includes('white-voice-6eab.k337711.workers.dev/route'));
 assert(external.includes('Distance API missing positive distanceKm'));
 assert(external.includes('Distance API missing positive durationMinutes'));
 assert(!external.includes('continue-on-error: true'));
 assert(!external.includes('|| true'));
 assert(external.includes("raise\n" )===false);
});
