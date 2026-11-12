## 스마트24 공식 홈페이지 통합 상태

이 폴더는 기존 jeongukdaeri.kr Node 서버의 `/local-service/` 경로에서 호출되는 격리 모듈입니다. 기존 24개 페이지는 모두 미승인 초안(noindex)이므로 검색 색인 제출 대상이 아닙니다. 기존 `/daeri/` 및 `/taksong/` 경로의 페이지·요금·운행기록·전화 통화를 덮어쓰지 않습니다. 운영 승인 시 기존 canonical 중복을 반드시 먼저 검토하세요. 기존 블로그 모듈은 메인 저장소 lib/에 통합되어 있어 중복 복사하지 않았습니다.

---

# SMART24 지역+대리운전·탁송 자동화 프로그램

기존 홈페이지에 통합할 수 있는 Node.js 모듈과 독립 실행 서버입니다. 운영 사이트에 배포된 결과물이 아닙니다. 외부 패키지 설치 없이 Node.js 22 이상에서 실행합니다.

## 바로 실행

```bash
npm test
npm run check
npm start
```

http://localhost:3000/local-service/ 접속. 지역 검색에 `세종탁송`, `부산시탁송`, `원주혁신도시대리운전` 등을 입력하세요. 서버에서 HTML을 완성하여 JavaScript 없이도 제목·본문·전화 링크가 표시됩니다. 전화번호는 홈페이지용 1811-4294입니다.

## 자동화 범위

- 지역 JSON을 수정하면 다음 요청부터 페이지, 제목, 설명, canonical, Service JSON-LD, 관련 링크와 사이트맵이 함께 변경됩니다.
- 12개 지역 × 대리운전/탁송 = 24개 안내 초안과 지역 허브 1개를 제공합니다.
- 띄어쓰기·별칭 검색을 대표 URL로 301 연결합니다. 임의 검색어로 새 페이지를 생성하지 않습니다.
- 승인된 페이지만 내부 목록과 XML 사이트맵에 노출합니다. 미승인 초안은 직접 열람 가능하나 noindex 처리합니다.
- 잘못된 JSON은 503, 존재하지 않는 지역은 404로 반환합니다. 원본 파일을 복구하면 재시작 없이 회복합니다.
- npm run check: 생성 범위 및 승인 상태를 reports/coverage.json에 기록합니다.
- npm run build: dist/local-service에 HTML 미리보기와 XML을 생성합니다. 정적 호스팅에는 검색·301·404 서버 로직이 포함되지 않으므로 운영에는 Node 서버/모듈을 사용하세요.

## 지역 추가 및 검색 공개

`data/regions.json`에 기존 항목과 같은 구조로 지역을 추가합니다. id는 영문 소문자·숫자·하이픈 고유값입니다. 지역별 services.daeri와 services.taksong을 각각 관리합니다.

초기 데이터는 운영자가 실제 서비스 범위와 지역별 설명을 검토하기 전까지 모두 `approved: false`입니다. 따라서 초기 사이트맵에는 제출 URL이 없습니다. 각 지역·서비스에 실제로 도움이 되는 고유 내용을 보완하고 다음을 입력하세요.

```json
{"approved": true, "reviewedBy": "실제 검토 담당자", "updatedAt": "2026-11-12", "text": "검토한 지역별 안내 본문 (120자 이상)"}
```

120자는 최소 입력 검증일 뿐 검색 품질 기준이나 순위 보장이 아닙니다. 출발·인계 장소별 주의점, 실제 예약 절차, 확인된 운행 정보 등 사용자가 필요한 내용을 직접 보완하세요. 담당자·날짜·운행기록을 지어내지 마세요. 지역명만 바꾼 동일 본문은 검증 오류가 됩니다. 비슷한 의미의 문장까지 완벽하게 판별하지는 못하므로 내용 검토가 필요합니다.

본문에 고객 이름·연락처·번호판 등 개인정보를 넣지 마세요. 요금은 확인된 정보만 기입하고, 이미지와 후기 자동 생성은 수행하지 않습니다. 기사 수·배차시간·보험 가입 여부 등의 미확인 주장은 초기 데이터에 넣지 않았습니다.

## 기존 서버 통합

기존 저장소에 이 패키지를 별도 디렉터리로 두고, 기존 서버의 최종 404 처리 앞에 연결합니다.

```js
const path = require('node:path');
const {createEngine} = require('./smart24-region-automation/lib/engine');
const regionalHandler = createEngine(path.join(__dirname,'smart24-region-automation/data/regions.json'));
// 기존 HTTP 핸들러 내부, 최종 404 이전:
if (regionalHandler(req, res)) return;
```

Express에서는 `app.use((req,res,next)=> { if (!regionalHandler(req,res)) next(); });` 형태로 **접두 경로 없이** 등록합니다. 등록 시 전체 req.url이 유지되어야 합니다. 기존 서버와 프레임워크는 이번 패키지에서 실측하지 않았으므로 통합 후 회귀 점검이 필요합니다.

기존 동일 지역 URL이 있다면 우선 기존 페이지를 개선하거나, URL 이전이 확정된 경우에만 일대일 301 전환하세요. 이 모듈의 경로는 /local-service/로 격리했지만 기존 지역 페이지와 내용 중복 여부를 자동으로 알 수는 없습니다. 같은 내용을 두 경로에서 동시에 검색 공개하지 마세요.

홈페이지의 요금조회·기사모집·기존 2,591건 운행기록·전화 처리 코드는 이 패키지가 교체하지 않습니다. 이 패키지의 버튼은 실제 요금 산출 기능이 아니라 전화 요금상담입니다.

## 배포 및 검색 제출

1. JSON 내용과 기존 지역 URL의 중복 여부 검토, 승인할 서비스 선택.
2. npm test 및 npm run check 성공 확인.
3. 기존 Cloudtype 서비스 소스에 모듈을 병합하고 배포. 독립 서버의 server.js로 기존 앱을 통째로 바꾸지 마세요.
4. 기존 robots.txt를 보존하고 다음 한 줄을 추가:
   `Sitemap: https://jeongukdaeri.kr/local-service/sitemap.xml`
5. 네이버 서치어드바이저에서 해당 사이트맵 제출. 제출·색인·순위 조회는 이 프로그램이 자동 수행하지 않습니다.
6. 실제 운영 URL의 HTTP 상태, canonical, noindex 해제, 내부 링크, 모바일 전화 앱 실행을 확인.
7. 서치어드바이저 노출·클릭 보고서를 주기적으로 비교. 기술검사 통과를 실제 색인/상위 노출로 표시하지 마세요.

환경 변수: PORT (기본 3000), REGION_DATA (지역 JSON의 절대경로). origin은 실제 공개 도메인으로 유지하세요. 관리용 API가 없으므로 데이터를 바꾸려면 서버 파일 또는 저장소 수정 권한이 필요합니다. 데이터 교체는 임시 파일에 작성·검증 후 rename 방식으로 처리하면 중간 저장에 의한 503을 줄일 수 있습니다.

## 기존 블로그 프로그램

`blog-seo-addon/`은 제공된 smart24-blog-seo-optimized.zip의 원본입니다. 해당 README의 별도 병합 절차를 따르세요. 새 지역 엔진에 자동으로 연결되지 않습니다. 블로그 자동 발행 기능은 없습니다.

## 공식 근거

- https://searchadvisor.naver.com/guide/report-seo — 고유한 제목·설명, 최적화 점수와 검색 순위의 차이
- https://searchadvisor.naver.com/guide/seo-basic-create — 대표 URL과 중복 주소 처리
- https://searchadvisor.naver.com/guide/seo-basic-intro — 사이트맵·내부 링크·검색 성과 확인

네이버 최상단 노출, 색인율 100%, 특정 경쟁사 추월은 보장하지 않습니다. 이 소스는 검색 접근성과 지역별 콘텐츠 운영을 위한 자동화 기반입니다.
