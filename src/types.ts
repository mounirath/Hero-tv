export interface LinkItem {
  id?: string;
  title: string;
  url: string;
  userAgent?: string | null;
  channelCount?: number;
}

export interface ChannelItem {
  name: string;
  url: string;
  category?: string | null;
  logo?: string | null;
  tvgId?: string | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  activeStream: {
    url: string;
    title: string;
    userAgent?: string | null;
    subtitleUrl?: string | null;
    subtitleLang?: string | null;
  } | null;
}

export interface AppSettings {
  darkMode: boolean;
  enableNotifications: boolean;
  autoPlay: boolean;
}

export type AspectRatioMode = 'FIT' | 'FILL' | '16:9' | '4:3';
