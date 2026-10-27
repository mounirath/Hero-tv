import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  FileSpreadsheet,
  Layers,
  Tv,
  Film,
  Clapperboard,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter
} from 'lucide-react';
import { ChannelItem } from '../types';
import {
  groupByKindAndCategory,
  groupByCategory,
  generateM3U,
  generateJSON,
  generateMarkdown,
  generateCSV,
  downloadFile,
  copyToClipboard,
  detectContentKind
} from '../services/exportService';

interface ExportModalProps {
  playlistTitle: string;
  channels: ChannelItem[];
  onClose: () => void;
  onPlayChannel?: (channel: ChannelItem) => void;
  darkMode: boolean;
}

type ExportFormat = 'm3u' | 'json' | 'text' | 'csv';

export const ExportModal: React.FC<ExportModalProps> = ({
  playlistTitle,
  channels,
  onClose,
  onPlayChannel,
  darkMode
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('m3u');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const groupedByKind = useMemo(() => groupByKindAndCategory(channels), [channels]);
  const groupedCategories = useMemo(() => groupByCategory(channels), [channels]);
  const categoryNames = useMemo(() => Object.keys(groupedCategories).sort(), [groupedCategories]);

  // Counts
  const totalChannelsCount = useMemo(
    () => groupedByKind.find(k => k.kind === 'channel')?.totalItems || 0,
    [groupedByKind]
  );
  const totalMoviesCount = useMemo(
    () => groupedByKind.find(k => k.kind === 'movie')?.totalItems || 0,
    [groupedByKind]
  );
  const totalSeriesCount = useMemo(
    () => groupedByKind.find(k => k.kind === 'series')?.totalItems || 0,
    [groupedByKind]
  );

  const filterCategoryParam = selectedCategory === 'all' ? null : selectedCategory;

  // Generate preview content string according to format
  const exportContent = useMemo(() => {
    switch (selectedFormat) {
      case 'json':
        return generateJSON(playlistTitle, channels, filterCategoryParam);
      case 'text':
        return generateMarkdown(playlistTitle, channels, filterCategoryParam);
      case 'csv':
        return generateCSV(channels, filterCategoryParam);
      case 'm3u':
      default:
        return generateM3U(playlistTitle, channels, filterCategoryParam);
    }
  }, [selectedFormat, playlistTitle, channels, filterCategoryParam]);

  const handleDownload = () => {
    const safeTitle = playlistTitle.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const catSuffix = filterCategoryParam ? `_${filterCategoryParam.replace(/[^a-z0-9_-]/gi, '_')}` : '';

    switch (selectedFormat) {
      case 'json':
        downloadFile(exportContent, `${safeTitle}${catSuffix}_categories.json`, 'application/json');
        break;
      case 'text':
        downloadFile(exportContent, `${safeTitle}${catSuffix}_categories.txt`, 'text/plain');
        break;
      case 'csv':
        downloadFile(exportContent, `${safeTitle}${catSuffix}_categories.csv`, 'text/csv');
        break;
      case 'm3u':
      default:
        downloadFile(exportContent, `${safeTitle}${catSuffix}_categories.m3u`, 'audio/x-mpegurl');
        break;
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(exportContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Preview items to show in the accordion
  const displayedCategories = useMemo(() => {
    if (filterCategoryParam) {
      return { [filterCategoryParam]: groupedCategories[filterCategoryParam] || [] };
    }
    return groupedCategories;
  }, [filterCategoryParam, groupedCategories]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[#059DFF] shadow-2xl overflow-hidden transition-all ${
          darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-[#059DFF]/5">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#059DFF]" />
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Exporter les Liens par Catégorie
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {playlistTitle} • {channels.length} éléments au total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            title="Fermer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary Badges: Channels, Movies, Series */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center ${
              darkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-[#059DFF] font-semibold mb-0.5">
                <Tv className="w-3.5 h-3.5" />
                <span>Chaînes</span>
              </div>
              <span className="text-base font-bold">{totalChannelsCount}</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center ${
              darkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold mb-0.5">
                <Film className="w-3.5 h-3.5" />
                <span>Films (VOD)</span>
              </div>
              <span className="text-base font-bold">{totalMoviesCount}</span>
            </div>

            <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center ${
              darkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex items-center gap-1.5 text-xs text-purple-500 font-semibold mb-0.5">
                <Clapperboard className="w-3.5 h-3.5" />
                <span>Séries</span>
              </div>
              <span className="text-base font-bold">{totalSeriesCount}</span>
            </div>
          </div>

          {/* Category Filter & Format Options */}
          <div className="space-y-3 pt-1">
            {/* Filter by category dropdown */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-300">
                Filtrer par Catégorie à Exporter :
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#059DFF]/30 ${
                    darkMode
                      ? 'bg-zinc-800 border-zinc-700 text-white'
                      : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                >
                  <option value="all">Toutes les catégories ({categoryNames.length} catégories, {channels.length} liens)</option>
                  {categoryNames.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      {cat} ({groupedCategories[cat].length} liens)
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Format Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-300">
                Format d'Exportation :
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('m3u')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    selectedFormat === 'm3u'
                      ? 'bg-[#059DFF] text-white border-[#059DFF] shadow-sm'
                      : darkMode
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#059DFF]'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:border-[#059DFF]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>M3U / M3U8</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('json')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    selectedFormat === 'json'
                      ? 'bg-[#059DFF] text-white border-[#059DFF] shadow-sm'
                      : darkMode
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#059DFF]'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:border-[#059DFF]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('text')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    selectedFormat === 'text'
                      ? 'bg-[#059DFF] text-white border-[#059DFF] shadow-sm'
                      : darkMode
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#059DFF]'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:border-[#059DFF]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Texte / MD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('csv')}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    selectedFormat === 'csv'
                      ? 'bg-[#059DFF] text-white border-[#059DFF] shadow-sm'
                      : darkMode
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-[#059DFF]'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:border-[#059DFF]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Preview of Categories and Links */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Aperçu des Catégories et des Liens :
              </span>
              <span className="text-[11px] text-zinc-400">
                Cliquez pour déplier et voir les URLs
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {Object.entries(displayedCategories).map(([catName, catItems], idx) => {
                const isExpanded = !!expandedCategories[catName];
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all ${
                      darkMode ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(catName)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#059DFF] flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold truncate">{catName}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#059DFF]/15 text-[#059DFF] font-medium flex-shrink-0">
                        {catItems.length} lien{catItems.length > 1 ? 's' : ''}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                        {catItems.map((item, itemIdx) => {
                          const kind = detectContentKind(item);
                          const KindIcon = kind === 'movie' ? Film : kind === 'series' ? Clapperboard : Tv;
                          const kindColor = kind === 'movie' ? 'text-amber-500' : kind === 'series' ? 'text-purple-500' : 'text-[#059DFF]';

                          return (
                            <div
                              key={itemIdx}
                              className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                                darkMode ? 'bg-zinc-900/80 text-zinc-200' : 'bg-white text-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <KindIcon className={`w-3.5 h-3.5 flex-shrink-0 ${kindColor}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate">{item.name}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono truncate" title={item.url}>
                                    {item.url}
                                  </div>
                                </div>
                              </div>

                              {onPlayChannel && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPlayChannel(item);
                                  }}
                                  className="p-1 text-[#059DFF] hover:bg-[#059DFF]/10 rounded transition-colors"
                                  title="Lire ce flux"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-500" />
                <span>Copier la liste</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 h-10 px-4 rounded-xl bg-[#059DFF] hover:bg-[#008be6] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger ({selectedFormat.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
