# 카페24 구매 전 필수 확인

이 프로젝트는 Next.js **서버 렌더링** 앱입니다. 카페24의 저가형 웹호스팅(일반 PHP/정적 파일 업로드용)으로는 Next.js 서버를 그대로 실행할 수 없습니다.

구매 전 카페24에 아래 항목을 확인하세요.

1. Node.js 20 이상을 상시 실행할 수 있는 **VPS/클라우드 서버** 상품인지
2. SSH 접근, npm install / npm run build / npm run start 실행 가능 여부
3. 역방향 프록시(nginx 등)로 HTTPS 도메인을 Next.js 포트에 연결 가능한지
4. 서버 프로세스 재시작 및 로그 관리 가능 여부

위 조건이 없다면 **Vercel에 Next.js 앱을 호스팅하고 카페24에서 도메인만 구매**하는 편이 간편합니다.

Vercel 설정: 저장소 8882888/8882888.github.io, 브랜치 dynamic-nextjs, Root Directory dynamic-app, Framework Next.js. 환경변수 SUPABASE_URL / SUPABASE_ANON_KEY는 Supabase의 공개 읽기 RLS가 구성된 후 설정합니다.

운영 중인 https://8882888.github.io/ 는 검증 전까지 그대로 유지합니다.
