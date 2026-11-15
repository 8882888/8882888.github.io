import unittest
from tools.audit_live_busan_reviews import is_review_first, has_review_near_top

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

class BusanReviewPlacementTest(unittest.TestCase):
    def test_direct_answer_and_booking_may_precede_verified_review(self):
        review="busan-taksong-real-review-first-20261104"
        self.assertTrue(has_review_near_top([review]))
        self.assertTrue(has_review_near_top(["regional-direct-answer","regional-booking-first",review]))

    def test_unrelated_content_or_buried_review_rejected(self):
        review="busan-taksong-real-review-first-20261104"
        self.assertFalse(has_review_near_top(["unrelated-seo-stuff",review]))
        self.assertFalse(has_review_near_top(["regional-direct-answer","regional-booking-first","unrelated",review]))
        self.assertFalse(has_review_near_top(["regional-direct-answer"]))
        self.assertFalse(has_review_near_top([]))

if __name__ == "__main__":
    unittest.main()
