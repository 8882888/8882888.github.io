#!/usr/bin/env python3
"""Keep each already published verified ride searchable under its original source date."""
import html
import json
import pathlib
import re
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from publish_verified_case import SOURCE, QUEUE, STATE, OUT, complete, identifier, distinctive_case_title

class VerifiedCaseTitleIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = json.loads(SOURCE.read_text(encoding="utf-8"))
        if QUEUE.exists():
            cls.records.extend(json.loads(QUEUE.read_text(encoding="utf-8")))
        cls.published = json.loads(STATE.read_text(encoding="utf-8"))
        cls.by_id = {identifier(r): r for r in cls.records if complete(r)}

    def test_every_published_case_retains_original_id_date_fare_and_unique_search_title(self):
        titles = []
        for entry in self.published:
            ride_id = entry["id"]
            self.assertIn(ride_id, self.by_id, "No unpublished or invented ride allowed")
            ride = self.by_id[ride_id]
            self.assertEqual(entry["service"], ride["service"])
            page = (OUT / ride_id / "index.html").read_text(encoding="utf-8")
            title_match = re.search(r"<title>(.*?)</title>", page, re.I | re.S)
            heading_match = re.search(r"<h1>(.*?)</h1>", page, re.I | re.S)
            self.assertIsNotNone(title_match, ride_id)
            self.assertIsNotNone(heading_match, ride_id)
            title = html.unescape(title_match.group(1))
            heading = html.unescape(heading_match.group(1))
            expected = distinctive_case_title(ride, self.records, self.published)
            self.assertEqual(title, expected + " | 스마트24", ride_id)
            self.assertEqual(heading, expected, ride_id)
            self.assertIn(f'<dd>{html.escape(ride["date"])}</dd>', page, ride_id)
            self.assertIn(f'<dd>{html.escape(ride["fare"])}</dd>', page, ride_id)
            self.assertIn(f'<link rel="canonical" href="https://jeongukdaeri.kr/reviews/verified/{ride_id}/">', page)
            self.assertNotRegex(page, r'<meta\b[^>]*\bname=["\x27]robots["\x27][^>]*\bnoindex')
            titles.append(title)
        self.assertEqual(len(titles), len(self.published))
        self.assertEqual(len(set(titles)), len(titles), "Two published real cases share a search title")

    def test_only_real_date_disambiguates_same_route_and_keeps_single_routes_unchanged(self):
        duplicate = [r for r in self.records if complete(r)
                     and r["departure"] == "경기도 양주시 산북동"
                     and r["destination"] == "인천광역시 부평구 부개동"
                     and r["service"] == "taksong" and r["date"] in ("2026-11-18", "2026-11-19")]
        self.assertEqual(len({identifier(r) for r in duplicate}), 2)
        actual_titles = [distinctive_case_title(r, self.records, self.published) for r in duplicate]
        self.assertEqual(len(set(actual_titles)), 2)
        for row, title in zip(duplicate, actual_titles):
            self.assertTrue(title.startswith(row["date"] + " "))
            self.assertIn(row["departure"], title)
            self.assertIn(row["destination"], title)
        unrelated = next(r for r in self.records if complete(r)
                         and r["departure"] == "경기도 김포시 장기동"
                         and r["destination"] == "경기도 고양시 일산서구 대화동")
        single_title = distinctive_case_title(unrelated, self.records, self.published)
        self.assertFalse(single_title.startswith(unrelated["date"] + " "))

    def test_identical_day_separately_verified_route_uses_real_fare_as_second_disambiguator(self):
        first = {"date":"2026-11-15","service":"taksong","departure":"테스트 출발",
                 "destination":"테스트 도착","fare":"30,000원","status":"completed","verified":True}
        second = dict(first, fare="35,000원")
        both = [first, second]
        published = [{"id":identifier(r),"service":"taksong"} for r in both]
        first_title = distinctive_case_title(first, both, published)
        second_title = distinctive_case_title(second, both, published)
        self.assertNotEqual(first_title, second_title)
        self.assertIn("30,000원", first_title)
        self.assertIn("35,000원", second_title)
        self.assertEqual(distinctive_case_title(first, both, published[:1]),
                         "테스트 출발 → 테스트 도착 자동차탁송 운행기록")

if __name__ == "__main__":
    unittest.main()
