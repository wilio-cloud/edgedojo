import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Check,
  Copy,
  ExternalLink,
  Eye,
  LineChart,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import backtestReportJson from '../../data/swingBacktestReport.json';
import {
  CryptoSwingScanResult,
  CryptoSymbol,
  SwingBacktestReport,
  SwingSignalSetup,
  roundCryptoPrice,
} from '../../engine/cryptoSwingStrategy';
import { calculateCryptoSwingSizing } from '../../engine/riskMasterEngine';
import {
  LiveSwingRadarSnapshot,
  scanAllSwingAssetsLive,
} from '../../services/liveCryptoFeed';
import { useGameStore } from '../../store/useGameStore';
import { playUiTick } from '../../utils/soundHaptics';
import { TacticalChart } from '../chart/TacticalChart';
import { LegalFooter } from '../common/BrandShell';

const BACKTEST_REPORT = backtestReportJson as unknown as SwingBacktestReport;

type RadarSubTab = 'LIVE' | 'BACKTEST' | 'DISCORD';
type ChartTf = '1H' | '4H';

function formatFunding(rate: number | null): string {
  if (rate === null) return 'Funding N/D';
  const pct = (rate * 100).toFixed(3);
  return `${rate >= 0 ? '+' : ''}${pct}% / 8h`;
}

function formatShortDate(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  return d.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: 'short',
  });
}

const EquityCurveSvg: React.FC<{ points: { time: number; cumR: number }[] }> = ({
  points,
}) => {
  if (points.length === 0) return null;

  const series = [{ time: points[0].time - 86400, cumR: 0 }, ...points];
  const width = 360;
  const height = 132;
  const padX = 14;
  const padY = 18;

  const vals = series.map((p) => p.cumR);
  const minVal = Math.min(0, ...vals) - 1;
  const maxVal = Math.max(2, ...vals) + 1;
  const span = Math.max(1, maxVal - minVal);

  const toX = (idx: number) =>
    padX + (idx / Math.max(1, series.length - 1)) * (width - padX * 2);
  const toY = (v: number) =>
    height - padY - ((v - minVal) / span) * (height - padY * 2);

  const zeroY = toY(0);
  const polyPoints = series
    .map((p, i) => `${toX(i).toFixed(1)},${toY(p.cumR).toFixed(1)}`)
    .join(' ');
  const areaPath = `M ${toX(0).toFixed(1)} ${zeroY.toFixed(1)} L ${series
    .map((p, i) => `${toX(i).toFixed(1)} ${toY(p.cumR).toFixed(1)}`)
    .join(' L ')} L ${toX(series.length - 1).toFixed(1)} ${zeroY.toFixed(1)} Z`;

  const lastPt = series[series.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-36 rounded-xl bg-[#070B14] border border-slate-800/80"
    >
      <defs>
        <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Zero baseline */}
      <line
        x1={padX}
        y1={zeroY}
        x2={width - padX}
        y2={zeroY}
        stroke="#334155"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text x={padX + 2} y={zeroY + 10} fill="#64748B" fontSize="8.5" fontWeight="600">
        0.0R
      </text>

      <path d={areaPath} fill="url(#eqFill)" />
      <polyline
        fill="none"
        stroke="#34D399"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polyPoints}
      />
      <circle
        cx={toX(series.length - 1)}
        cy={toY(lastPt.cumR)}
        r="3.8"
        fill="#10B981"
        stroke="#070B14"
        strokeWidth="1.5"
      />
      <text
        x={width - padX - 4}
        y={Math.max(13, toY(lastPt.cumR) - 7)}
        textAnchor="end"
        fill="#34D399"
        fontSize="10"
        fontWeight="800"
      >
        {lastPt.cumR >= 0 ? '+' : ''}
        {lastPt.cumR.toFixed(2)}R
      </text>
    </svg>
  );
};

export const CryptoRadarScreen: React.FC = () => {
  const { soundEnabled, riskSettings, setActiveTab } = useGameStore();
  const [subTab, setSubTab] = useState<RadarSubTab>('LIVE');
  const [selectedSymbol, setSelectedSymbol] = useState<CryptoSymbol>('BTCUSDT');
  const [chartTf, setChartTf] = useState<ChartTf>('1H');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showDemoSetupTicket, setShowDemoSetupTicket] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<LiveSwingRadarSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runLiveScan = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const data = await scanAllSwingAssetsLive();
      setSnapshot(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? `No s'ha pogut connectar amb el feed públic de mercat (${err.message}).`
          : 'Error temporal llegint les dades de mercat.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runLiveScan(false);
  }, [runLiveScan]);

  useEffect(() => {
    if (!autoRefresh || subTab !== 'LIVE') return;
    const id = window.setInterval(() => {
      void runLiveScan(true);
    }, 60000);
    return () => window.clearInterval(id);
  }, [autoRefresh, subTab, runLiveScan]);

  const selectedResult: CryptoSwingScanResult | null = useMemo(() => {
    if (!snapshot) return null;
    return (
      snapshot.results.find((r) => r.spec.symbol === selectedSymbol) ??
      snapshot.results[0] ??
      null
    );
  }, [snapshot, selectedSymbol]);

  const selectedBundle = useMemo(() => {
    if (!snapshot || !selectedResult) return null;
    return snapshot.bundlesBySymbol[selectedResult.spec.symbol] ?? null;
  }, [snapshot, selectedResult]);

  // Build an illustrative simulated ticket using real current price & ATR when user clicks "Veure Exemple Tiquet A+"
  const demoSetupTicket: SwingSignalSetup | null = useMemo(() => {
    if (!selectedResult || selectedResult.setup || !showDemoSetupTicket) return null;
    const p = selectedResult.currentPrice;
    const isBear = snapshot?.leaderContext.regime === 'BEARISH';
    const side: 'LONG' | 'SHORT' = isBear ? 'SHORT' : 'LONG';
    const dir = side === 'LONG' ? 1 : -1;
    const slDist = Math.max(selectedResult.atr1h * 1.6, p * 0.022);
    const entry = roundCryptoPrice(p);
    const stopLoss = roundCryptoPrice(entry - dir * slDist);
    const tp1 = roundCryptoPrice(entry + dir * slDist * 1.5);
    const tp2 = roundCryptoPrice(entry + dir * slDist * 2.5);

    return {
      setupId: 'DEMO_PREVIEW',
      archetype: 'BOS_FVG_PULLBACK',
      archetypeLabelCa: 'SIMULACIÓ EDUCATIVA · BOS + Pullback a Valor/FVG (4H → 1H)',
      side,
      qualityScore: 91,
      grade: 'A+',
      executionType: 'MARKET',
      executionLabelCa: `A MERCAT al tancament 1H (~${entry}$)`,
      venue: side === 'SHORT' ? 'PERPS_ISOLATED' : 'SPOT',
      venueLabelCa:
        side === 'SHORT' ? 'PERPS USDT · Aïllat <= 3x' : 'SPOT (o Perps Aïllat <= 3x)',
      venueRationaleCa:
        side === 'SHORT'
          ? 'Exemple educatiu en marea baixista: els Shorts s’executen sempre en Futurs USDT amb marge Aïllat <= 3x.'
          : 'Exemple educatiu en marea alcista: SPOT evita pagar comissions de funding cada 8h i elimina el risc de liquidació.',
      maxSafeLeverage: 3,
      triggerCandleTime: selectedResult.asOfTimeSec - 3600,
      entry,
      stopLoss,
      tp1,
      tp2,
      slDistancePct: Math.round((slDist / entry) * 10000) / 100,
      tp1RR: 1.5,
      grossRR: 2.5,
      netRR: 2.41,
      blendedExpectedWinR: 1.94,
      anchorPrice: entry,
      rationaleBulletsCa: [
        'Aquest tiquet és una vista prèvia simulada per veure com es presenta un avís quan s’activa un Setup A+ real.',
        `Connectat automàticament al teu capital de Risc & Escalat (${riskSettings.cryptoCapitalUsdt} USDT · 1R = ${riskSettings.cryptoRiskPct}%).`,
      ],
      managementPlanCa: `1) Cobra el 50% a TP1 (${tp1}$ = +1.5R) i mou l’SL a Break-Even (${entry}$). 2) Deixa córrer el 50% fins a TP2 (${tp2}$).`,
    };
  }, [selectedResult, showDemoSetupTicket, snapshot?.leaderContext.regime, riskSettings]);

  const displayedSetup = selectedResult?.setup ?? demoSetupTicket;

  const personalSizing = useMemo(() => {
    if (!displayedSetup) return null;
    return calculateCryptoSwingSizing({
      capitalUsdt: riskSettings.cryptoCapitalUsdt,
      riskPct: riskSettings.cryptoRiskPct,
      entryPrice: displayedSetup.entry,
      stopLossPrice: displayedSetup.stopLoss,
      takeProfitPrice: displayedSetup.tp2,
    });
  }, [displayedSetup, riskSettings.cryptoCapitalUsdt, riskSettings.cryptoRiskPct]);

  const copyText = async (key: string, text: string) => {
    playUiTick(soundEnabled);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const activeSetupsCount =
    snapshot?.results.filter((r) => r.status === 'SETUP_ACTIVE').length ?? 0;
  const preAlertsCount =
    snapshot?.results.filter((r) => r.status === 'PRE_ALERT').length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto px-3.5 pt-3 pb-6">
      <div className="max-w-xl mx-auto space-y-3.5">
        {/* Header & Sub-Navigation */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0B1222] to-[#090F1C] border border-slate-800/90 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Radio className="w-3 h-3 animate-pulse" />
                Mòdul 5 Quant · Zero Repainting
              </div>
              <h1 className="text-base font-black text-white tracking-tight">
                Radar Crypto Swing 24/7
              </h1>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                Escàner institucional sobre espelmes tancades <code className="text-slate-200">1D/4H → 1H</code> per a{' '}
                <span className="text-slate-200 font-semibold">BTC, ETH, SOL i AVAX</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playUiTick(soundEnabled);
                void runLiveScan(false);
              }}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-[11px] font-bold text-slate-200 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Actualitzar</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-3 bg-[#060A12] p-1 rounded-xl border border-slate-800/80">
            {[
              { id: 'LIVE' as const, label: 'En Viu', icon: Activity },
              { id: 'BACKTEST' as const, label: 'Backtest', icon: LineChart },
              { id: 'DISCORD' as const, label: 'Discord', icon: BellRing },
            ].map((t) => {
              const Icon = t.icon;
              const active = subTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    playUiTick(soundEnabled);
                    setSubTab(t.id);
                  }}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold transition ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUB-TAB 1: LIVE RADAR (BTC · ETH · SOL · AVAX)                    */}
        {/* ================================================================= */}
        {subTab === 'LIVE' && (
          <>
            {errorMsg && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Connexió en espera</p>
                  <p className="text-[11px] text-rose-300/90 mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* BTC Market Leader Banner */}
            {snapshot && (
              <div
                className={`rounded-2xl p-3 border ${
                  snapshot.leaderContext.regime === 'BULLISH'
                    ? 'bg-emerald-950/25 border-emerald-500/35'
                    : snapshot.leaderContext.regime === 'BEARISH'
                      ? 'bg-rose-950/25 border-rose-500/35'
                      : 'bg-amber-950/20 border-amber-500/35'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    {snapshot.leaderContext.regime === 'BULLISH' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : snapshot.leaderContext.regime === 'BEARISH' ? (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-xs font-extrabold text-white">
                       Brúixola Líder BTC ·{' '}
                      {snapshot.leaderContext.regime === 'BULLISH'
                        ? 'MAREA ALCISTA'
                        : snapshot.leaderContext.regime === 'BEARISH'
                          ? 'MAREA BAIXISTA'
                          : 'RANG LATERAL'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoRefresh((v) => !v)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      autoRefresh
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {autoRefresh ? '● Live 60s' : 'Pausat'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {snapshot.leaderContext.summaryCa}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/70 text-[10px] text-slate-400">
                  <span>
                    Setups A+ actius:{' '}
                    <strong className="text-emerald-300">{activeSetupsCount}</strong> · Pre-Alertes 4H:{' '}
                    <strong className="text-amber-300">{preAlertsCount}</strong>
                  </span>
                  <span>
                    Escanejat:{' '}
                    {new Date(snapshot.scannedAtMs).toLocaleTimeString('ca-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* 4-Asset Interactive Grid */}
            <div className="grid grid-cols-2 gap-2">
              {(snapshot?.results ?? []).map((r) => {
                const isSelected = r.spec.symbol === selectedResult?.spec.symbol;
                const badgeStyle =
                  r.status === 'SETUP_ACTIVE'
                    ? r.setup?.side === 'LONG'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : r.status === 'PRE_ALERT'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800/90 text-slate-300 border-slate-700/80';

                const badgeText =
                  r.status === 'SETUP_ACTIVE'
                    ? `${r.setup?.side === 'LONG' ? '🟢' : '🔴'} SETUP ${r.setup?.grade} ${r.setup?.side}`
                    : r.status === 'PRE_ALERT'
                      ? `🟡 PRE-ALERTA ${r.preAlert?.bias}`
                      : '⚪ EN ESPERA';

                return (
                  <button
                    key={r.spec.symbol}
                    type="button"
                    onClick={() => {
                      playUiTick(soundEnabled);
                      setSelectedSymbol(r.spec.symbol);
                      setShowDemoSetupTicket(false);
                    }}
                    className={`text-left rounded-2xl p-3 border transition ${
                      isSelected
                        ? 'bg-[#101B31] border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]'
                        : 'bg-[#0B1220] border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-white">
                        {r.spec.shortName}
                        <span className="text-[10px] font-semibold text-slate-400">/USDT</span>
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${badgeStyle}`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between gap-1">
                      <span className="text-sm font-black text-slate-100 tabular-nums">
                        {r.currentPrice}$
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {formatFunding(r.fundingRate8h)}
                      </span>
                    </div>

                    {/* 4H Dealing Range Gauge */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                        <span>Desc. 0%</span>
                        <span className="text-slate-300 font-semibold">
                          Rang 4H: {r.pricePositionPct}%
                        </span>
                        <span>Prem. 100%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-500/70" />
                        <div
                          className={`h-full rounded-full ${
                            r.pricePositionPct <= 45
                              ? 'bg-emerald-400'
                              : r.pricePositionPct >= 55
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                          }`}
                          style={{ width: `${r.pricePositionPct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}

              {loading && !snapshot && (
                <div className="col-span-2 rounded-2xl bg-[#0B1220] border border-slate-800 p-6 text-center text-xs text-slate-400">
                  Connectant amb Binance Vision & OKX Swap en temps real...
                </div>
              )}
            </div>

            {/* Selected Asset Live Tactical Chart */}
            {selectedResult && selectedBundle && (
              <div className="rounded-2xl bg-[#0B1220] border border-slate-800/90 overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">
                        {selectedResult.spec.displaySymbol}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        4H {selectedResult.structure4h}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Rang 4H: {selectedResult.dealingRangeLow}$ – {selectedResult.dealingRangeHigh}$ (EQ 50%: {selectedResult.equilibrium50}$)
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-[#070B14] p-0.5 rounded-lg border border-slate-800">
                    {(['1H', '4H'] as const).map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          playUiTick(soundEnabled);
                          setChartTf(tf);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition ${
                          chartTf === tf
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64 w-full">
                  <TacticalChart
                    candles={
                      chartTf === '1H'
                        ? selectedBundle.closed1h.slice(-90)
                        : selectedBundle.closed4h.slice(-80)
                    }
                    annotations={(chartTf === '1H'
                      ? selectedResult.annotations1h
                      : selectedResult.annotations4h
                    ).map((ann) => {
                      const totalLen =
                        chartTf === '1H'
                          ? selectedBundle.closed1h.length
                          : selectedBundle.closed4h.length;
                      const keptLen = chartTf === '1H' ? 90 : 80;
                      const offset = Math.max(0, totalLen - keptLen);
                      return {
                        ...ann,
                        startIndex: Math.max(0, ann.startIndex - offset),
                        endIndex: Math.max(0, ann.endIndex - offset),
                      };
                    })}
                    showAnnotations={true}
                    isHtfView={chartTf === '4H'}
                    order={
                      displayedSetup
                        ? {
                            side: displayedSetup.side,
                            entry: displayedSetup.entry,
                            stopLoss: displayedSetup.stopLoss,
                            takeProfit: displayedSetup.tp2,
                            isLimitOrder:
                              displayedSetup.executionType === 'LIMIT_PULLBACK',
                          }
                        : null
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 px-3 py-2 bg-[#070B14] border-t border-slate-800/80 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">SSL 4H Propera</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      {selectedResult.nearestSsl4h ? `${selectedResult.nearestSsl4h}$` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">BSL 4H Propera</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      {selectedResult.nearestBsl4h ? `${selectedResult.nearestBsl4h}$` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Volatilitat ATR(1H)</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      {roundCryptoPrice(selectedResult.atr1h)}$
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Execution Ticket OR Pre-Alert OR Neutral Discipline Card */}
            {selectedResult && displayedSetup && personalSizing && (
              <div
                className={`rounded-2xl p-3.5 border space-y-3 ${
                  displayedSetup.setupId === 'DEMO_PREVIEW'
                    ? 'bg-cyan-950/20 border-cyan-500/40'
                    : displayedSetup.side === 'LONG'
                      ? 'bg-emerald-950/25 border-emerald-500/45'
                      : 'bg-rose-950/25 border-rose-500/45'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          displayedSetup.side === 'LONG'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {displayedSetup.side} · GRAU {displayedSetup.grade} ({displayedSetup.qualityScore}/100)
                      </span>
                      {displayedSetup.setupId === 'DEMO_PREVIEW' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-400/40">
                          VISTA PRÈVIA D’EXEMPLE
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-extrabold text-white mt-1.5">
                      {displayedSetup.archetypeLabelCa}
                    </h3>
                  </div>

                  {displayedSetup.setupId === 'DEMO_PREVIEW' ? (
                    <button
                      type="button"
                      onClick={() => setShowDemoSetupTicket(false)}
                      className="text-[10px] font-bold text-cyan-300 underline"
                    >
                      Tancar exemple
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(
                          'ticket',
                          `${selectedResult.spec.displaySymbol} ${displayedSetup.side} (${displayedSetup.executionType} · ${displayedSetup.venueLabelCa})\nEntrada: ${displayedSetup.entry} USDT | SL: ${displayedSetup.stopLoss} USDT (-${displayedSetup.slDistancePct}%) | TP1 (50%+BE): ${displayedSetup.tp1} USDT | TP2: ${displayedSetup.tp2} USDT (+${displayedSetup.netRR}R net) | Mida (${riskSettings.cryptoRiskPct}%): ${Math.round(personalSizing.positionSizeUsdt)} USDT`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200"
                    >
                      {copiedKey === 'ticket' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copiat</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Pla</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Execution Order Type + Venue Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#070B14]/90 border border-slate-800 p-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      ⚡ Tipus d’Ordre Recomanada
                    </span>
                    <span className="text-xs font-black text-amber-300 mt-0.5 block">
                      {displayedSetup.executionLabelCa}
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#070B14]/90 border border-slate-800 p-2.5">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      🏦 Mercat Òptim (Funding: {formatFunding(selectedResult.fundingRate8h)})
                    </span>
                    <span className="text-xs font-black text-cyan-300 mt-0.5 block">
                      {displayedSetup.venueLabelCa}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 bg-[#070B14]/70 rounded-xl p-2.5 border border-slate-800/80 leading-relaxed">
                  {displayedSetup.venueRationaleCa}
                </p>

                {/* Price Levels Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2">
                    <span className="text-[10px] text-slate-400 block">Entrada</span>
                    <span className="text-xs font-black text-white tabular-nums">
                      {displayedSetup.entry}$
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#070B14] border border-rose-500/30 p-2">
                    <span className="text-[10px] text-rose-300 block">
                      Stop Loss (-{displayedSetup.slDistancePct}%)
                    </span>
                    <span className="text-xs font-black text-rose-400 tabular-nums">
                      {displayedSetup.stopLoss}$
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#070B14] border border-emerald-500/30 p-2">
                    <span className="text-[10px] text-emerald-300 block">
                      TP1 (50% + BE)
                    </span>
                    <span className="text-xs font-black text-emerald-300 tabular-nums">
                      {displayedSetup.tp1}$ (+{displayedSetup.tp1RR}R)
                    </span>
                  </div>
                  <div className="rounded-xl bg-[#070B14] border border-emerald-500/40 p-2">
                    <span className="text-[10px] text-emerald-300 block">
                      TP2 (50% Final)
                    </span>
                    <span className="text-xs font-black text-emerald-400 tabular-nums">
                      {displayedSetup.tp2}$ (+{displayedSetup.netRR}R)
                    </span>
                  </div>
                </div>

                {/* Personalized Position Sizing synced with Risk Master */}
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-extrabold text-white">
                      📐 Mida Exacta pel teu Compte ({riskSettings.cryptoCapitalUsdt} USDT · 1R = {riskSettings.cryptoRiskPct}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playUiTick(soundEnabled);
                        setActiveTab('RISK_MASTER');
                      }}
                      className="text-[10px] font-bold text-emerald-400 hover:underline shrink-0"
                    >
                      Ajustar Capital →
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Posició Total</span>
                      <strong className="text-white tabular-nums">
                        {Math.round(personalSizing.positionSizeUsdt)} USDT
                      </strong>
                      <span className="text-[10px] text-slate-400 block tabular-nums">
                        ({personalSizing.coinUnits} {selectedResult.spec.shortName})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Risc Màxim (SL)</span>
                      <strong className="text-rose-400 tabular-nums">
                        -{personalSizing.maxRiskUsdt} USDT
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Guany Net TP2</span>
                      <strong className="text-emerald-400 tabular-nums">
                        +{Math.round(personalSizing.netProfitAtTpUsdt)} USDT
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Confluences */}
                <div className="space-y-1 text-[11px] text-slate-300">
                  {displayedSetup.rationaleBulletsCa.map((b, idx) => (
                    <p key={idx} className="leading-snug">
                      • {b}
                    </p>
                  ))}
                  <p className="text-emerald-300/95 font-semibold pt-1">
                    📋 Gestió: {displayedSetup.managementPlanCa}
                  </p>
                </div>
              </div>
            )}

            {selectedResult &&
              !displayedSetup &&
              selectedResult.status === 'PRE_ALERT' &&
              selectedResult.preAlert && (
                <div className="rounded-2xl bg-amber-950/20 border border-amber-500/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                      🟡 PRE-ALERTA 4H · BIAIX {selectedResult.preAlert.bias}
                    </span>
                    <span className="text-[10px] font-bold text-amber-300">
                      Zona: {selectedResult.preAlert.targetZoneLow}$ – {selectedResult.preAlert.targetZoneHigh}$
                    </span>
                  </div>
                  <h3 className="text-xs font-extrabold text-white">
                    {selectedResult.preAlert.headlineCa}
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {selectedResult.preAlert.triggerInstructionCa}
                  </p>
                </div>
              )}

            {selectedResult &&
              !displayedSetup &&
              selectedResult.status === 'NEUTRAL' && (
                <div className="rounded-2xl bg-[#0B1220] border border-slate-800/90 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Disciplina Institucional: Sense Entrada Forçada
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playUiTick(soundEnabled);
                        setShowDemoSetupTicket(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-[10px] font-bold text-cyan-300 transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Veure Exemple Tiquet A+</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {selectedResult.neutralReasonCa}
                  </p>
                </div>
              )}
          </>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB 2: REAL WALK-FORWARD BACKTEST AUDIT                       */}
        {/* ================================================================= */}
        {subTab === 'BACKTEST' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#0B1220] border border-slate-800/90 p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Auditoria Walk-Forward Zero Look-Ahead
                  </span>
                  <h2 className="text-sm font-black text-white mt-0.5">
                    {BACKTEST_REPORT.daysCovered} Dies d’Històric Real ({BACKTEST_REPORT.periodStartIso} → {BACKTEST_REPORT.periodEndIso})
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Validat durant un any baixista exigent (on Buy & Hold va caure un -31,4% en BTC i -52,3% en AVAX; -43,4% de mitjana), incloent comissions del 0,10% i regla conservadora SL-First.
                  </p>
                </div>
              </div>

              {/* 6 KPI Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Guany Net</span>
                  <span className="text-sm font-black text-emerald-400 tabular-nums">
                    +{BACKTEST_REPORT.netTotalR}R
                  </span>
                </div>
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Profit Factor</span>
                  <span className="text-sm font-black text-cyan-300 tabular-nums">
                    {BACKTEST_REPORT.profitFactor}
                  </span>
                </div>
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Esperança E[R]</span>
                  <span className="text-sm font-black text-emerald-300 tabular-nums">
                    +{BACKTEST_REPORT.expectancyR}R
                  </span>
                </div>
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Winrate Net</span>
                  <span className="text-sm font-black text-white tabular-nums">
                    {BACKTEST_REPORT.winRatePct}%
                  </span>
                </div>
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Operacions</span>
                  <span className="text-sm font-black text-white tabular-nums">
                    {BACKTEST_REPORT.totalFilledTrades}
                  </span>
                </div>
                <div className="rounded-xl bg-[#070B14] border border-slate-800 p-2.5">
                  <span className="text-[10px] text-slate-400 block">Max Drawdown</span>
                  <span className="text-sm font-black text-amber-300 tabular-nums">
                    -{BACKTEST_REPORT.maxDrawdownR}R
                  </span>
                </div>
              </div>

              {/* Cumulative R Equity Curve */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Corba d’Equitat Acumulada de Cartera (en unitats R)</span>
                  <span className="text-emerald-400 font-bold">
                    1R = 1% → +{BACKTEST_REPORT.netTotalR}% net
                  </span>
                </div>
                <EquityCurveSvg points={BACKTEST_REPORT.equityCurveR} />
              </div>

              {/* Per-Asset Breakdown */}
              <div>
                <h3 className="text-xs font-extrabold text-white mb-1.5">
                  Rendiment Auditat per Moneda
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#070B14] text-slate-400 text-[10px]">
                      <tr>
                        <th className="py-2 px-2.5">Actiu</th>
                        <th className="py-2 px-2">Trades</th>
                        <th className="py-2 px-2">WR</th>
                        <th className="py-2 px-2">PF</th>
                        <th className="py-2 px-2 text-right">Net R</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {BACKTEST_REPORT.byAsset.map((a) => (
                        <tr key={a.symbol} className="bg-[#090F1C]">
                          <td className="py-2 px-2.5 font-bold text-white">
                            {a.symbol.replace('USDT', '')}
                          </td>
                          <td className="py-2 px-2 text-slate-300 tabular-nums">{a.trades}</td>
                          <td className="py-2 px-2 text-slate-300 tabular-nums">{a.winRatePct}%</td>
                          <td className="py-2 px-2 text-slate-300 tabular-nums">{a.profitFactor}</td>
                          <td
                            className={`py-2 px-2.5 text-right font-extrabold tabular-nums ${
                              a.netTotalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {a.netTotalR >= 0 ? '+' : ''}
                            {a.netTotalR}R
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assumptions */}
              <div className="rounded-xl bg-[#070B14] border border-slate-800/80 p-2.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-300 block">
                  Condicions d’Auditoria Estricta:
                </span>
                {BACKTEST_REPORT.assumptionsCa.map((item, i) => (
                  <p key={i} className="text-[10px] text-slate-400 leading-snug">
                    • {item}
                  </p>
                ))}
              </div>
            </div>

            {/* Recent Trades Log */}
            <div className="rounded-2xl bg-[#0B1220] border border-slate-800/90 p-3.5">
              <h3 className="text-xs font-extrabold text-white mb-2">
                Últimes Operacions Registrades al Backtest
              </h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {BACKTEST_REPORT.recentTrades.map((t, idx) => (
                  <div
                    key={`${t.symbol}_${t.entryTime}_${idx}`}
                    className="rounded-xl bg-[#070B14] border border-slate-800/80 px-2.5 py-2 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-white">
                          {t.symbol.replace('USDT', '')}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            t.side === 'LONG'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {t.side}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {t.executionType === 'MARKET' ? 'Market' : 'Limit'} · {formatShortDate(t.entryTime)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block tabular-nums">
                        Ent: {t.entry}$ · SL: {t.stopLoss}$ · TP2: {t.tp2}$
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-black block tabular-nums ${
                          t.realizedR > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.realizedR > 0 ? '+' : ''}
                        {t.realizedR}R
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {t.outcome === 'TP2_FULL'
                          ? 'TP2 Complet'
                          : t.outcome === 'TP1_THEN_BE'
                            ? 'TP1 + BE'
                            : t.outcome === 'SL_HIT'
                              ? 'Stop Loss'
                              : 'Tancament Temps'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SUB-TAB 3: PRIVATE 24/7 DISCORD BOT SETUP GUIDE                   */}
        {/* ================================================================= */}
        {subTab === 'DISCORD' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#0B1220] border border-slate-800/90 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <h2 className="text-sm font-black text-white">
                  Activa les teves Notificacions Privades a Discord (0 € · 24/7)
                </h2>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                El repositori ja inclou el bot horari al núvol (<code className="text-cyan-300">.github/workflows/crypto-swing-radar.yml</code>). S’executa sol cada hora al minut <code className="text-slate-200">:02</code> sense necessitat de tenir l’ordinador encès i t’envia al mòbil Entrada, SL, TP1/TP2, Market vs Limit i Spot vs Perps.
              </p>

              {/* Step 1 */}
              <div className="rounded-xl bg-[#070B14] border border-slate-800 p-3 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-cyan-400">
                  Pas 1 · Crea el Webhook al teu Servidor de Discord
                </span>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Obre Discord → entra al teu servidor privat → <strong>Edita el canal</strong> (icona d’engranatge) → <strong>Integracions → Webhooks → Nou Webhook</strong> → prem <strong>Copia la URL del Webhook</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl bg-[#070B14] border border-slate-800 p-3 space-y-2">
                <span className="text-[10px] font-black uppercase text-emerald-400">
                  Pas 2 · Desa la URL com a Secret Privat a GitHub
                </span>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Afegeix un <strong>New repository secret</strong> amb aquest nom exacte i enganxa-hi la URL del teu Webhook:
                </p>
                <div className="flex items-center justify-between gap-2 bg-[#0B1220] border border-slate-700/80 rounded-lg px-2.5 py-1.5">
                  <code className="text-xs font-black text-emerald-300">
                    DISCORD_WEBHOOK_URL
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyText('secret', 'DISCORD_WEBHOOK_URL')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-200"
                  >
                    {copiedKey === 'secret' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copiat</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar nom</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href="https://github.com/wilio-cloud/edgedojo/settings/secrets/actions"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 hover:underline"
                >
                  <span>Obrir GitHub Actions Secrets (wilio-cloud/edgedojo)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl bg-[#070B14] border border-slate-800 p-3 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400">
                  Pas 3 · Envia un Ping de Prova Immediat al Mòbil
                </span>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Obre la pestanya <strong>Actions</strong>, selecciona <em>EdgeDojo Crypto Swing Radar (24/7 Discord Bot)</em>, prem <strong>Run workflow</strong> i activa la casella <code className="text-amber-300">send_test_ping = true</code>. Rebràs a l’instant l’informe en viu de BTC, ETH, SOL i AVAX al teu Discord!
                </p>
                <a
                  href="https://github.com/wilio-cloud/edgedojo/actions"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:underline"
                >
                  <span>Obrir panell GitHub Actions</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[10px] text-emerald-200 leading-relaxed">
                🔒 <strong>Privadesa Garantida:</strong> Tot i que comparteixis l’enllaç d’EdgeDojo amb amics, els GitHub Secrets estan xifrats al servidor i només el teu compte pot rebre les alertes al teu canal privat de Discord.
              </div>
            </div>
          </div>
        )}

        <LegalFooter />
      </div>
    </div>
  );
};
