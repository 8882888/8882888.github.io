'use strict';
// Search-intent aliases only: no combinatorial SEO pages, no implied availability.
// Each synonym resolves to one human-authored canonical information page.
const AERIAL='/service/aerial-work-truck-taksong/';
const HEAVY='/service/heavy-truck-taksong/';
const LADDER='/service/ladder-truck-taksong/';
const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s,_.-]+/g,'');
const aerial=/^(?:전국)?(?:(?:[0-9]+(?:\.[0-9]+)?톤))?(?:화물차)?(?:고소작업대차량|고소작업차량|고소차량|고소작업차|고소차|스카이차|바가지차|버킷차|버킷트럭)(?:차량|자동차)?탁송$/;
const ladder=/^(?:전국)?(?:[0-9]+(?:\.[0-9]+)?톤)?(?:이삿짐|이사용|이사|화물용|건설용|차량탑재형)?(?:사다리차량|사다리작업차량|사다리작업차|사다리차|사다리트럭)(?:차량|자동차)?탁송$/;
const workVehicle=/^(?:전국)?(?:(?:[0-9]+(?:\.[0-9]+)?톤))?(?:카고크레인|이동식크레인|크레인차|집게차|활선차|전기작업차|노면청소차|도로청소차|청소차|살수차|펌프카|콘크리트펌프카|암롤차|암롤트럭|작업차량|작업차|특장차|화물차)(?:차량|자동차)?탁송$/;
function resolve(raw){
 const text=normalize(raw);
 if(!text||text.length>90)return null;
 if(aerial.test(text))return AERIAL;
 if(ladder.test(text))return LADDER;
 if(workVehicle.test(text))return HEAVY;
 return null;
}
module.exports={resolve,normalize,AERIAL,LADDER,HEAVY};
