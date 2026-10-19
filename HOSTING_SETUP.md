# 스마트전국대리운전 스마트24탁송 — 실제 동적 홈페이지 연결

대표번호: **1811-4294**. 기존 GitHub Pages 주소: https://8882888.github.io/

## 완료된 작업
- 전국 17개 시·도, 20,562개 지역 경로 데이터가 `data/legal-regions/01.json`~`17.json`에 등록됨.
- Node.js 서버 `server.js`가 지역별 페이지, 지역 검색, 동적 사이트맵, 상태 점검을 제공함.
- `railway.json`에 시작 명령(`npm start`), `/health` 상태 점검, 장애 시 재시작을 설정함.
- GitHub Pages 정적 사이트맵 `sitemap.xml`은 기존 주요 페이지 10개를 포함함.

## 실제 외부 연결: 계정 소유자가 해야 하는 단계
1. https://railway.com/ 에서 GitHub 계정으로 로그인하고 **New Project → Deploy from GitHub repo** 선택.
2. `8882888/8882888.github.io` 저장소 선택. Railway가 `railway.json`을 사용하도록 설정.
3. 서비스의 **Settings → Networking → Generate Domain**에서 Railway HTTPS 주소 발급.
4. **Variables**에서 `PUBLIC_HOST`에 위에서 발급받은 호스트 이름만 입력 (예: `example.up.railway.app`; `https://` 없이). `PORT`는 Railway가 자동 제공하므로 임의로 덮어쓰지 않음.
5. 발급받은 도메인의 `/health`에서 `regions:20562`인지 확인하고, `/region/` 검색과 `/sitemap.xml` 응답을 확인.
6. 이후 네이버 서치어드바이저와 Google Search Console에 **실제 서비스 도메인**과 사이트맵을 등록.

## 중요한 주의 사항
- **Railway 계정 연결 및 서비스 배포는 아직 수행되지 않음.** GitHub Actions의 테스트 성공은 인터넷 공개 배포 성공과 다름.
- 기존 `8882888.github.io`는 GitHub Pages 정적 사이트. Node.js를 실행하지 못함. Railway 도메인으로 배포한 뒤 기존 홈페이지의 지역 검색 링크와 canonical URL을 최종 서비스 주소로 연결해야 함.
- 지역별 SEO 주소를 한 도메인으로 통일하는 것이 권장됨. 별도 도메인 구매 또는 역방향 프록시 연결 전에는 중복 색인 가능성을 검토해야 함.
- 현재 전국 지역 자료는 공개 재구성 데이터이며, 최신 공식 원본 코드 대조가 완료된 것은 아님.
- 전화 클릭 통계는 Supabase RPC 동작 및 정확성을 아직 확인하지 못함.
- 실제 운행 완료·검증 기록만 공개하도록 제한됨.
- Kakao 경로 API 및 Cloudflare 비밀키 설정은 요청에 따라 보류.
