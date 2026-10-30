'use strict';
// Only hashtags supplied from the owner's original post export are eligible.
// Neither keywords inferred from titles nor category names are treated as tags.
const source=require('../blog/verified-hashtags.json');
const existing=require('../blog/posts.json');
const urls=new Map(existing.map(p=>[String(p.id),p.url]));
function normalize(tag){
 if(typeof tag!=='string')return null;
 const clean=tag.trim().normalize('NFC');
 return /^#[\p{L}\p{N}_]{2,45}$/u.test(clean)?clean:null;
}
function validate(id,row){
 if(!urls.has(id))throw Error('Hashtag entry not in saved blog posts: '+id);
 if(!row||row.source!=='user-confirmed-original'||row.url!==urls.get(id)||!Array.isArray(row.tags)||row.tags.length>30)
  throw Error('Unverified hashtag entry: '+id);
 const tags=row.tags.map(normalize);
 if(tags.some(x=>!x)||new Set(tags).size!==tags.length)throw Error('Invalid or duplicate hashtags for '+id);
 return tags;
}
if(source.format!==1||!source.posts||typeof source.posts!=='object'||Array.isArray(source.posts))throw Error('Invalid hashtag store format');
const verified=new Map(Object.entries(source.posts).map(([id,row])=>[id,validate(id,row)]));
function get(id){return verified.get(String(id))||[]}
module.exports={get,normalize,validate,count:verified.size};
