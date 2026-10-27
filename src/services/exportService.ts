import { ChannelItem } from '../types';

export type ContentKind = 'channel' | 'movie' | 'series';

export interface GroupedCategory {
  category: string;
  kind: ContentKind;
  items: ChannelItem[];
}

export interface ContentKindGroup {
  kind: ContentKind;
  label: string;
  totalItems: number;
  categories: {
    category: string;
    items: ChannelItem[];
  }[];
}

/**
 * Detect whether a stream is a live TV channel, a movie/film (VOD), or a series episode.
 */
export function detectContentKind(item: ChannelItem): ContentKind {
  const cat = (item.category || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const url = (item.url || '').toLowerCase();

  // Series indicators (Xtream /series/, S01E01 regex, keywords)
  if (
    url.includes('/series/') ||
    cat.includes('serie') ||
    cat.includes('series') ||
    cat.includes('saison') ||
    cat.includes('season') ||
    cat.includes('anime') ||
    /\bs\d{1,2}\s?e\d{1,2}\b/i.test(name) ||
    /\bep\s?\d{1,3}\b/i.test(name) ||
    /\bepisode\b/i.test(name)
  ) {
    return 'series';
  }

  // Movie indicators (Xtream /movie/, VOD, Film, Cinema, or direct video container files)
  if (
    url.includes('/movie/') ||
    cat.includes('movie') ||
    cat.includes('film') ||
    cat.includes('vod') ||
    cat.includes('cinema') ||
    cat.includes('cinéma') ||
    cat.includes('action') ||
    cat.includes('comedie') ||
    cat.includes('thriller') ||
    cat.includes('drame') ||
    url.endsWith('.mp4') ||
    url.endsWith('.mkv') ||
    url.endsWith('.avi')
  ) {
    return 'movie';
  }

  // Default to live TV channel
  return 'channel';
}

/**
 * Group channels by category string (with fallback "Sans catégorie" / "Uncategorized")
 */
export function groupByCategory(items: ChannelItem[]): Record<string, ChannelItem[]> {
  const grouped: Record<string, ChannelItem[]> = {};

  for (const item of items) {
    const cat = item.category?.trim() || 'Général / Non classé';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(item);
  }

  return grouped;
}

/**
 * Group channels hierarchically by Content Kind (Chaînes, Films, Séries) and then Category.
 */
export function groupByKindAndCategory(items: ChannelItem[]): ContentKindGroup[] {
  const kindsMap: Record<ContentKind, Record<string, ChannelItem[]>> = {
    channel: {},
    movie: {},
    series: {}
  };

  for (const item of items) {
    const kind = detectContentKind(item);
    const cat = item.category?.trim() || 'Général / Non classé';
    if (!kindsMap[kind][cat]) {
      kindsMap[kind][cat] = [];
    }
    kindsMap[kind][cat].push(item);
  }

  const kindLabels: Record<ContentKind, string> = {
    channel: 'Chaînes TV en direct (Live)',
    movie: 'Films & VOD (Movies)',
    series: 'Séries & Épisodes (Series)'
  };

  const result: ContentKindGroup[] = [];

  for (const kind of ['channel', 'movie', 'series'] as ContentKind[]) {
    const catDict = kindsMap[kind];
    const categoryKeys = Object.keys(catDict).sort();
    let totalItems = 0;
    const categories = categoryKeys.map(category => {
      const catItems = catDict[category];
      totalItems += catItems.length;
      return { category, items: catItems };
    });

    if (totalItems > 0) {
      result.push({
        kind,
        label: kindLabels[kind],
        totalItems,
        categories
      });
    }
  }

  return result;
}

/**
 * Generate standard M3U / M3U8 playlist format organized with group-title
 */
export function generateM3U(
  playlistTitle: string,
  items: ChannelItem[],
  selectedCategory?: string | null
): string {
  const filtered = selectedCategory
    ? items.filter(i => (i.category || 'Général / Non classé') === selectedCategory)
    : items;

  let output = `#EXTM3U name="${playlistTitle}"\n`;

  for (const item of filtered) {
    const group = item.category?.trim() || 'Général / Non classé';
    const logoAttr = item.logo ? ` tvg-logo="${item.logo}"` : '';
    const idAttr = item.tvgId ? ` tvg-id="${item.tvgId}"` : '';
    output += `#EXTINF:-1 group-title="${group}"${idAttr}${logoAttr},${item.name}\n${item.url}\n`;
  }

  return output;
}

/**
 * Generate structured JSON export grouped by categories and kinds
 */
export function generateJSON(
  playlistTitle: string,
  items: ChannelItem[],
  selectedCategory?: string | null
): string {
  const filtered = selectedCategory
    ? items.filter(i => (i.category || 'Général / Non classé') === selectedCategory)
    : items;

  const grouped = groupByCategory(filtered);
  const byKind = groupByKindAndCategory(filtered);

  const exportData = {
    title: playlistTitle,
    exportedAt: new Date().toISOString(),
    totalLinks: filtered.length,
    totalCategories: Object.keys(grouped).length,
    contentSummary: {
      channels: byKind.find(k => k.kind === 'channel')?.totalItems || 0,
      movies: byKind.find(k => k.kind === 'movie')?.totalItems || 0,
      series: byKind.find(k => k.kind === 'series')?.totalItems || 0,
    },
    categories: Object.entries(grouped).map(([categoryName, categoryItems]) => ({
      category: categoryName,
      count: categoryItems.length,
      links: categoryItems.map(item => ({
        name: item.name,
        url: item.url,
        kind: detectContentKind(item),
        logo: item.logo || null,
        tvgId: item.tvgId || null
      }))
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate formatted Markdown / Text export listing links by category
 */
export function generateMarkdown(
  playlistTitle: string,
  items: ChannelItem[],
  selectedCategory?: string | null
): string {
  const filtered = selectedCategory
    ? items.filter(i => (i.category || 'Général / Non classé') === selectedCategory)
    : items;

  const byKind = groupByKindAndCategory(filtered);

  let md = `# ${playlistTitle} - Export des Liens par Catégorie\n\n`;
  md += `> Exporté le : ${new Date().toLocaleString()}\n`;
  md += `> Nombre total de liens : ${filtered.length}\n\n`;

  for (const group of byKind) {
    md += `## 📺 ${group.label} (${group.totalItems})\n\n`;
    for (const cat of group.categories) {
      md += `### 📁 ${cat.category} (${cat.items.length})\n\n`;
      for (const item of cat.items) {
        md += `- **${item.name}**\n  - Lien : ${item.url}\n`;
      }
      md += `\n`;
    }
    md += `\n---\n\n`;
  }

  return md;
}

/**
 * Generate CSV export (Category, Type, Name, URL, Logo)
 */
export function generateCSV(
  items: ChannelItem[],
  selectedCategory?: string | null
): string {
  const filtered = selectedCategory
    ? items.filter(i => (i.category || 'Général / Non classé') === selectedCategory)
    : items;

  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

  let csv = 'Catégorie,Type de contenu,Nom,Lien du flux,Logo\n';

  for (const item of filtered) {
    const cat = item.category?.trim() || 'Général / Non classé';
    const kind = detectContentKind(item);
    const kindLabel = kind === 'movie' ? 'Film' : kind === 'series' ? 'Série' : 'Chaîne TV';
    csv += `${escapeCsv(cat)},${escapeCsv(kindLabel)},${escapeCsv(item.name)},${escapeCsv(item.url)},${escapeCsv(item.logo || '')}\n`;
  }

  return csv;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard API failed, trying fallback', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
