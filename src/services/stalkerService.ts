import { ChannelItem } from '../types';

export function cleanPortalUrl(portalUrl: string): string {
  let cleaned = portalUrl.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }
  // Strip trailing slashes and load.php / c
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function formatMacAddress(mac: string): string {
  // Strip non-hex characters
  const clean = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  const chunks = clean.match(/.{1,2}/g) || [];
  return chunks.slice(0, 6).join(':');
}

export function generateRandomMac(): string {
  // Standard MAG 250/254 prefix is 00:1A:79
  const prefix = '00:1A:79';
  const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  return `${prefix}:${randomHex()}:${randomHex()}:${randomHex()}`;
}

export function isValidMac(mac: string): boolean {
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
}

/**
 * Perform Stalker handshake to get temporary token
 */
export async function stalkerHandshake(portalUrl: string, mac: string): Promise<string | null> {
  const base = cleanPortalUrl(portalUrl);
  const endpoint = base.endsWith('/server/load.php') ? base : `${base}/server/load.php`;
  const url = `${endpoint}?type=stb&action=handshake&token=&mac=${encodeURIComponent(mac)}`;

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&ua=Mozilla/5.0%20(QtEmbedded;%20U;%20Linux;%20C)%20AppleWebKit/533.3%20(KHTML,%20like%20Gecko)%20MAG200%20stbapp%20ver:%202%20rev:%20250%20Safari/533.3`;

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.js?.token || null;
  } catch {
    return null;
  }
}

/**
 * Fetch channels from Stalker portal
 */
export async function fetchStalkerChannels(portalUrl: string, mac: string): Promise<ChannelItem[]> {
  const base = cleanPortalUrl(portalUrl);
  const endpoint = base.endsWith('/server/load.php') ? base : `${base}/server/load.php`;

  // First perform handshake
  const token = await stalkerHandshake(portalUrl, mac) || '';

  const channelsUrl = `${endpoint}?type=itv&action=get_all_channels&mac=${encodeURIComponent(mac)}&token=${token}`;
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(channelsUrl)}`;

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const rawList = data?.js?.data || data?.js || [];
    if (!Array.isArray(rawList)) {
      throw new Error('Format de chaînes Stalker inattendu');
    }

    return rawList.map((ch: any) => ({
      name: ch.name || ch.title || 'Channel',
      url: ch.cmd || `${endpoint}?type=itv&action=create_link&cmd=${encodeURIComponent(ch.cmd || '')}&mac=${encodeURIComponent(mac)}&token=${token}`,
      category: ch.genre_id || 'Stalker TV',
      logo: ch.logo ? (ch.logo.startsWith('http') ? ch.logo : `${base}/${ch.logo}`) : null,
      tvgId: ch.id?.toString() || null
    }));
  } catch (err) {
    console.warn('Failed Stalker direct fetch', err);
    throw err;
  }
}
