import {
  Candle,
  RealMarketPack,
  Scenario,
  TacticalAnnotation,
  Timeframe,
} from '../engine/types';
import {
  aggregateCandlesNoLookahead,
  timeframeToSeconds,
} from '../engine/anonymizer';
import { computeATR, simulateOrderExecution } from '../engine/tradeSimulator';

/**
 * Deterministic PRNG (Mulberry32) so every guided scenario is 100% reproducible,
 * realistic, and testable across runs.
 */
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AnchorPoint {
  index: number;
  price: number;
  wickTopBoost?: number;
  wickBottomBoost?: number;
  volumeMultiplier?: number;
}

/**
 * Generates an organic candlestick series passing smoothly through exact structural
 * anchor points (HH, HL, Equal Highs, Liquidity Sweeps, BOS, CHoCH, Targets).
 */
export function buildSyntheticCandlesFromAnchors(params: {
  seed: number;
  totalCandles: number;
  anchors: AnchorPoint[];
  baseVolatility: number;
  timeframe: Timeframe;
}): Candle[] {
  const rng = createRng(params.seed);
  const stepSec = timeframeToSeconds(params.timeframe);
  const baseEpoch = 1704067200;
  const sorted = [...params.anchors].sort((a, b) => a.index - b.index);

  // Interpolate target close path with micro-jitter
  const targetCloses: number[] = new Array(params.totalCandles).fill(100);
  const anchorMap = new Map<number, AnchorPoint>();
  sorted.forEach((a) => anchorMap.set(a.index, a));

  for (let s = 0; s < sorted.length - 1; s++) {
    const p0 = sorted[s];
    const p1 = sorted[s + 1];
    const span = Math.max(1, p1.index - p0.index);
    for (let i = p0.index; i <= p1.index && i < params.totalCandles; i++) {
      const t = (i - p0.index) / span;
      // Smoothstep blend + organic micro-oscillation that vanishes at anchor endpoints
      const smooth = t * t * (3 - 2 * t);
      const wave =
        Math.sin(t * Math.PI) *
        (rng() - 0.5) *
        params.baseVolatility *
        1.1;
      targetCloses[i] = p0.price + (p1.price - p0.price) * smooth + wave;
    }
  }

  // Fill before first or after last anchor if needed
  for (let i = 0; i < sorted[0].index; i++) {
    targetCloses[i] = sorted[0].price;
  }
  const lastAnchor = sorted[sorted.length - 1];
  for (let i = lastAnchor.index + 1; i < params.totalCandles; i++) {
    targetCloses[i] =
      targetCloses[i - 1] + (rng() - 0.5) * params.baseVolatility * 0.6;
  }

  const candles: Candle[] = [];
  let prevClose = targetCloses[0] - (rng() - 0.5) * params.baseVolatility * 0.5;

  for (let i = 0; i < params.totalCandles; i++) {
    const anchor = anchorMap.get(i);
    const open = Math.round(prevClose * 100) / 100;
    const close = Math.round(targetCloses[i] * 100) / 100;
    const bodySize = Math.abs(close - open);

    const upperWick =
      (anchor?.wickTopBoost ?? (0.25 + rng() * 0.75)) * params.baseVolatility;
    const lowerWick =
      (anchor?.wickBottomBoost ?? (0.25 + rng() * 0.75)) * params.baseVolatility;

    const high = Math.round((Math.max(open, close) + upperWick) * 100) / 100;
    const low = Math.round(Math.max(1, Math.min(open, close) - lowerWick) * 100) / 100;

    const displacementFactor = 1 + (bodySize / Math.max(params.baseVolatility, 0.01)) * 0.85;
    const volMult = anchor?.volumeMultiplier ?? (0.75 + rng() * 0.65);
    const volume = Math.round(1200 * displacementFactor * volMult);

    candles.push({
      time: baseEpoch + i * stepSec,
      open,
      high,
      low,
      close,
      volume,
    });
    prevClose = close;
  }

  return candles;
}

/**
 * Analyzes a RealMarketPack (real historical BTC/ETH/SOL/NQ/EURUSD/XAU OHLCV)
 * to extract structural swing levels, optimal invalidation, target liquidity, and X-Ray annotations.
 */
export function buildRealPackScenario(
  pack: RealMarketPack,
  overrides: {
    id: string;
    worldId: number;
    stageNumber: number;
    title: string;
    subtitle: string;
    mode: 'EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM' | 'RADAR';
    timeLimitSec?: number;
    coachingTakeaway: string;
  }
): Scenario {
  const vis = pack.visibleCandles;
  const fut = pack.futureCandles;
  const atr = computeATR(vis, 14);
  const lastCandle = vis[vis.length - 1];
  const entry = lastCandle.close;

  // Measure actual future behavior so optimalSide & levels match reality 100%
  const recentWindow = vis.slice(-28);
  const recentHigh = Math.max(...recentWindow.map((c) => c.high));
  const recentLow = Math.min(...recentWindow.map((c) => c.low));
  const recentHighIdx =
    vis.length -
    28 +
    recentWindow.findIndex((c) => c.high === recentHigh);
  const recentLowIdx =
    vis.length -
    28 +
    recentWindow.findIndex((c) => c.low === recentLow);

  // Test clean LONG vs SHORT viability on the real future series using exact simulator!
  const applyFriction = pack.style === 'SCALP';
  const minRR = pack.style === 'SCALP' ? 1.85 : 2.0;

  // Candidate structural invalidations (swing extreme vs 1.25 ATR)
  const longInvCandidates = [
    Math.min(recentLow, entry - 0.9 * atr) - 0.18 * atr,
    entry - 1.35 * atr,
  ];
  const shortInvCandidates = [
    Math.max(recentHigh, entry + 0.9 * atr) + 0.18 * atr,
    entry + 1.35 * atr,
  ];

  const futMaxHigh = Math.max(...fut.map((c) => c.high));
  const futMinLow = Math.min(...fut.map((c) => c.low));

  let bestSetup: {
    side: 'LONG' | 'SHORT' | 'SKIP';
    invalidation: number;
    target: number;
    netR: number;
  } = {
    side: 'SKIP',
    invalidation: longInvCandidates[0],
    target: entry + 2.0 * atr,
    netR: 0,
  };

  for (const inv of longInvCandidates) {
    const risk = Math.max(entry - inv, 0.5 * atr);
    const maxReachRR = (futMaxHigh - 0.06 * atr - entry) / risk;
    const candidateRR = Math.min(Math.max(minRR + 0.15, maxReachRR * 0.85), 3.2);
    const tp = entry + candidateRR * risk;
    const sim = simulateOrderExecution(
      { side: 'LONG', entry, stopLoss: inv, takeProfit: tp },
      entry,
      fut,
      atr,
      applyFriction
    );
    if (
      (sim.outcome === 'TP_HIT' || (sim.outcome === 'TIMEOUT_OPEN' && sim.netR >= 1.5)) &&
      sim.netR > bestSetup.netR
    ) {
      bestSetup = { side: 'LONG', invalidation: inv, target: tp, netR: sim.netR };
    }
  }

  for (const inv of shortInvCandidates) {
    const risk = Math.max(inv - entry, 0.5 * atr);
    const maxReachRR = (entry - (futMinLow + 0.06 * atr)) / risk;
    const candidateRR = Math.min(Math.max(minRR + 0.15, maxReachRR * 0.85), 3.2);
    const tp = entry - candidateRR * risk;
    const sim = simulateOrderExecution(
      { side: 'SHORT', entry, stopLoss: inv, takeProfit: tp },
      entry,
      fut,
      atr,
      applyFriction
    );
    if (
      (sim.outcome === 'TP_HIT' || (sim.outcome === 'TIMEOUT_OPEN' && sim.netR >= 1.5)) &&
      sim.netR > bestSetup.netR
    ) {
      bestSetup = { side: 'SHORT', invalidation: inv, target: tp, netR: sim.netR };
    }
  }

  const optimalSide = bestSetup.side;
  const invalidationPrice = bestSetup.invalidation;
  const logicalTargetPrice = bestSetup.target;
  const shortInvalidation = shortInvCandidates[0];
  const longInvalidation = longInvCandidates[0];

  const xrayAnnotations: TacticalAnnotation[] = [
    {
      id: `${overrides.id}_high_liq`,
      kind: 'LIQUIDITY_POOL',
      priceTop: recentHigh,
      startIndex: Math.max(0, recentHighIdx),
      endIndex: vis.length + 12,
      label: 'Liquidesa Superior (BSL $$$)',
      tone: 'liquidity',
    },
    {
      id: `${overrides.id}_low_liq`,
      kind: 'LIQUIDITY_POOL',
      priceTop: recentLow,
      startIndex: Math.max(0, recentLowIdx),
      endIndex: vis.length + 12,
      label: 'Liquidesa Inferior (SSL $$$)',
      tone: 'liquidity',
    },
    {
      id: `${overrides.id}_zone`,
      kind: optimalSide === 'SHORT' ? 'SUPPLY_ZONE' : 'DEMAND_ZONE',
      priceTop:
        optimalSide === 'SHORT'
          ? shortInvalidation
          : Math.min(entry, recentLow + 0.45 * atr),
      priceBottom:
        optimalSide === 'SHORT'
          ? Math.max(entry, recentHigh - 0.45 * atr)
          : longInvalidation,
      startIndex: Math.max(0, vis.length - 18),
      endIndex: vis.length + 18,
      label:
        optimalSide === 'SHORT'
          ? 'Zona d’Oferta / Invalidesa'
          : optimalSide === 'LONG'
            ? 'Zona de Demanda / Invalidesa'
            : 'Rang Sense Avantatge Clar (Chop)',
      tone:
        optimalSide === 'SHORT'
          ? 'bear'
          : optimalSide === 'LONG'
            ? 'bull'
            : 'neutral',
    },
  ];

  const baseScenario: Scenario = {
    id: overrides.id,
    worldId: overrides.worldId,
    stageNumber: overrides.stageNumber,
    title: overrides.title,
    subtitle: overrides.subtitle,
    mode: overrides.mode,
    style: pack.style,
    marketCategory: pack.marketCategory,
    timeframe: pack.ltf,
    htfTimeframe: pack.htf,
    visibleCandles: vis,
    futureCandles: fut,
    htfVisibleCandles: pack.htfVisibleCandles,
    atr,
    revealMeta: {
      realAsset: pack.realAsset,
      realDateLabel: pack.realDateLabel,
      isRealHistorical: true,
    },
    xrayAnnotations,
    coachingTakeaway: overrides.coachingTakeaway,
  };

  if (overrides.mode === 'EXECUTION') {
    baseScenario.executionBlueprint = {
      optimalSide,
      invalidationPrice,
      slToleranceAtr: 0.65,
      logicalTargetPrice,
      minAcceptableRR: pack.style === 'SCALP' ? 1.8 : 2.0,
      timeLimitSec: overrides.timeLimitSec,
      applyScalpFriction: pack.style === 'SCALP',
      trapExplanation:
        optimalSide === 'SKIP'
          ? 'En aquest tram real de mercat, el preu fa escombrades bilaterals sense desplaçament net abans d’invalidar tots dos extrems. Saber dir NO OPERAR t’estalvia un -1R innecessari!'
          : undefined,
    };
  } else if (overrides.mode === 'MANAGEMENT') {
    const dir = pack.dominantDirection;
    const mgmtSL =
      dir === 'LONG' ? entry - 1.35 * atr : entry + 1.35 * atr;
    const mgmtTP =
      dir === 'LONG' ? entry + 2.9 * atr : entry - 2.9 * atr;
    baseScenario.managementConfig = {
      initialOrder: {
        side: dir,
        entry,
        stopLoss: mgmtSL,
        takeProfit: mgmtTP,
      },
      contextSummary: `Estàs dins d'un ${dir} obert al tancament d'estructura. Gestiona l'evolució real espelma a espelma sense regalar l'avantatge.`,
      applyScalpFriction: pack.style === 'SCALP',
      checkpoints: [
        {
          id: `${overrides.id}_cp1`,
          futureCandleCount: 10,
          prompt:
            'Primer tram d’evolució completat. El preu respira i testeja la microestructura. Quina és la decisió disciplinada?',
          optimalActions: ['HOLD'],
          acceptableActions: ['PARTIAL_50'],
          coachingNote:
            'Al primer impuls o respiració normal, moure a Break-Even massa ràpid sol treure’t per soroll just abans de l’expansió.',
        },
        {
          id: `${overrides.id}_cp2`,
          futureCandleCount: 24,
          prompt:
            'Segon tram completat: el moviment ja ha mostrat les seves cartes. Com gestiones el risc restant?',
          optimalActions: ['PARTIAL_50', 'MOVE_BE'],
          acceptableActions: ['HOLD'],
          coachingNote:
            'Quan el mercat ja s’ha desplaçat de forma significativa, protegir el risc a Break-Even o assegurar parcials blinda l’esperança matemàtica.',
        },
      ],
    };
  } else if (overrides.mode === 'REPLAY_EXAM') {
    baseScenario.replayExamConfig = {
      maxDrawdownR: pack.style === 'SCALP' ? 3.5 : 4.0,
      targetNetR: 1.8,
      minTrades: 1,
      htfGroupSize: pack.groupSize,
      applyScalpFriction: pack.style === 'SCALP',
      briefing:
        pack.style === 'SCALP'
          ? 'Sessió Scalp Real a Cegues: avança espelma a espelma, vigila el HTF, executa amb R:R >= 1.8 i no superis -3.5R de Drawdown.'
          : 'Sessió Swing Multi-Timeframe Real: consulta el HTF, espera el moment d’asimetria clara i tanca la sessió per sobre de +1.8R.',
    };
  }

  return baseScenario;
}

export function attachSyntheticHtf(
  visibleCandles: Candle[],
  htfTimeframe: Timeframe,
  groupSize: number
): Candle[] {
  return aggregateCandlesNoLookahead(
    visibleCandles,
    groupSize,
    timeframeToSeconds(htfTimeframe)
  );
}
