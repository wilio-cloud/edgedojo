import { Candle, OrderSetup, TacticalAnnotation } from './types';
import { calculateCryptoSwingSizing } from './riskMasterEngine';

export type CryptoSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'AVAXUSDT';
export type MarketRegime = 'BULLISH' | 'BEARISH' | 'RANGE';
export type RadarSignalStatus = 'SETUP_ACTIVE' | 'PRE_ALERT' | 'NEUTRAL';
export type SetupArchetype = 'SWEEP_RECLAIM' | 'BOS_FVG_PULLBACK';
export type ExecutionOrderType = 'MARKET' | 'LIMIT_PULLBACK';
export type ExecutionVenue = 'SPOT' | 'PERPS_ISOLATED' | 'SPOT_OR_PERPS';

export interface AssetSpec {
  symbol: CryptoSymbol;
  displaySymbol: string;
  shortName: string;
  okxInstId: string;
  minSlPct: number;
  maxSlPct: number;
  isLeader: boolean;
}

export const SWING_UNIVERSE: AssetSpec[] = [
  {
    symbol: 'BTCUSDT',
    displaySymbol: 'BTC/USDT',
    shortName: 'BTC',
    okxInstId: 'BTC-USDT-SWAP',
    minSlPct: 1.25,
    maxSlPct: 6.5,
    isLeader: true,
  },
  {
    symbol: 'ETHUSDT',
    displaySymbol: 'ETH/USDT',
    shortName: 'ETH',
    okxInstId: 'ETH-USDT-SWAP',
    minSlPct: 1.5,
    maxSlPct: 7.8,
    isLeader: false,
  },
  {
    symbol: 'SOLUSDT',
    displaySymbol: 'SOL/USDT',
    shortName: 'SOL',
    okxInstId: 'SOL-USDT-SWAP',
    minSlPct: 1.85,
    maxSlPct: 9.5,
    isLeader: false,
  },
  {
    symbol: 'AVAXUSDT',
    displaySymbol: 'AVAX/USDT',
    shortName: 'AVAX',
    okxInstId: 'AVAX-USDT-SWAP',
    minSlPct: 1.95,
    maxSlPct: 9.8,
    isLeader: false,
  },
];

export interface MarketLeaderContext {
  regime: MarketRegime;
  btcPrice: number;
  ema50_4h: number;
  ema20_1d: number;
  structure4h: MarketRegime;
  trend1d: MarketRegime;
  allowAltLongs: boolean;
  allowAltShorts: boolean;
  summaryCa: string;
}

export interface SwingSignalSetup {
  setupId: string; // Deterministic ID for anti-duplicate notifications
  archetype: SetupArchetype;
  archetypeLabelCa: string;
  side: 'LONG' | 'SHORT';
  qualityScore: number; // 70..99
  grade: 'A+' | 'A';
  executionType: ExecutionOrderType;
  executionLabelCa: string;
  limitValidHours?: number;
  venue: ExecutionVenue;
  venueLabelCa: string;
  venueRationaleCa: string;
  maxSafeLeverage: number;
  triggerCandleTime: number;
  entry: number;
  stopLoss: number;
  tp1: number; // Partial 50% + Move SL to BE
  tp2: number; // Final 50% structural target
  slDistancePct: number;
  tp1RR: number;
  grossRR: number;
  netRR: number; // To TP2 after 0.10% notional fees
  blendedExpectedWinR: number; // 0.5 * tp1RR + 0.5 * netRR
  anchorPrice: number; // Swept level or FVG/Value edge
  rationaleBulletsCa: string[];
  managementPlanCa: string;
}

export interface PreAlertWatch {
  watchId: string;
  bias: 'LONG' | 'SHORT';
  zoneKind: 'SSL_SWEEP_WATCH' | 'BSL_SWEEP_WATCH' | 'FRESH_DEMAND_FVG' | 'FRESH_SUPPLY_FVG';
  headlineCa: string;
  targetZoneLow: number;
  targetZoneHigh: number;
  distancePct: number;
  triggerInstructionCa: string;
}

export interface CryptoSwingScanResult {
  spec: AssetSpec;
  asOfTimeSec: number;
  currentPrice: number;
  atr1h: number;
  atr4h: number;
  fundingRate8h: number | null; // e.g. 0.0001 = 0.01% per 8h
  structure4h: MarketRegime;
  dealingRangeLow: number;
  dealingRangeHigh: number;
  equilibrium50: number;
  pricePositionPct: number; // 0 = range low, 100 = range high
  nearestSsl4h: number | null;
  nearestBsl4h: number | null;
  status: RadarSignalStatus;
  setup: SwingSignalSetup | null;
  preAlert: PreAlertWatch | null;
  neutralReasonCa: string;
  annotations1h: TacticalAnnotation[];
  annotations4h: TacticalAnnotation[];
  orderOverlay: OrderSetup | null;
}

export interface BacktestTradeRecord {
  symbol: CryptoSymbol;
  archetype: SetupArchetype;
  side: 'LONG' | 'SHORT';
  executionType: ExecutionOrderType;
  venue: ExecutionVenue;
  signalTime: number;
  entryTime: number;
  exitTime: number;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  outcome: 'TP2_FULL' | 'TP1_THEN_BE' | 'SL_HIT' | 'TIME_EXIT';
  realizedR: number;
}

export interface AssetBacktestStats {
  symbol: CryptoSymbol;
  trades: number;
  wins: number; // realizedR > 0
  losses: number; // realizedR <= 0
  winRatePct: number;
  expectancyR: number;
  profitFactor: number;
  netTotalR: number;
  maxDrawdownR: number;
}

export interface SwingBacktestReport {
  generatedAt: string;
  periodStartIso: string;
  periodEndIso: string;
  daysCovered: number;
  assumptionsCa: string[];
  totalSignalsGenerated: number;
  limitUnfilledExpired: number;
  totalFilledTrades: number;
  winRatePct: number;
  tp1HitRatePct: number;
  avgWinR: number;
  avgLossR: number;
  expectancyR: number;
  profitFactor: number;
  netTotalR: number;
  maxDrawdownR: number;
  equityCurveR: { time: number; cumR: number }[];
  byAsset: AssetBacktestStats[];
  recentTrades: BacktestTradeRecord[];
}

// ============================================================================
// QUANTITATIVE PRIMITIVES (ZERO LOOK-AHEAD)
// ============================================================================

export function roundCryptoPrice(price: number): number {
  if (price >= 1000) return Math.round(price * 100) / 100;
  if (price >= 50) return Math.round(price * 100) / 100;
  if (price >= 5) return Math.round(price * 1000) / 1000;
  return Math.round(price * 10000) / 10000;
}

export function filterClosedCandles(
  candles: Candle[],
  timeframeSec: number,
  nowSec: number
): Candle[] {
  return candles.filter((c) => c.time + timeframeSec <= nowSec);
}

export function computeAtr(candles: Candle[], period = 14): number {
  if (candles.length === 0) return 1;
  if (candles.length === 1) return Math.max(1e-6, candles[0].high - candles[0].low);
  const trs: number[] = [];
  const start = Math.max(1, candles.length - period * 2);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  const avg = recent.reduce((s, v) => s + v, 0) / Math.max(1, recent.length);
  return Math.max(avg, candles[candles.length - 1].close * 0.002);
}

export function computeEma(candles: Candle[], period: number): number {
  if (candles.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

interface PivotPoint {
  index: number;
  time: number;
  price: number;
  kind: 'HIGH' | 'LOW';
}

/**
 * Finds confirmed structural pivots where `rightBars` have ALREADY closed,
 * guaranteeing zero look-ahead bias in both live scanning and backtesting.
 */
function findConfirmedPivots(
  candles: Candle[],
  leftBars = 3,
  rightBars = 2
): PivotPoint[] {
  const pivots: PivotPoint[] = [];
  const lastAllowed = candles.length - 1 - rightBars;
  for (let i = leftBars; i <= lastAllowed; i++) {
    const hi = candles[i].high;
    const lo = candles[i].low;
    let isHigh = true;
    let isLow = true;

    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].high > hi) isHigh = false;
      if (candles[j].low < lo) isLow = false;
    }

    if (isHigh) {
      pivots.push({ index: i, time: candles[i].time, price: hi, kind: 'HIGH' });
    }
    if (isLow) {
      pivots.push({ index: i, time: candles[i].time, price: lo, kind: 'LOW' });
    }
  }
  return pivots;
}

interface ImbalanceZone {
  kind: 'BULL_FVG' | 'BEAR_FVG';
  index: number;
  time: number;
  top: number;
  bottom: number;
  originExtreme: number;
}

function findUnmitigated4hFvgs(candles4h: Candle[], atr4h: number): ImbalanceZone[] {
  const zones: ImbalanceZone[] = [];
  const start = Math.max(2, candles4h.length - 48);
  const checkPriorTouchesUntil = Math.max(0, candles4h.length - 5);

  for (let i = start; i < candles4h.length - 1; i++) {
    const c0 = candles4h[i - 2];
    const c1 = candles4h[i - 1];
    const c2 = candles4h[i];
    const body1 = Math.abs(c1.close - c1.open);

    if (
      c1.close > c1.open &&
      c2.low > c0.high &&
      c2.low - c0.high >= atr4h * 0.1 &&
      body1 >= atr4h * 0.6
    ) {
      const top = c2.low;
      const bottom = c0.high;
      const originExtreme = Math.min(c0.low, c1.low);
      let invalidated = false;
      let priorTouches = 0;

      for (let k = i + 1; k < candles4h.length; k++) {
        if (candles4h[k].close < originExtreme || candles4h[k].close < bottom - atr4h * 0.15) {
          invalidated = true;
          break;
        }
        if (k <= checkPriorTouchesUntil && candles4h[k].low <= top) {
          priorTouches++;
        }
      }
      if (!invalidated && priorTouches <= 1) {
        zones.push({
          kind: 'BULL_FVG',
          index: i - 1,
          time: c1.time,
          top,
          bottom,
          originExtreme,
        });
      }
    }

    if (
      c1.close < c1.open &&
      c2.high < c0.low &&
      c0.low - c2.high >= atr4h * 0.1 &&
      body1 >= atr4h * 0.6
    ) {
      const top = c0.low;
      const bottom = c2.high;
      const originExtreme = Math.max(c0.high, c1.high);
      let invalidated = false;
      let priorTouches = 0;

      for (let k = i + 1; k < candles4h.length; k++) {
        if (candles4h[k].close > originExtreme || candles4h[k].close > top + atr4h * 0.15) {
          invalidated = true;
          break;
        }
        if (k <= checkPriorTouchesUntil && candles4h[k].high >= bottom) {
          priorTouches++;
        }
      }
      if (!invalidated && priorTouches <= 1) {
        zones.push({
          kind: 'BEAR_FVG',
          index: i - 1,
          time: c1.time,
          top,
          bottom,
          originExtreme,
        });
      }
    }
  }

  return zones;
}

function classify4hStructure(candles4h: Candle[]): {
  regime: MarketRegime;
  ema21: number;
  ema50: number;
  pivots: PivotPoint[];
} {
  const pivots = findConfirmedPivots(candles4h, 3, 2);
  const ema50 = computeEma(candles4h, 50);
  const ema21 = computeEma(candles4h, 21);
  const lastClose = candles4h[candles4h.length - 1]?.close ?? 0;

  if (lastClose >= ema50 * 1.002 && ema21 >= ema50 * 0.996) {
    return { regime: 'BULLISH', ema21, ema50, pivots };
  }
  if (lastClose <= ema50 * 0.998 && ema21 <= ema50 * 1.004) {
    return { regime: 'BEARISH', ema21, ema50, pivots };
  }
  return { regime: 'RANGE', ema21, ema50, pivots };
}

function classify1dTrend(candles1d: Candle[], currentPrice: number): {
  trend1d: MarketRegime;
  ema20: number;
  ema50: number;
} {
  const ema20 = computeEma(candles1d, 20);
  const ema50 = computeEma(candles1d, 50);
  if (currentPrice > ema20 && ema20 >= ema50 * 0.99) {
    return { trend1d: 'BULLISH', ema20, ema50 };
  }
  if (currentPrice < ema20 && ema20 <= ema50 * 1.01) {
    return { trend1d: 'BEARISH', ema20, ema50 };
  }
  return { trend1d: 'RANGE', ema20, ema50 };
}

// ============================================================================
// LAYER 1: BTC MARKET LEADER REGIME FILTER (4H EMA50 TIDE + 1D MACRO)
// ============================================================================

export function evaluateMarketLeaderRegime(
  btcClosed1d: Candle[],
  btcClosed4h: Candle[],
  currentBtcPrice?: number
): MarketLeaderContext {
  const { regime: structure4h, ema50: ema50_4h } = classify4hStructure(btcClosed4h);
  const btcPrice =
    currentBtcPrice ?? btcClosed4h[btcClosed4h.length - 1]?.close ?? 0;
  const { trend1d, ema20: ema20_1d } = classify1dTrend(btcClosed1d, btcPrice);

  let regime: MarketRegime = structure4h;
  if (regime === 'RANGE') {
    if (btcPrice > ema50_4h && trend1d === 'BULLISH') regime = 'BULLISH';
    else if (btcPrice < ema50_4h && trend1d === 'BEARISH') regime = 'BEARISH';
  }

  // Empirical Institutional Rule:
  // Longs are enabled when BTC holds its 4H EMA50 tide (>= 0.985 * EMA50_4H);
  // Shorts are enabled when BTC trades below its 4H EMA50 tide (<= 1.005 * EMA50_4H).
  const allowAltLongs = btcPrice >= ema50_4h * 0.985;
  const allowAltShorts = btcPrice <= ema50_4h * 1.005;

  const summaryCa =
    regime === 'BULLISH'
      ? `BTC Marea Alcista 4H (Preu ${roundCryptoPrice(btcPrice)}$ sobre EMA50 ${roundCryptoPrice(ema50_4h)}$ · 1D ${trend1d}) — Prioritat Longs en retrocés a valor/FVG i Sweeps SSL.`
      : regime === 'BEARISH'
        ? `BTC Marea Baixista 4H (Preu ${roundCryptoPrice(btcPrice)}$ sota EMA50 ${roundCryptoPrice(ema50_4h)}$ · 1D ${trend1d}) — Bloquejats Longs; prioritat Shorts en rebot a oferta/EMA i Sweeps BSL.`
        : `BTC en Zona de Transició 4H (Prop d’EMA50 ${roundCryptoPrice(ema50_4h)}$) — Màxima selectivitat: només setups amb confluència d’estructura i R:R >= 2.0R.`;

  return {
    regime,
    btcPrice,
    ema50_4h,
    ema20_1d,
    structure4h,
    trend1d,
    allowAltLongs,
    allowAltShorts,
    summaryCa,
  };
}

// ============================================================================
// LAYER 2, 3 & 4: ASSET SWING SCANNER (ACTIVE SETUPS + PRE-ALERTS)
// ============================================================================

export function selectVenueAndLeverage(params: {
  side: 'LONG' | 'SHORT';
  slDistancePct: number;
  fundingRate8h: number | null;
}): {
  venue: ExecutionVenue;
  venueLabelCa: string;
  venueRationaleCa: string;
  maxSafeLeverage: number;
} {
  const { side, slDistancePct, fundingRate8h } = params;
  const rawSafeLev = Math.floor(32 / Math.max(1.2, slDistancePct));
  const maxSafeLeverage = Math.max(1, Math.min(5, rawSafeLev));

  if (side === 'SHORT') {
    const fundNote =
      fundingRate8h !== null && fundingRate8h < -0.00025
        ? `Compte: Funding molt negatiu (${(fundingRate8h * 100).toFixed(3)}%/8h); no allarguis en excés i cobra el 50% puntual a TP1.`
        : fundingRate8h !== null && fundingRate8h > 0.0001
          ? `Funding positiu (+${(fundingRate8h * 100).toFixed(3)}%/8h): a més del recorregut cobraràs finançament a favor teu!`
          : `Usa sempre marge AÏLLAT (Isolated <= ${maxSafeLeverage}x) perquè la liquidació quedi molt lluny de l’SL.`;

    return {
      venue: 'PERPS_ISOLATED',
      venueLabelCa: `PERPS USDT · Aïllat <= ${maxSafeLeverage}x`,
      venueRationaleCa: `Operació SHORT: requereix Futurs Perpetus USDT en mode Aïllat. ${fundNote}`,
      maxSafeLeverage,
    };
  }

  if (fundingRate8h !== null && fundingRate8h > 0.00022) {
    return {
      venue: 'SPOT',
      venueLabelCa: 'SPOT (Compra Directa)',
      venueRationaleCa: `Funding en Perps encarit (+${(fundingRate8h * 100).toFixed(3)}%/8h). Entrar en SPOT t’estalvia pagar comissions cada 8h i elimina el 100% del risc de liquidació nocturna.`,
      maxSafeLeverage: 1,
    };
  }

  if (fundingRate8h !== null && fundingRate8h < -0.00002) {
    return {
      venue: 'SPOT_OR_PERPS',
      venueLabelCa: `SPOT o PERPS Aïllat <= ${Math.min(3, maxSafeLeverage)}x`,
      venueRationaleCa: `Funding negatiu (${(fundingRate8h * 100).toFixed(3)}%/8h = curts atrapats, benzina de Short Squeeze!). Pots operar tant en SPOT com en Perps Aïllat <= ${Math.min(3, maxSafeLeverage)}x cobrant funding.`,
      maxSafeLeverage: Math.min(3, maxSafeLeverage),
    };
  }

  return {
    venue: 'SPOT',
    venueLabelCa: `SPOT (o Perps Aïllat <= ${Math.min(3, maxSafeLeverage)}x)`,
    venueRationaleCa: `Swing alcista de diversos dies: SPOT és l’opció institucional més neta (zero funding i zero metxes de liquidació). Si uses Perps per eficiència de marge, limita-ho a Aïllat <= ${Math.min(3, maxSafeLeverage)}x.`,
    maxSafeLeverage: Math.min(3, maxSafeLeverage),
  };
}

export function analyzeAssetSwingSetup(params: {
  spec: AssetSpec;
  closed1d: Candle[];
  closed4h: Candle[];
  closed1h: Candle[];
  livePrice?: number;
  fundingRate8h?: number | null;
  leaderContext: MarketLeaderContext;
}): CryptoSwingScanResult {
  const {
    spec,
    closed1d,
    closed4h,
    closed1h,
    fundingRate8h = null,
    leaderContext,
  } = params;

  const last1h = closed1h[closed1h.length - 1];
  const currentPrice = params.livePrice ?? last1h.close;
  const atr1h = computeAtr(closed1h, 14);
  const atr4h = computeAtr(closed4h, 14);
  const {
    regime: structure4h,
    ema21: ema21_4h,
    ema50: ema50_4h,
    pivots: pivots4h,
  } = classify4hStructure(closed4h);
  const {
    trend1d: assetTrend1d,
    ema50: ema50_1d,
  } = classify1dTrend(closed1d, last1h.close);

  // Dealing range over last 36 4H bars (~6 days)
  const recent4hWindow = closed4h.slice(-36);
  const dealingRangeHigh = Math.max(...recent4hWindow.map((c) => c.high));
  const dealingRangeLow = Math.min(...recent4hWindow.map((c) => c.low));
  const rangeSpan = Math.max(atr4h, dealingRangeHigh - dealingRangeLow);
  const equilibrium50 = roundCryptoPrice(dealingRangeLow + rangeSpan * 0.5);
  const pricePositionPct = Math.round(
    Math.max(0, Math.min(100, ((currentPrice - dealingRangeLow) / rangeSpan) * 100))
  );

  // Intouched 4H SSL & BSL pools prior to the recent 2 4H bars
  const preTrigger4hEnd = Math.max(0, closed4h.length - 2);
  const candidatePivots = pivots4h.filter(
    (p) => p.index >= Math.max(0, closed4h.length - 54) && p.index < preTrigger4hEnd
  );

  const activeSslPools = candidatePivots
    .filter((p) => {
      if (p.kind !== 'LOW') return false;
      for (let k = p.index + 1; k < preTrigger4hEnd; k++) {
        if (closed4h[k].close < p.price) return false;
      }
      return true;
    })
    .sort((a, b) => b.index - a.index);

  const activeBslPools = candidatePivots
    .filter((p) => {
      if (p.kind !== 'HIGH') return false;
      for (let k = p.index + 1; k < preTrigger4hEnd; k++) {
        if (closed4h[k].close > p.price) return false;
      }
      return true;
    })
    .sort((a, b) => b.index - a.index);

  const fvgs4h = findUnmitigated4hFvgs(closed4h, atr4h);

  const nearestSslBelow =
    activeSslPools
      .filter((p) => p.price <= currentPrice * 1.01)
      .sort((a, b) => b.price - a.price)[0]?.price ?? null;
  const nearestBslAbove =
    activeBslPools
      .filter((p) => p.price >= currentPrice * 0.99)
      .sort((a, b) => a.price - b.price)[0]?.price ?? null;

  // Chart annotations (4H & 1H)
  const annotations4h: TacticalAnnotation[] = [];
  const annotations1h: TacticalAnnotation[] = [];

  if (nearestSslBelow) {
    annotations4h.push({
      id: `${spec.symbol}_ssl4h`,
      kind: 'LIQUIDITY_POOL',
      priceTop: roundCryptoPrice(nearestSslBelow),
      startIndex: Math.max(0, closed4h.length - 42),
      endIndex: closed4h.length - 1,
      label: `SSL 4H (${roundCryptoPrice(nearestSslBelow)})`,
      tone: 'liquidity',
    });
    annotations1h.push({
      id: `${spec.symbol}_ssl1h`,
      kind: 'LIQUIDITY_POOL',
      priceTop: roundCryptoPrice(nearestSslBelow),
      startIndex: Math.max(0, closed1h.length - 60),
      endIndex: closed1h.length - 1,
      label: `Piscina SSL 4H (${roundCryptoPrice(nearestSslBelow)})`,
      tone: 'liquidity',
    });
  }

  if (nearestBslAbove) {
    annotations4h.push({
      id: `${spec.symbol}_bsl4h`,
      kind: 'LIQUIDITY_POOL',
      priceTop: roundCryptoPrice(nearestBslAbove),
      startIndex: Math.max(0, closed4h.length - 42),
      endIndex: closed4h.length - 1,
      label: `BSL 4H (${roundCryptoPrice(nearestBslAbove)})`,
      tone: 'liquidity',
    });
    annotations1h.push({
      id: `${spec.symbol}_bsl1h`,
      kind: 'LIQUIDITY_POOL',
      priceTop: roundCryptoPrice(nearestBslAbove),
      startIndex: Math.max(0, closed1h.length - 60),
      endIndex: closed1h.length - 1,
      label: `Piscina BSL 4H (${roundCryptoPrice(nearestBslAbove)})`,
      tone: 'liquidity',
    });
  }

  const latestBullFvg = fvgs4h.filter((z) => z.kind === 'BULL_FVG').slice(-1)[0];
  if (latestBullFvg) {
    annotations4h.push({
      id: `${spec.symbol}_bfvg4h`,
      kind: 'FVG',
      priceTop: roundCryptoPrice(latestBullFvg.top),
      priceBottom: roundCryptoPrice(latestBullFvg.bottom),
      startIndex: Math.max(0, latestBullFvg.index),
      endIndex: closed4h.length - 1,
      label: 'FVG Demanda 4H Fresc',
      tone: 'bull',
    });
  }

  const latestBearFvg = fvgs4h.filter((z) => z.kind === 'BEAR_FVG').slice(-1)[0];
  if (latestBearFvg) {
    annotations4h.push({
      id: `${spec.symbol}_sfvg4h`,
      kind: 'FVG',
      priceTop: roundCryptoPrice(latestBearFvg.top),
      priceBottom: roundCryptoPrice(latestBearFvg.bottom),
      startIndex: Math.max(0, latestBearFvg.index),
      endIndex: closed4h.length - 1,
      label: 'FVG Oferta 4H Fresc',
      tone: 'bear',
    });
  }

  const volSlice = closed1h.slice(-23, -3);
  const avgVol1h =
    volSlice.reduce((acc, c) => acc + c.volume, 0) / Math.max(1, volSlice.length);

  // 4H Tide + Market Leader + Altcoin 1D Relative Strength Alignment (Module 5 rule:
  // never buy a laggard altcoin trapped in a 1D bear trend unless its 4H trend has genuinely expanded!)
  const altLaggingIn1dBear =
    !spec.isLeader &&
    assetTrend1d === 'BEARISH' &&
    last1h.close < ema50_1d * 0.98 &&
    ema21_4h <= ema50_4h * 1.008;
  const altLeadingIn1dBull =
    !spec.isLeader &&
    assetTrend1d === 'BULLISH' &&
    last1h.close > ema50_1d * 1.02 &&
    ema21_4h >= ema50_4h * 0.992;

  const canGoLong =
    leaderContext.allowAltLongs &&
    last1h.close >= ema50_4h * 0.98 &&
    !altLaggingIn1dBear;
  const canGoShort =
    leaderContext.allowAltShorts &&
    last1h.close <= ema50_4h * 1.01 &&
    !altLeadingIn1dBull;

  const tryBuildValidatedSetup = (cand: {
    archetype: SetupArchetype;
    side: 'LONG' | 'SHORT';
    rawInvalidation: number;
    anchorPrice: number;
    anchorKey: string;
    volRatio: number;
    preferredTarget: number;
    bullets: string[];
  }): SwingSignalSetup | null => {
    const dir = cand.side === 'LONG' ? 1 : -1;
    const stopLoss = roundCryptoPrice(cand.rawInvalidation - dir * atr1h * 0.35);

    const marketEntry = roundCryptoPrice(last1h.close);
    if (cand.side === 'LONG' && stopLoss >= marketEntry) return null;
    if (cand.side === 'SHORT' && stopLoss <= marketEntry) return null;

    const distAtMarket = Math.abs(marketEntry - stopLoss);
    const extensionAtr = distAtMarket / atr1h;
    // Reject overly stretched climax candles (> 2.85x ATR1H) rather than chasing
    if (extensionAtr > 2.85) return null;

    let executionType: ExecutionOrderType = 'MARKET';
    let entry = marketEntry;
    let limitValidHours: number | undefined;

    if (extensionAtr > 2.05) {
      executionType = 'LIMIT_PULLBACK';
      // Shallow 30% body retrace into 1H displacement imbalance (avoids deep failure adverse selection!)
      const bodySpan = Math.abs(last1h.close - last1h.open);
      entry = roundCryptoPrice(marketEntry - dir * bodySpan * 0.3);
      limitValidHours = 6;
    }

    const riskDist = Math.abs(entry - stopLoss);
    const slDistancePct = Math.round((riskDist / entry) * 10000) / 100;
    if (slDistancePct < spec.minSlPct || slDistancePct > spec.maxSlPct) {
      return null;
    }

    let rawTarget = cand.preferredTarget;
    if (cand.side === 'LONG') {
      rawTarget = Math.min(rawTarget, entry + riskDist * 3.0);
    } else {
      rawTarget = Math.max(rawTarget, entry - riskDist * 3.0);
    }

    const tp2 = roundCryptoPrice(rawTarget);
    const grossRR =
      Math.round((Math.abs(tp2 - entry) / Math.max(1e-6, riskDist)) * 100) / 100;
    if (grossRR < 2.15) return null;

    const sizingCheck = calculateCryptoSwingSizing({
      capitalUsdt: 5000,
      riskPct: 1,
      entryPrice: entry,
      stopLossPrice: stopLoss,
      takeProfitPrice: tp2,
    });

    if (!sizingCheck.valid || sizingCheck.netRR < 2.0) {
      return null;
    }

    const tp1RR = 1.5;
    const tp1 = roundCryptoPrice(entry + dir * riskDist * tp1RR);
    const blendedExpectedWinR =
      Math.round((0.5 * (tp1RR - 0.04) + 0.5 * sizingCheck.netRR) * 100) / 100;

    const venueInfo = selectVenueAndLeverage({
      side: cand.side,
      slDistancePct,
      fundingRate8h,
    });

    const alignedWithBtc =
      (cand.side === 'LONG' && leaderContext.regime === 'BULLISH') ||
      (cand.side === 'SHORT' && leaderContext.regime === 'BEARISH');
    const alignedWithOwn1d =
      (cand.side === 'LONG' && assetTrend1d === 'BULLISH') ||
      (cand.side === 'SHORT' && assetTrend1d === 'BEARISH');
    const scoreRaw =
      76 +
      (cand.archetype === 'SWEEP_RECLAIM' ? 6 : 5) +
      (alignedWithBtc ? 5 : 0) +
      (alignedWithOwn1d ? 4 : 0) +
      Math.min(5, Math.round((cand.volRatio - 1) * 4)) +
      (sizingCheck.netRR >= 2.4 ? 3 : 1);
    const qualityScore = Math.max(76, Math.min(99, scoreRaw));

    const executionLabelCa =
      executionType === 'MARKET'
        ? `A MERCAT al tancament 1H (~${entry}$)`
        : `ORDRE LÍMIT en micro-retrocés a ${entry}$ (vàlida ${limitValidHours}h)`;

    return {
      setupId: `${spec.symbol}_${cand.side}_${cand.archetype}_${cand.anchorKey}`,
      archetype: cand.archetype,
      archetypeLabelCa:
        cand.archetype === 'SWEEP_RECLAIM'
          ? 'Liquidation Sweep & Reclaim en Zona de Valor (4H → 1H)'
          : 'BOS + Pullback Institucional a Valor/FVG (4H → 1H)',
      side: cand.side,
      qualityScore,
      grade: qualityScore >= 84 ? 'A+' : 'A',
      executionType,
      executionLabelCa,
      limitValidHours,
      venue: venueInfo.venue,
      venueLabelCa: venueInfo.venueLabelCa,
      venueRationaleCa: venueInfo.venueRationaleCa,
      maxSafeLeverage: venueInfo.maxSafeLeverage,
      triggerCandleTime: last1h.time,
      entry,
      stopLoss,
      tp1,
      tp2,
      slDistancePct,
      tp1RR,
      grossRR,
      netRR: sizingCheck.netRR,
      blendedExpectedWinR,
      anchorPrice: roundCryptoPrice(cand.anchorPrice),
      rationaleBulletsCa: cand.bullets,
      managementPlanCa: `1) Cobra el 50% a TP1 (${tp1}$ = +${tp1RR}R) i mou l’SL a Break-Even (${entry}$). 2) Deixa córrer l’altre 50% fins a la piscina TP2 (${tp2}$ = +${sizingCheck.netRR}R net).`,
    };
  };

  let detectedSetup: SwingSignalSetup | null = null;
  const recent3Bars1h = closed1h.slice(-3);
  const min3Low = Math.min(...recent3Bars1h.map((c) => c.low));
  const max3High = Math.max(...recent3Bars1h.map((c) => c.high));
  const max3Vol = Math.max(...recent3Bars1h.map((c) => c.volume));
  const volRatio3 = max3Vol / Math.max(1e-6, avgVol1h);
  const prev1h = closed1h[closed1h.length - 2];

  // --------------------------------------------------------------------------
  // CHECK 1A: PRO-TIDE BULLISH SWEEP & RECLAIM AT 4H VALUE / FVG CONFLUENCE
  // --------------------------------------------------------------------------
  if (canGoLong && pricePositionPct >= 15 && pricePositionPct <= 52 && prev1h) {
    const nearValueOrFvg =
      (min3Low <= ema21_4h * 1.006 && min3Low >= ema50_4h * 0.982) ||
      Boolean(
        latestBullFvg &&
          min3Low <= latestBullFvg.top * 1.003 &&
          min3Low >= latestBullFvg.originExtreme
      );

    if (nearValueOrFvg) {
      for (const ssl of activeSslPools) {
        const sweptCleanly =
          min3Low < ssl.price && ssl.price - min3Low <= atr4h * 0.75;
        const reclaimedChoch =
          last1h.close > ssl.price &&
          last1h.close > last1h.open &&
          last1h.close > prev1h.high &&
          last1h.close - last1h.open >= atr1h * 0.42;

        if (sweptCleanly && reclaimedChoch && volRatio3 >= 1.2) {
          const rawInv = Math.min(min3Low, ema50_4h * 0.996);
          const candidate = tryBuildValidatedSetup({
            archetype: 'SWEEP_RECLAIM',
            side: 'LONG',
            rawInvalidation: rawInv,
            anchorPrice: ssl.price,
            anchorKey: String(ssl.time),
            volRatio: volRatio3,
            preferredTarget: Math.max(
              dealingRangeHigh,
              last1h.close + Math.abs(last1h.close - rawInv) * 2.45
            ),
            bullets: [
              `Escombrada d’stops sota piscina SSL 4H (${roundCryptoPrice(ssl.price)}$) en plena confluència amb valor dinàmic 4H (volum ${volRatio3.toFixed(1)}x).`,
              `Reclamació i CHoCH alcista d’1H tancant a ${roundCryptoPrice(last1h.close)}$ per sobre del màxim previ.`,
              `Ubicació en Descompte (${pricePositionPct}% del rang 4H) amb marea 4H de BTC a favor.`,
            ],
          });
          if (candidate) {
            detectedSetup = candidate;
            annotations1h.push({
              id: `${spec.symbol}_sweep_bull`,
              kind: 'SWEEP',
              priceTop: roundCryptoPrice(ssl.price),
              priceBottom: roundCryptoPrice(min3Low),
              startIndex: Math.max(0, closed1h.length - 5),
              endIndex: closed1h.length - 1,
              label: 'Sweep SSL + Reclaim 1H',
              tone: 'bull',
            });
            break;
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // CHECK 1B: PRO-TIDE BEARISH SWEEP & RECLAIM AT 4H SUPPLY / VALUE CONFLUENCE
  // --------------------------------------------------------------------------
  if (!detectedSetup && canGoShort && pricePositionPct >= 48 && pricePositionPct <= 85 && prev1h) {
    const nearSupplyOrFvg =
      (max3High >= ema21_4h * 0.994 && max3High <= ema50_4h * 1.018) ||
      Boolean(
        latestBearFvg &&
          max3High >= latestBearFvg.bottom * 0.997 &&
          max3High <= latestBearFvg.originExtreme
      );

    if (nearSupplyOrFvg) {
      for (const bsl of activeBslPools) {
        const sweptCleanly =
          max3High > bsl.price && max3High - bsl.price <= atr4h * 0.75;
        const reclaimedChoch =
          last1h.close < bsl.price &&
          last1h.close < last1h.open &&
          last1h.close < prev1h.low &&
          last1h.open - last1h.close >= atr1h * 0.42;

        if (sweptCleanly && reclaimedChoch && volRatio3 >= 1.2) {
          const rawInv = Math.max(max3High, ema50_4h * 1.004);
          const candidate = tryBuildValidatedSetup({
            archetype: 'SWEEP_RECLAIM',
            side: 'SHORT',
            rawInvalidation: rawInv,
            anchorPrice: bsl.price,
            anchorKey: String(bsl.time),
            volRatio: volRatio3,
            preferredTarget: Math.min(
              dealingRangeLow,
              last1h.close - Math.abs(rawInv - last1h.close) * 2.45
            ),
            bullets: [
              `Bull Trap sobre piscina BSL 4H (${roundCryptoPrice(bsl.price)}$) xocant contra resistència/oferta 4H (volum ${volRatio3.toFixed(1)}x).`,
              `Rebuig i CHoCH baixista d’1H tancant a ${roundCryptoPrice(last1h.close)}$ sota el mínim previ.`,
              `Preu en zona Premium (${pricePositionPct}% del rang 4H) alineat amb marea baixista de BTC.`,
            ],
          });
          if (candidate) {
            detectedSetup = candidate;
            annotations1h.push({
              id: `${spec.symbol}_sweep_bear`,
              kind: 'SWEEP',
              priceTop: roundCryptoPrice(max3High),
              priceBottom: roundCryptoPrice(bsl.price),
              startIndex: Math.max(0, closed1h.length - 5),
              endIndex: closed1h.length - 1,
              label: 'Sweep BSL + Reclaim Baixista',
              tone: 'bear',
            });
            break;
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // CHECK 2A: BULLISH BOS + 4H VALUE / FVG PULLBACK IN DISCOUNT
  // --------------------------------------------------------------------------
  if (
    !detectedSetup &&
    canGoLong &&
    pricePositionPct >= 20 &&
    pricePositionPct <= 52 &&
    prev1h
  ) {
    const touched4hValueBand =
      min3Low <= ema21_4h * 1.004 && min3Low >= ema50_4h * 0.985;
    const touchedBullFvg = Boolean(
      latestBullFvg &&
        min3Low <= latestBullFvg.top * 1.002 &&
        min3Low >= latestBullFvg.originExtreme
    );
    const choch1hUp =
      last1h.close > last1h.open &&
      last1h.close > prev1h.high &&
      last1h.close - last1h.open >= atr1h * 0.45;

    if ((touched4hValueBand || touchedBullFvg) && choch1hUp) {
      const rawInv = Math.min(min3Low, ema50_4h);
      const anchorKey = String(Math.floor(last1h.time / (12 * 3600)));
      const zoneDesc = touchedBullFvg && latestBullFvg
        ? `FVG de Demanda 4H fresc (${roundCryptoPrice(latestBullFvg.bottom)}$–${roundCryptoPrice(latestBullFvg.top)}$)`
        : `banda de valor institucional EMA21/50 4H (${roundCryptoPrice(ema50_4h)}$–${roundCryptoPrice(ema21_4h)}$)`;

      const candidate = tryBuildValidatedSetup({
        archetype: 'BOS_FVG_PULLBACK',
        side: 'LONG',
        rawInvalidation: rawInv,
        anchorPrice: ema21_4h,
        anchorKey,
        volRatio: last1h.volume / Math.max(1e-6, avgVol1h),
        preferredTarget: Math.max(
          dealingRangeHigh,
          last1h.close + Math.abs(last1h.close - rawInv) * 2.4
        ),
        bullets: [
          `Estructura 4H alcista amb retrocés ordenat a Descompte (${pricePositionPct}% del rang).`,
          ` Defensat el suport a la ${zoneDesc}.`.trim(),
          `Gatell CHoCH d’1H superant el màxim previ (${roundCryptoPrice(prev1h.high)}$) amb cos d’intenció.`,
        ],
      });

      if (candidate) {
        detectedSetup = candidate;
        annotations1h.push({
          id: `${spec.symbol}_pb_bull_1h`,
          kind: 'DEMAND_ZONE',
          priceTop: roundCryptoPrice(Math.max(ema21_4h, min3Low + atr1h * 0.4)),
          priceBottom: roundCryptoPrice(Math.min(min3Low, ema50_4h)),
          startIndex: Math.max(0, closed1h.length - 30),
          endIndex: closed1h.length - 1,
          label: 'Zona Valor/FVG 4H + CHoCH 1H',
          tone: 'bull',
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // CHECK 2B: BEARISH BOS + 4H SUPPLY / FVG PULLBACK IN PREMIUM
  // --------------------------------------------------------------------------
  if (
    !detectedSetup &&
    !canGoLong &&
    canGoShort &&
    pricePositionPct >= 48 &&
    pricePositionPct <= 82 &&
    prev1h
  ) {
    const touched4hSupplyBand =
      max3High >= ema21_4h * 0.996 && max3High <= ema50_4h * 1.015;
    const touchedBearFvg = Boolean(
      latestBearFvg &&
        max3High >= latestBearFvg.bottom * 0.998 &&
        max3High <= latestBearFvg.originExtreme
    );
    const choch1hDown =
      last1h.close < last1h.open &&
      last1h.close < prev1h.low &&
      last1h.open - last1h.close >= atr1h * 0.45;

    if ((touched4hSupplyBand || touchedBearFvg) && choch1hDown) {
      const rawInv = Math.max(max3High, ema50_4h);
      const anchorKey = String(Math.floor(last1h.time / (12 * 3600)));
      const zoneDesc = touchedBearFvg && latestBearFvg
        ? `FVG d’Oferta 4H fresc (${roundCryptoPrice(latestBearFvg.bottom)}$–${roundCryptoPrice(latestBearFvg.top)}$)`
        : `banda de resistència dinàmica EMA21/50 4H (${roundCryptoPrice(ema21_4h)}$–${roundCryptoPrice(ema50_4h)}$)`;

      const candidate = tryBuildValidatedSetup({
        archetype: 'BOS_FVG_PULLBACK',
        side: 'SHORT',
        rawInvalidation: rawInv,
        anchorPrice: ema21_4h,
        anchorKey,
        volRatio: last1h.volume / Math.max(1e-6, avgVol1h),
        preferredTarget: Math.min(
          dealingRangeLow,
          last1h.close - Math.abs(rawInv - last1h.close) * 2.4
        ),
        bullets: [
          `Estructura 4H baixista amb rebot correctiu a zona Premium (${pricePositionPct}% del rang).`,
          `Rebuig institucional a la ${zoneDesc}.`,
          `Gatell CHoCH baixista d’1H perdent el mínim previ (${roundCryptoPrice(prev1h.low)}$) amb desplaçament.`,
        ],
      });

      if (candidate) {
        detectedSetup = candidate;
        annotations1h.push({
          id: `${spec.symbol}_pb_bear_1h`,
          kind: 'SUPPLY_ZONE',
          priceTop: roundCryptoPrice(Math.max(max3High, ema50_4h)),
          priceBottom: roundCryptoPrice(Math.min(ema21_4h, max3High - atr1h * 0.4)),
          startIndex: Math.max(0, closed1h.length - 30),
          endIndex: closed1h.length - 1,
          label: 'Zona Oferta/FVG 4H + CHoCH 1H',
          tone: 'bear',
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // LAYER 3B: PRE-ALERT DETECTION (Approaching / Inside 4H Zone, awaiting 1H)
  // --------------------------------------------------------------------------
  let preAlert: PreAlertWatch | null = null;
  if (!detectedSetup) {
    if (
      canGoLong &&
      latestBullFvg &&
      currentPrice >= latestBullFvg.originExtreme &&
      currentPrice <= latestBullFvg.top + atr4h * 0.5 &&
      pricePositionPct <= 55
    ) {
      const distPct =
        currentPrice <= latestBullFvg.top
          ? 0
          : Math.round(((currentPrice - latestBullFvg.top) / currentPrice) * 1000) /
            10;
      preAlert = {
        watchId: `${spec.symbol}_PRE_LONG_FVG_${latestBullFvg.time}`,
        bias: 'LONG',
        zoneKind: 'FRESH_DEMAND_FVG',
        headlineCa:
          distPct === 0
            ? `${spec.shortName} dins del FVG de Demanda 4H`
            : `${spec.shortName} a ${distPct}% del FVG de Demanda 4H`,
        targetZoneLow: roundCryptoPrice(latestBullFvg.bottom),
        targetZoneHigh: roundCryptoPrice(latestBullFvg.top),
        distancePct: distPct,
        triggerInstructionCa: `No entris a cegues: espera tancament d’espelma 1H alcista superant el màxim previ (CHoCH) amb SL sota ${roundCryptoPrice(latestBullFvg.originExtreme)}$.`,
      };
    } else if (
      canGoLong &&
      currentPrice <= ema21_4h * 1.008 &&
      currentPrice >= ema50_4h * 0.985 &&
      pricePositionPct >= 18 &&
      pricePositionPct <= 52
    ) {
      preAlert = {
        watchId: `${spec.symbol}_PRE_LONG_VAL_${Math.floor(last1h.time / (12 * 3600))}`,
        bias: 'LONG',
        zoneKind: 'SSL_SWEEP_WATCH',
        headlineCa: `${spec.shortName} testejant Zona de Valor 4H en Descompte (${pricePositionPct}%)`,
        targetZoneLow: roundCryptoPrice(Math.min(ema21_4h, ema50_4h)),
        targetZoneHigh: roundCryptoPrice(Math.max(ema21_4h, ema50_4h)),
        distancePct: 0,
        triggerInstructionCa: `Preu dins la banda EMA21/50 4H amb BTC alcista: espera vela 1H verda d’intenció superant el màxim de l’hora prèvia.`,
      };
    } else if (
      !canGoLong &&
      canGoShort &&
      latestBearFvg &&
      currentPrice <= latestBearFvg.originExtreme &&
      currentPrice >= latestBearFvg.bottom - atr4h * 0.5 &&
      pricePositionPct >= 45
    ) {
      const distPct =
        currentPrice >= latestBearFvg.bottom
          ? 0
          : Math.round(
              ((latestBearFvg.bottom - currentPrice) / currentPrice) * 1000
            ) / 10;
      preAlert = {
        watchId: `${spec.symbol}_PRE_SHORT_FVG_${latestBearFvg.time}`,
        bias: 'SHORT',
        zoneKind: 'FRESH_SUPPLY_FVG',
        headlineCa:
          distPct === 0
            ? `${spec.shortName} provant FVG d’Oferta 4H`
            : `${spec.shortName} a ${distPct}% del FVG d’Oferta 4H`,
        targetZoneLow: roundCryptoPrice(latestBearFvg.bottom),
        targetZoneHigh: roundCryptoPrice(latestBearFvg.top),
        distancePct: distPct,
        triggerInstructionCa: `Espera rebuig i espelma CHoCH baixista tancada en 1H sota el mínim previ amb SL sobre ${roundCryptoPrice(latestBearFvg.originExtreme)}$.`,
      };
    } else if (
      !canGoLong &&
      canGoShort &&
      currentPrice >= ema21_4h * 0.992 &&
      currentPrice <= ema50_4h * 1.015 &&
      pricePositionPct >= 48 &&
      pricePositionPct <= 82
    ) {
      preAlert = {
        watchId: `${spec.symbol}_PRE_SHORT_VAL_${Math.floor(last1h.time / (12 * 3600))}`,
        bias: 'SHORT',
        zoneKind: 'BSL_SWEEP_WATCH',
        headlineCa: `${spec.shortName} en Zona d’Oferta Dinàmica 4H (${pricePositionPct}% Premium)`,
        targetZoneLow: roundCryptoPrice(Math.min(ema21_4h, ema50_4h)),
        targetZoneHigh: roundCryptoPrice(Math.max(ema21_4h, ema50_4h)),
        distancePct: 0,
        triggerInstructionCa: `Rebot correctiu en marea baixista: espera espelma 1H vermella trencant el mínim de la vela prèvia per confirmar el gir.`,
      };
    }
  }

  let neutralReasonCa = `Preu al ${pricePositionPct}% del rang 4H (${roundCryptoPrice(dealingRangeLow)}$ – ${roundCryptoPrice(dealingRangeHigh)}$). Sense confluència activa de zona 4H + gatell 1H amb R:R >= 2.0R; paciència fins als nivells clau.`;
  if (!canGoLong && pricePositionPct < 42) {
    neutralReasonCa = `Preu en zona baixa (${pricePositionPct}%), però sota l’EMA50 4H (${roundCryptoPrice(ema50_4h)}$): prohibit comprar ganivets en caiguda; s’espera rebot a zona Premium per buscar Shorts o recuperació d’estructura.`;
  } else if (!canGoShort && pricePositionPct > 58) {
    neutralReasonCa = `Preu en part alta (${pricePositionPct}%), però amb marea 4H alcista sobre EMA50 (${roundCryptoPrice(ema50_4h)}$): prohibit posar-se Short contra tendència; s’espera retrocés a Descompte.`;
  }

  const orderOverlay: OrderSetup | null = detectedSetup
    ? {
        side: detectedSetup.side,
        entry: detectedSetup.entry,
        stopLoss: detectedSetup.stopLoss,
        takeProfit: detectedSetup.tp2,
        isLimitOrder: detectedSetup.executionType === 'LIMIT_PULLBACK',
      }
    : null;

  return {
    spec,
    asOfTimeSec: last1h.time + 3600,
    currentPrice: roundCryptoPrice(currentPrice),
    atr1h,
    atr4h,
    fundingRate8h,
    structure4h,
    dealingRangeLow: roundCryptoPrice(dealingRangeLow),
    dealingRangeHigh: roundCryptoPrice(dealingRangeHigh),
    equilibrium50,
    pricePositionPct,
    nearestSsl4h: nearestSslBelow ? roundCryptoPrice(nearestSslBelow) : null,
    nearestBsl4h: nearestBslAbove ? roundCryptoPrice(nearestBslAbove) : null,
    status: detectedSetup ? 'SETUP_ACTIVE' : preAlert ? 'PRE_ALERT' : 'NEUTRAL',
    setup: detectedSetup,
    preAlert,
    neutralReasonCa,
    annotations1h,
    annotations4h,
    orderOverlay,
  };
}

// ============================================================================
// REAL HISTORICAL WALK-FORWARD BACKTESTER (SL-FIRST + 0.10% FEES + PARTIAL/BE)
// ============================================================================

export interface HistoricalAssetCandles {
  spec: AssetSpec;
  candles1d: Candle[];
  candles4h: Candle[];
  candles1h: Candle[];
}

export function runHistoricalSwingBacktest(
  datasets: HistoricalAssetCandles[]
): SwingBacktestReport {
  const btcData = datasets.find((d) => d.spec.symbol === 'BTCUSDT');
  if (!btcData) {
    throw new Error('BTCUSDT dataset is required as Market Leader for backtesting.');
  }

  const FEE_R_APPROX = 0.04; // ~0.10% round-trip notional fee on ~2.5%–4% SL
  const MAX_CONCURRENT_SAME_SIDE = 2; // Module 6 Portfolio Correlation Heat Cap

  const candidateTrades: Array<BacktestTradeRecord & { qualityScore: number }> = [];
  let totalSignalsGenerated = 0;
  let limitUnfilledExpired = 0;

  for (const ds of datasets) {
    const c1h = ds.candles1h;
    const startIdx = Math.min(500, Math.floor(c1h.length * 0.25));
    let cooldownUntilIdx = startIdx;
    const seenSetupIds = new Set<string>();

    for (let i = startIdx; i < c1h.length - 96; i++) {
      if (i < cooldownUntilIdx) continue;

      const decisionEndSec = c1h[i].time + 3600;
      const closed1hSlice = c1h.slice(Math.max(0, i - 120), i + 1);
      const closed4hSlice = filterClosedCandles(
        ds.candles4h,
        4 * 3600,
        decisionEndSec
      ).slice(-120);
      const closed1dSlice = filterClosedCandles(
        ds.candles1d,
        24 * 3600,
        decisionEndSec
      ).slice(-80);

      if (closed4hSlice.length < 60 || closed1dSlice.length < 30) continue;

      const btc4hSlice = filterClosedCandles(
        btcData.candles4h,
        4 * 3600,
        decisionEndSec
      ).slice(-120);
      const btc1dSlice = filterClosedCandles(
        btcData.candles1d,
        24 * 3600,
        decisionEndSec
      ).slice(-80);

      const leaderCtx = evaluateMarketLeaderRegime(btc1dSlice, btc4hSlice);
      const scan = analyzeAssetSwingSetup({
        spec: ds.spec,
        closed1d: closed1dSlice,
        closed4h: closed4hSlice,
        closed1h: closed1hSlice,
        leaderContext: leaderCtx,
      });

      if (!scan.setup) continue;
      if (seenSetupIds.has(scan.setup.setupId)) continue;
      seenSetupIds.add(scan.setup.setupId);

      totalSignalsGenerated++;
      const s = scan.setup;

      let fillIdx = -1;
      if (s.executionType === 'MARKET') {
        fillIdx = i + 1;
      } else {
        const expireAt = Math.min(c1h.length - 2, i + (s.limitValidHours ?? 6));
        for (let f = i + 1; f <= expireAt; f++) {
          const bar = c1h[f];
          if (
            (s.side === 'LONG' && bar.high >= s.tp1) ||
            (s.side === 'SHORT' && bar.low <= s.tp1)
          ) {
            break;
          }
          const touchedLimit =
            s.side === 'LONG' ? bar.low <= s.entry : bar.high >= s.entry;
          if (touchedLimit) {
            fillIdx = f;
            break;
          }
        }
        if (fillIdx === -1) {
          limitUnfilledExpired++;
          cooldownUntilIdx = i + 6;
          continue;
        }
      }

      // Simulate active Swing trade up to 120 hours (5 days max hold)
      let hitTp1 = false;
      let activeSl = s.stopLoss;
      let exitIdx = Math.min(c1h.length - 1, fillIdx + 120);
      let outcome: BacktestTradeRecord['outcome'] = 'TIME_EXIT';
      let realizedR = 0;

      for (let k = fillIdx; k <= exitIdx; k++) {
        const bar = c1h[k];
        // Conservative SL-First rule on every 1H bar!
        const slHit =
          s.side === 'LONG' ? bar.low <= activeSl : bar.high >= activeSl;
        if (slHit) {
          exitIdx = k;
          if (hitTp1) {
            outcome = 'TP1_THEN_BE';
            realizedR =
              Math.round((0.5 * s.tp1RR - FEE_R_APPROX) * 100) / 100;
          } else {
            outcome = 'SL_HIT';
            realizedR = Math.round((-1 - FEE_R_APPROX) * 100) / 100;
          }
          break;
        }

        if (!hitTp1) {
          const tp1Reached =
            s.side === 'LONG' ? bar.high >= s.tp1 : bar.low <= s.tp1;
          if (tp1Reached) {
            hitTp1 = true;
            activeSl = s.entry; // Move remaining 50% to Break-Even
          }
        }

        const tp2Reached =
          s.side === 'LONG' ? bar.high >= s.tp2 : bar.low <= s.tp2;
        if (tp2Reached) {
          exitIdx = k;
          outcome = 'TP2_FULL';
          realizedR =
            Math.round((0.5 * s.tp1RR + 0.5 * s.grossRR - FEE_R_APPROX) * 100) /
            100;
          break;
        }
      }

      if (outcome === 'TIME_EXIT') {
        const lastBar = c1h[exitIdx];
        const riskDist = Math.abs(s.entry - s.stopLoss);
        const dir = s.side === 'LONG' ? 1 : -1;
        const floatR = ((lastBar.close - s.entry) * dir) / riskDist;
        realizedR = hitTp1
          ? Math.round((0.5 * s.tp1RR + 0.5 * floatR - FEE_R_APPROX) * 100) /
            100
          : Math.round((floatR - FEE_R_APPROX) * 100) / 100;
      }

      candidateTrades.push({
        symbol: ds.spec.symbol,
        archetype: s.archetype,
        side: s.side,
        executionType: s.executionType,
        venue: s.venue,
        signalTime: c1h[i].time,
        entryTime: c1h[fillIdx].time,
        exitTime: c1h[exitIdx].time,
        entry: s.entry,
        stopLoss: s.stopLoss,
        tp1: s.tp1,
        tp2: s.tp2,
        outcome,
        realizedR,
        qualityScore: s.qualityScore,
      });

      cooldownUntilIdx = Math.max(i + 6, exitIdx + 2);
    }
  }

  // Enforce Module 6 Portfolio Correlation Heat Cap chronologically
  candidateTrades.sort(
    (a, b) => a.entryTime - b.entryTime || b.qualityScore - a.qualityScore
  );

  const allTrades: BacktestTradeRecord[] = [];
  for (const cand of candidateTrades) {
    const activeSameSide = allTrades.filter(
      (open) =>
        open.side === cand.side &&
        open.entryTime <= cand.entryTime &&
        open.exitTime > cand.entryTime
    );
    if (activeSameSide.length >= MAX_CONCURRENT_SAME_SIDE) {
      continue;
    }
    const { qualityScore: _q, ...record } = cand;
    allTrades.push(record);
  }

  allTrades.sort((a, b) => a.exitTime - b.exitTime);

  let cumR = 0;
  let peakR = 0;
  let maxDdR = 0;
  const equityCurveR: { time: number; cumR: number }[] = [];

  for (const t of allTrades) {
    cumR = Math.round((cumR + t.realizedR) * 100) / 100;
    peakR = Math.max(peakR, cumR);
    maxDdR = Math.max(maxDdR, Math.round((peakR - cumR) * 100) / 100);
    equityCurveR.push({ time: t.exitTime, cumR });
  }

  const wins = allTrades.filter((t) => t.realizedR > 0);
  const losses = allTrades.filter((t) => t.realizedR <= 0);
  const grossWinR = wins.reduce((s, t) => s + t.realizedR, 0);
  const grossLossR = Math.abs(losses.reduce((s, t) => s + t.realizedR, 0));
  const tp1Hits = allTrades.filter(
    (t) => t.outcome === 'TP2_FULL' || t.outcome === 'TP1_THEN_BE'
  ).length;

  const byAsset: AssetBacktestStats[] = SWING_UNIVERSE.map((spec) => {
    const sub = allTrades.filter((t) => t.symbol === spec.symbol);
    const w = sub.filter((t) => t.realizedR > 0);
    const l = sub.filter((t) => t.realizedR <= 0);
    const gw = w.reduce((s, t) => s + t.realizedR, 0);
    const gl = Math.abs(l.reduce((s, t) => s + t.realizedR, 0));
    let c = 0;
    let pk = 0;
    let dd = 0;
    for (const tr of sub) {
      c += tr.realizedR;
      pk = Math.max(pk, c);
      dd = Math.max(dd, pk - c);
    }
    const net = Math.round(c * 100) / 100;
    return {
      symbol: spec.symbol,
      trades: sub.length,
      wins: w.length,
      losses: l.length,
      winRatePct: sub.length ? Math.round((w.length / sub.length) * 1000) / 10 : 0,
      expectancyR: sub.length ? Math.round((net / sub.length) * 100) / 100 : 0,
      profitFactor: gl > 0 ? Math.round((gw / gl) * 100) / 100 : gw > 0 ? 9.99 : 0,
      netTotalR: net,
      maxDrawdownR: Math.round(dd * 100) / 100,
    };
  });

  const firstTs = btcData.candles1h[0]?.time ?? 0;
  const lastTs = btcData.candles1h[btcData.candles1h.length - 1]?.time ?? 0;
  const daysCovered = Math.max(1, Math.round((lastTs - firstTs) / 86400));

  return {
    generatedAt: new Date().toISOString(),
    periodStartIso: new Date(firstTs * 1000).toISOString().slice(0, 10),
    periodEndIso: new Date(lastTs * 1000).toISOString().slice(0, 10),
    daysCovered,
    assumptionsCa: [
      'Zero Look-Ahead: les espelmes 4H i 1D només es llegeixen un cop tancades completament.',
      'Regla conservadora SL-First: si una mateixa vela d’1H toca SL i TP alhora, es computa Stop Loss.',
      'Fricció inclosa (~0,10% comissió round-trip) i gestió sistemàtica: 50% cobrat a TP1 (+1.5R) + SL mogut a Break-Even, i 50% deixat córrer fins a TP2.',
      'Sostre de correlació de cartera (Mòdul 6): màxim 2 operacions simultànies en la mateixa direcció entre BTC, ETH, SOL i AVAX.',
    ],
    totalSignalsGenerated,
    limitUnfilledExpired,
    totalFilledTrades: allTrades.length,
    winRatePct: allTrades.length
      ? Math.round((wins.length / allTrades.length) * 1000) / 10
      : 0,
    tp1HitRatePct: allTrades.length
      ? Math.round((tp1Hits / allTrades.length) * 1000) / 10
      : 0,
    avgWinR: wins.length
      ? Math.round((grossWinR / wins.length) * 100) / 100
      : 0,
    avgLossR: losses.length
      ? Math.round((-grossLossR / losses.length) * 100) / 100
      : 0,
    expectancyR: allTrades.length
      ? Math.round((cumR / allTrades.length) * 100) / 100
      : 0,
    profitFactor:
      grossLossR > 0 ? Math.round((grossWinR / grossLossR) * 100) / 100 : 0,
    netTotalR: cumR,
    maxDrawdownR: maxDdR,
    equityCurveR,
    byAsset,
    recentTrades: allTrades.slice(-18).reverse(),
  };
}
