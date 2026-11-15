#!/usr/bin/env python3
"""
Extracts REAL historical OHLCV market data specifically tailored for:
- SCALPING: Micro E-mini Nasdaq-100 Futures (MNQ=F / NQ=F) in 1m, 2m, 5m, 15m
- SWING TRADING: Crypto Majors & High-Beta Alts (BTC, ETH, SOL, BNB, AVAX, LINK, XRP, SUI) in 15m, 1H, 4H, 1D
Zero look-ahead bias on HTF aggregation.
"""

import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "data",
    "realMarketPacks.json",
)


def fetch_json(url: str, headers: dict | None = None):
    req_headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    ctx = (
        ssl.create_default_context(cafile="/etc/ssl/cert.pem")
        if os.path.exists("/etc/ssl/cert.pem")
        else None
    )
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_binance_klines(symbol: str, interval: str, limit: int = 480):
    params = {"symbol": symbol, "interval": interval, "limit": str(limit)}
    query = urllib.parse.urlencode(params)
    url = f"https://data-api.binance.vision/api/v3/klines?{query}"
    raw = fetch_json(url)
    candles = []
    for row in raw:
        t_sec = int(row[0]) // 1000
        o, h, l, c, v = (
            float(row[1]),
            float(row[2]),
            float(row[3]),
            float(row[4]),
            float(row[5]),
        )
        if h >= max(o, c) and l <= min(o, c) and l > 0:
            candles.append(
                {
                    "time": t_sec,
                    "open": round(o, 6),
                    "high": round(h, 6),
                    "low": round(l, 6),
                    "close": round(c, 6),
                    "volume": round(v, 2),
                }
            )
    return candles


def fetch_yahoo_klines(symbol: str, interval: str, range_str: str):
    enc_sym = urllib.parse.quote(symbol)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{enc_sym}?interval={interval}&range={range_str}"
    data = fetch_json(url)
    result = data["chart"]["result"][0]
    timestamps = result["timestamp"]
    quote = result["indicators"]["quote"][0]
    candles = []
    for i, ts in enumerate(timestamps):
        o = quote["open"][i]
        h = quote["high"][i]
        l = quote["low"][i]
        c = quote["close"][i]
        v = quote.get("volume", [0] * len(timestamps))[i]
        if None in (o, h, l, c):
            continue
        o, h, l, c = float(o), float(h), float(l), float(c)
        v = float(v) if v is not None else 1000.0
        h = max(h, o, c)
        l = min(l, o, c)
        if l <= 0:
            continue
        candles.append(
            {
                "time": int(ts),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": round(max(v, 1.0), 2),
            }
        )
    dedup = {}
    for c in candles:
        dedup[c["time"]] = c
    return [dedup[k] for k in sorted(dedup.keys())]


def aggregate_htf_from_ltf(ltf_candles: list[dict], group_size: int) -> list[dict]:
    htf = []
    for idx in range(0, len(ltf_candles), group_size):
        chunk = ltf_candles[idx : idx + group_size]
        if not chunk:
            continue
        htf.append(
            {
                "time": chunk[0]["time"],
                "open": chunk[0]["open"],
                "high": max(c["high"] for c in chunk),
                "low": min(c["low"] for c in chunk),
                "close": chunk[-1]["close"],
                "volume": round(sum(c["volume"] for c in chunk), 2),
            }
        )
    return htf


def compute_atr(candles: list[dict], period: int = 14) -> float:
    if len(candles) < 2:
        return max(candles[0]["high"] - candles[0]["low"], 0.0001)
    trs = []
    for i in range(1, len(candles)):
        h = candles[i]["high"]
        l = candles[i]["low"]
        pc = candles[i - 1]["close"]
        trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    recent = trs[-period:] if len(trs) >= period else trs
    return sum(recent) / len(recent)


def find_interesting_window(candles: list[dict], visible_len: int = 80, future_len: int = 40):
    total_needed = visible_len + future_len
    if len(candles) < total_needed:
        return None

    best_score = -1.0
    best_slice = None

    for start in range(25, len(candles) - total_needed, 4):
        vis = candles[start : start + visible_len]
        fut = candles[start + visible_len : start + total_needed]
        atr = compute_atr(vis)
        if atr <= 0:
            continue
        entry = vis[-1]["close"]
        max_up = max(c["high"] for c in fut) - entry
        max_dn = entry - min(c["low"] for c in fut)
        asym = max(max_up, max_dn) / atr
        vis_range = (
            max(c["high"] for c in vis[-25:]) - min(c["low"] for c in vis[-25:])
        ) / atr
        score = asym + (0.25 * min(vis_range, 6.0))
        if score > best_score:
            best_score = score
            best_slice = (
                start,
                vis,
                fut,
                atr,
                "LONG" if max_up >= max_dn else "SHORT",
            )

    return best_slice


def format_date_label(ts: int) -> str:
    dt = datetime.fromtimestamp(ts, tz=timezone.utc)
    months_ca = [
        "gen.", "febr.", "març", "abr.", "maig", "juny",
        "jul.", "ag.", "set.", "oct.", "nov.", "des.",
    ]
    return f"{dt.day} {months_ca[dt.month - 1]} {dt.year}"


def main():
    packs = []

    sources = [
        # =====================================================================
        # 1. MNQ SCALPING PACKS (1m/5m and 5m/15m on MNQ=F & NQ=F)
        # =====================================================================
        {
            "id": "mnq_1m_scalp",
            "fetcher": "yahoo",
            "symbol": "MNQ=F",
            "fallbackSymbol": "NQ=F",
            "displayAsset": "Micro Nasdaq-100 Futures (MNQ · 1m)",
            "marketCategory": "INDICES",
            "style": "SCALP",
            "ltf": "1m",
            "ltfLabel": "1m",
            "htf": "5m",
            "group": 5,
            "range": "5d",
            "slices": 4,
        },
        {
            "id": "mnq_5m_scalp",
            "fetcher": "yahoo",
            "symbol": "MNQ=F",
            "fallbackSymbol": "NQ=F",
            "displayAsset": "Micro Nasdaq-100 Futures (MNQ · 5m)",
            "marketCategory": "INDICES",
            "style": "SCALP",
            "ltf": "5m",
            "ltfLabel": "5m",
            "htf": "15m",
            "group": 3,
            "range": "30d",
            "slices": 6,
        },
        {
            "id": "mnq_15m_intraday",
            "fetcher": "yahoo",
            "symbol": "MNQ=F",
            "fallbackSymbol": "NQ=F",
            "displayAsset": "Micro Nasdaq-100 Futures (MNQ · 15m)",
            "marketCategory": "INDICES",
            "style": "SCALP",
            "ltf": "15m",
            "ltfLabel": "15m",
            "htf": "1H",
            "group": 4,
            "range": "45d",
            "slices": 3,
        },
        # =====================================================================
        # 2. CRYPTO SWING PACKS (BTC, ETH, SOL, BNB, AVAX, LINK, XRP, SUI)
        # =====================================================================
        {
            "id": "crypto_btc_4h_swing",
            "fetcher": "binance",
            "symbol": "BTCUSDT",
            "displayAsset": "Bitcoin Swing (BTC/USDT · 4H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "4h",
            "ltfLabel": "4H",
            "htf": "1D",
            "group": 6,
            "limit": 500,
            "slices": 3,
        },
        {
            "id": "crypto_btc_1h_swing",
            "fetcher": "binance",
            "symbol": "BTCUSDT",
            "displayAsset": "Bitcoin Swing (BTC/USDT · 1H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "1h",
            "ltfLabel": "1H",
            "htf": "4H",
            "group": 4,
            "limit": 500,
            "slices": 3,
        },
        {
            "id": "crypto_eth_4h_swing",
            "fetcher": "binance",
            "symbol": "ETHUSDT",
            "displayAsset": "Ethereum Swing (ETH/USDT · 4H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "4h",
            "ltfLabel": "4H",
            "htf": "1D",
            "group": 6,
            "limit": 500,
            "slices": 3,
        },
        {
            "id": "crypto_sol_1h_swing",
            "fetcher": "binance",
            "symbol": "SOLUSDT",
            "displayAsset": "Solana Swing (SOL/USDT · 1H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "1h",
            "ltfLabel": "1H",
            "htf": "4H",
            "group": 4,
            "limit": 500,
            "slices": 2,
        },
        {
            "id": "crypto_sol_4h_swing",
            "fetcher": "binance",
            "symbol": "SOLUSDT",
            "displayAsset": "Solana Swing (SOL/USDT · 4H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "4h",
            "ltfLabel": "4H",
            "htf": "1D",
            "group": 6,
            "limit": 500,
            "slices": 2,
        },
        {
            "id": "crypto_avax_4h_swing",
            "fetcher": "binance",
            "symbol": "AVAXUSDT",
            "displayAsset": "Avalanche Swing (AVAX/USDT · 4H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "4h",
            "ltfLabel": "4H",
            "htf": "1D",
            "group": 6,
            "limit": 480,
            "slices": 2,
        },
        {
            "id": "crypto_link_1h_swing",
            "fetcher": "binance",
            "symbol": "LINKUSDT",
            "displayAsset": "Chainlink Swing (LINK/USDT · 1H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "1h",
            "ltfLabel": "1H",
            "htf": "4H",
            "group": 4,
            "limit": 480,
            "slices": 2,
        },
        {
            "id": "crypto_sui_1h_swing",
            "fetcher": "binance",
            "symbol": "SUIUSDT",
            "displayAsset": "Sui Network Swing (SUI/USDT · 1H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "1h",
            "ltfLabel": "1H",
            "htf": "4H",
            "group": 4,
            "limit": 480,
            "slices": 2,
        },
        {
            "id": "crypto_bnb_4h_swing",
            "fetcher": "binance",
            "symbol": "BNBUSDT",
            "displayAsset": "BNB Swing (BNB/USDT · 4H)",
            "marketCategory": "CRYPTO",
            "style": "SWING",
            "ltf": "4h",
            "ltfLabel": "4H",
            "htf": "1D",
            "group": 6,
            "limit": 480,
            "slices": 2,
        },
    ]

    for src in sources:
        try:
            if src["fetcher"] == "binance":
                candles = fetch_binance_klines(src["symbol"], src["ltf"], src["limit"])
            else:
                try:
                    candles = fetch_yahoo_klines(src["symbol"], src["ltf"], src["range"])
                except Exception:
                    candles = fetch_yahoo_klines(src["fallbackSymbol"], src["ltf"], src["range"])

            if len(candles) < 160:
                print(f"[WARN] Too few candles for {src['id']}: {len(candles)}")
                continue

            num_slices = src.get("slices", 2)
            chunk_len = len(candles) // num_slices

            for s_idx in range(num_slices):
                seg = candles[s_idx * chunk_len : (s_idx + 1) * chunk_len]
                if len(seg) < 135:
                    continue
                win = find_interesting_window(seg, visible_len=80, future_len=40)
                if not win:
                    continue
                start_idx, vis, fut, atr, dominant_dir = win
                pre_start = max(0, start_idx - 64)
                ltf_up_to_decision = seg[pre_start : start_idx + 80]
                htf_visible = aggregate_htf_from_ltf(ltf_up_to_decision, src["group"])

                suffix = chr(ord("a") + s_idx)
                pack = {
                    "id": f"{src['id']}_{suffix}",
                    "realAsset": src["displayAsset"],
                    "marketCategory": src["marketCategory"],
                    "style": src["style"],
                    "ltf": src["ltfLabel"],
                    "htf": src["htf"],
                    "groupSize": src["group"],
                    "realDateLabel": format_date_label(vis[-1]["time"]),
                    "dominantDirection": dominant_dir,
                    "atr": round(atr, 6),
                    "visibleCandles": vis,
                    "futureCandles": fut,
                    "htfVisibleCandles": htf_visible[-45:],
                }
                packs.append(pack)
                print(
                    f"[OK] Built {pack['id']}: {pack['realAsset']} ({pack['ltf']}/{pack['htf']}) "
                    f"date={pack['realDateLabel']} dir={dominant_dir}"
                )
            time.sleep(0.12)
        except Exception as exc:
            print(f"[ERROR] Failed {src['id']}: {exc}")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(packs, f, separators=(",", ":"))
    print(
        f"\nSaved {len(packs)} specialized MNQ Scalp & Crypto Swing packs to {OUTPUT_PATH} "
        f"({os.path.getsize(OUTPUT_PATH) // 1024} KB)"
    )


if __name__ == "__main__":
    main()
