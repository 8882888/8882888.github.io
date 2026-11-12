# 스마트24 블로그 검색 주제·SEO 운영

대상: `https://jeongukdaeri.kr/blog/` (Cloudtype Node 동적 사이트). 이 패키지는 **네이버 블로그를 자동 발행하지 않습니다.** 사이트에 저장된 기존 네이버 공개 원문과 RSS를 연결해 지역·산행·자전거길 이용자가 필요한 상세 안내를 찾게 합니다. SEO 1위 또는 검색 색인 보장은 하지 않습니다.

## 설치 및 검사

압축파일의 `lib/`, `scripts/`, `tests/`, `docs/` 파일을 **기존 GitHub 저장소 루트와 병합**합니다. 저장소 전체 교체·기존 운행 기록 덮어쓰기는 금지합니다. `smart24-blog-seo-optimized.patch`는 기존 파일에 대한 차이만 담았습니다. 이미 진행된 별도 변경과 충돌하면 내용을 확인하고 수동으로 병합합니다.

```bash
node --check lib/blog-search-topics.js
node --check lib/naver-blog-feed.js
node tests/blog-search-topics.test.js
node scripts/blog-search-coverage.js
node scripts/blog-search-coverage.js observations.json blog/posts.json
npm run check:seo
```

`node scripts/blog-search-coverage.js`는 대상 저장소의 `blog/posts.json`을 자동으로 사용합니다. ZIP만 별도로 압축 해제한 상황에서는 선택적으로 원본 경로를 두 번째 인자로 전달해야 실제 원문 건수가 집계됩니다.

## 점검 원칙

- 18개 핵심 검색 주제: 영산강·동해안·섬진강·낙동강·금강·오천 자전거길, 설악산·지리산, 세종·원주·진주·나주·김천·기장군·부산·대구·울산.
- 실제 네이버 공개 글의 **제목**에 관련 지명·코스와 탁송 또는 대리운전 의도가 함께 포함된 경우만 연결. 제목만으로 운행 완료나 고객 만족을 새로 주장하지 않음.
- `wjdtnr4757` 블로그의 HTTPS 글 URL만 허용, 중복 제거, 외부 제목 HTML 이스케이프. 실시간 RSS 실패 때 이전 저장 목록을 사용하되 최신 발행으로 오해시키지 않음.
- 기존 홈페이지 상담번호 **1811-4294** 고정. 모바일 터치 대상은 최소 48px. 네이버 블로그에 쓰는 별도 대표번호와 혼용 금지.
- 사진·후기는 사용자가 직접 확인한 것만. 생성 차량 사진 및 카캐리어 자동삽입 금지. 노출 개선을 위한 검색어 기계적 반복 금지.

## 경쟁사 비교 관측값

수기 `observations.json` 배열의 각 행은 다음과 같이 **동일 일자·기기·네이버 검색 영역**에서 기록합니다. 관측 전에는 순위 칸을 비웁니다.

```json
[
  {"query":"영산강 자전거길 종주","date":"2026-11-12","device":"모바일","area":"웹 검색","smart24":"","darigo":"","kDaeri":"","goldTaksong":""}
]
```

네이버 서치어드바이저의 홈페이지 검색 노출·클릭과 네이버 블로그 검색 결과는 다른 지표입니다. 페이지가 정상 응답하는 것과 실제 모바일 전화 앱이 실행되는 것도 각각 검증해야 합니다. 변경 코드는 Cloudtype에 **공식 운영 서버**로 배포된 후 공개 URL로 재검증해야 합니다.
