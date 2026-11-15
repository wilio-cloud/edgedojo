import React from 'react';
import { Dumbbell, Map, Radio, Scale, ShieldCheck } from 'lucide-react';
import { useGameStore } from './store/useGameStore';
import { CampaignMapScreen } from './components/screens/CampaignMapScreen';
import { DrillGymScreen } from './components/screens/DrillGymScreen';
import { CryptoRadarScreen } from './components/screens/CryptoRadarScreen';
import { RiskMasterScreen } from './components/screens/RiskMasterScreen';
import { ReadinessPassportScreen } from './components/screens/ReadinessPassportScreen';
import { GameScreen } from './components/screens/GameScreen';
import { TopBrandBar } from './components/common/BrandShell';
import { playUiTick } from './utils/soundHaptics';

export const App: React.FC = () => {
  const { activeTab, soundEnabled, setActiveTab } = useGameStore();

  if (activeTab === 'PLAYING') {
    return <GameScreen />;
  }

  const navItems = [
    { id: 'CAMPAIGN' as const, label: 'Campanya', icon: Map },
    { id: 'GYM' as const, label: 'Gimnàs', icon: Dumbbell },
    { id: 'CRYPTO_RADAR' as const, label: 'Radar Live', icon: Radio },
    { id: 'RISK_MASTER' as const, label: 'Risc %', icon: Scale },
    { id: 'PASSPORT' as const, label: 'Passaport', icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#070B12] text-slate-100 overflow-hidden">
      {/* Persistent Brand Bar on Menu Screens */}
      <TopBrandBar />

      {/* Screen Router */}
      {activeTab === 'CAMPAIGN' && <CampaignMapScreen />}
      {activeTab === 'GYM' && <DrillGymScreen />}
      {activeTab === 'CRYPTO_RADAR' && <CryptoRadarScreen />}
      {activeTab === 'RISK_MASTER' && <RiskMasterScreen />}
      {activeTab === 'PASSPORT' && <ReadinessPassportScreen />}

      {/* Mobile-First Bottom Tab Bar (5 Compact Items) */}
      <nav className="shrink-0 bg-[#0A101D]/95 backdrop-blur-md border-t border-slate-800/90 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const isRadar = item.id === 'CRYPTO_RADAR';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playUiTick(soundEnabled);
                  setActiveTab(item.id);
                }}
                className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition relative ${
                  active
                    ? isRadar
                      ? 'text-cyan-300 bg-cyan-500/15'
                      : 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[9.5px] font-bold tracking-tight truncate max-w-full">
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
