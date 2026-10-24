#!/usr/bin/env python3
"""Read-only regression checks. No deployment or generated files are modified."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PHONE = "1811-4294"
required = {
    "server.js": None,
    "package.json": '"start"',
    "assets/smart24-business-card.svg": PHONE,
    "tools/generate_pages.py": None,
    "tools/validate_site.py": None,
    "tools/configure_site.py": None,
    ".github/workflows/pages.yml": "Deploy to GitHub Pages",
}
errors = []
for relative, needle in required.items():
    path = ROOT / relative
    if not path.is_file():
        errors.append(f"Missing core file: {relative}")
    elif needle and needle not in path.read_text(encoding="utf-8"):
        errors.append(f"Missing required marker in {relative}: {needle}")

card = ROOT / "assets/smart24-business-card.svg"
if card.is_file():
    content = card.read_text(encoding="utf-8")
    for marker in (PHONE, "대리운전", "탁송", "<svg"):
        if marker not in content:
            errors.append(f"Business card missing: {marker}")

sitemap = ROOT / "sitemap.xml"
if sitemap.is_file():
    import xml.etree.ElementTree as ET
    try:
        ET.parse(sitemap)
    except ET.ParseError as exc:
        errors.append(f"Invalid sitemap XML: {exc}")

if errors:
    print("FAIL: Smart24 invariants")
    print("\n".join(errors))
    sys.exit(1)
print("PASS: Smart24 source files, business card branding, and base sitemap XML")
print("NOTE: This does not establish Cloudtype deployment, runtime API health, or SEO rankings.")
