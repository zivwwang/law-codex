#!/usr/bin/env python3
"""
比對本地 meta.json 記錄的異動日期與全國法規資料庫的最新異動日期。

用法：
  python scripts/check_updates.py              # 互動模式：列出更新，詢問是否 fetch
  python scripts/check_updates.py --fetch      # 自動 fetch（供 GitHub Actions 使用）
  python scripts/check_updates.py --no-cache   # 強制重新下載 ChLaw.json
  python scripts/check_updates.py --json       # 以 JSON 格式輸出結果（供 CI 讀取）

Exit code：
  0  沒有更新，或所有更新已成功 fetch
  1  發現有更新但未 fetch（互動模式且使用者選擇不 fetch）
  2  執行期間發生錯誤
"""

import json
import subprocess
import sys
from pathlib import Path

# Windows PowerShell 預設 cp1252，強制 UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

def _log(*args, **kwargs):
    """進度訊息一律輸出到 stderr，讓 stdout 只有 JSON。"""
    print(*args, **kwargs, file=sys.stderr)

SCRIPTS_DIR = Path(__file__).parent
LAWS_DIR    = SCRIPTS_DIR.parent / "laws"
FETCH_SCRIPT = SCRIPTS_DIR / "fetch_laws.py"

# ── 共用 load_laws（從 fetch_laws.py 複製最小依賴）────────────────────────────

def _load_laws_data(use_cache: bool) -> list:
    """載入 ChLaw.json，回傳 Laws 陣列。複用 fetch_laws.py 的快取邏輯。"""
    import io, zipfile, urllib.request
    from pathlib import Path

    API_URL   = "https://law.moj.gov.tw/api/Ch/Law/JSON"
    CACHE_DIR = SCRIPTS_DIR.parent / ".cache"
    cache_path = CACHE_DIR / "ChLaw.json"

    if use_cache and cache_path.exists():
        _log(f"使用快取：{cache_path}", flush=True)
        raw = cache_path.read_bytes()
    else:
        _log("下載 ChLaw.json.zip（約 6 MB）…", flush=True)
        req = urllib.request.Request(API_URL, headers={"User-Agent": "check_updates/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw_zip = resp.read()
        with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
            json_name = next((n for n in zf.namelist() if n.lower().endswith(".json")), None)
            if not json_name:
                raise RuntimeError(f"ZIP 內找不到 JSON，內含：{zf.namelist()}")
            _log(f"解壓 {json_name}…", flush=True)
            raw = zf.read(json_name)
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(raw)
        _log(f"已快取至 {cache_path}", flush=True)

    data = json.loads(raw.decode("utf-8-sig"))
    laws = data.get("Laws", data) if isinstance(data, dict) else data
    _log(f"共 {len(laws)} 筆法規資料。\n", flush=True)
    return laws


def _pcode_from_url(url: str) -> str:
    return (url or "").strip()[-8:]


def _build_api_index(laws: list) -> dict[str, dict]:
    """建立 pcode -> {name, modified_date} 的查詢字典。"""
    index: dict[str, dict] = {}
    for law in laws:
        pcode = _pcode_from_url(law.get("LawURL", ""))
        if pcode:
            index[pcode] = {
                "name":          law.get("LawName", ""),
                "modified_date": law.get("LawModifiedDate", ""),
            }
    return index


# ── 讀本地 meta.json ──────────────────────────────────────────────────────────

def _read_local_metas() -> list[dict]:
    """掃描 laws/*/meta.json，回傳本地法規資訊列表。"""
    metas = []
    for meta_path in sorted(LAWS_DIR.glob("*/meta.json")):
        try:
            data = json.loads(meta_path.read_text(encoding="utf-8"))
            data["_meta_path"] = str(meta_path)
            metas.append(data)
        except Exception as e:
            _log(f"警告：讀取 {meta_path} 失敗：{e}", flush=True)
    return metas


# ── 比對 ──────────────────────────────────────────────────────────────────────

def check(use_cache: bool) -> list[dict]:
    """
    回傳有更新的法規列表，每筆格式：
    {"pcode", "name", "local_date", "api_date"}
    """
    metas = _read_local_metas()
    if not metas:
        _log("laws/ 目錄下沒有任何 meta.json，請先執行 fetch_laws.py。")
        return []

    _log(f"本地共追蹤 {len(metas)} 部法規。", flush=True)
    api_index = _load_laws_data(use_cache)
    api_index = _build_api_index(api_index)

    updates = []
    not_found = []

    for meta in metas:
        pcode      = meta.get("pcode", "")
        local_name = meta.get("name", pcode)
        local_date = meta.get("modified_date", "")

        if pcode not in api_index:
            not_found.append(pcode)
            continue

        api_info = api_index[pcode]
        api_date = api_info["modified_date"]

        if api_date != local_date:
            updates.append({
                "pcode":      pcode,
                "name":       local_name,
                "local_date": local_date,
                "api_date":   api_date,
            })

    if not_found:
        _log(f"警告：以下 PCode 在 API 中找不到：{', '.join(not_found)}\n")

    return updates


# ── fetch 更新 ────────────────────────────────────────────────────────────────

def fetch_updates(pcodes: list[str], use_cache: bool) -> bool:
    """呼叫 fetch_laws.py 更新指定法規，回傳是否全部成功。"""
    cache_arg = [] if use_cache else ["--no-cache"]
    cmd = [sys.executable, str(FETCH_SCRIPT)] + cache_arg + pcodes
    _log(f"\n執行：{' '.join(cmd)}\n", flush=True)
    result = subprocess.run(cmd)
    return result.returncode == 0


# ── 輸出格式 ──────────────────────────────────────────────────────────────────

def _print_table(updates: list[dict]) -> None:
    _log(f"{'PCode':<12} {'法規名稱':<20} {'本地日期':<12} {'API 日期':<12}")
    _log("-" * 58)
    for u in updates:
        _log(f"{u['pcode']:<12} {u['name']:<20} {u['local_date']:<12} {u['api_date']:<12}")


# ── 主程式 ────────────────────────────────────────────────────────────────────

def main() -> None:
    args      = sys.argv[1:]
    auto_fetch = "--fetch"    in args
    json_mode  = "--json"     in args
    use_cache  = "--no-cache" not in args

    try:
        updates = check(use_cache)
    except Exception as e:
        msg = f"錯誤：{e}"
        if json_mode:
            print(json.dumps({"error": str(e), "count": 0, "updates": []}, ensure_ascii=False))
        else:
            print(msg, file=sys.stderr)
        sys.exit(2)

    # ── JSON 模式（供 GitHub Actions outputs 使用）────────────────────────────
    if json_mode:
        print(json.dumps({
            "count":   len(updates),
            "updates": updates,
        }, ensure_ascii=False, indent=2))
        sys.exit(0 if not updates else 1)

    # ── 人類可讀模式 ──────────────────────────────────────────────────────────
    if not updates:
        _log("所有法規均為最新版本，無須更新。")
        sys.exit(0)

    _log(f"\n發現 {len(updates)} 部法規有更新：\n")
    _print_table(updates)
    _log()

    pcodes = [u["pcode"] for u in updates]

    if auto_fetch:
        # GitHub Actions 模式：直接 fetch，不詢問
        success = fetch_updates(pcodes, use_cache)
        sys.exit(0 if success else 2)
    else:
        # 互動模式：詢問使用者
        try:
            ans = input("是否立即 fetch 以上法規？[y/N] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print()
            sys.exit(1)

        if ans in ("y", "yes"):
            success = fetch_updates(pcodes, use_cache)
            sys.exit(0 if success else 2)
        else:
            _log("已略過，未執行更新。")
            sys.exit(1)


if __name__ == "__main__":
    main()
