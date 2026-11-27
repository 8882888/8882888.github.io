"""Build public locality evidence from the public parking CSV and private completed dispatch export."""
import argparse
import csv
import datetime
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
PROVINCES = dict(zip(
    "서울 부산 대구 인천 광주 대전 울산 세종 경기 강원 충북 충남 전북 전남 경북 경남 제주".split(),
    "서울특별시 부산광역시 대구광역시 인천광역시 광주광역시 대전광역시 울산광역시 세종특별자치시 경기도 강원특별자치도 충청북도 충청남도 전북특별자치도 전라남도 경상북도 경상남도 제주특별자치도".split(),
))
PROVINCES.update({"강원도": "강원특별자치도", "전라북도": "전북특별자치도", "제주도": "제주특별자치도"})
MIN_TRIPS = 5


def registry():
    names = {
        name for path in (ROOT / "data/legal-regions").glob("[0-9][0-9].json")
        for name in json.loads(path.read_text())["full_names"]
    }
    index = defaultdict(list)
    for name in names:
        index[tuple(sorted(name.split()))].append(name)
    return names, index


def dispatch_place(value, index):
    tokens = str(value or "").split()
    if not tokens:
        return None
    tokens[-1] = PROVINCES.get(tokens[-1], tokens[-1])
    if tokens[-1] == "세종특별자치시":
        tokens = [token for token in tokens if token != "세종시"]
    candidates = index[tuple(sorted(tokens))]
    return candidates[0] if len(candidates) == 1 else None


def ancestors(name):
    parts = name.split()
    return [" ".join(parts[:i]) for i in range(1, len(parts) + 1)]


def trip_counts(workbook):
    _, index = registry()
    seen = set()
    counts = Counter()
    sheet = load_workbook(workbook, read_only=True, data_only=True).active
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if row[2] != "종료" or not row[1] or row[1] in seen:
            continue
        seen.add(row[1])
        departure, destination = str(row[7] or ""), str(row[8] or "")
        if re.search(r"탁송\s*\+\s*대리|대리\s*\+\s*탁송", departure):
            continue
        kind = "taksong" if re.search(r"(?:^|/)\s*탁(?:/|송|$)", departure) or "톨포" in destination else "daeri"
        origin, target = (dispatch_place(row[i], index) for i in (23, 25))
        areas = set()
        for endpoint in (origin, target):
            if endpoint:
                areas.update(ancestors(endpoint))
        counts.update((kind, area) for area in areas)
    output = defaultdict(dict)
    for (kind, area), count in sorted(counts.items()):
        if count >= MIN_TRIPS:
            output[area][kind] = count
    return dict(output)


def parking_places(file):
    names, _ = registry()
    candidates = defaultdict(dict)
    with file.open(encoding="cp949", newline="") as source:
        for row in csv.DictReader(source):
            if row["주차장구분"] != "공영":
                continue
            label = row["주차장명"].strip()
            address = row["소재지지번주소"].split()
            if not address or not label or len(label) > 100:
                continue
            address[0] = PROVINCES.get(address[0], address[0])
            chain = ancestors(" ".join(address))
            area = next((name for name in reversed(chain) if name in names), None)
            if not area:
                continue
            # A shorter administrative prefix alone still supports its own area.
            # Preserve the source's deepest confirmed locality for attribution.
            day = row["데이터기준일자"].strip()
            try:
                datetime.date.fromisoformat(day)
                spaces = int(row["주차구획수"])
            except ValueError:
                continue
            category = row["주차장유형"].strip()
            if spaces <= 0 or category not in {"노상", "노외", "부설"}:
                continue
            entry = {"name": label, "area": area, "type": category, "spaces": spaces, "date": day}
            for parent in ancestors(area):
                key = (area, label)
                prior = candidates[parent].get(key)
                if not prior or (day, spaces) > (prior["date"], prior["spaces"]):
                    candidates[parent][key] = entry
    return {
        area: sorted(entries.values(), key=lambda item: (
            item["type"] == "노상", -item["spaces"], item["name"], item["area"],
        ))[:2]
        for area, entries in candidates.items()
    }


def inside_ring(x, y, ring):
    inside = False
    x1, y1 = ring[-1]
    for x2, y2 in ring:
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
        x1, y1 = x2, y2
    return inside


def bus_places(file, boundaries, areas):
    parents = {area.rsplit(" ", 1)[0] for area in areas if area.endswith("리")}
    wanted = areas | parents
    geoms = {}
    exact_names, _ = registry()
    # Reconcile a changed intermediate district only where the legal name is
    # unique throughout the municipality in both snapshots.
    def municipality(name):
        parts = name.split()
        if len(parts) < 3:
            return None
        if parts[0] == "인천광역시" and parts[1].endswith("구"):
            return parts[0], parts[-1]
        if parts[0] == "경기도" and parts[1] == "화성시":
            return parts[1], parts[-1]
        return None

    current = defaultdict(list)
    historic = defaultdict(list)
    for name in exact_names:
        identity = municipality(name)
        if identity:
            current[identity].append(name)
    features = {}
    for feature in json.loads(boundaries.read_text())["features"]:
        parts = feature["properties"]["FULL_NM"].split()
        parts[0] = PROVINCES.get(parts[0], parts[0])
        name = " ".join(parts)
        features[name] = feature
        identity = municipality(name)
        if identity:
            historic[identity].append(name)
    for name in sorted(wanted):
        feature = features.get(name)
        identity = municipality(name)
        if not feature and identity and len(current[identity]) == len(historic[identity]) == 1:
            feature = features[historic[identity][0]]
        if not feature:
            continue
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        coordinates = [point for polygon in polygons for point in polygon[0]]
        xs, ys = zip(*coordinates)
        geoms[name] = (polygons, min(xs), min(ys), max(xs), max(ys))
    grid = defaultdict(list)
    for area, geometry in geoms.items():
        _, xmin, ymin, xmax, ymax = geometry
        for x in range(math.floor(xmin * 20), math.floor(xmax * 20) + 1):
            for y in range(math.floor(ymin * 20), math.floor(ymax * 20) + 1):
                grid[x, y].append(area)
    village_names = defaultdict(list)
    for area in (name for name in areas if name.endswith("리")):
        parent, name = area.rsplit(" ", 1)
        village_names[parent].append((area, name))
    result = {}
    with file.open(encoding="cp949", newline="") as source:
        for row in csv.DictReader(source):
            label = row["정류장명"].strip()
            if not label or len(label) > 90:
                continue
            try:
                x, y = float(row["경도"]), float(row["위도"])
                day = datetime.date.fromisoformat(row["정보수집일"]).isoformat()
            except ValueError:
                continue
            if not (124 < x < 132 and 33 < y < 39):
                continue
            for area in grid.get((math.floor(x * 20), math.floor(y * 20)), []):
                polygons, xmin, ymin, xmax, ymax = geoms[area]
                # Use interior points, keeping clear of the generalized polygon bounding edges.
                if not (xmin + .0001 < x < xmax - .0001 and ymin + .0001 < y < ymax - .0001):
                    continue
                if not any(inside_ring(x, y, poly[0]) and not any(
                    inside_ring(x, y, hole) for hole in poly[1:]
                ) for poly in polygons):
                    continue
                matches = [area]
                for village, name in village_names[area]:
                    if re.fullmatch(re.escape(name) + r"(?:입구|마을|회관)?", label.replace(" ", "")):
                        matches.append(village)
                for match in matches:
                    place = {"name": label, "area": area, "lat": y, "lon": x, "date": day}
                    short = match.split()[-1]
                    rank = (short.removesuffix("동") not in label,
                            not bool(re.search(r"역|터미널|회관|행정복지센터|사무소", label)),
                            label, x, y)
                    if match not in result or rank < result[match][0]:
                        result[match] = (rank, place)
    return {area: place for area, (_, place) in result.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parking_csv", type=Path)
    parser.add_argument("dispatch_xlsx", type=Path)
    parser.add_argument("target_json", type=Path, help="JSON array of [service, full legal locality] pairs")
    parser.add_argument("--bus-csv", type=Path, required=True)
    parser.add_argument("--local-boundaries", type=Path, required=True)
    args = parser.parse_args()
    targets = json.loads(args.target_json.read_text())
    parking, trips = parking_places(args.parking_csv), trip_counts(args.dispatch_xlsx)
    areas = sorted({area for _, area in targets})
    bus = bus_places(args.bus_csv, args.local_boundaries, set(areas) - set(parking))
    items = {}
    by_area = defaultdict(set)
    for kind, area in targets:
        by_area[area].add(kind)
    for area in areas:
        entry = {}
        if area in parking:
            entry["parking"] = parking[area]
        if area in bus and area not in parking:
            entry["bus"] = bus[area]
        if area in trips:
            selected = {kind: trips[area][kind] for kind in sorted(by_area[area])
                        if kind in trips[area]}
            if selected:
                entry["completed"] = selected
        if entry:
            items[area] = entry
    print(json.dumps(items, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
