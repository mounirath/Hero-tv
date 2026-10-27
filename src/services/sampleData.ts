import { LinkItem } from '../types';

export const SAMPLE_PLAYLISTS: LinkItem[] = [
  {
    title: 'World News & Documentaries',
    url: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/news.m3u',
    userAgent: 'HeroTv/1.0',
    channelCount: 120
  },
  {
    title: 'Hero TV Curated Live Demo',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    userAgent: null,
    channelCount: 1
  }
];

export const SAMPLE_DIRECT_STREAMS = [
  {
    title: 'Big Buck Bunny (HLS Test Stream)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    userAgent: ''
  },
  {
    title: 'Sintel Trailer (HD)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    userAgent: ''
  },
  {
    title: 'Tears of Steel (4K Sci-Fi)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    userAgent: ''
  },
  {
    title: 'For Bigger Blazes (Action Demo)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    userAgent: ''
  }
];
