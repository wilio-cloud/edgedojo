import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calculator,
  CheckCircle2,
  Coins,
  Flame,
  Layers,
  RefreshCw,
  Scale,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  buildScalingLadder,
  calculateCryptoSwingSizing,
  calculateMnqPositionSizing,
  simulateCompoundingComparison,
} from '../../engine/riskMasterEngine';
import { useGameStore } from '../../store/useGameStore';
import { playUiTick } from '../../utils/soundHaptics';

type SubTab = 'DOCTRINE' | 'MNQ_CALC' | 'CRYPTO_CALC' | 'SCALING';

const DRAWDOWN_MATH = [
  { dd: '-5%', rec: '+5.3%', status: 'Normal · Soroll operatiu', color: 'text-emerald-400' },
  { dd: '-10%', rec: '+11.1%', status: 'Alerta · Reduir risc 50%', color: 'text-cyan-300' },
  { dd: '-20%', rec: '+25.0%', status: 'Perill · Dany psicològic', color: 'text-amber-300' },
  { dd: '-35%', rec: '+53.8%', status: 'Crític · Risc de tilt sever', color: 'text-orange-400' },
  { dd: '-50%', rec: '+100.0%', status: 'Ruïna tècnica · Cal doblar!', color: 'text-rose-400' },
];

const STREAK_ODDS_50WR = [
  { losses: 4, prob100: '98%', lossAt1Pct: '-3.9%', lossAt2Pct: '-7.8%', lossAt5Pct: '-18.5%' },
  { losses: 6, prob100: '80%', lossAt1Pct: '-5.9%', lossAt2Pct: '-11.4%', lossAt5Pct: '-26.5%' },
  { losses: 8, prob100: '32%', lossAt1Pct: '-7.7%', lossAt2Pct: '-14.9%', lossAt5Pct: '-33.7%' },
];

export const RiskMasterScreen: React.FC = () => {
  const { riskSettings, soundEnabled, updateRiskSettings } = useGameStore();
  const [subTab, setSubTab] = useState<SubTab>('DOCTRINE');

  // MNQ Calculator local state
  const [mnqSlPoints, setMnqSlPoints] = useState<number>(20);
  const [mnqTargetRR, setMnqTargetRR] = useState<number>(2.5);

  // Crypto Swing Calculator local state
  const [cryptoPreset, setCryptoPreset] = useState<string>('SOL');
  const [entryPrice, setEntryPrice] = useState<number>(180);
  const [slPrice, setSlPrice] = useState<number>(171); // -5% SL
  const [tpPrice, setTpPrice] = useState<number>(205); // +13.9% TP

  // Scaling Simulator local state (realistic live edge: 43% WR, 2.1R net = +0.33R/trade)
  const [scalingBaseCap, setScalingBaseCap] = useState<number>(
    riskSettings.cryptoCapitalUsdt || 5000
  );
  const [simWinRate, setSimWinRate] = useState<number>(43);
  const [simAvgRR, setSimAvgRR] = useState<number>(2.1);
  const [simRiskPct, setSimRiskPct] = useState<number>(1.25);
  const [simSeed, setSimSeed] = useState<number>(19);

  const mnqResult = useMemo(
    () =>
      calculateMnqPositionSizing({
        accountMode: riskSettings.mnqAccountMode,
        nominalCapitalUsd: riskSettings.mnqNominalCapitalUsd,
        propDrawdownBufferUsd: riskSettings.mnqPropBufferUsd,
        riskPct: riskSettings.mnqRiskPct,
        stopLossPoints: mnqSlPoints,
        targetRR: mnqTargetRR,
      }),
    [riskSettings, mnqSlPoints, mnqTargetRR]
  );

  const cryptoResult = useMemo(
    () =>
      calculateCryptoSwingSizing({
        capitalUsdt: riskSettings.cryptoCapitalUsdt,
        riskPct: riskSettings.cryptoRiskPct,
        entryPrice,
        stopLossPrice: slPrice,
        takeProfitPrice: tpPrice,
      }),
    [riskSettings.cryptoCapitalUsdt, riskSettings.cryptoRiskPct, entryPrice, slPrice, tpPrice]
  );

  const scalingLadder = useMemo(
    () => buildScalingLadder(scalingBaseCap),
    [scalingBaseCap]
  );

  const simComparison = useMemo(
    () =>
      simulateCompoundingComparison({
        initialCapital: scalingBaseCap,
        winRatePct: simWinRate,
        avgWinRR: simAvgRR,
        baseRiskPct: simRiskPct,
        totalTrades: 80,
        seed: simSeed,
      }),
    [scalingBaseCap, simWinRate, simAvgRR, simRiskPct, simSeed]
  );

  // Institutional logarithmic Y-scale so percentage compounding & drawdowns are proportionally visible
  const chartPolylines = useMemo(() => {
    const allVals = [
      ...simComparison.conservativeCurve,
      ...simComparison.stepDownProtectedCurve,
      ...simComparison.overleveragedCurve,
    ].map((v) => Math.log(Math.max(10, v)));
    const minLog = Math.min(...allVals) - 0.04;
    const maxLog = Math.max(...allVals) + 0.04;
    const span = Math.max(0.05, maxLog - minLog);
    const w = 340;
    const h = 128;

    const toPoly = (arr: number[]) =>
      arr
        .map((v, idx) => {
          const lv = Math.log(Math.max(10, v));
          const x = 10 + (idx / Math.max(1, arr.length - 1)) * (w - 20);
          const y = h - 10 - ((lv - minLog) / span) * (h - 20);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    const startLog = Math.log(Math.max(10, scalingBaseCap));
    const startY = h - 10 - ((startLog - minLog) / span) * (h - 20);

    return {
      cons: toPoly(simComparison.conservativeCurve),
      prot: toPoly(simComparison.stepDownProtectedCurve),
      over: toPoly(simComparison.overleveragedCurve),
      startY,
    };
  }, [simComparison, scalingBaseCap]);

  const applyCryptoPreset = (id: string) => {
    playUiTick(soundEnabled);
    setCryptoPreset(id);
    if (id === 'BTC') {
      setEntryPrice(92000);
      setSlPrice(89240); // -3.0%
      setTpPrice(99800); // +8.5%
    } else if (id === 'ETH') {
      setEntryPrice(3250);
      setSlPrice(3120); // -4.0%
      setTpPrice(3600); // +10.8%
    } else if (id === 'SOL') {
      setEntryPrice(180);
      setSlPrice(171); // -5.0%
      setTpPrice(205); // +13.9%
    } else if (id === 'ALT_SHORT') {
      setEntryPrice(12.5);
      setSlPrice(13.5); // -8.0% Short SL
      setTpPrice(9.9); // +20.8% Short TP
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4 max-w-2xl mx-auto w-full">
      {/* Header Banner */}
      <header className="rounded-2xl bg-gradient-to-br from-[#121D35] to-[#090F1D] border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold uppercase tracking-widest text-emerald-400">
              Màster Institucional · Supervivència i Interès Compost
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-white">
              Gestió del Risc i Escalat (MNQ & Cripto)
            </h1>
          </div>
        </div>

        {/* 4 Sub-Tabs */}
        <div className="mt-3.5 grid grid-cols-4 gap-1.5 bg-[#070B13] p-1 rounded-xl border border-slate-800/90">
          {(
            [
              { id: 'DOCTRINE', label: '1% vs 2%' },
              { id: 'MNQ_CALC', label: 'Calc MNQ' },
              { id: 'CRYPTO_CALC', label: 'Calc Cripto' },
              { id: 'SCALING', label: 'Escalat' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                playUiTick(soundEnabled);
                setSubTab(t.id);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold transition truncate ${
                subTab === t.id
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* =================================================================== */}
      {/* TAB 1: DOCTRINE (1% vs 2%, MNQ Prop Buffer, Crypto Correlation)     */}
      {/* =================================================================== */}
      {subTab === 'DOCTRINE' && (
        <div className="space-y-4">
          {/* Direct Answer Card */}
          <section className="rounded-2xl bg-[#0C1322] border border-emerald-500/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide">
                El Veredicte: És bo un 2% per operació?
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              El <strong className="text-amber-300">2.0% del capital</strong> és el{' '}
              <strong className="text-white">sostre màxim absolut</strong> mai permès en
              trading professional — no ha de ser mai el teu risc per defecte de cada dia.
              Per escalar amb seguretat matemàtica i zero tremolor de pols, aplica aquesta
              matriu exacta segons el mercat:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* MNQ Card */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-rose-300 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> SCALP MNQ (Futurs Nasdaq)
                  </span>
                  <span className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200">
                    0.5% – 1.0%
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-300 leading-snug">
                  <strong className="text-white">Compte Propi:</strong> Arrisca{' '}
                  <strong>0.5% – 1.0%</strong> per trade amb un{' '}
                  <strong className="text-amber-300">Circuit Breaker diari de -2.5R</strong>{' '}
                  (o 3 stops seguits = tancar pantalla). A l’obertura NY (15:30h CET) la
                  variància intradia és alta.
                </p>
                <p className="text-[11.5px] text-cyan-200 bg-cyan-950/40 border border-cyan-500/30 p-2 rounded-lg leading-snug">
                  <strong>Trampa Comptes de Fondeig (Prop Firms):</strong> En un compte de
                  50.000$ amb 2.500$ de <em>Drawdown</em>, el teu capital real és{' '}
                  <strong>2.500$</strong>! Arrisca el <strong>4%–6% del coixí</strong>{' '}
                  (100$–150$ = 2–3 lots MNQ), mai el 2% de 50k (1.000$). I vigila si és{' '}
                  <strong>Intraday Trailing</strong> (persegueix el guany flotant tick a
                  tick: cal cobrar parcials!) o <strong>EOD</strong> (s’actualitza al
                  tancament de les 22:00h).
                </p>
              </div>

              {/* Crypto Swing Card */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-violet-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-violet-300 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> SWING CRIPTO (BTC/ETH/SOL)
                  </span>
                  <span className="text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200">
                    1.0% (Màx 2%)
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-300 leading-snug">
                  <strong className="text-white">Estàndard 1.0% · Sostre 2.0% A+:</strong>{' '}
                  En gràfics 4H/1D fas menys operacions i més filtrades. Pots pujar a{' '}
                  <strong>1.5% – 2.0%</strong> <em>únicament</em> en setups A+ (Sweep HTF +
                  Reclamació + R:R &ge; 2.8R) si no tens cap altra posició oberta.
                </p>
                <p className="text-[11.5px] text-amber-200 bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg leading-snug">
                  <strong>Regla de Calor de Cartera (Correlació &gt; 0.80):</strong> Si vas
                  Long a BTC (1.5%), ETH (1.5%) i SOL (1.5%) alhora, si BTC cau un -5% totes
                  tres salten juntes (-4.5% de cop!).{' '}
                  <strong>Risc obert total simultani &le; 3.0%</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* Losing Streak Probability Table */}
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Per què el 5% destrueix comptes guanyadors (Llei de les Ratxes)
              </h3>
            </div>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">
              Un trader molt rendible amb <strong>50% de Winrate i 2.5R de guany</strong>{' '}
              (Esperança boníssima de +0.75R/trade) patirà inevitablement ratxes de stops
              seguits per pura probabilitat estadística en cada bloc de 100 trades:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 pr-2">Ratxa Stops</th>
                    <th className="py-1.5 px-2">Probabilitat</th>
                    <th className="py-1.5 px-2 text-emerald-400">Risc 1%</th>
                    <th className="py-1.5 px-2 text-amber-300">Risc 2%</th>
                    <th className="py-1.5 pl-2 text-rose-400">Risc 5%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {STREAK_ODDS_50WR.map((r) => (
                    <tr key={r.losses}>
                      <td className="py-2 pr-2 font-bold text-slate-200">
                        {r.losses} seguides
                      </td>
                      <td className="py-2 px-2 text-slate-300">{r.prob100}</td>
                      <td className="py-2 px-2 text-emerald-300 font-bold">
                        {r.lossAt1Pct}
                      </td>
                      <td className="py-2 px-2 text-amber-300">{r.lossAt2Pct}</td>
                      <td className="py-2 pl-2 text-rose-400 font-bold">
                        {r.lossAt5Pct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Drawdown Asymmetry Table + Circuit Breakers */}
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Trampa Geomètrica del Drawdown i Talls Automàtics
            </h3>
            <div className="space-y-1.5">
              {DRAWDOWN_MATH.map((row) => (
                <div
                  key={row.dd}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-rose-400 font-bold w-11">{row.dd}</span>
                    <span className="text-slate-500">&rarr;</span>
                    <span className={`font-bold ${row.color}`}>cal {row.rec}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{row.status}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 text-[11.5px] text-slate-200 space-y-1">
              <div className="font-bold text-emerald-300">
                🛡️ Els 3 Frens d’Emergència Innegociables:
              </div>
              <p>
                <strong>1. Límit Diari (MNQ):</strong> -2.5R en un dia &rarr; Tanca el
                broker fins demà. El mercat obre cada dia; el teu cap calent no pensa.
              </p>
              <p>
                <strong>2. Regla Step-Down (-5% DD):</strong> Si el teu compte cau un -5%
                des del màxim històric, redueix el risc per trade a la meitat (ex. d’1.0% a
                0.5%) fins recuperar el màxim anterior.
              </p>
              <p>
                <strong>3. Mai moguis l’SL per evitar perdre:</strong> L’SL defineix la
                mida del contracte; eixamplar-lo en viu multiplica la teva pèrdua real.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MNQ SCALPING POSITION CALCULATOR                             */}
      {/* =================================================================== */}
      {subTab === 'MNQ_CALC' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-rose-400" />
                Calculadora Exacta MNQ (Micro Nasdaq-100)
              </h2>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                2,00 $/pt · 0,50 $/tick
              </span>
            </div>

            {/* Mode Switcher: Prop Firm vs Own Capital */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  updateRiskSettings({
                    mnqAccountMode: 'PROP_FIRM',
                    mnqRiskPct:
                      riskSettings.mnqAccountMode === 'OWN_CAPITAL'
                        ? 5.0
                        : riskSettings.mnqRiskPct,
                  });
                }}
                className={`py-2 rounded-lg text-xs font-bold transition ${
                  riskSettings.mnqAccountMode === 'PROP_FIRM'
                    ? 'bg-rose-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Compte Fondeig (Coixí DD)
              </button>
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  updateRiskSettings({
                    mnqAccountMode: 'OWN_CAPITAL',
                    mnqRiskPct:
                      riskSettings.mnqAccountMode === 'PROP_FIRM'
                        ? 1.0
                        : riskSettings.mnqRiskPct,
                  });
                }}
                className={`py-2 rounded-lg text-xs font-bold transition ${
                  riskSettings.mnqAccountMode === 'OWN_CAPITAL'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Capital Propi (Broker)
              </button>
            </div>

            {riskSettings.mnqAccountMode === 'PROP_FIRM' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 block">
                  Plantilles ràpides de Fondeig (Apex / Topstep / MFF):
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '25k (1.5k$)', nom: 25000, buf: 1500 },
                    { label: '50k (2.5k$)', nom: 50000, buf: 2500 },
                    { label: '100k (3k$)', nom: 100000, buf: 3000 },
                    { label: '150k (5k$)', nom: 150000, buf: 5000 },
                  ].map((p) => {
                    const active = riskSettings.mnqPropBufferUsd === p.buf;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          playUiTick(soundEnabled);
                          updateRiskSettings({
                            mnqNominalCapitalUsd: p.nom,
                            mnqPropBufferUsd: p.buf,
                          });
                        }}
                        className={`py-1.5 px-1 rounded-lg border text-[10.5px] font-mono font-bold transition ${
                          active
                            ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Coixí Real Drawdown ($)
                    </label>
                    <input
                      type="number"
                      min={300}
                      step={100}
                      value={riskSettings.mnqPropBufferUsd}
                      onChange={(e) =>
                        updateRiskSettings({
                          mnqPropBufferUsd: Math.max(250, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      % del Coixí per Trade (Òptim 4-6%)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={0.5}
                      value={riskSettings.mnqRiskPct}
                      onChange={(e) =>
                        updateRiskSettings({
                          mnqRiskPct: Math.max(0.5, Number(e.target.value) || 1),
                        })
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-emerald-300"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Capital al Compte ($)
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={riskSettings.mnqNominalCapitalUsd}
                    onChange={(e) =>
                      updateRiskSettings({
                        mnqNominalCapitalUsd: Math.max(500, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Risc per Trade % (Òptim 0.5–1.0%)
                  </label>
                  <input
                    type="number"
                    min={0.25}
                    max={5}
                    step={0.25}
                    value={riskSettings.mnqRiskPct}
                    onChange={(e) =>
                      updateRiskSettings({
                        mnqRiskPct: Math.max(0.25, Number(e.target.value) || 0.5),
                      })
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-emerald-300"
                  />
                </div>
              </div>
            )}

            {/* Stop Loss in MNQ Points + Target RR */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  Stop Loss Estructural: <strong className="text-rose-300 font-mono">{mnqSlPoints} punts MNQ</strong> ({mnqSlPoints * 4} ticks)
                </span>
                <div className="flex gap-1">
                  {[12, 20, 30, 45].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => {
                        playUiTick(soundEnabled);
                        setMnqSlPoints(pts);
                      }}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold ${
                        mnqSlPoints === pts
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {pts}pt
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={65}
                step={1}
                value={mnqSlPoints}
                onChange={(e) => setMnqSlPoints(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Ràtio Objectiu (TP):</span>
                <div className="flex gap-1.5">
                  {[2.0, 2.5, 3.0, 4.0].map((rr) => (
                    <button
                      key={rr}
                      type="button"
                      onClick={() => {
                        playUiTick(soundEnabled);
                        setMnqTargetRR(rr);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold ${
                        mnqTargetRR === rr
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {rr.toFixed(1)}R
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Output Hero Result */}
            <div
              className={`rounded-2xl p-4 border-2 space-y-3 ${
                mnqResult.statusLevel === 'OPTIMAL'
                  ? 'bg-emerald-950/25 border-emerald-500/50'
                  : mnqResult.statusLevel === 'CAUTION'
                    ? 'bg-amber-950/25 border-amber-500/50'
                    : 'bg-rose-950/30 border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    Mida Exacta a Posar al DOM
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-0.5">
                    {mnqResult.recommendedContracts}{' '}
                    <span className="text-base text-emerald-400">
                      contractes MNQ
                    </span>
                  </div>
                  {mnqResult.equivalentEminiNQ >= 1 && (
                    <div className="text-[11px] font-mono text-cyan-300">
                      Equivalent a {mnqResult.equivalentEminiNQ} E-mini NQ gran +{' '}
                      {mnqResult.recommendedContracts % 10} MNQ
                    </div>
                  )}
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs text-slate-400">Risc 1R (amb fees)</div>
                  <div className="text-lg font-extrabold text-rose-300">
                    -{mnqResult.actualDollarRiskUsd.toFixed(2)} $
                  </div>
                  <div className="text-[10.5px] text-slate-400">
                    Màx permès: {mnqResult.maxAllowedRiskUsd.toFixed(0)} $
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
                <div className="p-2 rounded-xl bg-slate-950/70">
                  <div className="text-xs font-bold text-slate-200">
                    {mnqResult.costPerContractAtSlUsd.toFixed(2)} $
                  </div>
                  <div className="text-[10px] text-slate-400">Cost / 1 MNQ</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70">
                  <div className="text-xs font-bold text-cyan-300">
                    +{mnqResult.targetPoints} pts
                  </div>
                  <div className="text-[10px] text-slate-400">TP ({mnqTargetRR}R)</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/70">
                  <div className="text-xs font-bold text-emerald-400">
                    +{mnqResult.netProfitAtTargetUsd.toFixed(0)} $
                  </div>
                  <div className="text-[10px] text-slate-400">Guany Net TP</div>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed pt-1">
                💡 {mnqResult.advice}
              </p>
            </div>
          </section>

          {/* MNQ Session Cheat Sheet in CET */}
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Finestres Horàries MNQ (Hora Catalana CET)
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-emerald-950/25 border border-emerald-500/30">
                <span className="font-mono font-bold text-emerald-300">15:30 – 17:30h</span>
                <span className="text-slate-200">NY Cash Open · Escombrada + Desplaçament A+</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-rose-950/25 border border-rose-500/30">
                <span className="font-mono font-bold text-rose-300">18:00 – 19:30h</span>
                <span className="text-slate-200">NY Lunch Chop · PROHIBIT OPERAR (Algorismes plans)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-cyan-950/25 border border-cyan-500/30">
                <span className="font-mono font-bold text-cyan-300">19:30 – 21:45h</span>
                <span className="text-slate-200">NY PM Drive · Continuació cap al High/Low del dia</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: CRYPTO SWING CALCULATOR (USDT Spot & Perps)                  */}
      {/* =================================================================== */}
      {subTab === 'CRYPTO_CALC' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-violet-400" />
                Calculadora Swing Cripto (Spot & Perps USDT)
              </h2>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                Inclou 0,10% fees
              </span>
            </div>

            {/* Capital & Risk % */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Capital Cartera Swing (USDT)
                </label>
                <input
                  type="number"
                  min={100}
                  step={250}
                  value={riskSettings.cryptoCapitalUsdt}
                  onChange={(e) =>
                    updateRiskSettings({
                      cryptoCapitalUsdt: Math.max(100, Number(e.target.value) || 100),
                    })
                  }
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Risc per Swing % (1% – 2% màx)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        playUiTick(soundEnabled);
                        updateRiskSettings({ cryptoRiskPct: pct });
                      }}
                      className={`py-2 rounded-lg font-mono text-xs font-bold border transition ${
                        riskSettings.cryptoRiskPct === pct
                          ? pct >= 2.0
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Asset Example Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 block">
                Exemples ràpids o introdueix els nivells del teu gràfic 4H / 1D:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'BTC', label: 'BTC Long' },
                  { id: 'ETH', label: 'ETH Long' },
                  { id: 'SOL', label: 'SOL Long' },
                  { id: 'ALT_SHORT', label: 'Alt Short' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyCryptoPreset(p.id)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                      cryptoPreset === p.id
                        ? 'bg-violet-500/25 border-violet-400 text-violet-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Entry / SL / TP Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10.5px] text-cyan-300 font-semibold block mb-1">
                  Entrada (USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => {
                    setCryptoPreset('CUSTOM');
                    setEntryPrice(Number(e.target.value) || 0);
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-2.5 py-2 text-xs font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-rose-300 font-semibold block mb-1">
                  Stop Loss (USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  value={slPrice}
                  onChange={(e) => {
                    setCryptoPreset('CUSTOM');
                    setSlPrice(Number(e.target.value) || 0);
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-rose-500/40 px-2.5 py-2 text-xs font-mono font-bold text-rose-200"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-emerald-300 font-semibold block mb-1">
                  Take Profit (USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tpPrice}
                  onChange={(e) => {
                    setCryptoPreset('CUSTOM');
                    setTpPrice(Number(e.target.value) || 0);
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-emerald-500/40 px-2.5 py-2 text-xs font-mono font-bold text-emerald-200"
                />
              </div>
            </div>

            {/* Output Card */}
            {cryptoResult.valid ? (
              <div className="rounded-2xl bg-violet-950/20 border-2 border-violet-500/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        cryptoResult.side === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {cryptoResult.side} · Distància SL -{cryptoResult.slDistancePct}%
                    </span>
                    <div className="text-2xl font-extrabold font-mono text-white mt-1">
                      {cryptoResult.positionSizeUsdt.toLocaleString('ca-ES')}{' '}
                      <span className="text-sm text-violet-300">USDT Mida Posició</span>
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Quantitat: <strong>{cryptoResult.coinUnits}</strong> monedes
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-[11px] text-slate-400">Risc Exacte 1R</div>
                    <div className="text-lg font-extrabold text-rose-300">
                      -{cryptoResult.maxRiskUsdt.toFixed(2)} USDT
                    </div>
                    <div className="text-[11px] text-emerald-400 font-bold">
                      TP: +{cryptoResult.netProfitAtTpUsdt.toFixed(0)} USDT ({cryptoResult.netRR}R)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
                  <div className="p-2 rounded-xl bg-slate-950/70">
                    <div className="text-xs font-bold text-slate-200">
                      {cryptoResult.effectiveAccountLeverage}x
                    </div>
                    <div className="text-[10px] text-slate-400">Exposició Real</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/70">
                    <div className="text-xs font-bold text-cyan-300">
                      &le; {cryptoResult.maxSafeIsolatedLeverage}x
                    </div>
                    <div className="text-[10px] text-slate-400">Lev. Aïllat Segur</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/70">
                    <div className="text-xs font-bold text-slate-300">
                      {cryptoResult.estimatedFeesUsdt.toFixed(2)} $
                    </div>
                    <div className="text-[10px] text-slate-400">Comissions Est.</div>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  🧭 {cryptoResult.advice}
                </p>

                {cryptoResult.portfolioHeatWarning && (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11.5px] text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{cryptoResult.portfolioHeatWarning}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
                {cryptoResult.advice}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: CAPITAL SCALING ROADMAP & COMPOUNDING SIMULATOR              */}
      {/* =================================================================== */}
      {subTab === 'SCALING' && (
        <div className="space-y-4">
          {/* Interactive Compounding Simulator */}
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Simulador d’Escalat Compost (80 Operacions)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Mateixa ratxa d’encerts i errors amb 3 gestions de risc diferents
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  setSimSeed((s) => s + 17);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-cyan-300 flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Nova Sèrie
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10.5px] text-slate-400 block mb-1">
                  Capital Inicial ($)
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={scalingBaseCap}
                  onChange={(e) =>
                    setScalingBaseCap(Math.max(500, Number(e.target.value) || 1000))
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-mono font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-slate-400 block mb-1">
                  Winrate ({simWinRate}%)
                </label>
                <input
                  type="range"
                  min={35}
                  max={65}
                  value={simWinRate}
                  onChange={(e) => setSimWinRate(Number(e.target.value))}
                  className="w-full accent-emerald-400 mt-2"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-slate-400 block mb-1">
                  R:R Guany ({simAvgRR}R)
                </label>
                <input
                  type="range"
                  min={1.5}
                  max={3.5}
                  step={0.1}
                  value={simAvgRR}
                  onChange={(e) => setSimAvgRR(Number(e.target.value))}
                  className="w-full accent-cyan-400 mt-2"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-slate-400 block mb-1">
                  El Teu Risc ({simRiskPct}%)
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.25}
                  value={simRiskPct}
                  onChange={(e) => setSimRiskPct(Number(e.target.value))}
                  className="w-full accent-violet-400 mt-2"
                />
              </div>
            </div>

            {/* SVG 3-Curve Chart */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
              <svg viewBox="0 0 340 128" className="w-full h-32">
                <line
                  x1="10"
                  y1={chartPolylines.startY}
                  x2="330"
                  y2={chartPolylines.startY}
                  stroke="#334155"
                  strokeDasharray="3 3"
                />
                {/* 5% Over-risked */}
                <polyline
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="1.6"
                  strokeOpacity="0.75"
                  points={chartPolylines.over}
                />
                {/* 1% Standard */}
                <polyline
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                  points={chartPolylines.cons}
                />
                {/* Protected Step-Down */}
                <polyline
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.6"
                  points={chartPolylines.prot}
                />
              </svg>

              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-emerald-950/35 border border-emerald-500/40">
                  <div className="text-[9.5px] text-emerald-300 font-sans font-bold">
                    {simRiskPct}% + Fre DD
                  </div>
                  <div className="text-xs font-extrabold text-white">
                    {simComparison.finalProtected.toLocaleString('ca-ES')} $
                  </div>
                  <div className="text-[9.5px] text-slate-400">
                    Max DD: -{simComparison.maxDdProtectedPct}%
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/30">
                  <div className="text-[9.5px] text-cyan-300 font-sans font-bold">
                    1.0% Fix Pur
                  </div>
                  <div className="text-xs font-extrabold text-white">
                    {simComparison.finalConservative.toLocaleString('ca-ES')} $
                  </div>
                  <div className="text-[9.5px] text-slate-400">Creuer Estable</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30">
                  <div className="text-[9.5px] text-rose-300 font-sans font-bold">
                    5.0% Agressiu
                  </div>
                  <div className="text-xs font-extrabold text-rose-200">
                    {simComparison.finalOverleveraged.toLocaleString('ca-ES')} $
                  </div>
                  <div className="text-[9.5px] text-rose-400 font-bold">
                    Max DD: -{simComparison.maxDdOverleveragedPct}%
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5-Phase Institutional Scaling Ladder */}
          <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Full de Ruta en 5 Fases per Escalar {scalingBaseCap.toLocaleString('ca-ES')} $
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              No pugis mai la mida perquè tens pressa: <strong className="text-slate-200">escala amb els beneficis ja guanyats al mercat (House Money)</strong> seguint aquestes fites objectives:
            </p>

            <div className="space-y-2.5">
              {scalingLadder.map((tier) => (
                <div
                  key={tier.phase}
                  className="p-3 rounded-xl bg-slate-900/85 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-white">
                      {tier.title}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      Capital: {tier.equityMilestone.toLocaleString('ca-ES')} $
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800">
                      Risc/Trade: {tier.riskPct}% ({tier.riskAmountUsd}$)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-rose-300 border border-slate-800">
                      MNQ (~20pt SL):{' '}
                      {tier.typicalMnqLots > 0
                        ? `${tier.typicalMnqLots} lots`
                        : 'Micro / Sim'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-violet-300 border border-slate-800">
                      Max Heat Cripto: {tier.cryptoMaxHeatPct}%
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Requisit d’ascens:</strong> {tier.ruleToUnlockNext}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/25 border border-cyan-500/30 text-[11.5px] text-cyan-100 flex items-start gap-2">
              <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Com combinar MNQ + Cripto en el teu dia a dia:</strong> Al matí o
                vespre fas 5 minuts de revisió d’alertes Swing 4H/1D en Cripto (ordres
                Limit preparades sense estrès), i de <strong>15:30h a 17:15h CET</strong>{' '}
                executes 1 o 2 tirs de precisió en Scalp d’MNQ. Si no hi ha setup net,
                prems <em>NO OPERAR</em> i tanques la sessió guanyant disciplina.
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
