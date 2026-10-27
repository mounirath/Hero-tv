import { ChannelItem } from '../types';
import { fetchPlaylistChannels } from './m3uParser';

export function cleanXtreamHost(host: string): string {
  let cleaned = host.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }
  // Remove trailing slashes and player_api.php or get.php if user entered full url
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
 * Fetch helper using local proxy fallback to avoid CORS issues
 */
async function fetchWithCorsFallback(targetUrl: string): Promise<any> {
  const attempts = [
    // 1. Direct fetch
    async () => {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
    // 2. Vite proxy
    async () => {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
      return await res.json();
    },
    // 3. Public CORS proxy
    async () => {
      const allOrigins = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(allOrigins, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`CORS proxy HTTP ${res.status}`);
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

    // If player_api returns text or unexpected format, test via m3u fetch
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

    return {
      success: false,
      message: 'Réponse inattendue du serveur Xtream.'
    };
  } catch (err: any) {
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
}

/**
 * Fetch all channels, movies, and series from Xtream Codes server
 */
export async function fetchXtreamChannels(
  host: string,
  user: string,
  pass: string
): Promise<ChannelItem[]> {
  const m3uUrl = getXtreamM3uUrl(host, user, pass);
  return await fetchPlaylistChannels(m3uUrl, 'HeroTv/1.0 (Xtream)');
}
