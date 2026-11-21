#!/usr/bin/env python3
"""Keep already-published verified ride pages source-backed across both original datasets."""
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import enrich_published_verified_cases as enrich
from publish_verified_case import complete, identifier


class PublishedCaseSourceMergeTests(unittest.TestCase):
    def test_all_existing_publication_ids_resolve_to_complete_source_records(self):
        records = enrich.load_source_records()
        published = json.loads(enrich.STATE.read_text(encoding="utf-8"))
        found = {identifier(row): row for row in records if complete(row)}
        missing = [entry["id"] for entry in published if entry["id"] not in found]
        self.assertEqual(missing, [], "Never invent missing published ride records")
        for entry in published:
            self.assertEqual(found[entry["id"]]["service"], entry["service"])

    def test_queue_only_case_regenerates_without_changing_published_state(self):
        ride = {"date": "2026-11-20", "service": "taksong", "departure": "검증 출발지",
                "destination": "검증 도착지", "fare": "20,000원",
                "status": "completed", "verified": True}
        case_id = identifier(ride)
        state = [{"id": case_id, "service": "taksong",
                  "published_at": "2026-11-20T00:00:00+00:00"}]
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            source, queue, published, output = (
                root / "base.json", root / "queue.json",
                root / "published.json", root / "verified")
            source.write_text("[]", encoding="utf-8")
            queue.write_text(json.dumps([ride], ensure_ascii=False), encoding="utf-8")
            original_state = json.dumps(state, ensure_ascii=False)
            published.write_text(original_state, encoding="utf-8")
            page = output / case_id / "index.html"
            page.parent.mkdir(parents=True)
            page.write_text("before", encoding="utf-8")
            with (patch.object(enrich, "SOURCE", source),
                  patch.object(enrich, "QUEUE", queue),
                  patch.object(enrich, "STATE", published),
                  patch.object(enrich, "OUT", output)):
                enrich.main()
            self.assertIn("검증 출발지", page.read_text(encoding="utf-8"))
            self.assertIn("검증 도착지", page.read_text(encoding="utf-8"))
            self.assertEqual(published.read_text(encoding="utf-8"), original_state)


if __name__ == "__main__":
    unittest.main()
