'use strict';
// Mark up only publicly visible service information on existing canonical pages.
// This is not a manufacturer/repair-center affiliation, completed-ride or price claim.
const SITE='전국대리운전';
const FEATURED_BRANDS=new Set(['벤츠서비스센터탁송','볼보서비스센터탁송','현대서비스센터탁송']);
const HUB_PATH='/taksong/types/';

function pageGraph({canonicalUrl,name,description,kind,groups=[]}){
 const url=new URL(canonicalUrl);
 if(url.protocol!=='https:')throw Error('Service schema requires HTTPS');
 if(kind!=='hub'&&kind!=='brand')throw Error('Invalid service schema kind');
 if(kind==='hub'&&url.pathname!==HUB_PATH)throw Error('Service schema hub path mismatch');
 if(kind==='brand'&&!/^\/taksong\/type\/[a-f0-9]+\/$/.test(url.pathname))throw Error('Service schema brand path mismatch');
 const base=url.origin+'/',path=url.href;
 const breadcrumbs=[
  {name:'스마트24 홈페이지',url:base},
  {name:'자동차탁송',url:base+'taksong/'},
  ...(kind==='brand'?[{name:'차종별·서비스센터탁송',url:base+'taksong/types/'}]:[]),
  {name,url:path}
 ];
 const groupList=kind==='hub'?{
  '@type':'ItemList','@id':path+'#categories',
  name:'서비스센터 차량 유형별 입출고 안내',
  itemListElement:groups.map((g,i)=>({
   '@type':'ListItem',position:i+1,name:g.title,url:path+'#'+g.id
  }))
 }:null;
 const page={
  '@type':kind==='hub'?'CollectionPage':'WebPage',
  '@id':path+'#webpage',url:path,name,description,
  inLanguage:'ko-KR',
  isPartOf:{'@id':base+'#website'},
  breadcrumb:{'@id':path+'#breadcrumb'},
  mainEntity:{'@id':path+'#service'}
 };
 if(groupList)page.hasPart={'@id':groupList['@id']};
 const service={
  '@type':'Service','@id':path+'#service',
  name:kind==='hub'?'스마트24 국산차·수입차·상용차 서비스센터 차량탁송 예약 상담':name,
  serviceType:'차량 운행 가능 상태와 기사 자격을 확인한 자동차 서비스센터 입고·출고 로드탁송 상담',
  description,
  url:path,
  provider:{'@type':'Organization',name:SITE,url:base},
  areaServed:{'@type':'Country',name:'대한민국'}
 };
 const breadcrumb={
  '@type':'BreadcrumbList','@id':path+'#breadcrumb',
  itemListElement:breadcrumbs.map((b,i)=>({
   '@type':'ListItem',position:i+1,name:b.name,item:b.url
  }))
 };
 return {'@context':'https://schema.org','@graph':[page,service,breadcrumb,...(groupList?[groupList]:[])]};
}
function injectServiceCenterSchema(html,options){
 if(typeof html!=='string'||!html.includes('</head>'))throw Error('Expected complete HTML page');
 const {canonicalUrl}=options;
 if(!html.includes('<link rel="canonical" href="'+canonicalUrl+'">'))
  throw Error('Structured data cannot contradict canonical URL '+canonicalUrl);
 if(html.includes('id="service-center-schema-v1"'))
  throw Error('Duplicate service-center JSON-LD node');
 const schema=pageGraph(options);
 const safe=JSON.stringify(schema).replace(/</g,'\\u003c');
 return html.replace('</head>','<script id="service-center-schema-v1" type="application/ld+json">'+safe+'</script></head>');
}
module.exports={FEATURED_BRANDS,pageGraph,injectServiceCenterSchema};
