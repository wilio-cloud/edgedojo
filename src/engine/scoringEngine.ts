import {
  EvaluationResult,
  HistoryRecord,
  ManagementAction,
  OrderSetup,
  ReadinessProfile,
  Scenario,
  TradingStyle,
} from './types';
import {
  calculateOrderMetrics,
  simulateOrderExecution,
} from './tradeSimulator';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function scoreToStars(score: number, passed: boolean): 0 | 1 | 2 | 3 {
  if (!passed || score < 50) return 0;
  if (score >= 86) return 3;
  if (score >= 68) return 2;
  return 1;
}

export function evaluateRadarAttempt(
  scenario: Scenario,
  params: {
    selectedChoiceId?: string;
    tappedPrice?: number;
    elapsedSec: number;
  }
): EvaluationResult {
  const cfg = scenario.radarConfig!;
  const timeRatio = clamp(params.elapsedSec / Math.max(cfg.timeLimitSec, 1), 0, 2);
  const speedBonus = timeRatio <= 0.65 ? 10 : timeRatio <= 1.0 ? 5 : -12;

  let isCorrect = false;
  let feedback = scenario.coachingTakeaway;

  if (cfg.priceTapTarget && params.tappedPrice !== undefined) {
    const distAtr =
      Math.abs(params.tappedPrice - cfg.priceTapTarget.idealPrice) /
      Math.max(scenario.atr, 1e-6);
    isCorrect = distAtr <= cfg.priceTapTarget.toleranceAtr;
    feedback = isCorrect
      ? `Precisió quirúrgica (${distAtr.toFixed(2)} ATR de desviació): has localitzat exactament ${cfg.priceTapTarget.targetLabel}.`
      : `Has tocat a ${distAtr.toFixed(1)} ATR del nivell clau (${cfg.priceTapTarget.targetLabel}). Fixa't en les metxes i punts d'estructura marcats als Raigs X.`;
  } else if (params.selectedChoiceId) {
    const choice = cfg.choices.find((c) => c.id === params.selectedChoiceId);
    if (choice) {
      isCorrect = choice.isCorrect;
      feedback = choice.feedback;
    }
  }

  const base = isCorrect ? 90 : 22;
  const totalScore = Math.round(clamp(base + speedBonus, 0, 100));
  const passed = isCorrect && params.elapsedSec <= cfg.timeLimitSec * 1.35;
  const stars = scoreToStars(totalScore, passed);

  const badges: string[] = [];
  if (isCorrect && timeRatio <= 0.5) badges.push('Ull de Falcó');
  if (stars === 3) badges.push('Lectura Neta');

  return {
    scenarioId: scenario.id,
    mode: 'RADAR',
    style: scenario.style,
    passed,
    totalScore,
    stars,
    netR: isCorrect ? 1.0 : -0.5,
    headline: isCorrect
      ? timeRatio <= 1
        ? 'Estructura i liquidesa detectades!'
        : 'Lectura correcta, però fora de temps òptim'
      : 'Error de lectura estructural',
    detailedFeedback: feedback,
    proTip: scenario.coachingTakeaway,
    badges,
    breakdown: {
      structureScore: isCorrect ? 95 : 20,
      riskPlacementScore: isCorrect ? 85 : 35,
      executionScore: clamp(100 - Math.round(timeRatio * 30), 30, 100),
      disciplineScore: isCorrect ? 90 : 40,
    },
  };
}

export function evaluateExecutionAttempt(
  scenario: Scenario,
  decision: {
    choseSkip: boolean;
    order?: OrderSetup;
    elapsedSec?: number;
  }
): EvaluationResult {
  const bp = scenario.executionBlueprint!;
  const currentClose =
    scenario.visibleCandles[scenario.visibleCandles.length - 1].close;

  // CASE 1: Player chose "NO OPERAR (Pass / Trap)"
  if (decision.choseSkip) {
    if (bp.optimalSide === 'SKIP') {
      return {
        scenarioId: scenario.id,
        mode: 'EXECUTION',
        style: scenario.style,
        passed: true,
        totalScore: 98,
        stars: 3,
        netR: 0,
        headline: 'Disciplina d’Elit: Trampa esquivada!',
        detailedFeedback:
          bp.trapExplanation ||
          'Has detectat un context sense avantatge estadístic i has protegit el teu capital. En trading real, els diners que NO perds en rangs bruts paguen els teus millors mesos.',
        proTip: scenario.coachingTakeaway,
        badges: ['Paciència de Franctirador', 'Capital Protegit'],
        breakdown: {
          structureScore: 98,
          riskPlacementScore: 95,
          executionScore: 96,
          disciplineScore: 100,
        },
      };
    }

    // Skipped a valid A+ setup: protect capital (0R), gentle feedback
    return {
      scenarioId: scenario.id,
      mode: 'EXECUTION',
      style: scenario.style,
      passed: false,
      totalScore: 46,
      stars: 0,
      netR: 0,
      headline: 'Capital intacte, però has deixat passar un Setup A+',
      detailedFeedback:
        'No has perdut res (0R), cosa millor que forçar un mal trade, però aquí hi havia confluència clara d’estructura i liquidesa a favor de ' +
        bp.optimalSide +
        '. Revisa els Raigs X per gravar el patró.',
      proTip: scenario.coachingTakeaway,
      badges: ['Prudent (0R)'],
      breakdown: {
        structureScore: 40,
        riskPlacementScore: 60,
        executionScore: 45,
        disciplineScore: 70,
      },
    };
  }

  // Player placed an order
  const order = decision.order!;
  const sim = simulateOrderExecution(
    order,
    currentClose,
    scenario.futureCandles,
    scenario.atr,
    bp.applyScalpFriction
  );
  const metrics = calculateOrderMetrics(
    order,
    scenario.atr,
    bp.applyScalpFriction
  );

  // CASE 2: Scenario was a TRAP ('SKIP'), but player forced a trade!
  if (bp.optimalSide === 'SKIP') {
    const luckyWin = sim.netR > 0.5;
    return {
      scenarioId: scenario.id,
      mode: 'EXECUTION',
      style: scenario.style,
      passed: false,
      totalScore: luckyWin ? 38 : 16,
      stars: 0,
      netR: sim.netR,
      headline: luckyWin
        ? 'Guany per sort en un setup brossa (Overtrading!)'
        : 'Has caigut a la trampa de liquidesa / rang brut',
      detailedFeedback:
        (bp.trapExplanation ||
          'Aquest gràfic no tenia cap avantatge clar (compressió al mig del rang o zona ja gastada).') +
        (luckyWin
          ? ' Tot i que el preu t’ha donat punts per atzar, un professional mai premia una mala decisió amb resultat afortunat.'
          : ` Resultat real: ${sim.netR >= 0 ? '+' : ''}${sim.netR}R.`),
      proTip: scenario.coachingTakeaway,
      badges: [],
      breakdown: {
        structureScore: 20,
        riskPlacementScore: 30,
        executionScore: luckyWin ? 55 : 20,
        disciplineScore: 10,
      },
      simulation: sim,
    };
  }

  // CASE 3: Valid directional scenario
  const rightDirection = order.side === bp.optimalSide;
  const slDiffAtr =
    Math.abs(order.stopLoss - bp.invalidationPrice) /
    Math.max(scenario.atr, 1e-6);

  // Evaluate Stop Loss structural quality
  let riskScore = 85;
  let slComment = 'Stop Loss ben protegit darrere la invalidesa estructural.';
  if (!rightDirection) {
    riskScore = 20;
    slComment = `Operaves a contracorrent del biaix estructural (${bp.optimalSide}).`;
  } else if (metrics.slInAtr < 0.35) {
    riskScore = 30;
    slComment = `Stop Loss massa asfixiat (${metrics.slInAtr} ATR): exposat al soroll normal i a una fricció de ${metrics.frictionR}R.`;
  } else if (slDiffAtr <= bp.slToleranceAtr) {
    riskScore = 96;
    slComment = 'Stop Loss institucional clavat al nivell exacte d’invalidesa!';
  } else if (
    (order.side === 'LONG' && order.stopLoss > bp.invalidationPrice) ||
    (order.side === 'SHORT' && order.stopLoss < bp.invalidationPrice)
  ) {
    riskScore = 48;
    slComment =
      'Has posat l’Stop Loss per dins de la metxa de seguretat (vulnerable a un re-test abans de sortir).';
  } else {
    riskScore = 64;
    slComment =
      'Stop Loss massa allunyat de la invalidesa, reduint innecessàriament la teva ràtio R:R.';
  }

  // Evaluate R:R quality
  const rrBonus =
    metrics.netRR >= bp.minAcceptableRR
      ? 10
      : metrics.netRR >= 1.5
        ? -5
        : -22;
  riskScore = clamp(riskScore + rrBonus, 10, 100);

  // Time pressure penalty in Scalp
  let timePenalty = 0;
  if (bp.timeLimitSec && decision.elapsedSec && decision.elapsedSec > bp.timeLimitSec) {
    timePenalty = 12;
  }

  const structureScore = rightDirection ? 94 : 15;
  let executionScore = 50;
  if (!sim.triggered) {
    executionScore = 35;
  } else if (sim.outcome === 'TP_HIT') {
    executionScore = 98;
  } else if (sim.outcome === 'TIMEOUT_OPEN' && sim.netR > 0.8) {
    executionScore = 78;
  } else if (sim.outcome === 'SL_HIT') {
    executionScore = rightDirection ? 35 : 10;
  }

  const disciplineScore =
    metrics.netRR >= bp.minAcceptableRR && metrics.slInAtr >= 0.35 ? 92 : 52;

  const rawTotal =
    structureScore * 0.4 +
    riskScore * 0.35 +
    executionScore * 0.25 -
    timePenalty;
  const totalScore = Math.round(clamp(rawTotal, 0, 100));
  const passed = rightDirection && sim.triggered && sim.netR > 0 && totalScore >= 58;
  const stars = scoreToStars(totalScore, passed);

  const badges: string[] = [];
  if (stars === 3) badges.push('Execució A+');
  if (metrics.netRR >= 2.8 && sim.outcome === 'TP_HIT') badges.push('Asimetria Pro');
  if (bp.timeLimitSec && (decision.elapsedSec ?? 99) <= bp.timeLimitSec * 0.6 && passed) {
    badges.push('Reflexos d’Scalper');
  }

  let outcomeText = '';
  if (!sim.triggered) {
    outcomeText = 'L’ordre Límit s’ha quedat massa lluny i el moviment ha marxat sense tu (0R).';
  } else if (sim.outcome === 'TP_HIT') {
    outcomeText = `Take Profit assolit amb +${sim.netR}R nets!`;
  } else if (sim.outcome === 'SL_HIT') {
    outcomeText = sim.ambiguousCandleSlFirstApplied
      ? `Stop Loss tocat (${sim.netR}R, aplicant criteri rigorós SL-First en espelma volàtil).`
      : `Stop Loss tocat (${sim.netR}R).`;
  } else {
    outcomeText = `Operació tancada al final de la finestra amb ${sim.netR >= 0 ? '+' : ''}${sim.netR}R nets (MFE màxim: +${sim.maxFavorableExcursionR}R).`;
  }

  return {
    scenarioId: scenario.id,
    mode: 'EXECUTION',
    style: scenario.style,
    passed,
    totalScore,
    stars,
    netR: sim.netR,
    headline: passed
      ? stars === 3
        ? `Lectura i Execució Impecables (+${sim.netR}R)`
        : `Operació Rendible (+${sim.netR}R), amb marge de poliment`
      : rightDirection
        ? 'Bona lectura de direcció, però l’execució / SL ha fallat'
        : 'Direcció contrària a l’estructura dominant',
    detailedFeedback: `${outcomeText} ${slComment}`,
    proTip: scenario.coachingTakeaway,
    badges,
    breakdown: {
      structureScore,
      riskPlacementScore: riskScore,
      executionScore,
      disciplineScore,
    },
    simulation: sim,
  };
}

export function evaluateManagementAttempt(
  scenario: Scenario,
  decisions: { checkpointId: string; action: ManagementAction }[],
  finalRealizedR: number
): EvaluationResult {
  const cfg = scenario.managementConfig!;
  let decisionPoints = 0;
  const notes: string[] = [];

  cfg.checkpoints.forEach((cp, idx) => {
    const found = decisions.find((d) => d.checkpointId === cp.id);
    if (!found) {
      // Trade closed earlier (e.g. panic closed or stopped out before reaching checkpoint)
      decisionPoints += finalRealizedR > 1.2 ? 65 : 25;
      return;
    }
    if (cp.optimalActions.includes(found.action)) {
      decisionPoints += 100;
    } else if (cp.acceptableActions?.includes(found.action)) {
      decisionPoints += 72;
      notes.push(`Pas ${idx + 1}: ${cp.coachingNote}`);
    } else {
      decisionPoints += 22;
      notes.push(`Pas ${idx + 1}: ${cp.coachingNote}`);
    }
  });

  const avgDecisionQuality =
    cfg.checkpoints.length > 0 ? decisionPoints / cfg.checkpoints.length : 70;
  const rBonus = finalRealizedR >= 2.0 ? 12 : finalRealizedR >= 1.0 ? 5 : finalRealizedR < 0 ? -15 : 0;
  const totalScore = Math.round(clamp(avgDecisionQuality * 0.88 + rBonus, 0, 100));
  const passed = totalScore >= 60 && finalRealizedR >= 0.4;
  const stars = scoreToStars(totalScore, passed);

  const badges: string[] = [];
  if (stars === 3) badges.push('Sang Freda Institucional');
  if (finalRealizedR >= 2.2) badges.push('Màxim profit d’Impuls');

  return {
    scenarioId: scenario.id,
    mode: 'MANAGEMENT',
    style: scenario.style,
    passed,
    totalScore,
    stars,
    netR: finalRealizedR,
    headline: passed
      ? `Gestió Sòlida sota Pressió (${finalRealizedR >= 0 ? '+' : ''}${finalRealizedR}R)`
      : `La gestió emocional ha reduït l’avantatge (${finalRealizedR >= 0 ? '+' : ''}${finalRealizedR}R)`,
    detailedFeedback:
      notes.length > 0
        ? notes.join(' ')
        : 'Has aguantat els retrocessos sans, has protegit el risc quan l’estructura ho justificava i has extret el potencial del moviment.',
    proTip: scenario.coachingTakeaway,
    badges,
    breakdown: {
      structureScore: Math.round(avgDecisionQuality),
      riskPlacementScore: Math.round(clamp(avgDecisionQuality + 4, 0, 100)),
      executionScore: clamp(Math.round(50 + finalRealizedR * 22), 15, 100),
      disciplineScore: Math.round(avgDecisionQuality),
    },
  };
}

export function evaluateReplayExamAttempt(
  scenario: Scenario,
  stats: {
    tradesTaken: number;
    netR: number;
    maxDrawdownR: number;
    avgRRPlanned: number;
    breachedDrawdown: boolean;
  }
): EvaluationResult {
  const cfg = scenario.replayExamConfig!;
  const metTarget = stats.netR >= cfg.targetNetR;
  const metMinTrades = stats.tradesTaken >= cfg.minTrades;
  const survived = !stats.breachedDrawdown && stats.maxDrawdownR <= cfg.maxDrawdownR;

  let totalScore = 50;
  if (!survived) {
    totalScore = 18;
  } else {
    const rProgress = clamp((stats.netR / Math.max(cfg.targetNetR, 0.5)) * 55, -20, 62);
    const rrQuality = stats.avgRRPlanned >= 2.0 ? 22 : stats.avgRRPlanned >= 1.5 ? 12 : 0;
    const ddControl = stats.maxDrawdownR <= cfg.maxDrawdownR * 0.5 ? 16 : 8;
    totalScore = Math.round(clamp(rProgress + rrQuality + ddControl, 0, 100));
  }

  const passed = survived && metTarget && metMinTrades;
  const stars = scoreToStars(totalScore, passed);

  const badges: string[] = [];
  if (passed) badges.push('Examen Superat');
  if (passed && stats.maxDrawdownR <= 1.2) badges.push('Risc Impecable');

  let headline = '';
  if (!survived) {
    headline = `Límit de Drawdown excedit (-${stats.maxDrawdownR.toFixed(2)}R / màx -${cfg.maxDrawdownR}R)`;
  } else if (!metMinTrades) {
    headline = `Falten operacions mínimes (${stats.tradesTaken}/${cfg.minTrades}) per validar mostra`;
  } else if (passed) {
    headline = `Certificació Superada! +${stats.netR.toFixed(2)}R nets amb DD màxim de -${stats.maxDrawdownR.toFixed(2)}R`;
  } else {
    headline = `Sessió acabada en ${stats.netR >= 0 ? '+' : ''}${stats.netR.toFixed(2)}R (Objectiu: +${cfg.targetNetR}R)`;
  }

  return {
    scenarioId: scenario.id,
    mode: 'REPLAY_EXAM',
    style: scenario.style,
    passed,
    totalScore,
    stars,
    netR: Math.round(stats.netR * 100) / 100,
    headline,
    detailedFeedback: `Operacions executades: ${stats.tradesTaken} | R:R mitjà planificat: ${stats.avgRRPlanned.toFixed(2)}R | Drawdown màxim: -${stats.maxDrawdownR.toFixed(2)}R.`,
    proTip: scenario.coachingTakeaway,
    badges,
    breakdown: {
      structureScore: passed ? 88 : 52,
      riskPlacementScore: clamp(Math.round(stats.avgRRPlanned * 38), 25, 98),
      executionScore: passed ? 90 : 48,
      disciplineScore: survived ? 90 : 15,
    },
  };
}

/**
 * Computes the Live Trading Readiness Passport ("Passaport a Directe")
 * for either SCALP, SWING, or ALL styles.
 */
export function computeReadinessProfile(
  history: HistoryRecord[],
  styleFilter?: TradingStyle
): ReadinessProfile {
  const filtered = styleFilter
    ? history.filter((h) => h.style === styleFilter || (styleFilter !== 'CORE' && h.style === 'CORE' && history.length < 6))
    : history;

  const records = styleFilter
    ? history.filter((h) => h.style === styleFilter)
    : history;

  const activeList = records.length > 0 ? records : filtered;

  if (activeList.length === 0) {
    return {
      overallScore: 0,
      expectancyR: 0,
      winRatePct: 0,
      skipAccuracyPct: 0,
      slQualityPct: 0,
      managementPct: 0,
      maxDrawdownR: 0,
      sampleSize: 0,
      verdictLabel: 'Sense mostra suficient (completa pantalles)',
      strengths: [],
      blindSpots: ['Completa almenys 5 escenaris per calibrar el teu perfil real.'],
    };
  }

  const tradeRecords = activeList.filter((r) => !r.choseSkip);
  const wins = tradeRecords.filter((r) => r.netR > 0);
  const losses = tradeRecords.filter((r) => r.netR < 0);

  const winRate =
    tradeRecords.length > 0 ? wins.length / tradeRecords.length : 0;
  const avgWinR =
    wins.length > 0
      ? wins.reduce((s, r) => s + r.netR, 0) / wins.length
      : 0;
  const avgLossR =
    losses.length > 0
      ? Math.abs(losses.reduce((s, r) => s + r.netR, 0) / losses.length)
      : 0;

  const expectancyR =
    tradeRecords.length > 0
      ? winRate * avgWinR - (1 - winRate) * avgLossR
      : 0;

  // Skip discipline accuracy on trap setups
  const trapOpportunities = activeList.filter((r) => r.wasSkipOptimal);
  const skipAccuracyPct =
    trapOpportunities.length > 0
      ? Math.round(
          (trapOpportunities.filter((r) => r.choseSkip).length /
            trapOpportunities.length) *
            100
        )
      : Math.round(
          activeList.reduce((s, r) => s + r.breakdown.disciplineScore, 0) /
            activeList.length
        );

  const slQualityPct = Math.round(
    activeList.reduce((s, r) => s + r.breakdown.riskPlacementScore, 0) /
      activeList.length
  );

  const mgmtRecords = activeList.filter((r) => r.mode === 'MANAGEMENT');
  const managementPct =
    mgmtRecords.length > 0
      ? Math.round(
          mgmtRecords.reduce((s, r) => s + r.totalScore, 0) / mgmtRecords.length
        )
      : Math.round(
          activeList.reduce((s, r) => s + r.breakdown.executionScore, 0) /
            activeList.length
        );

  // Compute max peak-to-trough equity drawdown in R
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of activeList) {
    equity += r.netR;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
  }

  // Sample confidence factor: reaches 100% weight at 10+ scenarios
  const sampleConfidence = clamp(activeList.length / 10, 0.35, 1.0);
  const avgScore =
    activeList.reduce((s, r) => s + r.totalScore, 0) / activeList.length;
  const expectancyBonus = clamp(expectancyR * 18, -20, 22);
  const ddPenalty = maxDd > 4.5 ? 15 : maxDd > 3.0 ? 6 : 0;

  const overallScore = Math.round(
    clamp((avgScore * 0.78 + expectancyBonus - ddPenalty) * sampleConfidence, 0, 100)
  );

  const strengths: string[] = [];
  const blindSpots: string[] = [];

  if (expectancyR >= 0.45) {
    strengths.push(`Esperança matemàtica positiva sòlida (+${expectancyR.toFixed(2)}R per operació).`);
  } else if (tradeRecords.length >= 3 && expectancyR <= 0) {
    blindSpots.push(`Esperança matemàtica negativa (${expectancyR.toFixed(2)}R): busca ràtios R:R >= 2 i evita entrar tard.`);
  }

  if (slQualityPct >= 78) {
    strengths.push('Col·locació d’Stop Loss estructural darrere les escombrades de liquidesa.');
  } else {
    blindSpots.push('Els teus Stops solen quedar massa enganxats al soroll o mal ubicats respecte a la invalidesa.');
  }

  if (skipAccuracyPct >= 75) {
    strengths.push('Alta disciplina filtrant rangs bruts i trampes (evites l’overtrading).');
  } else {
    blindSpots.push('Tendència a operar trampes on el millor moviment és prémer NO OPERAR.');
  }

  if (managementPct < 68) {
    blindSpots.push('En gestió en viu, protegeixes massa aviat o tanques per pànic durant retrocessos sans.');
  } else if (mgmtRecords.length > 0) {
    strengths.push('Bona sang freda gestionant operacions obertes i parcials.');
  }

  let verdictLabel = 'En formació inicial';
  if (overallScore >= 82 && activeList.length >= 8 && expectancyR >= 0.4) {
    verdictLabel = 'APTE PER A DIRECTE ( Risc Controlat )';
  } else if (overallScore >= 65) {
    verdictLabel = 'A punt per a Paper Trading / Micro-Lotatge';
  } else if (overallScore >= 40) {
    verdictLabel = 'Consolidant Base Tàctica — Continua al Dojo';
  }

  return {
    overallScore,
    expectancyR: Math.round(expectancyR * 100) / 100,
    winRatePct: Math.round(winRate * 100),
    skipAccuracyPct,
    slQualityPct,
    managementPct,
    maxDrawdownR: Math.round(maxDd * 100) / 100,
    sampleSize: activeList.length,
    verdictLabel,
    strengths,
    blindSpots,
  };
}
