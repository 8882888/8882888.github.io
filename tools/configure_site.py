#!/usr/bin/env python3
"""Apply the selected canonical host to the GitHub Pages deployment artifact."""
import os
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(".")
DEFAULT_URL = "https://8882888.github.io"
SITE_URL = os.environ.get("SITE_URL", "https://jeongukdaeri.kr").strip().rstrip("/")
if not SITE_URL.startswith("https://"):
    raise SystemExit("SITE_URL must be an https:// URL.")
parts = urlsplit(SITE_URL)
if not parts.netloc or parts.path or parts.query or parts.fragment:
    raise SystemExit("SITE_URL must be an origin only, e.g. https://example.com")

changed = 0
for path in ROOT.rglob("*.html"):
    if ".git" in path.parts:
        continue
    text = path.read_text(encoding="utf-8")
    updated = text.replace(DEFAULT_URL, SITE_URL)
    updated = updated.replace("스마트번개대리운전", "스마트전국대리운전 스마트24탁송")
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        changed += 1

robots = ROOT / "robots.txt"
if robots.exists():
    lines = robots.read_text(encoding="utf-8").splitlines()
    # Preserve each sitemap path, including the separately deployed project site.
    # Replacing all directives with /sitemap.xml hides those additional maps.
    def rewrite_sitemap(line):
        match = re.match(r"^Sitemap:\s*(.+)$", line, flags=re.I)
        if not match:
            return line
        sitemap_url = urlsplit(match.group(1).strip())
        if sitemap_url.netloc.lower() == "8882888.github.io":
            return "Sitemap: " + SITE_URL + (sitemap_url.path or "/sitemap.xml")
        return line

    lines = [rewrite_sitemap(line) for line in lines]
    robots.write_text("\n".join(lines) + "\n", encoding="utf-8")

# A CNAME file is only added for a custom host; GitHub's default host needs none.
if parts.netloc.lower() != "8882888.github.io":
    (ROOT / "CNAME").write_text(parts.netloc.lower() + "\n", encoding="utf-8")

print(f"Configured canonical host {SITE_URL}; updated {changed} HTML files.")
