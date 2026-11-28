"""Build the static site: src/ -> dist/. Standard library only.

Each file in src/pages/ starts with a JSON header in an HTML comment:
    <!--{"title": "...", "description": "...", "card": "short text for the home grid"}-->
followed by the page body. A <script> block at the end of a page is moved to
the bottom of the layout. Pages with "card" are listed on the home page.

Usage:  py build.py            (writes dist/)
"""
import datetime
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

HEADER = re.compile(r"^\s*<!--(\{.*?\})-->\s*", re.S)
SCRIPT = re.compile(r"<script>.*?</script>\s*$", re.S)


def load_pages():
    pages = []
    for path in sorted((SRC / "pages").glob("*.html")):
        text = path.read_text(encoding="utf-8")
        m = HEADER.match(text)
        if not m:
            raise SystemExit(f"{path.name}: missing JSON header comment")
        meta = json.loads(m.group(1))
        body = text[m.end():]
        script = ""
        s = SCRIPT.search(body)
        if s:
            script, body = s.group(0), body[: s.start()]
        slug = path.stem
        meta.setdefault("order", 99)
        pages.append({"slug": slug, "meta": meta, "body": body, "script": script})
    return pages


def page_url(site, slug):
    if slug == "index":
        return site["url"] + "/"
    if slug == "404":
        return site["url"] + "/404.html"
    return f"{site['url']}/{slug}/"


def ad_slot(site):
    # Auto ads (the head script) place ads by themselves. A fixed spot here needs an
    # ad unit's slot id from AdSense ("slot" in site.json); without one, leave it out.
    ads = site["adsense"]
    if not ads["enabled"] or not ads.get("slot"):
        return ""
    return (f'<div class="ad-slot"><ins class="adsbygoogle" style="display:block" '
            f'data-ad-client="{ads["client"]}" data-ad-slot="{ads["slot"]}" '
            f'data-ad-format="auto" data-full-width-responsive="true"></ins>'
            f'<script>(adsbygoogle=window.adsbygoogle||[]).push({{}});</script></div>')


def build():
    site = json.loads((ROOT / "site.json").read_text(encoding="utf-8"))
    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    pages = load_pages()
    version = datetime.datetime.now().strftime("%Y%m%d%H%M%S")

    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC / "assets", DIST / "assets")

    cards = sorted((p for p in pages if "card" in p["meta"]), key=lambda p: (p["meta"]["order"], p["meta"]["title"]))
    # Tools are grouped by the "game" key in their header, in first-seen order.
    games = []
    for p in cards:
        g = p["meta"].get("game", "Other")
        if g not in games:
            games.append(g)
    grid = ""
    for g in games:
        grid += f'<h3 class="game">{html.escape(g)}</h3><ul class="grid">' + "".join(
            f'<li><a href="/{p["slug"]}/"><strong>{html.escape(p["meta"].get("short", p["meta"]["title"]))}</strong>'
            f'<span>{html.escape(p["meta"]["card"])}</span></a></li>'
            for p in cards if p["meta"].get("game", "Other") == g) + "</ul>"

    ads_head = ""
    if site["adsense"]["enabled"]:
        ads_head = ('<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
                    f'?client={site["adsense"]["client"]}" crossorigin="anonymous"></script>')

    for p in pages:
        meta = p["meta"]
        url = page_url(site, p["slug"])
        title = meta["title"] if p["slug"] == "index" else f'{meta["title"]} | {site["name"]}'
        jsonld = ""
        if "card" in meta:
            jsonld = '<script type="application/ld+json">' + json.dumps({
                "@context": "https://schema.org", "@type": "WebApplication",
                "name": meta["title"], "url": url, "description": meta["description"],
                "applicationCategory": "GameApplication", "operatingSystem": "Any",
                "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            }) + "</script>"
        if p["slug"] == "index":
            # Site name in Google results (supported for subdomains; markup on the home page).
            jsonld += '<script type="application/ld+json">' + json.dumps({
                "@context": "https://schema.org", "@type": "WebSite", "name": site["name"],
                "alternateName": [site["url"].split("://", 1)[1]], "url": site["url"] + "/"}) + "</script>"
        # data-nosnippet keeps Google from quoting a calculator's live result box in search snippets.
        body = (p["body"].replace('<div class="calc-card">', '<div class="calc-card" data-nosnippet>')
                .replace("{{calc_list}}", grid)
                .replace("{{ad}}", ad_slot(site))
                .replace("{{contact}}", site["contact"])
                .replace("{{site_name}}", site["name"]))
        out = layout
        for key, val in {
            "title": html.escape(title), "description": html.escape(meta["description"]),
            "canonical": url, "site_name": html.escape(site["name"]), "owner": html.escape(site["owner"]),
            "year": str(datetime.date.today().year), "version": version, "ads_head": ads_head,
            "jsonld": jsonld, "scripts": p["script"], "content": body,
        }.items():
            out = out.replace("{{" + key + "}}", val)
        if "{{" in out:
            raise SystemExit(f"{p['slug']}: unreplaced placeholder near: {out[out.index('{{'):][:40]}")
        if p["slug"] in ("index", "404"):
            dest = DIST / f"{p['slug']}.html"
        else:
            dest = DIST / p["slug"] / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out, encoding="utf-8")

    today = datetime.date.today().isoformat()
    urls = [page_url(site, p["slug"]) for p in pages if p["slug"] != "404"]
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls)
        + "</urlset>\n", encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {site['url']}/sitemap.xml\n", encoding="utf-8")
    pub = site["adsense"]["client"].replace("ca-", "")
    (DIST / "ads.txt").write_text(f"google.com, {pub}, DIRECT, f08c47fec0942fa0\n", encoding="utf-8")
    host = site["url"].split("://", 1)[1]
    (DIST / "CNAME").write_text(host + "\n", encoding="utf-8")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Built {len(pages)} pages into {DIST}")


if __name__ == "__main__":
    build()
