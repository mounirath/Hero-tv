import { ChannelItem } from '../types';
import { fetchPlaylistChannels } from './m3uParser';

export function cleanXtreamHost(host: string): string {
  let cleaned = host.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/(player_api\.php|get\.php|c)$/i, '');
  return cleaned;
}

export function getXtreamM3uUrl(host: string, user: string, pass: string): string {
  const base = cleanXtreamHost(host);
  const u = encodeURIComponent(user.trim());
  const p = encodeURIComponent(pass.trim());
  return `${base}/get.php?username=${u}&password=${p}&type=m3u_plus&output=m3u8`;
}

export function getXtreamApiUrl(host: string, user: string, pass: string, action?: string, extraParams?: Record<string, string>): string {
  const base = cleanXtreamHost(host);
  const params = new URLSearchParams({
    username: user.trim(),
    password: pass.trim(),
    ...(action ? { action } : {}),
    ...(extraParams || {})
  });
  return `${base}/player_api.php?${params.toString()}`;
}

export interface XtreamUserInfo {
  username: string;
  status: string;
  exp_date?: string | null;
  is_trial?: string;
  active_cons?: string;
  max_connections?: string;
  created_at?: string;
  allowed_output_formats?: string[];
}

export interface XtreamServerInfo {
  url?: string;
  port?: string;
  server_protocol?: string;
  https_port?: string;
  rtmp_port?: string;
  timezone?: string;
  time_now?: string;
}

/**
 * Fetch helper using local proxy and CORS proxy fallbacks
 */
async function fetchWithCorsFallback(targetUrl: string): Promise<any> {
  const attempts = [
    // 1. Vercel & Vite Serverless Proxy
    async () => {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`Vercel Proxy HTTP ${res.status}`);
      return await res.json();
    },
    // 2. CorsProxy.io
    async () => {
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CorsProxy HTTP ${res.status}`);
      return await res.json();
    },
    // 3. CodeTabs
    async () => {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CodeTabs HTTP ${res.status}`);
      return await res.json();
    },
    // 4. AllOrigins
    async () => {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`AllOrigins HTTP ${res.status}`);
      const text = await res.text();
      return JSON.parse(text);
    }
  ];

  let lastError = null;
  for (const fn of attempts) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Connection failed');
}

/**
 * Test Xtream Codes credentials via player_api.php
 */
export async function testXtreamLogin(
  host: string,
  user: string,
  pass: string
): Promise<{
  success: boolean;
  message?: string;
  userInfo?: XtreamUserInfo;
  serverInfo?: XtreamServerInfo;
}> {
  const apiUrl = getXtreamApiUrl(host, user, pass);
  try {
    const data = await fetchWithCorsFallback(apiUrl);
    if (data && data.user_info) {
      const auth = data.user_info.auth;
      const status = data.user_info.status;
      if (auth === 0 || status === 'Disabled' || status === 'Banned') {
        return {
          success: false,
          message: 'Identifiants invalides ou compte désactivé.'
        };
      }
      return {
        success: true,
        userInfo: data.user_info,
        serverInfo: data.server_info
      };
    }
  } catch (err: any) {
    console.warn('testXtreamLogin API check failed:', err);
  }

  // Fallback: try fetching m3u directly
  try {
    const m3uUrl = getXtreamM3uUrl(host, user, pass);
    const channels = await fetchPlaylistChannels(m3uUrl);
    if (channels.length > 0) {
      return {
        success: true,
        userInfo: {
          username: user,
          status: 'Active',
          exp_date: null
        }
      };
    }
  } catch {}

  return {
    success: false,
    message: 'Impossible de contacter le serveur Xtream. Vérifiez l’adresse Host, l’identifiant et le mot de passe.'
  };
}

/**
 * Fetch Xtream channels directly via player_api.php JSON (action=get_live_streams)
 * Extremely reliable fallback when the huge M3U file cannot be downloaded.
 */
export async function fetchXtreamViaApi(
  host: string,
  user: string,
  pass: string
): Promise<ChannelItem[]> {
  const cleanHost = cleanXtreamHost(host);

  // 1. Fetch categories
  const categoriesUrl = getXtreamApiUrl(cleanHost, user, pass, 'get_live_categories');
  const catMap: Record<string, string> = {};
  try {
    const catData = await fetchWithCorsFallback(categoriesUrl);
    if (Array.isArray(catData)) {
      catData.forEach((c: any) => {
        if (c.category_id && c.category_name) {
          catMap[c.category_id.toString()] = c.category_name;
        }
      });
    }
  } catch (e) {
    console.warn('Failed to load Xtream categories', e);
  }

  // 2. Fetch live streams
  const streamsUrl = getXtreamApiUrl(cleanHost, user, pass, 'get_live_streams');
  const streamsData = await fetchWithCorsFallback(streamsUrl);

  if (!Array.isArray(streamsData)) {
    throw new Error('Format de flux Xtream inattendu');
  }

  const u = encodeURIComponent(user.trim());
  const p = encodeURIComponent(pass.trim());

  return streamsData.map((s: any) => {
    const streamId = s.stream_id;
    const catName = (s.category_id && catMap[s.category_id.toString()]) || 'Chaînes TV';
    const streamUrl = `${cleanHost}/live/${u}/${p}/${streamId}.m3u8`;

    return {
      name: s.name || `Channel ${streamId}`,
      url: streamUrl,
      category: catName,
      logo: s.stream_icon || null,
      tvgId: s.epg_channel_id || (streamId ? streamId.toString() : null),
      streamId
    };
  });
}

/**
 * Fetch all channels from Xtream Codes server (tries M3U Plus first, then JSON API fallback)
 */
export async function fetchXtreamChannels(
  host: string,
  user: string,
  pass: string
): Promise<ChannelItem[]> {
  // Method 1: Try M3U Plus URL
  try {
    const m3uUrl = getXtreamM3uUrl(host, user, pass);
    const channels = await fetchPlaylistChannels(m3uUrl, 'HeroTv/1.0 (Xtream)');
    if (channels && channels.length > 0) {
      return channels;
    }
  } catch (err) {
    console.warn('[Hero TV] Xtream M3U Plus fetch failed, trying JSON player_api.php fallback...', err);
  }

  // Method 2: Try JSON player_api.php
  return await fetchXtreamViaApi(host, user, pass);
}
