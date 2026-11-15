import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { MicroLesson } from '../../engine/types';

interface LessonModalProps {
  lesson: MicroLesson;
  onClose: () => void;
  onComplete: () => void;
  actionLabel?: string;
}

const LessonDiagram: React.FC<{ type: MicroLesson['diagramType'] }> = ({
  type,
}) => {
  switch (type) {
    case 'STRUCTURE_BOS_CHOCH':
      return (
        <svg
          viewBox="0 0 360 130"
          className="w-full h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-2"
        >
          {/* FVG / Discount highlight zone */}
          <rect
            x="118"
            y="45"
            width="68"
            height="20"
            rx="3"
            fill="rgba(56,189,248,0.13)"
            stroke="rgba(56,189,248,0.4)"
            strokeDasharray="3 2"
          />
          <text x="123" y="58" fill="#7DD3FC" fontSize="8.5" fontWeight="bold">
            FVG (&lt;50%)
          </text>
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            points="18,108 65,65 100,86 158,32 195,58 242,18"
          />
          <polyline
            fill="none"
            stroke="#F43F5E"
            strokeWidth="3"
            points="242,18 292,82 318,54 345,105"
          />
          <line
            x1="65"
            y1="65"
            x2="158"
            y2="65"
            stroke="#34D399"
            strokeDasharray="4 3"
          />
          <text x="82" y="59" fill="#34D399" fontSize="10" fontWeight="bold">
            BOS ▲
          </text>
          <circle cx="195" cy="58" r="4.5" fill="#38BDF8" />
          <text x="165" y="79" fill="#38BDF8" fontSize="9.5" fontWeight="bold">
            HL Protegit
          </text>
          <line
            x1="195"
            y1="58"
            x2="292"
            y2="58"
            stroke="#F43F5E"
            strokeDasharray="4 3"
          />
          <text x="235" y="53" fill="#F43F5E" fontSize="10" fontWeight="bold">
            CHoCH ▼
          </text>
        </svg>
      );
    case 'LIQUIDITY_SWEEP':
      return (
        <svg
          viewBox="0 0 360 130"
          className="w-full h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-2"
        >
          <line
            x1="30"
            y1="44"
            x2="310"
            y2="44"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeDasharray="5 4"
          />
          <text x="36" y="35" fill="#F59E0B" fontSize="10" fontWeight="bold">
            Equal Highs = BSL (Stops Retail $$$)
          </text>
          <polyline
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            points="35,98 85,45 130,82 180,45 215,72"
          />
          <line
            x1="252"
            y1="14"
            x2="252"
            y2="68"
            stroke="#F43F5E"
            strokeWidth="3"
          />
          <rect x="245" y="48" width="14" height="24" rx="2" fill="#F43F5E" />
          <text x="263" y="24" fill="#FCA5A5" fontSize="9.5" fontWeight="bold">
            Sweep + Reclaim!
          </text>
          <polyline
            fill="none"
            stroke="#F43F5E"
            strokeWidth="3"
            points="259,68 295,95 335,114"
          />
        </svg>
      );
    case 'ASYMMETRIC_RR':
      return (
        <svg
          viewBox="0 0 360 130"
          className="w-full h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-2"
        >
          <rect
            x="150"
            y="16"
            width="175"
            height="68"
            fill="rgba(16,185,129,0.18)"
            stroke="#10B981"
            rx="4"
          />
          <rect
            x="150"
            y="84"
            width="175"
            height="28"
            fill="rgba(244,63,94,0.22)"
            stroke="#F43F5E"
            rx="4"
          />
          <text
            x="237"
            y="48"
            textAnchor="middle"
            fill="#34D399"
            fontSize="11.5"
            fontWeight="bold"
          >
            OBJECTIU +2.8R (TP)
          </text>
          <text
            x="237"
            y="64"
            textAnchor="middle"
            fill="#A7F3D0"
            fontSize="9"
          >
            BE / Parcial 50% després del BOS
          </text>
          <text
            x="237"
            y="102"
            textAnchor="middle"
            fill="#FDA4AF"
            fontSize="10"
            fontWeight="bold"
          >
            RISC -1.0R = 1% Capital
          </text>
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.8"
            points="25,45 75,95 112,114 148,84 195,90 285,20"
          />
          <circle cx="112" cy="114" r="4" fill="#F59E0B" />
          <text x="35" y="122" fill="#F59E0B" fontSize="9.5">
            Invalidesa Sweep
          </text>
        </svg>
      );
    case 'SCALP_FRICTION':
      return (
        <svg
          viewBox="0 0 360 130"
          className="w-full h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-2"
        >
          <rect
            x="18"
            y="20"
            width="152"
            height="90"
            rx="8"
            fill="rgba(244,63,94,0.12)"
            stroke="#F43F5E"
          />
          <text
            x="94"
            y="42"
            textAnchor="middle"
            fill="#FDA4AF"
            fontSize="10"
            fontWeight="bold"
          >
            MNQ Micro-SL Amateur
          </text>
          <text x="94" y="62" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
            SL 4 pts ($8) · 10 lots
          </text>
          <text
            x="94"
            y="84"
            textAnchor="middle"
            fill="#F43F5E"
            fontSize="10"
            fontWeight="bold"
          >
            Soroll NY Open + Fees!
          </text>

          <rect
            x="188"
            y="20"
            width="154"
            height="90"
            rx="8"
            fill="rgba(16,185,129,0.12)"
            stroke="#10B981"
          />
          <text
            x="265"
            y="42"
            textAnchor="middle"
            fill="#6EE7B7"
            fontSize="10"
            fontWeight="bold"
          >
            MNQ Estructural Pro
          </text>
          <text
            x="265"
            y="62"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="9.5"
          >
            SL 20 pts ($40) · 2 lots
          </text>
          <text
            x="265"
            y="84"
            textAnchor="middle"
            fill="#34D399"
            fontSize="10"
            fontWeight="bold"
          >
            15:30h CET · 1R = $82,6
          </text>
        </svg>
      );
    case 'SWING_TOPDOWN':
      return (
        <svg
          viewBox="0 0 360 130"
          className="w-full h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-2"
        >
          <rect
            x="20"
            y="82"
            width="320"
            height="32"
            rx="5"
            fill="rgba(139,92,246,0.22)"
            stroke="#8B5CF6"
          />
          <text x="28" y="102" fill="#DDD6FE" fontSize="9.8" fontWeight="bold">
            DEMANDA CRIPTO 4H/1D + LIQUIDATION FLUSH (SSL)
          </text>
          <polyline
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            points="40,22 95,52 120,40 165,78 190,66 220,98"
          />
          <polyline
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            points="220,98 248,60 270,76 325,18"
          />
          <text x="246" y="52" fill="#34D399" fontSize="10" fontWeight="bold">
            CHoCH 1H (Gatell!)
          </text>
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 360 130"
          className="w-full h-32 bg-slate-950/80 rounded-xl border border-slate-800 p-2"
        >
          <line
            x1="25"
            y1="102"
            x2="335"
            y2="102"
            stroke="#F43F5E"
            strokeDasharray="4 4"
          />
          <text x="32" y="116" fill="#F43F5E" fontSize="9.5" fontWeight="bold">
            Fre Step-Down (-5% DD → 0.5% Risc) · Màx -2.5R/dia
          </text>
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="3"
            points="28,78 75,60 115,72 165,44 205,55 265,26 330,16"
          />
          <text
            x="165"
            y="24"
            fill="#38BDF8"
            fontSize="10.5"
            fontWeight="bold"
          >
            Escalat Compost + Retirs 20%
          </text>
        </svg>
      );
  }
};

export const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  onClose,
  onComplete,
  actionLabel = 'Entès · Passar a l’Acció',
}) => {
  const [viewMode, setViewMode] = useState<'ESSENTIAL' | 'MASTER'>('ESSENTIAL');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#0D1424] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Màster EdgeDojo · Lectura ~{lesson.readTimeSec}s
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {lesson.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tancar lliçó"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 mb-3">{lesson.subtitle}</p>

        {/* Sub-toggle between Quick Rules & Deep Masterclass */}
        {lesson.deepDiveSections && lesson.deepDiveSections.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setViewMode('ESSENTIAL')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                viewMode === 'ESSENTIAL'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Regles Clau ({lesson.keyRules.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MASTER')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                viewMode === 'MASTER'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Aprofundiment ({lesson.deepDiveSections.length})
            </button>
          </div>
        )}

        <LessonDiagram type={lesson.diagramType} />

        {viewMode === 'ESSENTIAL' ? (
          <div className="mt-3.5 space-y-2">
            {lesson.keyRules.map((rule, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 bg-slate-900/75 border border-slate-800 rounded-xl p-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-200 leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3.5 space-y-2.5">
            {lesson.deepDiveSections?.map((sec, idx) => (
              <div
                key={idx}
                className="bg-slate-900/85 border border-cyan-500/25 rounded-xl p-3.5 space-y-1"
              >
                <h3 className="text-xs font-extrabold text-cyan-300 uppercase tracking-wide">
                  {sec.heading}
                </h3>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {sec.body}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 bg-rose-950/35 border border-rose-500/35 rounded-xl p-3 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-rose-300">
              Error Típic a Evitar:{' '}
            </span>
            <span className="text-rose-100/90">{lesson.commonTrap}</span>
          </div>
        </div>

        <div className="mt-2.5 bg-amber-950/30 border border-amber-500/35 rounded-xl p-3 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs font-semibold text-amber-200 italic">
            “{lesson.proMantra}”
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onComplete();
            onClose();
          }}
          className="mt-4 w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
