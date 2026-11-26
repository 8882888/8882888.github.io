#!/usr/bin/env python3
"""No network: prevent transient Cloudtype rollout races becoming fake SEO failures."""
import hashlib
import json
from pathlib import Path
import runpy
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
AUDIT = runpy.run_path(str(ROOT / "tests/production-seo-smoke.py"))
CHECK = AUDIT["check_deployed_source"]
EXPECTED = hashlib.sha256((ROOT / "server.js").read_bytes()).hexdigest()


def result_hash(value):
    return ("/health/seo.json", 200, "https://jeongukdaeri.kr/health/seo.json",
            {"Content-Type": "application/json"},
            json.dumps({"deployment_hashes": {"server.js": value}}), None)


class ProductionReleaseProofTests(unittest.TestCase):
    def test_eventual_matching_hash_succeeds_after_bounded_transient_rollout(self):
        fetch_mock = Mock(side_effect=[result_hash("old-release"), result_hash(EXPECTED)])
        with patch.dict(CHECK.__globals__, {"fetch": fetch_mock}), patch.object(AUDIT["time"], "sleep") as sleep:
            self.assertEqual(CHECK(), ("/health/seo.json", []))
        self.assertEqual(fetch_mock.call_count, 2)
        sleep.assert_called_once_with(3)

    def test_persistent_stale_hash_fails_instead_of_claiming_deployment(self):
        fetch_mock = Mock(return_value=result_hash("still-old"))
        with patch.dict(CHECK.__globals__, {"fetch": fetch_mock}), patch.object(AUDIT["time"], "sleep") as sleep:
            path, errors = CHECK()
        self.assertEqual(path, "/health/seo.json")
        self.assertEqual(fetch_mock.call_count, 3)
        self.assertEqual(sleep.call_count, 2)
        self.assertTrue(any("differs" in e for e in errors))

    def test_bad_json_fails_immediately(self):
        fetch_mock = Mock(return_value=("/health/seo.json", 200, "", {}, "{bad-json", None))
        with patch.dict(CHECK.__globals__, {"fetch": fetch_mock}), patch.object(AUDIT["time"], "sleep") as sleep:
            _, errors = CHECK()
        self.assertTrue(any("Invalid deployment proof" in e for e in errors))
        self.assertEqual(fetch_mock.call_count, 1)
        sleep.assert_not_called()

    def test_transient_unavailable_health_eventually_succeeds(self):
        error = ("/health/seo.json", None, None, {}, "", "read timed out")
        fetch_mock = Mock(side_effect=[error, result_hash(EXPECTED)])
        with patch.dict(CHECK.__globals__, {"fetch": fetch_mock}), patch.object(AUDIT["time"], "sleep") as sleep:
            self.assertEqual(CHECK()[1], [])
        self.assertEqual(fetch_mock.call_count, 2)
        sleep.assert_called_once_with(3)

    def test_approved_recruitment_title_and_canonical_remain_required(self):
        path = "/recruit/daeri/"
        url = "https://jeongukdaeri.kr" + path
        title = "대리기사모집 · 대리운전기사 지원 | 전국 스마트24"
        body = f'<title>{title}</title><link rel="canonical" href="{url}"><meta name="robots" content="index,follow">'
        verify = AUDIT["verify"]
        self.assertEqual(verify((path, 200, url, {}, body, None)), (path, []))
        self.assertTrue(verify((path, 200, url, {}, body.replace(title, "일반 대리운전"), None))[1])
        self.assertTrue(verify((path, 200, url, {}, body.replace("index,follow", "noindex"), None))[1])


if __name__ == "__main__":
    unittest.main()
