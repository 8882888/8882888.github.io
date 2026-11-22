#!/usr/bin/env python3
"""CI: published ride facts stay deterministic; related-case suggestions may evolve."""
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
CASE_DIR = ROOT / "reviews" / "verified"
RELATED = re.compile(r'<section id="related-cases">[\s\S]*?</section>')
SOURCE_URL = re.compile(r'href="/reviews/verified/([0-9a-f]{16})/"')

def stable_html(value, path):
    if path.parent == CASE_DIR:  # index listing contains no per-ride suggestions
        return value
    matches = RELATED.findall(value)
    if len(matches) != 1:
        raise AssertionError(f"Exactly one related-cases section is required: {path}")
    return RELATED.sub('<section id="related-cases">VALIDATED_DYNAMIC_LINKS</section>', value)

def source_at_head(path):
    relative = path.relative_to(ROOT).as_posix()
    return subprocess.check_output(["git", "show", "HEAD:" + relative], cwd=ROOT).decode("utf-8")

def main():
    import json
    state = json.loads((ROOT / "data/published-ride-case-ids.json").read_text(encoding="utf-8"))
    published_ids = {x["id"] for x in state}
    count, modified_suggestions = 0, 0
    for page in sorted(CASE_DIR.glob("*/index.html")):
        existing = source_at_head(page)
        generated = page.read_text(encoding="utf-8")
        if stable_html(existing, page) != stable_html(generated, page):
            raise AssertionError("Changed source-backed facts, canonical, title or HTML outside related-case suggestions: " + str(page))
        for link_id in SOURCE_URL.findall(RELATED.search(generated).group(0)):
            if link_id not in published_ids:
                raise AssertionError("Unpublished ride record linked in suggestions: " + link_id)
        if existing != generated:
            modified_suggestions += 1
        count += 1
    if count != len(published_ids):
        raise AssertionError(f"Published case pages {count} != immutable publication state {len(published_ids)}")
    print(f"PASS: {count} published pages preserve all titles, source facts, SEO metadata and canonical URLs.")
    print(f"Related links refreshed in {modified_suggestions} pages; all suggestions point to actual published IDs.")
    print("Publication ledger checked separately; no regenerated ride history inferred.")

if __name__ == "__main__":
    main()
