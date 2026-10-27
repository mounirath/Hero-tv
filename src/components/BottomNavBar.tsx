import React from 'react';
import { PlusCircle, ListVideo } from 'lucide-react';
import { BannerAd } from './BannerAd';

interface BottomNavBarProps {
  currentTab: number;
  onSelectTab: (tab: number) => void;
  darkMode: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentTab,
  onSelectTab,
  darkMode
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-auto">
      {/* Banner ad shown when on tab 1 (Playlist), exactly matching Android bottomBar */}
      {currentTab === 1 && <BannerAd darkMode={darkMode} />}

      {/* Top divider */}
      <div className={`h-[1px] w-full ${
        darkMode ? 'bg-zinc-800' : 'bg-zinc-200'
      }`} />

      {/* Navigation bar container */}
      <div className={`h-[68px] w-full flex items-center justify-around px-8 transition-colors ${
        darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'
      }`}>
        {/* Tab 0: Add */}
        <button
          onClick={() => onSelectTab(0)}
          className="relative flex-1 h-full flex items-center justify-center group focus:outline-none"
          aria-label="Add Stream"
        >
          {/* Active glow circular background */}
          {currentTab === 0 && (
            <div className="absolute w-[44px] h-[44px] rounded-full bg-[#059DFF]/15 scale-100 transition-transform duration-200" />
          )}
          <PlusCircle
            className={`w-[29px] h-[29px] transition-all duration-200 ${
              currentTab === 0
                ? 'text-[#059DFF] scale-105 stroke-[2.2]'
                : darkMode
                  ? 'text-zinc-400 group-hover:text-zinc-200 stroke-[1.8]'
                  : 'text-zinc-500 group-hover:text-zinc-800 stroke-[1.8]'
            }`}
          />
        </button>

        {/* Tab 1: Playlist */}
        <button
          onClick={() => onSelectTab(1)}
          className="relative flex-1 h-full flex items-center justify-center group focus:outline-none"
          aria-label="Playlists"
        >
          {/* Active glow circular background */}
          {currentTab === 1 && (
            <div className="absolute w-[44px] h-[44px] rounded-full bg-[#059DFF]/15 scale-100 transition-transform duration-200" />
          )}
          <ListVideo
            className={`w-[29px] h-[29px] transition-all duration-200 ${
              currentTab === 1
                ? 'text-[#059DFF] scale-105 stroke-[2.2]'
                : darkMode
                  ? 'text-zinc-400 group-hover:text-zinc-200 stroke-[1.8]'
                  : 'text-zinc-500 group-hover:text-zinc-800 stroke-[1.8]'
            }`}
          />
        </button>
      </div>
    </nav>
  );
};
