import { LinkItem, AppSettings } from '../types';

const STORAGE_PLAYLISTS_KEY = 'hero_tv_playlist_links';
const STORAGE_SETTINGS_KEY = 'hero_tv_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  enableNotifications: true,
  autoPlay: false,
};

export function loadSavedPlaylists(): LinkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function savePlaylist(item: LinkItem): LinkItem[] {
  const current = loadSavedPlaylists();
  const existingIndex = current.findIndex(p => p.url.trim() === item.url.trim());
  let updated: LinkItem[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = { ...updated[existingIndex], ...item };
  } else {
    updated = [item, ...current];
  }
  try {
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save playlist', e);
  }
  return updated;
}

export function removePlaylist(url: string): LinkItem[] {
  const current = loadSavedPlaylists();
  const updated = current.filter(p => p.url.trim() !== url.trim());
  try {
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to remove playlist', e);
  }
  return updated;
}

export function clearAllPlaylists(): void {
  try {
    localStorage.removeItem(STORAGE_PLAYLISTS_KEY);
  } catch (e) {
    console.error('Failed to clear playlists', e);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
  return updated;
}
