'use strict';
/* Import public legal-dong code text from a URL without installing certificates.
   Usage: node scripts/sync-public-regions.js <https-url>
   Source format: 법정동코드 TAB 법정동명 TAB 폐지여부
*/
const fs=require('node:fs'),path=require('node:path');
const url=process.argv[2];if(!url||!/^https:\/\//.test(url))throw Error('Provide verified HTTPS source URL');
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Source returned '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 let text=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
 if(text.includes('\uFFFD'))text=new TextDecoder('euc-kr').decode(bytes);
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
 const parsed=[];
 for(const line of lines){const cols=line.split('\t');const code=(cols[0]||'').trim(),full=(cols[1]||'').trim(),status=(cols[2]||'').trim();
 if(/^\d{10}$/.test(code)&&full&&status==='존재')parsed.push({code,full});}
 const seen=new Set(),regions=[];
 for(const {code,full} of parsed){if(seen.has(code))continue;seen.add(code);
 const parts=full.split(/\s+/);const name=parts.at(-1);
 const level=code.endsWith('00000000')?'시도':code.endsWith('00000')?(/[구]$/.test(name)?'구':/[군]$/.test(name)?'군':'시'):code.endsWith('00')?(/[읍]$/.test(name)?'읍':/[면]$/.test(name)?'면':'동'):'리';
 regions.push({name,slug:'legal-'+code,level,parent_name:parts.length>1?parts.at(-2):'대한민국',full_name:full,legal_code:code,services:['daeri','taksong','daily']});}
 if(regions.length<15000||regions.filter(x=>x.level==='시도').length!==17)throw Error('Source failed coverage validation: '+regions.length+' regions');
 const existing=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/regions.json'),'utf8'));
 const out={schema_version:3,brand:existing.brand,phone:existing.phone,note:'공개 법정동코드 중 현존 지역만 포함. 기사 상주 및 배차 보장 아님.',source_url:url,generated_at:new Date().toISOString(),regions};
 fs.writeFileSync(path.join(__dirname,'../data/regions.json'),JSON.stringify(out));
 console.log('Validated and imported '+regions.length+' active regions');
})().catch(e=>{console.error(e);process.exitCode=1});
