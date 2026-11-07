'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=read('server.js');
const start=code.indexOf('const officialGanghwaSubareas=Object.freeze([');
const end=code.indexOf('function regionalDecisionPanel(',start);
const routeStart=code.indexOf('const ganghwaTownTarget=phrase=>');
const routeEnd=code.indexOf('const keywordEntryPath=',routeStart);
assert(start>0&&end>start&&routeStart>end&&routeEnd>routeStart,'Source blocks for Ganghwa county routes and official administrative areas');
const county={full_name:'인천광역시 강화군',slug:'province-4-area-9'};
const ctx=vm.createContext({
 esc:x=>String(x),
 encodeURIComponent,
 regionByFullName:new Map([[county.full_name,county]]),
 compact:x=>String(x||'').replace(/\s+/g,'').replace(/[·_.(),-]/g,'').trim(),
 servicePath:(r,kind)=>'/'+kind+'/incheon/ganghwa-gun/'
});
vm.runInContext(code.slice(start,end)+'\n'+code.slice(routeStart,routeEnd),ctx);
const towns=JSON.parse(vm.runInContext('JSON.stringify(officialGanghwaSubareas)',ctx));
const official=['강화읍','선원면','불은면','길상면','화도면','양도면','내가면','하점면','양사면','송해면','교동면','삼산면','서도면'];
assert.deepEqual(towns,official,'Show the 1-eup 12-myeon legal list once and in official order');
assert.equal(new Set(towns).size,13,'All official 13 읍/면 must be unique');
for(const kind of ['daeri','taksong']){
 const html=vm.runInContext("regionalVerifiedSubareaChooser({full_name:'인천광역시 강화군'},'"+kind+"')",ctx);
 assert(html.includes('id="official-county-subareas-20261107"'),'County chooser missing');
 assert(html.includes('<details')&&html.includes('<summary'),'Mobile county chooser should be collapsible');
 assert.equal(html.split('href="/fare/?service=').length-1,13,
  'Every official 읍/면 must have one and only one quote link');
 assert(html.includes('강화군청 행정구역'),'Official evidence link missing');
 assert(html.includes('지점·기사 상주나 확정 요금은 의미하지 않습니다.'),'No invented local branch or rate');
 for(const town of official){
  const expected='/fare/?service='+kind+'&amp;from='+encodeURIComponent('인천광역시 강화군 '+town);
  assert(html.includes(expected),'Prefilled fare route missing '+town+' '+kind);
 }
}
assert.equal(vm.runInContext("regionalVerifiedSubareaChooser({full_name:'부산광역시'},'daeri')",ctx),'',
 'Ganghwa town panel must not leak onto unrelated regions');
const route=q=>vm.runInContext('ganghwaTownTarget('+JSON.stringify(q)+')',ctx);
assert.equal(route('강화군양도면대리운전'),'/daeri/incheon/ganghwa-gun/#official-county-subareas-20261107');
assert.equal(route('인천광역시 강화군 화도면탁송'),'/taksong/incheon/ganghwa-gun/#official-county-subareas-20261107');
assert.equal(route('양도면탁송비견적'),'/fare/?service=taksong&from='+encodeURIComponent('인천광역시 강화군 양도면'));
assert.equal(route('강화읍대리비견적'),'/fare/?service=daeri&from='+encodeURIComponent('인천광역시 강화군 강화읍'));
assert.equal(route('대구양도면대리운전'),null,'Do not invent geographically invalid town matching');
assert(code.includes('ganghwaTownTarget(searchIntent)||regionalServiceTarget(searchIntent)'), 'Homepage search intent must recognize county towns');
assert(code.includes('ganghwaTownTarget(rawQuery)||regionalServiceTarget(rawQuery)'), 'Region search must recognize county towns');
assert(code.includes('regionalVerifiedSubareaChooser(r,kind)+childLinks'), 'Both region service pages must expose county selection');
assert(code.includes('const related=[...new Map((local.length?local:siblings)'),
 'All nationwide regional child/sibling links must deduplicate identical official localities');
assert(code.includes("if(pathname==='/api/region-card-preview'){")&&
 code.includes('const townTarget=ganghwaTownTarget(query)')&&
 code.includes("status:'matched',query,locality:'인천광역시 강화군 '+town"),
 'The interactive regional keyword preview must recognize official Ganghwa town searches');
assert(code.includes("if(pathname==='/api/ganghwa-town-card.svg')")&&
 code.includes("exactKeywordCard.render({keyword:q,region:'인천광역시 강화군',kind,phone:PHONE})"),
 'The preview image must display the exact validated locality and official number');
assert(code.includes("url:townTarget,phone:PHONE,displayKeyword:query,"),
 'The dynamic preview must link customers to a canonical service/quote route');
assert(code.includes("requested!==service")&&code.includes("status:'not_found'"),
 'Contradictory user-selected services must not return the wrong card');
const history=JSON.parse(read('data/ride-history.json'));
assert.equal(history.length,2591,'Keep the 2,591 original verified ride records unchanged');
console.log('PASS official Ganghwa 13 unique areas, quote links, contextual search routes, no fictional local offices');
