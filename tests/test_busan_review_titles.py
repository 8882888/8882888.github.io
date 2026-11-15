import unittest
from tools.audit_live_busan_reviews import is_review_first

class BusanReviewTitleTest(unittest.TestCase):
    def test_genuine_review_first_variations(self):
        for title in (
            "부산탁송 후기｜연산동 차량탁송",
            "부산탁송 실제 운행후기｜부산→대구 8만원·km조회·빠른배차·예약배차 안내",
            "부산탁송 실제후기｜확인된 구간",
            "부산탁송 운행후기｜기장군 출발",
        ):
            with self.subTest(title=title):
                self.assertTrue(is_review_first(title))

    def test_reject_nonreview_or_other_region_titles(self):
        for title in (
            "부산탁송 요금조회 및 상담",
            "해운대탁송 후기",
            "부산대리운전 실제 운행후기",
            "대구탁송 후기",
        ):
            with self.subTest(title=title):
                self.assertFalse(is_review_first(title))

if __name__ == "__main__":
    unittest.main()
