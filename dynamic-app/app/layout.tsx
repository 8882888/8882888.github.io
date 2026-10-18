import type { Metadata } from 'next';
import './style.css';
export const metadata:Metadata={title:{default:'스마트전국대리운전 스마트24탁송',template:'%s | 스마트전국대리운전 스마트24탁송'},description:'전국대리운전, 24시탁송, 장거리탁송. 실제 완료 운행기록과 지역별 안내. 대표 1877-3015',robots:{index:true,follow:true}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body><header><a href="/">스마트전국대리운전 · 스마트24탁송</a><a href="tel:18773015">☎ 1877-3015</a></header><nav><a href="/service/daeri">전국대리운전</a><a href="/service/taksong">24시탁송</a><a href="/reviews">실제 운행후기</a><a href="/quote">참고요금 계산</a><a href="/regions">전국 지역별 안내</a><a href="https://open.kakao.com/o/sGV88r7h">카카오톡 상담 (08~20시)</a></nav>{children}<footer>대표 상담 1877-3015 · 직통 010-4072-1577 · 카카오 친구추가 010-3471-7001</footer></body></html>}
