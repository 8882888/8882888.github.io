const fs=require('node:fs');const path=require('node:path');const {validate,pages,sitemap}=require('../lib/engine');
const d=validate(JSON.parse(fs.readFileSync(process.env.REGION_DATA||'data/regions.json','utf8'))),all=pages(d);
fs.rmSync('dist/local-service',{recursive:true,force:true});
for(const [loc,p] of all){const target=path.join('dist',loc,'index.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,p.html);}
fs.writeFileSync('dist/local-service/sitemap.xml',sitemap(d,all));
console.log('HTML 미리보기 생성. 검색·301·404는 Node 서버에서 제공됩니다.');
