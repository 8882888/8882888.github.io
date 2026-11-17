# 네이버 실측 4대 KPI 증감 산출 기준 (2026-11-18)

최종 목표는 **실제 색인 +몇 건, 노출 +몇 회, 클릭 +몇 회, CTR +몇 %p**를 모두 네이버 서치어드바이저 소유자 확인 화면의 원본 숫자로 뒷받침하는 것입니다. GitHub CI·Cloudtype 테스트·사이트맵·모의 Yeti·사용자 전화 클릭 수는 네이버 웹 검색 KPI가 아닙니다.

## 현재 실제 확인 상태

- GitHub의 `data/naver-searchadvisor-official-baseline.json`: 인덱싱 공식 기준 `null`. 과거 14건 주장은 확인 날짜/진단 근거가 없어 실제 색인 수로 사용할 수 없습니다.
- 2026-11-16 갱신 URL 표 표시 **14개 행은 전체 색인 14건이 아닙니다**.
- `/taksong/` 노출 308회, 표시 CTR 1.6%; `/service/taksong/` 노출 253회, 표시 CTR 1.6%. 개별 URL 정확한 클릭수 제공 안 됨.
- 최신 사이트 전체 공식 클릭/노출 합계 및 실제 사이트 진단 정상 색인값 두 시점이 **없으므로 네 KPI의 증가량은 모두 미확인**입니다.
- 네이버 웹 검색 URL 표와 검색어 표는 각각 상위 30건까지만 제공됩니다. 해당 TOP 목록 합계는 사이트 전체 합계가 아닙니다.

## 공식 자료 수집

1. 네이버 서치어드바이저의 **콘텐츠 노출 및 클릭 > 요약**에서 동일한 기기(예: PC+모바일), 동일 조회 기간(예: 최근 30일)의 **사이트 전체 클릭수, 노출수**를 변경 전·후 각각 기록합니다. 두 시점의 업데이트 기준일과 실제 조회 구간 시작·종료일을 함께 기록합니다.
2. **사이트 진단** 화면의 정상 색인 건수를 두 관측일 각각 기록합니다. 사이트 진단의 색인수는 콘텐츠 노출 및 클릭의 URL 표 행 수와 다릅니다.
3. **URL 검사**는 해당 URL의 수집/색인 가능/색인 여부 판단에 사용하며, 사이트 전체 색인수 합계를 추산하는 데 사용하지 않습니다.
4. 진단값이 없는 경우 `index: null`로 남깁니다. 표에 없는 URL/검색어의 클릭을 0으로 간주하지 않습니다.

## 자동 증감 계산 (실제 소유자 확인 원본을 입력한 경우만)

아래 구조로 두 시점의 실측 JSON 파일을 저장합니다. 숫자 자리는 **실제 화면에서 확인한 정수만** 입력하고, 예시 숫자를 입력해서 공식 개선으로 발표하지 마세요.

```json
{
  "sourceType": "owner_reported_naver_searchadvisor",
  "site": "https://jeongukdaeri.kr",
  "search": {
    "scope": "WEB_SEARCH_ONLY",
    "updatedAt": "YYYY-MM-DD",
    "periodStart": "YYYY-MM-DD",
    "periodEnd": "YYYY-MM-DD",
    "device": "PC+모바일",
    "clicks": 0,
    "impressions": 0
  },
  "index": null
}
```

위 예시의 0은 실제 실측값을 뜻하지 않습니다. 클릭수·노출수는 실제 화면 수치가 없으면 스냅샷 자체를 작성하지 마세요. 색인건수를 확인했다면 `"index": {"observedAt":"YYYY-MM-DD","indexed": 실제정수}`로 대체합니다.

```bash
npm run check:naver:official
node scripts/measure-naver-four-official-kpis-20261118.mjs --before ./owner-before.json --after ./owner-after.json
```

공식 출처·필터·기간·수치를 검증한 뒤 프로그램은 네 지표의 이전·현재·차이를 각각 출력합니다. 두 보고서 모두 없으면 `미확인`을 출력하며 0으로 꾸미지 않습니다. CTR은 `클릭수 ÷ 노출수 × 100`; 변화는 **퍼센트포인트(%p)**입니다.

**비교 주의:** 30일 조회 구간이 서로 겹친다면 변화의 산술값은 계산할 수 있어도 SEO 수정에 의한 증가량으로 귀속할 수 없습니다. 기기·기간 길이·날짜 방향이 다르면 비교불가입니다. 클릭수·노출수로 전화 상담·실제 고객 수를 추정하지 않습니다.

## 출처

- 네이버 콘텐츠 노출 및 클릭 안내: https://searchadvisor.naver.com/guide/report-expose-ctr
- 네이버 사이트 진단(정상 색인/수집제한/색인제외의 차이): https://searchadvisor.naver.com/guide/report-diagnosis
- 네이버 URL 검사: https://searchadvisor.naver.com/guide/url-inspection

이 가이드는 두 공식 기간의 **정확한 실측 데이터를 전사하기 위한 방법**이며, 네이버 계정에 자동 로그인하거나 API로 실측값을 가져온다는 뜻이 아닙니다.
