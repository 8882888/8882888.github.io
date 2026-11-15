'use strict';
// Aggregate the exact bytes of every published curated regional guide source.
// A single historical file hash cannot prove that the 2,900 served guide rows
// match the live Cloudtype instance after a data-only editorial change.
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
function fingerprintCuratedRegionSources(root){
 const folder=path.join(root,'data');
 const names=fs.readdirSync(folder)
  .filter(name=>/^naver-regional-focus-.*\.json$/.test(name)&&!name.includes('candidates'))
  .sort();
 if(!names.length)throw Error('No published curated regional sources');
 const hash=createHash('sha256');
 for(const name of names){
  const bytes=fs.readFileSync(path.join(folder,name));
  hash.update(name,'utf8');
  hash.update('\0');
  hash.update(String(bytes.length),'utf8');
  hash.update('\0');
  hash.update(bytes);
  hash.update('\0');
 }
 return {sha256:hash.digest('hex'),count:names.length};
}
module.exports={fingerprintCuratedRegionSources};
