import React, { useState, useEffect } from 'react';
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { AddStreamView } from './components/AddStreamView';
import { PlaylistView } from './components/PlaylistView';
import { PlaybackView } from './components/PlaybackView';
import { SettingsModal } from './components/SettingsModal';
import {
  loadSavedPlaylists,
  savePlaylist,
  removePlaylist,
  clearAllPlaylists,
  loadSettings,
  saveSettings
} from './services/storage';
import { LinkItem, ChannelItem, AppSettings } from './types';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [playlists, setPlaylists] = useState<LinkItem[]>(() => loadSavedPlaylists());
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [selectedPlaylist, setSelectedPlaylist] = useState<LinkItem | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Active playback state
  const [activeStream, setActiveStream] = useState<{
    url: string;
    title: string;
    userAgent?: string | null;
    subtitleUrl?: string | null;
    subtitleLang?: string | null;
    autoPlay?: boolean;
  } | null>(null);

  // Check incoming URL query params on mount (matches MainActivity parseIncomingIntent)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlParam = searchParams.get('url') || searchParams.get('video_url') || searchParams.get('stream_url');
      if (urlParam) {
        const titleParam = searchParams.get('title') || searchParams.get('name') || 'External Stream';
        const uaParam = searchParams.get('ua') || searchParams.get('user_agent');
        const subParam = searchParams.get('sub') || searchParams.get('subtitle');
        const subLangParam = searchParams.get('sublang') || searchParams.get('lang') || 'en';
        const autoPlayParam = searchParams.get('autoplay') === 'true' || settings.autoPlay;

        if (autoPlayParam) {
          setActiveStream({
            url: urlParam,
            title: titleParam,
            userAgent: uaParam,
            subtitleUrl: subParam,
            subtitleLang: subLangParam,
            autoPlay: true
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse URL params', e);
    }
  }, []);

  // Sync dark mode class on document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    const updated = saveSettings(partial);
    setSettings(updated);
  };

  const handleSavePlaylist = (item: LinkItem) => {
    const updated = savePlaylist(item);
    setPlaylists(updated);
    setSelectedPlaylist(item);
    setCurrentTab(1);
  };

  const handleDeletePlaylist = (url: string) => {
    const updated = removePlaylist(url);
    setPlaylists(updated);
    if (selectedPlaylist && selectedPlaylist.url === url) {
      setSelectedPlaylist(null);
    }
  };

  const handleClearAllPlaylists = () => {
    clearAllPlaylists();
    setPlaylists([]);
    setSelectedPlaylist(null);
  };

  const handleLaunchStream = (url: string, title: string, userAgent?: string | null) => {
    setActiveStream({
      url,
      title: title || 'Stream',
      userAgent,
      autoPlay: true
    });
  };

  const handleLaunchChannel = (channel: ChannelItem, userAgent?: string | null) => {
    setActiveStream({
      url: channel.url,
      title: channel.name,
      userAgent: userAgent || null,
      autoPlay: true
    });
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      settings.darkMode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'
    }`}>
      {/* Top App Bar */}
      <TopAppBar
        showBack={currentTab === 1 && selectedPlaylist !== null}
        onBack={() => setSelectedPlaylist(null)}
        onOpenSettings={() => setShowSettings(true)}
        darkMode={settings.darkMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col overflow-y-auto">
        {currentTab === 0 ? (
          <AddStreamView
            darkMode={settings.darkMode}
            onSavePlaylist={handleSavePlaylist}
            onLaunchStream={handleLaunchStream}
          />
        ) : (
          <PlaylistView
            playlists={playlists}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={setSelectedPlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onAddSamplePlaylist={handleSavePlaylist}
            onLaunchChannel={handleLaunchChannel}
            darkMode={settings.darkMode}
          />
        )}
      </main>

      {/* Bottom Nav Bar */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 0) {
            setSelectedPlaylist(null);
          }
        }}
        darkMode={settings.darkMode}
      />

      {/* Fullscreen Video Playback Overlay */}
      {activeStream && (
        <PlaybackView
          url={activeStream.url}
          title={activeStream.title}
          userAgent={activeStream.userAgent}
          subtitleUrl={activeStream.subtitleUrl}
          subtitleLang={activeStream.subtitleLang}
          autoPlay={activeStream.autoPlay ?? true}
          onClose={() => setActiveStream(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClearAllPlaylists={handleClearAllPlaylists}
          onClose={() => setShowSettings(false)}
          darkMode={settings.darkMode}
        />
      )}
    </div>
  );
};
