# 스마트24 공식 홈페이지 Cloudtype 자동 배포 연결

공식 홈페이지: https://jeongukdaeri.kr/  
GitHub 소스: `8882888/8882888.github.io` (`main`)

## 배포 관련 원칙

- GitHub Pages는 검색 중복 방지를 위한 보조 정적 미러이며, Cloudtype Node.js 공식 운영 서버와 별개입니다.
- `server.js`와 `data/seo-pages.json` 수정만으로 Cloudtype 운영 배포가 끝났다고 볼 수 없습니다.
- 이미 운영 중인 Cloudtype 앱의 서비스 설정·커스텀 도메인·데이터를 덮어쓰지 말고 **기존 앱 재배포**만 요청합니다.
- 2,591건 운행기록, 네이버 원문 630개 연결, 전화번호 및 기존 산행 페이지는 변경하지 않습니다.

## 기존 Cloudtype 앱 자동 재배포 연결 — 공식 액션 방식

현재 `.github/workflows/cloudtype-redeploy.yml`은 Cloudtype 공식 `cloudtype-github-actions/deploy@v1`을 사용합니다. 이전에 사용하던 검증되지 않은 `api.cloudtype.io/webhooks/deploy` 직접 호출은 제거했습니다. **GitHub Actions의 기존 녹색 실행이 배포 성공을 보장하지 않았다는 문제가 확인되어, 이제 설정 누락 시 명시적으로 실패합니다.**

### 기존 앱에서만 가져올 설정

1. [Cloudtype 관리 화면](https://cloudtype.dev/)에 로그인합니다.
2. 공식 도메인 `jeongukdaeri.kr`에 연결된 **기존 서비스**를 선택합니다. 새 프로젝트나 앱을 만들지 않습니다.
3. 해당 서비스의 **CLI 탭**에서 배포 설정 YAML을 확인합니다. 서비스 이름, 프레임워크, 환경변수 참조, 포트, Git 저장소 및 배포환경을 원래 앱 그대로 유지합니다.
4. GitHub 저장소 **Settings → Secrets and variables → Actions**에서 아래 항목을 설정합니다.

| 구분 | 이름 | 입력값 |
| --- | --- | --- |
| Secret | `CLOUDTYPE_TOKEN` | 기존 Cloudtype 계정의 API 키 |
| Secret | `CLOUDTYPE_DEPLOY_YAML` | 기존 Cloudtype 서비스의 CLI 탭에서 복사한 배포 설정 YAML 전체 |
| Variable | `CLOUDTYPE_PROJECT` | 기존 Cloudtype 프로젝트의 정확한 식별자(필요 시 스페이스/프로젝트 형식) |
| Variable | `CLOUDTYPE_APP` | 기존 배포 YAML 최상단 `name:`과 동일한 서비스 이름 |
| Variable | `CLOUDTYPE_STAGE` | 기존 서비스의 배포환경 이름(현재 운영환경 그대로) |

`CLOUDTYPE_DEPLOY_YAML`에는 환경변수나 비밀 참조가 들어갈 수 있으니 **Repository secret**으로만 등록하고 채팅이나 공개 코드에 붙이지 마세요. `CLOUDTYPE_APP`과 YAML의 `name:`이 일치하지 않으면 안전하게 배포를 중단합니다. 새로운 앱 이름을 임의로 넣어서는 안 됩니다.

Cloudtype의 원래 서비스가 이미 GitHub 저장소를 연결한 상태를 전제로 배포 액션만 사용합니다. 기존 연결이 없거나 Deploy Key 권한 오류가 난다면 Cloudtype의 서비스별 **CLI → GitHub Actions** 자동 생성 워크플로우를 참고해 GitHub 접근을 별도로 복구해야 합니다. 이때 공식 문서의 `GHP_TOKEN` / `cloudtype-github-actions/connect@v1` 절차가 필요할 수 있습니다. 기존 연결을 함부로 덮어쓰지 않습니다.

### 실행과 검증

- GitHub Actions의 **Redeploy official Cloudtype site on verified repository changes** → **Run workflow**를 사용합니다. 또는 `main`의 서비스 관련 파일 변경에 반응합니다.
- 실행의 **Check original Cloudtype application binding safely**에서 누락된 항목을 확인합니다. 연결이 안 된 상태를 성공으로 처리하지 않습니다.
- 이어지는 **Deploy existing Cloudtype application using OFFICIAL action**이 성공하면 배포 요청이 수락된 것입니다.
- 마지막 **Confirm LIVE Cloudtype release matches GitHub source**에서 운영 서버 `/health`의 `release` 값과 GitHub `server.js` SHA-256 앞 16자리를 비교합니다. 이 단계까지 통과해야 *코드 배포 확인*이라고 판정합니다.
- 배포 직후에도 상단 메뉴 4개가 실제 브라우저 스크롤 중 고정되는지 별도 확인합니다.

> Cloudtype 공식 배포 방법: https://docs.cloudtype.dev/ko/developers/githubactions  
> 기존 서비스 설정/CLI: https://docs.cloudtype.dev/ko/developers/service

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
