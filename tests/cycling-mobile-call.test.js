'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
for(const slug of ['yeongsan','seomjin','eastcoast','geumgang','ocheon','nakdonggang']){
 const html=fs.readFileSync(path.join(root,'route-taksong/courses',slug,'index.html'),'utf8');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/,'mobile viewport: '+slug);
 assert.match(html,/\.cycle-course-mobile-call\{display:none\}/,'hide on desktop: '+slug);
 assert.ok(html.includes('body{padding-bottom:calc(84px + env(safe-area-inset-bottom))}'),'reserve mobile bottom space: '+slug);
 assert.ok(html.includes('.cycle-course-mobile-call{position:fixed;display:flex;left:0;right:0;bottom:0;z-index:11000;min-height:56px'),'fixed 56px touch target: '+slug);
 assert.match(html,/<a class="cycle-course-mobile-call" href="tel:18114294" aria-label="[^"]+">☎ [^<]+<\/a><\/body>/,'native telephone call: '+slug);
 assert.equal((html.match(/class="cycle-course-mobile-call"/g)||[]).length,1,'one CTA per page: '+slug);
}
console.log('PASS mobile direct-call CTA on all six cycling courses');
