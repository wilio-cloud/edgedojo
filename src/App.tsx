import React from 'react';
import { Dumbbell, Map, Scale, ShieldCheck } from 'lucide-react';
import { useGameStore } from './store/useGameStore';
import { CampaignMapScreen } from './components/screens/CampaignMapScreen';
import { DrillGymScreen } from './components/screens/DrillGymScreen';
import { RiskMasterScreen } from './components/screens/RiskMasterScreen';
import { ReadinessPassportScreen } from './components/screens/ReadinessPassportScreen';
import { GameScreen } from './components/screens/GameScreen';
import { playUiTick } from './utils/soundHaptics';

export const App: React.FC = () => {
  const { activeTab, soundEnabled, setActiveTab } = useGameStore();

  if (activeTab === 'PLAYING') {
    return <GameScreen />;
  }

  const navItems = [
    { id: 'CAMPAIGN' as const, label: 'Campanya', icon: Map },
    { id: 'GYM' as const, label: 'Gimnàs Real', icon: Dumbbell },
    { id: 'RISK_MASTER' as const, label: 'Risc & Escalat', icon: Scale },
    { id: 'PASSPORT' as const, label: 'Passaport Pro', icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#070B12] text-slate-100 overflow-hidden">
      {/* Screen Router */}
      {activeTab === 'CAMPAIGN' && <CampaignMapScreen />}
      {activeTab === 'GYM' && <DrillGymScreen />}
      {activeTab === 'RISK_MASTER' && <RiskMasterScreen />}
      {activeTab === 'PASSPORT' && <ReadinessPassportScreen />}

      {/* Mobile-First Bottom Tab Bar */}
      <nav className="shrink-0 bg-[#0A101D]/95 backdrop-blur-md border-t border-slate-800/90 px-2.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  setActiveTab(item.id);
                }}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
                  active
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
