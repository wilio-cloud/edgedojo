import React, { useMemo, useState } from 'react';
import { ShieldAlert, Star, X } from 'lucide-react';
import { CAMPAIGN_SCENARIOS } from '../../data/curatedScenarios';
import {
  getPlayerRank,
  getTotalStars,
  useGameStore,
} from '../../store/useGameStore';
import { playUiTick } from '../../utils/soundHaptics';

export const EdgeDojoMark: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="edBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#101B33" />
        <stop offset="100%" stopColor="#070B14" />
      </linearGradient>
      <linearGradient id="edBull" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#059669" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
      <linearGradient id="edBear" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FB7185" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
    </defs>
    <rect
      x="2"
      y="2"
      width="60"
      height="60"
      rx="15"
      fill="url(#edBg)"
      stroke="#1E293B"
      strokeWidth="2"
    />
    {/* Liquidity sweep level */}
    <line
      x1="9"
      y1="43"
      x2="55"
      y2="43"
      stroke="#F59E0B"
      strokeWidth="1.8"
      strokeDasharray="3.5 2.5"
      opacity="0.85"
    />
    {/* Bear trap candle */}
    <line
      x1="17"
      y1="23"
      x2="17"
      y2="49"
      stroke="#F43F5E"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <rect x="13.5" y="27" width="7" height="16" rx="1.8" fill="url(#edBear)" />
    {/* Sweep & Reclaim hammer */}
    <line
      x1="29"
      y1="26"
      x2="29"
      y2="54"
      stroke="#34D399"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <rect x="25.5" y="30" width="7" height="10" rx="1.8" fill="url(#edBull)" />
    {/* Displacement BOS candle */}
    <line
      x1="41"
      y1="15"
      x2="41"
      y2="38"
      stroke="#34D399"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <rect x="37.5" y="18" width="7" height="17" rx="1.8" fill="url(#edBull)" />
    {/* Continuation candle */}
    <line
      x1="51"
      y1="10"
      x2="51"
      y2="25"
      stroke="#38BDF8"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <rect x="48" y="12" width="6" height="10" rx="1.6" fill="#38BDF8" />
  </svg>
);

export const TopBrandBar: React.FC = () => {
  const { stageProgress, xp, setActiveTab, soundEnabled } = useGameStore();
  const totalStars = useMemo(
    () => getTotalStars(stageProgress),
    [stageProgress]
  );
  const rank = useMemo(() => getPlayerRank(xp), [xp]);

  return (
    <header className="shrink-0 bg-[#090E1A]/95 backdrop-blur-md border-b border-slate-800/85 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            playUiTick(soundEnabled);
            setActiveTab('CAMPAIGN');
          }}
          className="flex items-center gap-2.5 text-left group"
        >
          <EdgeDojoMark className="w-8 h-8 shrink-0 shadow-md shadow-emerald-500/10 group-active:scale-95 transition" />
          <div className="leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-black tracking-tight text-white">
                EDGE<span className="text-emerald-400">DOJO</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">
                PRO
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 tracking-wide mt-0.5">
              Price Action · MNQ Scalp &amp; Crypto Swing
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10.5px] font-semibold text-slate-300">
            Niv. {rank.level} · {rank.title}
          </span>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-300">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>
              {totalStars}/{CAMPAIGN_SCENARIOS.length * 3}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export const LegalFooter: React.FC = () => {
  const [showLegalModal, setShowLegalModal] = useState(false);

  return (
    <>
      <footer className="pt-4 pb-2 border-t border-slate-800/70 text-center space-y-1.5">
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <EdgeDojoMark className="w-4 h-4" />
          <span>© 2026 EdgeDojo · Tots els drets reservats.</span>
        </div>
        <p className="text-[10.5px] text-slate-500 leading-relaxed max-w-lg mx-auto">
          Entorn d’entrenament estrictament educatiu. Cap contingut d’aquesta
          aplicació constitueix assessorament financer ni recomanació d’inversió.{' '}
          <button
            type="button"
            onClick={() => setShowLegalModal(true)}
            className="text-slate-300 underline decoration-slate-600 hover:text-emerald-300 font-semibold transition"
          >
            Avís legal, riscos i privadesa
          </button>
        </p>
      </footer>

      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto bg-[#0D1424] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3.5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-300">
                    Informació Reguladora i Propietat Intel·lectual
                  </span>
                  <h2 className="text-base font-bold text-white">
                    Avís Legal i Advertència de Riscos
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLegalModal(false)}
                aria-label="Tancar avís legal"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800 space-y-1">
                <h3 className="font-bold text-white">
                  1. Finalitat Estrictament Educativa (No Assessorament)
                </h3>
                <p>
                  <strong>EdgeDojo</strong> és un simulador interactiu dissenyat
                  exclusivament per a la formació tècnica en lectura d’estructura
                  del preu (<em>Price Action</em>) i càlcul matemàtic del risc. Cap
                  lliçó, escenari, mètrica del Passaport Pro ni calculadora
                  constitueix assessorament financer, fiscal ni recomanació de
                  compra o venda de cap actiu.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                <h3 className="font-bold text-rose-200">
                  2. Alt Risc en Futurs (MNQ) i Criptoactius
                </h3>
                <p className="text-rose-100/90">
                  L’operativa real amb contractes de futurs apalancats (com el
                  Micro E-mini Nasdaq-100) i criptoactius (Spot o Perpetus) comporta
                  un alt nivell de risc i pot no ser adequada per a tots els
                  inversors. Pots perdre una part o la totalitat del capital
                  invertit. Els resultats obtinguts en simulació o sobre dades
                  històriques no garanteixen rendiments futurs en mercat real.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800 space-y-1">
                <h3 className="font-bold text-white">
                  3. Privadesa 100% Local (Zero Recopilació de Dades)
                </h3>
                <p>
                  Aquesta aplicació funciona íntegrament al navegador de l’usuari.
                  El progrés d’estrelles, l’historial d’entrenament i els paràmetres
                  de la calculadora es desen únicament a l’emmagatzematge local (
                  <code>localStorage</code>) del teu propi dispositiu; no s’envien a
                  cap servidor extern ni s’utilitzen galetes de rastreig.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800 space-y-1">
                <h3 className="font-bold text-white">
                  4. Propietat Intel·lectual
                </h3>
                <p>
                  © 2026 <strong>EdgeDojo</strong>. Tots els drets reservats sobre
                  el disseny, codi, motor de simulació, diagrames i contingut
                  pedagògic. Les marques de tercers citades amb finalitat
                  descriptiva (CME, Nasdaq) pertanyen als seus respectius titulars.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLegalModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              Entès · Tornar a EdgeDojo
            </button>
          </div>
        </div>
      )}
    </>
  );
};
