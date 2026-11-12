const fs=require('node:fs');const path=require('node:path');const {validate,pages,sitemap}=require('../lib/engine');
const d=validate(JSON.parse(fs.readFileSync(process.env.REGION_DATA||'data/regions.json','utf8'))),all=pages(d,JSON.parse(fs.readFileSync(process.env.TRIP_DATA||'data/trips.json','utf8')));
fs.rmSync('dist/local-service',{recursive:true,force:true});
for(const [loc,p] of all){if(p.redirectTo)continue;const target=path.join('dist',loc,'index.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,p.html);}
fs.writeFileSync('dist/local-service/sitemap.xml',sitemap(d,all));
fs.writeFileSync('dist/redirects.json',JSON.stringify([...all].filter(([,p])=>p.redirectTo).map(([from,p])=>({from,to:p.redirectTo,status:301})),null,2));
console.log('HTML 미리보기 생성. 검색·301·404는 Node 서버에서 제공됩니다.');
