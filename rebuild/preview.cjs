'use strict';
const http=require('node:http');
const {byPath,render,origin}=require('./render.cjs');
const server=http.createServer((req,res)=>{
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let path;try{path=decodeURI(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end();}
 if(path==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('User-agent: *\nDisallow: /\n');}
 if(path==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({status:'ok',mode:'local-preview-only',corePages:byPath.size}));}
 if(path==='/sitemap.xml'){res.writeHead(404);return res.end('Preview has no public sitemap');}
 const p=byPath.get(path);
 if(!p){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('미리보기에 없는 경로입니다. 기존 운영 사이트: '+origin);}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
 res.end(req.method==='HEAD'?'':render(p,{preview:true}));
});
if(require.main===module)server.listen(Number(process.env.REBUILD_PORT||3300),'127.0.0.1',()=>console.log('Local rebuild preview: http://127.0.0.1:'+server.address().port));
module.exports=server;
