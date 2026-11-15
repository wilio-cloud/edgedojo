import { MicroLesson, WorldDefinition } from '../engine/types';

export const CAMPAIGN_WORLDS: WorldDefinition[] = [
  {
    id: 1,
    slug: 'esquelet-del-preu',
    title: 'Món 1 · Estructura, Volum i Desplaçament',
    subtitle: 'HH/HL, BOS vs CHoCH, Llei d’Esforç/Resultat i rangs trampa',
    styleFocus: 'CORE',
    accentColor: 'cyan',
    badgeName: 'Lector d’Estructura',
    unlockRequirementStars: 0,
    scenarioIds: ['w1_s1', 'w1_s2', 'w1_s3', 'w1_s4', 'w1_s5', 'w1_s6'],
  },
  {
    id: 2,
    slug: 'liquidesa-i-trampes',
    title: 'Món 2 · Liquidesa, Inducement i Sweeps',
    subtitle: 'Equal Highs/Lows, Stop Hunts, Inducement (IDM) i Zones Fresques',
    styleFocus: 'CORE',
    accentColor: 'amber',
    badgeName: 'Caçador de Liquidesa',
    unlockRequirementStars: 8,
    scenarioIds: ['w2_s1', 'w2_s2', 'w2_s3', 'w2_s4', 'w2_s5', 'w2_s6'],
  },
  {
    id: 3,
    slug: 'execucio-asimetrica',
    title: 'Món 3 · Risc, Invalidesa i Asimetria R:R',
    subtitle: 'SL estructural, regla de l’1% vs 2%, gestió activa i filtre FOMO',
    styleFocus: 'CORE',
    accentColor: 'emerald',
    badgeName: 'Franctirador R:R',
    unlockRequirementStars: 16,
    scenarioIds: ['w3_s1', 'w3_s2', 'w3_s3', 'w3_s4', 'w3_s5', 'w3_s6'],
  },
  {
    id: 4,
    slug: 'master-scalping-mnq',
    title: 'Món 4 · Màster SCALPING amb MNQ',
    subtitle: 'Micro Nasdaq ($2/pt): NY Open 15:30h, 1m/5m, ticks i Prop Firms',
    styleFocus: 'SCALP',
    accentColor: 'rose',
    badgeName: 'Especialista MNQ',
    unlockRequirementStars: 24,
    scenarioIds: ['w4_s1', 'w4_s2', 'w4_s3', 'w4_s4', 'w4_s5', 'w4_s6'],
  },
  {
    id: 5,
    slug: 'master-swing-cripto',
    title: 'Món 5 · Màster SWING amb CRIPTO',
    subtitle: 'BTC, ETH, SOL i Alts (1H/4H/1D): Top-Down, Liquidacions i Sang Freda',
    styleFocus: 'SWING',
    accentColor: 'violet',
    badgeName: 'Arquitecte Cripto Swing',
    unlockRequirementStars: 32,
    scenarioIds: ['w5_s1', 'w5_s2', 'w5_s3', 'w5_s4', 'w5_s5', 'w5_s6'],
  },
  {
    id: 6,
    slug: 'prova-de-foc-pro',
    title: 'Món 6 · Graduació PRO: MNQ & Cripto a Cegues',
    subtitle: 'Exàmens finals sobre mercat històric 100% real sense pistes',
    styleFocus: 'CORE',
    accentColor: 'sky',
    badgeName: 'Mestre Institucional',
    unlockRequirementStars: 42,
    scenarioIds: ['w6_s1', 'w6_s2', 'w6_s3', 'w6_s4', 'w6_s5', 'w6_s6'],
  },
];

export const MICRO_LESSONS: MicroLesson[] = [
  {
    worldId: 1,
    title: 'Mòdul 1 · Estructura Pura, Volum i Desplaçament',
    subtitle: 'Com llegir en 3 segons qui controla la subhasta del mercat',
    readTimeSec: 45,
    diagramType: 'STRUCTURE_BOS_CHOCH',
    keyRules: [
      'Tendència alcista = Màxims i Mínims creixents (HH + HL). Mentre l’últim HL protegit aguanti, tota caiguda és un descompte per buscar compres, no un gir.',
      'BOS (Break of Structure): trencament amb COS d’espelma a favor de la tendència. Confirma que el flux institucional continua actiu.',
      'CHoCH (Change of Character): primer trencament amb cos i volum de l’últim HL/LH que va crear el màxim/mínim extrem. És el primer avís real de gir.',
    ],
    deepDiveSections: [
      {
        heading: 'La Regla del Cos vs. La Metxa',
        body: 'Els algoritmes institucionals reconeixen un trencament d’estructura real quan el COS de l’espelma tanca més enllà del nivell. Si només el perfora amb metxa i tanca a dins, NO és un BOS: és una escombrada de liquidesa (Sweep).',
      },
      {
        heading: 'Llei de Wyckoff: Esforç (Volum) vs. Resultat (Cos)',
        body: 'Un moviment sa mostra espelmes àmplies amb volum creixent (Desplaçament) que deixen desequilibris (FVG). En canvi, si veus un volum gegantí però l’espelma tanca minúscula o amb llarga metxa en contra, hi ha ABSORCIÓ oculta.',
      },
    ],
    commonTrap:
      'Confondre qualsevol espelma vermella grossa amb un gir de tendència quan l’últim Higher Low (HL) ni tan sols s’ha trencat.',
    proMantra: 'No endevinis sostres ni sòls: opera a favor del BOS o espera un CHoCH amb desplaçament.',
  },
  {
    worldId: 2,
    title: 'Mòdul 2 · Liquidesa, Inducement i Trampes',
    subtitle: 'Per què el mercat caça el teu Stop abans d’anar exactament on deies',
    readTimeSec: 50,
    diagramType: 'LIQUIDITY_SWEEP',
    keyRules: [
      'Els dobles sostres i dobles sòls nets (Equal Highs / Equal Lows) NO són resistències fortes: són piscines plenes d’ordres Stop Loss pendents.',
      'Inducement (IDM): petita parada intermèdia abans de la Zona d’Oferta/Demanda real creada per fer entrar massa aviat els impacients i utilitzar els seus Stops com a benzina.',
      'Una Zona d’Oferta/Demanda és A+ només si és FRESCA (no tocada abans), ha deixat desequilibri (imbalance) i ha trencat estructura.',
    ],
    deepDiveSections: [
      {
        heading: 'Mecànica de l’Ordre Institucional',
        body: 'Un fons que vol comprar 500 contractes d’MNQ o 20M$ en BTC no pot prémer "Buy Market" al mig del no-res sense disparar el preu en contra seva. Necessita empènyer el preu sota un mínim evident on milers de retail tenen el seu Sell-Stop (vendes forçades) per comprar-los-ho tot sense lliscament.',
      },
      {
        heading: 'El Protocol Post-Sweep',
        body: 'Mai entris mentre l’espelma encara cau a plom! Espera: 1) Escombrada del mínim/màxim previ, 2) Reclamació ràpida tancant de nou dins del rang, i 3) Micro-CHoCH a favor.',
      },
    ],
    commonTrap:
      'Comprar en "Breakout" just quan el preu trenca un màxim evident sense esperar tancament ni re-test: compres el cim d’un Bull Trap.',
    proMantra: 'Si no identifiques qui està atrapat al gràfic abans d’entrar, l’atrapat ets tu.',
  },
  {
    worldId: 3,
    title: 'Mòdul 3 · Matemàtica del Risc: 1% vs 2% i Invalidesa',
    subtitle: 'Com blindar el capital i fer que les matemàtiques treballin per tu',
    readTimeSec: 60,
    diagramType: 'ASYMMETRIC_RR',
    keyRules: [
      'L’Stop Loss es posa on s’invalida la tesi estructural (darrere la metxa del Sweep), i és la MIDA DE LA POSICIÓ (contractes MNQ o USDT) la que s’ajusta perquè aquesta distància equivalgui a 1R.',
      'Estàndard d’or: 0.5% a 1.0% per operació en Scalp MNQ (o 4%-6% del coixí en Prop Firm), i 1.0% a 1.5% en Swing Cripto (2.0% és el sostre màxim absolut només en Setup A+ sense altres posicions obertes!).',
      'Amb ràtios R:R >= 2.2R, fins i tot encertant només el 40% d’operacions guanyes diners de forma consistent.',
    ],
    deepDiveSections: [
      {
        heading: 'Per què l’1% supera el 2%+ a llarg termini?',
        body: 'Amb un winrate del 45%, la probabilitat de patir una ratxa de 5 pèrdues seguides en 50 trades supera el 65%! Al 1% de risc, 5 stops són un -4.9% (zero estrès, segueixes executant bé). Al 3%, 5 stops són un -14.2%: entres en pànic, dubtes en el 6è trade —que era el guanyador de +3R— i trenques el sistema.',
      },
      {
        heading: 'La Regla Antidrawdown d’Escalat (Step-Down)',
        body: 'Puges de graó quan consolides +12% / +15% de compte. Si en qualsevol moment caus un -5% des del teu màxim històric, talles el risc per trade a la meitat (0.5%) fins recuperar el sotrac. Així és matemàticament gairebé impossible cremar el compte.',
      },
    ],
    commonTrap:
      'Escurçar l’Stop Loss dins del soroll només per poder posar més contractes o veure "5R" a la pantalla.',
    proMantra: 'Els amateurs pensen quant poden guanyar en aquest trade; els professionals pensen com ser vius d’aquí a 1.000 trades.',
  },
  {
    worldId: 4,
    title: 'Mòdul 4 · Màster SCALPING amb MNQ (Micro Nasdaq)',
    subtitle: 'Especificacions CME ($2/pt), Horaris NY en hora nostra i Prop Firms',
    readTimeSec: 65,
    diagramType: 'SCALP_FRICTION',
    keyRules: [
      'Especificació MNQ: 1 punt = 2,00 $ | 1 tick (0.25 pts) = 0,50 $ | Comissió round-trip ~1,30 $/contracte. Si tens 100 $ de risc màxim (1R) i un SL estructural de 20 punts (41,30 $/lot), operes exactament 2 contractes MNQ.',
      'Millor finestra d’or (Hora Barcelona/Madrid CET): 15:30h – 17:15h (NY Cash Open + AM Silver Bullet). A les 15:30h vigila el Judas Swing que escombra el màxim o mínim Pre-Market!',
      'PROHIBIT operar el NY Lunch Chop (18:00h – 19:30h CET): el volum institucional cau en picat i els algoritmes escombren màxims i mínims sense direcció.',
    ],
    deepDiveSections: [
      {
        heading: 'La Trampa dels Comptes de Fondeig (Prop Firms 50k / 100k)',
        body: 'Si operes una prova de 50.000 $ amb 2.500 $ de Trailing Drawdown, NO tens 50.000 $: tens 2.500 $! Mai calculis l’1% de 50k (500 $ = 5 stops i compte mort). Calcula el 5% del teu coixí de 2.500 $ = 125 $ de risc màxim per trade (2 a 3 contractes MNQ, mai NQ gran!).',
      },
      {
        heading: 'Gestió d’Scalp en MNQ: El Poder dels Micro-Contractes',
        body: 'L’avantatge brutal d’operar 2 o 4 MNQ en lloc d’1 E-mini NQ és la granularitat: pots tancar el 50% dels contractes a la primera piscina de liquidesa (+1.8R) pagant totes les comissions i deixar córrer l’altra meitat cap a l’extrem oposat de la sessió.',
      },
    ],
    commonTrap:
      'Posar Stops de 4 o 5 punts en MNQ a les 15:30h quan una sola espelma d’1 minut té 25 punts d’ATR: t’escombraran en 3 segons i les comissions et devoraran.',
    proMantra: 'En MNQ: 1 o 2 tirs de franctirador a la finestra de Nova York i tancar la plataforma.',
  },
  {
    worldId: 5,
    title: 'Mòdul 5 · Màster SWING amb CRIPTO (BTC, ETH, SOL i Alts)',
    subtitle: 'Top-Down 1D/4H → 1H, Cascada de Liquidacions i Risc de Correlació',
    readTimeSec: 65,
    diagramType: 'SWING_TOPDOWN',
    keyRules: [
      'Alineació Top-Down: marca les Zones d’Oferta/Demanda i piscines de liquidesa en 1D i 4H, però espera un CHoCH en 1H o 15m per entrar amb un SL del 2%-4% en lloc d’un SL del 12%.',
      'Liquidation Flush (El Setup Rei en Cripto): quan el mercat va carregat de Longs apalancats, fa una metxa violenta que escombra mínims de 4H amb volum rècord i tanca ràpid a sobre. És benzina pura per a un Swing de dies!',
      'Regla de Correlació Cripto: BTC mana. Si portes LONG en ETH (1.5% risc) i LONG en SOL (1.5% risc), portes un 3% real al mateix moviment! Mai superis el 3% de Portfolio Heat total.',
    ],
    deepDiveSections: [
      {
        heading: 'Com funciona el Palanquejament sense Cremar-se en Perps USDT',
        body: 'La mida de la posició es calcula SEMPRE per la distància a l’SL: Mida USDT = Risc $ / (% Distància SL + 0.10% comissió). Si tens 5.000 USDT, arrisques l’1% (50 USDT) i l’SL està a un 5% de distància, la teva posició total és de ~980 USDT (ni tan sols necessites palanquejament!). Si l’SL està a un 2%, la posició és de ~2.380 USDT (exposició 0.48x). Mai usis 20x creuat!',
      },
      {
        heading: 'Paciència en Mercats 24/7',
        body: 'En Cripto, els caps de setmana solen tenir baix volum institucional i falsos moviments que s’escombren diumenge a la nit o dilluns a l’obertura CME. Els millors Swings duren de 2 a 8 dies: no miris el gràfic d’1 minut quan operes un 4H!',
      },
    ],
    commonTrap:
      'Comprar una Altcoin que ja ha pujat un +35% vertical en 4H just quan arriba a una resistència setmanal i Bitcoin està dubtant.',
    proMantra: 'Compra la neteja de liquidacions a la Demanda de 4H; ven l’eufòria a l’Oferta diària.',
  },
  {
    worldId: 6,
    title: 'Mòdul 6 · Psicologia d’Elit i Pla d’Escalat cap a Pro',
    subtitle: 'Com passar del simulador a escalar capital real amb seguretat total',
    readTimeSec: 50,
    diagramType: 'PROP_RISK_MATH',
    keyRules: [
      'Transició sense xoc emocional: comença en directe amb la meitat del teu risc objectiu (0.5% o 1 sol contracte MNQ) durant les primeres 25 operacions reals.',
      'Límit Diari de Pèrdua Innegociable (Circuit Breaker): màxim -2.5R en un sol dia d’MNQ. Si toques dos Stops seguits i et notes tens, s’acaba la sessió fins demà.',
      'Retirada i Escalat: cada cop que el compte puja un +15% net, retira un 20% dels beneficis al teu compte bancari i recalcula l’1% sobre el nou capital consolidat.',
    ],
    deepDiveSections: [
      {
        heading: 'L’Efecte de Probabilitat en Blocs de 20 Trades',
        body: 'Accepta abans de clicar "Executar" que el resultat d’AQUEST trade individual és incert, però que el resultat de 20 Setups A+ amb R:R >= 2.2 és matemàticament positiu. Això elimina completament la por a prémer el gallet i la temptació de moure l’SL.',
      },
      {
        heading: 'Sinergia Professional: Flux de Caixa MNQ + Patrimoni Cripto',
        body: 'Els traders complets separen dos motors: l’Scalping d’MNQ a l’obertura de Nova York (15:30h–17:15h CET) actua com a generador de flux de caixa diari/setmanal amb risc tancat al minut, mentre que part dels beneficis retirats alimenten la cartera de Swing Cripto en 4H/1D per capturar grans tendències macro sense estrès de pantalla.',
      },
    ],
    commonTrap:
      'Pujar de 1 contracte MNQ a 5 contractes MNQ de cop després d’una bona setmana: un sol mal matí s’emporta el treball de tot un mes.',
    proMantra: 'Consistència avorrida + Interès compost = Llibertat professional.',
  },
];
