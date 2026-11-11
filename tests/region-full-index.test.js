'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const region=fs.readFileSync(path.join(root,'region/index.html'),'utf8');
const handoff=fs.readFileSync(path.join(root,'go/region-service/index.html'),'utf8');
const deployWorkflow=fs.readFileSync(path.join(root,'.github/workflows/cloudtype-redeploy.yml'),'utf8');
const autoDeployWorkflow=fs.readFileSync(path.join(root,'.github/workflows/deploy-main.yml'),'utf8');
// The automatic deploy covers every main-branch source change, including go/**,
// package.json and package-lock.json. The recovery workflow is manual-only to
// prevent a second deploy request from the same push.
assert(autoDeployWorkflow.includes('on:\n  push:\n    branches:\n      - main'),'automatic Cloudtype deploy must trigger on main pushes');
assert(!autoDeployWorkflow.split('concurrency:')[0].includes('paths:'),'automatic Cloudtype deploy must not omit changed application paths');
assert(deployWorkflow.includes('on:\n  workflow_dispatch:'),'Cloudtype recovery must support manual workflow dispatch');
assert(!/^  push:/m.test(deployWorkflow.split('permissions:')[0]),'manual Cloudtype recovery must not trigger on each push');
for(const workflow of [autoDeployWorkflow,deployWorkflow]){
  assert(workflow.includes('group: cloudtype-production'),'Cloudtype deploy workflows must share one concurrency group');
  assert(workflow.includes('cancel-in-progress: false'),'Cloudtype deploy must never cancel an in-flight release');
}
assert(deployWorkflow.includes('node tests/region-full-index.test.js'),'Cloudtype deploy must run the regional regression test');
assert(deployWorkflow.includes('for service in daeri taksong; do'),'Cloudtype must verify both service-specific live regional handoffs');
assert(deployWorkflow.includes('actual_handoff="$(sha256sum "$handoff_file"'),'Cloudtype must hash the downloaded handoff bytes exactly');
assert(deployWorkflow.includes("grep -qi 'noindex'"),'Cloudtype must check the regional handoff noindex response header');
assert(deployWorkflow.includes("[ \"$redirect\" != '/region/' ]"),'Cloudtype must reject invalid region redirects to unexpected destinations');
assert((handoff.match(/p\.name===region&&\(!parent\|\|p\.parent_name===parent\)&&Array\.isArray\(p\.services\)/g)||[]).length===3,'regional handoff must accept omitted parent consistently across API and fallback validation');
assert(handoff.includes('if(matches.length!==1)'), 'regional handoff must reject ambiguous locality matches');
assert(handoff.includes('if(matches.length===0)'), 'regional handoff must only retry the full index for zero matches, not ambiguous multiple matches');
assert((handoff.match(/fetch\('\/api\/legal-region-index'/g)||[]).length===2,'regional handoff fallback must use accessible complete legal region index');
assert(!handoff.includes("fetch('/data/regions.json'"),'regional handoff must not request blocked historical region seed');
const regionDataset=JSON.parse(fs.readFileSync(path.join(root,'data/regions.json'),'utf8'));
const pilot=regionDataset.regions;
assert(server.includes('const uniqueMatches=[...new Map(matches.map('),'regional confirmed rides must be deduplicated');
assert(server.includes('const reviewCards=uniqueMatches.length?'),'regional review cards must use deduplicated records');
assert(server.includes('uniqueMatches.slice(0,5).map('),'regional review cards must render deduplicated records');
// The committed region seed is deliberately small, but GitHub Pages CI may
// import the official nationwide CSV before this check. Never reject valid
// official input merely because the catalogue grew beyond pilot size.
if(pilot.length>=1000){
 assert.equal(regionDataset.source,'국토교통부_전국 법정동 (공공데이터포털)',
  'Expanded nationwide catalogue must have the official government source');
 assert.equal(regionDataset.source_url,'https://www.data.go.kr/data/15063424/fileData.do',
  'Expanded nationwide catalogue must preserve source provenance');
 assert.ok(new Set(pilot.map(r=>r.slug)).size===pilot.length,
  'Expanded nationwide catalogue must not contain repeated legal-region slugs');
 assert.ok(new Set(pilot.map(r=>r.slug.split('/')[0])).size>=15,
  'Expanded nationwide catalogue must cover most province groups');
} else {
 assert.ok(pilot.length>0,'Committed pilot must be nonempty');
 assert.ok(!regionDataset.source,
  'Small pilot cannot advertise complete official nationwide coverage');
}
assert(server.includes("if(pathname==='/api/legal-region-index')"),'production legal index endpoint missing');
assert(server.includes('level:x.level,services:x.services}));'),'public regional lookup must return service types required by client validation');
assert(server.includes("candidates.length!==1||!(candidates[0].services||[]).includes(kind)"),'dynamic regional landing must reject services unsupported by the selected legal region');
assert(server.includes("if(!['daeri','taksong'].includes(kind)){res.writeHead(302,{location:'/region/'});return res.end()}"),'dynamic handoff must reject missing or invalid service kind rather than default to taksong');
assert(server.includes('regions.map(r=>({name:r.name,parent_name:r.parent_name,level:r.level,services:r.services}))'),'index must use official legal regions');
assert(region.includes("fetchWithTimeout('/api/legal-region-index',8000)"),'region search must use complete production index');
assert(region.includes("data.regions.length<1000)throw Error('Dynamic region index incomplete')"),'undersized dynamic region index must not be represented as complete nationwide coverage');
assert(!region.includes("fetchWithTimeout('/data/regions.json',5000)"),'do not silently use a small pilot index as nationwide coverage');
assert(region.indexOf("fetchWithTimeout('/api/legal-region-index',8000)")<region.indexOf("fetchWithTimeout('/api/legal-region-index',5000)"),'complete production index retry must follow the first attempt');
for(const key of ['설악산탁송','지리산탁송'])assert(region.includes(key),'mountain keyword routing lost: '+key);
const servicePage=fs.readFileSync(path.join(root,'go/region-service/index.html'),'utf8');
assert(servicePage.includes("p.services.includes(kind)"),'verified region service must use exact parent-qualified matches and declared services');
assert(!servicePage.includes("|\\/assets\\/service-(?:daeri|taksong|golf)-visual\\.svg"),'generic service images must not count as verified regional cards');
assert(!servicePage.includes('.replaceAll('),'regional image label matching must support older mobile browsers');
assert(servicePage.includes("tel:18114294"),'regional service landing must retain official consultation number');
assert(servicePage.includes("fare.href='/fare/?service='"),'regional service landing must retain fare lookup');
assert(region.includes("supported.includes('daeri')?'daeri':'daily'"),'daily-only regions must not route to an unsupported proxy driving service');
assert(region.includes("regionName.href=matchedKind==='daily'?"),'daily-only region card must use its supported detail route');
assert(region.includes("link.href=matchedKind==='daily'?"),'daily-only secondary link must use its supported detail route');
assert(!region.includes("if(kind==='daily')return ''"),'explicit region-service keyword must override a stale daily-driver selection');
assert(region.includes("if(kind!==service)type.value=service;"),'explicit region-service keyword must update the service selector');
assert(region.includes("const service=suffix?(suffix.includes('대리운전')?'daeri':'taksong'):type.value;"),'live search must prioritize explicit service suffix over a stale daily-driver filter');
assert(!region.includes("type.value==='daily'?'daily':suffix?"),'daily filter must not suppress explicit region-service search terms');
assert(region.includes("const matchedKind=service==='daily'?'daily':"),'daily-driver filter must take precedence over a region transport capability');
assert(region.includes("matchedKind==='daily'?p.name+' 일일기사 상담"),'daily-driver cards must use service-specific descriptions');
assert(region.includes("if(matchedKind!=='daily'){const fare="),'daily-only cards must not display a vehicle transport fare link');
assert(region.includes("estimate.href=service==='daily'?'/service/daily-driver/'"),'daily-driver zero-results fallback must not point to vehicle transport fares');
assert(region.includes("regionCataloguePartial&&p.parent_name&&p.parent_name!=='대한민국'&&aliases(p.name).includes(place)"),'partial index must not auto-redirect a bare district name as uniquely identified');
assert(region.includes('regionCataloguePartial=!!data.partial'),'static fallback must be marked as partial');
assert(!region.includes("fetchWithTimeout('/data/regions.json',5000)"),'retired pilot fallback must never claim complete legal-region data');
assert(region.includes('검색 결과가 없어도 서비스 지역이 아니라는 뜻은 아닙니다'),'partial search must not falsely imply unsupported service areas');
assert(region.includes("regionCatalogueReady=true"),'region catalogue readiness guard must remain');
assert(region.includes("fetchWithTimeout('/data/ride-history.json',5000)"),'ride history must have a bounded fetch');
console.log('PASS region search prefers complete production legal-region index; pilot is backup only');
