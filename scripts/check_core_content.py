#!/usr/bin/env python3
"""Safety checks for scheduled Smart24 content updates (no external requests)."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REQUIRED = {
    "index.html": ["five-service-fastlinks", "card-daeri-top", "route-first-real-trips"],
    "service/card-daeri/index.html": ["card-payment-faq", "1811-4294"],
    "special/seoraksan-transport/index.html": ["seoraksan-fare-first", "seoraksan-review-shortcuts"],
    "special/cycling-trail-transport/index.html": ["cycling-card-fare-first", "cycling-route-index"],
    "reviews/ride-record-stories/index.html": ["자동차탁송", "대리운전"],
    "reviews/verified/index.html": ["운행기록"],
    "service/heavy-truck-taksong/index.html": ["25톤", "완료가 확인된 후기와는 다릅니다"],
    "service/golf/index.html": ["golf-driver-real-case", "실제 운행 증빙사진 아님"],
    "service/daily-driver/index.html": ["daily-driver-real-route", "참고 일러스트"],
    "service/long-distance-taksong/index.html": ["long-distance-verified-routes"],
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

if issues:
    for issue in issues:
        print("FAIL:", issue, file=sys.stderr)
    raise SystemExit(1)
print("PASS: core service pages, route sections and ride-history baseline retained")
