'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('server SSR loads every nationwide source file exactly once into its 2900-guide registry',()=>{
 const files=fs.readdirSync(path.join(root,'data'))
  .filter(f=>/^naver-regional-focus-.*\.json$/.test(f)&&!f.includes('candidates')).sort();
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 const regex=/const\s+(naverFocus\w+)\s*=\s*load\('(data\/naver-regional-focus-[^']+\.json)'\)\.priority;/g;
 const loads=[...server.matchAll(regex)].map(x=>({variable:x[1],source:x[2]}));
 assert.equal(loads.length,files.length,'The live SSR must not omit national source batches');
 assert.deepEqual(loads.map(x=>x.source.slice(5)).sort(),files);
 assert.equal(new Set(loads.map(x=>x.variable)).size,files.length);
 const all=server.match(/const\s+naverFocus2900=\[([^\]]+)\];/);
 assert(all,'Live regional SSR must retain national source aggregation');
 const spread=[...all[1].matchAll(/\.\.\.(naverFocus\w+)/g)].map(x=>x[1]);
 assert.equal(spread.length,files.length);
 assert.deepEqual([...spread].sort(),loads.map(x=>x.variable).sort(),
  'Every nationwide registry variable must be rendered exactly once');
 let total=0;
 const serviceLocationKeys=new Set();
 for(const f of files){
  const rows=JSON.parse(fs.readFileSync(path.join(root,'data',f),'utf8')).priority;
  assert([50,100].includes(rows.length),'Unexpected source count: '+f);
  total+=rows.length;
  for(const x of rows){
   assert(['daeri','taksong'].includes(x.kind),'Invalid service '+f);
   assert(x.region?.trim()&&x.keyword?.trim(),'Missing region/keyword in '+f);
   const key=x.kind+'|'+x.region;
   assert(!serviceLocationKeys.has(key),'Nationwide duplicated region/service pair: '+key);
   serviceLocationKeys.add(key);
  }
 }
 assert.equal(total,2900,'Protect existing nationwide 2900-source inventory');
 assert.equal(serviceLocationKeys.size,total);
});