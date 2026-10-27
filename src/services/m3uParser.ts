import { ChannelItem } from '../types';

export function isValidHttpUrl(urlString: string): boolean {
  if (!urlString || !urlString.trim()) return false;
  try {
    const url = new URL(urlString.trim());
    return ['http:', 'https:', 'rtsp:', 'file:', 'blob:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function isPlaylistUrl(url: string): boolean {
  if (url.startsWith('blob:') || url.startsWith('data:')) return true;
  const lower = url.toLowerCase().split('?')[0];
  return (
    lower.endsWith('.m3u') ||
    lower.endsWith('.m3u8') ||
    lower.includes('/playlist') ||
    lower.includes('/get.php') ||
    lower.includes('type=m3u')
  );
}

export function derivePlaylistName(url: string): string {
  try {
    const parsed = new URL(url);
    const titleParam = parsed.searchParams.get('title') || parsed.searchParams.get('name');
    if (titleParam) return titleParam;

    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== 'get.php') {
      return decodeURIComponent(last).replace(/\.(m3u8?|txt)$/i, '');
    }
    return parsed.hostname || 'Playlist';
  } catch {
    return 'Playlist';
  }
}

export function resolveUrl(baseUrl: string, item: string): string {
  try {
    const trimmed = item.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return item;
  }
}

export function parseM3U(text: string, baseUrl: string): ChannelItem[] {
  // Clean BOM and standardize line breaks
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/);
  const result: ChannelItem[] = [];

  let lastName: string | null = null;
  let lastCategory: string | null = null;
  let lastLogo: string | null = null;
  let lastTvgId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF')) {
      const commaIndex = line.lastIndexOf(',');
      let name = 'Channel';
      if (commaIndex >= 0 && commaIndex + 1 < line.length) {
        name = line.substring(commaIndex + 1).trim() || 'Channel';
      }
      lastName = name;

      const attrs = commaIndex > 0 ? line.substring(0, commaIndex) : line;
      const catMatch = attrs.match(/group-title=["'](.*?)["']/i);
      const logoMatch = attrs.match(/tvg-logo=["'](.*?)["']/i);
      const idMatch = attrs.match(/tvg-id=["'](.*?)["']/i);

      lastCategory = catMatch ? catMatch[1] : null;
      lastLogo = logoMatch ? logoMatch[1] : null;
      lastTvgId = idMatch ? idMatch[1] : null;
    } else if (!line.startsWith('#')) {
      // It's a stream URL
      const urlLine = resolveUrl(baseUrl, line);
      const name = lastName || `Channel ${result.length + 1}`;
      result.push({
        name,
        url: urlLine,
        category: lastCategory || 'Général',
        logo: lastLogo,
        tvgId: lastTvgId,
      });
      lastName = null;
      lastCategory = null;
      lastLogo = null;
      lastTvgId = null;
    }
  }

  return result;
}

/**
 * Robust fetcher with multiple proxy strategies specifically tuned for Vercel and CORS
 */
export async function fetchPlaylistChannels(url: string, userAgent?: string | null): Promise<ChannelItem[]> {
  // If it's a local file / blob URL, fetch directly without any proxy
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur de lecture du fichier local`);
    const text = await res.text();
    const channels = parseM3U(text, url);
    if (channels.length === 0) throw new Error('Aucune chaîne trouvée dans le fichier.');
    return channels;
  }

  const isHttps = url.toLowerCase().startsWith('https://');

  const fetchStrategies: { name: string; fn: () => Promise<string> }[] = [
    // 1. Vercel & Dev Serverless Proxy: /api/proxy
    {
      name: 'Vercel /api/proxy',
      fn: async () => {
        const params = new URLSearchParams({ url });
        if (userAgent) params.set('ua', userAgent);
        const proxyUrl = `/api/proxy?${params.toString()}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(18000) });
        if (!res.ok) throw new Error(`Vercel Proxy HTTP ${res.status}`);
        return await res.text();
      }
    },
    // 2. High-speed CorsProxy.io
    {
      name: 'CorsProxy.io',
      fn: async () => {
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`CorsProxy HTTP ${res.status}`);
        return await res.text();
      }
    },
    // 3. CodeTabs CORS Proxy
    {
      name: 'CodeTabs Proxy',
      fn: async () => {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`CodeTabs HTTP ${res.status}`);
        return await res.text();
      }
    },
    // 4. AllOrigins Proxy
    {
      name: 'AllOrigins Proxy',
      fn: async () => {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`AllOrigins HTTP ${res.status}`);
        return await res.text();
      }
    }
  ];

  // If already HTTPS, also try direct fetch as fallback
  if (isHttps) {
    fetchStrategies.unshift({
      name: 'Direct Fetch (HTTPS)',
      fn: async () => {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`Direct HTTP ${res.status}`);
        return await res.text();
      }
    });
  }

  let lastError: any = null;

  for (const strategy of fetchStrategies) {
    try {
      console.log(`[Hero TV] Attempting playlist load via ${strategy.name}...`);
      const text = await strategy.fn();
      if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF') || text.includes('http://') || text.includes('https://'))) {
        const channels = parseM3U(text, url);
        if (channels.length > 0) {
          console.log(`[Hero TV] Successfully loaded ${channels.length} channels via ${strategy.name}`);
          return channels;
        }
      }
    } catch (err: any) {
      console.warn(`[Hero TV] ${strategy.name} failed:`, err?.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Impossible de charger les chaînes depuis ce serveur IPTV.');
}
