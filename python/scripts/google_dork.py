"""
RedHawk — Google Dorking Script
Performs Google searches and returns structured results.
Usage: python google_dork.py <dork_query>
"""

import sys
import json
import re
import time
import urllib.parse
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def google_dork(query: str, max_results: int = 50) -> list[dict]:
    """
    Perform a Google dork search. Returns list of {url, title, snippet}.
    Uses direct HTTP scraping (no API key needed).
    """
    results = []
    start = 0
    results_per_page = 10

    while len(results) < max_results:
        url = (
            "https://www.google.com/search?"
            f"q={urllib.parse.quote(query)}"
            f"&start={start}"
            "&num=10"
            "&hl=en"
        )

        try:
            req = Request(url, headers=HEADERS)
            resp = urlopen(req, timeout=15)
            html = resp.read().decode("utf-8", errors="ignore")
        except HTTPError as e:
            if e.code == 429:
                # Rate limited — return what we have
                break
            return [{"error": f"HTTP {e.code}: {e.reason}"}]
        except URLError as e:
            return [{"error": f"Connection error: {e.reason}"}]
        except Exception as e:
            return [{"error": f"Search failed: {str(e)}"}]

        # Parse results using regex (no external parser needed)
        # Find result blocks: <a> tags with href in result divs
        found_any = False

        # Pattern 1: Standard results
        # Look for h3 (headings) which contain the title
        title_pattern = re.compile(r'<h3[^>]*>(.*?)</h3>', re.DOTALL | re.IGNORECASE)
        link_pattern = re.compile(r'<a[^>]*href=["\'](/url\?q=|https?://)([^"&\']+)', re.IGNORECASE)
        snippet_pattern = re.compile(r'<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>(.*?)</div>', re.DOTALL | re.IGNORECASE)

        titles = title_pattern.findall(html)
        links = link_pattern.findall(html)
        snippets = snippet_pattern.findall(html)

        # Also try alternative Google result containers
        if not titles:
            alt_title = re.compile(r'<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>(.*?)</div>', re.DOTALL | re.IGNORECASE)
            titles = alt_title.findall(html)

        if not links:
            alt_link = re.compile(r'<a[^>]*href=["\'](https?://[^"&\']+)["\'][^>]*>', re.IGNORECASE)
            all_links = alt_link.findall(html)
            # Filter out google domains
            links = [("", l) for l in all_links if "google.com" not in l]

        # Clean up titles
        clean_titles = []
        for t in titles:
            clean = re.sub(r'<[^>]+>', '', t).strip()
            if clean and len(clean) > 3:
                clean_titles.append(clean)

        # Clean up snippets
        clean_snippets = []
        for s in snippets:
            clean = re.sub(r'<[^>]+>', '', s).strip()
            if clean:
                clean_snippets.append(clean)

        # Match them up
        result_count = min(len(clean_titles), len(links))

        for i in range(result_count):
            url_str = links[i][1] if isinstance(links[i], tuple) else links[i]
            # URL decode
            url_str = urllib.parse.unquote(url_str)
            # Remove google redirect prefix
            if url_str.startswith("/url?q="):
                url_str = url_str[7:].split("&")[0]

            if not url_str.startswith("http"):
                continue

            snippet = clean_snippets[i] if i < len(clean_snippets) else ""

            entry = {
                "url": url_str,
                "title": clean_titles[i],
                "snippet": snippet,
            }

            # Deduplicate
            if not any(r["url"] == url_str for r in results):
                results.append(entry)
                found_any = True

        # If we didn't find any new results, try alternative parsing
        if not found_any:
            # Last resort: grab all links
            all_links = re.findall(r'href=["\'](https?://[^"\'&]+)["\']', html)
            seen = set()
            for link in all_links:
                if "google.com" not in link and link not in seen:
                    seen.add(link)
                    results.append({"url": link, "title": link, "snippet": ""})

        start += results_per_page

        # If we got fewer results than requested, we hit the end
        if not found_any:
            break

        # Be polite — delay between pages
        time.sleep(1.5)

    return results[:max_results]


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No dork query provided. Usage: google_dork.py <query>"}))
        sys.exit(1)

    query = " ".join(sys.argv[1:]).strip()
    max_results = 50

    # Check for --max flag
    if "--max" in sys.argv:
        idx = sys.argv.index("--max")
        if idx + 1 < len(sys.argv):
            try:
                max_results = int(sys.argv[idx + 1])
            except ValueError:
                pass

    results = google_dork(query, max_results)

    output = {
        "query": query,
        "results": results,
        "total": len(results),
    }

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
