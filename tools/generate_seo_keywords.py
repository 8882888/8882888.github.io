#!/usr/bin/env python3
"""Build a deterministic 100,000-item keyword research catalog.
The catalog is for editorial planning; it is not injected as hidden keyword text.
"""
import json
from pathlib import Path

OUT = Path("data/seo-keywords-100k.json")

PLACES = """
전국 서울 서울강남 강남 강북 강서 강동 송파 잠실 종로 중구 용산 성동 광진 동대문 중랑 성북 강북구 도봉 노원 은평 서대문 마포 양천 영등포 구로 금천 관악 동작 서초 강남구 강남역 여의도 홍대 성수 가산 마곡 상암 청량리 서울역 인천 인천중구 인천동구 미추홀 연수 송도 남동 부평 계양 서구 검단 청라 영종도 인천공항 김포공항 강화 강화읍 김포 김포한강 파주 운정 문산 고양 일산 덕양 남양주 다산 별내 구리 의정부 양주 옥정 동두천 포천 연천 가평 청평 양평 하남 미사 광주경기 성남 분당 판교 위례 수원 영통 광교 장안 권선 팔달 용인 수지 기흥 처인 화성 동탄 오산 평택 안성 안중 송탄 안산 단원 상록 시흥 배곧 오이도 부천 중동 상동 광명 안양 동안 만안 군포 의왕 과천 이천 여주 양평 포천 연천 인천외곽 경기외곽 수도권외곽 서울외곽
부산 해운대 수영 광안리 부산진 동래 연제 남구 북구 사상 사하 강서 기장 부산역 김해 양산 창원 마산 진해 진주 거제 통영 고성 밀양 함안 창녕 의령 남해 하동 산청 함양 거창 합천 울산 남구 중구 동구 북구 울주
대구 수성 달서 동구 서구 북구 남구 달성 경산 영천 청도 칠곡 구미 김천 상주 문경 안동 영주 예천 봉화 울진 영덕 포항 경주 청송 영양 의성 고령 성주
대전 유성 서구 중구 동구 대덕 세종 조치원 공주 논산 계룡 금산 부여 청양 보령 서천 홍성 예산 천안 아산 당진 서산 태안 청주 상당 흥덕 서원 청원 충주 제천 단양 음성 진천 괴산 증평 보은 옥천 영동
광주 동구 서구 남구 북구 광산 전주 완산 덕진 군산 익산 정읍 남원 김제 완주 진안 무주 장수 임실 순창 고창 부안 목포 여수 순천 광양 나주 무안 영광 함평 장성 담양 곡성 구례 보성 고흥 장흥 강진 해남 완도 진도 신안
춘천 원주 강릉 속초 동해 삼척 태백 홍천 횡성 평창 정선 영월 인제 양구 화천 철원 양양 고성강원 춘천역 대관령
제주 제주시 서귀포 애월 한림 성산 표선 중문 대정 조천 구좌
인천송도 청라국제도시 영종하늘도시 판교테크노밸리 동탄신도시 광교신도시 위례신도시 미사강변 다산신도시 운정신도시 검단신도시 해운대센텀 광안리해수욕장 을왕리 대부도 영흥도 오이도 제부도 궁평항 월미도 남이섬 아침고요수목원 에버랜드 서울대공원 한국민속촌 오션월드 비발디파크 대명리조트 용평리조트 하이원리조트 오크밸리 알펜시아 평창리조트
""".split()

SERVICES = """
대리운전 전국대리 전국대리운전 외곽대리운전 펜션대리운전 계곡대리운전 캠핑장대리운전 글램핑대리운전 리조트대리운전 호텔대리운전 골프장대리운전 스키장대리운전 낚시터대리운전 야영장대리운전 관광지대리운전 식당대리운전 회식대리운전 법인대리운전 기업대리운전 심야대리운전 새벽대리운전 24시대리운전 주말대리운전 공휴일대리운전 장거리대리운전 공항대리운전 역대리운전 캠핑카탁송 캠핑카운전탁송 캠핑카이동 카라반탁송 트레일러탁송 모터홈탁송 1톤탁송 1톤트럭탁송 1톤화물차탁송 1.2톤탁송 2.5톤탁송 3.5톤탁송 5톤탁송 5톤화물차탁송 8톤탁송 8.5톤탁송 11톤탁송 25톤탁송 냉동탑차탁송 윙바디탁송 탑차탁송 화물차탁송 트럭탁송 특수차량탁송 전기차탁송 수입차탁송 중고차탁송 신차탁송 법인차량탁송 렌터카탁송 리스차량탁송 자동차탁송 전국탁송 외곽탁송 장거리탁송 지방탁송 지방간탁송 공항탁송 골프장탁송 펜션탁송 계곡탁송 캠핑장탁송 글램핑장탁송 리조트탁송 호텔탁송 낚시터탁송 자전거길종주탁송 국토종주탁송 설악산탁송 지리산탁송 등산탁송 산행탁송 하산탁송 종주탁송 차량회수탁송 차량이동서비스
""".split()

MODIFIERS = [
    "", " 예약", " 요금상담", " 이용안내", " 빠른배차", " 출발지 도착지 상담",
    " 주말", " 심야", " 새벽", " 24시"
]

def main():
    rows = []
    seen = set()
    def add(keyword, category):
        keyword = " ".join(keyword.split())
        if keyword and keyword not in seen:
            seen.add(keyword)
            rows.append({"keyword": keyword, "category": category})
    # Core keywords are included even if they are not produced by a location combination.
    for s in SERVICES:
        add(s, "핵심서비스")
        for mod in MODIFIERS:
            add(s + mod, "서비스·예약")
    # Localized combinations cover town/city, resort, campground, mountain, and transport terms.
    for place in PLACES:
        for s in SERVICES:
            for mod in MODIFIERS:
                add(place + s + mod, "지역·서비스")
                if len(rows) >= 100000:
                    break
            if len(rows) >= 100000:
                break
        if len(rows) >= 100000:
            break
    if len(rows) < 100000:
        raise SystemExit(f"Only generated {len(rows)} unique keywords; add more place/service combinations.")
    rows = rows[:100000]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "schema_version": 1,
        "brand": "스마트번개대리운전",
        "total": len(rows),
        "unique": len({r["keyword"] for r in rows}),
        "purpose": "검색어 조사·콘텐츠 기획용 목록. 숨겨진 키워드 삽입이나 무관한 대량 페이지 생성에 사용하지 않습니다.",
        "keywords": rows
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Generated {len(rows):,} unique SEO keyword targets -> {OUT}")

if __name__ == "__main__":
    main()
