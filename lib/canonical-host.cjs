'use strict';
const OFFICIAL='jeongukdaeri.kr';
const DIRECT='port-0-smart24-taksong-backup-mviupa4l4c8a9dbf.sel3.cloudtype.app';
const ORIGIN='https://'+OFFICIAL;
// Conservative: a proxy may rewrite Host, so an alias-only Host without
// independently matching forwarded host is diagnostic, not redirect authority.
const normalized=value=>typeof value==='string'?value.trim().toLowerCase().replace(/:443$/,''):'';
function canonicalHostDecision(req,url,pathname){
 const headers=req.headers||{};
 const host=normalized(headers.host),forwarded=normalized(headers['x-forwarded-host']);
 if(host===OFFICIAL||host==='www.'+OFFICIAL||forwarded===OFFICIAL||forwarded==='www.'+OFFICIAL)
  return {mode:'official'};
 if(host!==DIRECT)return {mode:'other'};
 if(forwarded!==DIRECT)return {mode:forwarded?'alias-conflict':'alias-host-only'};
 // A separately supplied Forwarded header with an ambiguous host is not safe
 // enough to redirect. Never construct the destination from request headers.
 const standard=String(headers.forwarded||'');
 if(standard&&[...standard.matchAll(/(?:^|[;,])\s*host\s*=\s*"?([^";,\s]+)/gi)].some(m=>normalized(m[1])!==DIRECT))
  return {mode:'alias-conflict'};
 const mode='confirmed-alias';
 if(!['GET','HEAD'].includes(req.method)||pathname==='/health'||pathname.startsWith('/health/')||
    pathname==='/api'||pathname.startsWith('/api/')||!String(req.url||'').startsWith('/')||String(req.url).startsWith('//'))
  return {mode};
 return {mode,location:ORIGIN+url.pathname+url.search};
}
module.exports={canonicalHostDecision,OFFICIAL,DIRECT};
