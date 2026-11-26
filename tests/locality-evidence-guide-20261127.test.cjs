'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create,reviewTargets,intentGuide}=require('../lib/locality-evidence-guide-20261127.cjs');
const root=path.join(__dirname,'..'),dir=path.join(root,'data');
const rows=fs.readdirSync(dir).filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates')).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f))).priority);
const names=fs.readdirSync(path.join(dir,'legal-regions')).filter(f=>/^\d{2}\.json$/.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,'legal-regions',f))).full_names);
const regions=[...new Set(names)].map((full_name,i)=>({full_name,slug:'test-'+i}));
const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
const g=create({rows,regions,servicePath:(r,k)=>'/'+k+'/'+r.slug+'/',esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')});
test('complete exact existing backlog, not an arbitrary top-N or blanket index expansion',()=>{
 assert.equal(rows.length,2900);
 assert.equal(g.targets.size,1918);
 assert.equal(g.plans.size,1918);
 const allProvinces=new Set(rows.map(x=>x.region.split(' ')[0]));
 const selectedProvinces=new Set(rows.filter(x=>g.targets.has(x.kind+'|'+x.region)).map(x=>x.region.split(' ')[0]));
 const renderedProvinces=new Set([...g.plans.values()].map(x=>x.region.full_name.split(' ')[0]));
 assert.deepEqual([...renderedProvinces].sort(),[...selectedProvinces].sort());
 assert.equal(selectedProvinces.size,16,'current flagged cohort spans 16 provinces; investigate any change');
 for(const province of allProvinces){
  const source=rows.filter(x=>x.region.split(' ')[0]===province);
  const selected=source.filter(x=>g.targets.has(x.kind+'|'+x.region));
  assert.equal([...g.plans.values()].filter(x=>x.region.full_name.split(' ')[0]===province).length,selected.length,province);
  console.log('Locality coverage:',province,selected.length,'of',source.length);
 }
 console.log('Source provinces without flagged rows:',[...allProvinces].filter(x=>!selectedProvinces.has(x)).join(', ')||'none');
 for(const row of rows){
  const p=g.plans.get(row.kind+'|'+row.region);
  const r=regions.find(x=>x.full_name===row.region);
  assert(r);
  const html=g.render(r,row.kind);
  if(!p){assert.equal(html,'');continue;}
  assert(html.includes(row.region));
  assert(html.includes('from='+encodeURIComponent(row.region)));
  assert(html.includes('to='+encodeURIComponent(row.region)));
  assert(html.includes('region='+encodeURIComponent(r.slug)));
  if(p.parent)assert(html.includes(p.parent.full_name));
  assert(!/완료 운행후기|상주 기사|배차 보장/.test(html));
 }
});
test('service intent is conditional and does not assert facilities',()=>{
 assert.equal(intentGuide({kind:'taksong',keyword:'렌트카탁송',topic:'반납',related:''})[0],'렌터카 반납·회수');
 assert.equal(intentGuide({kind:'daeri',keyword:'골프장대리운전',topic:'',related:''})[0],'골프장 이동');
 assert.match(source,/localityEvidenceGuide\.render\(r,kind\)/);
 assert.match(source,/locality-evidence-guide-20261127\.cjs/);
});
