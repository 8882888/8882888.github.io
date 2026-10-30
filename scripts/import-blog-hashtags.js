'use strict';
// Usage: node scripts/import-blog-hashtags.js /path/to/owner-confirmed-post-tags.json
// Input: [{ "id":"224...", "url":"https://blog.naver.com/wjdtnr4757/224...",
//           "tags":["#강원도탁송","#횡성탁송"] }, ...]
// Input must be a user-supplied original export, not title-inferred keywords.
const fs=require('node:fs'),path=require('node:path');
const {normalize,validate}=require('../lib/blog-post-tags');
const input=process.argv[2];
if(!input)throw Error('Provide an owner-confirmed JSON export file path');
const file=path.resolve(input),items=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(items))throw Error('Expected JSON array of article id/url/tags');
const dest=path.join(__dirname,'../blog/verified-hashtags.json');
const existing=JSON.parse(fs.readFileSync(dest,'utf8'));
const next={...existing.posts};
let newCount=0;
for(const item of items){
 if(!item||typeof item.id!=='string'||!Array.isArray(item.tags))throw Error('Malformed input');
 const id=item.id, row={source:'user-confirmed-original',url:item.url,tags:item.tags.map(t=>normalize(t))};
 validate(id,row);
 if(Object.hasOwn(next,id))throw Error('Duplicate existing entry; review before overwrite: '+id);
 if(items.filter(x=>x.id===id).length!==1)throw Error('Duplicate ID in import: '+id);
 next[id]=row;newCount++;
}
const merged={format:1,notes:existing.notes,posts:Object.fromEntries(Object.entries(next).sort(([a],[b])=>a.localeCompare(b)))};
fs.writeFileSync(dest,JSON.stringify(merged,null,2)+'\n');
console.log('Imported '+newCount+' owner-confirmed hashtag sets; total '+Object.keys(merged.posts).length+'.');
