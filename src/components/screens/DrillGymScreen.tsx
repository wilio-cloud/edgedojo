import React from 'react';
import {
  Activity,
  Compass,
  Dumbbell,
  Flame,
  Layers,
  Play,
  SlidersHorizontal,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { REAL_MARKET_PACKS } from '../../data/curatedScenarios';
import { useGameStore } from '../../store/useGameStore';
import { LegalFooter } from '../common/BrandShell';
import { playUiTick } from '../../utils/soundHaptics';

export const DrillGymScreen: React.FC = () => {
  const {
    gymStyleFilter,
    gymModeFilter,
    gymCounter,
    soundEnabled,
    startGymDrill,
  } = useGameStore();

  const styleOptions: {
    id: 'ALL' | 'SCALP' | 'SWING';
    title: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'ALL',
      title: 'Mix Complet (MNQ Scalp + Cripto Swing)',
      desc: 'Alterna sessions ràpides d’MNQ (1m/5m) amb Swings Cripto (1H/4H/1D)',
      icon: Activity,
    },
    {
      id: 'SCALP',
      title: 'Especialista SCALP MNQ (Micro Nasdaq-100)',
      desc: '1m / 5m / 15m · Obertures NY 15:30h CET, Silver Bullet i fricció real',
      icon: Zap,
    },
    {
      id: 'SWING',
      title: 'Especialista SWING CRIPTO (BTC · ETH · SOL · Alts)',
      desc: '1H / 4H / 1D · Escombrades de liquidacions, Top-Down HTF i runners',
      icon: Compass,
    },
  ];

  const modeOptions: {
    id: 'MIXED' | 'EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM';
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'MIXED', label: 'Rotació Tàctica', icon: Flame },
    { id: 'EXECUTION', label: 'Puzzles R:R + Skip', icon: Target },
    { id: 'MANAGEMENT', label: 'Gestor en Viu', icon: SlidersHorizontal },
    { id: 'REPLAY_EXAM', label: 'Sessió Blind Replay', icon: Timer },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-5 max-w-2xl mx-auto w-full">
      <header className="rounded-2xl bg-gradient-to-br from-[#10192E] to-[#0A0F1C] border border-slate-800 p-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">
              Gimnàs Tàctic Infinit
            </h1>
            <p className="text-xs text-slate-400">
              Entrena l’ull amb {REAL_MARKET_PACKS.length} sessions històriques
              100% reals anonimitzades
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px]">
          {[
            'MNQ=F (1m/5m/15m)',
            'BTC/USDT',
            'ETH/USDT',
            'SOL/USDT',
            'AVAX/USDT',
            'LINK/USDT',
            'SUI/USDT',
            'BNB/USDT',
          ].map((asset) => (
            <span
              key={asset}
              className={`px-2 py-0.5 rounded-md border font-mono ${
                asset.startsWith('MNQ')
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {asset}
            </span>
          ))}
        </div>
      </header>

      {/* Step 1: Choose Style */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          1. Quin múscul vols entrenar avui?
        </h2>
        <div className="space-y-2">
          {styleOptions.map((opt) => {
            const Icon = opt.icon;
            const active = gymStyleFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  useGameStore.setState({ gymStyleFilter: opt.id });
                }}
                className={`w-full text-left p-3.5 rounded-2xl border flex items-center gap-3 transition ${
                  active
                    ? 'bg-emerald-950/35 border-emerald-400 text-white shadow-lg shadow-emerald-500/5'
                    : 'bg-[#0C1322] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">{opt.title}</div>
                  <div className="text-xs text-slate-400">{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Choose Drill Mode */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          2. Format de Simulació
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {modeOptions.map((m) => {
            const Icon = m.icon;
            const active = gymModeFilter === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  useGameStore.setState({ gymModeFilter: m.id });
                }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2 transition ${
                  active
                    ? 'bg-cyan-950/50 border-cyan-400 text-cyan-200'
                    : 'bg-[#0C1322] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 text-cyan-400" />
                <span className="text-xs font-bold">{m.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Launch Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => {
            playUiTick(soundEnabled);
            startGymDrill(gymStyleFilter, gymModeFilter);
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 active:scale-[0.99] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/15"
        >
          <Play className="w-4 h-4 fill-current" />
          Iniciar Sessió al Gimnàs (Ronda #{gymCounter + 1})
        </button>

        <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
          <Layers className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-200">Consell d’escalfament Pro:</strong>{' '}
            Fer 5 minuts de Gimnàs amb dades reals ocultes just abans d’obrir el
            teu broker et calibra la vista i redueix l’impuls d’entrar per ansietat
            a la primera espelma que es mou.
          </p>
        </div>
      </div>

      <LegalFooter />
    </div>
  );
};
