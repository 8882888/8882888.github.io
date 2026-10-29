'use strict';
// Diagnostic only: Yeti in User-Agent is NOT proof that Naver sent the request.
// Never log source IP, query strings, cookies, referrers, or other personal data.
function observeCrawlerRequest(req,res,log=console.info){
 const ua=String(req?.headers?.['user-agent']||'');
 if(!/\bYeti\/[0-9]+(?:\.[0-9]+)*/i.test(ua))return false;
 // Exclude our own GitHub simulated-Yeti check from crawler observations.
 if(String(req.headers['x-smart24-monitor']||'')==='github-health-probe')return false;
 let pathname='/invalid-url';
 try{pathname=new URL(String(req.url||'/'),'http://localhost').pathname.slice(0,180)}
 catch{}
 res.once('finish',()=>{
  log('SEO_YETI_UA '+JSON.stringify({
   at:new Date().toISOString(),
   identity:'unverified-User-Agent',
   method:['GET','HEAD'].includes(req.method)?req.method:'other',
   path:pathname,
   status:res.statusCode
  }));
 });
 return true;
}
module.exports={observeCrawlerRequest};
