## v3 운영 서버 통합

지역 상세 본문·공개 운행기록 렌더링과 관련 대표 URL 연결을 추가했습니다. `npm run opportunities`는 유사 본문과 실측 CTR의 편집 우선순위를 분석합니다. 신규 상세 페이지는 검토 전 noindex를 유지합니다. 운영 서버가 지역 데이터와 운행 데이터를 함께 전달하며 기존 홈페이지 서버를 사용합니다. GitHub 반영과 Cloudtype 운영 반영은 별도로 확인해야 합니다.

## 공식 스마트24 홈페이지 GitHub 통합

이 파일은 사용자 제공 v2 패키지를 기존 Node 서버의 `data/smart24-region-automation/`에 통합한 설명서입니다. 기존 홈페이지 서버와 운행기록 원본을 덮어쓰지 않습니다. 14지역×2서비스 중 2개는 기존 대표 URL로 301 연결, 26개는 noindex 미승인 초안이며, 기존 페이지 2곳에는 원문 대조한 공개 기록을 보충합니다. GitHub 통합만으로 Cloudtype 운영 배포 또는 네이버 검색 노출이 완료되었다고 의미하지 않습니다.

---

# SMART24 지역 자동화 v2 — 경쟁 사이트 비교 반영

고수대리운전(gosudaeri.com), 케이대리운전(kdaeri.com), 스마트24(jeongukdaeri.kr)의 공개 페이지를 비교하고 기존 v1을 개선했습니다. **소스·본문 교체 블록·검사 도구 제작 완료 상태이며 운영 사이트 미배포입니다.** 상세 비교는 `docs/competitor-comparison-20261112.md`를 확인하세요.

## 핵심 기능

- 기존 지역 URL 보존과 신규 중복 URL 301 통합
- 기존 페이지에 삽입할 지역별 요금조회·준비사항·운행기록·예약 질문 블록 생성
- 실제 공개 기록만 연결, 서비스 혼입 방지, 출발/도착 방향 구분
- 지역 JSON/운행 JSON 변경에 따른 본문 블록 자동 갱신
- 동명 지역 선택 화면, HTML 이스케이프, 404/503 처리
- HTTP 표본 기술검사, 네이버 노출·클릭 전후 비교

홈페이지 대표번호 **1811-4294** 유지. 기존 요금 계산 API를 새로 만들거나 교체하지 않습니다. /fare/ 링크는 실제 운영 사이트의 기존 입력 파라미터를 사용합니다. 요금 계산의 정상 완료·실제 통화 연결 여부는 이번 검사 범위가 아닙니다.

## 실행

Node.js 22 이상, Python 3.10 이상. 외부 패키지 설치 불필요.

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
npm run check
npm run enhance
npm start
```

http://localhost:3000/local-service/ 에서 지역 검색을 사용할 수 있습니다. 등록된 세종 대리운전·부산 탁송은 공식 기존 주소로 이동합니다. 그 외 안내는 검토용 noindex 초안입니다. 신규 지역 상세 페이지 28개 슬롯 중 2개는 기존 주소 리다이렉트, 26개는 초안입니다. 지역 허브 1개는 기존 공개 페이지를 연결합니다.

## 기존 서버에 적용하는 방법 (권장)

`generated/sejong-daeri.html`, `generated/busan-taksong.html`은 독립 페이지가 아닌 본문 조각입니다. 운영 페이지의 반복되는 요금·운행기록·예약 안내 영역을 정리하여 이 조각으로 **교체**하세요. 추가로 덧붙이면 중복 정보가 늘어납니다. 기존 head·canonical·H1·지역 계층 링크·다른 고유 콘텐츠는 유지합니다.

동적 서버에서는 파일 생성 없이 아래 함수를 사용합니다.

```js
const path = require('node:path');
const {createEnhancer} = require('./smart24-region-automation/lib/enhance');
const blockForPath = createEnhancer(
  path.join(__dirname, 'smart24-region-automation/data/regions.json'),
  path.join(__dirname, 'smart24-region-automation/data/trips.json')
);
// 기존 템플릿이 렌더링될 때, 요금·기록 영역 자리에 한 번만 사용:
const block = blockForPath('/daeri/sejong/');
// block은 검증 및 이스케이프된 HTML 조각입니다.
// 프레임워크에 맞는 HTML 삽입 방식으로 기존 영역을 교체하세요.
```

다음 호출 때 데이터 변경을 감지해 다시 생성합니다. 잘못된 데이터는 오류를 발생시키므로 기존 서버에서는 로그를 남기고 기존 본문을 유지하는 예외 처리를 적용하세요. 요청마다 파일을 읽는 방식으로 대규모 고빈도 트래픽 최적화까지 완료한 것은 아닙니다.

기존 서버의 최종 404 앞에 아래 핸들러를 연결하면 /local-service/ 검색과 301 기능을 사용할 수 있습니다.

```js
const {createEngine} = require('./smart24-region-automation/lib/engine');
const regionalHandler = createEngine(path.join(__dirname,'smart24-region-automation/data/regions.json'));
// 기존 HTTP 핸들러의 최종 404 이전:
if (regionalHandler(req, res)) return;
```

Express는 접두 경로를 제거하지 않도록 `app.use((req,res,next)=>{ if(!regionalHandler(req,res)) next(); });`를 사용합니다. 실제 운영 저장소를 이번 작업에서 수정하지 않았으므로 병합 위치와 기존 기능 회귀 검증은 적용 시 필요합니다. 독립 데모용 server.js를 기존 Cloudtype 앱 전체와 교체하지 마세요.

## 지역·운행 데이터 확장

`data/regions.json`: 지역 id, 이름, 별칭, 서비스별 text/approved, 기존 URL인 existingPath, 장소별 details를 관리합니다. 기존 경로는 실제 응답·내용을 확인한 후 등록하세요. 한 서비스에 하나의 대표 경로만 사용합니다. existingPath는 다른 도메인이나 /local-service/ 경로를 허용하지 않습니다.

새 페이지 공개는 고유 본문 보완, approved=true, reviewedBy, updatedAt 입력이 필요합니다. 최소 120자 검사는 입력 검증일 뿐 품질·순위 기준이 아닙니다. 기존 경로가 등록된 서비스는 approved와 무관하게 신규 주소를 검색 제출하지 않습니다.

`data/trips.json`: 현재 4건은 공식 공개 원문을 대조했습니다. verified는 원문 사실 대조 여부, publicAllowed는 공개 허용 여부입니다. 이미 공개된 최소 정보만 넣었으며, 비공개 자료를 넣을 때는 개인정보와 공개 권한을 먼저 확인하세요. 임의로 두 값을 true로 바꾼다고 사실 검증이 되는 것은 아닙니다.

기록 필드: id, service, date, from/to(공개용 지역명), fromRegion/toRegion(지역 사전 ID), fare(당시 요금), sourceUrl(자사 운행 원문), checkedAt, verified, publicAllowed. 기록에 없는 차종·시간·보험·후기를 생성하지 않습니다. 도착 사례를 역방향 운행으로 바꾸지 않습니다. 기존 2,591건 원본을 삭제하거나 덮어쓰지 않습니다.

## 검사와 성과 비교

```bash
# 최대 30개 URL, 동시 3요청, 응답당 2MB 제한
npm run audit
# 대상: data/audit-targets.json, 결과: reports/public-audit.json

# 네이버에서 내려받은 자료를 제공 양식 열 이름으로 정리한 뒤 실행
python3 scripts/metrics.py before.csv after.csv
```

CSV 열: period_start,period_end,query,impressions,clicks. `data/naver-metrics-template.csv`는 빈 양식입니다. 같은 길이·겹치지 않는 두 기간만 비교하며, 빠진 검색어를 0으로 간주하지 않습니다. 결과는 `reports/naver-change.json`. 실제 노출·클릭 수는 입력되지 않았으므로 현재 성과 보고서는 만들지 않았습니다. 자동 로그인·검색 순위 조작·허위 방문 기능은 없습니다.

HTTP 검사 결과는 실제 브라우저 화면, 클릭 가능성, 모바일 전화 앱 실행, Core Web Vitals 측정 결과가 아닙니다. 사이트맵 전체·행정구역 전체 검사도 아닙니다. 경쟁사 내역이 일시 차단되면 미확인으로 보고합니다.

## 빌드·배포

`npm run build`는 정적 미리보기를 생성합니다. 리다이렉트 대상 페이지는 HTML을 만들지 않고 dist/redirects.json으로 별도 출력합니다. 이 파일을 일반 정적 서버가 자동 적용하지는 않습니다. 운영에는 Node 핸들러 또는 호스팅의 301 설정이 필요합니다. 미리보기 디렉터리를 운영 루트에 통째로 복사하지 마세요.

기존 robots.txt/사이트맵을 보존하세요. 모듈의 허브를 공개할 경우에만 `/local-service/sitemap.xml`을 추가로 연결합니다. 기존 지역 URL은 기존 사이트맵이 관리합니다. 사이트맵 제출과 색인 확인은 서치어드바이저에서 별도 수행합니다.

배포 후에는 기존 요금조회, 기사모집, 1811-4294 전화 링크, 공개 운행 원문, 대표 URL, 모바일 실제 터치를 확인하세요. 이번 패키지에는 배포 완료나 검색 순위 상승을 증명하는 결과가 포함되지 않습니다.

## 포함 파일

- lib/engine.js: 지역 검색·HTML·301·사이트맵
- lib/enhance.js: 기존 페이지용 기록·요금·예약 블록
- data/: 지역·공개 기록·검사 URL·네이버 CSV 양식
- generated/: 기존 2개 페이지용 교체 HTML과 전체 확장 계획
- scripts/audit.py, metrics.py: 기술검사 및 실측 성과 비교
- reports/public-audit.json: 10개 공개 URL 검사 결과
- docs/competitor-comparison-20261112.md: 비교 근거와 우선 적용안
- blog-seo-addon/: 이전 블로그 연결 패키지 보존. 별도 통합 필요.

이 README가 v2 기준입니다. docs/v1-reference.md는 이력 참고용이며 v2와 다를 경우 이 문서를 따릅니다.
