# 네이버 실제 노출·클릭·CTR 성과 측정 (2026-11-17)

## 구분: 테스트 성공 vs 실제 검색 성과

- `npm run check:seo`는 소스/로컬 응답의 회귀검사이며 네이버 인증 성과가 **아닙니다**. 현재 GitHub `main`의 package.json에서 이 명령은 `tests/seo-sitemap-regression.test.js` 한 파일만 지정합니다. 사용자 작업 PC에서 실행한 8개 파일·66개 케이스의 결과와 혼동하면 안 됩니다.
- `npm run check:naver:official`는 **로컬 정적 JSON 검증/기준표 출력**만 수행합니다. 로그인 네이버 연결, 수집요청, 실제 색인/검색순위·CTR 개선을 수행하지 않습니다.
- `scripts/audit-live-cycling-user-shortcuts-20261117.mjs`는 운영 HTML 존재·정확한 내부링크만 검사합니다. 이 결과를 검색 노출/클릭으로 간주하지 않습니다.

## 2026-11-16 기준선

사용자가 전달한 Manus의 **소유자 로그인 네이버 서치어드바이저 조회** 결과:

| 범위 | 확인된 내용 | 확인 불가 |
|---|---|---|
| 갱신/필터 | 2026-11-16 / 최근 30일 / PC+모바일 | 정확한 데이터 일자별 행 |
| URL TOP 표 | **화면에 보인 14개 URL 행** | 전체 색인 수; URL 표가 TOP 30을 채우지 못한 이유 |
| 검색어 표 | TOP 30은 URL 표와 별도 | URL×검색어 연결, 평균순위 |
| `/taksong/` | 308 노출, 표시 CTR 1.6% | 원본 클릭 수, 해당 URL을 유발한 검색어 |
| `/service/taksong/` | 253 노출, 표시 CTR 1.6% | 원본 클릭 수, 해당 URL을 유발한 검색어 |
| 강릉 대리운전 | 이전 2026-11-05 기준 615 노출, 0 클릭 | 11/16 같은 조건의 값 |

**절대 하면 안 되는 해석:** 14 URL 행 = 색인 14건, CTR 반올림 1.6%를 역산한 클릭 수 = 실제 클릭 수, TOP 30 검색어가 14 URL 중 특정 URL에 대응한다, 평균순위를 알고 있다.

이 자료의 기계판독 기준선은 `data/naver-web-ctr-focused-cohort-20261117.json`에 보존했습니다.

## 다음 실제 검증

1. 네이버 서치어드바이저 **콘텐츠 노출 및 클릭**을 소유자 계정으로 열고 업데이트 기준일, 기간(최근 30일), PC+모바일 조건을 확인합니다.
2. **웹문서 URL TOP 표와 검색어 TOP 표를 각각 별도** 기록합니다. 똑같이 보이는 문구만으로 URL×검색어를 연결하지 않습니다. URL 검사에서 색인/최근 수집일도 별도 확인합니다.
3. **원본 클릭/노출 숫자를 그대로** 수집합니다. 표에 없는 URL은 클릭 0이 아니라 `NOT_IN_REPORTED_URL_TOP_LIST`입니다.
4. 새 소유자 제공 숫자를 아래 형식의 JSON 파일로 기록하여 비교합니다. 아래 형식에서 실제 숫자를 추정하거나 예시 수치로 대체하지 마세요.

필요 필드: `sourceType="owner_reported_naver_searchadvisor"`, `scope="WEB_SEARCH_ONLY"`, `dataUpdatedAt="YYYY-MM-DD"`, `window="최근 30일"`, `device="PC+모바일"`, `pages=[{url,clicks,impressions}]`. 가능하면 `totals={clicks,impressions}`, `urlTableDisplayedRows`와 `keywordTableTopRows`를 별도로 기재합니다.

실제 소유자 확인 파일을 만들었다면:

```bash
node scripts/compare-naver-web-performance-20261117.mjs --latest ./naver-owner-latest.json
```

날짜·기간·기기가 다르면 **비교불가**. 이전 30일과 새 30일 구간이 겹치면 노출/CTR 수치 변화는 **관찰된 추세만** 의미합니다. 클릭 수의 과거 원본이 없으면 클릭 증가율을 만들지 않습니다. 검색 순위나 AI 생성 콘텐츠 효과·색인율도 유추하지 않습니다.

네이버 공식 문서에 따르면 이 성과 리포트는 웹 검색 관련 영역만 다루며 블로그/VIEW/검색광고는 포함하지 않습니다. **업데이트 기준일은 약 1주 전의 검색 데이터**를 기준으로 산정합니다. 수집 직후 다음 날 순위·CTR 개선을 판정할 수 없습니다. 최근 90일까지의 데이터가 제공되므로 원본을 기한 내 보존합니다.

공식 출처:
- https://searchadvisor.naver.com/guide/report-expose-ctr
- https://searchadvisor.naver.com/guide/url-inspection
- https://searchadvisor.naver.com/guide/content-basic

## 실제 목표 및 판정

- **최종 성과**: 소유자 인증 **웹 검색 클릭수 증가**, **노출수 증가**, **CTR 개선**을 각각 공식 숫자로 보고하며, 상담·전화 클릭은 별도 사업 지표로 관리합니다.
- **선행 기술 조건**: 운영 Cloudtype의 `/taksong/`, `/service/taksong/`, `/route-taksong/`, `/설악산탁송/`, `/지리산탁송/`, 강릉 대리운전 URL의 응답/캐노니컬/고유 콘텐츠/내부링크를 유지합니다.
- **주의**: URL의 클릭률만 상승하고 노출과 클릭이 줄어들면 전체 성과가 개선됐다고 판정하지 않습니다. 검색어·URL 표가 제한되면 측정 불충분으로 명시합니다.
- 최근 콘텐츠 수정 후 최신 크롤러 수집일을 확보하지 못하면 단순 메타 수정 효과로 인과관계를 주장하지 않습니다.

수정된 페이지의 title/description만으로 네이버가 어떤 스니펫을 노출할지 보장할 수 없습니다. 이미 네이버 실제 클릭이 확인된 산행·자전거 종주 안내의 제목은 새 비교 근거 없이 일괄 변경하지 않고, 차량회수 조건·실제 기록·예약 정보로의 접근만 보강합니다.
