import {
  AssetSpec,
  CryptoSwingScanResult,
  CryptoSymbol,
  MarketLeaderContext,
  SWING_UNIVERSE,
  analyzeAssetSwingSetup,
  evaluateMarketLeaderRegime,
  filterClosedCandles,
} from '../engine/cryptoSwingStrategy';
import { Candle } from '../engine/types';

const BINANCE_VISION_BASE = 'https://data-api.binance.vision/api/v3';
const OKX_PUBLIC_BASE = 'https://www.okx.com/api/v5/public';

export type BinanceInterval = '1h' | '4h' | '1d';

export interface SymbolCandleBundle {
  closed1d: Candle[];
  closed4h: Candle[];
  closed1h: Candle[];
  raw1h: Candle[];
  raw4h: Candle[];
  livePrice: number;
  fundingRate8h: number | null;
}

export interface LiveSwingRadarSnapshot {
  scannedAtIso: string;
  scannedAtMs: number;
  leaderContext: MarketLeaderContext;
  results: CryptoSwingScanResult[];
  bundlesBySymbol: Record<CryptoSymbol, SymbolCandleBundle>;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBinanceKlines(params: {
  symbol: CryptoSymbol;
  interval: BinanceInterval;
  limit: number;
  startTimeMs?: number;
  endTimeMs?: number;
}): Promise<Candle[]> {
  const qs = new URLSearchParams({
    symbol: params.symbol,
    interval: params.interval,
    limit: String(Math.min(1000, Math.max(1, params.limit))),
  });
  if (params.startTimeMs !== undefined) {
    qs.set('startTime', String(params.startTimeMs));
  }
  if (params.endTimeMs !== undefined) {
    qs.set('endTime', String(params.endTimeMs));
  }

  const url = `${BINANCE_VISION_BASE}/klines?${qs.toString()}`;
  const raw = await fetchJsonWithTimeout<Array<[number, string, string, string, string, string]>>(
    url,
    10000
  );

  return raw.map((row) => ({
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

export async function fetchOkxFundingRate8h(okxInstId: string): Promise<number | null> {
  try {
    const url = `${OKX_PUBLIC_BASE}/funding-rate?instId=${encodeURIComponent(okxInstId)}`;
    const json = await fetchJsonWithTimeout<{
      code?: string;
      data?: Array<{ fundingRate?: string }>;
    }>(url, 6000);
    const rateRaw = json?.data?.[0]?.fundingRate;
    if (rateRaw === undefined || rateRaw === null || rateRaw === '') return null;
    const parsed = Number(rateRaw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    // Graceful degradation: funding rate is optional enrichment
    return null;
  }
}

async function fetchSymbolBundle(
  spec: AssetSpec,
  nowSec: number
): Promise<{ spec: AssetSpec; bundle: SymbolCandleBundle }> {
  const [raw1d, raw4h, raw1h, fundingRate8h] = await Promise.all([
    fetchBinanceKlines({ symbol: spec.symbol, interval: '1d', limit: 110 }),
    fetchBinanceKlines({ symbol: spec.symbol, interval: '4h', limit: 190 }),
    fetchBinanceKlines({ symbol: spec.symbol, interval: '1h', limit: 175 }),
    fetchOkxFundingRate8h(spec.okxInstId),
  ]);

  const closed1d = filterClosedCandles(raw1d, 86400, nowSec);
  const closed4h = filterClosedCandles(raw4h, 4 * 3600, nowSec);
  const closed1h = filterClosedCandles(raw1h, 3600, nowSec);
  const livePrice =
    raw1h[raw1h.length - 1]?.close ?? closed1h[closed1h.length - 1]?.close ?? 0;

  return {
    spec,
    bundle: {
      closed1d,
      closed4h,
      closed1h,
      raw1h,
      raw4h,
      livePrice,
      fundingRate8h,
    },
  };
}

export async function scanAllSwingAssetsLive(
  overrideNowMs?: number
): Promise<LiveSwingRadarSnapshot> {
  const scannedAtMs = overrideNowMs ?? Date.now();
  const nowSec = Math.floor(scannedAtMs / 1000);

  const fetched = await Promise.all(
    SWING_UNIVERSE.map((spec) => fetchSymbolBundle(spec, nowSec))
  );

  const bundlesBySymbol = {} as Record<CryptoSymbol, SymbolCandleBundle>;
  for (const item of fetched) {
    bundlesBySymbol[item.spec.symbol] = item.bundle;
  }

  const btcBundle = bundlesBySymbol.BTCUSDT;
  const leaderContext = evaluateMarketLeaderRegime(
    btcBundle.closed1d,
    btcBundle.closed4h,
    btcBundle.livePrice
  );

  const results: CryptoSwingScanResult[] = SWING_UNIVERSE.map((spec) => {
    const b = bundlesBySymbol[spec.symbol];
    return analyzeAssetSwingSetup({
      spec,
      closed1d: b.closed1d,
      closed4h: b.closed4h,
      closed1h: b.closed1h,
      livePrice: b.livePrice,
      fundingRate8h: b.fundingRate8h,
      leaderContext,
    });
  });

  return {
    scannedAtIso: new Date(scannedAtMs).toISOString(),
    scannedAtMs,
    leaderContext,
    results,
    bundlesBySymbol,
  };
}
