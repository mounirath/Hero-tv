import React from 'react';
import { Tv } from 'lucide-react';

interface BannerAdProps {
  darkMode: boolean;
}

export const BannerAd: React.FC<BannerAdProps> = ({ darkMode }) => {
  return (
    <div className={`w-full py-2 px-4 flex items-center justify-center transition-colors ${
      darkMode ? 'bg-zinc-900/80 text-zinc-400' : 'bg-zinc-50 text-zinc-500'
    }`}>
      <div className={`w-full max-w-md h-12 rounded-lg border border-dashed flex items-center justify-between px-4 text-xs ${
        darkMode ? 'border-zinc-700 bg-zinc-800/40' : 'border-zinc-300 bg-white'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#059DFF]/20 text-[#059DFF]">
            Ad
          </span>
          <span className="font-medium text-xs">Hero TV Stream Pro</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#059DFF] font-medium">
          <Tv className="w-3.5 h-3.5" />
          <span>HD Streaming Ready</span>
        </div>
      </div>
    </div>
  );
};
