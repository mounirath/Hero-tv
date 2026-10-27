export type PlaylistType = 'm3u' | 'xtream' | 'stalker' | 'direct';

export interface LinkItem {
  id?: string;
  title: string;
  url: string;
  type?: PlaylistType;
  userAgent?: string | null;
  channelCount?: number;

  // Xtream Codes API metadata
  xtreamHost?: string;
  xtreamUser?: string;
  xtreamPass?: string;
  xtreamExpDate?: string | null;
  xtreamStatus?: string | null;

  // Stalker Portal (MAG) metadata
  stalkerPortal?: string;
  stalkerMac?: string;
  stalkerToken?: string | null;
}

export interface ChannelItem {
  name: string;
  url: string;
  category?: string | null;
  logo?: string | null;
  tvgId?: string | null;
  streamId?: string | number | null;
  containerExtension?: string | null;
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
