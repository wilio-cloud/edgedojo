import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Download,
  RotateCcw,
  ShieldCheck,
  Square,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { computeReadinessProfile } from '../../engine/scoringEngine';
import { TradingStyle } from '../../engine/types';
import { useGameStore } from '../../store/useGameStore';
import { LegalFooter } from '../common/BrandShell';
import { playUiTick } from '../../utils/soundHaptics';

const PRE_MARKET_CHECKLIST = [
  {
    key: 'htf_bias',
    label: 'He identificat l’estructura HTF (4H/1D o 15m en Scalp) i sé on són les parets majors.',
  },
  {
    key: 'liquidity_swept',
    label: 'El preu ve de prendre una piscina de liquidesa (Sweep) o de tocar una Zona Fresca.',
  },
  {
    key: 'choch_trigger',
    label: 'Tinc confirmació d’intenció (CHoCH / Reclamació amb volum), no estic endevinant el gir.',
  },
  {
    key: 'structural_sl',
    label: 'El meu Stop Loss està darrere la invalidesa estructural (no asfixiat dins el soroll).',
  },
  {
    key: 'asymmetric_rr',
    label: 'Fins al proper obstacle real tinc un R:R net >= 2.0R (descomptant spread/fees).',
  },
  {
    key: 'fixed_risk',
    label: 'Risc calculat exacte: 0.5–1% en MNQ (4–6% del coixí en Fondeig) o 1–2% màx en Cripto (Heat total <= 3%).',
  },
];

export const ReadinessPassportScreen: React.FC = () => {
  const {
    history,
    checklistState,
    soundEnabled,
    toggleChecklistItem,
    resetChecklist,
    exportBackupJson,
    importBackupJson,
    resetAllProgress,
  } = useGameStore();

  const [filter, setFilter] = useState<'ALL' | 'SCALP' | 'SWING'>('ALL');
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [showImportBox, setShowImportBox] = useState(false);
  const [importText, setImportText] = useState('');

  const profile = useMemo(() => {
    const styleArg: TradingStyle | undefined =
      filter === 'ALL' ? undefined : filter;
    return computeReadinessProfile(history, styleArg);
  }, [history, filter]);

  // Cumulative R Equity Curve points (chronological)
  const equityPoints = useMemo(() => {
    const chronological = [...history]
      .reverse()
      .filter((h) => (filter === 'ALL' ? true : h.style === filter));
    if (chronological.length === 0) return null;

    let sum = 0;
    const vals = [0];
    for (const item of chronological) {
      sum = Math.round((sum + item.netR) * 100) / 100;
      vals.push(sum);
    }
    const minV = Math.min(...vals, -1);
    const maxV = Math.max(...vals, 2);
    const span = Math.max(maxV - minV, 1);

    const w = 340;
    const h = 90;
    const coords = vals.map((v, i) => {
      const x = 12 + (i / Math.max(vals.length - 1, 1)) * (w - 24);
      const y = h - 12 - ((v - minV) / span) * (h - 24);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const zeroY = h - 12 - ((0 - minV) / span) * (h - 24);

    return {
      polyline: coords.join(' '),
      finalR: sum,
      zeroY,
    };
  }, [history, filter]);

  const checkedCount = PRE_MARKET_CHECKLIST.filter(
    (item) => checklistState[item.key]
  ).length;
  const allChecked = checkedCount === PRE_MARKET_CHECKLIST.length;

  const handleExport = async () => {
    const json = exportBackupJson();
    try {
      await navigator.clipboard.writeText(json);
      setBackupMessage('Còpia de seguretat copiada al porta-retalls!');
    } catch {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edgedojo-backup.json';
      a.click();
      setBackupMessage('Fitxer de còpia descarregat!');
    }
    setTimeout(() => setBackupMessage(null), 3500);
  };

  const handleImport = () => {
    const ok = importBackupJson(importText.trim());
    setBackupMessage(
      ok
        ? 'Progrés restaurat correctament!'
        : 'Format JSON no vàlid. Comprova el text copiat.'
    );
    if (ok) {
      setShowImportBox(false);
      setImportText('');
    }
    setTimeout(() => setBackupMessage(null), 3500);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-5 max-w-2xl mx-auto w-full">
      {/* Style Filter Tabs */}
      <div className="flex items-center rounded-2xl bg-[#0C1322] p-1 border border-slate-800">
        {(['ALL', 'SCALP', 'SWING'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              playUiTick(soundEnabled);
              setFilter(tab);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              filter === tab
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'ALL'
              ? 'Global'
              : tab === 'SCALP'
                ? '⚡ Scalp Pro'
                : '🧭 Swing Pro'}
          </button>
        ))}
      </div>

      {/* Readiness Score Hero Card */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0F192E] to-[#090E1A] border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Passaport a Directe ({profile.sampleSize} escenaris)
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
              {profile.verdictLabel}
            </h1>
          </div>

          <div
            className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 font-mono ${
              profile.overallScore >= 80
                ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                : profile.overallScore >= 60
                  ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <span className="text-xl font-extrabold leading-none">
              {profile.overallScore}
            </span>
            <span className="text-[9px] uppercase mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Institutional Metrics Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div
              className={`text-sm font-mono font-bold ${
                profile.expectancyR > 0 ? 'text-emerald-400' : 'text-slate-300'
              }`}
            >
              {profile.expectancyR >= 0 ? '+' : ''}
              {profile.expectancyR}R
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Esperança E[R]
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-sm font-mono font-bold text-cyan-300">
              {profile.winRatePct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Winrate</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-sm font-mono font-bold text-amber-300">
              {profile.skipAccuracyPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Filtre Trampes
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-sm font-mono font-bold text-slate-200">
              {profile.slQualityPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Qualitat SL</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-sm font-mono font-bold text-slate-200">
              {profile.managementPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Gestió en Viu
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-sm font-mono font-bold text-rose-300">
              -{profile.maxDrawdownR}R
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Max DD</div>
          </div>
        </div>

        {/* Equity Curve SVG */}
        {equityPoints && (
          <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Corba
                d’Equitat Acumulada
              </span>
              <span
                className={`font-mono font-bold ${
                  equityPoints.finalR >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {equityPoints.finalR >= 0 ? '+' : ''}
                {equityPoints.finalR}R
              </span>
            </div>
            <svg viewBox="0 0 340 90" className="w-full h-20">
              <line
                x1="12"
                y1={equityPoints.zeroY}
                x2="328"
                y2={equityPoints.zeroY}
                stroke="#334155"
                strokeDasharray="4 4"
              />
              <polyline
                fill="none"
                stroke={equityPoints.finalR >= 0 ? '#10B981' : '#F43F5E'}
                strokeWidth="2.5"
                points={equityPoints.polyline}
              />
            </svg>
          </div>
        )}
      </section>

      {/* Diagnostic Strengths & Blind Spots */}
      <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Diagnòstic d’Auditoria Tècnica
        </h2>
        {profile.strengths.map((st, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 text-xs text-emerald-200 bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{st}</span>
          </div>
        ))}
        {profile.blindSpots.map((bs, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{bs}</span>
          </div>
        ))}
      </section>

      {/* Live Trading Pre-Flight Checklist */}
      <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Checklist Pre-Execució en Directe
            </h2>
            <p className="text-[11px] text-slate-400">
              Fes-lo servir al mòbil just abans d’obrir un trade amb diners reals
            </p>
          </div>
          <button
            type="button"
            onClick={resetChecklist}
            className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            title="Netejar checklist"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {PRE_MARKET_CHECKLIST.map((item) => {
            const checked = Boolean(checklistState[item.key]);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  toggleChecklistItem(item.key);
                }}
                className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition ${
                  checked
                    ? 'bg-emerald-950/35 border-emerald-500/40 text-emerald-100'
                    : 'bg-slate-900/75 border-slate-800 text-slate-300'
                }`}
              >
                {checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <span className="text-xs leading-snug">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className={`p-3 rounded-xl text-center text-xs font-bold border ${
            allChecked
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
        >
          {allChecked
            ? '✅ LLUM VERDA INSTITUCIONAL: Setup validat per executar!'
            : `Validació: ${checkedCount}/${PRE_MARKET_CHECKLIST.length} criteris (No executis sense els 6/6)`}
        </div>
      </section>

      {/* Portable Backup (PC <-> Mobile Sync) */}
      <section className="rounded-2xl bg-[#0C1322] border border-slate-800 p-4 space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Sincronització Mòbil ↔ Ordinador i Dades
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Copiar Backup
          </button>
          <button
            type="button"
            onClick={() => setShowImportBox((v) => !v)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            Importar Backup
          </button>
        </div>

        {showImportBox && (
          <div className="space-y-2 pt-1">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Enganxa aquí el JSON de còpia de seguretat..."
              className="w-full h-24 rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs font-mono text-slate-200"
            />
            <button
              type="button"
              onClick={handleImport}
              className="w-full py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Restaurar Progrés
            </button>
          </div>
        )}

        {backupMessage && (
          <p className="text-xs font-semibold text-cyan-300 text-center">
            {backupMessage}
          </p>
        )}

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Segur que vols reiniciar tot el progrés i estadístiques a zero?'
                )
              ) {
                resetAllProgress();
              }
            }}
            className="text-[11px] text-rose-400/75 hover:text-rose-300 underline"
          >
            Reiniciar estadística a zero
          </button>
        </div>
      </section>

      <LegalFooter />
    </div>
  );
};
