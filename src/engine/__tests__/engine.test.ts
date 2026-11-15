import { describe, expect, it } from 'vitest';
import {
  advanceManagedTrade,
  calculateOrderMetrics,
  simulateOrderExecution,
} from '../tradeSimulator';
import {
  computeReadinessProfile,
  evaluateExecutionAttempt,
  evaluateManagementAttempt,
  evaluateRadarAttempt,
} from '../scoringEngine';
import { prepareScenarioForPlay } from '../anonymizer';
import {
  CAMPAIGN_SCENARIOS,
  REAL_MARKET_PACKS,
  generateGymDrillScenario,
} from '../../data/curatedScenarios';
import { CAMPAIGN_WORLDS, MICRO_LESSONS } from '../../data/lessons';
import {
  buildScalingLadder,
  calculateCryptoSwingSizing,
  calculateMnqPositionSizing,
  simulateCompoundingComparison,
} from '../riskMasterEngine';
import { Candle, OrderSetup } from '../types';

describe('Trade Simulator Engine', () => {
  const baseCandles: Candle[] = [
    { time: 100, open: 100, high: 102, low: 99, close: 101, volume: 1000 },
    { time: 200, open: 101, high: 105, low: 100.5, close: 104, volume: 1500 },
    { time: 300, open: 104, high: 108, low: 103, close: 107, volume: 1800 },
  ];

  it('calculates accurate LONG R:R and applies higher scalp friction on tight stops', () => {
    const healthyOrder: OrderSetup = {
      side: 'LONG',
      entry: 100,
      stopLoss: 98,
      takeProfit: 106,
    };
    const mNormal = calculateOrderMetrics(healthyOrder, 2.0, false);
    expect(mNormal.valid).toBe(true);
    expect(mNormal.grossRR).toBe(3);

    const microStopOrder: OrderSetup = {
      side: 'LONG',
      entry: 100,
      stopLoss: 99.6, // 0.2 ATR!
      takeProfit: 101.2,
    };
    const mScalpTight = calculateOrderMetrics(microStopOrder, 2.0, true);
    expect(mScalpTight.frictionR).toBeGreaterThan(0.35);
    expect(mScalpTight.warning).toBeDefined();
  });

  it('enforces conservative SL-First rule when an ambiguous candle touches both SL and TP', () => {
    const volatileFuture: Candle[] = [
      { time: 400, open: 100, high: 107, low: 97, close: 105, volume: 4000 },
    ];
    const order: OrderSetup = {
      side: 'LONG',
      entry: 100,
      stopLoss: 98,
      takeProfit: 106,
    };
    const res = simulateOrderExecution(order, 100, volatileFuture, 2.0, false);
    expect(res.outcome).toBe('SL_HIT');
    expect(res.ambiguousCandleSlFirstApplied).toBe(true);
    expect(res.netR).toBeLessThan(0);
  });

  it('resolves clean TP_HIT and manages partial + break-even accurately', () => {
    const order: OrderSetup = {
      side: 'LONG',
      entry: 100,
      stopLoss: 98,
      takeProfit: 106,
    };
    const res = simulateOrderExecution(order, 100, baseCandles, 2.0, false);
    expect(res.outcome).toBe('TP_HIT');
    expect(res.netR).toBeCloseTo(2.98, 1);

    // Step 1: advance 2 candles (reaches 104 = +2R)
    const step1 = advanceManagedTrade(
      order,
      {
        activeStopLoss: 98,
        remainingSize: 1.0,
        realizedR: 0,
        closed: false,
        exitFutureIndex: 0,
      },
      baseCandles.slice(0, 2),
      0,
      2.0
    );
    expect(step1.closed).toBe(false);

    // Step 2: take PARTIAL_50 at 104 (+2R -> +1R banked) and let remaining 0.5 hit TP at 106 (+3R -> +1.5R)
    const step2 = advanceManagedTrade(
      order,
      step1,
      baseCandles.slice(2),
      2,
      2.0,
      'PARTIAL_50',
      104,
      false
    );
    expect(step2.closed).toBe(true);
    expect(step2.closeReason).toBe('TP_HIT');
    expect(step2.realizedR).toBeGreaterThan(2.4);
  });
});

describe('Scoring Engine & Readiness Passport', () => {
  it('rewards 3 stars for choosing NO OPERAR (Skip) on a trap scenario', () => {
    const trapScenario = CAMPAIGN_SCENARIOS.find(
      (s) => s.executionBlueprint?.optimalSide === 'SKIP'
    )!;
    expect(trapScenario).toBeDefined();
    const evalSkip = evaluateExecutionAttempt(trapScenario, { choseSkip: true });
    expect(evalSkip.passed).toBe(true);
    expect(evalSkip.stars).toBe(3);
    expect(evalSkip.totalScore).toBeGreaterThanOrEqual(95);

    // Forcing a trade on a trap must fail with 0 stars
    const lastClose =
      trapScenario.visibleCandles[trapScenario.visibleCandles.length - 1].close;
    const evalForced = evaluateExecutionAttempt(trapScenario, {
      choseSkip: false,
      order: {
        side: 'LONG',
        entry: lastClose,
        stopLoss: lastClose - trapScenario.atr,
        takeProfit: lastClose + trapScenario.atr * 2.5,
      },
    });
    expect(evalForced.passed).toBe(false);
    expect(evalForced.stars).toBe(0);
  });

  it('computes Readiness Profile expectancy and verdict accurately', () => {
    const profile = computeReadinessProfile(
      Array.from({ length: 10 }, (_, idx) => ({
        id: `h_${idx}`,
        timestamp: Date.now() + idx,
        scenarioId: 'w4_s2',
        mode: 'EXECUTION',
        style: 'SCALP',
        choseSkip: idx === 2,
        wasSkipOptimal: idx === 2,
        totalScore: 88,
        stars: 3,
        netR: idx === 2 ? 0 : idx % 3 === 0 ? -1 : 2.4,
        breakdown: {
          structureScore: 92,
          riskPlacementScore: 90,
          executionScore: 88,
          disciplineScore: 95,
        },
      })),
      'SCALP'
    );
    expect(profile.expectancyR).toBeGreaterThan(0.8);
    expect(profile.overallScore).toBeGreaterThanOrEqual(82);
    expect(profile.verdictLabel).toContain('APTE PER A DIRECTE');
  });
});

describe('Campaign 36 Stages & 34 MNQ + Crypto Real Packs Integrity', () => {
  it('has 6 complete worlds, 6 masterclass lessons, 36 stages, and 34 real historical MNQ/Crypto packs', () => {
    expect(CAMPAIGN_WORLDS).toHaveLength(6);
    expect(MICRO_LESSONS).toHaveLength(6);
    for (const lesson of MICRO_LESSONS) {
      expect(lesson.deepDiveSections?.length).toBeGreaterThanOrEqual(2);
    }
    expect(CAMPAIGN_SCENARIOS).toHaveLength(36);
    expect(REAL_MARKET_PACKS.length).toBeGreaterThanOrEqual(34);

    const mnqPacks = REAL_MARKET_PACKS.filter((p) =>
      p.realAsset.includes('MNQ')
    );
    const cryptoPacks = REAL_MARKET_PACKS.filter(
      (p) => !p.realAsset.includes('MNQ')
    );
    expect(mnqPacks.length).toBeGreaterThanOrEqual(12);
    expect(cryptoPacks.length).toBeGreaterThanOrEqual(20);
  });

  it('validates OHLCV candle geometry and optimal solution solvability across all 36 campaign stages', () => {
    for (const rawScen of CAMPAIGN_SCENARIOS) {
      const scen = prepareScenarioForPlay(rawScen, { seed: rawScen.stageNumber });
      expect(scen.visibleCandles.length).toBeGreaterThanOrEqual(40);
      expect(scen.futureCandles.length).toBeGreaterThanOrEqual(12);
      expect(scen.atr).toBeGreaterThan(0);

      for (const c of [...scen.visibleCandles, ...scen.futureCandles]) {
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
        expect(c.low).toBeGreaterThan(0);
      }

      if (scen.mode === 'RADAR') {
        expect(scen.radarConfig).toBeDefined();
        const correctChoice = scen.radarConfig!.choices.find((c) => c.isCorrect);
        expect(correctChoice).toBeDefined();
        const res = evaluateRadarAttempt(scen, {
          selectedChoiceId: correctChoice!.id,
          // Even if user accidentally tapped far away while panning, explicit choice wins
          tappedPrice: scen.visibleCandles[0].low * 0.5,
          elapsedSec: 5,
        });
        expect(res.passed).toBe(true);
        expect(res.stars).toBe(3);
      }

      if (scen.mode === 'EXECUTION') {
        const bp = scen.executionBlueprint!;
        expect(bp).toBeDefined();
        if (bp.optimalSide === 'SKIP') {
          const res = evaluateExecutionAttempt(scen, { choseSkip: true });
          expect(res.passed).toBe(true);
          expect(res.stars).toBe(3);
        } else {
          const entry = scen.visibleCandles[scen.visibleCandles.length - 1].close;
          const optimalOrder: OrderSetup = {
            side: bp.optimalSide,
            entry,
            stopLoss: bp.invalidationPrice,
            takeProfit: bp.logicalTargetPrice,
          };
          const res = evaluateExecutionAttempt(scen, {
            choseSkip: false,
            order: optimalOrder,
            elapsedSec: 8,
          });
          if (!res.passed) {
            throw new Error(
              `Stage ${scen.id} (${scen.title}) optimal order failed! Score=${res.totalScore}, netR=${res.netR}, outcome=${res.simulation?.outcome}, entry=${entry}, sl=${bp.invalidationPrice}, tp=${bp.logicalTargetPrice}`
            );
          }
          expect(res.passed).toBe(true);
          expect(res.stars).toBeGreaterThanOrEqual(2);
        }
      }

      if (scen.mode === 'MANAGEMENT') {
        const cfg = scen.managementConfig!;
        expect(cfg).toBeDefined();
        expect(cfg.checkpoints.length).toBeGreaterThanOrEqual(2);

        const cp1 = cfg.checkpoints[0];
        const cp2 = cfg.checkpoints[1];

        // Segment 0 -> Checkpoint 1
        const s1 = advanceManagedTrade(
          cfg.initialOrder,
          {
            activeStopLoss: cfg.initialOrder.stopLoss,
            remainingSize: 1.0,
            realizedR: 0,
            closed: false,
            exitFutureIndex: 0,
          },
          scen.futureCandles.slice(0, cp1.futureCandleCount),
          0,
          scen.atr,
          undefined,
          undefined,
          cfg.applyScalpFriction
        );
        if (s1.closed) {
          throw new Error(
            `Stage ${scen.id} closed prematurely BEFORE Checkpoint 1 (${s1.closeReason})!`
          );
        }
        expect(s1.closed).toBe(false);

        // Segment Checkpoint 1 -> Checkpoint 2 with optimal action
        const act1 = cp1.optimalActions[0];
        const mark1 = scen.futureCandles[cp1.futureCandleCount - 1].close;
        const s2 = advanceManagedTrade(
          cfg.initialOrder,
          s1,
          scen.futureCandles.slice(cp1.futureCandleCount, cp2.futureCandleCount),
          cp1.futureCandleCount,
          scen.atr,
          act1,
          mark1,
          cfg.applyScalpFriction
        );
        if (s2.closed) {
          throw new Error(
            `Stage ${scen.id} closed prematurely BEFORE Checkpoint 2 (${s2.closeReason})!`
          );
        }
        expect(s2.closed).toBe(false);

        // Final Segment Checkpoint 2 -> End with optimal action
        const act2 = cp2.optimalActions[0];
        const mark2 = scen.futureCandles[cp2.futureCandleCount - 1].close;
        const s3 = advanceManagedTrade(
          cfg.initialOrder,
          s2,
          scen.futureCandles.slice(cp2.futureCandleCount),
          cp2.futureCandleCount,
          scen.atr,
          act2,
          mark2,
          cfg.applyScalpFriction
        );

        let finalR = s3.realizedR;
        if (!s3.closed && s3.remainingSize > 0) {
          const lastC = scen.futureCandles[scen.futureCandles.length - 1];
          const risk = Math.abs(
            cfg.initialOrder.entry - cfg.initialOrder.stopLoss
          );
          const dir = cfg.initialOrder.side === 'LONG' ? 1 : -1;
          const floatR = ((lastC.close - cfg.initialOrder.entry) * dir) / risk;
          finalR = Math.round((finalR + s3.remainingSize * floatR) * 100) / 100;
        }

        const evalMgmt = evaluateManagementAttempt(
          scen,
          [
            { checkpointId: cp1.id, action: act1 },
            { checkpointId: cp2.id, action: act2 },
          ],
          finalR
        );
        if (!evalMgmt.passed || evalMgmt.stars < 3) {
          throw new Error(
            `Stage ${scen.id} management optimal path failed 3 stars! Score=${evalMgmt.totalScore}, stars=${evalMgmt.stars}, finalR=${finalR}`
          );
        }
        expect(evalMgmt.passed).toBe(true);
        expect(evalMgmt.stars).toBe(3);
      }

      if (scen.mode === 'REPLAY_EXAM') {
        const rcfg = scen.replayExamConfig!;
        expect(rcfg).toBeDefined();
        expect(rcfg.briefing.length).toBeGreaterThan(20);
        expect(scen.futureCandles.length).toBeGreaterThanOrEqual(30);
        const hi = Math.max(...scen.futureCandles.map((c) => c.high));
        const lo = Math.min(...scen.futureCandles.map((c) => c.low));
        expect(hi - lo).toBeGreaterThanOrEqual(scen.atr * 5);
      }
    }

    // Also test MNQ Scalp & Crypto Swing Gym Drill Generators
    const mnqDrill = generateGymDrillScenario({
      styleFilter: 'SCALP',
      modeFilter: 'EXECUTION',
      counter: 3,
    });
    expect(mnqDrill.visibleCandles.length).toBeGreaterThan(50);
    expect(mnqDrill.revealMeta?.realAsset).toContain('MNQ');

    const cryptoDrill = generateGymDrillScenario({
      styleFilter: 'SWING',
      modeFilter: 'EXECUTION',
      counter: 2,
    });
    expect(cryptoDrill.visibleCandles.length).toBeGreaterThan(50);
  });
});

describe('Risk Master & Scaling Engine (MNQ + Crypto)', () => {
  it('calculates exact MNQ contracts on Prop Firm buffer including $1.30 round-trip fees', () => {
    const res = calculateMnqPositionSizing({
      accountMode: 'PROP_FIRM',
      nominalCapitalUsd: 50000,
      propDrawdownBufferUsd: 2500,
      riskPct: 5.0, // $125 max risk
      stopLossPoints: 20, // $40 + $1.30 = $41.30 per MNQ
      targetRR: 2.5,
    });
    expect(res.maxAllowedRiskUsd).toBe(125);
    expect(res.costPerContractAtSlUsd).toBeCloseTo(41.3, 2);
    expect(res.recommendedContracts).toBe(3); // 3 * 41.30 = $123.90 <= $125
    expect(res.actualDollarRiskUsd).toBeCloseTo(123.9, 2);
    expect(res.statusLevel).toBe('OPTIMAL');
  });

  it('calculates exact Crypto Swing notional USDT accounting for notional fees and safe isolated leverage', () => {
    const res = calculateCryptoSwingSizing({
      capitalUsdt: 10000,
      riskPct: 1.5, // 150 USDT max loss
      entryPrice: 100,
      stopLossPrice: 95, // -5% SL + 0.10% fee = 5.10% loss per notional USDT
      takeProfitPrice: 115, // +15% TP
    });
    expect(res.valid).toBe(true);
    expect(res.side).toBe('LONG');
    expect(res.maxRiskUsdt).toBe(150);
    // 2941.18 * (0.05 + 0.001) = 150 USDT exact!
    expect(res.positionSizeUsdt).toBeCloseTo(2941.18, 1);
    expect(res.netRR).toBeGreaterThan(2.8);
    expect(res.maxSafeIsolatedLeverage).toBeLessThanOrEqual(15);
    expect(res.portfolioHeatWarning).toBeDefined();
  });

  it('builds 5-tier scaling ladder and protects drawdown via Step-Down Rule', () => {
    const ladder = buildScalingLadder(5000);
    expect(ladder).toHaveLength(5);
    expect(ladder[0].equityMilestone).toBe(5000);
    expect(ladder[4].equityMilestone).toBe(12500);

    const sim = simulateCompoundingComparison({
      initialCapital: 5000,
      winRatePct: 48,
      avgWinRR: 2.4,
      baseRiskPct: 1.25,
      totalTrades: 80,
      seed: 42,
    });
    expect(sim.stepDownProtectedCurve).toHaveLength(81);
    expect(sim.maxDdProtectedPct).toBeLessThan(sim.maxDdOverleveragedPct);
  });
});
