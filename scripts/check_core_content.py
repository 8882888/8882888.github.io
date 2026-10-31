#!/usr/bin/env python3
"""Safety checks for scheduled Smart24 content updates (no external requests)."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REQUIRED = {
    "index.html": ["five-service-fastlinks", "card-daeri-top", "route-first-real-trips", "mobile-fare-call-quick", "regional-real-routes", "verified-case-direct"],
    "service/card-daeri/index.html": ["card-payment-faq", "card-region-consultation", "card-route-fare-steps", "card-daeri-trust-links", "card-daeri-search-intent", "mobile-card-call", "1811-4294"],
    "special/seoraksan-transport/index.html": ["seoraksan-fare-first", "seoraksan-review-shortcuts"],
    "special/cycling-trail-transport/index.html": ["cycling-card-fare-first", "cycling-route-index"],
    "reviews/ride-record-stories/index.html": ["자동차탁송", "대리운전"],
    "fare/index.html": ["fare-real-case-links", "1811-4294"],
    "reviews/verified/index.html": ["운행기록", "예상요금 조회", "카드대리운전 상담"],
    "service/daeri/index.html": ["real-long-distance-daeri", "daeri-image-provenance", "long-distance-daeri-trust"],
    "service/heavy-truck-taksong/index.html": ["25톤", "완료가 확인된 후기와는 다릅니다", "heavy-truck-types"],
    "service/golf/index.html": ["golf-driver-real-case", "golf-photo-standard", "golf-route-consult", "실제 운행 증빙사진 아님"],
    "service/daily-driver/index.html": ["daily-driver-real-route", "daily-photo-standard", "daily-route-consult", "참고 일러스트"],
    "service/long-distance-taksong/index.html": ["long-distance-verified-routes", "taksong-vehicle-visual-guide"],
}
issues=[]
for path, snippets in REQUIRED.items():
    file = ROOT / path
    if not file.is_file():
        issues.append(f"Missing page: {path}")
        continue
    content = file.read_text(encoding="utf-8")
    for item in snippets:
        if item not in content:
            issues.append(f"Missing required element {item!r} in {path}")

rides = ROOT / "data/ride-history.json"
try:
    data = json.loads(rides.read_text(encoding="utf-8"))
    if not isinstance(data, list) or len(data) < 2591:
        issues.append("Original 2,591 ride records are not intact")
except (OSError, ValueError) as error:
    issues.append(f"Ride-history data invalid: {error}")


# Verify that every published case state entry points to a real page
# and that a record cannot be included twice on different runs.
published_state = ROOT / "data/published-ride-case-ids.json"
if published_state.exists():
    try:
        published = json.loads(published_state.read_text(encoding="utf-8"))
        if not isinstance(published, list):
            raise ValueError("published state must be a list")
        keys = []
        for item in published:
            key = item.get("id") if isinstance(item, dict) else None
            if not isinstance(key, str) or len(key) != 16 or not all(c in "0123456789abcdef" for c in key):
                issues.append("Invalid published ride-case identifier")
                continue
            keys.append(key)
            case_file = ROOT / "reviews" / "verified" / key / "index.html"
            if not case_file.is_file():
                issues.append(f"Published ride-case page missing: {key}")
        if len(keys) != len(set(keys)):
            issues.append("Duplicate ride-case publication IDs found")
    except (OSError, ValueError) as error:
        issues.append(f"Invalid published ride-case state: {error}")


if issues:
    for issue in issues:
        print("FAIL:", issue, file=sys.stderr)
    raise SystemExit(1)
print("PASS: core service pages, route sections and ride-history baseline retained")
