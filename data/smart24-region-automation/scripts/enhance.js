const fs=require('node:fs');const {validate}=require('../lib/engine');const {renderEnhancement,integrationPlan}=require('../lib/enhance');
const d=validate(JSON.parse(fs.readFileSync('data/regions.json'))),records=JSON.parse(fs.readFileSync('data/trips.json'));
const plan=integrationPlan(d,records);fs.rmSync('generated',{recursive:true,force:true});fs.mkdirSync('generated');
for(const row of plan.filter(x=>x.targetPath)){fs.writeFileSync(`generated/${row.region}-${row.service}.html`,renderEnhancement(d,records,row.region,row.service));}
fs.writeFileSync('generated/integration-plan.json',JSON.stringify(plan,null,2));
console.log(JSON.stringify({existingPageBlocks:plan.filter(x=>x.targetPath).length,records:records.length,newPagesEnabled:plan.filter(x=>x.action==='new-reviewed-page').length}));
