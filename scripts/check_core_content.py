#!/usr/bin/env python3
"""Safety checks for scheduled Smart24 content updates (no external requests)."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REQUIRED = {
    "reviews/taksong/index.html": ["자동차탁송 운행완료 기록 후기", "1811-4294"],
    "reviews/daeri/index.html": ["대리운전 운행완료 기록 후기", "1811-4294"],
    "assets/service-taksong-visual.svg": ["taksong-marketing-number-plate","1811-4294"],
    "service/corporate/index.html": ["corporate-image-and-consult-1811"],
    "reviews/verified/d09f9ce6526e3f85/index.html": ["verified-daeri-illustration"],
    "index.html": ["real-completed-service-hubs-202611","homepage-fare-top","five-menu-mobile-layout","review-service-image-grid","route-first-real-trips","1811-4294","mountain-cycle-review-three-links-202611"],
    "service/card-daeri/index.html": ["card-payment-faq","card-region-consultation","card-route-fare-steps","card-daeri-trust-links","card-daeri-search-intent","card-daeri-fact-check","mobile-card-call","1811-4294"],
    "special/seoraksan-transport/index.html": ["seoraksan-fare-first","seoraksan-review-shortcuts","seoraksan-search-call-guide-202611","special-to-fare-202611"],
    "special/cycling-trail-transport/index.html": ["cycling-card-fare-first","cycling-route-index","cycling-four-route-consult-202611","special-to-fare-202611"],
    "reviews/ride-record-stories/index.html": ["자동차탁송","대리운전","review-taksong-shortlist-202611"],
    "fare/index.html": ["fare-real-case-links","fare-special-routes-202611","route-fare-preset-styles","data-fare-from","1811-4294"],
    "reviews/verified/index.html": ["운행기록","예상요금 조회","카드대리운전 상담"],
    "service/daeri/index.html": ["real-long-distance-daeri","daeri-image-provenance","long-distance-daeri-trust","daeri-review-visual-1811"],
    "service/heavy-truck-taksong/index.html": ["25톤","완료가 확인된 후기와는 다릅니다","heavy-truck-types","heavy-dispatch-verification-8","heavy-25t-wingbody-photo-1811"],
    "service/golf/index.html": ["golf-driver-real-case","golf-photo-standard","golf-route-consult","golf-driver-comparison-8","golf-visual-and-callback-1811","실제 운행 증빙사진 아님"],
    "service/daily-driver/index.html": ["daily-driver-real-route","daily-photo-standard","daily-route-consult","daily-golf-photo-and-fare-1811","참고 일러스트"],
    "service/long-distance-taksong/index.html": ["long-distance-verified-routes","taksong-vehicle-visual-guide","long-taksong-route-comparison","long-taksong-1811-plate"],
}
issues=[]
# Only the requested five service links should appear in the primary menu.
homepage = (ROOT / "index.html").read_text(encoding="utf-8")
nav_start = homepage.find('<nav class="top-nav"')
nav_end = homepage.find('</nav>', nav_start)
if nav_start < 0 or nav_end < 0:
    issues.append("Primary navigation missing")
else:
    import re
    menu = homepage[nav_start:nav_end]
    hrefs = re.findall(r'<a\b[^>]*href="([^"]+)"', menu)
    expected = ["/daeri/", "/taksong/", "/service/corporate/", "/service/golf/",
                "https://open.kakao.com/o/sGV88r7h"]
    if hrefs != expected:
        issues.append(f"Primary navigation must have exactly five requested links; got {hrefs!r}")

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
