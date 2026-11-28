'use strict';
// Reviewed public photographs only: exact source and commercial-use license per record.
const records=require('../data/regional-scenic-photos-20261128.json');
const byProvince=new Map(records.map(x=>[x.province,x]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoUrl=r=>'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(r.file.replace(/ /g,'_'))+'?width=960';
const allowed=new Set(records.map(photoUrl));
function isApprovedScenicPhoto(url){return allowed.has(String(url).replace(/&amp;/g,'&'))}
function lookup(fullName){
 const province=String(fullName||'').trim().split(/\s+/)[0];
 return byProvince.get(province==='강원도'?'강원특별자치도':province==='전라북도'?'전북특별자치도':province);
}
function render(region){
 const row=lookup(region?.full_name);if(!row)return '';
 return '<section id="regional-scenic-photo-20261128" aria-label="'+esc(row.province)+' 대표 풍경사진" style="margin:16px 0">'+
 '<h2>'+esc(row.province)+' 대표 풍경사진</h2><figure style="margin:0;max-width:960px">'+
 '<a href="'+esc(row.source)+'"><img src="'+esc(photoUrl(row))+'" alt="'+esc(row.place)+' 실제 풍경사진" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="display:block;max-width:100%;width:100%;max-height:460px;object-fit:contain;height:auto;background:#f1f5f8;border-radius:12px"></a>'+
 '<figcaption style="font-size:14px;line-height:1.6;margin-top:8px">'+esc(row.place)+' · 촬영: '+esc(row.author)+' · <a href="'+esc(row.source)+'">사진 원본 및 출처</a> · <a href="'+esc(row.licenseUrl)+'">'+esc(row.license)+'</a> (축소 표시, 내용 편집 없음). '+
 '해당 시·도를 소개하는 대표 풍경이며, 선택한 세부 행정구역의 실제 운행이나 인수 장소를 촬영한 사진은 아닙니다.</figcaption></figure></section>';
}
module.exports={records,lookup,photoUrl,isApprovedScenicPhoto,render};
