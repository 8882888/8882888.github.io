# 스마트24 공식 홈페이지 Cloudtype 자동 배포 연결

공식 홈페이지: https://jeongukdaeri.kr/  
GitHub 소스: `8882888/8882888.github.io` (`main`)

## 배포 관련 원칙

- GitHub Pages는 검색 중복 방지를 위한 보조 정적 미러이며, Cloudtype Node.js 공식 운영 서버와 별개입니다.
- `server.js`와 `data/seo-pages.json` 수정만으로 Cloudtype 운영 배포가 끝났다고 볼 수 없습니다.
- 이미 운영 중인 Cloudtype 앱의 서비스 설정·커스텀 도메인·데이터를 덮어쓰지 말고 **기존 앱 재배포**만 요청합니다.
- 2,591건 운행기록, 네이버 원문 630개 연결, 전화번호 및 기존 산행 페이지는 변경하지 않습니다.

## 기존 Cloudtype 앱의 자동 재배포 연결 (1회 설정)

이 저장소에는 `.github/workflows/cloudtype-redeploy.yml`가 준비되어 있습니다.

GitHub 저장소의 **Settings → Secrets and variables → Actions**에서 아래 항목을 지정해야 활성화됩니다.

| 종류 | 이름 | 값 |
| --- | --- | --- |
| Repository secret | `CLOUDTYPE_TOKEN` | Cloudtype API 키 — 채팅이나 공개 코드에 넣지 않습니다 |
| Repository variable | `CLOUDTYPE_PROJECT` | 현재 서비스가 속한 **기존** Cloudtype 프로젝트명 |
| Repository variable | `CLOUDTYPE_APP` | 현재 도메인에 연결된 **기존** 앱 이름 |
| Repository variable | `CLOUDTYPE_STAGE` | 현재 앱의 배포 환경명(예: `main`) |

이 항목이 하나라도 없으면 워크플로우는 배포 요청을 **건너뛰고** GitHub Actions 로그에 안내를 남깁니다. 값을 추측해 임의의 새 앱을 배포하지 않습니다.

모두 설정되면 `main` 브랜치의 서비스 소스 변경 시 Cloudtype 배포 웹훅에 기존 앱의 재배포를 요청합니다. 재배포 요청에 성공해도 **운영 HTML 반영 성공**과는 구분해야 합니다. 앱/프로젝트/배포환경을 잘못 적으면 다른 서비스에 영향을 줄 수 있으므로 실제 운영 앱 정보로만 지정합니다.

> Cloudtype 문서: https://docs.cloudtype.dev/ko/developers/githubactions (GitHub Actions 연동)  
> 기존 배포 웹훅 안내: https://docs.cloudtype.io/guide/cicd/webhooks (제공 문서 URL이 변경되었을 수 있으므로, 사용 중인 Cloudtype 플랜/버전에서 웹훅 지원 여부를 확인)

## 실제 운영 반영 확인

- 상태 확인: https://jeongukdaeri.kr/health/seo.json
- 읽기 쉬운 상태 화면: https://jeongukdaeri.kr/health/seo-report/
- 홈페이지: https://jeongukdaeri.kr/
- 전국탁송: https://jeongukdaeri.kr/taksong/
- 전국대리운전: https://jeongukdaeri.kr/daeri/

운영 서버의 배포 확인용 JSON에는 원문 630개, 지역별 원문 연결 10곳/20개, SEO 대표 제목, 파일 4개의 SHA256 정보가 나타나야 합니다. 이 기능 자체가 운영 서버에 배포되기 전에는 JSON이 없거나 이전 내용일 수 있습니다.

기존 `.github/workflows/live-seo-deployment-audit.yml`는 매일 오전 9:20(KST) GitHub와 실제 운영 HTML·설정을 비교합니다. GitHub의 재배포 **요청**과 검색엔진의 **색인**은 별개입니다.

## 최초 연결 전 임시 운영 절차

Cloudtype 관리 화면에서 해당 서비스의 **배포 내역**에서 최근 GitHub 커밋을 확인하고, **기존 서비스 설정 → 배포하기**로 현재 main 코드를 재배포할 수 있습니다. 새로운 Cloudtype 프로젝트나 별도의 도메인을 만들지 않습니다.

배포 성공 후 네이버 서치어드바이저에서 실제 URL 접근과 수집·색인 상태를 따로 확인합니다.
