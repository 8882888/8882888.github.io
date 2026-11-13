# Production indexability verification — 2026-11-13 UTC

## Evidence
- Full audit: https://github.com/8882888/8882888.github.io/actions/runs/43476405645
- Artifact: https://github.com/8882888/8882888.github.io/actions/runs/43476405645/artifacts/14072449133
- Completed all 36,608 discovered URLs: 36,595 passed; 13 initial fetch failures.
- No sitemap parsing errors or crawler diagnostics were recorded.
- On a separate production retry, all 13 failed URLs returned HTTP 200, without redirects, with self-referencing canonical URLs and no detected noindex directive. The initial network failures were not reproduced. This does not establish their root cause or uninterrupted availability.
- Seven deployment hashes exposed by /health/seo.json match the corresponding files in main at 0c2616d217c992132ab79ece1fd8bca6e237333b. This verifies those seven files, not the entire deployment.

## Previously applied audit repairs verified by this run
- Body consumption retains the request timeout.
- Partial results checkpoint every 500 URLs.
- Existing full audit timeout accommodates the observed workload.
- The existing workflow follows successful official release verification, including manual releases.
- Full audit now completed and uploaded its artifacts; the earlier 90-minute run lost results at 34,000 URLs.
- No additional deployment workflow was added.

## Remaining work and limitations
- Automatic Cloudtype deployment remains blocked by missing CLOUDTYPE_PROJECT; do not infer its value or deploy through k337711.
- The audit reports 32,144 regional service pages, of which 21,216 lack a link recognized by the actual-ride-link detector. Inspect evidence and detector coverage before adding links; absence of verified regional records must not be replaced with fabricated reviews.
- 1,236 URLs appear in multiple sitemaps. They are deduplicated before inspection; this is not 1,236 duplicate pages.
- Server tests still have stale expected copy/title assertions; sitemap assertions were updated separately. Do not claim the entire server suite passes.
- Another existing full audit is already running (43495199204); no duplicate run was started for the 13 retries.
- Neither 36,608 sitemap URLs nor successful technical checks are Naver indexed-page counts. No new Search Advisor indexing, impression, or ranking evidence was obtained.
- Prices, actual reviews, and phone 1811-4294 were not changed.

## Retried URLs
- https://jeongukdaeri.kr/daeri/gyeonggi/icheon-si/yulhyeon-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/taksong/gyeonggi/icheon-si/yulhyeon-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/daeri/gyeonggi/pocheon-si/donggyo-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/taksong/gyeonggi/pocheon-si/donggyo-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/taksong/chungbuk/cheongju-si/sangdang-gu/sanseong-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/daeri/chungbuk/cheongju-si/sangdang-gu/yongam-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/daeri/jeonbuk/gunsan-si/jangjae-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/taksong/jeonbuk/gunsan-si/jangjae-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/taksong/jeonbuk/gunsan-si/miwon-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/daeri/gyeongbuk/gyeongsan-si/jeomchon-dong/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/reviews/history/excel-1955/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/reviews/history/excel-1957/ — HTTP 200, canonical matches, no redirect/noindex detected.
- https://jeongukdaeri.kr/reviews/history/excel-1959/ — HTTP 200, canonical matches, no redirect/noindex detected.
