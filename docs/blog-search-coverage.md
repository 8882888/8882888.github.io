# 스마트24 블로그 검색 주제 운영

Cloudtype Node 서버의 `/blog/` 상단은 `lib/blog-search-topics.js`의 주제를 읽어 기존 서비스 상세 페이지와 관련 네이버 공개 글을 연결합니다. 새 주제는 검색어, 제목에 나타나는 지역·코스명, 서비스 표현, 기존 상세 URL, 현장 안내 한 문장으로 추가합니다. 최신 RSS를 우선하고 저장된 원문으로 보완하며, 같은 게시글은 주제 안에서 한 번만 표시합니다.

```bash
npm run check:seo
node scripts/blog-search-coverage.js
node scripts/blog-search-coverage.js observations.json
```

점검 명령은 저장된 원문 후보를 기준으로 검색 주제별 연결 현황을 출력합니다. `observations.json`은 선택 입력입니다. 배열의 각 항목에 `query`, `date`, `device`, `area`, `smart24`, `darigo`, `kDaeri`, `goldTaksong`을 기록하세요. `query`는 명령 출력에 표시되는 값과 일치시킵니다. 예를 들어 `device`는 모바일, `area`는 블로그 탭을 입력하고 업체별 값에는 같은 화면에서 관찰한 순위나 `미노출`을 입력합니다. 확인 전에는 빈 값으로 둡니다.

웹사이트 노출·클릭은 네이버 서치어드바이저에서 확인하고, 블로그 검색 순위는 같은 검색어·기기·검색 영역의 관측값끼리 비교합니다. 새 글은 원문 후보가 없는 주제부터 현장 정보와 공개 가능한 실제 자료를 확인한 후 네이버 편집기에서 발행합니다.
