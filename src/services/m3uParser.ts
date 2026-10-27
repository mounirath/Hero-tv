import { ChannelItem } from '../types';

export function isValidHttpUrl(urlString: string): boolean {
  if (!urlString || !urlString.trim()) return false;
  try {
    const url = new URL(urlString.trim());
    return ['http:', 'https:', 'rtsp:', 'file:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function isPlaylistUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return lower.endsWith('.m3u') || lower.endsWith('.m3u8') || lower.includes('/playlist') || lower.includes('/get.php');
}

export function derivePlaylistName(url: string): string {
  try {
    const parsed = new URL(url);
    const titleParam = parsed.searchParams.get('title') || parsed.searchParams.get('name');
    if (titleParam) return titleParam;

    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
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
  const lines = text.split(/\r?\n/);
  const result: ChannelItem[] = [];
  let lastName: string | null = null;
  let lastCategory: string | null = null;
  let lastLogo: string | null = null;
  let lastTvgId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (line.startsWith('#EXTINF')) {
      const commaIndex = line.indexOf(',');
      let name = 'Channel';
      if (commaIndex >= 0 && commaIndex + 1 < line.length) {
        name = line.substring(commaIndex + 1).trim() || 'Channel';
      }
      lastName = name;

      if (commaIndex > 0) {
        const attrs = line.substring(0, commaIndex);
        const catMatch = attrs.match(/group-title=["'](.*?)["']/i);
        const logoMatch = attrs.match(/tvg-logo=["'](.*?)["']/i);
        const idMatch = attrs.match(/tvg-id=["'](.*?)["']/i);

        lastCategory = catMatch ? catMatch[1] : null;
        lastLogo = logoMatch ? logoMatch[1] : null;
        lastTvgId = idMatch ? idMatch[1] : null;
      } else {
        lastCategory = null;
        lastLogo = null;
        lastTvgId = null;
      }
    } else if (line.length > 0 && !line.startsWith('#')) {
      const urlLine = resolveUrl(baseUrl, line);
      const name = lastName || 'Channel';
      result.push({
        name,
        url: urlLine,
        category: lastCategory,
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

export async function fetchPlaylistChannels(url: string, userAgent?: string | null): Promise<ChannelItem[]> {
  const fetchStrategies = [
    // 1. Direct fetch (fastest if CORS allowed or same origin)
    async () => {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    },
    // 2. Vite dev proxy if user-agent requested or CORS issues
    async () => {
      const params = new URLSearchParams({ url });
      if (userAgent) params.set('ua', userAgent);
      const proxyUrl = `/api/proxy?${params.toString()}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      return await res.text();
    },
    // 3. Public CORS proxy fallback
    async () => {
      const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(allOriginsUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CORS proxy HTTP ${res.status}`);
      return await res.text();
    }
  ];

  let lastError: any = null;
  for (const strategy of fetchStrategies) {
    try {
      const text = await strategy();
      if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF') || text.includes('http'))) {
        const channels = parseM3U(text, url);
        if (channels.length > 0) {
          return channels;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to load playlist channels');
}
