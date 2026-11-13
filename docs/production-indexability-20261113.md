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

## Follow-up — 2026-11-14 06:34 KST run

- Main before changes: adb061c25b837d75a41fc05001adcdd15550af14. All seven exposed production hashes still match.
- Latest completed full audit 43495199204 checked 36,608 URLs; 33 fetch failures, no sitemap errors or crawler diagnostics. These 33 were not retried in this run and must not be described as recovered based on the earlier 13-URL retry. Artifact 14077639227 preserves the exact affected URLs.
- Reproduced four failures in tests/seo-sitemap-regression.test.js from job 132165405427. They required the retired nested history sitemap or exact adjacency of source fragments even though additional legitimate sections were inserted.
- Commit b325adcced61ad94a0b6fc96b88cc49895292230 corrects these expectations while retaining direct history-shard coverage, evidence-backed regional sitemap membership, answer-first content, and near-top verified-history requirements. All 30 tests in this file pass locally (previously 26).
- Production recheck: robots.txt HTTP 200 with root sitemap declaration; sitemap-all.xml HTTP 200 with 21 children including all six history shards directly and no nested history index; history shard six HTTP 200 with 82 URLs.
- Both national /taksong/ and /daeri/ return HTTP 200 and contain their direct-answer and national-verified-history-links sections in server HTML.
- This is a test repair, not a runtime/site content change. Existing server.test.js copy/title failures still block the broader deployment verification job; no claim that the whole CI suite passes. Missing CLOUDTYPE_PROJECT remains unresolved.
- No new deployment workflow or additional full-audit run was created; existing audit 43506608474 was already running.
