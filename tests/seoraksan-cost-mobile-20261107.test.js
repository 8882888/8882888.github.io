'use strict';
// Protect verified Seoraksan fare bands and genuine review links while making
// mobile quote-to-call intent discoverable. These are historic guide prices,
// not a guarantee of dispatch or a claim about competitor operations.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','설악산탁송','index.html'),'utf8');
assert(html.includes('<link rel="canonical" href="https://jeongukdaeri.kr/설악산탁송/">'),
 'Existing canonical URL must be preserved');
const title='설악산 차량탁송 비용·코스별 요금표';
assert(html.includes('<title>'+title)&&html.includes('property="og:title" content="'+title),
 'Search and social titles must lead with exact cost/route intent');
assert(html.includes('name="description" content="설악산 차량탁송 비용·종주 차량회수 안내.'),
 'Accurate cost search description must appear in HTML metadata');
const h1=html.indexOf('<h1'),photo=html.indexOf('<figure id="original-mountain-fare-visual"');
const main=html.indexOf('<main>');
const fare=html.indexOf('<section id="mountain-route-fare-table-202611"');
const courseGuide=html.indexOf('<section id="seoraksan-traverse-info-20261106"');
assert(h1>0&&h1<photo&&photo<main&&main<fare&&fare<courseGuide,
 'Visible mobile heading, original fare graphic, route table and full guide must be ordered');
const tbody=html.slice(html.indexOf('<tbody>',fare)+7,html.indexOf('</tbody>',fare));
const pairs=[
 ['오색','소공원','7만원'],['한계령','소공원','8만원'],
 ['백담사','소공원','8만원'],['남교리','소공원','8만원'],
 ['한계령','백담사','8만원'],['오색','백담사','8만원']
];
assert.equal((tbody.match(/<tr>/g)||[]).length,6,'All six original fare rows must remain');
assert.equal((tbody.match(/class="seoraksan-quick-quote-20261107"/g)||[]).length,6,
 'Each route must offer a one-tap current quote link');
for(const [from,to,historicPrice] of pairs){
 const row='<tr><td style="border-bottom:1px solid #d6e2ec;padding:10px">'+from+' → '+to;
 assert(tbody.includes(row),'Missing source-backed route '+from+' → '+to);
 assert(tbody.includes('>'+historicPrice+'</strong>'),'Missing existing historic price '+historicPrice);
 const url='/fare/?service=taksong&amp;from='+encodeURIComponent(from)+'&amp;to='+encodeURIComponent(to);
 assert(tbody.includes('href="'+url+'"'),'Route link must prefill both actual mountain locations '+from+' → '+to);
}
assert(html.includes('id="seoraksan-mobile-booking-20261107"')&&
 html.includes('href="#mountain-route-fare-table-202611">6개 코스 요금표</a>')&&
 html.includes('class="call-quote" href="tel:18114294"'),
 'Mobile sticky CTA must open fare table or national phone');
assert(html.includes('id="original-mountain-fare-visual"')&&
 html.includes('/assets/seoraksan-taksong-original-fare.png')&&
 html.includes("i.src='/assets/seoraksan-taksong-fares.svg'"),
 'Preserve original visual and fallback artwork');
for(const postId of ['224451230156','224453015755']){
 assert(html.includes('blog.naver.com/wjdtnr4757/'+postId),'Published factual ride source not preserved: '+postId);
}
assert(html.includes('기존 안내요금')&&html.includes('현재 확정 견적은 아닙니다'),
 'Historic prices must be clearly separated from actual dispatch quotes');
console.log('PASS: Seoraksan cost search intent, six historical fare rows, direct mobile quotes, genuine review links');
