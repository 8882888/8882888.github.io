'use strict';
// Usage: node scripts/import-legal-regions.js official-legal-dong.csv
// Official 법정동코드 CSV/TXT required; never synthesizes region names.
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];if(!source){console.error('Usage: node scripts/import-legal-regions.js <official.csv>');process.exit(2)}
let raw=fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'');
const parse=line=>{let out=[],v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){out.push(v);v=''}else v+=c}out.push(v);return out};
const lines=raw.split(/\r?\n/).filter(Boolean);
let delimiter=lines[0].includes('\t')?'\t':',';
const cols=s=>delimiter==='\t'?s.split('\t'):parse(s);
const header=cols(lines[0]).map(x=>x.trim());
const codeIndex=header.findIndex(x=>/법정동코드|법정동 코드/.test(x));
const nameIndex=header.findIndex(x=>/법정동명|법정동 명/.test(x));
const stateIndex=header.findIndex(x=>/폐지여부|폐지 여부/.test(x));
if(codeIndex<0||nameIndex<0)throw Error('Official CSV must have 법정동코드 and 법정동명 columns');
const existing=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/regions.json'),'utf8'));
const items=[],seen=new Set(),nameByCode=new Map();
const records=[];
for(const line of lines.slice(1)){const row=cols(line);const code=(row[codeIndex]||'').trim(),full=(row[nameIndex]||'').trim(),state=stateIndex>=0?(row[stateIndex]||'').trim():'';if(!/^\d{10}$/.test(code)||!full||/^(폐지|Y|1)$/i.test(state))continue;records.push({code,full})}
records.sort((a,b)=>a.code.localeCompare(b.code));
for(const {code,full} of records){
 const parts=full.split(/\s+/);const name=parts.at(-1);let level;
 if(code.endsWith('00000000'))level='시도';
 else if(code.endsWith('00000'))level=/[구]$/.test(name)?'구':/[군]$/.test(name)?'군':'시';
 else if(code.endsWith('00'))level=/읍$/.test(name)?'읍':/면$/.test(name)?'면':'동';
 else level=/리$/.test(name)?'리':'동';
 const slug='legal-'+code;if(seen.has(slug))continue;seen.add(slug);
 const parent_name=parts.length>1?parts.at(-2):'대한민국';
 items.push({name,slug,level,parent_name,full_name:full,legal_code:code,services:['daeri','taksong','daily']});
}
if(items.length<1000||items.filter(x=>x.level==='시도').length!==17)throw Error('Coverage check failed: official source incomplete; not overwriting regions.json');
const output={schema_version:3,brand:existing.brand,phone:existing.phone,note:'공식 법정동 코드 원본으로 생성한 지역 데이터. 지역별 기사 상주 및 배차를 보장하지 않습니다.',source_file:path.basename(source),generated_at:new Date().toISOString(),regions:items};
fs.writeFileSync(path.join(__dirname,'../data/regions.json'),JSON.stringify(output,null,2)+'\n');console.log('Imported '+items.length+' official legal regions');
