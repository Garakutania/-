#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""宇宙ビジネス・宇宙開発ニュースの毎朝クローラー。

前日00:00(JST)から実行時点までに公開された宇宙関連ニュースをWEB上の
RSS/Atomフィードから収集し、カテゴリ別に整理した要約記事(Markdown / HTML)を生成する。

依存ライブラリなし(Python標準ライブラリのみ)。
ANTHROPIC_API_KEY が設定されている場合は Claude API を使って
「今日のまとめ」の論説パートを生成する(未設定なら自動生成の要約にフォールバック)。
"""

from __future__ import annotations

import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.request
import urllib.error
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

JST = datetime.timezone(datetime.timedelta(hours=9))
HERE = os.path.dirname(os.path.abspath(__file__))
USER_AGENT = "Mozilla/5.0 (compatible; SpaceNewsCrawler/1.0; +https://github.com/)"

# ---- カテゴリ分類のキーワード(先頭から順に判定) ----------------------------
CATEGORIES = [
    ("ロケット・打ち上げ", [
        "ロケット", "打ち上げ", "打上げ", "発射", "launch", "rocket", "falcon",
        "starship", "h3", "h-iia", "h-iib", "vulcan", "電動", "liftoff", "booster",
    ]),
    ("衛星・通信", [
        "衛星", "starlink", "constellation", "コンステレーション", "測位", "通信衛星",
        "satellite", "smallsat", "地球観測", "リモートセンシング",
    ]),
    ("探査・科学", [
        "探査", "探査機", "月", "火星", "小惑星", "彗星", "望遠鏡", "mars", "moon",
        "lunar", "asteroid", "probe", "telescope", "アルテミス", "artemis", "sample",
    ]),
    ("有人・宇宙ステーション", [
        "宇宙飛行士", "有人", "宇宙ステーション", "iss", "astronaut", "crew",
        "spacewalk", "船外活動", "宇宙旅行",
    ]),
    ("企業・投資", [
        "資金調達", "出資", "投資", "契約", "受注", "ipo", "上場", "買収", "提携",
        "funding", "invest", "startup", "スタートアップ", "ビジネス", "business",
        "億円", "million", "billion", "契約締結",
    ]),
    ("政策・防衛・安全保障", [
        "防衛", "安全保障", "政府", "規制", "予算", "政策", "policy", "defense",
        "military", "regulation", "宇宙軍", "space force", "国際協力", "条約",
    ]),
]
DEFAULT_CATEGORY = "その他"
CATEGORY_ORDER = [c for c, _ in CATEGORIES] + [DEFAULT_CATEGORY]


# ---- HTMLタグ除去 -----------------------------------------------------------
class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self._parts.append(data)

    def text(self) -> str:
        return "".join(self._parts)


def strip_html(raw: str) -> str:
    if not raw:
        return ""
    parser = _TextExtractor()
    try:
        parser.feed(raw)
        text = parser.text()
    except Exception:
        text = re.sub(r"<[^>]+>", "", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


# ---- フィード取得・解析 -----------------------------------------------------
def fetch(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _localname(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _find_child_text(elem: ET.Element, names: set[str]) -> str:
    for child in elem:
        if _localname(child.tag) in names:
            if child.text and child.text.strip():
                return child.text.strip()
    return ""


def _find_link(elem: ET.Element) -> str:
    # Atom: <link href="..." rel="alternate"/>  RSS: <link>text</link>
    fallback = ""
    for child in elem:
        if _localname(child.tag) != "link":
            continue
        href = child.attrib.get("href")
        if href:
            rel = child.attrib.get("rel", "alternate")
            if rel == "alternate":
                return href
            fallback = fallback or href
        elif child.text and child.text.strip():
            return child.text.strip()
    return fallback


def _parse_date(value: str) -> datetime.datetime | None:
    if not value:
        return None
    value = value.strip()
    # RFC822 (RSS pubDate)
    try:
        dt = parsedate_to_datetime(value)
        if dt is not None:
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=datetime.timezone.utc)
            return dt
    except (TypeError, ValueError, IndexError):
        pass
    # ISO8601 (Atom)
    iso = value.replace("Z", "+00:00")
    try:
        dt = datetime.datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=datetime.timezone.utc)
        return dt
    except ValueError:
        return None


def parse_feed(data: bytes, source: dict) -> list[dict]:
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        print(f"  ! XML解析エラー ({source['name']}): {exc}", file=sys.stderr)
        return []

    items: list[dict] = []
    for elem in root.iter():
        if _localname(elem.tag) not in ("item", "entry"):
            continue
        title = _find_child_text(elem, {"title"})
        link = _find_link(elem)
        summary = _find_child_text(elem, {"description", "summary", "content"})
        date_raw = _find_child_text(elem, {"pubdate", "published", "updated", "date"})
        published = _parse_date(date_raw)
        if not title or not link:
            continue

        source_label = source["name"]
        # Googleニュースは "記事タイトル - 媒体名" 形式なので媒体名を分離
        if source.get("google_news") and " - " in title:
            base, _, publisher = title.rpartition(" - ")
            if base and publisher and len(publisher) <= 40:
                title = base.strip()
                source_label = publisher.strip()

        items.append({
            "title": strip_html(title),
            "link": link,
            "summary": strip_html(summary),
            "published": published,
            "source": source_label,
            "feed": source["name"],
        })
    return items


# ---- 収集本体 ---------------------------------------------------------------
def collect(feeds: list[dict], since: datetime.datetime) -> list[dict]:
    seen: set[str] = set()
    results: list[dict] = []
    for source in feeds:
        name, url = source.get("name", "?"), source.get("url")
        if not url:
            continue
        try:
            raw = fetch(url)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as exc:
            print(f"  ! 取得失敗 ({name}): {exc}", file=sys.stderr)
            continue
        parsed = parse_feed(raw, source)
        kept = 0
        for item in parsed:
            pub = item["published"]
            if pub is None or pub < since:
                continue
            key = _dedupe_key(item["title"], item["link"])
            if key in seen:
                continue
            seen.add(key)
            item["category"] = categorize(item)
            results.append(item)
            kept += 1
        print(f"  - {name}: {len(parsed)}件中 {kept}件を採用", file=sys.stderr)
    results.sort(key=lambda x: x["published"], reverse=True)
    return results


def _dedupe_key(title: str, link: str) -> str:
    norm = re.sub(r"[^0-9a-zA-Zぁ-んァ-ヶ一-龠]", "", title.lower())
    return norm[:60] or link


def categorize(item: dict) -> str:
    haystack = f"{item['title']} {item['summary']}".lower()
    for name, keywords in CATEGORIES:
        for kw in keywords:
            if kw.lower() in haystack:
                return name
    return DEFAULT_CATEGORY


# ---- Claude API による論説サマリー(任意) ----------------------------------
def llm_overview(items: list[dict]) -> str | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    model = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8")
    headlines = "\n".join(
        f"- [{it['category']}] {it['title']}（{it['source']}）"
        for it in items[:40]
    )
    prompt = (
        "あなたは宇宙ビジネス専門メディアの編集者です。以下は本日収集した"
        "宇宙ビジネス・宇宙開発関連ニュースの見出し一覧です。これらを踏まえ、"
        "日本語で本日の動向を俯瞰する300〜450字程度の『今日のまとめ』を書いてください。"
        "重要なテーマを2〜4点に絞り、具体的な社名・国名・案件に触れつつ、"
        "箇条書きではなく自然な文章で記述してください。マークダウンの見出しは付けないでください。\n\n"
        f"見出し一覧:\n{headlines}"
    )
    body = json.dumps({
        "model": model,
        "max_tokens": 1200,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            payload = json.loads(resp.read())
        parts = [b.get("text", "") for b in payload.get("content", []) if b.get("type") == "text"]
        text = "".join(parts).strip()
        return text or None
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ValueError) as exc:
        print(f"  ! Claude API 呼び出し失敗: {exc}", file=sys.stderr)
        return None


def auto_overview(items: list[dict], counts: dict[str, int]) -> str:
    if not items:
        return "対象期間内に該当するニュースは見つかりませんでした。情報源やキーワードの設定を確認してください。"
    top_cats = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    cat_line = "、".join(f"{c}（{n}件）" for c, n in top_cats if n > 0)
    lead = "、".join(it["title"] for it in items[:3])
    return (
        f"本日は合計{len(items)}件の宇宙ビジネス・宇宙開発関連ニュースを収集しました。"
        f"分野別では {cat_line} が中心です。"
        f"主な話題として「{lead}」などが報じられています。"
        "詳細は以下のカテゴリ別一覧を参照してください。"
    )


# ---- 出力生成 ---------------------------------------------------------------
def _fmt_dt(dt: datetime.datetime) -> str:
    return dt.astimezone(JST).strftime("%Y-%m-%d %H:%M")


def build_markdown(items, overview, since, now, counts):
    date_label = now.astimezone(JST).strftime("%Y年%m月%d日")
    lines = [
        f"# 宇宙ビジネス・宇宙開発ニュース 要約（{date_label}）",
        "",
        f"- **対象期間**: {_fmt_dt(since)} 〜 {_fmt_dt(now)}（JST）",
        f"- **収集記事数**: {len(items)}件",
        f"- **生成日時**: {_fmt_dt(now)}（JST）",
        "",
        "## 今日のまとめ",
        "",
        overview,
        "",
    ]
    by_cat: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    for it in items:
        by_cat[it["category"]].append(it)
    for cat in CATEGORY_ORDER:
        entries = by_cat[cat]
        if not entries:
            continue
        lines.append(f"## {cat}（{len(entries)}件）")
        lines.append("")
        for it in entries:
            meta = f"{it['source']} / {_fmt_dt(it['published'])}"
            lines.append(f"- **[{it['title']}]({it['link']})**  ")
            summary = it["summary"][:180] + ("…" if len(it["summary"]) > 180 else "")
            if summary:
                lines.append(f"  {summary}  ")
            lines.append(f"  <sub>{meta}</sub>")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("_このレポートは毎朝9時(JST)に自動生成されています。_")
    lines.append("")
    return "\n".join(lines)


def build_html(items, overview, since, now, counts):
    date_label = now.astimezone(JST).strftime("%Y年%m月%d日")
    by_cat: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    for it in items:
        by_cat[it["category"]].append(it)

    e = html.escape
    sections = []
    for cat in CATEGORY_ORDER:
        entries = by_cat[cat]
        if not entries:
            continue
        rows = []
        for it in entries:
            summary = it["summary"][:220] + ("…" if len(it["summary"]) > 220 else "")
            rows.append(
                '<li class="article">'
                f'<a href="{e(it["link"])}" target="_blank" rel="noopener">{e(it["title"])}</a>'
                + (f'<p class="summary">{e(summary)}</p>' if summary else "")
                + f'<p class="meta">{e(it["source"])} ・ {e(_fmt_dt(it["published"]))}</p>'
                "</li>"
            )
        sections.append(
            f'<section><h2>{e(cat)} <span class="count">{len(entries)}</span></h2>'
            f'<ul class="articles">{"".join(rows)}</ul></section>'
        )

    period = f"{e(_fmt_dt(since))} 〜 {e(_fmt_dt(now))}（JST）"
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>宇宙ビジネス・宇宙開発ニュース 要約（{e(date_label)}）</title>
<style>
:root {{ color-scheme: light dark; --bg:#f7f8fa; --card:#fff; --fg:#1a1a2e; --muted:#5a6472; --accent:#3a6ea5; --line:#e3e7ee; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#0e1117; --card:#161b22; --fg:#e6edf3; --muted:#9aa4b2; --accent:#6ea8fe; --line:#242b36; }} }}
* {{ box-sizing:border-box; }}
body {{ margin:0; background:var(--bg); color:var(--fg); font-family:-apple-system,"Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,sans-serif; line-height:1.7; }}
.wrap {{ max-width:860px; margin:0 auto; padding:2rem 1.2rem 4rem; }}
header h1 {{ font-size:1.6rem; margin:0 0 .4rem; }}
.period {{ color:var(--muted); font-size:.9rem; margin:0 0 1.5rem; }}
.summary-box {{ background:var(--card); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:10px; padding:1.1rem 1.3rem; margin-bottom:2rem; }}
.summary-box h2 {{ margin:0 0 .6rem; font-size:1.1rem; }}
section {{ margin-bottom:2rem; }}
section h2 {{ font-size:1.2rem; border-bottom:2px solid var(--line); padding-bottom:.35rem; display:flex; align-items:center; gap:.5rem; }}
.count {{ font-size:.75rem; background:var(--accent); color:#fff; border-radius:999px; padding:.05rem .55rem; }}
ul.articles {{ list-style:none; margin:0; padding:0; }}
.article {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:.9rem 1.1rem; margin:.6rem 0; }}
.article a {{ color:var(--accent); font-weight:600; text-decoration:none; font-size:1.02rem; }}
.article a:hover {{ text-decoration:underline; }}
.summary {{ margin:.4rem 0 .3rem; color:var(--fg); font-size:.92rem; }}
.meta {{ margin:0; color:var(--muted); font-size:.8rem; }}
footer {{ margin-top:2.5rem; color:var(--muted); font-size:.82rem; text-align:center; }}
a.back {{ color:var(--accent); }}
</style>
</head>
<body>
<div class="wrap">
<header>
<h1>🛰️ 宇宙ビジネス・宇宙開発ニュース 要約</h1>
<p class="period">{e(date_label)} ／ 対象期間: {period} ／ 収集 {len(items)}件</p>
</header>
<div class="summary-box">
<h2>今日のまとめ</h2>
<p>{e(overview)}</p>
</div>
{"".join(sections) if sections else "<p>対象期間内に該当するニュースは見つかりませんでした。</p>"}
<footer>
<p><a class="back" href="../index.html">← アーカイブ一覧へ</a></p>
<p>このレポートは毎朝9時(JST)に自動生成されています。</p>
</footer>
</div>
</body>
</html>
"""


def build_plaintext(items, overview, since, now):
    """メール通知用のプレーンテキスト要約。"""
    date_label = now.astimezone(JST).strftime("%Y年%m月%d日")
    lines = [
        f"🛰️ 宇宙ビジネス・宇宙開発ニュース 要約（{date_label}）",
        f"対象期間: {_fmt_dt(since)} 〜 {_fmt_dt(now)}（JST） / 収集 {len(items)}件",
        "",
        "■ 今日のまとめ",
        overview,
        "",
    ]
    by_cat: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    for it in items:
        by_cat[it["category"]].append(it)
    for cat in CATEGORY_ORDER:
        entries = by_cat[cat]
        if not entries:
            continue
        lines.append(f"■ {cat}（{len(entries)}件）")
        for it in entries:
            lines.append(f"・{it['title']}")
            lines.append(f"  {it['link']}")
        lines.append("")
    lines.append("― 毎朝9時(JST)に自動生成されています ―")
    return "\n".join(lines)


def rebuild_index(digests_dir: str) -> str:
    files = sorted(
        (f for f in os.listdir(digests_dir) if re.fullmatch(r"\d{4}-\d{2}-\d{2}\.md", f)),
        reverse=True,
    )
    items_html = []
    for md in files:
        date = md[:-3]
        html_name = f"{date}.html"
        has_html = os.path.exists(os.path.join(digests_dir, html_name))
        link = f"digests/{html_name}" if has_html else f"digests/{md}"
        items_html.append(f'<li><a href="{link}">{date}</a></li>')
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>宇宙ビジネス・宇宙開発ニュース 要約アーカイブ</title>
<style>
:root {{ color-scheme: light dark; --bg:#f7f8fa; --card:#fff; --fg:#1a1a2e; --muted:#5a6472; --accent:#3a6ea5; --line:#e3e7ee; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#0e1117; --card:#161b22; --fg:#e6edf3; --muted:#9aa4b2; --accent:#6ea8fe; --line:#242b36; }} }}
body {{ margin:0; background:var(--bg); color:var(--fg); font-family:-apple-system,"Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,sans-serif; line-height:1.7; }}
.wrap {{ max-width:720px; margin:0 auto; padding:2.5rem 1.2rem 4rem; }}
h1 {{ font-size:1.6rem; }}
p.lead {{ color:var(--muted); }}
ul {{ list-style:none; padding:0; }}
li {{ margin:.5rem 0; }}
li a {{ display:block; background:var(--card); border:1px solid var(--line); border-radius:8px; padding:.8rem 1rem; color:var(--accent); text-decoration:none; font-weight:600; }}
li a:hover {{ border-color:var(--accent); }}
</style>
</head>
<body>
<div class="wrap">
<h1>🛰️ 宇宙ビジネス・宇宙開発ニュース 要約アーカイブ</h1>
<p class="lead">毎朝9時(JST)に前日からのニュースを自動収集・要約しています。</p>
<ul>
{chr(10).join(items_html) if items_html else "<li>まだレポートがありません。</li>"}
</ul>
</div>
</body>
</html>
"""


# ---- エントリポイント -------------------------------------------------------
def load_feeds(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data["feeds"]


def main() -> int:
    ap = argparse.ArgumentParser(description="宇宙ビジネス・宇宙開発ニュースの要約を生成する")
    ap.add_argument("--sources", default=os.path.join(HERE, "sources.json"),
                    help="フィード定義JSONのパス")
    ap.add_argument("--out-dir", default=os.path.join(HERE, "digests"),
                    help="出力ディレクトリ")
    ap.add_argument("--since-hours", type=float, default=None,
                    help="指定すると『前日00:00から』ではなく『実行時点からNヶ時間前まで』を対象にする")
    ap.add_argument("--no-llm", action="store_true", help="Claude APIによる要約を無効化する")
    args = ap.parse_args()

    now = datetime.datetime.now(JST)
    if args.since_hours is not None:
        since = now - datetime.timedelta(hours=args.since_hours)
    else:
        # 前日の00:00(JST)から実行時点まで
        yesterday = (now - datetime.timedelta(days=1)).date()
        since = datetime.datetime.combine(yesterday, datetime.time.min, tzinfo=JST)

    print(f"対象期間: {_fmt_dt(since)} 〜 {_fmt_dt(now)} (JST)", file=sys.stderr)
    feeds = load_feeds(args.sources)
    items = collect(feeds, since)

    counts = {c: 0 for c in CATEGORY_ORDER}
    for it in items:
        counts[it["category"]] += 1

    overview = None
    if not args.no_llm:
        overview = llm_overview(items)
    if not overview:
        overview = auto_overview(items, counts)

    os.makedirs(args.out_dir, exist_ok=True)
    date_str = now.astimezone(JST).strftime("%Y-%m-%d")
    md_path = os.path.join(args.out_dir, f"{date_str}.md")
    html_path = os.path.join(args.out_dir, f"{date_str}.html")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(build_markdown(items, overview, since, now, counts))
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(build_html(items, overview, since, now, counts))
    # メール通知用のプレーンテキスト（最新分を latest.txt として上書き）
    with open(os.path.join(args.out_dir, "latest.txt"), "w", encoding="utf-8") as f:
        f.write(build_plaintext(items, overview, since, now))

    index_path = os.path.join(os.path.dirname(args.out_dir), "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(rebuild_index(args.out_dir))

    print(f"生成完了: {md_path}", file=sys.stderr)
    print(f"生成完了: {html_path}", file=sys.stderr)
    print(f"インデックス更新: {index_path}", file=sys.stderr)
    print(f"収集記事数: {len(items)}件", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
