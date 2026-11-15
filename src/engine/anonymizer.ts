import { Candle, Scenario, TacticalAnnotation } from './types';

function roundPrice(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function timeframeToSeconds(tf: string): number {
  switch (tf) {
    case '1m':
      return 60;
    case '5m':
      return 300;
    case '15m':
      return 900;
    case '1H':
      return 3600;
    case '4H':
      return 14400;
    case '1D':
      return 86400;
    default:
      return 900;
  }
}

/**
 * Aggregates LTF candles into HTF candles strictly up to the last visible candle
 * so there is ZERO look-ahead bias during multi-timeframe analysis or replay.
 */
export function aggregateCandlesNoLookahead(
  candles: Candle[],
  groupSize: number,
  htfStepSeconds: number
): Candle[] {
  if (candles.length === 0 || groupSize <= 1) return candles;
  const result: Candle[] = [];
  const baseEpoch = 1704067200; // Neutral clean epoch (Jan 1, 2024 00:00 UTC)

  for (let i = 0; i < candles.length; i += groupSize) {
    const chunk = candles.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    const idx = Math.floor(i / groupSize);
    result.push({
      time: baseEpoch + idx * htfStepSeconds,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: Math.round(chunk.reduce((acc, c) => acc + c.volume, 0) * 100) / 100,
    });
  }
  return result;
}

/**
 * Normalizes timestamps to remove weekend/session gaps and optionally rescales prices
 * so real historical charts cannot be recognized from memory while keeping 100% identical
 * wick proportions, ATR ratios, percentage moves, and R:R geometry.
 */
export function prepareScenarioForPlay(
  scenario: Scenario,
  options?: { anonymizePrice?: boolean; seed?: number }
): Scenario {
  const shouldRescale = options?.anonymizePrice ?? Boolean(scenario.revealMeta?.isRealHistorical);
  const seed = options?.seed ?? 1;

  const refClose =
    scenario.visibleCandles[scenario.visibleCandles.length - 1]?.close || 100;

  // Target clean tactical price range ~120..380 with 2 decimals
  const targetAnchor = 140 + ((Math.abs(Math.sin(seed * 97.13)) * 210) | 0);
  const scale = shouldRescale ? targetAnchor / refClose : 1;
  const decimals = shouldRescale
    ? 2
    : refClose < 5
      ? 5
      : refClose < 100
        ? 3
        : 2;

  const ltfStep = timeframeToSeconds(scenario.timeframe);
  const htfStep = timeframeToSeconds(scenario.htfTimeframe || '1H');
  const baseEpoch = 1704067200;

  const scaleCandle = (c: Candle, seqIndex: number, stepSec: number): Candle => ({
    time: baseEpoch + seqIndex * stepSec,
    open: roundPrice(c.open * scale, decimals),
    high: roundPrice(c.high * scale, decimals),
    low: roundPrice(c.low * scale, decimals),
    close: roundPrice(c.close * scale, decimals),
    volume: c.volume,
  });

  const visibleCandles = scenario.visibleCandles.map((c, idx) =>
    scaleCandle(c, idx, ltfStep)
  );
  const futureCandles = scenario.futureCandles.map((c, idx) =>
    scaleCandle(c, visibleCandles.length + idx, ltfStep)
  );
  const htfVisibleCandles = scenario.htfVisibleCandles?.map((c, idx) =>
    scaleCandle(c, idx, htfStep)
  );

  const scaleAnnotation = (ann: TacticalAnnotation): TacticalAnnotation => ({
    ...ann,
    priceTop: roundPrice(ann.priceTop * scale, decimals),
    priceBottom:
      ann.priceBottom !== undefined
        ? roundPrice(ann.priceBottom * scale, decimals)
        : undefined,
  });

  return {
    ...scenario,
    atr: roundPrice(scenario.atr * scale, decimals + 1),
    visibleCandles,
    futureCandles,
    htfVisibleCandles,
    preAnnotations: scenario.preAnnotations?.map(scaleAnnotation),
    xrayAnnotations: scenario.xrayAnnotations.map(scaleAnnotation),
    radarConfig: scenario.radarConfig
      ? {
          ...scenario.radarConfig,
          priceTapTarget: scenario.radarConfig.priceTapTarget
            ? {
                ...scenario.radarConfig.priceTapTarget,
                idealPrice: roundPrice(
                  scenario.radarConfig.priceTapTarget.idealPrice * scale,
                  decimals
                ),
              }
            : undefined,
          choices: scenario.radarConfig.choices.map((ch) => ({
            ...ch,
            chartAnchor: ch.chartAnchor
              ? {
                  ...ch.chartAnchor,
                  price: roundPrice(ch.chartAnchor.price * scale, decimals),
                }
              : undefined,
          })),
        }
      : undefined,
    executionBlueprint: scenario.executionBlueprint
      ? {
          ...scenario.executionBlueprint,
          invalidationPrice: roundPrice(
            scenario.executionBlueprint.invalidationPrice * scale,
            decimals
          ),
          logicalTargetPrice: roundPrice(
            scenario.executionBlueprint.logicalTargetPrice * scale,
            decimals
          ),
        }
      : undefined,
    managementConfig: scenario.managementConfig
      ? {
          ...scenario.managementConfig,
          initialOrder: {
            ...scenario.managementConfig.initialOrder,
            entry: roundPrice(
              scenario.managementConfig.initialOrder.entry * scale,
              decimals
            ),
            stopLoss: roundPrice(
              scenario.managementConfig.initialOrder.stopLoss * scale,
              decimals
            ),
            takeProfit: roundPrice(
              scenario.managementConfig.initialOrder.takeProfit * scale,
              decimals
            ),
          },
        }
      : undefined,
  };
}
