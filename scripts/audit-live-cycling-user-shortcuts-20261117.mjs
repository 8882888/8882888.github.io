// Read-only live HTML smoke test: actual internal links, not Naver index/CTR evidence.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const origin=process.env.PRODUCTION_URL||'https://jeongukdaeri.kr';
async function main(){
 const url=new URL('/route-taksong/',origin);
 const r=await fetch(url,{redirect:'manual',headers:{'User-Agent':'Smart24-Live-Cycling-Intent-Audit/1.0','Cache-Control':'no-cache'},signal:AbortSignal.timeout(24000)});
 if(r.status!==200||!(r.headers.get('content-type')||'').includes('text/html')||/noindex/i.test(r.headers.get('x-robots-tag')||''))
  throw Error('/route-taksong/ has invalid HTTP or indexability response');
 const h=await r.text(),head=h.split('</head>')[0],start=h.indexOf('id="cycling-course-user-shortcuts-20261117"');
 if(start<0||start>h.indexOf('</table>'))throw Error('Cycling source-backed shortcuts not present before first long table');
 if(!head.includes('<link rel="canonical" href="'+url.origin+'/route-taksong/"'))throw Error('Canonical changed');
 const urls=['/route-taksong/courses/eastcoast/','/route-taksong/courses/yeongsan/','/route-taksong/courses/seomjin/','/route-taksong/centers/','/reviews/history/?kind=taksong','/fare/?service=taksong'];
 for(const link of urls)if(!h.includes('href="'+link+'"'))throw Error('Useful HTML link missing: '+link);
 if(!h.includes('tel:18114294'))throw Error('Booking phone absent');
 const out={source:'LIVE_HTTP_NOT_NAVER_SEARCH_DATA',page:'/route-taksong/',http:200,canonical:true,shortcutLinks:urls.length,verifiedContent:true,naverClicks:null,naverCtr:null,naverIndexed:null};
 console.log(JSON.stringify(out,null,2));
 console.log('PASS live existing cycling hub links to 3 course guides, real records, centers and fare; not a Naver ranking claim');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'- Cycling live HTML: 200, 6 useful links and self canonical; **not** Naver traffic or indexing data.\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1});
