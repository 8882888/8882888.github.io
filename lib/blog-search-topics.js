'use strict';

const savedPosts = require('../blog/posts.json');
const topics = [
  { query: '영산강 자전거길 종주', terms: ['영산강', '담양댐', '영산강하구둑'], service: '탁송|차량회수', path: '/route-taksong/courses/yeongsan/', guidance: '담양댐 차량 인수 위치와 영산강하구둑 인계 장소를 확인하세요.' },
  { query: '동해안 자전거길 종주', terms: ['동해안', '통일전망대', '경포대'], service: '탁송|차량회수', path: '/route-taksong/courses/eastcoast/', guidance: '인증센터 이름과 차량이 실제로 주차된 장소를 함께 알려주세요.' },
  { query: '낙동강 자전거길 종주', terms: ['낙동강'], service: '탁송|차량회수', path: '/route-taksong/courses/nakdonggang/', guidance: '출발·도착 인증센터와 차량 인수 희망 시간을 확인하세요.' },
  { query: '설악산 종주탁송', terms: ['설악산', '한계령', '오색', '백담사'], service: '탁송|차량회수', path: '/설악산탁송/', guidance: '등산 시작 주차장과 하산 후 차량을 받을 장소를 따로 정하세요.' },
  { query: '지리산 종주탁송', terms: ['지리산', '성삼재', '중산리', '성중종주', '화대종주'], service: '탁송|차량회수', path: '/지리산탁송/', guidance: '성삼재·중산리 등 코스별 주차 위치와 하산 일정을 확인하세요.' },
  { query: '세종 대리운전', terms: ['세종'], service: '대리운전', path: '/daeri/sejong/', guidance: '출발 건물이나 주차장 이름과 귀가 목적지를 확인하세요.' },
  { query: '세종 탁송', terms: ['세종'], service: '탁송', path: '/taksong/sejong/', guidance: '차량 인수 가능 시간과 도착지 인계 담당자를 확인하세요.' },
  { query: '원주혁신도시 대리운전', terms: ['원주혁신도시', '원주반곡동'], service: '대리운전', path: '/daeri/gangwon/wonju-si/', guidance: '출발 건물과 기사님을 만날 주차장 출입구를 알려주세요.' },
  { query: '진주혁신도시 탁송', terms: ['진주혁신도시', '진주충무공동'], service: '탁송', path: '/taksong/gyeongnam/jinju-si/', guidance: '차량이 있는 주차장과 출고·인계 가능 시간을 알려주세요.' },
  { query: '나주혁신도시 대리운전', terms: ['나주혁신도시', '나주빛가람동'], service: '대리운전', path: '/daeri/jeonnam/naju-si/', guidance: '빛가람동 출발 지점과 장거리 이동 시 경유지를 확인하세요.' },
  { query: '김천혁신도시 탁송', terms: ['김천혁신도시', '김천율곡동'], service: '탁송', path: '/taksong/gyeongbuk/gimcheon-si/', guidance: '율곡동 차량 위치와 키 전달 방법을 확인하세요.' },
  { query: '기장군 탁송', terms: ['기장군', '경동오토필드'], service: '탁송', path: '/taksong/busan/gijang-gun/', guidance: '매매단지의 출고 가능 시각과 차량 인계 담당자를 확인하세요.' }
];

const normalize = text => String(text || '').normalize('NFKC').replace(/\s+/g, '');
const compiledTopics = topics.map(topic => ({
  ...topic,
  servicePattern: new RegExp(topic.service)
}));

function matchTopics(feed = []) {
  const posts = new Map();
  for (const post of [...feed, ...savedPosts]) {
    const match = /^https:\/\/(?:m\.)?blog\.naver\.com\/wjdtnr4757\/(\d+)(?:\?.*)?$/.exec(post.link || post.url);
    if (!match || typeof post.title !== 'string' || !post.title.trim()) continue;
    const url = 'https://blog.naver.com/wjdtnr4757/' + match[1];
    if (!posts.has(url)) posts.set(url, { title: post.title, url, normalized: normalize(post.title) });
  }
  return compiledTopics.map(topic => ({
    query: topic.query,
    path: topic.path,
    guidance: topic.guidance,
    posts: [...posts.values()].filter(post =>
      topic.servicePattern.test(post.normalized) && topic.terms.some(term => post.normalized.includes(term))
    ).slice(0, 3).map(({ title, url }) => ({ title, url }))
  }));
}

function renderSearchTopics(feed, esc) {
  const cards = matchTopics(feed).map(topic => {
    const links = topic.posts.map(post => '<li><a href="' + esc(post.url) + '">' + esc(post.title) + '</a></li>').join('');
    return '<article><h3><a href="' + esc(topic.path) + '">' + esc(topic.query) +
      '</a></h3><p>' + esc(topic.guidance) + '</p>' +
      (links ? '<ul>' + links + '</ul>' : '') + '</article>';
  }).join('');
  return '<section id="blog-search-topics" aria-labelledby="blog-search-topics-title">' +
    '<h2 id="blog-search-topics-title">지역·종주별 예약 안내와 네이버 블로그 글</h2>' +
    '<p>제목이 관련된 공개 글을 함께 모았습니다. 현재 요금과 예약은 서비스 안내에서 확인하세요.</p>' +
    cards + '</section>';
}

module.exports = { matchTopics, renderSearchTopics };
