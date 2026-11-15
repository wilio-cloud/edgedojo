import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EvaluationResult, HistoryRecord } from '../engine/types';

export interface StageProgress {
  bestScore: number;
  bestStars: 0 | 1 | 2 | 3;
  bestNetR: number;
  attempts: number;
  completed: boolean;
}

export interface UserRiskSettings {
  mnqAccountMode: 'OWN_CAPITAL' | 'PROP_FIRM';
  mnqNominalCapitalUsd: number;
  mnqPropBufferUsd: number;
  mnqRiskPct: number;
  cryptoCapitalUsdt: number;
  cryptoRiskPct: number;
}

export type ActiveTab = 'CAMPAIGN' | 'GYM' | 'RISK_MASTER' | 'PASSPORT' | 'PLAYING';

interface GameState {
  activeTab: ActiveTab;
  activeScenarioId: string | null;
  gymCounter: number;
  gymStyleFilter: 'ALL' | 'SCALP' | 'SWING';
  gymModeFilter: 'MIXED' | 'EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM';

  stageProgress: Record<string, StageProgress>;
  completedLessons: number[];
  history: HistoryRecord[];
  xp: number;
  streak: number;
  bestStreak: number;
  soundEnabled: boolean;
  unlockAllWorlds: boolean;
  checklistState: Record<string, boolean>;
  riskSettings: UserRiskSettings;

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  startCampaignStage: (scenarioId: string) => void;
  startGymDrill: (
    style?: 'ALL' | 'SCALP' | 'SWING',
    mode?: 'MIXED' | 'EXECUTION' | 'MANAGEMENT' | 'REPLAY_EXAM'
  ) => void;
  nextGymDrill: () => void;
  markLessonCompleted: (worldId: number) => void;
  recordAttempt: (
    result: EvaluationResult,
    meta: { choseSkip: boolean; wasSkipOptimal: boolean }
  ) => void;
  updateRiskSettings: (partial: Partial<UserRiskSettings>) => void;
  toggleSound: () => void;
  toggleUnlockAllWorlds: () => void;
  toggleChecklistItem: (key: string) => void;
  resetChecklist: () => void;
  exportBackupJson: () => string;
  importBackupJson: (raw: string) => boolean;
  resetAllProgress: () => void;
}

export function getTotalStars(
  stageProgress: Record<string, StageProgress>
): number {
  return Object.values(stageProgress).reduce((sum, s) => sum + s.bestStars, 0);
}

export function getPlayerRank(xp: number): {
  title: string;
  level: number;
  nextXp: number;
  progressPct: number;
} {
  const tiers = [
    { min: 0, title: 'Novell del Gràfic' },
    { min: 300, title: 'Lector d’Estructura' },
    { min: 750, title: 'Caçador de Liquidesa' },
    { min: 1400, title: 'Franctirador R:R' },
    { min: 2300, title: 'Especialista MNQ & Cripto' },
    { min: 3500, title: 'Mestre Institucional EdgeDojo' },
  ];

  let idx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (xp >= tiers[i].min) idx = i;
  }

  const current = tiers[idx];
  const next = tiers[idx + 1];
  if (!next) {
    return {
      title: current.title,
      level: idx + 1,
      nextXp: current.min,
      progressPct: 100,
    };
  }
  const span = next.min - current.min;
  const pct = Math.round(((xp - current.min) / span) * 100);
  return {
    title: current.title,
    level: idx + 1,
    nextXp: next.min,
    progressPct: Math.max(0, Math.min(100, pct)),
  };
}

const DEFAULT_RISK_SETTINGS: UserRiskSettings = {
  mnqAccountMode: 'PROP_FIRM',
  mnqNominalCapitalUsd: 50000,
  mnqPropBufferUsd: 2500,
  mnqRiskPct: 5.0, // 5% of $2,500 buffer = $125 max risk per MNQ trade (~0.25% nominal)
  cryptoCapitalUsdt: 5000,
  cryptoRiskPct: 1.0, // 1% standard institutional risk = 50 USDT per Swing
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      activeTab: 'CAMPAIGN',
      activeScenarioId: null,
      gymCounter: 0,
      gymStyleFilter: 'ALL',
      gymModeFilter: 'MIXED',

      stageProgress: {},
      completedLessons: [],
      history: [],
      xp: 0,
      streak: 0,
      bestStreak: 0,
      soundEnabled: true,
      unlockAllWorlds: false,
      checklistState: {},
      riskSettings: DEFAULT_RISK_SETTINGS,

      setActiveTab: (tab) => set({ activeTab: tab }),

      startCampaignStage: (scenarioId) =>
        set({
          activeScenarioId: scenarioId,
          activeTab: 'PLAYING',
        }),

      startGymDrill: (style, mode) =>
        set((state) => ({
          gymStyleFilter: style ?? state.gymStyleFilter,
          gymModeFilter: mode ?? state.gymModeFilter,
          activeScenarioId: 'GYM_DRILL',
          activeTab: 'PLAYING',
        })),

      nextGymDrill: () =>
        set((state) => ({
          gymCounter: state.gymCounter + 1,
          activeScenarioId: 'GYM_DRILL',
          activeTab: 'PLAYING',
        })),

      markLessonCompleted: (worldId) =>
        set((state) => ({
          completedLessons: state.completedLessons.includes(worldId)
            ? state.completedLessons
            : [...state.completedLessons, worldId],
          xp: state.completedLessons.includes(worldId) ? state.xp : state.xp + 35,
        })),

      recordAttempt: (result, meta) =>
        set((state) => {
          const prev = state.stageProgress[result.scenarioId];
          const isCampaign = !result.scenarioId.startsWith('gym_');

          const updatedStageProgress = { ...state.stageProgress };
          if (isCampaign) {
            updatedStageProgress[result.scenarioId] = {
              bestScore: Math.max(prev?.bestScore ?? 0, result.totalScore),
              bestStars: Math.max(prev?.bestStars ?? 0, result.stars) as
                | 0
                | 1
                | 2
                | 3,
              bestNetR:
                prev === undefined
                  ? result.netR
                  : Math.max(prev.bestNetR, result.netR),
              attempts: (prev?.attempts ?? 0) + 1,
              completed: Boolean(prev?.completed || result.passed),
            };
          }

          const record: HistoryRecord = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
            scenarioId: result.scenarioId,
            mode: result.mode,
            style: result.style,
            choseSkip: meta.choseSkip,
            wasSkipOptimal: meta.wasSkipOptimal,
            totalScore: result.totalScore,
            stars: result.stars,
            netR: result.netR,
            breakdown: result.breakdown,
          };

          const newStreak = result.passed ? state.streak + 1 : 0;
          const xpEarned = result.passed
            ? 45 + result.stars * 25 + Math.min(newStreak * 5, 35)
            : 12;

          return {
            stageProgress: updatedStageProgress,
            history: [record, ...state.history].slice(0, 250),
            xp: state.xp + xpEarned,
            streak: newStreak,
            bestStreak: Math.max(state.bestStreak, newStreak),
          };
        }),

      updateRiskSettings: (partial) =>
        set((state) => ({
          riskSettings: { ...state.riskSettings, ...partial },
        })),

      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),

      toggleUnlockAllWorlds: () =>
        set((state) => ({ unlockAllWorlds: !state.unlockAllWorlds })),

      toggleChecklistItem: (key) =>
        set((state) => ({
          checklistState: {
            ...state.checklistState,
            [key]: !state.checklistState[key],
          },
        })),

      resetChecklist: () => set({ checklistState: {} }),

      exportBackupJson: () => {
        const s = get();
        return JSON.stringify({
          version: 2,
          exportedAt: new Date().toISOString(),
          stageProgress: s.stageProgress,
          completedLessons: s.completedLessons,
          history: s.history,
          xp: s.xp,
          streak: s.streak,
          bestStreak: s.bestStreak,
          unlockAllWorlds: s.unlockAllWorlds,
          riskSettings: s.riskSettings,
        });
      },

      importBackupJson: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || !parsed.stageProgress) {
            return false;
          }
          set({
            stageProgress: parsed.stageProgress ?? {},
            completedLessons: Array.isArray(parsed.completedLessons)
              ? parsed.completedLessons
              : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
            xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
            streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
            bestStreak:
              typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
            unlockAllWorlds: Boolean(parsed.unlockAllWorlds),
            riskSettings: parsed.riskSettings
              ? { ...DEFAULT_RISK_SETTINGS, ...parsed.riskSettings }
              : DEFAULT_RISK_SETTINGS,
          });
          return true;
        } catch {
          return false;
        }
      },

      resetAllProgress: () =>
        set({
          stageProgress: {},
          completedLessons: [],
          history: [],
          xp: 0,
          streak: 0,
          bestStreak: 0,
          checklistState: {},
        }),
    }),
    {
      name: 'edgedojo_pro_storage_v1',
      partialize: (state) => ({
        stageProgress: state.stageProgress,
        completedLessons: state.completedLessons,
        history: state.history,
        xp: state.xp,
        streak: state.streak,
        bestStreak: state.bestStreak,
        soundEnabled: state.soundEnabled,
        unlockAllWorlds: state.unlockAllWorlds,
        checklistState: state.checklistState,
        riskSettings: state.riskSettings,
        gymCounter: state.gymCounter,
        gymStyleFilter: state.gymStyleFilter,
        gymModeFilter: state.gymModeFilter,
      }),
    }
  )
);
