export interface MnqSizingInput {
  accountMode: 'OWN_CAPITAL' | 'PROP_FIRM';
  nominalCapitalUsd: number;
  propDrawdownBufferUsd: number;
  riskPct: number; // % of capital (or % of buffer if prop firm mode uses buffer)
  stopLossPoints: number;
  targetRR: number;
}

export interface MnqSizingOutput {
  effectiveRiskBaseUsd: number;
  maxAllowedRiskUsd: number;
  costPerContractAtSlUsd: number;
  exactContracts: number;
  recommendedContracts: number;
  actualDollarRiskUsd: number;
  actualRiskPctOfBase: number;
  roundTripFeesUsd: number;
  targetPoints: number;
  netProfitAtTargetUsd: number;
  equivalentEminiNQ: number;
  statusLevel: 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'IMPOSSIBLE_1_LOT';
  advice: string;
}

export const MNQ_POINT_VALUE_USD = 2.0; // $2 per point
export const MNQ_TICK_VALUE_USD = 0.5; // 0.25 pt = $0.50
export const MNQ_ROUND_TRIP_FEE_USD = 1.3; // Realistic CME + broker round-turn per contract

export function calculateMnqPositionSizing(
  input: MnqSizingInput
): MnqSizingOutput {
  const slPts = Math.max(input.stopLossPoints, 1);
  const effectiveRiskBaseUsd =
    input.accountMode === 'PROP_FIRM'
      ? Math.max(input.propDrawdownBufferUsd, 250)
      : Math.max(input.nominalCapitalUsd, 250);

  const maxAllowedRiskUsd = effectiveRiskBaseUsd * (input.riskPct / 100);
  const costPerContractAtSlUsd =
    slPts * MNQ_POINT_VALUE_USD + MNQ_ROUND_TRIP_FEE_USD;

  const exactContracts = maxAllowedRiskUsd / costPerContractAtSlUsd;
  const recommendedContracts = Math.max(0, Math.floor(exactContracts));

  const actualDollarRiskUsd =
    recommendedContracts * costPerContractAtSlUsd;
  const actualRiskPctOfBase =
    (actualDollarRiskUsd / effectiveRiskBaseUsd) * 100;
  const roundTripFeesUsd = recommendedContracts * MNQ_ROUND_TRIP_FEE_USD;

  const targetPoints = Math.round(slPts * input.targetRR * 4) / 4; // Snap to 0.25 tick
  const grossRewardPerLot = targetPoints * MNQ_POINT_VALUE_USD;
  const netProfitAtTargetUsd =
    recommendedContracts * (grossRewardPerLot - MNQ_ROUND_TRIP_FEE_USD);

  const equivalentEminiNQ = Math.floor(recommendedContracts / 10);

  let statusLevel: MnqSizingOutput['statusLevel'] = 'OPTIMAL';
  let advice = '';

  if (recommendedContracts === 0) {
    statusLevel = 'IMPOSSIBLE_1_LOT';
    const maxPtsFor1Lot = Math.max(
      2,
      Math.floor((maxAllowedRiskUsd - MNQ_ROUND_TRIP_FEE_USD) / MNQ_POINT_VALUE_USD)
    );
    advice = `Amb ${Math.round(maxAllowedRiskUsd)}$ de risc màxim, ni tan sols 1 contracte MNQ cap en un Stop de ${slPts} punts (costaria ${costPerContractAtSlUsd.toFixed(2)}$). Espera una microestructura amb SL <= ${maxPtsFor1Lot} pts o NO operis!`;
  } else if (
    (input.accountMode === 'OWN_CAPITAL' && input.riskPct > 1.5) ||
    (input.accountMode === 'PROP_FIRM' && input.riskPct > 8.5)
  ) {
    statusLevel = 'DANGER';
    advice =
      input.accountMode === 'PROP_FIRM'
        ? `Arriscar un ${input.riskPct}% del teu coixí de Drawdown vol dir que ~${Math.floor(100 / input.riskPct)} pèrdues seguides cremen la prova de fondeig. Baixa al 4%–6% del coixí!`
        : `En Scalping d'MNQ intradia, arriscar ${input.riskPct}% per trade és agressiu: 4 stops en un matí volàtil et farien caure un -${(input.riskPct * 4).toFixed(1)}%. L'òptim és 0.5%–1.0%.`;
  } else if (slPts < 8) {
    statusLevel = 'CAUTION';
    advice = `Un SL de només ${slPts} punts en MNQ a l'obertura de Nova York (15:30h CET) pot ser escombrat en 2 segons pel soroll normal de l'ordre book. Comprova l'ATR d'1m!`;
  } else {
    statusLevel = 'OPTIMAL';
    advice =
      recommendedContracts >= 2
        ? `Dimensionament institucional òptim: amb ${recommendedContracts} contractes MNQ pots tancar ${Math.floor(recommendedContracts / 2)} al primer objectiu (+1.5R) i deixar córrer la resta sense estrès.`
        : `Risc totalment sota control (1 contracte MNQ = ${actualDollarRiskUsd.toFixed(2)}$ incloent comissions). Fes créixer el coixí abans de pujar al 2n contracte.`;
  }

  return {
    effectiveRiskBaseUsd: Math.round(effectiveRiskBaseUsd * 100) / 100,
    maxAllowedRiskUsd: Math.round(maxAllowedRiskUsd * 100) / 100,
    costPerContractAtSlUsd: Math.round(costPerContractAtSlUsd * 100) / 100,
    exactContracts: Math.round(exactContracts * 100) / 100,
    recommendedContracts,
    actualDollarRiskUsd: Math.round(actualDollarRiskUsd * 100) / 100,
    actualRiskPctOfBase: Math.round(actualRiskPctOfBase * 100) / 100,
    roundTripFeesUsd: Math.round(roundTripFeesUsd * 100) / 100,
    targetPoints,
    netProfitAtTargetUsd: Math.round(netProfitAtTargetUsd * 100) / 100,
    equivalentEminiNQ,
    statusLevel,
    advice,
  };
}

export interface CryptoSwingSizingInput {
  capitalUsdt: number;
  riskPct: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  roundTripFeePct?: number; // Default 0.10% (0.05% entry + 0.05% exit on Perps)
}

export interface CryptoSwingSizingOutput {
  valid: boolean;
  side: 'LONG' | 'SHORT';
  slDistancePct: number;
  tpDistancePct: number;
  maxRiskUsdt: number;
  positionSizeUsdt: number;
  coinUnits: number;
  estimatedFeesUsdt: number;
  netRR: number;
  netProfitAtTpUsdt: number;
  effectiveAccountLeverage: number;
  maxSafeIsolatedLeverage: number;
  portfolioHeatWarning?: string;
  advice: string;
}

export function calculateCryptoSwingSizing(
  input: CryptoSwingSizingInput
): CryptoSwingSizingOutput {
  const feeRate = (input.roundTripFeePct ?? 0.1) / 100;
  const entry = Math.max(input.entryPrice, 1e-6);
  const sl = Math.max(input.stopLossPrice, 1e-6);
  const tp = Math.max(input.takeProfitPrice, 1e-6);

  const isLong = tp > entry && sl < entry;
  const isShort = tp < entry && sl > entry;

  if (!isLong && !isShort) {
    return {
      valid: false,
      side: 'LONG',
      slDistancePct: 0,
      tpDistancePct: 0,
      maxRiskUsdt: 0,
      positionSizeUsdt: 0,
      coinUnits: 0,
      estimatedFeesUsdt: 0,
      netRR: 0,
      netProfitAtTpUsdt: 0,
      effectiveAccountLeverage: 0,
      maxSafeIsolatedLeverage: 1,
      advice:
        'Revisa els preus: el Stop Loss i el Take Profit han d’estar a bandes oposades del preu d’entrada.',
    };
  }

  const side: 'LONG' | 'SHORT' = isLong ? 'LONG' : 'SHORT';
  const slDistFrac = Math.abs(entry - sl) / entry;
  const tpDistFrac = Math.abs(tp - entry) / entry;

  const maxRiskUsdt = input.capitalUsdt * (input.riskPct / 100);

  // Exact institutional formula accounting for notional exchange fees at stop-out!
  const lossPerUsdtNotional = slDistFrac + feeRate;
  const positionSizeUsdt = maxRiskUsdt / Math.max(lossPerUsdtNotional, 1e-5);
  const coinUnits = positionSizeUsdt / entry;
  const estimatedFeesUsdt = positionSizeUsdt * feeRate;

  const grossProfitUsdt = positionSizeUsdt * tpDistFrac;
  const netProfitAtTpUsdt = Math.max(0, grossProfitUsdt - estimatedFeesUsdt);
  const netRR = maxRiskUsdt > 0 ? netProfitAtTpUsdt / maxRiskUsdt : 0;

  const effectiveAccountLeverage =
    input.capitalUsdt > 0 ? positionSizeUsdt / input.capitalUsdt : 0;

  // Liquidation safety: keep liquidation price at least 1.5x further away than SL
  const rawMaxLev = Math.floor(0.65 / Math.max(slDistFrac, 0.005));
  const maxSafeIsolatedLeverage = Math.max(1, Math.min(20, rawMaxLev));

  let portfolioHeatWarning: string | undefined;
  if (input.riskPct > 2.0) {
    portfolioHeatWarning = `ALERTA VERMELLA: Superes el sostre institucional del 2%! En Cripto, una cascada de liquidacions pot generar slippage extra. Mantén-te entre l'1.0% i el 2.0% màxim.`;
  } else if (input.riskPct >= 1.5) {
    portfolioHeatWarning = `Risc de Convicció A+ (${input.riskPct}%): si ja tens un altre Swing Cripto obert (ex. BTC + SOL), recorda que tenen correlació > 0.80. No superis mai el 3% de risc total obert sumant totes les monedes!`;
  }

  const advice =
    effectiveAccountLeverage <= 1.0
      ? `Pots executar aquesta operació 100% en SPOT sense palanquejament (compres ${positionSizeUsdt.toFixed(0)} USDT sobre un capital de ${input.capitalUsdt.toFixed(0)} USDT) i si salta l'SL només perds ${maxRiskUsdt.toFixed(2)} USDT (${input.riskPct}%).`
      : `Operació en Futurs Perp USDT: obre una posició total de ${positionSizeUsdt.toFixed(0)} USDT (exposició real ${effectiveAccountLeverage.toFixed(2)}x del teu compte, palanquejament aïllat recomanat <= ${maxSafeIsolatedLeverage}x). Si salta l'SL de -${(slDistFrac * 100).toFixed(2)}%, perdràs exactament ${maxRiskUsdt.toFixed(2)} USDT!`;

  return {
    valid: true,
    side,
    slDistancePct: Math.round(slDistFrac * 10000) / 100,
    tpDistancePct: Math.round(tpDistFrac * 10000) / 100,
    maxRiskUsdt: Math.round(maxRiskUsdt * 100) / 100,
    positionSizeUsdt: Math.round(positionSizeUsdt * 100) / 100,
    coinUnits:
      coinUnits >= 10
        ? Math.round(coinUnits * 100) / 100
        : Math.round(coinUnits * 10000) / 10000,
    estimatedFeesUsdt: Math.round(estimatedFeesUsdt * 100) / 100,
    netRR: Math.round(netRR * 100) / 100,
    netProfitAtTpUsdt: Math.round(netProfitAtTpUsdt * 100) / 100,
    effectiveAccountLeverage: Math.round(effectiveAccountLeverage * 100) / 100,
    maxSafeIsolatedLeverage,
    portfolioHeatWarning,
    advice,
  };
}

export interface ScalingTierStep {
  phase: number;
  title: string;
  equityMilestone: number;
  riskPct: number;
  riskAmountUsd: number;
  typicalMnqLots: number; // Assuming ~20 pt structural SL ($41.30/lot)
  cryptoMaxHeatPct: number;
  ruleToUnlockNext: string;
}

export function buildScalingLadder(startingCapital: number): ScalingTierStep[] {
  const base = Math.max(500, startingCapital);
  const milestones = [
    {
      mult: 1.0,
      title: 'Fase 1 · Validació Nervis d’Acer',
      riskPct: 0.5,
      heat: 1.5,
      rule: '25 operacions seguint el pla al 100% amb Esperança E[R] > +0.3R',
    },
    {
      mult: 1.12,
      title: 'Fase 2 · Velocitat de Creuer Estàndard',
      riskPct: 1.0,
      heat: 2.5,
      rule: 'Assolir +12% d’equitat neta amb Drawdown màxim < 5%',
    },
    {
      mult: 1.35,
      title: 'Fase 3 · Escalat Compost Consolidat',
      riskPct: 1.25,
      heat: 3.0,
      rule: 'Consolidar +35% acumulat; els nous guanys financen el risc extra',
    },
    {
      mult: 1.75,
      title: 'Fase 4 · Execució Asimètrica A+ (House Money)',
      riskPct: 1.5,
      heat: 3.5,
      rule: 'Retirar 20% de beneficis al banc i mantenir fre del 50% si hi ha -5% DD',
    },
    {
      mult: 2.5,
      title: 'Fase 5 · Capital Institucional / Duplicació',
      riskPct: 1.0,
      heat: 2.5,
      rule: 'En doblar capital, es torna a l’1.0% per protegir patrimoni gran!',
    },
  ];

  return milestones.map((m, idx) => {
    const eq = Math.round(base * m.mult);
    const riskUsd = Math.round(eq * (m.riskPct / 100) * 100) / 100;
    const mnqLots = Math.max(1, Math.floor(riskUsd / 41.3)); // ~20pt MNQ SL + fees
    return {
      phase: idx + 1,
      title: m.title,
      equityMilestone: eq,
      riskPct: m.riskPct,
      riskAmountUsd: riskUsd,
      typicalMnqLots: riskUsd < 25 ? 0 : mnqLots,
      cryptoMaxHeatPct: m.heat,
      ruleToUnlockNext: m.rule,
    };
  });
}

export interface EquitySimulationResult {
  conservativeCurve: number[];
  stepDownProtectedCurve: number[];
  overleveragedCurve: number[];
  finalConservative: number;
  finalProtected: number;
  finalOverleveraged: number;
  maxDdProtectedPct: number;
  maxDdOverleveragedPct: number;
}

/**
 * Deterministic Monte Carlo comparison over N trades showing why 1%–1.5% + Step-Down Rule
 * compounds smoothly while 5% over-risking suffers devastating drawdowns on identical trades!
 */
export function simulateCompoundingComparison(params: {
  initialCapital: number;
  winRatePct: number;
  avgWinRR: number;
  baseRiskPct: number; // e.g., 1.0 - 2.0
  totalTrades: number;
  seed?: number;
}): EquitySimulationResult {
  const n = Math.max(10, Math.min(200, params.totalTrades));
  let s = (params.seed ?? 42) >>> 0;
  const rand = () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Pre-generate realistic trade outcomes including natural losing streaks
  const outcomesWin: boolean[] = [];
  for (let i = 0; i < n; i++) {
    outcomesWin.push(rand() * 100 < params.winRatePct);
  }

  const runCurve = (riskPct: number, useStepDownRule: boolean) => {
    const curve = [params.initialCapital];
    let eq = params.initialCapital;
    let peak = eq;
    let maxDdPct = 0;

    for (let i = 0; i < n; i++) {
      const currentDdPct = peak > 0 ? ((peak - eq) / peak) * 100 : 0;
      // Step-Down Rule: cut risk in half whenever drawdown >= 5% from High-Water Mark!
      const activeRiskFrac =
        useStepDownRule && currentDdPct >= 5.0
          ? (riskPct * 0.5) / 100
          : riskPct / 100;

      const rMult = outcomesWin[i] ? params.avgWinRR : -1.0;
      eq = Math.max(10, eq * (1 + activeRiskFrac * rMult));
      if (eq > peak) peak = eq;
      const newDd = ((peak - eq) / peak) * 100;
      if (newDd > maxDdPct) maxDdPct = newDd;
      curve.push(Math.round(eq));
    }
    return { curve, finalEq: Math.round(eq), maxDdPct: Math.round(maxDdPct * 10) / 10 };
  };

  const cons = runCurve(1.0, false);
  const prot = runCurve(params.baseRiskPct, true);
  const over = runCurve(5.0, false);

  return {
    conservativeCurve: cons.curve,
    stepDownProtectedCurve: prot.curve,
    overleveragedCurve: over.curve,
    finalConservative: cons.finalEq,
    finalProtected: prot.finalEq,
    finalOverleveraged: over.finalEq,
    maxDdProtectedPct: prot.maxDdPct,
    maxDdOverleveragedPct: over.maxDdPct,
  };
}
