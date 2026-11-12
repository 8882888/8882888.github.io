const fs=require('node:fs');const {validate,pages}=require('../lib/engine');
const d=validate(JSON.parse(fs.readFileSync(process.env.REGION_DATA||'data/regions.json','utf8'))),all=pages(d);
const rows=[...all].map(([path,p])=>({path,indexable:p.indexable,bytes:Buffer.byteLength(p.html)}));
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/coverage.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({regions:d.regions.length,pages:rows.length,indexable:rows.filter(x=>x.indexable).length,draft:rows.filter(x=>!x.indexable).length}));
