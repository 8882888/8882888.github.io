'use strict';
// Interactive search cards only. The source regional/route posters and their
// canonical SEO artwork remain unchanged; no false completed-trip claims.
const escapeXml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function render({keyword,region,kind,phone}){
 const label=String(keyword||'').trim(),regionName=String(region||'').trim();
 if(!label||!['taksong','daeri'].includes(kind))return null;
 const isT=kind==='taksong',digits=String(phone||'1811-4294').replace(/[^\d-]/g,'');
 const pieces=Array.from(label);
 const split=pieces.length>25?Math.ceil(pieces.length/2):pieces.length;
 const lines=pieces.length>25?[pieces.slice(0,split).join(''),pieces.slice(split).join('')]:[label];
 const maxLen=Math.max(...lines.map(x=>Array.from(x).length));
 const fontSize=maxLen>26?36:maxLen>21?39:maxLen>17?46:maxLen>13?56:maxLen>9?68:82;
 const service=isT?'자동차탁송 · 인수·이동·인계':'대리운전 · 고객 차량 대신 운전';
 const title=lines.map((x,i)=>'<text x="64" y="'+(lines.length===1?287:246+i*77)+'" font-family="sans-serif" font-size="'+fontSize+'" font-weight="900" fill="#fff04b">'+escapeXml(x)+'</text>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">'+
 '<title id="title">'+escapeXml(label)+' | 스마트24 '+escapeXml(digits)+'</title>'+
 '<desc id="desc">'+escapeXml(regionName)+' '+escapeXml(service)+' 상담 안내용 명함. 실제 운행사진이나 지역 지점·배차 확정 표시가 아닙니다.</desc>'+
 '<defs><linearGradient id="exactBg" x2="1" y2="1"><stop stop-color="'+(isT?'#063f60':'#183b74')+'"/><stop offset="1" stop-color="'+(isT?'#0e8492':'#6474bc')+'"/></linearGradient></defs>'+
 '<rect width="1200" height="800" rx="22" fill="#f1f7fd"/><rect width="1200" height="556" rx="22" fill="url(#exactBg)"/>'+
 '<text x="64" y="101" font-family="sans-serif" font-size="39" font-weight="700" fill="#d5eafd">스마트24 전국 서비스 · '+(isT?'차량탁송':'대리운전')+'</text>'+
 '<text x="64" y="162" font-family="sans-serif" font-size="29" fill="#daedfb">'+escapeXml(regionName)+' 검색어 맞춤 안내</text>'+
 title+
 '<rect x="60" y="354" width="1080" height="92" rx="16" fill="#ffffff" opacity=".15"/>'+
 '<text x="88" y="410" font-family="sans-serif" font-size="37" font-weight="700" fill="#fff">'+escapeXml(service)+'</text>'+
 '<text x="64" y="515" font-family="sans-serif" font-size="31" fill="#e9f5fd">정확한 출발·도착 위치 · 시간 · 기사 복귀 조건 확인</text>'+
 '<text x="64" y="644" font-family="sans-serif" font-size="61" font-weight="900" fill="#113e60">상담 '+escapeXml(digits)+'</text>'+
 '<text x="65" y="706" font-family="sans-serif" font-size="27" fill="#275470">예약 요금과 배차 가능 여부는 상담 후 확인합니다</text>'+
 '<text x="65" y="764" font-family="sans-serif" font-size="23" fill="#3d6377">검색어 맞춤 서비스 이미지 · 실제 운행 완료 사진 아님</text></svg>';
}
module.exports={render};
