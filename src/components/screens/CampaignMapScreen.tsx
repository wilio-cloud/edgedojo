import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Lock,
  Play,
  Radar,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CAMPAIGN_WORLDS, MICRO_LESSONS } from '../../data/lessons';
import { CAMPAIGN_SCENARIOS } from '../../data/curatedScenarios';
import {
  getPlayerRank,
  getTotalStars,
  useGameStore,
} from '../../store/useGameStore';
import { MicroLesson, Scenario } from '../../engine/types';
import { LessonModal } from '../modals/LessonModal';
import { playUiTick } from '../../utils/soundHaptics';

function modeBadgeInfo(mode: Scenario['mode']) {
  switch (mode) {
    case 'RADAR':
      return { label: 'Radar Visual', icon: Radar, color: 'text-amber-300' };
    case 'EXECUTION':
      return { label: 'Execució R:R', icon: Target, color: 'text-emerald-300' };
    case 'MANAGEMENT':
      return {
        label: 'Gestor en Viu',
        icon: SlidersHorizontal,
        color: 'text-cyan-300',
      };
    case 'REPLAY_EXAM':
      return { label: 'Examen Replay', icon: Timer, color: 'text-violet-300' };
  }
}

export const CampaignMapScreen: React.FC = () => {
  const {
    stageProgress,
    completedLessons,
    xp,
    streak,
    soundEnabled,
    unlockAllWorlds,
    startCampaignStage,
    markLessonCompleted,
    toggleSound,
    toggleUnlockAllWorlds,
  } = useGameStore();

  const [activeLesson, setActiveLesson] = useState<MicroLesson | null>(null);
  const [pendingStageAfterLesson, setPendingStageAfterLesson] = useState<
    string | null
  >(null);

  const totalStars = useMemo(
    () => getTotalStars(stageProgress),
    [stageProgress]
  );
  const rank = useMemo(() => getPlayerRank(xp), [xp]);

  // Find next recommended uncompleted stage
  const nextRecommendedStage = useMemo(() => {
    for (const s of CAMPAIGN_SCENARIOS) {
      if (!stageProgress[s.id]?.completed) return s;
    }
    return CAMPAIGN_SCENARIOS[CAMPAIGN_SCENARIOS.length - 1];
  }, [stageProgress]);

  const handleStageClick = (scen: Scenario, worldId: number) => {
    playUiTick(soundEnabled);
    // If it's the first stage of a world and user hasn't read its masterclass pill yet, offer it!
    const isFirstOfWorld =
      scen.id.endsWith('_s1') && !completedLessons.includes(worldId);
    if (isFirstOfWorld) {
      const lesson = MICRO_LESSONS.find((l) => l.worldId === worldId);
      if (lesson) {
        setPendingStageAfterLesson(scen.id);
        setActiveLesson({ ...lesson, worldId });
        return;
      }
    }
    startCampaignStage(scen.id);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-5 max-w-2xl mx-auto w-full">
      {/* Top Dojo Header Card */}
      <section className="rounded-2xl bg-gradient-to-br from-[#0F182C] to-[#0A101D] border border-slate-800/90 p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                EdgeDojo · Nivell {rank.level}
              </span>
              {streak > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                  <Flame className="w-3 h-3 fill-amber-400" /> Ratxa {streak}
                </span>
              )}
            </div>
            <h1 className="text-lg font-extrabold text-white mt-0.5">
              {rank.title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleUnlockAllWorlds}
              title="Desbloquejar tots els mons per practicar lliurement"
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition ${
                unlockAllWorlds
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {unlockAllWorlds ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Lliure
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Guiat
                </>
              )}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              aria-label="So"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* XP & Total Stars Progress */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>{xp} XP tàctics</span>
              <span>Següent rang: {rank.nextXp} XP</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div
                style={{ width: `${rank.progressPct}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
              />
            </div>
          </div>

          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-center">
            <div className="text-sm font-extrabold text-amber-300 font-mono">
              {totalStars}/{CAMPAIGN_SCENARIOS.length * 3} ★
            </div>
            <div className="text-[9.5px] uppercase tracking-wider text-amber-200/70">
              Estrelles
            </div>
          </div>
        </div>

        {/* Quick Resume CTA */}
        <button
          type="button"
          onClick={() =>
            handleStageClick(nextRecommendedStage, nextRecommendedStage.worldId)
          }
          className="mt-3.5 w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-500/15 transition"
        >
          <span className="flex items-center gap-2 truncate">
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span className="truncate">
              Continuar: {nextRecommendedStage.title}
            </span>
          </span>
          <span className="text-[11px] font-mono bg-slate-950/20 px-2 py-0.5 rounded-md shrink-0 ml-2">
            #{nextRecommendedStage.stageNumber}/{CAMPAIGN_SCENARIOS.length}
          </span>
        </button>
      </section>

      {/* 6 Progressive Worlds */}
      <div className="space-y-4">
        {CAMPAIGN_WORLDS.map((world) => {
          const isUnlocked =
            unlockAllWorlds || totalStars >= world.unlockRequirementStars;
          const lesson = MICRO_LESSONS.find((l) => l.worldId === world.id)!;
          const lessonDone = completedLessons.includes(world.id);
          const worldScenarios = CAMPAIGN_SCENARIOS.filter(
            (s) => s.worldId === world.id
          );
          const worldStars = worldScenarios.reduce(
            (acc, s) => acc + (stageProgress[s.id]?.bestStars ?? 0),
            0
          );

          return (
            <section
              key={world.id}
              className={`rounded-2xl border p-4 transition ${
                isUnlocked
                  ? 'bg-[#0C1322] border-slate-800'
                  : 'bg-[#090E1A]/75 border-slate-900 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {world.styleFocus === 'SCALP'
                        ? '⚡ SCALP MNQ (Nasdaq-100)'
                        : world.styleFocus === 'SWING'
                          ? '🧭 SWING CRIPTO (BTC/ETH/SOL)'
                          : '🎯 Base Institucional'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {worldStars}/{worldScenarios.length * 3} ★
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">
                    {world.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {world.subtitle}
                  </p>
                </div>

                {!isUnlocked && (
                  <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    {world.unlockRequirementStars} ★
                  </div>
                )}
              </div>

              {/* Micro-Lesson Pill Button */}
              <button
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  setPendingStageAfterLesson(null);
                  setActiveLesson(lesson);
                }}
                className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    Lliçó Màster (~{lesson.readTimeSec}s): {lesson.title}
                  </span>
                </div>
                {lessonDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    +35 XP
                  </span>
                )}
              </button>

              {/* 6 Stages List */}
              <div className="mt-3 space-y-2">
                {worldScenarios.map((scen) => {
                  const prog = stageProgress[scen.id];
                  const modeMeta = modeBadgeInfo(scen.mode);
                  const ModeIcon = modeMeta.icon;

                  return (
                    <button
                      key={scen.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => handleStageClick(scen, world.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                        !isUnlocked
                          ? 'bg-slate-950/40 border-slate-900 cursor-not-allowed'
                          : prog?.completed
                            ? 'bg-slate-900/65 hover:bg-slate-800/80 border-emerald-500/30'
                            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 active:scale-[0.99]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${modeMeta.color}`}
                          >
                            <ModeIcon className="w-3 h-3" />
                            {modeMeta.label}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-[10.5px] font-mono text-slate-400">
                            {scen.timeframe}
                            {scen.htfTimeframe ? ` / ${scen.htfTimeframe}` : ''}
                          </span>
                          {scen.revealMeta?.isRealHistorical && (
                            <span className="px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 text-[9.5px] font-bold">
                              MERCAT REAL
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5 truncate">
                          {scen.title}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2.5">
                        {prog && (
                          <span
                            className={`text-[11px] font-mono font-bold ${
                              prog.bestNetR >= 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {prog.bestNetR >= 0 ? '+' : ''}
                            {prog.bestNetR}R
                          </span>
                        )}
                        <div className="flex items-center gap-0.5 text-sm">
                          {[1, 2, 3].map((s) => (
                            <span
                              key={s}
                              className={
                                (prog?.bestStars ?? 0) >= s
                                  ? 'text-amber-400'
                                  : 'text-slate-700'
                              }
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {activeLesson && (() => {
        const lessonWorld = CAMPAIGN_WORLDS.find(
          (w) => w.id === activeLesson.worldId
        );
        const lessonWorldUnlocked =
          unlockAllWorlds ||
          totalStars >= (lessonWorld?.unlockRequirementStars ?? 0);

        return (
          <LessonModal
            lesson={activeLesson}
            actionLabel={
              lessonWorldUnlocked
                ? 'Entès · Passar a l’Acció'
                : 'Entès · Tornar al Mapa'
            }
            onClose={() => {
              setActiveLesson(null);
              setPendingStageAfterLesson(null);
            }}
            onComplete={() => {
              markLessonCompleted(activeLesson.worldId);
              if (pendingStageAfterLesson && lessonWorldUnlocked) {
                startCampaignStage(pendingStageAfterLesson);
              } else if (lessonWorldUnlocked) {
                const firstStage = CAMPAIGN_SCENARIOS.find(
                  (s) =>
                    s.worldId === activeLesson.worldId &&
                    !stageProgress[s.id]?.completed
                );
                if (firstStage && firstStage.id.endsWith('_s1')) {
                  startCampaignStage(firstStage.id);
                }
              }
              setPendingStageAfterLesson(null);
            }}
          />
        );
      })()}
    </div>
  );
};
