// Read-only source-of-truth inventory. No public crawl requests or deployment changes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const romanInitial=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const romanMedial=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const romanFinal=['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
const overrides={'서울특별시':'seoul','부산광역시':'busan','인천광역시':'incheon','대구광역시':'daegu','광주광역시':'gwangju','대전광역시':'daejeon','울산광역시':'ulsan','세종특별자치시':'sejong','경기도':'gyeonggi','강원특별자치도':'gangwon','충청북도':'chungbuk','충청남도':'chungnam','전북특별자치도':'jeonbuk','전라남도':'jeonnam','경상북도':'gyeongbuk','경상남도':'gyeongnam','제주특별자치도':'jeju','강화군':'ganghwa-gun','강화읍':'ganghwa-eup','불은면':'bureun-myeon'};
const suffixes={'특별자치시':'si','특별시':'si','광역시':'si','특별자치도':'do','자치도':'do','도':'do','시':'si','군':'gun','구':'gu','읍':'eup','면':'myeon','동':'dong','리':'ri'};
const roman=value=>[...String(value)].map(ch=>{
 const n=ch.charCodeAt(0)-44032;
 if(n<0||n>=11172)return /[a-z0-9]/i.test(ch)?ch.toLowerCase():'-';
 return romanInitial[Math.floor(n/588)]+romanMedial[Math.floor(n%588/28)]+romanFinal[n%28];
}).join('').replace(/-+/g,'-').replace(/^-|-$/g,'');
export function regionsFromLegal(base=root){
 const dir=path.join(base,'data/legal-regions');
 const files=fs.readdirSync(dir).filter(x=>/^\d{2}\.json$/.test(x)).sort();
 if(files.length!==17)throw Error('Expected 17 legal region files, got '+files.length);
 const regions=[],byFull=new Map(),paths=new Map(),used=new Set();
 for(const file of files){
  const data=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  for(const full_name of data.full_names){
   if(byFull.has(full_name))continue;
   const words=full_name.split(' '),name=words.at(-1),parent=byFull.get(words.slice(0,-1).join(' '));
   if(words.length>1&&!parent)throw Error('Missing region parent: '+full_name);
   const suffix=name.match(/^(.*?)(특별자치시|특별시|광역시|특별자치도|자치도|도|시|군|구|읍|면|동|리)$/);
   const level=words.length===1?'시도':/리$/.test(name)?'리':/읍$/.test(name)?'읍':/면$/.test(name)?'면':/구$/.test(name)?'구':/군$/.test(name)?'군':/시$/.test(name)?'시':'동';
   const slug='area-'+(regions.length+1);
   const segment=overrides[name]||(suffix&&suffix[1]?roman(suffix[1])+'-'+suffixes[suffix[2]]:roman(name));
   const p=(parent?paths.get(parent.slug)+'/':'')+segment;
   const unique=used.has(p)?p+'-'+slug:p;
   used.add(unique);paths.set(slug,unique);
   const record={slug,level,name,full_name,province:words[0],path:unique,parent_slug:parent?.slug||null};
   byFull.set(full_name,record);regions.push(record);
  }
 }
 return regions;
}
const item=(url,family,policy)=>({url,family,policy});
export function buildInventory(regions){
 const items=new Map(),add=(url,family,policy='inspect')=>{if(!items.has(url))items.set(url,item(url,family,policy))};
 for(const r of regions){
  add('/region/'+r.slug+'/','region-directory');
  for(const kind of ['daeri','taksong']){
   add('/'+kind+'/'+r.path+'/','regional-service',r.level==='리'?'possibly-intentional-noindex':'inspect');
   add('/routes/'+kind+'/'+r.slug+'/','route-directory','intentional-noindex');
  }
  if(r.level!=='리'){
   for(const kind of ['daeri','taksong']){
    for(const topic of (kind==='daeri'?['fare','long-distance']:['fare','handover']))
     add('/'+kind+'/'+r.path+'/'+topic+'/','regional-topic', ['읍','면','동'].includes(r.level)?'possibly-intentional-noindex':'inspect');
   }
  }
  if(r.level==='시도'){
   for(const kind of ['daeri','taksong'])add('/recruit/'+kind+'/'+r.slug+'/','recruitment');
  }
 }
 // Route-guides.js intentionally chooses 200 origins (balanced across 17 provinces), 5 destinations.
 const groups=new Map();
 for(const r of regions){
  const words=r.full_name.split(' '),eligible=(words.length===2&&['시','군','구'].includes(r.level))||r.full_name==='세종특별자치시';
  if(!eligible)continue;
  const group=words[0];if(!groups.has(group))groups.set(group,[]);groups.get(group).push(r);
 }
 const lists=[...groups.values()],origins=[];
 for(let n=0;origins.length<200&&lists.some(g=>n<g.length);n++)for(const group of lists){
  if(group[n]&&origins.length<200)origins.push(group[n]);
 }
 if(origins.length!==200)throw Error('Unexpected fare route origins: '+origins.length);
 for(const r of origins)for(const dest of ['seoul','incheon','daejeon','daegu','busan'])
  add('/fare/route/'+r.path+'/'+dest+'/','fare-route');
 // Combinatorial pair routes are too numerous to enumerate by HTTP. Test representative
 // source-backed endpoints and record their entire addressable family separately.
 const hubs=regions.filter(r=>r.level==='시도');
 for(const r of regions.filter((x,i)=>x.level==='시도'||i%500===0)){
  for(const kind of ['daeri','taksong']){
   for(const dest of hubs.slice(0,3)){
    if(r.slug!==dest.slug)add('/routes/'+kind+'/'+r.slug+'/'+dest.slug+'/','route-pair-representative','representative-only');
    if(r.slug!==dest.slug)add('/routes/'+kind+'/'+dest.slug+'/'+r.slug+'/','route-pair-representative','representative-only');
   }
  }
 }
 const totalAddressableRoutePairs=BigInt(regions.length+1)*BigInt(regions.length)*2n;
 const families=Object.fromEntries([...new Set([...items.values()].map(x=>x.family))].map(f=>[f,[...items.values()].filter(x=>x.family===f).length]));
 return {items:[...items.values()],stats:{regionCount:regions.length,families,
  potentialRoutePairURLs:totalAddressableRoutePairs.toString(),
  omittedFromExhaustiveHTTP:['free-text search query permutations','route pair cross-product beyond representatives','paginated query variants','external live API records']}}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const data=buildInventory(regionsFromLegal());console.log(JSON.stringify(data.stats,null,2));
 if(process.env.INVENTORY_OUTPUT)fs.writeFileSync(process.env.INVENTORY_OUTPUT,JSON.stringify(data));
}
