# Keyword automation

The collector stores keyword strings and provenance, never article bodies or automated search clicks.

- `python scripts/collect-keywords.py`: refresh the three configured public RSS feeds, merge normalized keywords, classify region/topic, and atomically write the compressed inventory.
- `python scripts/collect-keywords.py --offline`: rebuild inventory from existing collected strings and regional data without a network request.
- `data/keywords/inventory.jsonl.gz`: actual stored keyword records, including explicitly labelled generated regional expressions.
- `data/keywords/catalog.json`: small runtime index of named destinations and collected strings.
- `data/keywords/summary.json`: counts and per-source success/failure. Generated expressions are not reported as observed search demand.

The GitHub Actions `Keyword automation` workflow runs at minute 17 every six hours UTC (03:17, 09:17, 15:17, 21:17 Asia/Seoul), and on changes to its script/workflow. Actions schedules can be delayed. It validates, commits only the three data files, and pushes without force. A conflicting push fails rather than overwriting another change. The existing Cloudtype deployment workflow follows a successful collector via `workflow_run`, runs the server checks, and deploys the current main branch. This avoids relying on a GITHUB_TOKEN commit to trigger another push workflow.

Named keywords with unambiguous regional matches automatically connect to useful visit/return/vehicle recovery guides. Existing landmark URLs are preserved and enriched. Unresolved and expired feed names stay stored but are not published as new guides. Feed-only terms expire from public guides after 30 days without observation. Generated expressions link to existing regional service pages; they do not create a thin page for every expression. Public search is paginated and noindex. Only real guide URLs enter the sitemap.

Public routes:

- `/keyword-search/`: paginated keyword-to-website destination search.
- `/api/keyword-status`: actual collection and inventory status; not a search ranking report.
- `/visit/<id>/`: newly linked keyword guide, with address-based quote form and 1811-4294 call link.

Current sources are Google Trends KR RSS and two Google News RSS title feeds. A feed error preserves previous keyword history and is reported in status. Naver and SNS direct API connections are not configured; do not describe this implementation as collecting all Naver/SNS keywords. Add authenticated sources only through their supported APIs and environment secrets. No secrets belong in the catalog or source URLs.

Keywords cannot force search engines to index or rank the site. Search exposure, clicks, and conversions require independently measured analytics; `searchExposure` intentionally remains `not-measured`.

Verification: `node tests/server.test.js` and `python -m unittest discover -s tests -p 'test_keyword*.py'`.

## Public page correction (2026-10-25)

The public category view does not display inventory or generated-expression counts. `/activities/` and its 13 topic guides contain actual visible approved service cards, explanation, quote links and phone calls. These guides have indexable canonical URLs and are in the root sitemap. Category-only legacy search links redirect to the corresponding guide. Internal search stays noindex and preserves existing query links. Keyword status stays available through the separate JSON endpoint. Named destination guides now show the same actual image as their Open Graph primary image, with service-specific branding. Generated archive expressions are candidates, not observed popular searches or verified search-engine exposure.
