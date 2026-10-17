#!/usr/bin/env python3
"""Convert the official MOLIT nationwide legal-dong CSV into regions.json.

Download the latest "국토교통부_전국 법정동" CSV from data.go.kr and save it
as data/official_legal_dong.csv. This script normalizes rows and deduplicates
region paths before page generation. It does not fabricate local review facts.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(".")
SOURCE = ROOT / "data" / "official_legal_dong.csv"
TARGET = ROOT / "data" / "regions.json"
SERVICES = ["daeri", "taksong", "long-distance-taksong"]

def clean(value):
    return re.sub(r"\s+", " ", (value or "").strip())

def slugify(value):
    # Stable readable URL segments; Korean characters are URL-safe in modern browsers,
    # but percent-encoding is avoided here in favor of deterministic transliteration.
    table = {
        "서울특별시":"seoul","부산광역시":"busan","대구광역시":"daegu",
        "인천광역시":"incheon","광주광역시":"gwangju","대전광역시":"daejeon",
        "울산광역시":"ulsan","세종특별자치시":"sejong","경기도":"gyeonggi",
        "강원특별자치도":"gangwon","충청북도":"chungbuk","충청남도":"chungnam",
        "전북특별자치도":"jeonbuk","전라북도":"jeonbuk","전라남도":"jeonnam",
        "경상북도":"gyeongbuk","경상남도":"gyeongnam","제주특별자치도":"jeju",
        "전남광주통합특별시":"jeonnam-gwangju"
    }
    return table.get(value, re.sub(r"[^가-힣a-zA-Z0-9]+", "-", value).strip("-") or "area")

def read_rows(path):
    errors = []
    for encoding in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            with path.open("r", encoding=encoding, newline="") as f:
                return list(csv.DictReader(f))
        except UnicodeDecodeError as exc:
            errors.append(str(exc))
    raise SystemExit("CSV 인코딩을 읽을 수 없습니다. 공공데이터포털에서 CSV 파일을 다시 내려받아 주세요.")

def main():
    if not SOURCE.exists():
        raise SystemExit(
            "공식 CSV 파일이 없습니다. data/official_legal_dong.csv 경로에 "
            "국토교통부 '전국 법정동' 최신 CSV를 넣은 뒤 다시 실행하세요. "
            "출처: https://www.data.go.kr/data/15063424/fileData.do"
        )
    rows = read_rows(SOURCE)
    if not rows:
        raise SystemExit("CSV에 데이터 행이 없습니다.")
    # Accept Korean column headers and common spelling variants.
    headers = {clean(k): k for k in rows[0].keys()}
    def col(*names):
        for name in names:
            if name in headers:
                return headers[name]
        return None
    sido_col = col("시도명")
    sgg_col = col("시군구명")
    umd_col = col("읍면동명", "읍면도명")
    ri_col = col("리명")
    code_col = col("법정동코드")
    if not sido_col or not sgg_col or not code_col:
        raise SystemExit("CSV 필수 열(법정동코드, 시도명, 시군구명)을 찾지 못했습니다. 원본 열 이름을 확인해 주세요.")
    regions = {}
    for row in rows:
        sido, sgg = clean(row.get(sido_col)), clean(row.get(sgg_col))
        umd = clean(row.get(umd_col)) if umd_col else ""
        ri = clean(row.get(ri_col)) if ri_col else ""
        code = clean(row.get(code_col))
        if not sido or not code:
            continue
        # Ignore summary-level records with no locality only if a more specific row
        # exists; preserve city/county/district landing pages as useful parent pages.
        parts = [sido, sgg, umd, ri]
        parts = [p for p in parts if p]
        if not parts:
            continue
        slug = "/".join(slugify(p) for p in parts) + "/" + code
        level = "리" if ri else ("읍·면·동" if umd else ("시·군·구" if sgg else "시·도"))
        parent = " ".join(parts[:-1])
        display_name = ri or umd or sgg or sido
        key = slug
        regions[key] = {
            "name": display_name,
            "slug": slug,
            "level": level,
            "parent_name": parent if parent != display_name else "",
            "legal_dong_code": code,
            "services": SERVICES
        }
    # Prefer a predictable, repeatable order and keep code metadata for future refreshes.
    ordered = sorted(regions.values(), key=lambda r: (r["slug"], r["legal_dong_code"]))
    output = {
        "schema_version": 2,
        "brand": "스마트전국대리운전 스마트24탁송",
        "phone": "1877-3015",
        "source": "국토교통부_전국 법정동 (공공데이터포털)",
        "source_url": "https://www.data.go.kr/data/15063424/fileData.do",
        "note": "공식 법정동 CSV에서 정리한 지역 목록입니다. 지역별 실제 후기·운행실적은 확인된 사실만 추가해야 합니다.",
        "regions": ordered
    }
    TARGET.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"변환 완료: CSV {len(rows)}행 → 지역 경로 {len(ordered)}개")
    print("배포 전 중복·누락·URL 충돌을 확인하고, 검색 가치가 낮은 페이지는 생성 범위를 조정하세요.")

if __name__ == "__main__":
    main()
