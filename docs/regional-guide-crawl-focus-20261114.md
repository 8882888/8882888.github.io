# Regional guide crawl focus — 2026-11-14 KST

Production observations before this change:
- /sitemap-regional-guides.xml returned 21,488 URLs.
- /taksong/gyeonggi/icheon-si/yulhyeon-dong/fare/ and /taksong/gyeonggi/pocheon-si/donggyo-dong/fare/ returned HTTP 200, with zero direct excel history links.
- The extracted central fare explanation (from 요금에 영향을 주는 조건 to 내 출발 지역 확인, tags removed and whitespace normalized) had SequenceMatcher similarity 0.9929203539823008. This is a two-page section sample, not an all-page duplicate rate or confirmed Naver rejection diagnosis.

Changes:
- The regional-guide sitemap selects region/service pairs with existing reviewed topic/detail data; other place and activity entries are retained.
- Selected topic guides render that existing reviewed local topic/detail, safely escaped, alongside their existing task instructions and matched historical ride links.
- Local sitemap output: 170 URLs, including 118 regional task guides. This is one sitemap, not the full website URL count and not an indexed-page count.
- Existing guides remain HTTP 200 and keep their existing canonicals. No noindex, URL deletion or new workflow was added. Main locality/history sitemaps, original fares/reviews and 1811-4294 are unchanged.

Validation:
- node --check server.js passed.
- node tests/server.test.js passed, including added HTTP checks for reviewed sitemap inclusion, unreviewed permutation exclusion, existing URL retention and source detail rendering.
- node --test tests/seo-sitemap-regression.test.js: 30/30 passed.
- Source changes: fc2e1ba6951fd2175c3c1735b54e8fc8c27c31c6; tests: 5c30a371bdb17dd48bbc62159e6b740d15f6ec8e.

Limits and next check:
- Missing CLOUDTYPE_PROJECT was confirmed in the preceding deployment attempt. This report does not claim production deployment; verify the server fingerprint and 170-entry sitemap after the existing service is deployed.
- Naver's own rejection reasons/crawl logs and fresh Search Advisor indexing figures were not available. This change addresses a reproducible low-distinctiveness discovery pattern; it does not establish the sole cause of the reported 13 indexed pages or guarantee an increase.
- Official guidance: https://searchadvisor.naver.com/guide/seo-basic-create and https://searchadvisor.naver.com/guide/faq-serpmissing
