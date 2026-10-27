import React, { useState } from 'react';
import { PlayCircle, Edit3, Link as LinkIcon, Fingerprint, Save, Sparkles, AlertCircle } from 'lucide-react';
import { isValidHttpUrl, isPlaylistUrl, derivePlaylistName } from '../services/m3uParser';
import { SAMPLE_PLAYLISTS, SAMPLE_DIRECT_STREAMS } from '../services/sampleData';
import { LinkItem } from '../types';

interface AddStreamViewProps {
  darkMode: boolean;
  onSavePlaylist: (item: LinkItem) => void;
  onLaunchStream: (url: string, title: string, userAgent?: string | null) => void;
}

export const AddStreamView: React.FC<AddStreamViewProps> = ({
  darkMode,
  onSavePlaylist,
  onLaunchStream
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setError('Please enter a valid stream or playlist URL');
      return;
    }

    if (!isValidHttpUrl(cleanUrl)) {
      setError('Invalid URL protocol. Please use http:// or https://');
      return;
    }

    const cleanTitle = title.trim();
    const cleanUa = userAgent.trim() || null;

    if (isPlaylistUrl(cleanUrl)) {
      const plName = cleanTitle || derivePlaylistName(cleanUrl);
      const playlistItem: LinkItem = {
        title: plName,
        url: cleanUrl,
        userAgent: cleanUa
      };
      onSavePlaylist(playlistItem);
      setTitle('');
      setUrl('');
      setUserAgent('');
    } else {
      const streamTitle = cleanTitle || 'Stream';
      onLaunchStream(cleanUrl, streamTitle, cleanUa);
      setTitle('');
      setUrl('');
      setUserAgent('');
    }
  };

  const handleQuickLoad = (item: { title: string; url: string; userAgent?: string | null }) => {
    setTitle(item.title);
    setUrl(item.url);
    setUserAgent(item.userAgent || '');
    setError(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center pt-4 pb-28 px-4 text-center">
      {/* Hero Icon */}
      <div className="mt-2 mb-4">
        <PlayCircle className="w-[72px] h-[72px] text-[#059DFF] drop-shadow-sm transition-transform hover:scale-105 duration-200" />
      </div>

      {/* Hero Titles */}
      <h2 className={`text-2xl font-bold tracking-tight mb-2 ${
        darkMode ? 'text-white' : 'text-zinc-900'
      }`}>
        Welcome to Hero TV
      </h2>

      <p className={`text-sm max-w-sm mb-6 leading-relaxed ${
        darkMode ? 'text-zinc-400' : 'text-zinc-600'
      }`}>
        Thank you for choosing Hero TV. Add your video link details below to start streaming your favorite content.
      </p>

      {/* Stream Input Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${
            darkMode ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            Title
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
              <Edit3 className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Stream"
              className={`w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                darkMode
                  ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>
        </div>

        {/* Video URL Input */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${
            darkMode ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            Video URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/stream.m3u8"
              className={`w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                darkMode
                  ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>
        </div>

        {/* User Agent Input */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${
            darkMode ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            User Agent
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
              <Fingerprint className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              placeholder="Mozilla/5.0..."
              className={`w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                darkMode
                  ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>
          <p className={`mt-1.5 text-[11px] leading-normal ${
            darkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            Specify a custom user agent if required by the stream source.
          </p>
        </div>

        {/* Save Stream Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#059DFF] hover:bg-[#008be6] active:scale-[0.99] text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#059DFF]/30"
          >
            <Save className="w-4 h-4" />
            <span>Save Stream</span>
          </button>
        </div>
      </form>

      {/* Quick Test Samples */}
      <div className="w-full mt-8 pt-6 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-left">
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-[#059DFF]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Samples to Try</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_DIRECT_STREAMS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickLoad(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                darkMode
                  ? 'border-zinc-700 bg-zinc-800 hover:border-[#059DFF] text-zinc-300'
                  : 'border-zinc-200 bg-zinc-50 hover:border-[#059DFF] text-zinc-700'
              }`}
            >
              {s.title}
            </button>
          ))}
          {SAMPLE_PLAYLISTS.map((p, idx) => (
            <button
              key={`pl-${idx}`}
              type="button"
              onClick={() => handleQuickLoad(p)}
              className={`text-xs px-3 py-1.5 rounded-lg border border-[#059DFF]/40 text-[#059DFF] transition-colors ${
                darkMode
                  ? 'bg-[#059DFF]/10 hover:bg-[#059DFF]/20'
                  : 'bg-[#059DFF]/5 hover:bg-[#059DFF]/15'
              }`}
            >
              IPTV: {p.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
