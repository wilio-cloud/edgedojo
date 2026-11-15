import {
  Candle,
  ManagementAction,
  OrderSetup,
  TradeSimulationResult,
} from './types';

export interface OrderMetrics {
  valid: boolean;
  riskDistance: number;
  rewardDistance: number;
  grossRR: number;
  frictionR: number;
  netRR: number;
  slInAtr: number;
  warning?: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function computeATR(candles: Candle[], period = 14): number {
  if (candles.length === 0) return 1;
  if (candles.length === 1) {
    return Math.max(candles[0].high - candles[0].low, candles[0].close * 0.002);
  }
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
  return avg > 0 ? avg : candles[candles.length - 1].close * 0.002;
}

export function calculateOrderMetrics(
  order: OrderSetup,
  atr: number,
  applyScalpFriction = false
): OrderMetrics {
  const safeAtr = Math.max(atr, 1e-6);
  const isLongValid =
    order.side === 'LONG' &&
    order.stopLoss < order.entry &&
    order.takeProfit > order.entry;
  const isShortValid =
    order.side === 'SHORT' &&
    order.stopLoss > order.entry &&
    order.takeProfit < order.entry;

  if (!isLongValid && !isShortValid) {
    return {
      valid: false,
      riskDistance: 0,
      rewardDistance: 0,
      grossRR: 0,
      frictionR: 0,
      netRR: 0,
      slInAtr: 0,
      warning:
        order.side === 'LONG'
          ? 'En LONG, el Stop Loss ha d’estar sota l’Entrada i el Take Profit per sobre.'
          : 'En SHORT, el Stop Loss ha d’estar sobre l’Entrada i el Take Profit per sota.',
    };
  }

  const riskDistance = Math.abs(order.entry - order.stopLoss);
  const rewardDistance = Math.abs(order.takeProfit - order.entry);
  const grossRR = rewardDistance / riskDistance;
  const slInAtr = riskDistance / safeAtr;

  // Realistic spread + round-trip taker/maker fee model in Scalp (1m/5m)
  // Equivalent to ~0.09 ATR of execution cost: punishes unrealistic micro-stops!
  const frictionR = applyScalpFriction
    ? clamp((0.09 * safeAtr) / riskDistance, 0.05, 0.85)
    : 0.02;

  const netRR = Math.max(0, grossRR - frictionR);

  let warning: string | undefined;
  if (slInAtr < 0.35) {
    warning = applyScalpFriction
      ? `Stop ultra-estret (${slInAtr.toFixed(2)} ATR): l'spread i les comissions es mengen ${frictionR.toFixed(2)}R!`
      : `Stop massa enganxat (${slInAtr.toFixed(2)} ATR): alt risc d'escombrada per soroll normal.`;
  } else if (netRR < 1.3) {
    warning = `Ràtio R:R baixa (${netRR.toFixed(2)}R net): necessitaries un winrate molt alt per ser rendible.`;
  }

  return {
    valid: true,
    riskDistance,
    rewardDistance,
    grossRR: Math.round(grossRR * 100) / 100,
    frictionR: Math.round(frictionR * 100) / 100,
    netRR: Math.round(netRR * 100) / 100,
    slInAtr: Math.round(slInAtr * 100) / 100,
    warning,
  };
}

/**
 * Simulates an order candle-by-candle across futureCandles.
 * Applies strict conservative SL-First rule when a single candle touches both SL and TP.
 */
export function simulateOrderExecution(
  order: OrderSetup,
  currentClose: number,
  futureCandles: Candle[],
  atr: number,
  applyScalpFriction = false
): TradeSimulationResult {
  const metrics = calculateOrderMetrics(order, atr, applyScalpFriction);
  if (!metrics.valid || futureCandles.length === 0) {
    return {
      triggered: false,
      outcome: 'MISSED_LIMIT',
      grossRR: metrics.grossRR,
      frictionR: metrics.frictionR,
      netR: 0,
      exitPrice: currentClose,
      exitFutureIndex: 0,
      maxFavorableExcursionR: 0,
      maxAdverseExcursionR: 0,
      ambiguousCandleSlFirstApplied: false,
    };
  }

  const dirSign = order.side === 'LONG' ? 1 : -1;
  const isLimit =
    Boolean(order.isLimitOrder) ||
    Math.abs(order.entry - currentClose) > 0.18 * Math.max(atr, 1e-6);

  let triggered = !isLimit;
  let triggerIndex = 0;

  if (isLimit) {
    let foundIdx = -1;
    for (let i = 0; i < futureCandles.length; i++) {
      const c = futureCandles[i];
      if (c.low <= order.entry && c.high >= order.entry) {
        foundIdx = i;
        break;
      }
      // Or if price gaps straight across limit price toward entry side
      if (order.side === 'LONG' && c.open <= order.entry && order.entry < currentClose) {
        foundIdx = i;
        break;
      }
      if (order.side === 'SHORT' && c.open >= order.entry && order.entry > currentClose) {
        foundIdx = i;
        break;
      }
    }
    if (foundIdx === -1) {
      return {
        triggered: false,
        outcome: 'MISSED_LIMIT',
        grossRR: metrics.grossRR,
        frictionR: metrics.frictionR,
        netR: 0,
        exitPrice: futureCandles[futureCandles.length - 1].close,
        exitFutureIndex: futureCandles.length - 1,
        maxFavorableExcursionR: 0,
        maxAdverseExcursionR: 0,
        ambiguousCandleSlFirstApplied: false,
      };
    }
    triggered = true;
    triggerIndex = foundIdx;
  }

  let mfeR = 0;
  let maeR = 0;

  for (let i = triggerIndex; i < futureCandles.length; i++) {
    const c = futureCandles[i];
    const favPrice = order.side === 'LONG' ? c.high : c.low;
    const advPrice = order.side === 'LONG' ? c.low : c.high;

    const currentFavR = ((favPrice - order.entry) * dirSign) / metrics.riskDistance;
    const currentAdvR = ((order.entry - advPrice) * dirSign) / metrics.riskDistance;
    if (currentFavR > mfeR) mfeR = currentFavR;
    if (currentAdvR > maeR) maeR = currentAdvR;

    const hitSL =
      order.side === 'LONG'
        ? c.low <= order.stopLoss
        : c.high >= order.stopLoss;
    const hitTP =
      order.side === 'LONG'
        ? c.high >= order.takeProfit
        : c.low <= order.takeProfit;

    if (hitSL && hitTP) {
      // Check rare direct open gap beyond TP
      const openedAtTP =
        (order.side === 'LONG' && c.open >= order.takeProfit) ||
        (order.side === 'SHORT' && c.open <= order.takeProfit);
      if (openedAtTP) {
        return {
          triggered,
          outcome: 'TP_HIT',
          grossRR: metrics.grossRR,
          frictionR: metrics.frictionR,
          netR: Math.round((metrics.grossRR - metrics.frictionR) * 100) / 100,
          exitPrice: order.takeProfit,
          exitFutureIndex: i,
          maxFavorableExcursionR: Math.round(mfeR * 100) / 100,
          maxAdverseExcursionR: Math.round(maeR * 100) / 100,
          ambiguousCandleSlFirstApplied: false,
        };
      }
      // Strict Conservative Worst-Case (SL-First)
      return {
        triggered,
        outcome: 'SL_HIT',
        grossRR: metrics.grossRR,
        frictionR: metrics.frictionR,
        netR: Math.round((-1 - metrics.frictionR) * 100) / 100,
        exitPrice: order.stopLoss,
        exitFutureIndex: i,
        maxFavorableExcursionR: Math.round(mfeR * 100) / 100,
        maxAdverseExcursionR: Math.round(maeR * 100) / 100,
        ambiguousCandleSlFirstApplied: true,
      };
    }

    if (hitSL) {
      return {
        triggered,
        outcome: 'SL_HIT',
        grossRR: metrics.grossRR,
        frictionR: metrics.frictionR,
        netR: Math.round((-1 - metrics.frictionR) * 100) / 100,
        exitPrice: order.stopLoss,
        exitFutureIndex: i,
        maxFavorableExcursionR: Math.round(mfeR * 100) / 100,
        maxAdverseExcursionR: Math.round(maeR * 100) / 100,
        ambiguousCandleSlFirstApplied: false,
      };
    }

    if (hitTP) {
      return {
        triggered,
        outcome: 'TP_HIT',
        grossRR: metrics.grossRR,
        frictionR: metrics.frictionR,
        netR: Math.round((metrics.grossRR - metrics.frictionR) * 100) / 100,
        exitPrice: order.takeProfit,
        exitFutureIndex: i,
        maxFavorableExcursionR: Math.round(mfeR * 100) / 100,
        maxAdverseExcursionR: Math.round(maeR * 100) / 100,
        ambiguousCandleSlFirstApplied: false,
      };
    }
  }

  // Mark-to-market at end of window
  const finalCandle = futureCandles[futureCandles.length - 1];
  const rawR =
    ((finalCandle.close - order.entry) * dirSign) / metrics.riskDistance;
  const netR = Math.round((rawR - metrics.frictionR) * 100) / 100;

  return {
    triggered,
    outcome: 'TIMEOUT_OPEN',
    grossRR: metrics.grossRR,
    frictionR: metrics.frictionR,
    netR,
    exitPrice: finalCandle.close,
    exitFutureIndex: futureCandles.length - 1,
    maxFavorableExcursionR: Math.round(mfeR * 100) / 100,
    maxAdverseExcursionR: Math.round(maeR * 100) / 100,
    ambiguousCandleSlFirstApplied: false,
  };
}

export interface ManagedStepState {
  activeStopLoss: number;
  remainingSize: number; // 1.0 -> 0.5 -> 0
  realizedR: number;
  closed: boolean;
  closeReason?: 'SL_HIT' | 'BE_HIT' | 'TP_HIT' | 'MANUAL_CLOSE' | 'END_OF_DATA';
  exitFutureIndex: number;
}

/**
 * Simulates an active trade across segments with live management actions
 * (HOLD, MOVE_BE, PARTIAL_50, CLOSE_ALL).
 */
export function advanceManagedTrade(
  initialOrder: OrderSetup,
  state: ManagedStepState,
  candlesSegment: Candle[],
  segmentStartIndex: number,
  atr: number,
  actionTaken?: ManagementAction,
  currentMarkPrice?: number,
  applyScalpFriction = false
): ManagedStepState {
  if (state.closed || state.remainingSize <= 0) return state;

  const metrics = calculateOrderMetrics(initialOrder, atr, applyScalpFriction);
  const riskDist = Math.max(metrics.riskDistance, 1e-6);
  const dirSign = initialOrder.side === 'LONG' ? 1 : -1;

  let activeSL = state.activeStopLoss;
  let remSize = state.remainingSize;
  let realized = state.realizedR;

  // Apply user's action at currentMarkPrice BEFORE advancing the next segment
  if (actionTaken && currentMarkPrice !== undefined) {
    const floatingR = ((currentMarkPrice - initialOrder.entry) * dirSign) / riskDist;
    if (actionTaken === 'CLOSE_ALL') {
      realized += remSize * (floatingR - metrics.frictionR);
      return {
        activeStopLoss: activeSL,
        remainingSize: 0,
        realizedR: Math.round(realized * 100) / 100,
        closed: true,
        closeReason: 'MANUAL_CLOSE',
        exitFutureIndex: Math.max(0, segmentStartIndex - 1),
      };
    }
    if (actionTaken === 'PARTIAL_50' && remSize > 0.51) {
      const closedChunk = 0.5;
      realized += closedChunk * (floatingR - metrics.frictionR);
      remSize = Math.round((remSize - closedChunk) * 100) / 100;
    }
    if (actionTaken === 'MOVE_BE') {
      // Only allow moving to BE if trade is currently in profit or near entry
      activeSL = initialOrder.entry;
    }
  }

  // Advance through candlesSegment
  for (let i = 0; i < candlesSegment.length; i++) {
    const c = candlesSegment[i];
    const absIdx = segmentStartIndex + i;

    const hitSL =
      initialOrder.side === 'LONG' ? c.low <= activeSL : c.high >= activeSL;
    const hitTP =
      initialOrder.side === 'LONG'
        ? c.high >= initialOrder.takeProfit
        : c.low <= initialOrder.takeProfit;

    if (hitSL) {
      const isBE = Math.abs(activeSL - initialOrder.entry) < 1e-5;
      const slR = ((activeSL - initialOrder.entry) * dirSign) / riskDist;
      realized += remSize * (slR - metrics.frictionR);
      return {
        activeStopLoss: activeSL,
        remainingSize: 0,
        realizedR: Math.round(realized * 100) / 100,
        closed: true,
        closeReason: isBE ? 'BE_HIT' : 'SL_HIT',
        exitFutureIndex: absIdx,
      };
    }

    if (hitTP) {
      const tpR =
        ((initialOrder.takeProfit - initialOrder.entry) * dirSign) / riskDist;
      realized += remSize * (tpR - metrics.frictionR);
      return {
        activeStopLoss: activeSL,
        remainingSize: 0,
        realizedR: Math.round(realized * 100) / 100,
        closed: true,
        closeReason: 'TP_HIT',
        exitFutureIndex: absIdx,
      };
    }
  }

  return {
    activeStopLoss: activeSL,
    remainingSize: remSize,
    realizedR: Math.round(realized * 100) / 100,
    closed: false,
    exitFutureIndex: segmentStartIndex + candlesSegment.length - 1,
  };
}
