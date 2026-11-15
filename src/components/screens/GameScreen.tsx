import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Ban,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Eye,
  FastForward,
  Flame,
  Layers,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  EvaluationResult,
  ManagementAction,
  OrderSetup,
  Scenario,
} from '../../engine/types';
import {
  ManagedStepState,
  advanceManagedTrade,
  calculateOrderMetrics,
} from '../../engine/tradeSimulator';
import {
  evaluateExecutionAttempt,
  evaluateManagementAttempt,
  evaluateRadarAttempt,
  evaluateReplayExamAttempt,
} from '../../engine/scoringEngine';
import {
  aggregateCandlesNoLookahead,
  prepareScenarioForPlay,
  timeframeToSeconds,
} from '../../engine/anonymizer';
import { TacticalChart } from '../chart/TacticalChart';
import { CAMPAIGN_SCENARIOS, generateGymDrillScenario } from '../../data/curatedScenarios';
import { MICRO_LESSONS } from '../../data/lessons';
import { LessonModal } from '../modals/LessonModal';
import {
  calculateCryptoSwingSizing,
  calculateMnqPositionSizing,
} from '../../engine/riskMasterEngine';
import { useGameStore } from '../../store/useGameStore';
import {
  playLossFeedback,
  playOrderExecSound,
  playUiTick,
  playVictoryFeedback,
} from '../../utils/soundHaptics';

export const GameScreen: React.FC = () => {
  const {
    activeScenarioId,
    gymCounter,
    gymStyleFilter,
    gymModeFilter,
    soundEnabled,
    riskSettings,
    completedLessons,
    setActiveTab,
    startCampaignStage,
    nextGymDrill,
    recordAttempt,
    markLessonCompleted,
  } = useGameStore();

  const [retrySeed, setRetrySeed] = useState(0);
  const [showLessonModal, setShowLessonModal] = useState(false);

  // Resolve and prepare active scenario (with anonymization on real historical charts)
  const scenario: Scenario = useMemo(() => {
    const raw =
      activeScenarioId === 'GYM_DRILL' || !activeScenarioId
        ? generateGymDrillScenario({
            styleFilter: gymStyleFilter,
            modeFilter: gymModeFilter,
            counter: gymCounter,
          })
        : CAMPAIGN_SCENARIOS.find((s) => s.id === activeScenarioId) ||
          CAMPAIGN_SCENARIOS[0];

    return prepareScenarioForPlay(raw, {
      seed: (raw.stageNumber || gymCounter + 1) + retrySeed * 13,
    });
  }, [activeScenarioId, gymCounter, gymStyleFilter, gymModeFilter, retrySeed]);

  // Shared UI states
  const [isHtfView, setIsHtfView] = useState(false);
  const [revealedFutureCount, setRevealedFutureCount] = useState(0);
  const [isAnimatingOutcome, setIsAnimatingOutcome] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [xrayMinimized, setXrayMinimized] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // RADAR states
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [tappedPrice, setTappedPrice] = useState<number | null>(null);

  // EXECUTION states
  const [draftOrder, setDraftOrder] = useState<OrderSetup | null>(null);

  // MANAGEMENT states
  const [mgmtStarted, setMgmtStarted] = useState(false);
  const [mgmtCheckpointIdx, setMgmtCheckpointIdx] = useState(0);
  const [mgmtWaitingAction, setMgmtWaitingAction] = useState(false);
  const [mgmtDecisions, setMgmtDecisions] = useState<
    { checkpointId: string; action: ManagementAction }[]
  >([]);
  const [mgmtState, setMgmtState] = useState<ManagedStepState | null>(null);

  // REPLAY EXAM states
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayAutoPlay, setReplayAutoPlay] = useState(false);
  const [replayActiveOrder, setReplayActiveOrder] = useState<{
    order: OrderSetup;
    openedAtIndex: number;
    movedToBE: boolean;
  } | null>(null);
  const [replayStats, setReplayStats] = useState({
    tradesTaken: 0,
    netR: 0,
    peakR: 0,
    maxDrawdownR: 0,
    plannedRRs: [] as number[],
    breachedDrawdown: false,
  });

  // Reset all mode states when scenario changes
  useEffect(() => {
    setIsHtfView(false);
    setRevealedFutureCount(0);
    setIsAnimatingOutcome(false);
    setEvaluation(null);
    setXrayMinimized(false);
    setElapsedSec(0);
    setSelectedChoiceId(null);
    setTappedPrice(null);
    setDraftOrder(null);

    if (scenario.mode === 'MANAGEMENT' && scenario.managementConfig) {
      setMgmtStarted(false);
      setMgmtCheckpointIdx(0);
      setMgmtWaitingAction(false);
      setMgmtDecisions([]);
      setMgmtState({
        activeStopLoss: scenario.managementConfig.initialOrder.stopLoss,
        remainingSize: 1.0,
        realizedR: 0,
        closed: false,
        exitFutureIndex: 0,
      });
    } else {
      setMgmtState(null);
    }

    setReplayIndex(0);
    setReplayAutoPlay(false);
    setReplayActiveOrder(null);
    setReplayStats({
      tradesTaken: 0,
      netR: 0,
      peakR: 0,
      maxDrawdownR: 0,
      plannedRRs: [],
      breachedDrawdown: false,
    });

    // Auto-present the World Masterclass lesson when advancing directly into stage X.1
    if (
      scenario.id.endsWith('_s1') &&
      scenario.worldId >= 1 &&
      !useGameStore.getState().completedLessons.includes(scenario.worldId)
    ) {
      setShowLessonModal(true);
    } else {
      setShowLessonModal(false);
    }
  }, [scenario]);

  // Timer for RADAR and timed SCALP EXECUTION stages
  const timeLimitSec =
    scenario.mode === 'RADAR'
      ? scenario.radarConfig?.timeLimitSec
      : scenario.mode === 'EXECUTION'
        ? scenario.executionBlueprint?.timeLimitSec
        : undefined;

  useEffect(() => {
    if (!timeLimitSec || evaluation || isAnimatingOutcome || showLessonModal)
      return;
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLimitSec, evaluation, isAnimatingOutcome, showLessonModal]);

  // Outcome candle-by-candle reveal animation
  const animTimerRef = useRef<number | null>(null);
  const pendingOnDoneRef = useRef<(() => void) | null>(null);

  const animateFutureTo = useCallback(
    (targetCount: number, onDone: () => void, startFrom = 0) => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setIsAnimatingOutcome(true);
      setIsHtfView(false);
      pendingOnDoneRef.current = onDone;

      const stepMs = 70;
      let current = startFrom;

      const tick = () => {
        current += 1;
        if (current >= targetCount) {
          setRevealedFutureCount(targetCount);
          setIsAnimatingOutcome(false);
          const cb = pendingOnDoneRef.current;
          pendingOnDoneRef.current = null;
          if (cb) cb();
          return;
        }
        setRevealedFutureCount(current);
        animTimerRef.current = window.setTimeout(tick, stepMs);
      };
      animTimerRef.current = window.setTimeout(tick, stepMs);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const finalizeEvaluation = useCallback(
    (
      res: EvaluationResult,
      meta: { choseSkip: boolean; wasSkipOptimal: boolean }
    ) => {
      setEvaluation(res);
      recordAttempt(res, meta);
      if (res.passed) {
        playVictoryFeedback(soundEnabled, res.stars);
      } else {
        playLossFeedback(soundEnabled);
      }
    },
    [recordAttempt, soundEnabled]
  );

  // ============================================================================
  // MODE 1: RADAR HANDLERS
  // ============================================================================
  const handleConfirmRadar = () => {
    if (!scenario.radarConfig || evaluation) return;
    playOrderExecSound(soundEnabled);
    const res = evaluateRadarAttempt(scenario, {
      selectedChoiceId: selectedChoiceId ?? undefined,
      tappedPrice: tappedPrice ?? undefined,
      elapsedSec,
    });
    animateFutureTo(scenario.futureCandles.length, () => {
      finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal: false });
    });
  };

  // ============================================================================
  // MODE 2: EXECUTION HANDLERS
  // ============================================================================
  const initSideOrder = (side: 'LONG' | 'SHORT') => {
    playUiTick(soundEnabled);
    setIsHtfView(false);
    const close =
      scenario.visibleCandles[scenario.visibleCandles.length - 1].close;
    const atr = scenario.atr;
    const decimals = close < 5 ? 4 : close < 50 ? 3 : 2;
    const round = (v: number) =>
      Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);

    if (side === 'LONG') {
      setDraftOrder({
        side: 'LONG',
        entry: close,
        stopLoss: round(close - 1.15 * atr),
        takeProfit: round(close + 2.55 * atr),
        isLimitOrder: false,
      });
    } else {
      setDraftOrder({
        side: 'SHORT',
        entry: close,
        stopLoss: round(close + 1.15 * atr),
        takeProfit: round(close - 2.55 * atr),
        isLimitOrder: false,
      });
    }
  };

  const applyQuickRR = (targetRR: number) => {
    if (!draftOrder) return;
    playUiTick(soundEnabled);
    const risk = Math.abs(draftOrder.entry - draftOrder.stopLoss);
    const decimals = draftOrder.entry < 5 ? 4 : draftOrder.entry < 50 ? 3 : 2;
    const round = (v: number) =>
      Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
    const newTp =
      draftOrder.side === 'LONG'
        ? round(draftOrder.entry + risk * targetRR)
        : round(draftOrder.entry - risk * targetRR);
    setDraftOrder({ ...draftOrder, takeProfit: newTp });
  };

  const handleExecuteSkip = () => {
    if (!scenario.executionBlueprint || evaluation) return;
    playOrderExecSound(soundEnabled);
    const wasSkipOptimal = scenario.executionBlueprint.optimalSide === 'SKIP';
    const res = evaluateExecutionAttempt(scenario, {
      choseSkip: true,
      elapsedSec,
    });
    animateFutureTo(scenario.futureCandles.length, () => {
      finalizeEvaluation(res, { choseSkip: true, wasSkipOptimal });
    });
  };

  const handleExecuteOrder = () => {
    if (!scenario.executionBlueprint || !draftOrder || evaluation) return;
    playOrderExecSound(soundEnabled);
    const wasSkipOptimal = scenario.executionBlueprint.optimalSide === 'SKIP';
    const res = evaluateExecutionAttempt(scenario, {
      choseSkip: false,
      order: draftOrder,
      elapsedSec,
    });
    const targetReveal = Math.min(
      scenario.futureCandles.length,
      (res.simulation?.exitFutureIndex ?? scenario.futureCandles.length - 1) + 4
    );
    animateFutureTo(Math.max(8, targetReveal), () => {
      finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal });
    });
  };

  // ============================================================================
  // MODE 3: LIVE MANAGEMENT HANDLERS
  // ============================================================================
  const runManagementSegment = useCallback(
    (
      fromFutureIdx: number,
      toFutureIdx: number,
      currentState: ManagedStepState,
      actionTaken?: ManagementAction,
      nextCpIdx?: number
    ) => {
      const cfg = scenario.managementConfig!;
      const markCandle =
        fromFutureIdx > 0
          ? scenario.futureCandles[fromFutureIdx - 1]
          : scenario.visibleCandles[scenario.visibleCandles.length - 1];

      const segment = scenario.futureCandles.slice(fromFutureIdx, toFutureIdx);
      const updated = advanceManagedTrade(
        cfg.initialOrder,
        currentState,
        segment,
        fromFutureIdx,
        scenario.atr,
        actionTaken,
        markCandle.close,
        cfg.applyScalpFriction
      );

      const revealTarget = updated.closed
        ? Math.min(scenario.futureCandles.length, updated.exitFutureIndex + 2)
        : toFutureIdx;

      if (actionTaken === 'CLOSE_ALL') {
        setMgmtState(updated);
        const res = evaluateManagementAttempt(
          scenario,
          mgmtDecisions,
          updated.realizedR
        );
        finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal: false });
        return;
      }

      animateFutureTo(
        revealTarget,
        () => {
          setMgmtState(updated);
          if (
            updated.closed ||
            nextCpIdx === undefined ||
            nextCpIdx >= cfg.checkpoints.length
          ) {
            // If still open at very end of futureCandles, mark to market remaining size
            let finalR = updated.realizedR;
            if (!updated.closed && updated.remainingSize > 0) {
              const lastC =
                scenario.futureCandles[scenario.futureCandles.length - 1];
              const risk = Math.abs(
                cfg.initialOrder.entry - cfg.initialOrder.stopLoss
              );
              const dir = cfg.initialOrder.side === 'LONG' ? 1 : -1;
              const floatR = ((lastC.close - cfg.initialOrder.entry) * dir) / risk;
              finalR =
                Math.round((finalR + updated.remainingSize * floatR) * 100) / 100;
            }
            const res = evaluateManagementAttempt(
              scenario,
              mgmtDecisions,
              finalR
            );
            finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal: false });
          } else {
            setMgmtCheckpointIdx(nextCpIdx);
            setMgmtWaitingAction(true);
          }
        },
        fromFutureIdx
      );
    },
    [scenario, animateFutureTo, mgmtDecisions, finalizeEvaluation]
  );

  const handleStartManagement = () => {
    if (!scenario.managementConfig || !mgmtState) return;
    playOrderExecSound(soundEnabled);
    setMgmtStarted(true);
    const firstCp = scenario.managementConfig.checkpoints[0];
    runManagementSegment(0, firstCp.futureCandleCount, mgmtState, undefined, 0);
  };

  const handleManagementDecision = (action: ManagementAction) => {
    if (!scenario.managementConfig || !mgmtState || !mgmtWaitingAction) return;
    playUiTick(soundEnabled);
    setMgmtWaitingAction(false);

    const cfg = scenario.managementConfig;
    const currentCp = cfg.checkpoints[mgmtCheckpointIdx];
    const updatedDecisions = [
      ...mgmtDecisions,
      { checkpointId: currentCp.id, action },
    ];
    setMgmtDecisions(updatedDecisions);

    const nextIdx = mgmtCheckpointIdx + 1;
    const fromIdx = currentCp.futureCandleCount;
    const toIdx =
      nextIdx < cfg.checkpoints.length
        ? cfg.checkpoints[nextIdx].futureCandleCount
        : scenario.futureCandles.length;

    // Pass updatedDecisions directly when closing
    const markCandle = scenario.futureCandles[Math.max(0, fromIdx - 1)];
    const segment = scenario.futureCandles.slice(fromIdx, toIdx);
    const updated = advanceManagedTrade(
      cfg.initialOrder,
      mgmtState,
      segment,
      fromIdx,
      scenario.atr,
      action,
      markCandle.close,
      cfg.applyScalpFriction
    );

    if (action === 'CLOSE_ALL') {
      setMgmtState(updated);
      const res = evaluateManagementAttempt(
        scenario,
        updatedDecisions,
        updated.realizedR
      );
      finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal: false });
      return;
    }

    const revealTarget = updated.closed
      ? Math.min(scenario.futureCandles.length, updated.exitFutureIndex + 2)
      : toIdx;

    animateFutureTo(
      revealTarget,
      () => {
        setMgmtState(updated);
        if (updated.closed || nextIdx >= cfg.checkpoints.length) {
          let finalR = updated.realizedR;
          if (!updated.closed && updated.remainingSize > 0) {
            const lastC =
              scenario.futureCandles[scenario.futureCandles.length - 1];
            const risk = Math.abs(
              cfg.initialOrder.entry - cfg.initialOrder.stopLoss
            );
            const dir = cfg.initialOrder.side === 'LONG' ? 1 : -1;
            const floatR = ((lastC.close - cfg.initialOrder.entry) * dir) / risk;
            finalR =
              Math.round((finalR + updated.remainingSize * floatR) * 100) / 100;
          }
          const res = evaluateManagementAttempt(
            scenario,
            updatedDecisions,
            finalR
          );
          finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal: false });
        } else {
          setMgmtCheckpointIdx(nextIdx);
          setMgmtWaitingAction(true);
        }
      },
      fromIdx
    );
  };

  // ============================================================================
  // MODE 4: REPLAY EXAM HANDLERS
  // ============================================================================
  const finishReplaySession = useCallback(
    (statsSnapshot: typeof replayStats) => {
      setReplayAutoPlay(false);
      const avgRR =
        statsSnapshot.plannedRRs.length > 0
          ? statsSnapshot.plannedRRs.reduce((a, b) => a + b, 0) /
            statsSnapshot.plannedRRs.length
          : 0;
      const res = evaluateReplayExamAttempt(scenario, {
        tradesTaken: statsSnapshot.tradesTaken,
        netR: statsSnapshot.netR,
        maxDrawdownR: statsSnapshot.maxDrawdownR,
        avgRRPlanned: avgRR,
        breachedDrawdown: statsSnapshot.breachedDrawdown,
      });
      finalizeEvaluation(res, { choseSkip: false, wasSkipOptimal: false });
    },
    [scenario, finalizeEvaluation]
  );

  const stepReplayForward = useCallback(
    (steps = 1) => {
      if (!scenario.replayExamConfig || evaluation) return;
      const cfg = scenario.replayExamConfig;
      const maxSteps = scenario.futureCandles.length;

      let nextIdx = replayIndex;
      let activeOrd = replayActiveOrder;
      let stats = { ...replayStats };

      for (let s = 0; s < steps; s++) {
        if (nextIdx >= maxSteps) break;
        const c = scenario.futureCandles[nextIdx];
        nextIdx++;

        if (activeOrd) {
          const ord = activeOrd.order;
          const metrics = calculateOrderMetrics(
            ord,
            scenario.atr,
            cfg.applyScalpFriction
          );
          const effectiveSL = activeOrd.movedToBE ? ord.entry : ord.stopLoss;
          const hitSL =
            ord.side === 'LONG' ? c.low <= effectiveSL : c.high >= effectiveSL;
          const hitTP =
            ord.side === 'LONG'
              ? c.high >= ord.takeProfit
              : c.low <= ord.takeProfit;

          if (hitSL) {
            const deltaR = activeOrd.movedToBE
              ? -metrics.frictionR
              : -1 - metrics.frictionR;
            const newNet = Math.round((stats.netR + deltaR) * 100) / 100;
            const newPeak = Math.max(stats.peakR, newNet);
            const dd = Math.round((newPeak - newNet) * 100) / 100;
            stats = {
              ...stats,
              netR: newNet,
              peakR: newPeak,
              maxDrawdownR: Math.max(stats.maxDrawdownR, dd),
              breachedDrawdown:
                stats.breachedDrawdown || dd > cfg.maxDrawdownR,
            };
            activeOrd = null;
          } else if (hitTP) {
            const deltaR = metrics.grossRR - metrics.frictionR;
            const newNet = Math.round((stats.netR + deltaR) * 100) / 100;
            const newPeak = Math.max(stats.peakR, newNet);
            stats = {
              ...stats,
              netR: newNet,
              peakR: newPeak,
            };
            activeOrd = null;
          }
        }

        if (stats.breachedDrawdown) break;
      }

      setReplayIndex(nextIdx);
      setReplayActiveOrder(activeOrd);
      setReplayStats(stats);

      if (stats.breachedDrawdown || nextIdx >= maxSteps) {
        // Close any still-open trade at final mark price before grading
        if (activeOrd && !stats.breachedDrawdown) {
          const lastC = scenario.futureCandles[nextIdx - 1];
          const ord = activeOrd.order;
          const metrics = calculateOrderMetrics(
            ord,
            scenario.atr,
            cfg.applyScalpFriction
          );
          const dir = ord.side === 'LONG' ? 1 : -1;
          const rawR = ((lastC.close - ord.entry) * dir) / metrics.riskDistance;
          const deltaR = rawR - metrics.frictionR;
          const newNet = Math.round((stats.netR + deltaR) * 100) / 100;
          const newPeak = Math.max(stats.peakR, newNet);
          const dd = Math.round((newPeak - newNet) * 100) / 100;
          stats = {
            ...stats,
            netR: newNet,
            peakR: newPeak,
            maxDrawdownR: Math.max(stats.maxDrawdownR, dd),
          };
          setReplayActiveOrder(null);
          setReplayStats(stats);
        }
        finishReplaySession(stats);
      }
    },
    [
      scenario,
      evaluation,
      replayIndex,
      replayActiveOrder,
      replayStats,
      finishReplaySession,
    ]
  );

  useEffect(() => {
    if (!replayAutoPlay || evaluation || scenario.mode !== 'REPLAY_EXAM') return;
    const t = setInterval(() => {
      stepReplayForward(1);
    }, 420);
    return () => clearInterval(t);
  }, [replayAutoPlay, evaluation, scenario.mode, stepReplayForward]);

  const handleOpenReplayOrder = () => {
    if (!draftOrder || replayActiveOrder || !scenario.replayExamConfig) return;
    const m = calculateOrderMetrics(
      draftOrder,
      scenario.atr,
      scenario.replayExamConfig.applyScalpFriction
    );
    if (!m.valid) return;
    playOrderExecSound(soundEnabled);
    setReplayActiveOrder({
      order: draftOrder,
      openedAtIndex: replayIndex,
      movedToBE: false,
    });
    setReplayStats((prev) => ({
      ...prev,
      tradesTaken: prev.tradesTaken + 1,
      plannedRRs: [...prev.plannedRRs, m.netRR],
    }));
    setDraftOrder(null);
  };

  const handleReplayCloseMarket = () => {
    if (!replayActiveOrder || !scenario.replayExamConfig) return;
    playUiTick(soundEnabled);
    const currentCandle =
      replayIndex > 0
        ? scenario.futureCandles[replayIndex - 1]
        : scenario.visibleCandles[scenario.visibleCandles.length - 1];
    const ord = replayActiveOrder.order;
    const m = calculateOrderMetrics(
      ord,
      scenario.atr,
      scenario.replayExamConfig.applyScalpFriction
    );
    const dir = ord.side === 'LONG' ? 1 : -1;
    const rawR = ((currentCandle.close - ord.entry) * dir) / m.riskDistance;
    const deltaR = rawR - m.frictionR;
    const newNet = Math.round((replayStats.netR + deltaR) * 100) / 100;
    const newPeak = Math.max(replayStats.peakR, newNet);
    const dd = Math.round((newPeak - newNet) * 100) / 100;
    setReplayStats({
      ...replayStats,
      netR: newNet,
      peakR: newPeak,
      maxDrawdownR: Math.max(replayStats.maxDrawdownR, dd),
    });
    setReplayActiveOrder(null);
  };

  // ============================================================================
  // COMPUTED CHART SERIES & METRICS
  // ============================================================================
  const activeLtfCandles = useMemo(() => {
    const count =
      scenario.mode === 'REPLAY_EXAM' ? replayIndex : revealedFutureCount;
    if (count <= 0) return scenario.visibleCandles;
    return [
      ...scenario.visibleCandles,
      ...scenario.futureCandles.slice(0, count),
    ];
  }, [scenario, replayIndex, revealedFutureCount]);

  const activeCandlesForChart = useMemo(() => {
    if (!isHtfView || !scenario.htfTimeframe) return activeLtfCandles;
    if (
      scenario.mode !== 'REPLAY_EXAM' &&
      revealedFutureCount === 0 &&
      scenario.htfVisibleCandles &&
      scenario.htfVisibleCandles.length > 0
    ) {
      return scenario.htfVisibleCandles;
    }
    const groupSize = scenario.replayExamConfig?.htfGroupSize ?? 4;
    return aggregateCandlesNoLookahead(
      activeLtfCandles,
      groupSize,
      timeframeToSeconds(scenario.htfTimeframe)
    );
  }, [isHtfView, scenario, activeLtfCandles, revealedFutureCount]);

  const currentPrice = activeLtfCandles[activeLtfCandles.length - 1].close;

  const initReplayDraftSide = (side: 'LONG' | 'SHORT') => {
    playUiTick(soundEnabled);
    setIsHtfView(false);
    const atr = scenario.atr;
    const decimals = currentPrice < 5 ? 4 : currentPrice < 50 ? 3 : 2;
    const round = (v: number) =>
      Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
    setDraftOrder({
      side,
      entry: currentPrice,
      stopLoss:
        side === 'LONG'
          ? round(currentPrice - 1.15 * atr)
          : round(currentPrice + 1.15 * atr),
      takeProfit:
        side === 'LONG'
          ? round(currentPrice + 2.4 * atr)
          : round(currentPrice - 2.4 * atr),
    });
  };

  const displayedOrder: OrderSetup | null = useMemo(() => {
    if (scenario.mode === 'MANAGEMENT' && scenario.managementConfig) {
      return {
        ...scenario.managementConfig.initialOrder,
        stopLoss:
          mgmtState?.activeStopLoss ??
          scenario.managementConfig.initialOrder.stopLoss,
      };
    }
    if (scenario.mode === 'REPLAY_EXAM') {
      if (replayActiveOrder) {
        return {
          ...replayActiveOrder.order,
          stopLoss: replayActiveOrder.movedToBE
            ? replayActiveOrder.order.entry
            : replayActiveOrder.order.stopLoss,
        };
      }
      return draftOrder;
    }
    return draftOrder;
  }, [scenario, mgmtState, replayActiveOrder, draftOrder]);

  const displayedOrderMetrics = useMemo(() => {
    if (!displayedOrder) return null;
    const applyFriction =
      scenario.executionBlueprint?.applyScalpFriction ||
      scenario.managementConfig?.applyScalpFriction ||
      scenario.replayExamConfig?.applyScalpFriction ||
      scenario.style === 'SCALP';
    return calculateOrderMetrics(displayedOrder, scenario.atr, applyFriction);
  }, [displayedOrder, scenario]);

  const livePositionSizingSummary = useMemo(() => {
    if (!draftOrder || !displayedOrderMetrics || !displayedOrderMetrics.valid) {
      return null;
    }
    if (scenario.style === 'SCALP') {
      const estMnqPts = Math.max(
        4,
        Math.round(displayedOrderMetrics.slInAtr * 18)
      );
      const mnq = calculateMnqPositionSizing({
        accountMode: riskSettings.mnqAccountMode,
        nominalCapitalUsd: riskSettings.mnqNominalCapitalUsd,
        propDrawdownBufferUsd: riskSettings.mnqPropBufferUsd,
        riskPct: riskSettings.mnqRiskPct,
        stopLossPoints: estMnqPts,
        targetRR: displayedOrderMetrics.grossRR,
      });
      return {
        tag: 'MNQ DOM',
        text:
          mnq.recommendedContracts > 0
            ? `${mnq.recommendedContracts} contractes MNQ (~${estMnqPts}pt SL · 1R = ${mnq.actualDollarRiskUsd.toFixed(0)}$)`
            : `0 MNQ (SL ~${estMnqPts}pt massa ampli per ${mnq.maxAllowedRiskUsd.toFixed(0)}$ de risc)`,
        warn: mnq.recommendedContracts === 0,
      };
    }

    const cry = calculateCryptoSwingSizing({
      capitalUsdt: riskSettings.cryptoCapitalUsdt,
      riskPct: riskSettings.cryptoRiskPct,
      entryPrice: draftOrder.entry,
      stopLossPrice: draftOrder.stopLoss,
      takeProfitPrice: draftOrder.takeProfit,
    });
    if (!cry.valid) return null;
    return {
      tag: 'CRIPTO USDT',
      text: `Posició ${Math.round(cry.positionSizeUsdt).toLocaleString('ca-ES')} USDT (SL -${cry.slDistancePct}% · 1R = ${cry.maxRiskUsdt.toFixed(0)} USDT · Lev <=${cry.maxSafeIsolatedLeverage}x)`,
      warn: false,
    };
  }, [draftOrder, displayedOrderMetrics, scenario.style, riskSettings]);

  const visibleAnnotations = useMemo(() => {
    if (evaluation) {
      return [
        ...(scenario.preAnnotations ?? []),
        ...scenario.xrayAnnotations,
      ];
    }
    return scenario.preAnnotations ?? [];
  }, [evaluation, scenario]);

  // Navigation to next campaign stage
  const nextCampaignScenario = useMemo(() => {
    if (!scenario.stageNumber) return null;
    return (
      CAMPAIGN_SCENARIOS.find(
        (s) => s.stageNumber === scenario.stageNumber + 1
      ) ?? null
    );
  }, [scenario.stageNumber]);

  const remainingTime =
    timeLimitSec !== undefined ? Math.max(0, timeLimitSec - elapsedSec) : null;

  const currentWorldLesson = useMemo(() => {
    const targetWorldId =
      scenario.worldId && scenario.worldId >= 1 && scenario.worldId <= 6
        ? scenario.worldId
        : scenario.style === 'SCALP'
          ? 4
          : scenario.style === 'SWING'
            ? 5
            : 1;
    return (
      MICRO_LESSONS.find((l) => l.worldId === targetWorldId) ?? MICRO_LESSONS[0]
    );
  }, [scenario.worldId, scenario.style]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#070B12] text-slate-100 overflow-hidden">
      {/* =================================================================== */}
      {/* TOP TACTICAL HUD                                                    */}
      {/* =================================================================== */}
      <header className="shrink-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-[#0B111E] border-b border-slate-800/90 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() =>
              setActiveTab(scenario.stageNumber > 0 ? 'CAMPAIGN' : 'GYM')
            }
            className="p-2 -ml-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95"
            aria-label="Tornar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                  scenario.style === 'SCALP'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : scenario.style === 'SWING'
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {scenario.style}
              </span>
              <span className="text-xs font-bold text-white truncate">
                {scenario.title}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {scenario.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* In-game Masterclass Reference Button */}
          <button
            type="button"
            onClick={() => {
              playUiTick(soundEnabled);
              setShowLessonModal(true);
            }}
            title="Consultar la lliçó del mòdul"
            aria-label="Teoria del mòdul"
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 text-xs font-bold flex items-center gap-1 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Teoria</span>
          </button>

          {/* Timer Pill for Radar / Scalp */}
          {remainingTime !== null && !evaluation && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-bold border ${
                remainingTime <= 6
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500 animate-pulse'
                  : 'bg-slate-900 text-amber-300 border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{remainingTime}s</span>
            </div>
          )}

          {/* Multi-Timeframe LTF <-> HTF Toggle */}
          {scenario.htfTimeframe ? (
            <div className="flex items-center rounded-xl bg-slate-900 p-0.5 border border-slate-700/80">
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  setIsHtfView(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  !isHtfView
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {scenario.timeframe}
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  setIsHtfView(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  isHtfView
                    ? 'bg-violet-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                {scenario.htfTimeframe}
              </button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-300">
              {scenario.timeframe}
            </span>
          )}
        </div>
      </header>

      {/* =================================================================== */}
      {/* REPLAY EXAM STATUS BAR (Drawdown & Target Net R)                    */}
      {/* =================================================================== */}
      {scenario.mode === 'REPLAY_EXAM' && scenario.replayExamConfig && (
        <div className="shrink-0 px-3 py-1.5 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span>
              Balanç:{' '}
              <strong
                className={
                  replayStats.netR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                {replayStats.netR >= 0 ? '+' : ''}
                {replayStats.netR.toFixed(2)}R
              </strong>{' '}
              <span className="text-slate-500">
                / +{scenario.replayExamConfig.targetNetR}R
              </span>
            </span>
            <span>
              DD:{' '}
              <strong
                className={
                  replayStats.maxDrawdownR >
                  scenario.replayExamConfig.maxDrawdownR * 0.7
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }
              >
                -{replayStats.maxDrawdownR.toFixed(2)}R
              </strong>
              <span className="text-slate-500">
                /-{scenario.replayExamConfig.maxDrawdownR}R
              </span>
            </span>
          </div>
          <span className="text-slate-400">
            Espelma {replayIndex}/{scenario.futureCandles.length}
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* INTERACTIVE CHART AREA                                              */}
      {/* =================================================================== */}
      <div className="relative flex-1 min-h-[220px] w-full">
        <TacticalChart
          candles={activeCandlesForChart}
          decisionBoundaryIndex={
            revealedFutureCount > 0 || replayIndex > 0
              ? scenario.visibleCandles.length
              : undefined
          }
          annotations={visibleAnnotations}
          showAnnotations={visibleAnnotations.length > 0}
          isHtfView={isHtfView}
          order={displayedOrder}
          orderMetrics={displayedOrderMetrics}
          orderInteractive={
            !evaluation &&
            !isAnimatingOutcome &&
            ((scenario.mode === 'EXECUTION' && Boolean(draftOrder)) ||
              (scenario.mode === 'REPLAY_EXAM' &&
                Boolean(draftOrder) &&
                !replayActiveOrder))
          }
          allowEntryDrag={scenario.mode === 'EXECUTION'}
          onOrderChange={setDraftOrder}
          activeManagedStopLoss={
            scenario.mode === 'MANAGEMENT' && mgmtState && !mgmtState.closed
              ? mgmtState.activeStopLoss
              : null
          }
          radarChoices={
            scenario.mode === 'RADAR' && !evaluation
              ? scenario.radarConfig?.choices
              : []
          }
          selectedRadarChoiceId={selectedChoiceId}
          onSelectRadarChoice={(id) => {
            playUiTick(soundEnabled);
            setSelectedChoiceId(id);
            setTappedPrice(null);
          }}
          allowPriceTap={
            scenario.mode === 'RADAR' &&
            !evaluation &&
            Boolean(scenario.radarConfig?.priceTapTarget)
          }
          tappedPrice={tappedPrice}
          onTapPrice={(price) => {
            playUiTick(soundEnabled);
            setTappedPrice(price);
          }}
        />
      </div>

      {/* =================================================================== */}
      {/* BOTTOM ACTION DECK OR POST-DECISION X-RAY DEBRIEF                   */}
      {/* =================================================================== */}
      {!evaluation ? (
        <div className="shrink-0 bg-[#0B111E] border-t border-slate-800/90 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isAnimatingOutcome ? (
            <div className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-cyan-300">
                <Zap className="w-4 h-4 animate-bounce" />
                <span>Reproduint desenllaç del mercat...</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (animTimerRef.current) clearTimeout(animTimerRef.current);
                  setRevealedFutureCount(scenario.futureCandles.length);
                  setIsAnimatingOutcome(false);
                  const cb = pendingOnDoneRef.current;
                  pendingOnDoneRef.current = null;
                  if (cb) cb();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
              >
                Avançar ràpid
              </button>
            </div>
          ) : scenario.mode === 'RADAR' && scenario.radarConfig ? (
            /* ---------------- RADAR DECK ---------------- */
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-200 leading-snug">
                {scenario.radarConfig.prompt}
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-[155px] overflow-y-auto pr-0.5">
                {scenario.radarConfig.choices.map((ch) => {
                  const active = selectedChoiceId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        playUiTick(soundEnabled);
                        setSelectedChoiceId(ch.id);
                        setTappedPrice(null);
                      }}
                      className={`text-left px-3 py-2 rounded-xl border transition flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-snug">
                          {ch.label}
                        </div>
                        {ch.sublabel && (
                          <div className="text-[10.5px] text-slate-400 truncate">
                            {ch.sublabel}
                          </div>
                        )}
                      </div>
                      {ch.chartAnchor && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold">
                          [{ch.chartAnchor.badge}]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!selectedChoiceId && tappedPrice === null}
                onClick={handleConfirmRadar}
                className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 transition shadow-lg shadow-amber-500/10"
              >
                Confirmar Lectura Visual
              </button>
            </div>
          ) : scenario.mode === 'EXECUTION' ? (
            /* ---------------- EXECUTION R:R DECK ---------------- */
            <div className="space-y-2">
              {draftOrder && displayedOrderMetrics ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400">R:R ràpid:</span>
                      {[2, 2.5, 3].map((rr) => (
                        <button
                          key={rr}
                          type="button"
                          onClick={() => applyQuickRR(rr)}
                          className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-semibold"
                        >
                          {rr}R
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setDraftOrder({
                            ...draftOrder,
                            entry: currentPrice,
                            isLimitOrder: false,
                          })
                        }
                        className={`px-2 py-0.5 rounded-md font-semibold ${
                          !draftOrder.isLimitOrder
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Mercat
                      </button>
                    </div>
                    <span className="font-mono text-slate-300">
                      Fricció: -{displayedOrderMetrics.frictionR}R
                    </span>
                  </div>

                  {livePositionSizingSummary && (
                    <div
                      className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-mono flex items-center justify-between gap-2 ${
                        livePositionSizingSummary.warn
                          ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                          : 'bg-slate-900/95 border-slate-800 text-cyan-200'
                      }`}
                    >
                      <span className="font-bold uppercase tracking-wider text-emerald-400 shrink-0">
                        {livePositionSizingSummary.tag}:
                      </span>
                      <span className="truncate">
                        {livePositionSizingSummary.text}
                      </span>
                    </div>
                  )}

                  {displayedOrderMetrics.warning && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-200">
                      ⚠️ {displayedOrderMetrics.warning}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11.5px] text-slate-400 text-center">
                  Analitza estructura i liquidesa: obre posició (i arrossega{' '}
                  <strong className="text-slate-200">SL / TP</strong> al gràfic)
                  o descarta el setup si és una trampa.
                </p>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => initSideOrder('LONG')}
                  className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition active:scale-95 ${
                    draftOrder?.side === 'LONG'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  LONG
                </button>

                <button
                  type="button"
                  onClick={() => initSideOrder('SHORT')}
                  className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition active:scale-95 ${
                    draftOrder?.side === 'SHORT'
                      ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                      : 'bg-rose-950/50 text-rose-300 border-rose-500/40 hover:bg-rose-950'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  SHORT
                </button>

                <button
                  type="button"
                  onClick={handleExecuteSkip}
                  className="py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/35 transition active:scale-95"
                >
                  <Ban className="w-3.5 h-3.5 shrink-0" />
                  <span>NO OPERAR</span>
                </button>
              </div>

              {draftOrder && (
                <button
                  type="button"
                  disabled={!displayedOrderMetrics?.valid}
                  onClick={handleExecuteOrder}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 disabled:opacity-40 text-slate-950 shadow-lg transition active:scale-[0.99]"
                >
                  Executar {draftOrder.side} ({displayedOrderMetrics?.netRR}R net)
                </button>
              )}
            </div>
          ) : scenario.mode === 'MANAGEMENT' &&
            scenario.managementConfig &&
            mgmtState ? (
            /* ---------------- LIVE MANAGEMENT DECK ---------------- */
            <div className="space-y-2">
              {!mgmtStarted ? (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {scenario.managementConfig.contextSummary}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartManagement}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Evolució de l’Operació
                  </button>
                </>
              ) : mgmtWaitingAction ? (
                <>
                  <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span>
                      Mida viva:{' '}
                      <strong className="text-cyan-300">
                        {Math.round(mgmtState.remainingSize * 100)}%
                      </strong>
                    </span>
                    <span>
                      Assegurat:{' '}
                      <strong className="text-emerald-400">
                        {mgmtState.realizedR >= 0 ? '+' : ''}
                        {mgmtState.realizedR}R
                      </strong>
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-amber-200 leading-snug">
                    {
                      scenario.managementConfig.checkpoints[mgmtCheckpointIdx]
                        ?.prompt
                    }
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleManagementDecision('HOLD')}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                    >
                      ✊ AGUANTAR (Hold)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManagementDecision('MOVE_BE')}
                      className="py-2.5 px-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/50 text-xs font-bold text-cyan-200"
                    >
                      🛡️ MOURE SL A BE
                    </button>
                    <button
                      type="button"
                      disabled={mgmtState.remainingSize <= 0.51}
                      onClick={() => handleManagementDecision('PARTIAL_50')}
                      className="py-2.5 px-3 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 disabled:opacity-40 border border-emerald-500/50 text-xs font-bold text-emerald-200"
                    >
                      💰 PARCIAL 50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManagementDecision('CLOSE_ALL')}
                      className="py-2.5 px-3 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/50 text-xs font-bold text-rose-200"
                    >
                      ✕ TANCAR TOT ARA
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            /* ---------------- REPLAY EXAM DECK ---------------- */
            <div className="space-y-2">
              {replayIndex === 0 &&
                !draftOrder &&
                !replayActiveOrder &&
                scenario.replayExamConfig?.briefing && (
                  <p className="text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 leading-snug">
                    {scenario.replayExamConfig.briefing}
                  </p>
                )}
              {/* Playback transport controls */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playUiTick(soundEnabled);
                      stepReplayForward(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 flex items-center gap-1"
                  >
                    +1 Espelma
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playUiTick(soundEnabled);
                      stepReplayForward(5);
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplayAutoPlay((v) => !v)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                      replayAutoPlay
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    {replayAutoPlay ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pausa
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Auto
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => finishReplaySession(replayStats)}
                  className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white"
                >
                  Finalitzar
                </button>
              </div>

              {replayActiveOrder ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={replayActiveOrder.movedToBE}
                    onClick={() => {
                      playUiTick(soundEnabled);
                      setReplayActiveOrder({
                        ...replayActiveOrder,
                        movedToBE: true,
                      });
                    }}
                    className="py-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/50 disabled:opacity-40 text-xs font-bold text-cyan-200"
                  >
                    🛡️ Protegir SL a Break-Even
                  </button>
                  <button
                    type="button"
                    onClick={handleReplayCloseMarket}
                    className="py-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs font-bold text-rose-200"
                  >
                    ✕ Tancar a Mercat
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => initReplayDraftSide('LONG')}
                      className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                        draftOrder?.side === 'LONG'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" /> Preparar LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => initReplayDraftSide('SHORT')}
                      className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                        draftOrder?.side === 'SHORT'
                          ? 'bg-rose-500 text-white border-rose-400'
                          : 'bg-rose-950/50 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4" /> Preparar SHORT
                    </button>
                  </div>

                  {draftOrder && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDraftOrder(null)}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 text-xs text-slate-300"
                      >
                        Cancel·lar
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenReplayOrder}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Obrir {draftOrder.side} ({displayedOrderMetrics?.netRR}R)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* POST-DECISION X-RAY DEBRIEFING PANEL (Collapsible to inspect chart!) */
        /* =================================================================== */
        <div className="shrink-0 bg-[#0D1526] border-t-2 border-cyan-500/50 px-3.5 pt-2.5 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[54dvh] overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`text-lg ${
                      n <= evaluation.stars ? 'text-amber-400' : 'text-slate-700'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                  evaluation.passed
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {evaluation.totalScore}/100 pts ·{' '}
                {evaluation.netR >= 0 ? '+' : ''}
                {evaluation.netR}R
              </span>
            </div>

            <button
              type="button"
              onClick={() => setXrayMinimized((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-[11px] font-semibold text-cyan-300"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{xrayMinimized ? 'Veure Diagnòstic' : 'Mirar Raigs X'}</span>
              {xrayMinimized ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <h3 className="mt-1 text-sm font-bold text-white">
            {evaluation.headline}
          </h3>

          {!xrayMinimized && (
            <div className="mt-2 space-y-2.5">
              {/* Real Historical Asset Reveal Badge */}
              {scenario.revealMeta?.isRealHistorical && (
                <div className="px-2.5 py-1.5 rounded-xl bg-violet-950/45 border border-violet-500/40 flex items-center justify-between text-[11px]">
                  <span className="text-violet-200 font-semibold">
                    🔓 Mercat Real Desvetllat:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {scenario.revealMeta.realAsset} ·{' '}
                    {scenario.revealMeta.realDateLabel}
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed">
                {evaluation.detailedFeedback}
              </p>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11.5px] text-cyan-200 leading-relaxed">
                <strong className="text-cyan-400">Lliçó Clau Pro: </strong>
                {evaluation.proTip}
              </div>

              {evaluation.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {evaluation.badges.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[10.5px] font-bold"
                    >
                      <Award className="w-3 h-3" /> {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playUiTick(soundEnabled);
                setRetrySeed((s) => s + 1);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Repetir
            </button>

            {activeScenarioId === 'GYM_DRILL' ? (
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  nextGymDrill();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Flame className="w-4 h-4" />
                Següent Ronda del Gimnàs
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : nextCampaignScenario ? (
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  startCampaignStage(nextCampaignScenario.id);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <ShieldCheck className="w-4 h-4" />
                Següent Pantalla ({nextCampaignScenario.stageNumber}/
                {CAMPAIGN_SCENARIOS.length})
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('PASSPORT')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                Veure Passaport a Directe
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {showLessonModal && (
        <LessonModal
          lesson={currentWorldLesson}
          actionLabel={
            completedLessons.includes(currentWorldLesson.worldId)
              ? 'Tornar al Gràfic'
              : 'Entès · Passar a l’Acció'
          }
          onClose={() => setShowLessonModal(false)}
          onComplete={() => {
            markLessonCompleted(currentWorldLesson.worldId);
          }}
        />
      )}
    </div>
  );
};
