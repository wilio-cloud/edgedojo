export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';
export type TradingStyle = 'CORE' | 'SCALP' | 'SWING';
export type MarketCategory = 'CRYPTO' | 'INDICES' | 'FOREX' | 'COMMODITIES' | 'SYNTHETIC_GUIDED';
export type GameMode = 'RADAR' | 'EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM';
export type ManagementAction = 'HOLD' | 'MOVE_BE' | 'PARTIAL_50' | 'CLOSE_ALL';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TacticalAnnotation {
  id: string;
  kind:
    | 'BOS'
    | 'CHOCH'
    | 'FVG'
    | 'LIQUIDITY_POOL'
    | 'SWEEP'
    | 'SUPPLY_ZONE'
    | 'DEMAND_ZONE'
    | 'SR_LEVEL';
  priceTop: number;
  priceBottom?: number;
  startIndex: number;
  endIndex: number;
  label: string;
  tone?: 'bull' | 'bear' | 'liquidity' | 'neutral';
}

export interface OrderSetup {
  side: 'LONG' | 'SHORT';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  isLimitOrder?: boolean;
}

export interface RadarChoice {
  id: string;
  label: string;
  sublabel?: string;
  /** Optional chart marker coordinate so user can tap directly on the chart! */
  chartAnchor?: {
    candleIndex: number;
    price: number;
    badge: string;
  };
  isCorrect: boolean;
  feedback: string;
}

export interface RadarConfig {
  prompt: string;
  timeLimitSec: number;
  /** Optional direct price-level tap target on the chart */
  priceTapTarget?: {
    idealPrice: number;
    toleranceAtr: number;
    targetLabel: string;
  };
  choices: RadarChoice[];
}

export interface ExecutionBlueprint {
  optimalSide: 'LONG' | 'SHORT' | 'SKIP';
  invalidationPrice: number;
  slToleranceAtr: number;
  logicalTargetPrice: number;
  minAcceptableRR: number;
  timeLimitSec?: number;
  applyScalpFriction?: boolean;
  trapExplanation?: string;
}

export interface ManagementCheckpoint {
  id: string;
  futureCandleCount: number; // Number of future candles revealed at this pause
  prompt: string;
  optimalActions: ManagementAction[];
  acceptableActions?: ManagementAction[];
  coachingNote: string;
}

export interface ManagementConfig {
  initialOrder: OrderSetup;
  contextSummary: string;
  applyScalpFriction?: boolean;
  checkpoints: ManagementCheckpoint[];
}

export interface ReplayExamConfig {
  maxDrawdownR: number;
  targetNetR: number;
  minTrades: number;
  htfGroupSize: number;
  applyScalpFriction?: boolean;
  briefing: string;
}

export interface Scenario {
  id: string;
  worldId: number;
  stageNumber: number; // 1..30 in campaign, or 0 for dynamic gym drills
  title: string;
  subtitle: string;
  mode: GameMode;
  style: TradingStyle;
  marketCategory: MarketCategory;
  timeframe: Timeframe;
  htfTimeframe?: Timeframe;
  visibleCandles: Candle[];
  futureCandles: Candle[];
  htfVisibleCandles?: Candle[];
  atr: number;
  /** Revealed only AFTER completing the scenario! */
  revealMeta?: {
    realAsset: string;
    realDateLabel: string;
    isRealHistorical: boolean;
  };
  /** Pre-decision hints (only in early guided levels) */
  preAnnotations?: TacticalAnnotation[];
  /** Post-decision X-Ray institutional annotations */
  xrayAnnotations: TacticalAnnotation[];
  coachingTakeaway: string;
  radarConfig?: RadarConfig;
  executionBlueprint?: ExecutionBlueprint;
  managementConfig?: ManagementConfig;
  replayExamConfig?: ReplayExamConfig;
}

export interface TradeSimulationResult {
  triggered: boolean;
  outcome: 'TP_HIT' | 'SL_HIT' | 'BE_HIT' | 'TIMEOUT_OPEN' | 'MISSED_LIMIT';
  grossRR: number;
  frictionR: number;
  netR: number;
  exitPrice: number;
  exitFutureIndex: number;
  maxFavorableExcursionR: number;
  maxAdverseExcursionR: number;
  ambiguousCandleSlFirstApplied: boolean;
}

export interface ScoreBreakdown {
  structureScore: number; // 0..100
  riskPlacementScore: number; // 0..100
  executionScore: number; // 0..100
  disciplineScore: number; // 0..100
}

export interface EvaluationResult {
  scenarioId: string;
  mode: GameMode;
  style: TradingStyle;
  passed: boolean;
  totalScore: number; // 0..100
  stars: 0 | 1 | 2 | 3;
  netR: number;
  headline: string;
  detailedFeedback: string;
  proTip: string;
  badges: string[];
  breakdown: ScoreBreakdown;
  simulation?: TradeSimulationResult;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  scenarioId: string;
  mode: GameMode;
  style: TradingStyle;
  choseSkip: boolean;
  wasSkipOptimal: boolean;
  totalScore: number;
  stars: 0 | 1 | 2 | 3;
  netR: number;
  breakdown: ScoreBreakdown;
}

export interface ReadinessProfile {
  overallScore: number; // 0..100
  expectancyR: number;
  winRatePct: number;
  skipAccuracyPct: number;
  slQualityPct: number;
  managementPct: number;
  maxDrawdownR: number;
  sampleSize: number;
  verdictLabel: string;
  strengths: string[];
  blindSpots: string[];
}

export interface MicroLessonSection {
  heading: string;
  body: string;
}

export interface MicroLesson {
  worldId: number;
  title: string;
  subtitle: string;
  readTimeSec: number;
  diagramType:
    | 'STRUCTURE_BOS_CHOCH'
    | 'LIQUIDITY_SWEEP'
    | 'ASYMMETRIC_RR'
    | 'SCALP_FRICTION'
    | 'SWING_TOPDOWN'
    | 'PROP_RISK_MATH';
  keyRules: string[];
  deepDiveSections?: MicroLessonSection[];
  commonTrap: string;
  proMantra: string;
}

export interface WorldDefinition {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  styleFocus: TradingStyle;
  accentColor: 'emerald' | 'amber' | 'cyan' | 'rose' | 'violet' | 'sky';
  badgeName: string;
  unlockRequirementStars: number;
  scenarioIds: string[];
}

export interface RealMarketPack {
  id: string;
  realAsset: string;
  marketCategory: MarketCategory;
  style: TradingStyle;
  ltf: Timeframe;
  htf: Timeframe;
  groupSize: number;
  realDateLabel: string;
  dominantDirection: 'LONG' | 'SHORT';
  atr: number;
  visibleCandles: Candle[];
  futureCandles: Candle[];
  htfVisibleCandles: Candle[];
}
