#!/usr/bin/env python3
"""Regenerate already-published verified case pages without changing source records or publish timestamps."""
import json
from publish_verified_case import OUT, SOURCE, STATE, complete, identifier, render_case

def main():
    records = json.loads(SOURCE.read_text(encoding="utf-8"))
    published = json.loads(STATE.read_text(encoding="utf-8"))
    by_id = {identifier(row): row for row in records if complete(row)}
    missing = [entry.get("id") for entry in published if entry.get("id") not in by_id]
    if missing:
        raise SystemExit("Published IDs missing complete source records: " + ", ".join(missing))
    for entry in published:
        case_id = entry["id"]
        page = OUT / case_id / "index.html"
        if not page.is_file():
            raise SystemExit("Published page missing; refusing to create an unlisted URL: " + case_id)
        page.write_text(render_case(by_id[case_id], records, published), encoding="utf-8")
    print("Regenerated", len(published), "existing verified case pages from unchanged source records.")
    print("Published IDs and published_at timestamps were not modified.")

if __name__ == "__main__":
    main()
