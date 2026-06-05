#!/usr/bin/env python3
"""
從全國法規資料庫 Open API 下載法規，寫成 laws/<PCode>/articles/<ArticleNo>.md
用法：python scripts/fetch_laws.py B0000001 [C0000001 ...]
API：https://law.moj.gov.tw/api/Ch/Law/JSON  （回傳 ZIP，內含 ChLaw.json）
"""

import io
import json
import re
import sys
import zipfile
from pathlib import Path

import urllib.request
import urllib.error

# Windows PowerShell 預設 cp1252，強制 stdout 使用 UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API_URL   = "https://law.moj.gov.tw/api/Ch/Law/JSON"
LAWS_DIR  = Path(__file__).parent.parent / "laws"
CACHE_DIR = Path(__file__).parent.parent / ".cache"

LAW_START  = "<!-- LAW:START -->"
LAW_END    = "<!-- LAW:END -->"
NOTE_START = "<!-- NOTE:START -->"
NOTE_END   = "<!-- NOTE:END -->"

_LAW_BLOCK_RE = re.compile(
    r"<!--\s*LAW:START\s*-->.*?<!--\s*LAW:END\s*-->",
    re.DOTALL,
)


# ── API download ──────────────────────────────────────────────────────────────

def _download_zip_bytes() -> bytes:
    print("下載 ChLaw.json.zip（約 6 MB）…", flush=True)
    req = urllib.request.Request(API_URL, headers={"User-Agent": "fetch_laws/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def load_laws(use_cache: bool = True) -> list:
    """
    下載（或從快取讀取）ChLaw.json 並回傳 Laws 陣列。
    快取存於 .cache/ChLaw.json，可用 --no-cache 略過。
    """
    cache_path = CACHE_DIR / "ChLaw.json"

    if use_cache and cache_path.exists():
        print(f"使用快取：{cache_path}", flush=True)
        raw = cache_path.read_bytes()
    else:
        raw_zip = _download_zip_bytes()
        with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
            json_name = next(
                (n for n in zf.namelist() if n.lower().endswith(".json")), None
            )
            if not json_name:
                raise RuntimeError(f"ZIP 內找不到 JSON 檔，內含：{zf.namelist()}")
            print(f"解壓 {json_name}…", flush=True)
            raw = zf.read(json_name)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(raw)
        print(f"已快取至 {cache_path}", flush=True)

    data = json.loads(raw.decode("utf-8-sig"))
    # 頂層結構：{"Laws": [...]}
    laws = data.get("Laws", data) if isinstance(data, dict) else data
    print(f"共 {len(laws)} 筆法規資料。", flush=True)
    return laws


# ── lookup ────────────────────────────────────────────────────────────────────

def _pcode_from_url(url: str) -> str:
    """LawURL 末 8 碼即為 PCode（如 B0000001）。"""
    return (url or "").strip()[-8:]


_ARTNO_RE = re.compile(r"(\d+)(?:-(\d+))?")

def article_filename(raw_no: str) -> str:
    """
    把 API 回傳的 ArticleNo（如 '第 1 條'、'第 1003-1 條'）
    轉成 NNNN.md 或 NNNN-M.md 格式。
    """
    m = _ARTNO_RE.search(raw_no)
    if not m:
        return f"{raw_no.strip()}.md"
    main = int(m.group(1))
    sub  = m.group(2)
    if sub:
        return f"{main:04d}-{sub}.md"
    return f"{main:04d}.md"


def find_law(laws: list, pcode: str):
    for law in laws:
        if _pcode_from_url(law.get("LawURL", "")) == pcode:
            return law
    return None


# ── markdown helpers ──────────────────────────────────────────────────────────

_NEW_FILE_TEMPLATE = (
    "{law_start}\n{text}\n{law_end}\n\n"
    "{note_start}\n\n{note_end}\n"
)


def update_article_file(path: Path, law_text: str) -> None:
    """建立或更新 .md：只替換 LAW 區塊，NOTE 區塊完全不動。"""
    new_law_block = f"{LAW_START}\n{law_text}\n{LAW_END}"

    if path.exists():
        existing = path.read_text(encoding="utf-8")
        if _LAW_BLOCK_RE.search(existing):
            updated = _LAW_BLOCK_RE.sub(new_law_block, existing)
            path.write_text(updated, encoding="utf-8")
            return

    # 新檔案：建立完整模板
    path.write_text(
        _NEW_FILE_TEMPLATE.format(
            law_start=LAW_START, text=law_text, law_end=LAW_END,
            note_start=NOTE_START, note_end=NOTE_END,
        ),
        encoding="utf-8",
    )


# ── main processing ───────────────────────────────────────────────────────────

def process(law: dict, pcode: str) -> None:
    law_name       = law.get("LawName", pcode)
    modified_date  = law.get("LawModifiedDate", "")
    effective_date = law.get("LawEffectiveDate", "")
    articles       = law.get("LawArticles", [])

    print(f"  法規名稱：{law_name}", flush=True)
    print(f"  最新異動：{modified_date}　施行日期：{effective_date}", flush=True)

    # 目錄
    law_dir      = LAWS_DIR / pcode
    articles_dir = law_dir / "articles"
    articles_dir.mkdir(parents=True, exist_ok=True)

    # meta.json
    meta = {
        "pcode":          pcode,
        "name":           law_name,
        "modified_date":  modified_date,
        "effective_date": effective_date,
    }
    (law_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  寫入 meta.json", flush=True)

    # 條文 .md
    written = 0
    for art in articles:
        article_no = (art.get("ArticleNo") or "").strip()
        content    = (art.get("ArticleContent") or "").strip()

        # 跳過空號（編、章、節、款、目 等結構標題）
        if not article_no or not re.search(r"\d", article_no):
            continue

        md_path = articles_dir / article_filename(article_no)
        update_article_file(md_path, content)
        written += 1

    print(f"  寫入 {written} 條 -> laws/{pcode}/articles/", flush=True)


def main() -> None:
    args = sys.argv[1:]
    use_cache = "--no-cache" not in args
    pcodes = [a for a in args if not a.startswith("-")]
    if not pcodes:
        pcodes = ["B0000001"]

    laws = load_laws(use_cache=use_cache)

    for pcode in pcodes:
        print(f"\n處理 {pcode}…", flush=True)
        law = find_law(laws, pcode)
        if law is None:
            print(f"  找不到 PCode {pcode}，略過。", flush=True)
            continue
        process(law, pcode)

    print("\n完成。", flush=True)


if __name__ == "__main__":
    main()
