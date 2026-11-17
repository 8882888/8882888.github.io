'use strict';
// Bounded, in-flight de-duplicated cache for public, source-backed HTML.
// No user/session data or per-request prices may be cached.
function createRegionalHtmlCache(options={}){
 const maxEntries=options.maxEntries??96;
 const ttlMs=options.ttlMs??120000;
 const clock=options.clock??Date.now;
 if(!Number.isInteger(maxEntries)||maxEntries<1||!Number.isFinite(ttlMs)||ttlMs<=0)throw Error('invalid cache policy');
 const cache=new Map();
 function get(key,makePage){
  const now=clock(),stored=cache.get(key);
  if(stored&&stored.expiresAt>now){
   cache.delete(key);cache.set(key,stored);
   return stored.promise;
  }
  cache.delete(key);
  // Store the promise *before* the rendering begins so concurrent SEO
  // crawls or customer requests don't repeat the same costly HTML build.
  const value={expiresAt:now+ttlMs,promise:Promise.resolve().then(makePage)};
  cache.set(key,value);
  while(cache.size>maxEntries)cache.delete(cache.keys().next().value);
  value.promise.catch(()=>{if(cache.get(key)===value)cache.delete(key)});
  return value.promise;
 }
 return {get,stats:()=>({entries:cache.size,maxEntries,ttlMs})};
}
module.exports={createRegionalHtmlCache};
