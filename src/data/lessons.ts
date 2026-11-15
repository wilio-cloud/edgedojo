import { MicroLesson, WorldDefinition } from '../engine/types';

export const CAMPAIGN_WORLDS: WorldDefinition[] = [
  {
    id: 1,
    slug: 'esquelet-del-preu',
    title: 'Món 1 · Estructura, Volum i Desplaçament',
    subtitle: 'HH/HL protegit, BOS vs CHoCH, FVG (3 espelmes) i Descompte 50%',
    styleFocus: 'CORE',
    accentColor: 'cyan',
    badgeName: 'Lector d’Estructura',
    unlockRequirementStars: 0,
    scenarioIds: ['w1_s1', 'w1_s2', 'w1_s3', 'w1_s4', 'w1_s5', 'w1_s6'],
  },
  {
    id: 2,
    slug: 'liquidesa-i-trampes',
    title: 'Món 2 · Liquidesa (BSL/SSL), Inducement i Sweeps',
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
    title: 'Món 3 · Risc, Invalidesa i Gestió en Viu',
    subtitle: 'SL estructural, regla de l’1% vs 2%, BE/Parcials i filtre FOMO',
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
    subtitle: 'Micro Nasdaq ($2/pt): NY Open 15:30h, Prop Firms (Trailing vs EOD)',
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
    subtitle: 'BTC, ETH, SOL i Alts (1H/4H/1D): Liquidacions, Beta i Funding',
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
    title: 'Mòdul 1 · Estructura Pura, Desplaçament i FVG',
    subtitle: 'Com llegir en segons qui controla la subhasta institucional del preu',
    readTimeSec: 75,
    diagramType: 'STRUCTURE_BOS_CHOCH',
    keyRules: [
      'Estructura Swing (HH + HL): una tendència alcista fa Màxims i Mínims creixents. L’únic mínim que invalida la tendència (l’HL Protegit) és l’origen que va impulsar l’últim màxim (HH); els petits retrocessos intermedis són simple soroll intern.',
      'BOS vs CHoCH: un BOS (Break of Structure) és un trencament amb COS d’espelma tancat a favor de la tendència (continuació). Un CHoCH (Change of Character) és el primer trencament amb cos i volum de l’últim HL/LH protegit (avís real de gir).',
      'Regla del 50% (Descompte vs Premium): divideix per la meitat l’últim impuls (HL → HH). Per sota del 50% és zona de Descompte (barat per comprar retorns alcistes); comprar per sobre del 50% (Premium) arruïna el teu ràtio R:R.',
      'Desplaçament i FVG (Fair Value Gap): l’entrada institucional deixa espelmes àmplies amb volum alt i un buit de 3 espelmes sense encavalcament de metxes (FVG o Imbalance) que després actua com a imant de recàrrega.',
    ],
    deepDiveSections: [
      {
        heading: '1. La Regla d’Or: Cos Tancat vs. Metxa',
        body: 'Els algoritmes institucionals només validen un BOS o un CHoCH quan el COS de l’espelma tanca més enllà del nivell estructural. Si el preu el perfora únicament amb la metxa i tanca de nou a dins del rang, NO és una ruptura d’estructura: és una escombrada de liquidesa (Liquidity Sweep).',
      },
      {
        heading: '2. Anatomia Visual de les 3 Espelmes d’un FVG',
        body: 'Observa qualsevol seqüència de 3 espelmes durant una expansió forta: Espelma 1 (base), Espelma 2 (gran cos explosiu) i Espelma 3 (continuació). Si entre el màxim de la metxa de l’Espelma 1 i el mínim de la metxa de l’Espelma 3 queda un espai buit on només ha passat el cos de la 2a espelma, tens un FVG alcista. El mercat sol tornar a poc a poc i amb poc volum a mitigar aquest buit i la Zona de Demanda d’origen abans de reprendre la tendència.',
      },
      {
        heading: '3. Llei de Wyckoff: Esforç (Volum) vs. Resultat (Cos)',
        body: 'Compara sempre la mida del volum amb l’avanç real del cos: (a) Volum alt + cos ampli = intenció institucional real; (b) Pic extrem de volum + cos minúscul o llarga metxa en contra = ABSORCIÓ oculta (ordres límit institucionals engolint les ordres en pànic del retail); (c) Espelmes encavalcades amb metxes als dos costats al mig d’un rang lateral (Chop) = NO OPERAR.',
      },
    ],
    commonTrap:
      'Confondre qualsevol espelma vermella grossa amb un gir baixista quan l’últim Higher Low (HL) protegit ni tan sols s’ha perforat, o operar al bell mig d’un rang lateral.',
    proMantra:
      'El cos confirma l’estructura; la metxa caça la liquidesa; el volum delata la veritat.',
  },
  {
    worldId: 2,
    title: 'Mòdul 2 · Liquidesa (BSL/SSL), Inducement i Sweeps',
    subtitle: 'Per què el mercat escombra el teu Stop just abans d’anar on deies',
    readTimeSec: 80,
    diagramType: 'LIQUIDITY_SWEEP',
    keyRules: [
      'BSL i SSL (Imants d’Stops): sobre cada doble sostre o màxim net (Equal Highs) s’acumula BSL (Buy-Side Liquidity: Stops dels curts + compres de breakout). Sota cada doble sòl o mínim net (Equal Lows) s’acumula SSL (Sell-Side Liquidity: Stops dels llargs). Els nivells plans són benzina, no murs!',
      'Inducement (IDM o Esquer): el primer micro-suport visible a mig camí d’un retrocés gairebé mai aguanta; existeix per atraure compradors impacients i utilitzar els seus Stops per omplir la Zona de Demanda Extrema real de més avall.',
      'Zones Fresques vs. Gastades: una Zona d’Oferta/Demanda és de grau A+ només la PRIMERA vegada que es toca (Fresca) i si en néixer va crear un FVG i un BOS. Un suport tocat 3 o 4 cops amb rebots cada vegada més curts ja ha esgotat les seves ordres límit.',
      'Mai anticipis l’escombrada: espera que el preu caigui dins la piscina, deixi metxa de rebuig i tanqui de nou dins del rang (Reclamació).',
    ],
    deepDiveSections: [
      {
        heading: '1. Mecànica del Llibre d’Ordres Institucional',
        body: 'Un fons que vol comprar 500 contractes d’MNQ o 20 M$ en BTC no pot comprar a mercat al mig del no-res sense disparar el preu en contra seva (slippage). Necessita empènyer el preu un instant sota un mínim evident (SSL) on milers de retail tenen els seus Sell-Stops: aquestes vendes automàtiques forçades li donen tota la contrapartida necessària al preu més barat.',
      },
      {
        heading: '2. Protocol Anti-Trampes Post-Sweep en 4 Passos',
        body: 'Per no agafar ganivets caients, exigeix aquesta seqüència completa: 1) Localitza una piscina prèvia clara (BSL/SSL o extrem de sessió); 2) Escombrada (Sweep) amb pic de volum; 3) Reclamació: tancament ferm del cos de nou dins del rang previ; 4) Gatell d’entrada en la reclamació o micro-CHoCH amb l’Stop Loss protegit darrere la punta de la metxa del Sweep.',
      },
      {
        heading: '3. Com distingir l’IDM de la Zona Extrema A+',
        body: 'Quan vegis dues zones de Demanda després d’un BOS alcista, fes-te una sola pregunta: ja s’ha escombrat liquidesa abans d’arribar-hi? La primera parada sense neteja prèvia és l’Inducement (IDM); la zona situada a l’origen de l’impuls (just sota l’IDM i protegida per l’HL estructural) és la Zona Extrema d’alta probabilitat.',
      },
    ],
    commonTrap:
      'Comprar en ple "Breakout" eufòric quan una espelma trenca uns Equal Highs (BSL) sense esperar tancament ni re-test: acabes comprant el cim exacte d’un Bull Trap.',
    proMantra:
      'Si abans d’entrar no saps on és l’esquer (IDM) i qui ha quedat atrapat, l’atrapat ets tu.',
  },
  {
    worldId: 3,
    title: 'Mòdul 3 · Risc 1% vs 2%, Invalidesa i Gestió en Viu',
    subtitle: 'Com blindar el capital, dimensionar 1R i no ofegar trades guanyadors',
    readTimeSec: 85,
    diagramType: 'ASYMMETRIC_RR',
    keyRules: [
      'Invalidesa Estructural Primer: l’Stop Loss es col·loca on la tesi deixa de ser vàlida (darrere la metxa del Sweep o l’HL/LH amb 0.15–0.25 ATR de marge), i és la MIDA de la posició (contractes MNQ o USDT) la que s’adapta perquè aquella distància valgui exactament 1R.',
      'Matriu 1% vs 2%: opera entre el 0.5% i l’1.0% en Scalp MNQ (4%–6% del coixí real en Prop Firm) i entre l’1.0% i l’1.5% en Swing Cripto. El 2.0% és el sostre màxim absolut reservat únicament a Setups A+ sense altres posicions obertes.',
      'Filtre Anti-FOMO (R:R >= 2.0R net): si la distància fins al primer sostre d’Oferta o piscina oposada ofereix menys de 2.0R nets, prem NO OPERAR encara que encertis la direcció.',
      'Gestió en Viu (Hold vs BE vs Parcial): no moguis mai l’SL a Break-Even (BE) abans que el preu trenqui estructura nova (BOS); ofegaries el trade durant el re-test normal!',
    ],
    deepDiveSections: [
      {
        heading: '1. Per què l’1% bat el 3%–5% (Llei de les Ratxes)',
        body: 'Amb una esperança matemàtica excel·lent (45% d’encert i +2.4R de guany mitjà), la probabilitat estadística d’encadenar 5 Stops seguits en un bloc de 50 trades supera el 65%! A l’1% de risc, 5 stops són un -4.9% (zero pànic, executes perfecte el 6è trade). Al 4% de risc, 5 stops són un -18.5%: entres en bloqueig emocional, et saltes el 6è setup —que era el guanyador de +3R— i destrueixes l’avantatge.',
      },
      {
        heading: '2. Protocol de Gestió Activa: Quan protegir i quan cobrar?',
        body: 'Quan portes +0.8R flotants però encara no s’ha superat l’últim màxim/mínim intern, toca AGUANTAR (Hold) amb l’SL original perquè un retrocés sa de re-test és completament normal. Només quan el preu confirma un nou BOS amb desplaçament (habitualment a +1.6R / +2.0R) s’activa la protecció: cobres el 50% parcial o mous l’SL a Break-Even i deixes córrer el runner fins a la piscina objectiu.',
      },
      {
        heading: '3. Escala d’Interès Compost i Fre Step-Down (-5%)',
        body: 'Augmenta el valor en dòlars d’1R només quan consolidis graons nets de +12% a +15% de compte. I aplica religiosament el Fre Step-Down: si en qualsevol moment l’equitat cau un -5% des del teu màxim històric, redueix el risc per trade a la meitat (0.5%) fins recuperar el màxim previ. Així fas matemàticament gairebé impossible cremar el compte.',
      },
    ],
    commonTrap:
      'Escurçar l’Stop Loss al mig del soroll només per poder posar més contractes o inventar-se un "5R" fictici al gràfic, o moure a Break-Even per por a +0.6R.',
    proMantra:
      'Els amateurs pensen quant poden guanyar avui; els professionals dissenyen com ser invulnerables d’aquí a 1.000 trades.',
  },
  {
    worldId: 4,
    title: 'Mòdul 4 · Màster SCALPING amb MNQ (Micro Nasdaq)',
    subtitle: 'Especificacions CME ($2/pt), Horaris NY, Notícies i Prop Firms',
    readTimeSec: 90,
    diagramType: 'SCALP_FRICTION',
    keyRules: [
      'Matemàtica Exacta MNQ (CME): 1 punt = 2,00 $ | 1 tick (0.25 pts) = 0,50 $ | Comissió + slippage round-trip ~1,30 $/lot. Fórmula: Lots = floor( 1R $ / (Punts SL × 2 $ + 1,30 $) ). Amb 100 $ de risc i 20 pts d’SL (41,30 $/lot) = 2 contractes MNQ.',
      'Finestres Horàries (Hora Barcelona/Madrid): 15:30h–17:15h és la Finestra Reina (NY Cash Open + AM Silver Bullet). Espera els primers minuts de les 15:30h per caçar el Judas Swing que escombra el màxim o mínim Pre-Market!',
      'Zones Prohibides en MNQ: 18:00h–19:30h (NY Lunch Chop sense volum), 3 minuts abans/després de notícies vermelles EUA (14:30h CPI/NFP, 16:00h ISM, 20:00h FOMC) i SEMPRE tancat abans de les 21:55h (parada diària CME a les 22:00h).',
      'Nota Canvi d’Hora EUA–UE: durant 2–3 setmanes al març i a l’octubre/novembre els EUA canvien l’hora abans/després que Europa i l’obertura NY passa temporalment a les 14:30h!',
    ],
    deepDiveSections: [
      {
        heading: '1. Comptes de Fondeig (Prop Firms): Intraday Trailing vs. EOD',
        body: 'En una prova de 50.000 $ amb 2.500 $ de Drawdown, el teu capital real és 2.500 $! Arrisca el 4%–5% del coixí (100 $–125 $ = 2–3 lots MNQ, mai NQ gran de 20 $/pt!). Distingeix sempre la regla de la teva empresa: (a) Intraday Trailing Drawdown (ex. estil Apex): el sòl puja tick a tick perseguint el teu benefici flotant no tancat; si vas +1.200 $ i torna a 0 $, perds 1.200 $ de coixí! Aquí és vital cobrar parcials a +1.8R/+2R. (b) EOD Drawdown (End-of-Day, ex. estil Topstep): el sòl només s’actualitza al tancament de les 22:00h, molt més net per deixar córrer runners.',
      },
      {
        heading: '2. Seqüència Top-Down d’Execució (15m/5m → 1m)',
        body: 'Abans de les 15:30h marca al gràfic de 15m i 5m el Màxim i Mínim de la sessió de Londres/Overnight, els Equal Highs/Lows pendents i els FVG frescos. Quan obre Wall Street, no persegueixis la primera espelma: espera que el preu escombri un d’aquests extrems i baixa a 1m per disparar només quan vegis tancament de reclamació + CHoCH amb volum i SL d’almenys 10–25 punts.',
      },
      {
        heading: '3. Granularitat amb Parells de Contractes (2 o 4 MNQ)',
        body: 'Operar 2 o 4 contractes MNQ et dona un control quirúrgic impossible amb 1 NQ: tanques el 50% dels lots a la primera piscina interna (+1.8R), pagues totes les comissions, puges l’SL de l’altra meitat a Break-Even + 2 punts i deixes treballar el runner cap a l’extrem oposat del dia sense cap estrès.',
      },
    ],
    commonTrap:
      'Posar micro-stops de 4 o 5 punts a les 15:30h quan una sola espelma d’1 minut mou 25 punts d’ATR, o mantenir posicions obertes a les 22:00h quan es disparen els marges overnight.',
    proMantra:
      'En MNQ: 90 minuts de concentració màxima a l’obertura de Nova York, 1 o 2 tirs nets i dia acabat.',
  },
  {
    worldId: 5,
    title: 'Mòdul 5 · Màster SWING amb CRIPTO (BTC, ETH, SOL i Alts)',
    subtitle: 'Top-Down 1D/4H → 1H, Cascada de Liquidacions, Beta i Funding',
    readTimeSec: 90,
    diagramType: 'SWING_TOPDOWN',
    keyRules: [
      'Refinament Top-Down (1D/4H → 1H): localitza Zones d’Oferta/Demanda i piscines en 1D i 4H, però espera l’escombrada + CHoCH en 1H per entrar amb un SL del 2.5%–5% en lloc d’un SL del 12%, multiplicant el teu R:R cap a l’objectiu diari.',
      'Liquidation Flush (El Setup Rei Cripto): quan el mercat va saturat de Longs apalancats, una metxa violenta trenca mínims de 4H amb volum rècord, liquida els apalancats i tanca a sobre reclamant el suport. És benzina pura per a un Swing de dies!',
      'Lideratge de BTC i Ajust per Beta: BTC marca la marea. No obris Longs de Swing en Alts si BTC trenca estructura baixista en 4H/1D. Com que SOL o AVAX tenen més volatilitat (Beta) que BTC, el seu % d’SL és més ampli i la mida en USDT s’ha de reduir automàticament per mantenir 1R constant.',
      'Calor de Cartera (Portfolio Heat <= 3%): BTC, ETH i SOL tenen correlació > 0.80 en caigudes. Mai acumulis més d’un 3.0% de risc total simultani entre totes les posicions obertes!',
    ],
    deepDiveSections: [
      {
        heading: '1. Mida Exacta en USDT i Palanquejament Aïllat (Isolated)',
        body: 'La mida de posició depèn EXCLUSIVAMENT de la distància a l’SL: Posició USDT = Risc 1R (USDT) / (% Distància SL + 0,10% comissió). Amb 5.000 USDT de compte i 1% de risc (50 USDT), si l’SL a SOL és a un 5%, la posició total és de ~980 USDT (0.20x el teu capital!). Si uses Perps per deixar menys capital a l’exchange, configura sempre mode AÏLLAT (Isolated <= 5x) perquè la liquidació quedi lluny de l’SL; mai usis 20x Creuat (Cross)!',
      },
      {
        heading: '2. Spot vs. Futurs Perpetus (Perps) i Funding Rate',
        body: 'En Perps es paga/cobra Funding cada 8 hores. Quan tothom va eufòric en Long, el Funding positiu alt et penalitza cada dia i delata risc d’escombrada baixista (Long Squeeze); quan el Funding és negatiu després d’una caiguda sobre Demanda 4H, tens combustible de Short Squeeze! Per a Swings alcistes de més de 4–5 dies, comprar en Spot evita comissions de Funding i elimina el risc de metxes de liquidació; usa Perps per a Swings d’1–4 dies i per a SHORTS.',
      },
      {
        heading: '3. Gestió d’Horaris en un Mercat 24/7',
        body: 'No miris espelmes d’1m o 5m quan operes un Swing de 4H! Posa alertes als teus nivells i revisa només als tancaments de vela de 4H. Vigila especialment els moviments sense volum de dissabte: sovint són trampes que s’escombren diumenge a la nit o dilluns amb l’obertura institucional dels futurs CME.',
      },
    ],
    commonTrap:
      'Comprar per FOMO una Altcoin que ja ha pujat un +35% vertical en 4H just sota una Oferta Diària mentre Bitcoin perd força.',
    proMantra:
      'Compra la neteja de liquidacions sobre Demanda de 4H; ven l’eufòria apalancada sobre Oferta Diària.',
  },
  {
    worldId: 6,
    title: 'Mòdul 6 · Psicologia d’Elit, Rutina i Escalat cap a Pro',
    subtitle: 'El protocol complet per passar d’EdgeDojo al mercat real amb seguretat',
    readTimeSec: 75,
    diagramType: 'PROP_RISK_MATH',
    keyRules: [
      'Pont d’Aterratge a Directe: un cop aconseguit l’APTE al Passaport, opera les primeres 25 operacions reals amb la meitat del teu risc (0.5% en Cripto o 1 sol contracte MNQ) per calibrar emocions i execució real sense pressió.',
      'Tallafocs Diari Innegociable (Circuit Breaker): màxim -2.5R en un sol dia d’MNQ (o 2 Stops per error d’impulsivitat) = tancar plataforma fins demà. Protegeix també els grans dies de +3R/+4R evitant operar per eufòria.',
      'Retirada i Escalat per Graons: puja la mida d’1R només cada +15% net consolidat, retirant abans un 20%–30% dels beneficis al teu compte bancari.',
    ],
    deepDiveSections: [
      {
        heading: '1. Pensar en Blocs de 20 Operacions (Zero Por d’Executar)',
        body: 'El resultat d’una sola operació és aleatori; el resultat de 20 Setups A+ amb R:R >= 2.2R és matemàticament positiu. Acceptar abans d’entrar que un -1R net forma part normal de l’ofici elimina d’arrel tant la por a prémer el gallet com la temptació mortal de moure o treure l’Stop Loss.',
      },
      {
        heading: '2. Rutina Diària en 4 Passos del Trader Professional',
        body: '1) Pre-Mercat (10 min): revisa calendari de notícies EUA (14:30h / 16:00h / 20:00h) i biaix de BTC 1D/4H. 2) Mapa net: marca piscines BSL/SSL, IDM i Zones Fresques amb alertes de preu. 3) Checklist Pre-Vol (10s): valida Sweep/BOS + SL darrere d’invalidesa + R:R >= 2.0R + mida calculada a la pestanya Risc %. 4) Diari Post-Trade: puntua del 0 al 10 si has complert les regles, independentment de si ha estat TP o SL.',
      },
      {
        heading: '3. Sinergia Dual: Flux de Caixa MNQ + Patrimoni Cripto',
        body: 'Separar dos comptes multiplica la teva estabilitat: l’Scalping d’MNQ a la finestra de Nova York (15:30h–17:15h) genera flux de caixa recurrent i acaba el dia 100% en líquid (zero risc nocturn), mentre que una fracció dels beneficis retirats nodreix el compte de Swing Cripto en 4H/1D per capturar grans tendències estructurals.',
      },
    ],
    commonTrap:
      'Passar d’1 contracte MNQ a 5 contractes MNQ de cop després d’una bona setmana: un sol matí volàtil esborra el treball de tot un mes.',
    proMantra:
      'Disciplina quirúrgica + Risc constant d’1R + Paciència als extrems = Llibertat professional.',
  },
];
