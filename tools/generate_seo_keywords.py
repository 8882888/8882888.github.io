#!/usr/bin/env python3
"""Generate a broad, deterministic 100,000-keyword research catalog.
Keywords are for editorial planning; never publish hidden stuffing or thin doorway pages.
"""
import json
from pathlib import Path

OUT = Path("data/seo-keywords-100k.json")

# City/district/neighborhood and trip destinations. Add verified legal-dong data over time.
PLACES = """
서울 강남 강남역 역삼 선릉 삼성 잠실 송파 석촌 문정 가락 수서 개포 대치 청담 압구정 신사 논현 서초 교대 방배 반포 양재 사당 이수 동작 흑석 노량진 여의도 영등포 문래 신도림 구로 가산 금천 독산 관악 신림 봉천 홍대 합정 망원 상수 연남 상암 마포 공덕 용산 이태원 한남 삼각지 종로 광화문 을지로 명동 동대문 대학로 성수 건대 왕십리 성북 노원 도봉 강북 은평 불광 연신내 서대문 신촌 이대 목동 양천 강서 마곡 발산 김포공항 서울역 청량리 상봉
인천 송도 연수 구월 부평 부천 청라 검단 계양 영종도 인천공항 미추홀 주안 남동 논현동 강화읍 김포 한강신도시 파주 운정 문산 고양 일산 덕양 킨텍스 남양주 다산 별내 구리 의정부 양주 옥정 동두천 포천 연천 가평 청평 양평 하남 미사 광주 성남 분당 판교 위례 수원 광교 영통 권선 팔달 장안 용인 수지 기흥 처인 화성 동탄 오산 평택 송탄 안성 안중 안산 시흥 배곧 오이도 대부도 부천 중동 상동 광명 안양 평촌 군포 의왕 과천 이천 여주
부산 해운대 센텀 광안리 서면 남포동 광복동 동래 연산 부산역 기장 송정 다대포 김해 양산 창원 마산 진해 진주 거제 통영 밀양 울산 삼산 성남동 태화강 울주
대구 동성로 수성 달서 칠곡 달성 경산 구미 김천 상주 문경 안동 영주 포항 경주 울진 영덕
대전 둔산 유성 대덕 세종 조치원 공주 천안 아산 당진 서산 태안 청주 오창 충주 제천 단양 전주 군산 익산 남원 목포 여수 순천 광양 나주 광주광역시 춘천 원주 강릉 속초 동해 삼척 태백 홍천 횡성 평창 정선 영월 인제 양구 화천 철원 양양 제주 제주시 서귀포 애월 한림 성산 중문
남이섬 아침고요수목원 에버랜드 한국민속촌 서울대공원 오션월드 비발디파크 하이원리조트 용평리조트 오크밸리 알펜시아 대관령 강원랜드 설악산 오색 한계령 백담사 소공원 지리산 성삼재 중산리 백무동 노고단 화엄사 한라산 성판악 관음사 한강공원 난지한강공원 반포한강공원 을왕리 월미도 제부도 궁평항 영흥도 대천해수욕장 경포대 속초해수욕장 낙산해수욕장 해운대해수욕장 광안리해수욕장
""".split()

# Places where people commonly need a designated driver, including venues and occasions.
VENUES = """
식당 맛집 한식당 고깃집 삼겹살집 갈비집 횟집 조개구이 장어집 해산물식당 중국집 일식집 중식당 양식당 뷔페 레스토랑 브런치카페 카페 베이커리 전통시장 시장 먹자골목 맛집거리
술집 호프집 맥주집 소주방 포차 실내포차 야장 이자카야 와인바 칵테일바 라운지바 바 클럽 나이트클럽 유흥가 노래방 코인노래방 룸살롱 단란주점 회식장소 모임장소 동창회장소 송년회장소
골프장 골프연습장 스크린골프 파3골프장 골프클럽 골프리조트 골프텔 골프장클럽하우스 골프대회장 승마장 스키장 스키리조트 썰매장 워터파크 수영장 찜질방 사우나 스파 온천
호텔 모텔 숙박업소 펜션 풀빌라 리조트 콘도 게스트하우스 민박 글램핑장 캠핑장 오토캠핑장 카라반캠핑장 야영장 캠핑카주차장 휴양림 자연휴양림 계곡 유원지 해수욕장 해변 항구 선착장 낚시터 바다낚시터 좌대낚시터 낚시배선착장
관광지 유원지 테마파크 놀이공원 동물원 식물원 수목원 전망대 케이블카 출렁다리 폭포 둘레길 등산로 산행입구 탐방지원센터 국립공원 도립공원 휴게소 졸음쉼터 전망휴게소
웨딩홀 예식장 결혼식장 돌잔치장 연회장 컨벤션센터 행사장 공연장 콘서트장 축제장 박람회장 전시장 미술관 박물관 영화관 극장 공연장 대학교 캠퍼스 대학가 학원가 종교시설 교회 성당 사찰 절
장례식장 상가 장례식장 병원 종합병원 대학병원 요양병원 검진센터 병문안장소
공항 국내선청사 국제선청사 공항터미널 기차역 지하철역 버스터미널 고속버스터미널 시외버스터미널 여객터미널 항만 크루즈터미널 KTX역 SRT역 환승센터
회사 사무실 기업체 공장 산업단지 물류센터 물류창고 연구단지 업무단지 오피스빌딩 지식산업센터 관공서 공공기관 법원 경찰서 소방서 군부대
경기장 야구장 축구장 농구장 체육관 스포츠센터 실내체육관 야구경기장 축구경기장 경마장 경륜장 경정장 카지노 강원랜드 공연축제장
아파트 오피스텔 주택단지 빌라 주거단지 상가단지 대형마트 쇼핑몰 백화점 아울렛 복합쇼핑몰 전통시장
""".split()

CORE = [
    "전국대리운전", "전국 대리운전", "전국대리", "24시탁송", "24시간탁송", "심야탁송", "새벽탁송",
    "24시대리운전", "24시간대리운전", "심야대리운전", "대리운전", "대리",
    "새벽대리운전", "주말대리운전", "예약대리운전", "골프대리운전",
    "법인대리운전", "장거리대리운전", "외곽대리운전", "귀가대리운전",
    "회식대리운전", "단체모임대리운전", "탁송", "자동차탁송", "차량탁송",
    "전국탁송", "장거리탁송", "캠핑카탁송", "카라반탁송", "차량회수탁송"
]
MODIFIERS = ["", " 예약", " 요금", " 이용방법", " 빠른배차", " 심야", " 새벽", " 주말"]

def main():
    rows, seen = [], set()
    def add(keyword, category):
        keyword = " ".join(keyword.split())
        if keyword and keyword not in seen:
            seen.add(keyword)
            rows.append({"keyword": keyword, "category": category})

    # First reserve broad, unlocalized service phrases.
    for service in CORE:
        for modifier in MODIFIERS:
            add(service + modifier, "핵심서비스")

    # Interleave venue types across locations so 100k entries don't stop at a few cities.
    # Each combination is meaningful as a content-planning target, not a claim of service coverage.
    for venue in VENUES:
        for place in PLACES:
            add(place + venue + "대리운전", "지역·장소·대리운전")
            add(place + venue + "대리", "지역·장소·대리")
            if len(rows) >= 100000:
                break
        if len(rows) >= 100000:
            break

    # If venue combinations do not fill the catalog, extend with natural service/location queries.
    if len(rows) < 100000:
        for place in PLACES:
            for service in CORE:
                for modifier in MODIFIERS:
                    add(place + service + modifier, "지역·서비스")
                    if len(rows) >= 100000:
                        break
                if len(rows) >= 100000:
                    break
            if len(rows) >= 100000:
                break

    if len(rows) < 100000:
        raise SystemExit(f"Only generated {len(rows)} unique keywords; expand PLACES or VENUES.")
    rows = rows[:100000]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "schema_version": 2,
        "brand": "스마트전국대리운전 스마트24탁송",
        "total": len(rows),
        "unique": len({r["keyword"] for r in rows}),
        "purpose": "대리운전 수요가 있는 장소·지역 검색어 조사 및 유용한 콘텐츠 기획용. 실제 제공 여부를 확인하고 관련 있는 페이지에만 사용하며 숨겨진 키워드 삽입이나 얇은 대량 페이지 생성에는 사용하지 않습니다.",
        "categories": {"지역·장소·대리운전": "지역과 실제 대리 호출 가능 장소의 조합", "지역·장소·대리": "장소 중심의 검색어 조합", "지역·서비스": "지역과 서비스·예약 관련 조합", "핵심서비스": "전국 공통 서비스 검색어"},
        "keywords": rows
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Generated {len(rows):,} unique SEO keyword targets -> {OUT}")

if __name__ == "__main__":
    main()
