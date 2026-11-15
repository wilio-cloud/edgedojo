import rawPacks from './realMarketPacks.json';
import {
  AnchorPoint,
  attachSyntheticHtf,
  buildRealPackScenario,
  buildSyntheticCandlesFromAnchors,
} from './scenarioFactory';
import {
  RealMarketPack,
  Scenario,
  TacticalAnnotation,
  Timeframe,
  TradingStyle,
} from '../engine/types';
import { computeATR } from '../engine/tradeSimulator';

export const REAL_MARKET_PACKS: RealMarketPack[] =
  rawPacks as unknown as RealMarketPack[];

function getPack(id: string): RealMarketPack {
  const found = REAL_MARKET_PACKS.find((p) => p.id === id);
  if (found) return found;
  return REAL_MARKET_PACKS[0];
}

function makeGuidedScenario(cfg: {
  id: string;
  worldId: number;
  stageNumber: number;
  title: string;
  subtitle: string;
  mode: Scenario['mode'];
  style: TradingStyle;
  timeframe: Timeframe;
  htfTimeframe?: Timeframe;
  htfGroupSize?: number;
  seed: number;
  visibleCount: number;
  futureCount: number;
  baseVolatility: number;
  anchors: AnchorPoint[];
  preAnnotations?: TacticalAnnotation[];
  xrayAnnotations: TacticalAnnotation[];
  coachingTakeaway: string;
  radarConfig?: Scenario['radarConfig'];
  executionBlueprint?: Scenario['executionBlueprint'];
  managementConfig?: Scenario['managementConfig'];
}): Scenario {
  const all = buildSyntheticCandlesFromAnchors({
    seed: cfg.seed,
    totalCandles: cfg.visibleCount + cfg.futureCount,
    anchors: cfg.anchors,
    baseVolatility: cfg.baseVolatility,
    timeframe: cfg.timeframe,
  });

  const visibleCandles = all.slice(0, cfg.visibleCount);
  const futureCandles = all.slice(cfg.visibleCount);
  const atr = computeATR(visibleCandles, 14);
  const htfVisibleCandles =
    cfg.htfTimeframe && cfg.htfGroupSize
      ? attachSyntheticHtf(visibleCandles, cfg.htfTimeframe, cfg.htfGroupSize)
      : undefined;

  return {
    id: cfg.id,
    worldId: cfg.worldId,
    stageNumber: cfg.stageNumber,
    title: cfg.title,
    subtitle: cfg.subtitle,
    mode: cfg.mode,
    style: cfg.style,
    marketCategory: 'SYNTHETIC_GUIDED',
    timeframe: cfg.timeframe,
    htfTimeframe: cfg.htfTimeframe,
    visibleCandles,
    futureCandles,
    htfVisibleCandles,
    atr,
    preAnnotations: cfg.preAnnotations,
    xrayAnnotations: cfg.xrayAnnotations,
    coachingTakeaway: cfg.coachingTakeaway,
    radarConfig: cfg.radarConfig,
    executionBlueprint: cfg.executionBlueprint,
    managementConfig: cfg.managementConfig,
  };
}

/**
 * 36 Master Campaign Stages across 6 Specialized Worlds:
 * - Worlds 1-3: Core Institutional Price Action, Liquidity & Risk Engineering
 * - World 4: MNQ (Micro E-mini Nasdaq-100) Scalping Masterclass (1m / 5m / NY Open / Prop Firm)
 * - World 5: Crypto Swing Masterclass (BTC, ETH, SOL, AVAX, LINK, SUI in 1H / 4H / 1D)
 * - World 6: Pro Graduation Arena (100% Blind Real Historical MNQ + Crypto Exams)
 */
export const CAMPAIGN_SCENARIOS: Scenario[] = [
  // ============================================================================
  // WORLD 1: ESTRUCTURA, VOLUM I DESPLAÇAMENT (Stages 1..6)
  // ============================================================================
  makeGuidedScenario({
    id: 'w1_s1',
    worldId: 1,
    stageNumber: 1,
    title: '1.1 · Qui té el control?',
    subtitle: 'Identifica el Higher Low (HL) que protegeix la tendència alcista',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 101,
    visibleCount: 55,
    futureCount: 15,
    baseVolatility: 0.9,
    anchors: [
      { index: 0, price: 100 },
      { index: 12, price: 108 },
      { index: 20, price: 103.5 },
      { index: 33, price: 114, volumeMultiplier: 1.8 },
      { index: 43, price: 108.5 },
      { index: 54, price: 116.5, volumeMultiplier: 2.0 },
      { index: 69, price: 122 },
    ],
    xrayAnnotations: [
      {
        id: 'w1s1_bos',
        kind: 'BOS',
        priceTop: 114.6,
        startIndex: 33,
        endIndex: 54,
        label: 'BOS Alcista (Continuació)',
        tone: 'bull',
      },
      {
        id: 'w1s1_hl',
        kind: 'DEMAND_ZONE',
        priceTop: 109.2,
        priceBottom: 107.6,
        startIndex: 41,
        endIndex: 56,
        label: 'Higher Low Protegit (Invalidesa)',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'En una estructura HH + HL, l’últim mínim que ha generat un nou màxim amb cos (BOS) és el sòl real dels compradors. Mentre no es trenqui amb cos, tota caiguda és un descompte.',
    radarConfig: {
      prompt:
        'El preu acaba de fer un nou màxim (BOS). Toca la insígnia al gràfic o selecciona quin nivell actua com a Higher Low (HL) estructural protegit:',
      timeLimitSec: 25,
      choices: [
        {
          id: 'c_hl_correct',
          label: 'Punt B · Mínim creixent a ~108.5 (origen de l’últim BOS)',
          sublabel: 'Toca la insígnia [B] al gràfic o aquí',
          chartAnchor: { candleIndex: 43, price: 108.2, badge: 'B' },
          isCorrect: true,
          feedback:
            'Exacte! El punt B és l’últim Higher Low (HL) que va impulsar el trencament del màxim anterior (BOS). Si algun dia es perd B amb cos, tindrem CHoCH.',
        },
        {
          id: 'c_old_low',
          label: 'Punt A · Primer mínim antic a ~103.5',
          sublabel: 'Mínim històric superat',
          chartAnchor: { candleIndex: 20, price: 103.2, badge: 'A' },
          isCorrect: false,
          feedback:
            'Aquest era un HL antic. Un cop el mercat crea un nou BOS des de B, l’estructura activa puja al nivell B.',
        },
        {
          id: 'c_top_chasing',
          label: 'Punt C · Màxim antic trencat a ~114.0',
          sublabel: 'Antic sostre superat',
          chartAnchor: { candleIndex: 33, price: 114.5, badge: 'C' },
          isCorrect: false,
          feedback:
            'C és el nivell del BOS, no el mínim estructural protegit (HL). Molts novells posen l’SL a C i els escombren al primer pullback sa!',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w1_s2',
    worldId: 1,
    stageNumber: 2,
    title: '1.2 · BOS vs CHoCH (El Gir Real)',
    subtitle: 'Distingeix una simple correcció d’un canvi real de caràcter',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 102,
    visibleCount: 56,
    futureCount: 16,
    baseVolatility: 0.95,
    anchors: [
      { index: 0, price: 110 },
      { index: 12, price: 118 },
      { index: 20, price: 114 },
      { index: 30, price: 124 },
      { index: 38, price: 119.5 },
      { index: 45, price: 126.5, wickTopBoost: 1.8 },
      { index: 55, price: 116.8, volumeMultiplier: 2.3 },
      { index: 62, price: 121.5 },
      { index: 71, price: 111.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w1s2_choch',
        kind: 'CHOCH',
        priceTop: 119.3,
        startIndex: 38,
        endIndex: 55,
        label: 'CHoCH Baixista Confirmat (Cos + Volum)',
        tone: 'bear',
      },
      {
        id: 'w1s2_supply',
        kind: 'SUPPLY_ZONE',
        priceTop: 127.4,
        priceBottom: 124.2,
        startIndex: 44,
        endIndex: 66,
        label: 'Oferta Origen del CHoCH',
        tone: 'bear',
      },
    ],
    coachingTakeaway:
      'Un CHoCH real exigeix Desplaçament (espelmes amb cos ple i volum trencant l’últim HL vàlid). Ara la probabilitat passa a buscar Vendes (SHORT) en el proper rebot a Oferta.',
    radarConfig: {
      prompt:
        'Observa la forta caiguda amb augment de volum. Quin diagnòstic d’estructura és el correcte ara mateix?',
      timeLimitSec: 25,
      choices: [
        {
          id: 'choch_bear',
          label: 'CHoCH Baixista: s’ha trencat amb cos l’últim HL (~119.5)',
          sublabel: 'Els venedors prenen el comandament; toca esperar rebot per vendre',
          isCorrect: true,
          feedback:
            'Clavat! L’últim mínim que havia creat el màxim de 126.5 s’ha perforat amb intenció i volum. Comprar ara seria agafar un ganivet caient.',
        },
        {
          id: 'buy_dip',
          label: 'Simple pullback alcista: moment ideal de comprar a mercat ja',
          sublabel: 'La tendència prèvia era alcista i ara està "barat"',
          isCorrect: false,
          feedback:
            'Compte! Això ja no és un descompte sa: ha trencat l’estructura interna amb volum alt. El biaix ha virat a baixista.',
        },
        {
          id: 'bos_bull',
          label: 'BOS Alcista en formació',
          sublabel: 'Continuació immediata a nous màxims',
          isCorrect: false,
          feedback:
            'Un BOS alcista requeriria trencar el màxim de 126.5, però aquí el preu ha trencat el suport estructural de 119.5.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w1_s3',
    worldId: 1,
    stageNumber: 3,
    title: '1.3 · Intenció vs Absorció (Metxes i Volum)',
    subtitle: 'Llegeix l’empremta institucional dins d’una sola espelma clau',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '5m',
    seed: 103,
    visibleCount: 52,
    futureCount: 18,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 145 },
      { index: 14, price: 138 },
      { index: 24, price: 141.5 },
      { index: 36, price: 134.5 },
      { index: 46, price: 133.2, wickBottomBoost: 4.5, volumeMultiplier: 3.1 },
      { index: 51, price: 137.4, volumeMultiplier: 1.9 },
      { index: 69, price: 144.8 },
    ],
    xrayAnnotations: [
      {
        id: 'w1s3_abs',
        kind: 'SWEEP',
        priceTop: 133.2,
        priceBottom: 129.4,
        startIndex: 44,
        endIndex: 52,
        label: 'Absorció Institucional (Volum 3x + Metxa Llarga)',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'Quan veus el pic de volum més gran de la sessió però el cos de l’espelma NO aconsegueix avançar cap avall i deixa una gran metxa inferior, hi ha ordres límit institucionals absorbint totes les vendes en pànic.',
    radarConfig: {
      prompt:
        'A la zona inferior apareix una metxa llarguíssima amb el pic de volum més alt de tot el gràfic, seguida de recuperació. Què està passant?',
      timeLimitSec: 22,
      choices: [
        {
          id: 'absorption',
          label: 'Absorció compradora: grans ordres límit han engolit els venedors',
          sublabel: 'Esforç venedor màxim amb zero resultat cap avall',
          chartAnchor: { candleIndex: 46, price: 130.2, badge: 'ABS' },
          isCorrect: true,
          feedback:
            'Lectura de professional! Volum extrem + llarga metxa de rebuig = transferència de mans febles a mans fortes.',
        },
        {
          id: 'panic_continuation',
          label: 'Força venedora extrema: el preu trencarà el mínim immediatament',
          sublabel: 'Gran volum en caiguda vol dir més caiguda',
          isCorrect: false,
          feedback:
            'Si fos força venedora pura sense oposició, l’espelma hauria tancat plena a baix de tot, no amb metxa gegant de rebuig.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w1_s4',
    worldId: 1,
    stageNumber: 4,
    title: '1.4 · Desplaçament i Imbalance (FVG)',
    subtitle: 'Distingeix un trencament institucional d’una pujada lenta i feble',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 106,
    visibleCount: 54,
    futureCount: 18,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 160 },
      { index: 16, price: 165 },
      { index: 28, price: 159.5 },
      { index: 34, price: 161.2 },
      { index: 40, price: 173.8, volumeMultiplier: 2.9 }, // Explosive institutional displacement leaving clean imbalance!
      { index: 53, price: 164.8 }, // Retraces into the imbalance / origin demand
      { index: 71, price: 178.5 },
    ],
    xrayAnnotations: [
      {
        id: 'w1s4_fvg',
        kind: 'DEMAND_ZONE',
        priceTop: 165.5,
        priceBottom: 161.0,
        startIndex: 33,
        endIndex: 56,
        label: 'Desplaçament Institucional + Zona de Demanda/FVG',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'Les institucions mouen el preu amb espelmes d’expansió ràpida i volum alt (Desplaçament) i després deixen que el preu corregeixi lentament amb poc volum per omplir la resta de les seves ordres a l’origen.',
    radarConfig: {
      prompt:
        'Després de l’explosió vertical de 161 a 173.8 amb gran volum, el preu baixa a poc a poc amb poc volum cap a ~164.8. Com s’interpreta?',
      timeLimitSec: 22,
      choices: [
        {
          id: 'displacement_retrace',
          label: 'Desplaçament alcista + retorn correctiu sa per recarregar compres',
          sublabel: 'Impuls ràpid amb volum alt vs. correcció lenta amb volum baix',
          isCorrect: true,
          feedback:
            'Exacte! La velocitat i el volum estan al costat comprador; la caiguda lenta és una simple mitigació del desequilibri cap a la Demanda.',
        },
        {
          id: 'pump_and_dump',
          label: 'Tendència baixista nova: cal vendre ja a 164.8',
          sublabel: 'Porta diverses espelmes baixant lentament',
          isCorrect: false,
          feedback:
            'Compara l’angle i el volum: 6 espelmes van pujar 13 punts amb volum altíssim, mentre 13 espelmes amb prou feines n’han corregit una part sense volum.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w1_s5',
    worldId: 1,
    stageNumber: 5,
    title: '1.5 · La Picadora de Carn (Aprendre a dir NO)',
    subtitle: 'El 70% de les pèrdues vénen d’operar al bell mig d’un rang brut',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '15m',
    seed: 104,
    visibleCount: 60,
    futureCount: 25,
    baseVolatility: 1.15,
    anchors: [
      { index: 0, price: 200 },
      { index: 10, price: 205 },
      { index: 18, price: 196 },
      { index: 26, price: 204.2, wickTopBoost: 1.8 },
      { index: 34, price: 196.8, wickBottomBoost: 1.8 },
      { index: 42, price: 203.5, wickTopBoost: 2.0 },
      { index: 50, price: 197.2, wickBottomBoost: 2.0 },
      { index: 59, price: 200.4 },
      { index: 65, price: 204.6 },
      { index: 72, price: 195.8 },
      { index: 84, price: 200.1 },
    ],
    xrayAnnotations: [
      {
        id: 'w1s5_top',
        kind: 'SR_LEVEL',
        priceTop: 204.8,
        startIndex: 8,
        endIndex: 75,
        label: 'Sostre del Rang (Liquidesa Bilateral)',
        tone: 'neutral',
      },
      {
        id: 'w1s5_bot',
        kind: 'SR_LEVEL',
        priceTop: 196.2,
        startIndex: 16,
        endIndex: 75,
        label: 'Sòl del Rang',
        tone: 'neutral',
      },
    ],
    coachingTakeaway:
      'Al bell mig del 50% d’un rang lateral ple de metxes creuades, l’esperança matemàtica és negativa. Prémer NO OPERAR és una decisió d’elit.',
    executionBlueprint: {
      optimalSide: 'SKIP',
      invalidationPrice: 195.5,
      slToleranceAtr: 0.5,
      logicalTargetPrice: 205.0,
      minAcceptableRR: 2.0,
      trapExplanation:
        'Estàs exactament a l’equilibri (50%) d’un rang lateral comprimit sense cap escombrada d’extrems. Qualsevol ordre aquí és tirar una moneda a l’aire!',
    },
  }),

  makeGuidedScenario({
    id: 'w1_s6',
    worldId: 1,
    stageNumber: 6,
    title: '1.6 · Primer Tret Estructural (BOS + Pullback)',
    subtitle: 'Col·loca Entry, Stop Loss sota l’HL i Take Profit al màxim objectiu',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '15m',
    seed: 105,
    visibleCount: 58,
    futureCount: 28,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 150 },
      { index: 14, price: 158 },
      { index: 24, price: 153.5 },
      { index: 38, price: 164.5, volumeMultiplier: 2.1 },
      { index: 51, price: 156.8, wickBottomBoost: 1.6 },
      { index: 57, price: 158.4, volumeMultiplier: 1.6 },
      { index: 63, price: 157.4 },
      { index: 74, price: 166.2 },
      { index: 85, price: 169.5 },
    ],
    preAnnotations: [
      {
        id: 'w1s6_pre_bos',
        kind: 'BOS',
        priceTop: 158.4,
        startIndex: 14,
        endIndex: 38,
        label: 'BOS Alcista Confirmat',
        tone: 'bull',
      },
    ],
    xrayAnnotations: [
      {
        id: 'w1s6_dem',
        kind: 'DEMAND_ZONE',
        priceTop: 157.6,
        priceBottom: 155.2,
        startIndex: 48,
        endIndex: 66,
        label: 'Demanda + Higher Low (~155.1 Invalidesa)',
        tone: 'bull',
      },
      {
        id: 'w1s6_tp',
        kind: 'LIQUIDITY_POOL',
        priceTop: 166.0,
        startIndex: 38,
        endIndex: 76,
        label: 'Objectiu Liquidesa Màxim (BSL)',
        tone: 'liquidity',
      },
    ],
    coachingTakeaway:
      'Després d’un BOS fort, deixa que el preu torni a la zona de descompte i amaga l’Stop Loss lleugerament per sota de la metxa del nou HL (~155.1).',
    executionBlueprint: {
      optimalSide: 'LONG',
      invalidationPrice: 155.1,
      slToleranceAtr: 0.65,
      logicalTargetPrice: 166.0,
      minAcceptableRR: 2.0,
    },
  }),

  // ============================================================================
  // WORLD 2: LIQUIDESA, INDUCEMENT I SWEEPS (Stages 7..12)
  // ============================================================================
  makeGuidedScenario({
    id: 'w2_s1',
    worldId: 2,
    stageNumber: 7,
    title: '2.1 · Piscina de Diners (Equal Highs)',
    subtitle: 'Toca al gràfic on s’acumulen milers d’Stop Losses retail',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 201,
    visibleCount: 56,
    futureCount: 18,
    baseVolatility: 0.8,
    anchors: [
      { index: 0, price: 210 },
      { index: 14, price: 221.8 },
      { index: 23, price: 215.5 },
      { index: 34, price: 221.9 },
      { index: 43, price: 217.2 },
      { index: 51, price: 221.8 },
      { index: 55, price: 219.6 },
      { index: 66, price: 226.5 },
    ],
    xrayAnnotations: [
      {
        id: 'w2s1_eqh',
        kind: 'LIQUIDITY_POOL',
        priceTop: 222.4,
        startIndex: 13,
        endIndex: 62,
        label: 'Equal Highs = Imant d’Stops (BSL $$$)',
        tone: 'liquidity',
      },
    ],
    coachingTakeaway:
      'Un sostre tocat 3 vegades seguides amb mínims creixents NO és una resistència per vendre: és una piscina plena de Buy-Stops a punt d’explotar.',
    radarConfig: {
      prompt:
        'Toca directament el nivell del gràfic (o tria a sota) on hi ha la piscina principal de liquidesa que actua com a imant del preu:',
      timeLimitSec: 20,
      priceTapTarget: {
        idealPrice: 222.2,
        toleranceAtr: 1.15,
        targetLabel: 'la piscina d’Equal Highs (~222.2 BSL)',
      },
      choices: [
        {
          id: 'bsl_eqh',
          label: 'Sobre el triple sostre net (~222.2 · Equal Highs)',
          sublabel: 'Buy-Side Liquidity amb mínims creixents pressionant',
          chartAnchor: { candleIndex: 34, price: 222.5, badge: '$$$' },
          isCorrect: true,
          feedback:
            'Exacte! Tots els qui han venut el "triple sostre" tenen el seu Stop de compra acumulat just a sobre de 222.2.',
        },
        {
          id: 'old_origin',
          label: 'A l’inici antic de 210.0',
          sublabel: 'Origen llunyà sense compressió actual',
          isCorrect: false,
          feedback:
            'Els mínims són creixents: la pressió acumulada apunta cap a la piscina d’Equal Highs superior.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w2_s2',
    worldId: 2,
    stageNumber: 8,
    title: '2.2 · Breakout Real vs Liquidity Sweep (Bull Trap)',
    subtitle: 'Evita comprar el cim d’una manipulació institucional',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '5m',
    seed: 202,
    visibleCount: 54,
    futureCount: 20,
    baseVolatility: 0.9,
    anchors: [
      { index: 0, price: 180 },
      { index: 16, price: 188.0 },
      { index: 26, price: 183.5 },
      { index: 38, price: 188.1 },
      { index: 46, price: 185.0 },
      { index: 50, price: 189.2, wickTopBoost: 3.4, volumeMultiplier: 2.8 },
      { index: 53, price: 184.2, volumeMultiplier: 2.2 },
      { index: 73, price: 176.5 },
    ],
    xrayAnnotations: [
      {
        id: 'w2s2_sweep',
        kind: 'SWEEP',
        priceTop: 192.2,
        priceBottom: 188.1,
        startIndex: 48,
        endIndex: 54,
        label: 'Bull Trap / Liquidity Sweep sobre 188.1',
        tone: 'bear',
      },
    ],
    coachingTakeaway:
      'Bull Trap (Sweep) = metxa que punxa els Equal Highs i tancament violent de tornada a dins del rang trencant l’últim micro-suport.',
    radarConfig: {
      prompt:
        'El preu perfora els màxims de 188.1 fins a ~192, però en 3 espelmes torna a tancar amb força a 184.2. Quin és el diagnòstic?',
      timeLimitSec: 18,
      choices: [
        {
          id: 'bull_trap_sweep',
          label: 'Bull Trap (Sweep): han caçat compradors de breakout per girar avall',
          sublabel: 'Escombrada de BSL + tancament dins del rang + micro-CHoCH',
          isCorrect: true,
          feedback:
            'Brillant! Els compradors impulsius de ruptura han quedat atrapats a dalt i els seus Stops alimentaran la caiguda.',
        },
        {
          id: 'valid_breakout',
          label: 'Breakout alcista sa fent un re-test normal per comprar ja',
          sublabel: 'El màxim antic ja s’ha superat',
          isCorrect: false,
          feedback:
            'Un re-test sa respecta el nivell trencat (188.1) per sobre; aquí s’ha enfonsat directament per sota.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w2_s3',
    worldId: 2,
    stageNumber: 9,
    title: '2.3 · Zona Fresca vs Zona Gastada',
    subtitle: 'Compta els tocs: al 3r toc el suport es converteix en trampa!',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 203,
    visibleCount: 60,
    futureCount: 20,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 300 },
      { index: 8, price: 294 },
      { index: 18, price: 312, volumeMultiplier: 2.5 },
      { index: 26, price: 303 },
      { index: 33, price: 309 },
      { index: 40, price: 303.2 },
      { index: 46, price: 307 },
      { index: 53, price: 303.1 },
      { index: 59, price: 304.5 },
      { index: 67, price: 294.6 },
      { index: 79, price: 308.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w2s3_tested',
        kind: 'LIQUIDITY_POOL',
        priceTop: 303.0,
        startIndex: 25,
        endIndex: 66,
        label: 'Suport Gastat (3 Tocs = Liquidesa SSL $$$)',
        tone: 'liquidity',
      },
      {
        id: 'w2s3_fresh',
        kind: 'DEMAND_ZONE',
        priceTop: 295.4,
        priceBottom: 293.0,
        startIndex: 6,
        endIndex: 72,
        label: 'Demanda Institucional FRESCA (0 re-tests)',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'Cada toc addicional a un suport amb rebots cada cop més febles consumeix les ordres límit i acumula Stops a sota per portar el preu a la Zona Fresca inferior.',
    radarConfig: {
      prompt:
        'Tenim un suport intermedi a ~303 tocat ja 3 vegades amb rebots decreixents, i l’origen impulsiu intacte a ~294. On és la Demanda real?',
      timeLimitSec: 22,
      choices: [
        {
          id: 'fresh_294',
          label: 'Zona B (~294.0): Demanda FRESCA d’origen impulsiu no mitigada',
          sublabel: 'El nivell de 303 ja s’ha convertit en liquidesa per escombrar',
          chartAnchor: { candleIndex: 8, price: 294.0, badge: 'B' },
          isCorrect: true,
          feedback:
            'Visió institucional! Els compradors impacients a 303 serviran de liquidesa per omplir les compres professionals a 294.',
        },
        {
          id: 'spent_303',
          label: 'Zona A (~303.0): Suport provat 3 vegades',
          sublabel: 'Com més cops aguanta, més fort és',
          chartAnchor: { candleIndex: 40, price: 303.0, badge: 'A' },
          isCorrect: false,
          feedback:
            'Quan els rebots fan màxims decreixents (312 -> 309 -> 307 -> 304.5), les ordres compradors de 303 s’han esgotat.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w2_s4',
    worldId: 2,
    stageNumber: 10,
    title: '2.4 · Inducement (IDM): L’Esquer abans de la Zona Bona',
    subtitle: 'Per què el primer micro-suport gairebé sempre és escombrat',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 206,
    visibleCount: 56,
    futureCount: 22,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 140 },
      { index: 10, price: 135.0 }, // True Extreme Order Block / Demand!
      { index: 24, price: 152.0, volumeMultiplier: 2.6 }, // BOS impulse
      { index: 34, price: 143.5 }, // Inducement (IDM) minor pullback!
      { index: 42, price: 149.0 }, // Fails to make new HH
      { index: 51, price: 141.2, wickBottomBoost: 2.2 }, // Sweeps IDM (143.5) right down toward Extreme Demand!
      { index: 55, price: 136.4, wickBottomBoost: 2.4, volumeMultiplier: 2.2 }, // Taps Extreme Demand 135-136.5!
      { index: 77, price: 155.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w2s4_idm',
        kind: 'LIQUIDITY_POOL',
        priceTop: 143.5,
        startIndex: 32,
        endIndex: 52,
        label: 'Inducement (IDM) Escombrat $$$',
        tone: 'liquidity',
      },
      {
        id: 'w2s4_ext',
        kind: 'DEMAND_ZONE',
        priceTop: 137.0,
        priceBottom: 134.2,
        startIndex: 8,
        endIndex: 62,
        label: 'Demanda Extrema Activada post-IDM',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'Regla Smart Money clau: una Zona de Demanda té el doble de probabilitat d’èxit quan el preu acaba d’escombrar un Inducement (mínim intern previ) just abans de tocar-la!',
    radarConfig: {
      prompt:
        'El preu acaba d’escombrar el primer mínim intern de 143.5 (Inducement) i aterra amb metxa de rebuig sobre l’origen extrem (~136). Què significa?',
      timeLimitSec: 22,
      choices: [
        {
          id: 'idm_taken_bull',
          label: 'Trampa completada: han pres l’Inducement per activar la Demanda Extrema alcista',
          sublabel: 'Escenari d’alta probabilitat per buscar LONG amb SL sota 134',
          isCorrect: true,
          feedback:
            'Mestria pura! Els compradors prematurs de 143.5 acaben d’entregar la seva liquidesa just a sobre de la Demanda Extrema institucional.',
        },
        {
          id: 'trend_broken',
          label: 'Tendència alcista morta perquè s’ha perdut el sub-mínim de 143.5',
          sublabel: 'Toca vendre a mercat a 136',
          isCorrect: false,
          feedback:
            '143.5 era només sub-estructura interna (Inducement), NO el Higher Low principal (que està a 135.0!). Vendre a 136 és vendre al sòl.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w2_s5',
    worldId: 2,
    stageNumber: 11,
    title: '2.5 · Caçar el Caçador (Liquidity Sweep + Short)',
    subtitle: 'Opera a favor del gir institucional després de l’escombrada de màxims',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '15m',
    seed: 204,
    visibleCount: 56,
    futureCount: 28,
    baseVolatility: 0.9,
    anchors: [
      { index: 0, price: 245 },
      { index: 15, price: 252.0 },
      { index: 26, price: 246.0 },
      { index: 38, price: 252.1 },
      { index: 45, price: 249.2 },
      { index: 50, price: 253.4, wickTopBoost: 2.8, volumeMultiplier: 2.6 },
      { index: 55, price: 248.4, volumeMultiplier: 2.0 },
      { index: 60, price: 251.2 },
      { index: 74, price: 244.5 },
      { index: 83, price: 241.8 },
    ],
    xrayAnnotations: [
      {
        id: 'w2s5_swp',
        kind: 'SWEEP',
        priceTop: 256.2,
        priceBottom: 252.1,
        startIndex: 48,
        endIndex: 55,
        label: 'Sweep BSL + Invalidesa sobre Metxa (~256.3)',
        tone: 'bear',
      },
      {
        id: 'w2s5_ssl',
        kind: 'LIQUIDITY_POOL',
        priceTop: 245.5,
        startIndex: 24,
        endIndex: 76,
        label: 'Objectiu Natural: Liquidesa Inferior (SSL)',
        tone: 'liquidity',
      },
    ],
    coachingTakeaway:
      'Patró rei: 1) Escombrada d’Equal Highs, 2) Tancament dins del rang amb CHoCH, 3) Entrada SHORT amb SL protegit sobre la metxa del Sweep i TP al mínim oposat.',
    executionBlueprint: {
      optimalSide: 'SHORT',
      invalidationPrice: 256.3,
      slToleranceAtr: 0.7,
      logicalTargetPrice: 243.0,
      minAcceptableRR: 1.9,
    },
  }),

  makeGuidedScenario({
    id: 'w2_s6',
    worldId: 2,
    stageNumber: 12,
    title: '2.6 · Fuetada Macro CPI/FOMC (Whipsaw)',
    subtitle: 'Quan una espelma de notícia escombra dalt i baix, protegeixes el compte?',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '5m',
    seed: 205,
    visibleCount: 54,
    futureCount: 24,
    baseVolatility: 1.1,
    anchors: [
      { index: 0, price: 120 },
      { index: 20, price: 123 },
      { index: 38, price: 119 },
      { index: 49, price: 121, wickTopBoost: 6.2, wickBottomBoost: 6.0, volumeMultiplier: 4.5 },
      { index: 53, price: 121.2 },
      { index: 60, price: 125.5 },
      { index: 67, price: 116.8 },
      { index: 77, price: 121.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w2s6_whip',
        kind: 'SR_LEVEL',
        priceTop: 121.2,
        startIndex: 47,
        endIndex: 75,
        label: 'Fuetada de Notícies (Spread Obert + Risc Alt)',
        tone: 'neutral',
      },
    ],
    coachingTakeaway:
      'En el minut d’una notícia d’alt impacte (CPI, NFP, FOMC), l’slippage es multiplica per 5 i el gràfic escombra tots dos extrems. NO OPERAR salva mesos de feina.',
    executionBlueprint: {
      optimalSide: 'SKIP',
      invalidationPrice: 114.5,
      slToleranceAtr: 0.6,
      logicalTargetPrice: 128.0,
      minAcceptableRR: 2.0,
      trapExplanation:
        'Fuetada macroeconòmica bilateral! Per posar un SL fora de les metxes caldria arriscar massa punts sense estructura clara. El professional espera 15–30 minuts que assenti.',
    },
  }),

  // ============================================================================
  // WORLD 3: RISC, INVALIDESA I ASIMETRIA R:R (Stages 13..18)
  // ============================================================================
  makeGuidedScenario({
    id: 'w3_s1',
    worldId: 3,
    stageNumber: 13,
    title: '3.1 · Regla d’Or del Risc: Càlcul en Calent',
    subtitle: 'Verifica que domines el dimensionament abans d’escalar capital',
    mode: 'RADAR',
    style: 'CORE',
    timeframe: '15m',
    seed: 306,
    visibleCount: 50,
    futureCount: 16,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 192 },
      { index: 18, price: 202 },
      { index: 34, price: 195 },
      { index: 44, price: 193.5, wickBottomBoost: 2.5 },
      { index: 49, price: 196.5 },
      { index: 65, price: 206.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w3s1_inv',
        kind: 'DEMAND_ZONE',
        priceTop: 196.5,
        priceBottom: 191.5,
        startIndex: 40,
        endIndex: 55,
        label: 'Risc Estructural Fix = 1R (1% del Compte)',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'Mai canviïs el lloc de l’Stop Loss per arriscar menys dòlars! L’SL el fixa el gràfic; el que tu ajustes són els contractes MNQ o la mida en USDT.',
    radarConfig: {
      prompt:
        'Tens un compte de 5.000 $ amb regla estricta de l’1% de risc (50 $ màx per trade). Veus un setup A+ en MNQ (2 $/punt) on l’SL estructural està a 20 punts (~41,30 $ amb comissió). Quants contractes MNQ obres?',
      timeLimitSec: 30,
      choices: [
        {
          id: 'one_mnq_exact',
          label: 'Exactament 1 contracte MNQ (risc real 41,30 $ = 0,83% <= 1%)',
          sublabel: '2 contractes serien 82,60 $ (1,65%), violant el teu límit de l’1%',
          isCorrect: true,
          feedback:
            'Matemàtica impecable! Sempre s’arrodoneix cap avall per no violar el límit d’1R. Quan el compte pugi a ~8.300 $ (o l’SL sigui de 10 pts), passaràs naturalment a 2 MNQ!',
        },
        {
          id: 'tighten_sl_hack',
          label: 'Obro 2 contractes MNQ però pujo l’SL a només 10 punts al mig del no-res',
          sublabel: 'Forçar més contractes escurçant l’Stop',
          isCorrect: false,
          feedback:
            'Pecat capital! Si poses l’SL al mig del soroll a 10 punts, el mercat t’escombrarà el 85% de vegades abans de pujar.',
        },
        {
          id: 'five_mnq_yolo',
          label: 'Obro 5 contractes MNQ (206 $ de risc = 4,1%) perquè "ho veig molt clar"',
          sublabel: 'Sobre-apalancar per convicció subjectiva',
          isCorrect: false,
          feedback:
            'Cap setup té el 100% d’encert. Si el trade on poses 5x risc és un dels 40% que fallen per notícia o soroll, destrosses la setmana sencera.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w3_s2',
    worldId: 3,
    stageNumber: 14,
    title: '3.2 · Asimetria 3R: Sell-Side Sweep + Reclamació',
    subtitle: 'Ajusta SL darrere la metxa de caça i apunta a la piscina alcista',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '15m',
    seed: 301,
    visibleCount: 56,
    futureCount: 30,
    baseVolatility: 0.85,
    anchors: [
      { index: 0, price: 182 },
      { index: 14, price: 175.0 },
      { index: 26, price: 184.5 },
      { index: 38, price: 175.1 },
      { index: 45, price: 179.0 },
      { index: 50, price: 173.8, wickBottomBoost: 2.6, volumeMultiplier: 2.7 },
      { index: 55, price: 176.8, volumeMultiplier: 2.1 },
      { index: 60, price: 175.3 },
      { index: 74, price: 184.8 },
      { index: 85, price: 187.2 },
    ],
    xrayAnnotations: [
      {
        id: 'w3s2_swp',
        kind: 'SWEEP',
        priceTop: 175.1,
        priceBottom: 171.3,
        startIndex: 48,
        endIndex: 56,
        label: 'Sell-Side Sweep + Invalidesa (~171.2)',
        tone: 'bull',
      },
      {
        id: 'w3s2_tp',
        kind: 'LIQUIDITY_POOL',
        priceTop: 184.8,
        startIndex: 25,
        endIndex: 76,
        label: 'Piscina Objectiu Superior (+2.5R)',
        tone: 'liquidity',
      },
    ],
    coachingTakeaway:
      'Entrar després de la reclamació d’un Sweep a la base del rang et dóna un SL curt i un TP a l’altre extrem: així s’obtenen operacions de +2.5R a +3.5R.',
    executionBlueprint: {
      optimalSide: 'LONG',
      invalidationPrice: 171.2,
      slToleranceAtr: 0.7,
      logicalTargetPrice: 185.0,
      minAcceptableRR: 2.1,
    },
  }),

  makeGuidedScenario({
    id: 'w3_s3',
    worldId: 3,
    stageNumber: 15,
    title: '3.3 · Re-test d’Oferta Institucional',
    subtitle: 'Vendre car al descompte dels venedors després d’un BOS baixista',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '15m',
    seed: 302,
    visibleCount: 58,
    futureCount: 28,
    baseVolatility: 0.9,
    anchors: [
      { index: 0, price: 270 },
      { index: 14, price: 262 },
      { index: 24, price: 266.8 },
      { index: 38, price: 253.5, volumeMultiplier: 2.4 },
      { index: 52, price: 264.8, wickTopBoost: 1.8 },
      { index: 57, price: 263.1, volumeMultiplier: 1.7 },
      { index: 62, price: 264.2 },
      { index: 76, price: 253.0 },
      { index: 85, price: 250.2 },
    ],
    xrayAnnotations: [
      {
        id: 'w3s3_sup',
        kind: 'SUPPLY_ZONE',
        priceTop: 267.8,
        priceBottom: 264.2,
        startIndex: 22,
        endIndex: 63,
        label: 'Oferta + Lower High Protegit (~267.8)',
        tone: 'bear',
      },
      {
        id: 'w3s3_tp',
        kind: 'LIQUIDITY_POOL',
        priceTop: 253.2,
        startIndex: 37,
        endIndex: 78,
        label: 'Mínim Estructural Objectiu (SSL)',
        tone: 'liquidity',
      },
    ],
    coachingTakeaway:
      'Esperar pacientment que el preu pugi a mitigar la Zona d’Oferta et regala un R:R superior a 2.2R a favor de tendència.',
    executionBlueprint: {
      optimalSide: 'SHORT',
      invalidationPrice: 267.8,
      slToleranceAtr: 0.7,
      logicalTargetPrice: 253.2,
      minAcceptableRR: 2.0,
    },
  }),

  makeGuidedScenario({
    id: 'w3_s4',
    worldId: 3,
    stageNumber: 16,
    title: '3.4 · Bona Direcció, Pèssim Preu (Trampa FOMO)',
    subtitle: 'Encara que sigui alcista, és rendible comprar enganxat al sostre?',
    mode: 'EXECUTION',
    style: 'CORE',
    timeframe: '15m',
    seed: 303,
    visibleCount: 54,
    futureCount: 24,
    baseVolatility: 0.9,
    anchors: [
      { index: 0, price: 130 },
      { index: 16, price: 146.5 },
      { index: 32, price: 134.0 },
      { index: 53, price: 145.2, volumeMultiplier: 1.9 },
      { index: 61, price: 138.0 },
      { index: 77, price: 147.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w3s4_wall',
        kind: 'SUPPLY_ZONE',
        priceTop: 147.5,
        priceBottom: 145.8,
        startIndex: 14,
        endIndex: 76,
        label: 'Mur d’Oferta Immediat (Marge < 0.3R)',
        tone: 'bear',
      },
    ],
    coachingTakeaway:
      'Si l’SL lògic és a 11 punts i la resistència major és a 1.5 punts (0.15R), està prohibit entrar per FOMO: NO OPERAR i esperar el pullback!',
    executionBlueprint: {
      optimalSide: 'SKIP',
      invalidationPrice: 133.5,
      slToleranceAtr: 0.6,
      logicalTargetPrice: 146.5,
      minAcceptableRR: 2.0,
      trapExplanation:
        'Trampa de FOMO! Tot i que el fons és alcista, el preu xoca contra l’Oferta de 146.5 després d’una pujada vertical. Comprar aquí té un R:R pèssim i es menja la correcció fins a 138.',
    },
  }),

  makeGuidedScenario({
    id: 'w3_s5',
    worldId: 3,
    stageNumber: 17,
    title: '3.5 · Gestor en Viu: No ofeguis un Trade Guanyador',
    subtitle: 'Aguanta el re-test abans del BOS i protegeix un cop confirmat',
    mode: 'MANAGEMENT',
    style: 'CORE',
    timeframe: '15m',
    seed: 304,
    visibleCount: 48,
    futureCount: 30,
    baseVolatility: 0.8,
    anchors: [
      { index: 0, price: 195 },
      { index: 16, price: 204 },
      { index: 30, price: 197.5 },
      { index: 42, price: 196.2, wickBottomBoost: 2.2 },
      { index: 47, price: 198.5 },
      { index: 55, price: 202.2 },
      { index: 60, price: 198.9 },
      { index: 68, price: 205.8, volumeMultiplier: 2.1 },
      { index: 77, price: 209.6 },
    ],
    xrayAnnotations: [
      {
        id: 'w3s5_bos',
        kind: 'BOS',
        priceTop: 204.2,
        startIndex: 16,
        endIndex: 69,
        label: 'BOS Major: punt vàlid per protegir Break-Even / Parcial',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'NO moguis l’Stop a Break-Even només perquè portes +0.8R si encara no s’ha trencat estructura interna nova; deixa respirar el trade fins al BOS.',
    managementConfig: {
      initialOrder: {
        side: 'LONG',
        entry: 198.5,
        stopLoss: 194.5,
        takeProfit: 209.0,
      },
      contextSummary:
        'Has entrat LONG a 198.5 després d’un Sweep (SL 194.5, TP 209.0 = +2.6R). Gestiona els dos punts crítics del recorregut.',
      checkpoints: [
        {
          id: 'w3s5_cp1',
          futureCandleCount: 8,
          prompt:
            'Portes +0.9R però encara NO s’ha trencat el màxim de 204.0 i comença un petit retroç. Què fas?',
          optimalActions: ['HOLD'],
          acceptableActions: [],
          coachingNote:
            'Toca AGUANTAR amb l’SL original: el re-test a ~198.9 és respiració sana abans d’atacar 204.0!',
        },
        {
          id: 'w3s5_cp2',
          futureCandleCount: 21,
          prompt:
            'El preu acaba de trencar amb força el màxim de 204.0 (nou BOS a +1.8R!). Com gestiones ara?',
          optimalActions: ['MOVE_BE', 'PARTIAL_50'],
          acceptableActions: ['HOLD'],
          coachingNote:
            'Amb un nou BOS confirmat a +1.8R, moure a Break-Even o cobrar un 50% blinda l’operació.',
        },
      ],
    },
  }),

  buildRealPackScenario(getPack('crypto_btc_1h_swing_a'), {
    id: 'w3_s6',
    worldId: 3,
    stageNumber: 18,
    title: '3.6 · Primer Examen amb Mercat Real Ocult',
    subtitle: 'Valida el Bloc Base sobre espelmes històriques reals anonimitzades',
    mode: 'EXECUTION',
    coachingTakeaway:
      'En dades històriques reals les metxes respiren més que als esquemes teòrics: posar l’SL amb un petit marge darrere la invalidesa marca la diferència.',
  }),

  // ============================================================================
  // WORLD 4: MÀSTER SCALPING AMB MNQ (Micro Nasdaq · 1m / 5m / NY Open · Stages 19..24)
  // ============================================================================
  makeGuidedScenario({
    id: 'w4_s1',
    worldId: 4,
    stageNumber: 19,
    title: '4.1 · MNQ 15:30h CET: NY Open Judas Sweep (1m)',
    subtitle: 'Obertura de Wall Street: caça del mínim Pre-Market i reclamació en V',
    mode: 'RADAR',
    style: 'SCALP',
    timeframe: '1m',
    htfTimeframe: '5m',
    htfGroupSize: 5,
    seed: 401,
    visibleCount: 60,
    futureCount: 20,
    baseVolatility: 3.5,
    anchors: [
      { index: 0, price: 20420 },
      { index: 18, price: 20385 }, // London / Pre-Market Low 1
      { index: 34, price: 20442 }, // Pre-Market High
      { index: 46, price: 20386 }, // Equal Pre-Market Lows
      { index: 53, price: 20368, wickBottomBoost: 3.2, volumeMultiplier: 3.6 }, // 15:30 CET Cash Open Sweep!
      { index: 59, price: 20406, volumeMultiplier: 2.8 }, // V-Reclaim + Micro CHoCH
      { index: 79, price: 20468 },
    ],
    xrayAnnotations: [
      {
        id: 'w4s1_ny',
        kind: 'SWEEP',
        priceTop: 20386,
        priceBottom: 20354,
        startIndex: 50,
        endIndex: 59,
        label: '15:30h NY Open Sweep Pre-Market Low + CHoCH 1m',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'En MNQ, a les 15:30h (obertura de contat d’accions EUA), l’algoritme sovint escombra 15–25 punts per sota del mínim Pre-Market per omplir ordres i tot seguit dispara +60–100 punts cap a l’altre extrem.',
    radarConfig: {
      prompt:
        'MNQ 1m (15:32h CET): La campana de Nova York punxa el doble sòl Pre-Market (~20.385) amb volum 3x i en 4 minuts recupera 20.406 amb cos ferm. Quin és el pla d’Scalp?',
      timeLimitSec: 16,
      choices: [
        {
          id: 'mnq_ny_long',
          label: 'LONG MNQ al re-test ràpid amb SL sota el Sweep i TP al Pre-Market High',
          sublabel: 'Judas Swing d’obertura completat amb R:R > 2.2R',
          isCorrect: true,
          feedback:
            'Setup A+ de tot scalper de Nasdaq! Escombrada del mínim Pre-Market + reclamació amb desplaçament en 1m.',
        },
        {
          id: 'mnq_ny_short',
          label: 'SHORT MNQ: l’obertura ha trencat el suport Pre-Market',
          sublabel: 'Perseguir la metxa inicial cap avall',
          isCorrect: false,
          feedback:
            'Aquesta és la trampa on perden el 90% d’amateurs d’MNQ els primers 5 minuts de sessió! Ja ha reclamat amb força per sobre de 20.386.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w4_s2',
    worldId: 4,
    stageNumber: 20,
    title: '4.2 · MNQ 18:30h CET: El Parany del NY Lunch Chop',
    subtitle: 'Migdia a Nova York: volum sec i escombrades als dos costats en 5m',
    mode: 'EXECUTION',
    style: 'SCALP',
    timeframe: '5m',
    htfTimeframe: '15m',
    htfGroupSize: 3,
    seed: 408,
    visibleCount: 58,
    futureCount: 24,
    baseVolatility: 4.2,
    anchors: [
      { index: 0, price: 20510 },
      { index: 14, price: 20585, volumeMultiplier: 2.5 }, // Morning AM trend finished
      { index: 26, price: 20562, volumeMultiplier: 0.5 },
      { index: 34, price: 20578, wickTopBoost: 2.1, volumeMultiplier: 0.45 },
      { index: 42, price: 20560, wickBottomBoost: 2.1, volumeMultiplier: 0.4 },
      { index: 50, price: 20576, wickTopBoost: 2.2, volumeMultiplier: 0.4 },
      { index: 57, price: 20568, volumeMultiplier: 0.35 }, // Dead NY Lunch!
      { index: 65, price: 20581 },
      { index: 73, price: 20556 },
      { index: 81, price: 20570 },
    ],
    xrayAnnotations: [
      {
        id: 'w4s2_lunch',
        kind: 'SR_LEVEL',
        priceTop: 20578,
        startIndex: 24,
        endIndex: 80,
        label: 'NY Lunch Chop (18:00-19:30h CET · Volum Mort)',
        tone: 'neutral',
      },
    ],
    coachingTakeaway:
      'Un scalper professional d’MNQ guanya tant pel que opera de 15:30h a 17:15h com per tancar pantalles durant el NY Lunch (18:00h–19:30h CET), on els algoritmes trituren comissions i comptes de fondeig.',
    executionBlueprint: {
      optimalSide: 'SKIP',
      invalidationPrice: 20554,
      slToleranceAtr: 0.6,
      logicalTargetPrice: 20595,
      minAcceptableRR: 1.9,
      timeLimitSec: 22,
      applyScalpFriction: true,
      trapExplanation:
        'NY Lunch Chop clàssic! Mira la caiguda dràstica del volum a les barres inferiors i les metxes encavalcades en 18 punts. Operar MNQ aquí només paga comissions al broker i t’acosta al Trailing Drawdown!',
    },
  }),

  buildRealPackScenario(getPack('mnq_1m_scalp_a'), {
    id: 'w4_s3',
    worldId: 4,
    stageNumber: 21,
    title: '4.3 · MNQ 1m Real Sota Rellotge (24s + Ticks CME)',
    subtitle: 'Gràfic històric real d’MNQ en 1m (HTF 5m): vigila el lotatge i la fricció!',
    mode: 'EXECUTION',
    timeLimitSec: 24,
    coachingTakeaway:
      'En MNQ 1m real, mantenir l’SL fora de la metxa estructural (~1.0-1.3 ATR) evita que un simple re-test algorítmic et tregui abans del desplaçament.',
  }),

  buildRealPackScenario(getPack('mnq_5m_scalp_c'), {
    id: 'w4_s4',
    worldId: 4,
    stageNumber: 22,
    title: '4.4 · MNQ 5m / 15m Real: Impuls Direccional Nasdaq',
    subtitle: 'Comprova l’estructura en 15m amb un toc i executa el setup intradia en 5m',
    mode: 'EXECUTION',
    timeLimitSec: 24,
    coachingTakeaway:
      'Quan el 15m i el 5m del Nasdaq s’alineen a favor de la mateixa piscina de liquidesa, l’MNQ ofereix recorreguts nets de 40 a 90 punts en menys d’una hora.',
  }),

  buildRealPackScenario(getPack('mnq_5m_scalp_f'), {
    id: 'w4_s5',
    worldId: 4,
    stageNumber: 23,
    title: '4.5 · MNQ Gestor en Viu: Cobrar Parcials i Runner',
    subtitle: 'Gestiona una posició oberta en MNQ 5m real durant retrocessos ràpids',
    mode: 'MANAGEMENT',
    coachingTakeaway:
      'Operant múltiples contractes MNQ (ex. 2 o 4 MNQ), tancar un 50% després del segon impuls i moure la resta a Break-Even et permet capturar dies de tendència sencers amb risc zero.',
  }),

  buildRealPackScenario(getPack('mnq_5m_scalp_e'), {
    id: 'w4_s6',
    worldId: 4,
    stageNumber: 24,
    title: '4.6 · EXAMEN PROP FIRM MNQ: Sessió Replay Real',
    subtitle: 'Supera l’objectiu d’R en MNQ real respectant el límit estricte de Drawdown',
    mode: 'REPLAY_EXAM',
    coachingTakeaway:
      'Aprovar aquest examen demostra la disciplina clau per mantenir comptes fondejats d’MNQ: pocs tirs, alta asimetria i zero revenge trading.',
  }),

  // ============================================================================
  // WORLD 5: MÀSTER SWING AMB CRIPTO (BTC, ETH, SOL, Alts · Stages 25..30)
  // ============================================================================
  makeGuidedScenario({
    id: 'w5_s1',
    worldId: 5,
    stageNumber: 25,
    title: '5.1 · Cripto Top-Down: Zona 4H + Gatell CHoCH',
    subtitle: 'Alterna entre LTF i HTF per alinear el descompte major amb l’entrada fina',
    mode: 'RADAR',
    style: 'SWING',
    timeframe: '15m',
    htfTimeframe: '1H',
    htfGroupSize: 4,
    seed: 501,
    visibleCount: 64,
    futureCount: 24,
    baseVolatility: 0.9,
    anchors: [
      { index: 0, price: 310 },
      { index: 20, price: 332, volumeMultiplier: 2.2 },
      { index: 36, price: 320 },
      { index: 48, price: 315.5 },
      { index: 56, price: 314.2, wickBottomBoost: 2.5, volumeMultiplier: 2.4 },
      { index: 63, price: 319.4, volumeMultiplier: 2.1 },
      { index: 87, price: 335.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w5s1_htfdem',
        kind: 'DEMAND_ZONE',
        priceTop: 317.0,
        priceBottom: 312.5,
        startIndex: 4,
        endIndex: 66,
        label: 'Demanda Major HTF + CHoCH Alcista LTF',
        tone: 'bull',
      },
    ],
    coachingTakeaway:
      'En Swing Cripto, les correccions semblen desploms si mires només 15m; canviar a HTF et revela quan estem aterrant exactament a la Zona de Demanda institucional.',
    radarConfig: {
      prompt:
        'Compara LTF i HTF amb el selector superior. Després d’una correcció fins a ~314, el preu fa un rebot potent amb volum sobre 319. Quin és el diagnòstic de Swing?',
      timeLimitSec: 30,
      choices: [
        {
          id: 'aligned_swing_long',
          label: 'Alineació A+ Alcista: mitigació de Demanda HTF + CHoCH confirmat en LTF',
          sublabel: 'Escenari ideal de Swing Cripto amb alt R:R cap a ~332+',
          isCorrect: true,
          feedback:
            'Lectura Top-Down impecable! Tens la tendència major a favor i un Stop Loss molt acotat sota el mínim del Sweep.',
        },
        {
          id: 'ltf_bear_continuation',
          label: 'Mercat baixista pur: vendre ja a 319',
          sublabel: 'Visió túnel sobre la correcció recent',
          isCorrect: false,
          feedback:
            'Mirant l’HTF veus que tota la baixada era només un retorn saludable a l’origen de l’impuls major.',
        },
      ],
    },
  }),

  makeGuidedScenario({
    id: 'w5_s2',
    worldId: 5,
    stageNumber: 26,
    title: '5.2 · Cripto Liquidation Flush (Neteja de Longs 20x)',
    subtitle: 'El patró més rendible de Bitcoin i Solana en 1H / 4H',
    mode: 'EXECUTION',
    style: 'SWING',
    timeframe: '1H',
    htfTimeframe: '4H',
    htfGroupSize: 4,
    seed: 512,
    visibleCount: 56,
    futureCount: 28,
    baseVolatility: 1.6,
    anchors: [
      { index: 0, price: 142 },
      { index: 16, price: 158, volumeMultiplier: 2.1 },
      { index: 26, price: 149.0 }, // Obvious support where retail 20x longs pile up
      { index: 35, price: 155.5 },
      { index: 44, price: 149.2 }, // Equal Lows in Crypto = Liquidation magnet!
      { index: 50, price: 144.8, wickBottomBoost: 3.8, volumeMultiplier: 3.8 }, // Massive Liquidation Cascade down to ~138.8!
      { index: 55, price: 150.6, volumeMultiplier: 2.4 }, // Full V-Reclaim back above 149!
      { index: 60, price: 147.8 }, // Healthy retest without breaking liquidation wick
      { index: 75, price: 161.5 },
      { index: 83, price: 166.0 },
    ],
    xrayAnnotations: [
      {
        id: 'w5s2_liq',
        kind: 'SWEEP',
        priceTop: 149.1,
        priceBottom: 138.6,
        startIndex: 47,
        endIndex: 56,
        label: 'Liquidation Flush Cripto + Reclamació Alcista',
        tone: 'bull',
      },
      {
        id: 'w5s2_tp',
        kind: 'LIQUIDITY_POOL',
        priceTop: 159.0,
        startIndex: 15,
        endIndex: 76,
        label: 'Objectiu Màxims de Swing (+2.2R)',
        tone: 'liquidity',
      },
    ],
    coachingTakeaway:
      'En Cripto, quan el Funding Rate és alt i tothom va apalancat sobre un doble sòl, una cascada de liquidacions deixa una metxa gegant amb volum rècord. Quan tanca de nou per sobre del suport antic, el camí alcista queda net d’obstacles!',
    executionBlueprint: {
      optimalSide: 'LONG',
      invalidationPrice: 138.5,
      slToleranceAtr: 0.75,
      logicalTargetPrice: 162.5,
      minAcceptableRR: 1.9,
    },
  }),

  makeGuidedScenario({
    id: 'w5_s3',
    worldId: 5,
    stageNumber: 27,
    title: '5.3 · El Mur Invisible de 4H en Altcoins',
    subtitle: 'No compris una Altcoin eufòrica estavellant-se contra Oferta Major HTF!',
    mode: 'EXECUTION',
    style: 'SWING',
    timeframe: '15m',
    htfTimeframe: '1H',
    htfGroupSize: 4,
    seed: 503,
    visibleCount: 64,
    futureCount: 26,
    baseVolatility: 0.95,
    anchors: [
      { index: 0, price: 265 },
      { index: 16, price: 238, volumeMultiplier: 2.5 },
      { index: 32, price: 246 },
      { index: 44, price: 242 },
      { index: 54, price: 256 },
      { index: 63, price: 262.8, volumeMultiplier: 1.7 },
      { index: 67, price: 264.5, wickTopBoost: 2.4 },
      { index: 80, price: 244.0 },
      { index: 89, price: 240.5 },
    ],
    xrayAnnotations: [
      {
        id: 'w5s3_htfsup',
        kind: 'SUPPLY_ZONE',
        priceTop: 266.2,
        priceBottom: 261.5,
        startIndex: 0,
        endIndex: 72,
        label: 'Paret d’Oferta Major HTF (Origen del Desplom)',
        tone: 'bear',
      },
    ],
    coachingTakeaway:
      'En Altcoins, comprar per FOMO a Crypto Twitter just quan arriba a l’Oferta Major de 4H/1H sense cap pullback ni confirmació és regalar els teus USDT. Espera fora!',
    executionBlueprint: {
      optimalSide: 'SKIP',
      invalidationPrice: 267.0,
      slToleranceAtr: 0.6,
      logicalTargetPrice: 244.0,
      minAcceptableRR: 2.0,
      trapExplanation:
        'Doble trampa! Comprar ara xoca de ple contra l’Oferta Major d’HTF (~263-266), i vendre sense que el 15m hagi fet cap CHoCH baixista és anticipar-se a cegues. Toca NO OPERAR i esperar gatell.',
    },
  }),

  buildRealPackScenario(getPack('crypto_sol_1h_swing_b'), {
    id: 'w5_s4',
    worldId: 5,
    stageNumber: 28,
    title: '5.4 · Swing Real en Alta Beta Cripto (1H ↔ 4H)',
    subtitle: 'Analitza l’estructura de 4H, dimensiona en USDT i executa el Swing en 1H',
    mode: 'EXECUTION',
    coachingTakeaway:
      'Les criptomonedes d’alta beta (com SOL, AVAX o SUI) amplifiquen els moviments de BTC: l’SL estructural és més ample en %, per la qual cosa la calculadora redueix automàticament la mida en USDT mantenint idèntic el teu 1R!',
  }),

  buildRealPackScenario(getPack('crypto_btc_4h_swing_a'), {
    id: 'w5_s5',
    worldId: 5,
    stageNumber: 29,
    title: '5.5 · Gestor de Swing Bitcoin Real (4H / 1D)',
    subtitle: 'Aguanta dies de volatilitat real de BTC sense regalar la tendència per por',
    mode: 'MANAGEMENT',
    coachingTakeaway:
      'En gràfics de 4H de Bitcoin, cada espelma són 4 hores: saber aguantar 10–20 espelmes (2-3 dies) sense tocar res mentre l’estructura es respecta és el que genera els grans múltiples d’R.',
  }),

  buildRealPackScenario(getPack('crypto_eth_4h_swing_a'), {
    id: 'w5_s6',
    worldId: 5,
    stageNumber: 30,
    title: '5.6 · EXAMEN SWING CRIPTO: Replay 4H / 1D Real',
    subtitle: 'Sessió completa a cegues sobre Cripto Major amb control d’equitat',
    mode: 'REPLAY_EXAM',
    coachingTakeaway:
      'Has completat l’especialització de Swing Cripto! Recorda sempre vigilar la correlació amb BTC abans d’obrir més d’una Altcoin alhora.',
  }),

  // ============================================================================
  // WORLD 6: GRADUACIÓ PRO — ARENA CEGA MNQ SCALP & CRIPTO SWING (Stages 31..36)
  // ============================================================================
  buildRealPackScenario(getPack('mnq_1m_scalp_c'), {
    id: 'w6_s1',
    worldId: 6,
    stageNumber: 31,
    title: '6.1 · Prova Pro I: MNQ Velocitat Pura (1m / 5m Real)',
    subtitle: '20 segons de rellotge sobre Micro Nasdaq real ocult. Executa o descarta!',
    mode: 'EXECUTION',
    timeLimitSec: 20,
    coachingTakeaway:
      'En l’arena Pro ja no necessites pistes: estructura, metxes de liquidesa i ràtio R:R neta en menys de 20 segons.',
  }),

  buildRealPackScenario(getPack('crypto_avax_4h_swing_a'), {
    id: 'w6_s2',
    worldId: 6,
    stageNumber: 32,
    title: '6.2 · Prova Pro II: Altcoin Swing Institucional (4H / 1D)',
    subtitle: 'Zero pistes. Lectura Top-Down i invalidesa exacta sobre Cripto real',
    mode: 'EXECUTION',
    coachingTakeaway:
      'Quan combines paciència en Cripto 4H amb execució ràpida en MNQ, tens el millor dels dos mons: flux de caixa intradia + creixement patrimonial de swing.',
  }),

  buildRealPackScenario(getPack('mnq_15m_intraday_b'), {
    id: 'w6_s3',
    worldId: 6,
    stageNumber: 33,
    title: '6.3 · Prova Pro III: Gestió sota Pressió en MNQ Real',
    subtitle: 'Extreu el màxim rendiment d’una sessió volàtil del Nasdaq',
    mode: 'MANAGEMENT',
    coachingTakeaway:
      'La sang freda es construeix amb centenars d’hores de vol deliberades sobre dades reals com aquestes.',
  }),

  buildRealPackScenario(getPack('crypto_link_1h_swing_b'), {
    id: 'w6_s4',
    worldId: 6,
    stageNumber: 34,
    title: '6.4 · Prova Pro IV: Gestió de Tendència Cripto (1H / 4H)',
    subtitle: 'Protegeix guanys parcials i deixa córrer el runner en Cripto real',
    mode: 'MANAGEMENT',
    coachingTakeaway:
      'Cobrar un 50% a +2R i deixar la resta amb SL a Break-Even és l’antídot definitiu contra el FOMO i el pànic.',
  }),

  buildRealPackScenario(getPack('mnq_5m_scalp_b'), {
    id: 'w6_s5',
    worldId: 6,
    stageNumber: 35,
    title: '6.5 · EXAMEN FINAL MNQ SCALP: Prop Firm Mastery',
    subtitle: 'Supera la prova de fondeig de Micro Nasdaq en Replay a cegues',
    mode: 'REPLAY_EXAM',
    coachingTakeaway:
      'Amb aquesta disciplina de risc sobre el coixí de Drawdown, estàs preparat per afrontar avaluacions d’MNQ amb avantatge estadístic.',
  }),

  buildRealPackScenario(getPack('crypto_sol_4h_swing_b'), {
    id: 'w6_s6',
    worldId: 6,
    stageNumber: 36,
    title: '6.6 · GRAN EXAMEN MESTRE: Cripto Swing Pro',
    subtitle: 'Certificació final EdgeDojo sobre cicle real de Cripto 4H / 1D',
    mode: 'REPLAY_EXAM',
    coachingTakeaway:
      'Graduació completada! Ja tens l’estructura, la lectura de liquidesa, la calculadora d’MNQ i Cripto, el pla d’escalat i el Checklist Pre-Mercat per executar amb seguretat.',
  }),
];

/**
 * Generates endless randomized specialized scenarios for the Free Drill Gym ("Gimnàs MNQ & Cripto")
 * where SCALP = 100% Real MNQ (1m / 5m / 15m) and SWING = 100% Real Crypto (BTC, ETH, SOL, AVAX, LINK, SUI, BNB)!
 */
export function generateGymDrillScenario(params: {
  styleFilter: 'ALL' | 'SCALP' | 'SWING';
  modeFilter: 'MIXED' | 'EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM';
  counter: number;
}): Scenario {
  const candidates = REAL_MARKET_PACKS.filter((p) =>
    params.styleFilter === 'ALL' ? true : p.style === params.styleFilter
  );
  const pack =
    candidates[params.counter % Math.max(candidates.length, 1)] ||
    REAL_MARKET_PACKS[0];

  const modes: ('EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM')[] = [
    'EXECUTION',
    'EXECUTION',
    'MANAGEMENT',
    'REPLAY_EXAM',
  ];
  const chosenMode =
    params.modeFilter === 'MIXED'
      ? modes[params.counter % modes.length]
      : params.modeFilter;

  const isMnq = pack.style === 'SCALP';

  return buildRealPackScenario(pack, {
    id: `gym_${pack.id}_${params.counter}`,
    worldId: 0,
    stageNumber: 0,
    title: isMnq
      ? `Gimnàs MNQ Scalp #${params.counter + 1}`
      : `Gimnàs Cripto Swing #${params.counter + 1}`,
    subtitle: isMnq
      ? `Micro Nasdaq Real Ocult (${pack.ltf} / HTF ${pack.htf}) · Sota pressió i costos CME`
      : `Cripto Real Oculta (${pack.ltf} / HTF ${pack.htf}) · Top-Down i Asimetria`,
    mode: chosenMode,
    timeLimitSec:
      chosenMode === 'EXECUTION' && isMnq ? 22 : undefined,
    coachingTakeaway: isMnq
      ? 'En MNQ Scalp: confirma amb l’HTF, posa SL darrere la metxa i executa amb contractes ajustats al teu 1R.'
      : 'En Cripto Swing: paciència a les zones de 4H/1D, vigila la correlació amb BTC i deixa córrer els guanyadors.',
  });
}
