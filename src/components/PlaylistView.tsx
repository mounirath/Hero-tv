import React, { useState, useEffect, useMemo } from 'react';
import { Folder, Trash2, Loader2, Tv, Sparkles, RefreshCw, Download, Layers } from 'lucide-react';
import { LinkItem, ChannelItem } from '../types';
import { fetchPlaylistChannels } from '../services/m3uParser';
import { SAMPLE_PLAYLISTS } from '../services/sampleData';
import { ExportModal } from './ExportModal';

interface PlaylistViewProps {
  playlists: LinkItem[];
  selectedPlaylist: LinkItem | null;
  onSelectPlaylist: (playlist: LinkItem | null) => void;
  onDeletePlaylist: (url: string) => void;
  onAddSamplePlaylist: (item: LinkItem) => void;
  onLaunchChannel: (channel: ChannelItem, userAgent?: string | null) => void;
  darkMode: boolean;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlists,
  selectedPlaylist,
  onSelectPlaylist,
  onDeletePlaylist,
  onAddSamplePlaylist,
  onLaunchChannel,
  darkMode
}) => {
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [errorChannels, setErrorChannels] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>({});

  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportTarget, setExportTarget] = useState<{ title: string; items: ChannelItem[] } | null>(null);
  const [loadingExportForUrl, setLoadingExportForUrl] = useState<string | null>(null);

  // Asynchronously get channel count for unselected playlists
  useEffect(() => {
    playlists.forEach(async (pl) => {
      if (channelCounts[pl.url] !== undefined) return;
      try {
        const items = await fetchPlaylistChannels(pl.url, pl.userAgent);
        setChannelCounts(prev => ({ ...prev, [pl.url]: items.length }));
      } catch {
        setChannelCounts(prev => ({ ...prev, [pl.url]: 0 }));
      }
    });
  }, [playlists]);

  // Load channels whenever selectedPlaylist changes
  useEffect(() => {
    if (!selectedPlaylist) {
      setChannels([]);
      setSelectedCategory(null);
      setErrorChannels(null);
      return;
    }

    let isMounted = true;
    setLoadingChannels(true);
    setErrorChannels(null);
    setSelectedCategory(null);

    fetchPlaylistChannels(selectedPlaylist.url, selectedPlaylist.userAgent)
      .then((items) => {
        if (!isMounted) return;
        const limited = items.slice(0, 500);
        setChannels(limited);
        setLoadingChannels(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load channels:', err);
        setErrorChannels('Unable to load channels from this playlist.');
        setLoadingChannels(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPlaylist]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    channels.forEach(ch => {
      if (ch.category && ch.category.trim()) {
        set.add(ch.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [channels]);

  // Filter channels by selected category
  const filteredChannels = useMemo(() => {
    if (!selectedCategory) return channels;
    return channels.filter(ch => ch.category === selectedCategory);
  }, [channels, selectedCategory]);

  // Handler to export channels from a specific playlist item in the list
  const handleExportPlaylistCard = async (pl: LinkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingExportForUrl(pl.url);
    try {
      const items = await fetchPlaylistChannels(pl.url, pl.userAgent);
      setExportTarget({
        title: pl.title,
        items
      });
      setExportModalOpen(true);
    } catch (err) {
      alert("Impossible de charger les liens de cette playlist pour l'exportation.");
    } finally {
      setLoadingExportForUrl(null);
    }
  };

  // Handler to export the currently active selected playlist
  const handleExportSelectedPlaylist = () => {
    if (!selectedPlaylist || channels.length === 0) return;
    setExportTarget({
      title: selectedPlaylist.title,
      items: channels
    });
    setExportModalOpen(true);
  };

  // VIEW 1: Playlist List
  if (!selectedPlaylist) {
    if (playlists.length === 0) {
      return (
        <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center pt-20 pb-28 px-4 text-center">
          <Folder className="w-24 h-24 text-zinc-400/40 mb-3" />
          <h3 className={`text-base font-medium mb-2 ${
            darkMode ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            Your Playlist is empty
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-6">
            Add a playlist URL in the Add tab or load one of the verified sample IPTV lists below.
          </p>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            {SAMPLE_PLAYLISTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => onAddSamplePlaylist(sample)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-colors ${
                  darkMode
                    ? 'border-zinc-800 bg-zinc-800/60 hover:border-[#059DFF] text-zinc-200'
                    : 'border-zinc-200 bg-zinc-50 hover:border-[#059DFF] text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#059DFF]" />
                  <span className="font-medium">{sample.title}</span>
                </div>
                <span className="text-[11px] text-[#059DFF] font-semibold">Load</span>
              </button>
            ))}
          </div>

          {/* Export Modal rendered if open */}
          {exportModalOpen && exportTarget && (
            <ExportModal
              playlistTitle={exportTarget.title}
              channels={exportTarget.items}
              onClose={() => {
                setExportModalOpen(false);
                setExportTarget(null);
              }}
              onPlayChannel={(channel) => onLaunchChannel(channel)}
              darkMode={darkMode}
            />
          )}
        </div>
      );
    }

    return (
      <div className="w-full max-w-lg mx-auto pt-4 pb-28 px-4">
        {/* Header with Title and Global Count */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {playlists.length} Playlist{playlists.length > 1 ? 's' : ''} enregistrée{playlists.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          {playlists.map((pl, idx) => {
            const count = channelCounts[pl.url];
            const isExportingThis = loadingExportForUrl === pl.url;

            return (
              <div
                key={idx}
                className={`w-full rounded-2xl border border-[#059DFF] p-4 flex items-center justify-between shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  darkMode ? 'bg-zinc-800/80 hover:bg-zinc-800' : 'bg-white hover:bg-zinc-50'
                }`}
                onClick={() => onSelectPlaylist(pl)}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className={`text-sm font-semibold truncate ${
                    darkMode ? 'text-white' : 'text-zinc-900'
                  }`}>
                    {pl.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {count !== undefined
                      ? `${count} channel${count === 1 ? '' : 's'}`
                      : 'Loading channels…'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {/* Export Button on Card */}
                  <button
                    type="button"
                    disabled={isExportingThis}
                    onClick={(e) => handleExportPlaylistCard(pl, e)}
                    className="p-2 rounded-lg text-[#059DFF] hover:bg-[#059DFF]/10 transition-colors flex items-center gap-1"
                    title="Exporter les liens par catégorie"
                    aria-label="Exporter"
                  >
                    {isExportingThis ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#059DFF]" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlaylist(pl.url);
                    }}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove playlist"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Export Modal rendered if open */}
        {exportModalOpen && exportTarget && (
          <ExportModal
            playlistTitle={exportTarget.title}
            channels={exportTarget.items}
            onClose={() => {
              setExportModalOpen(false);
              setExportTarget(null);
            }}
            onPlayChannel={(channel) => onLaunchChannel(channel)}
            darkMode={darkMode}
          />
        )}
      </div>
    );
  }

  // VIEW 2: Selected Playlist Channels Grid
  return (
    <div className="w-full max-w-2xl mx-auto pt-2 pb-28 px-3">
      {/* Top Banner inside Playlist: Info + Exporter les liens action */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="min-w-0 pr-2">
          <h3 className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
            {selectedPlaylist.title}
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} • {channels.length} lien{channels.length > 1 ? 's' : ''} (chaînes, films, séries)
          </p>
        </div>

        {channels.length > 0 && !loadingChannels && (
          <button
            type="button"
            onClick={handleExportSelectedPlaylist}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#059DFF] hover:bg-[#008be6] text-white text-xs font-semibold shadow-xs transition-colors flex-shrink-0"
            title="Exporter les liens par catégorie"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter</span>
          </button>
        )}
      </div>

      {/* Category horizontal filter bar */}
      {!loadingChannels && categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'border-[#059DFF] bg-[#059DFF]/15 text-[#059DFF]'
                : darkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-[#059DFF]'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:border-[#059DFF]'
            }`}
          >
            All ({channels.length})
          </button>
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'border-[#059DFF] bg-[#059DFF]/15 text-[#059DFF]'
                  : darkMode
                    ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-[#059DFF]'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-[#059DFF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loadingChannels && (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-[#059DFF] animate-spin" />
          <p className="text-xs text-zinc-500">Fetching channels…</p>
        </div>
      )}

      {/* Error state */}
      {!loadingChannels && errorChannels && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-sm text-red-500 mb-3">{errorChannels}</p>
          <button
            onClick={() => {
              const current = selectedPlaylist;
              onSelectPlaylist(null);
              setTimeout(() => onSelectPlaylist(current), 50);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-[#059DFF] text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty channels state */}
      {!loadingChannels && !errorChannels && filteredChannels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Tv className="w-12 h-12 text-zinc-400/40 mb-2" />
          <p className="text-xs text-zinc-500">No channels found.</p>
        </div>
      )}

      {/* 3-Column Channel Grid (matches Compose 3 items per row) */}
      {!loadingChannels && !errorChannels && filteredChannels.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {filteredChannels.map((channel, idx) => {
            const firstChar = (channel.name || 'C').charAt(0).toUpperCase();
            return (
              <div
                key={idx}
                onClick={() => onLaunchChannel(channel, selectedPlaylist.userAgent)}
                className={`aspect-square rounded-xl border border-[#059DFF] p-2 flex flex-col items-center justify-between cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
                  darkMode ? 'bg-zinc-800/90 hover:bg-zinc-800' : 'bg-white hover:bg-zinc-50'
                }`}
              >
                {/* Channel Logo / Initial Avatar */}
                <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-lg">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const fallback = document.createElement('div');
                          fallback.className = 'w-full h-full flex items-center justify-center rounded-lg bg-[#059DFF]/10 text-lg font-bold text-[#059DFF]';
                          fallback.innerText = firstChar;
                          parent.appendChild(fallback);
                        }
                      }}
                      className="max-h-full max-w-full object-contain rounded-md"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-lg bg-[#059DFF]/10 text-lg font-bold text-[#059DFF]">
                      {firstChar}
                    </div>
                  )}
                </div>

                {/* Channel Name */}
                <div className="w-full mt-1.5 px-0.5">
                  <p className={`text-[11px] font-medium text-center truncate ${
                    darkMode ? 'text-zinc-200' : 'text-zinc-800'
                  }`} title={channel.name}>
                    {channel.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Export Modal rendered if open */}
      {exportModalOpen && exportTarget && (
        <ExportModal
          playlistTitle={exportTarget.title}
          channels={exportTarget.items}
          onClose={() => {
            setExportModalOpen(false);
            setExportTarget(null);
          }}
          onPlayChannel={(channel) => onLaunchChannel(channel, selectedPlaylist.userAgent)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};
