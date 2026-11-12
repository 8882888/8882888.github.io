const fs=require('node:fs');const {validate}=require('../lib/engine');const {plan}=require('../lib/opportunity');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const report=plan(validate(read(process.env.REGION_DATA||'data/regions.json')),read(process.env.TRIP_DATA||'data/trips.json'),process.env.METRICS_DATA?read(process.env.METRICS_DATA):[]);
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/opportunities.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
