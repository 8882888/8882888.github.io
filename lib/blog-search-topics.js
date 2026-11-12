'use strict';

// The hub links to real, already-published Naver posts. This module never publishes
// blog posts or creates artificial trip reviews, and does not infer search rankings.
let savedPosts = [];
try { savedPosts = require('../blog/posts.json'); }
catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
if (!Array.isArray(savedPosts)) savedPosts = [];

const TOPICS = Object.freeze([
  { query: '영산강 자전거길 종주', kind: 'taksong', group: 'cycling', terms: ['영산강', '담양댐', '영산강하구둑'], path: '/route-taksong/courses/yeongsan/', guidance: '담양댐 주차장과 영산강하구둑 차량 인계 위치를 구분하여 예약하세요.' },
  { query: '동해안 자전거길 종주', kind: 'taksong', group: 'cycling', terms: ['동해안', '통일전망대', '경포대', '은어다리', '영덕해맞이공원'], path: '/route-taksong/courses/eastcoast/', guidance: '강원·경북 구간, 라이딩 방향과 차량 이동 방향, 인계 장소를 구분하세요.' },
  { query: '섬진강 자전거길 종주', kind: 'taksong', group: 'cycling', terms: ['섬진강', '배알도'], path: '/route-taksong/courses/seomjin/', guidance: '생활체육공원 주차 위치와 배알도 차량 인계 장소를 확인하세요.' },
  { query: '낙동강 자전거길 종주', kind: 'taksong', group: 'cycling', terms: ['낙동강'], path: '/route-taksong/courses/nakdonggang/', guidance: '출발·도착 인증센터와 자동차를 맡길 시간 및 장소를 확인하세요.' },
  { query: '금강 자전거길 종주', kind: 'taksong', group: 'cycling', terms: ['금강자전거', '금강길', '금강종주'], path: '/route-taksong/courses/geumgang/', guidance: '이용할 인증센터와 차량의 실제 주차 위치를 정확히 알려주세요.' },
  { query: '오천 자전거길 종주', kind: 'taksong', group: 'cycling', terms: ['오천자전거', '오천길', '오천종주'], path: '/route-taksong/courses/ocheon/', guidance: '종주 출발지와 도착지의 차량 진입·인수 가능 위치를 확인하세요.' },
  { query: '설악산 종주탁송', kind: 'taksong', group: 'mountain', terms: ['설악산', '한계령', '오색', '백담사', '소공원'], path: '/설악산탁송/', guidance: '오색·한계령 등 실제 주차장과 하산 후 차량 인계 위치를 확인하세요.' },
  { query: '지리산 종주탁송', kind: 'taksong', group: 'mountain', terms: ['지리산', '성삼재', '중산리', '성중종주', '화대종주'], path: '/지리산탁송/', guidance: '성삼재·중산리 등 코스별 주차장과 하산 일정을 구분하세요.' },
  { query: '세종 대리운전', kind: 'daeri', group: 'regional', terms: ['세종'], path: '/daeri/sejong/', guidance: '건물·주차장 출발 위치와 목적지, 장거리 여부를 알려주세요.' },
  { query: '세종 탁송', kind: 'taksong', group: 'regional', terms: ['세종'], path: '/taksong/sejong/', guidance: '차량 인수 가능 시간과 도착지 인계 담당자를 확인하세요.' },
  { query: '원주혁신도시 대리운전', kind: 'daeri', group: 'regional', terms: ['원주혁신도시', '원주반곡동', '반곡동'], path: '/daeri/gangwon/wonju-si/', guidance: '반곡동·원주혁신도시의 정확한 출발 건물과 주차장 입구를 알려주세요.' },
  { query: '진주혁신도시 탁송', kind: 'taksong', group: 'regional', terms: ['진주혁신도시', '진주충무공동', '충무공동'], path: '/taksong/gyeongnam/jinju-si/', guidance: '충무공동 차량 주차장과 출고·인계 가능 시간을 확인하세요.' },
  { query: '나주혁신도시 대리운전', kind: 'daeri', group: 'regional', terms: ['나주혁신도시', '나주빛가람동', '빛가람동'], path: '/daeri/jeonnam/naju-si/', guidance: '빛가람동의 출발 위치와 장거리 경유지를 확인하세요.' },
  { query: '김천혁신도시 탁송', kind: 'taksong', group: 'regional', terms: ['김천혁신도시', '김천율곡동', '율곡동'], path: '/taksong/gyeongbuk/gimcheon-si/', guidance: '율곡동 차량 위치와 키 전달·인수인계 방법을 확인하세요.' },
  { query: '기장군 탁송', kind: 'taksong', group: 'regional', terms: ['기장군', '기장읍', '정관읍', '경동오토필드'], path: '/taksong/busan/gijang-gun/', guidance: '기장군 출고 장소와 차량 인수·인계 담당자를 확인하세요.' },
  { query: '부산 자동차탁송', kind: 'taksong', group: 'regional', terms: ['부산'], path: '/taksong/busan/', guidance: '부산 지역 출발지·도착지와 차종, 인수 가능 시간을 확인하세요.' },
  { query: '대구 자동차탁송', kind: 'taksong', group: 'regional', terms: ['대구'], path: '/taksong/daegu/', guidance: '대구 출발 차량의 정확한 주차 위치와 인계 시간을 확인하세요.' },
  { query: '울산 대리운전', kind: 'daeri', group: 'regional', terms: ['울산'], path: '/daeri/ulsan/', guidance: '출발 위치, 도착지, 심야·장거리 여부를 함께 알려주세요.' }
]);

const normalize = text => String(text || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const pattern = { taksong: /(탁송|차량회수|차량이동)/, daeri: /(대리운전|장거리대리|일일기사)/ };
const allowedPost = url => {
  // Do not use untrusted RSS URLs directly in the public HTML.
  if (typeof url !== 'string') return null;
  const m = /^https:\/\/(?:m\.)?blog\.naver\.com\/wjdtnr4757\/(\d{7,15})(?:[?#][^\s]*)?$/i.exec(url.trim());
  return m ? 'https://blog.naver.com/wjdtnr4757/' + m[1] : null;
};
function normalizedPosts(feed, archive) {
  const all = new Map();
  for (const raw of [...(Array.isArray(feed) ? feed : []), ...(Array.isArray(archive) ? archive : [])]) {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) continue;
    const url = allowedPost(raw.link) || allowedPost(raw.url);
    if (!url || all.has(url)) continue;
    const title = raw.title.trim().slice(0, 200);
    all.set(url, { title, url, normalized: normalize(title) });
  }
  return [...all.values()];
}
function matchTopics(feed = [], archive = savedPosts) {
  const posts = normalizedPosts(feed, archive);
  return TOPICS.map(topic => {
    const terms = topic.terms.map(normalize);
    const q = normalize(topic.query);
    const matches = posts.map((post, order) => {
      if (!pattern[topic.kind].test(post.normalized)) return null;
      const termHits = terms.filter(term => post.normalized.includes(term));
      if (!termHits.length) return null;
      // Prefer explicit locality/course references over passing destination mentions.
      const score = (post.normalized.includes(q) ? 6 : 0) +
        (post.normalized.startsWith(terms[0]) ? 4 : 0) +
        (post.normalized.startsWith(q) ? 4 : 0) +
        Math.min(termHits.length, 3) +
        (/운행완료|실제운행|요금|완벽정리|코스/.test(post.normalized) ? 1 : 0);
      return { ...post, score, order };
    }).filter(Boolean).sort((a,b) => b.score - a.score || a.order - b.order);
    return { query: topic.query, kind: topic.kind, group: topic.group,
      path: topic.path, guidance: topic.guidance,
      totalMatches: matches.length, posts: matches.slice(0, 2).map(({title,url})=>({title,url})) };
  });
}
function renderSearchTopics(feed, esc) {
  if (typeof esc !== 'function') throw new TypeError('HTML escaping callback required');
  const topics = matchTopics(feed);
  const groups = [
    ['cycling','자전거길 종주 차량탁송'],
    ['mountain','산행 종주 차량탁송'],
    ['regional','지역별 대리운전·자동차탁송']
  ];
  const used = new Set();
  const sections = groups.map(([group,label]) => {
    const cards = topics.filter(t=>t.group===group).map(t => {
      // A post may match multiple routes; avoid repeating the same external URL on this hub.
      const unique = t.posts.filter(p => !used.has(p.url));
      unique.forEach(p=>used.add(p.url));
      const links=unique.length ? '<ul>'+unique.map(p=>'<li><a rel="noopener noreferrer" target="_blank" href="'+esc(p.url)+'">'+esc(p.title)+'</a></li>').join('')+'</ul>' : '';
      return '<article style="min-width:0;padding:12px;border:1px solid #dbe5ef;border-radius:10px;overflow-wrap:anywhere"><h4><a href="'+esc(t.path)+'">'+esc(t.query)+'</a></h4><p>'+esc(t.guidance)+'</p>'+links+'</article>';
    }).join('');
    return '<section aria-label="'+esc(label)+'"><h3>'+esc(label)+'</h3><div class="blog-topic-cards">'+cards+'</div></section>';
  }).join('');
  return '<section id="blog-search-topics" aria-labelledby="blog-search-topics-title">'+
    '<h2 id="blog-search-topics-title">지역·종주별 서비스 정보와 공개 네이버 블로그 원문</h2>'+
    '<p>주제별로 실제 공개된 글의 제목과 출처를 확인해 연결합니다. 원문이 없는 주제는 예약 정보만 안내하며, 배차 완료나 검색 순위를 의미하지 않습니다.</p>'+
    '<nav aria-label="요금조회 및 전화상담" style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0">'+
    '<a href="/fare/?service=taksong" style="display:inline-flex;align-items:center;min-height:48px;padding:8px 14px;border-radius:8px;background:#e5f0fc">자동차탁송 예상요금</a>'+
    '<a href="/fare/?service=daeri" style="display:inline-flex;align-items:center;min-height:48px;padding:8px 14px;border-radius:8px;background:#e5f0fc">대리운전 예상요금</a>'+
    '<a href="tel:18114294" style="display:inline-flex;align-items:center;min-height:48px;padding:8px 14px;border-radius:8px;background:#ffdc55;color:#102544">전화상담 1811-4294</a></nav>'+
    sections + '</section>';
}
module.exports = { TOPICS, allowedPost, matchTopics, renderSearchTopics };
