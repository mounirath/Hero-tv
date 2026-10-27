import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';

interface TopAppBarProps {
  showBack: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  darkMode: boolean;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  showBack,
  onBack,
  onOpenSettings,
  darkMode
}) => {
  return (
    <header className={`h-14 px-4 flex items-center justify-between border-b transition-colors duration-200 ${
      darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
    }`}>
      <div className="w-10 flex items-center justify-start">
        {showBack && (
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
            }`}
            title="Back to playlists"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      <h1 className="text-lg font-bold tracking-wider text-center flex-1">
        HERO TV
      </h1>

      <div className="w-10 flex items-center justify-end">
        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-full transition-colors ${
            darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
          }`}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
