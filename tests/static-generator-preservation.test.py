#!/usr/bin/env python3
"""Ensure backup generation cannot replace manually curated SEO pages."""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory

module_path = Path(__file__).resolve().parents[1] / "tools" / "generate_pages.py"
spec = importlib.util.spec_from_file_location("smart24_page_generator", module_path)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

existing_service = ("daeri", "taksong", "long-distance-taksong", "corporate", "daily-driver", "golf")
existing_special = ("nationwide-daeri", "24-hour-service", "cycling-trail-transport",
                    "seoraksan-transport", "jirisan-transport", "nationwide-transport",
                    "outskirts-service", "pension-daeri", "valley-daeri")
with TemporaryDirectory(prefix="smart24-preserve-") as directory:
    generator.ROOT = Path(directory)
    preserved = {}
    for kind, names in (("service", existing_service), ("special", existing_special)):
        for name in names:
            file = generator.ROOT / kind / name / "index.html"
            file.parent.mkdir(parents=True, exist_ok=True)
            sentinel = "<!doctype html><html><body>VERIFIED-ORIGINAL:" + kind + "/" + name + "</body></html>"
            file.write_text(sentinel, encoding="utf-8")
            preserved[file] = sentinel

    urls = set()
    generator.generate_service_pages(urls)
    generator.generate_topic_pages(urls)
    for file, original in preserved.items():
        assert file.read_text(encoding="utf-8") == original, "Editorial page overwritten: " + str(file)
        expected_url = generator.SITE_URL + "/" + file.relative_to(generator.ROOT).parent.as_posix() + "/"
        assert expected_url in urls, "Preserved page missing from sitemap: " + expected_url

    for path in ("special/camping-car-transport/index.html",
                 "special/truck-transport/index.html"):
        assert (generator.ROOT / path).is_file(), "Generator failed to create missing informational page: " + path

print("PASS: preserved 15 editorial pages; retained sitemap entries; created missing service topic pages")
