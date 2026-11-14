#!/usr/bin/env node
'use strict';
// Verify existing 2,900 source-curated guides resolve to DISTINCT canonical paths.
// Local repository data only: no network or live-site mutation.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
const from=source.indexOf('const naverFocus50='),to=source.indexOf('const naverFocus2900=',from);
if(from<0||to<=from)throw new Error('Cannot locate curated focus inventory');
const sourceFiles=[...source.slice(from,to).matchAll(/const\s+naverFocus\w+\s*=\s*load\('([^']+)'\)\.priority;/g)].map(x=>x[1]);
const focus=sourceFiles.flatMap(name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8')).priority);
const files=fs.readdirSync(path.join(root,'data/legal-regions')).filter(n=>/^\d{2}\.json$/.test(n)).sort();
const regions=[],byFull=new Map();
for(const file of files)for(const full of JSON.parse(fs.readFileSync(path.join(root,'data/legal-regions',file),'utf8')).full_names){
 if(byFull.has(full))continue;
 const p=full.split(' '),name=p.at(-1),parent=byFull.get(p.slice(0,-1).join(' '));
 const r={slug:'area-'+(regions.length+1),name,full_name:full,parent_slug:parent?.slug||null};
 regions.push(r);byFull.set(full,r);
}
const initial=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const medial=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const final=['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
function roman(value){return [...String(value)].map(ch=>{const n=ch.charCodeAt(0)-44032;if(n<0||n>=11172)return /[a-z0-9]/i.test(ch)?ch.toLowerCase():'-';return initial[Math.floor(n/588)]+medial[Math.floor(n%588/28)]+final[n%28]}).join('').replace(/-+/g,'-').replace(/^-|-$/g,'')}
const overrides={'서울특별시':'seoul','부산광역시':'busan','인천광역시':'incheon','대구광역시':'daegu','광주광역시':'gwangju','대전광역시':'daejeon','울산광역시':'ulsan','세종특별자치시':'sejong','경기도':'gyeonggi','강원특별자치도':'gangwon','충청북도':'chungbuk','충청남도':'chungnam','전북특별자치도':'jeonbuk','전라남도':'jeonnam','경상북도':'gyeongbuk','경상남도':'gyeongnam','제주특별자치도':'jeju','강화군':'ganghwa-gun','강화읍':'ganghwa-eup','불은면':'bureun-myeon'};
const suffixes={'특별자치시':'si','특별시':'si','광역시':'si','특별자치도':'do','자치도':'do','도':'do','시':'si','군':'gun','구':'gu','읍':'eup','면':'myeon','동':'dong','리':'ri'};
const paths=new Map(),byPath=new Map();
for(const r of regions){
 const p=r.parent_slug?paths.get(r.parent_slug):'';
 const m=r.name.match(/^(.*?)(특별자치시|특별시|광역시|특별자치도|자치도|도|시|군|구|읍|면|동|리)$/);
 const segment=overrides[r.name]||(m&&m[1]?roman(m[1])+'-'+suffixes[m[2]]:roman(r.name));
 const proposed=(p?p+'/':'')+segment, unique=byPath.has(proposed)?proposed+'-'+r.slug:proposed;
 paths.set(r.slug,unique);byPath.set(unique,r);
}
const seen=new Map(),collisions=[],unknown=[],empty=[],kindCounts={taksong:0,daeri:0};
for(const x of focus){
 kindCounts[x.kind]=(kindCounts[x.kind]||0)+1;
 const r=byFull.get(x.region);
 if(!r){unknown.push(x);continue;}
 const resolved=paths.get(r.slug),url='/'+x.kind+'/'+resolved+'/';
 if(!resolved){empty.push(x);continue;}
 if(seen.has(url))collisions.push({url,first:seen.get(url),second:x.kind+'|'+x.region});
 else seen.set(url,x.kind+'|'+x.region);
}
const result={regionCount:regions.length,focusFiles:sourceFiles.length,focusCount:focus.length,
 kinds:kindCounts,uniqueCanonicalUrls:seen.size,collisions:collisions.slice(0,25),
 collisionTotal:collisions.length,unknownCount:unknown.length,emptyCount:empty.length};
console.log(JSON.stringify(result,null,2));
if(focus.length!==2900||unknown.length||empty.length||collisions.length)process.exitCode=1;
