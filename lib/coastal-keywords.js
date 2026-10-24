'use strict';
const fs=require('node:fs'),path=require('node:path');
const {shortName}=require('./keyword-aliases');
module.exports=function({root,regions,esc,layout,servicePath}){
 const doc=JSON.parse(fs.readFileSync(path.join(root,'data/coastal/places.json'),'utf8'));
 const bySlug=new Map(regions.map(r=>[r.slug,r]));
 const items=doc.items.filter(x=>x.regions.length===1&&bySlug.get(x.regions[0])?.full_name===x.regionFull);
 if(items.length!==doc.items.length)throw Error('Coastal region mapping changed; rebuild registry before publishing');
 const byId=new Map(items.map(x=>[x.id,x])),base='https://'+(process.env.PUBLIC_HOST||'jeongukdaeri.kr');
 const compact=s=>String(s).normalize('NFKC').replace(/\s+/g,'').toLowerCase();
 const label=k=>k==='daeri'?'대리운전':'탁송',brand=k=>k==='daeri'?'스마트전국대리운전':'스마트24시전국탁송';
 const url=(x,k)=>'/'+k+'/coast/'+x.id+'/';
 const provinces=[...new Set(items.map(x=>x.regionFull.split(' ')[0]))];
 const listUrl=p=>'/coast/'+(p?encodeURIComponent(p)+'/':'');
 const regionalAliases={'강원특별자치도':['강원도','강원'], '강원특별자치도 고성군':['강원도고성','강원고성','고성']};
 function search(q){
  const needle=compact(q),kind=/탁송$/.test(needle)?'taksong':/대리(?:운전)?$/.test(needle)?'daeri':null;
  const term=needle.replace(/(?:대리운전|대리|탁송)$/,'');if(!term)return [];
  const out=[];
  for(const x of items){const variants=x.aliases.flatMap(a=>[a,x.regionFull+' '+a,x.regionFull.split(' ').slice(0,2).join(' ')+a]);if(!variants.some(a=>compact(a).includes(term)))continue;
   for(const k of kind?[kind]:['daeri','taksong'])out.push({term:x.term+' '+label(k)+' · '+x.regionFull,url:url(x,k)});
  }
  // Regional expressions reuse existing regional service pages, including short 읍/면 names.
  if(kind)for(const r of regions){const variants=[r.name,r.name.replace(/(?:특별자치도|특별자치시|특별시|광역시|도|시|군|구|읍|면)$/,''),r.full_name,...(regionalAliases[r.full_name]||[])];if(variants.some(a=>compact(a)===term))out.push({term:r.full_name+' '+label(kind),url:servicePath(r,kind)});}
  return out;
 }
 function regionLinks(r,kind){
  const matches=items.filter(x=>x.regionFull===r.full_name||x.regionFull.startsWith(r.full_name+' ')).slice(0,12);
  if(!matches.length)return '';
  return '<section><h2>'+esc(r.name)+' 해변·해수욕장·항구 '+label(kind)+'</h2><ul>'+matches.map(x=>'<li><a href="'+url(x,kind)+'">'+esc(x.term)+label(kind)+'</a></li>').join('')+'</ul><p><a href="'+listUrl(r.full_name.split(' ')[0])+'">해당 시·도 해변·항구 전체 안내</a></p></section>';
 }
 function directory(province){
  if(province&&!provinces.includes(province))return null;
  const places=province?items.filter(x=>x.regionFull.startsWith(province+' ')):[];
  const title=(province||'전국')+' 해수욕장·해변·항구 대리운전·탁송';
  const body='<nav><a href="/activities/">방문 장소별 안내</a> / <a href="/coast/">해변·항구</a></nav><section><h2>'+esc(title)+'</h2><p>방문 후 고객 차량으로 함께 귀가할 때는 대리운전, 차량만 다른 지역으로 이동하거나 회수할 때는 탁송을 선택하세요. 출발 주차장과 도착 주소로 예상요금을 확인할 수 있습니다.</p><p><a class="cta" href="tel:18114294">1811-4294 상담</a></p><ul>'+provinces.map(p=>'<li><a href="'+listUrl(p)+'">'+esc(p)+' 해변·항구</a></li>').join('')+'</ul></section>'+(places.length?'<section><h2>장소별 서비스 선택</h2><ul>'+places.map(x=>'<li><strong>'+esc(x.term)+'</strong> · '+esc(x.regionFull)+' · <a href="'+url(x,'daeri')+'">대리운전</a> · <a href="'+url(x,'taksong')+'">탁송</a></li>').join('')+'</ul></section>':'')+'<p>장소 명칭은 공공데이터의 과거 기준 목록과 확인한 통용명을 참고합니다. 운영·개장·출입 가능 여부는 방문 전 해당 관리기관에 확인해주세요.</p>';
  return layout(title,'전국 해변·항구 방문 후 귀가와 차량 회수. 출발·도착 주소별 예상요금 상담 1811-4294.',body,base+listUrl(province),base+'/assets/smart24-daeri-brand.png');
 }
 function page(x,kind){
  const r=bySlug.get(x.regions[0]),service=label(kind),title=x.term+service+' | '+r.full_name+' | '+brand(kind);
  const short=shortName(x.term,x.aliases);
  const image=base+'/card/'+r.slug+'-'+kind+'-brand.png',isBeach=/해수욕장|해변/.test(x.category),other=kind==='daeri'?'taksong':'daeri';
  const guidance=isBeach?'주차장 이름·구역과 차량이 있는 위치를 알려주세요. 해변 입구와 실제 주차장이 다르면 차량이 있는 곳을 기준으로 기사와 만날 장소를 정합니다.':'부두·포구 이름과 일반 차량이 출입할 수 있는 주차장 또는 도로 인계 지점을 알려주세요. 통제 구역 출입과 선적은 별도의 운영 조건을 확인해야 합니다.';
  const purpose=kind==='daeri'?'식사·관광 후 고객 차량에 동승해 귀가하는 대리운전 상담입니다. 경유지, 동승 인원, 주차비 정산과 차키 보관 위치를 확인해주세요.':'고객 동승 없이 운행 가능한 차량을 이동·회수하는 탁송 상담입니다. 차종, 키 전달 방법, 인수·인계 담당자와 차량 상태 확인 방법을 정해주세요.';
  const breadcrumbs=[['홈','/'],['전국 '+service,'/'+kind+'/'],[r.full_name,servicePath(r,kind)],[x.term+service,url(x,kind)]];
  const schema={'@context':'https://schema.org','@type':'WebPage',name:title,url:base+url(x,kind),primaryImageOfPage:{'@type':'ImageObject',url:image,width:1200,height:800},breadcrumb:{'@type':'BreadcrumbList',itemListElement:breadcrumbs.map(([name,p],i)=>({'@type':'ListItem',position:i+1,name,item:base+p}))}};
  const body='<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script><nav>'+breadcrumbs.map(([n,p])=>'<a href="'+p+'">'+esc(n)+'</a>').join(' / ')+'</nav><section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:22px;align-items:center"><a href="tel:18114294"><img src="'+image+'" alt="'+esc(r.full_name+' '+brand(kind)+' 1811-4294 상담 명함')+'" width="1200" height="800" style="width:100%;height:auto;border-radius:12px"></a><div><h2>'+esc(x.term)+service+'</h2><p>'+esc(r.full_name)+' · '+esc(x.aliases.join(' · '))+'</p><p>'+purpose+'</p><a class="cta" href="tel:18114294">1811-4294 전화 상담</a></div></section><section><h2>'+esc(x.term)+' 출발·차량 인계 안내</h2><p>'+guidance+'</p><p>성수기·행사·야간에는 교통과 기사 이동 여건에 따라 배차 시간과 비용이 달라집니다. 실제 출발 시간과 주소로 가능 여부를 상담하세요.</p></section><section><h2>'+service+' 예상요금 계산</h2><form action="/fare/" method="get"><input type="hidden" name="service" value="'+kind+'"><input type="hidden" name="auto" value="1"><label>출발 장소·주소 <input name="from" required maxlength="150" value="'+esc(r.full_name+' '+x.term)+'" style="width:100%"></label><label>도착 주소 <input name="to" required maxlength="150" placeholder="도착할 건물명 또는 주소" style="width:100%"></label><button class="cta" type="submit">도로거리·예상요금 조회</button></form><p>조회 금액은 참고요금이며 확정 배차 금액이 아닙니다. 통행료·주차비·경유·대기와 기사 이동 조건을 확인해 최종 금액을 안내합니다.</p></section><section><h2>지역과 다른 서비스</h2><p><a href="'+url(x,'daeri')+'">'+esc(short)+'대리 · '+esc(short)+'대리운전</a> · <a href="'+url(x,'taksong')+'">'+esc(short)+'탁송</a></p><p><a href="'+servicePath(r,kind)+'">'+esc(r.full_name)+service+'</a> · <a href="'+url(x,other)+'">'+esc(x.term)+label(other)+'</a> · <a href="'+listUrl(r.full_name.split(' ')[0])+'">주변 해변·항구 안내</a></p></section>';
  return layout(title,x.term+' '+service+'. '+purpose+' 출발·도착 주소별 예상요금 확인, 상담 1811-4294.',body,base+url(x,kind),image);
 }
 return {items,byId,url,page,search,regionLinks,directory,provinces,listUrl,urls:['/coast/',...provinces.map(listUrl),...items.flatMap(x=>['daeri','taksong'].map(k=>url(x,k)))]};
};
