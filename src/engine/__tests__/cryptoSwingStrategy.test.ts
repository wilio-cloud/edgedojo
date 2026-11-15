import { describe, expect, it } from 'vitest';
import backtestReportJson from '../../data/swingBacktestReport.json';
import {
  SWING_UNIVERSE,
  SwingBacktestReport,
  analyzeAssetSwingSetup,
  evaluateMarketLeaderRegime,
  filterClosedCandles,
  runHistoricalSwingBacktest,
  selectVenueAndLeverage,
} from '../cryptoSwingStrategy';
import { Candle } from '../types';

function generateSyntheticTrendCandles(params: {
  count: number;
  startTimeSec: number;
  stepSec: number;
  startPrice: number;
  driftPerBar: number;
  volatility: number;
}): Candle[] {
  const { count, startTimeSec, stepSec, startPrice, driftPerBar, volatility } = params;
  const out: Candle[] = [];
  let p = startPrice;
  for (let i = 0; i < count; i++) {
    const wave = Math.sin(i * 0.35) * volatility * 0.6;
    const open = p;
    const close = Math.max(0.5, p + driftPerBar + wave * 0.25);
    const high = Math.max(open, close) + volatility * 0.55;
    const low = Math.min(open, close) - volatility * 0.55;
    out.push({
      time: startTimeSec + i * stepSec,
      open,
      high,
      low,
      close,
      volume: 1000 + (i % 5) * 120,
    });
    p = close;
  }
  return out;
}

describe('cryptoSwingStrategy — Quantitative Swing Engine', () => {
  it('filters out unclosed candles strictly to prevent repainting and look-ahead bias', () => {
    const candles: Candle[] = [
      { time: 1000, open: 100, high: 102, low: 99, close: 101, volume: 500 },
      { time: 4600, open: 101, high: 104, low: 100, close: 103, volume: 600 },
      { time: 8200, open: 103, high: 106, low: 102, close: 105, volume: 700 },
    ];

    // At nowSec = 8500, candle at 8200 (closes at 8200 + 3600 = 11800) is STILL OPEN!
    const closed = filterClosedCandles(candles, 3600, 8500);
    expect(closed).toHaveLength(2);
    expect(closed[closed.length - 1].time).toBe(4600);
  });

  it('evaluates BTC Market Leader regime and blocks counter-tide Altcoin trades', () => {
    const bull1d = generateSyntheticTrendCandles({
      count: 70,
      startTimeSec: 1_700_000_000,
      stepSec: 86400,
      startPrice: 60000,
      driftPerBar: 450,
      volatility: 900,
    });
    const bull4h = generateSyntheticTrendCandles({
      count: 100,
      startTimeSec: 1_705_000_000,
      stepSec: 14400,
      startPrice: 78000,
      driftPerBar: 160,
      volatility: 420,
    });

    const bullLeader = evaluateMarketLeaderRegime(bull1d, bull4h);
    expect(bullLeader.regime).toBe('BULLISH');
    expect(bullLeader.allowAltLongs).toBe(true);
    expect(bullLeader.allowAltShorts).toBe(false);

    const bear1d = generateSyntheticTrendCandles({
      count: 70,
      startTimeSec: 1_700_000_000,
      stepSec: 86400,
      startPrice: 95000,
      driftPerBar: -480,
      volatility: 900,
    });
    const bear4h = generateSyntheticTrendCandles({
      count: 100,
      startTimeSec: 1_705_000_000,
      stepSec: 14400,
      startPrice: 75000,
      driftPerBar: -180,
      volatility: 420,
    });

    const bearLeader = evaluateMarketLeaderRegime(bear1d, bear4h);
    expect(bearLeader.regime).toBe('BEARISH');
    expect(bearLeader.allowAltLongs).toBe(false);
    expect(bearLeader.allowAltShorts).toBe(true);
  });

  it('selects optimal Spot vs Perps venue using live 8h Funding Rate and safe Isolated Leverage', () => {
    // 1. Short must always use Isolated Perps <= 5x
    const shortVenue = selectVenueAndLeverage({
      side: 'SHORT',
      slDistancePct: 3.2,
      fundingRate8h: 0.00018,
    });
    expect(shortVenue.venue).toBe('PERPS_ISOLATED');
    expect(shortVenue.maxSafeLeverage).toBeLessThanOrEqual(5);

    // 2. Long with expensive positive funding (> +0.022%/8h) must force SPOT
    const expensiveLong = selectVenueAndLeverage({
      side: 'LONG',
      slDistancePct: 2.8,
      fundingRate8h: 0.00045,
    });
    expect(expensiveLong.venue).toBe('SPOT');
    expect(expensiveLong.maxSafeLeverage).toBe(1);

    // 3. Long with negative funding (< -0.002%/8h) highlights Short-Squeeze Perps/Spot option
    const squeezeLong = selectVenueAndLeverage({
      side: 'LONG',
      slDistancePct: 2.8,
      fundingRate8h: -0.00015,
    });
    expect(squeezeLong.venue).toBe('SPOT_OR_PERPS');
    expect(squeezeLong.maxSafeLeverage).toBeLessThanOrEqual(3);
  });

  it('detects a valid Pro-Tide 4H Pullback + 1H CHoCH setup, enforces Altcoin LIMIT_PULLBACK-only rule, and allows MARKET + LIMIT on BTC', () => {
    const ethSpec = SWING_UNIVERSE.find((s) => s.symbol === 'ETHUSDT')!;
    const leaderSyntheticSpec = {
      ...ethSpec,
      symbol: 'BTCUSDT' as const,
      shortLabel: 'BTC',
      isLeader: true,
      minSlPct: 1.35,
    };
    const closed1d = generateSyntheticTrendCandles({
      count: 70,
      startTimeSec: 1_700_000_000,
      stepSec: 86400,
      startPrice: 2200,
      driftPerBar: 18,
      volatility: 45,
    });

    // Build 90 4H bars hovering around 3290-3320, with a recent swing from 3240 to 3500, pulling back into EMA21/50 (~3305, 33% of 4H range)
    const closed4h: Candle[] = [];
    for (let i = 0; i < 84; i++) {
      const base = 3295 + Math.sin(i * 0.2) * 25 + (i > 60 ? (i - 60) * 1.5 : 0);
      closed4h.push({
        time: 1_705_000_000 + i * 14400,
        open: base - 5,
        high: base + 22,
        low: base - 22,
        close: base + 5,
        volume: 2000,
      });
    }
    const swingPath4h = [
      { o: 3255, h: 3390, l: 3240, c: 3380 },
      { o: 3380, h: 3560, l: 3370, c: 3530 },
      { o: 3530, h: 3540, l: 3410, c: 3420 },
      { o: 3420, h: 3430, l: 3345, c: 3355 },
      { o: 3355, h: 3365, l: 3302, c: 3315 },
      { o: 3315, h: 3360, l: 3305, c: 3352 },
    ];
    swingPath4h.forEach((b, idx) => {
      closed4h.push({
        time: 1_705_000_000 + (84 + idx) * 14400,
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
        volume: 2200,
      });
    });

    // Build 100 1H bars with ATR(1H) ~ 38$, tapping 3304 (inside EMA21/50 4H) and closing CHoCH at 3356 (~1.8x ATR1H = compact close)
    const closed1h: Candle[] = [];
    for (let i = 0; i < 97; i++) {
      const base = 3380 - (i > 75 ? (i - 75) * 3 : 0);
      closed1h.push({
        time: 1_706_000_000 + i * 3600,
        open: base,
        high: base + 19,
        low: base - 19,
        close: base - 2,
        volume: 900,
      });
    }
    closed1h.push(
      { time: 1_706_000_000 + 97 * 3600, open: 3322, high: 3332, low: 3304, close: 3314, volume: 1100 },
      { time: 1_706_000_000 + 98 * 3600, open: 3314, high: 3330, low: 3306, close: 3320, volume: 1050 },
      { time: 1_706_000_000 + 99 * 3600, open: 3320, high: 3362, low: 3316, close: 3356, volume: 1750 }
    );

    const bullBtcLeader = {
      regime: 'BULLISH' as const,
      btcPrice: 88000,
      ema50_4h: 84000,
      ema20_1d: 82000,
      structure4h: 'BULLISH' as const,
      trend1d: 'BULLISH' as const,
      allowAltLongs: true,
      allowAltShorts: false,
      summaryCa: 'BTC Alcista',
    };

    // 1) Market Leader (BTC) executes compact 1H triggers at MARKET
    const btcMarketScan = analyzeAssetSwingSetup({
      spec: leaderSyntheticSpec,
      closed1d,
      closed4h,
      closed1h,
      fundingRate8h: 0.0001,
      leaderContext: bullBtcLeader,
    });

    expect(btcMarketScan.status).toBe('SETUP_ACTIVE');
    expect(btcMarketScan.setup).not.toBeNull();
    expect(btcMarketScan.setup?.side).toBe('LONG');
    expect(btcMarketScan.setup?.netRR).toBeGreaterThanOrEqual(2.0);
    expect(btcMarketScan.setup?.executionType).toBe('MARKET');

    // 2) Altcoins (ETH) strictly block compact MARKET entries (waiting for > 2.05x ATR displacement + Limit retrace)
    const ethBlockedMarketScan = analyzeAssetSwingSetup({
      spec: ethSpec,
      closed1d,
      closed4h,
      closed1h,
      fundingRate8h: 0.0001,
      leaderContext: bullBtcLeader,
    });
    expect(ethBlockedMarketScan.setup).toBeNull();

    // 3) Stretch the final 1H candle (> 2.05x ATR1H from SL) and verify ETH triggers LIMIT_PULLBACK!
    const stretched1h = [...closed1h.slice(0, -1)];
    stretched1h.push({
      time: 1_706_000_000 + 99 * 3600,
      open: 3320,
      high: 3386,
      low: 3316,
      close: 3382,
      volume: 2100,
    });

    const limitScan = analyzeAssetSwingSetup({
      spec: ethSpec,
      closed1d,
      closed4h,
      closed1h: stretched1h,
      fundingRate8h: 0.0001,
      leaderContext: bullBtcLeader,
    });

    expect(limitScan.status).toBe('SETUP_ACTIVE');
    expect(limitScan.setup?.executionType).toBe('LIMIT_PULLBACK');
    expect(limitScan.setup!.entry).toBeLessThan(3382);
  });

  it('validates the audited 365-day historical walk-forward backtest report metrics', () => {
    const report = backtestReportJson as unknown as SwingBacktestReport;
    expect(report.daysCovered).toBeGreaterThanOrEqual(350);
    expect(report.totalFilledTrades).toBeGreaterThanOrEqual(35);
    expect(report.expectancyR).toBeGreaterThan(0.15);
    expect(report.profitFactor).toBeGreaterThan(1.3);
    expect(report.netTotalR).toBeGreaterThan(8);
    expect(report.byAsset).toHaveLength(4);

    // Also smoke-test runHistoricalSwingBacktest on minimal synthetic input
    const miniDatasets = SWING_UNIVERSE.map((spec) => ({
      spec,
      candles1d: generateSyntheticTrendCandles({
        count: 50,
        startTimeSec: 1_700_000_000,
        stepSec: 86400,
        startPrice: 1000,
        driftPerBar: 5,
        volatility: 20,
      }),
      candles4h: generateSyntheticTrendCandles({
        count: 160,
        startTimeSec: 1_700_000_000,
        stepSec: 14400,
        startPrice: 1000,
        driftPerBar: 1,
        volatility: 8,
      }),
      candles1h: generateSyntheticTrendCandles({
        count: 640,
        startTimeSec: 1_700_000_000,
        stepSec: 3600,
        startPrice: 1000,
        driftPerBar: 0.25,
        volatility: 4,
      }),
    }));
    const miniReport = runHistoricalSwingBacktest(miniDatasets);
    expect(miniReport.byAsset).toHaveLength(4);
  });
});
