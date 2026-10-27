import React, { useState } from 'react';
import {
  PlayCircle,
  Edit3,
  Link as LinkIcon,
  Fingerprint,
  Save,
  Sparkles,
  AlertCircle,
  Server,
  KeyRound,
  User,
  Tv,
  Upload,
  Radio,
  Loader2,
  CheckCircle2,
  Dice5
} from 'lucide-react';
import { isValidHttpUrl, isPlaylistUrl, derivePlaylistName } from '../services/m3uParser';
import { cleanXtreamHost, getXtreamM3uUrl, testXtreamLogin } from '../services/xtreamService';
import { cleanPortalUrl, formatMacAddress, generateRandomMac, isValidMac } from '../services/stalkerService';
import { SAMPLE_PLAYLISTS, SAMPLE_DIRECT_STREAMS } from '../services/sampleData';
import { LinkItem, PlaylistType } from '../types';

interface AddStreamViewProps {
  darkMode: boolean;
  onSavePlaylist: (item: LinkItem) => void;
  onLaunchStream: (url: string, title: string, userAgent?: string | null) => void;
}

export const AddStreamView: React.FC<AddStreamViewProps> = ({
  darkMode,
  onSavePlaylist,
  onLaunchStream
}) => {
  const [activeTab, setActiveTab] = useState<PlaylistType>('xtream');

  // Xtream Codes state
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');
  const [xtreamTitle, setXtreamTitle] = useState('');
  const [testingXtream, setTestingXtream] = useState(false);

  // M3U Playlist state
  const [m3uTitle, setM3uTitle] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uUserAgent, setM3uUserAgent] = useState('');

  // Stalker state
  const [stalkerPortal, setStalkerPortal] = useState('');
  const [stalkerMac, setStalkerMac] = useState('00:1A:79:');
  const [stalkerTitle, setStalkerTitle] = useState('');

  // Single Direct stream state
  const [directTitle, setDirectTitle] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [directUa, setDirectUa] = useState('');

  // Status & error messages
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Xtream Codes Submit
  const handleXtreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const host = xtreamHost.trim();
    const user = xtreamUser.trim();
    const pass = xtreamPass.trim();

    if (!host || !user || !pass) {
      setError('Veuillez renseigner le Host, le nom d’utilisateur et le mot de passe.');
      return;
    }

    setTestingXtream(true);
    const cleanedHost = cleanXtreamHost(host);
    const m3uUrl = getXtreamM3uUrl(cleanedHost, user, pass);
    const derivedTitle = xtreamTitle.trim() || `Xtream: ${user}@${new URL(cleanedHost).hostname}`;

    try {
      const loginResult = await testXtreamLogin(cleanedHost, user, pass);

      let expDateStr: string | null = null;
      if (loginResult.userInfo?.exp_date) {
        const timestamp = parseInt(loginResult.userInfo.exp_date, 10);
        if (!isNaN(timestamp) && timestamp > 0) {
          expDateStr = new Date(timestamp * 1000).toLocaleDateString();
        }
      }

      const playlistItem: LinkItem = {
        title: derivedTitle,
        url: m3uUrl,
        type: 'xtream',
        xtreamHost: cleanedHost,
        xtreamUser: user,
        xtreamPass: pass,
        xtreamExpDate: expDateStr,
        xtreamStatus: loginResult.userInfo?.status || 'Active',
        userAgent: 'HeroTv/1.0 (Xtream)'
      };

      setSuccessMsg(`Compte Xtream validé ! ${expDateStr ? `Expiration : ${expDateStr}` : ''}`);
      setTimeout(() => {
        onSavePlaylist(playlistItem);
        setXtreamHost('');
        setXtreamUser('');
        setXtreamPass('');
        setXtreamTitle('');
      }, 700);
    } catch {
      // Still allow saving even if API verification has strict CORS
      const playlistItem: LinkItem = {
        title: derivedTitle,
        url: m3uUrl,
        type: 'xtream',
        xtreamHost: cleanedHost,
        xtreamUser: user,
        xtreamPass: pass,
        userAgent: 'HeroTv/1.0 (Xtream)'
      };
      onSavePlaylist(playlistItem);
    } finally {
      setTestingXtream(false);
    }
  };

  // Handle M3U Submit
  const handleM3uSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUrl = m3uUrl.trim();
    if (!cleanUrl) {
      setError('Veuillez renseigner l’URL de la playlist M3U.');
      return;
    }

    if (!isValidHttpUrl(cleanUrl) && !cleanUrl.startsWith('blob:')) {
      setError('URL invalide. Utilisez un lien http:// ou https://');
      return;
    }

    const title = m3uTitle.trim() || derivePlaylistName(cleanUrl);
    const playlistItem: LinkItem = {
      title,
      url: cleanUrl,
      type: 'm3u',
      userAgent: m3uUserAgent.trim() || null
    };

    onSavePlaylist(playlistItem);
    setM3uTitle('');
    setM3uUrl('');
    setM3uUserAgent('');
  };

  // Handle Local M3U File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || (!content.includes('#EXTM3U') && !content.includes('#EXTINF'))) {
        setError('Le fichier sélectionné ne semble pas être une playlist M3U valide.');
        return;
      }
      const blob = new Blob([content], { type: 'audio/x-mpegurl' });
      const blobUrl = URL.createObjectURL(blob);
      const title = file.name.replace(/\.(m3u8?|txt)$/i, '');

      onSavePlaylist({
        title,
        url: blobUrl,
        type: 'm3u'
      });
    };
    reader.onerror = () => {
      setError('Erreur lors de la lecture du fichier local.');
    };
    reader.readAsText(file);
  };

  // Handle Stalker Submit
  const handleStalkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const portal = stalkerPortal.trim();
    const mac = stalkerMac.trim().toUpperCase();

    if (!portal) {
      setError('Veuillez renseigner l’URL du portail Stalker.');
      return;
    }

    if (!isValidMac(mac)) {
      setError('Adresse MAC invalide. Format attendu : 00:1A:79:XX:XX:XX');
      return;
    }

    const cleanedPortal = cleanPortalUrl(portal);
    const title = stalkerTitle.trim() || `Stalker MAG (${mac})`;

    const playlistItem: LinkItem = {
      title,
      url: `${cleanedPortal}/server/load.php`,
      type: 'stalker',
      stalkerPortal: cleanedPortal,
      stalkerMac: mac,
      userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3'
    };

    onSavePlaylist(playlistItem);
    setStalkerPortal('');
    setStalkerMac('00:1A:79:');
    setStalkerTitle('');
  };

  // Handle Direct Stream Submit
  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = directUrl.trim();
    if (!cleanUrl) {
      setError('Veuillez entrer une URL de flux valide.');
      return;
    }

    if (!isValidHttpUrl(cleanUrl)) {
      setError('URL invalide. Utilisez un protocole http:// ou https://');
      return;
    }

    if (isPlaylistUrl(cleanUrl)) {
      // Auto-route to playlist if it's an M3U
      onSavePlaylist({
        title: directTitle.trim() || derivePlaylistName(cleanUrl),
        url: cleanUrl,
        type: 'm3u',
        userAgent: directUa.trim() || null
      });
    } else {
      onLaunchStream(cleanUrl, directTitle.trim() || 'Stream', directUa.trim() || null);
    }

    setDirectTitle('');
    setDirectUrl('');
    setDirectUa('');
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center pt-2 pb-28 px-4 text-center">
      {/* Hero Icon */}
      <div className="mt-1 mb-3">
        <PlayCircle className="w-[64px] h-[64px] text-[#059DFF] drop-shadow-sm transition-transform hover:scale-105 duration-200" />
      </div>

      {/* Hero Titles */}
      <h2 className={`text-2xl font-bold tracking-tight mb-1 ${
        darkMode ? 'text-white' : 'text-zinc-900'
      }`}>
        Ajouter un Service IPTV
      </h2>

      <p className={`text-xs max-w-md mb-5 leading-relaxed ${
        darkMode ? 'text-zinc-400' : 'text-zinc-600'
      }`}>
        Connectez vos flux via Extrême IPTV (Xtream API), Playlist M3U, Portail Stalker MAG ou lien vidéo direct.
      </p>

      {/* Connection Protocol Tabs */}
      <div className="w-full grid grid-cols-4 gap-1.5 p-1 mb-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => { setActiveTab('xtream'); setError(null); }}
          className={`py-2 px-1 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition-all ${
            activeTab === 'xtream'
              ? 'bg-[#059DFF] text-white shadow-xs'
              : darkMode
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span className="truncate">Xtream</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('m3u'); setError(null); }}
          className={`py-2 px-1 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition-all ${
            activeTab === 'm3u'
              ? 'bg-[#059DFF] text-white shadow-xs'
              : darkMode
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span className="truncate">M3U</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('stalker'); setError(null); }}
          className={`py-2 px-1 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition-all ${
            activeTab === 'stalker'
              ? 'bg-[#059DFF] text-white shadow-xs'
              : darkMode
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="truncate">Stalker</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('direct'); setError(null); }}
          className={`py-2 px-1 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition-all ${
            activeTab === 'direct'
              ? 'bg-[#059DFF] text-white shadow-xs'
              : darkMode
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="truncate">Direct</span>
        </button>
      </div>

      {/* Error & Success Feedback */}
      {error && (
        <div className="w-full flex items-center gap-2 p-3 mb-4 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="w-full flex items-center gap-2 p-3 mb-4 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-left">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: XTREAM CODES API (Extrême IPTV) */}
      {activeTab === 'xtream' && (
        <form onSubmit={handleXtreamSubmit} className="w-full space-y-3.5 text-left">
          {/* Host / Server URL */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Serveur URL / Host
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <Server className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={xtreamHost}
                onChange={(e) => setXtreamHost(e.target.value)}
                placeholder="http://iptv-server.com:8080"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Nom d'utilisateur (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={xtreamUser}
                onChange={(e) => setXtreamUser(e.target.value)}
                placeholder="Identifiant ou user"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Mot de passe (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={xtreamPass}
                onChange={(e) => setXtreamPass(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Playlist Title */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Nom de la playlist (Optionnel)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Edit3 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={xtreamTitle}
                onChange={(e) => setXtreamTitle(e.target.value)}
                placeholder="Mon abonnement Xtream"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Submit Xtream Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={testingXtream}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#059DFF] hover:bg-[#008be6] active:scale-[0.99] text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#059DFF]/30"
            >
              {testingXtream ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connexion au serveur Xtream…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Connecter Xtream IPTV</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: M3U PLAYLIST (URL ou Fichier) */}
      {activeTab === 'm3u' && (
        <form onSubmit={handleM3uSubmit} className="w-full space-y-3.5 text-left">
          {/* Title */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Titre de la playlist
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <Edit3 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={m3uTitle}
                onChange={(e) => setM3uTitle(e.target.value)}
                placeholder="Ma playlist M3U"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* M3U URL */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              URL de la playlist M3U / M3U8
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={m3uUrl}
                onChange={(e) => setM3uUrl(e.target.value)}
                placeholder="https://example.com/playlist.m3u"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* User Agent */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              User Agent (Optionnel)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Fingerprint className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={m3uUserAgent}
                onChange={(e) => setM3uUserAgent(e.target.value)}
                placeholder="Ex: Mozilla/5.0... ou VLC/3.0.0"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* File Upload Option */}
          <div className="pt-1">
            <label className="block text-xs font-semibold mb-1 text-zinc-500">
              Ou importer un fichier .m3u local :
            </label>
            <label className={`flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed cursor-pointer transition-colors ${
              darkMode
                ? 'border-zinc-700 hover:border-[#059DFF] bg-zinc-800/40 text-zinc-300'
                : 'border-zinc-300 hover:border-[#059DFF] bg-zinc-50 text-zinc-600'
            }`}>
              <Upload className="w-4 h-4 text-[#059DFF]" />
              <span className="text-xs font-medium">Choisir un fichier M3U sur votre appareil</span>
              <input
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Submit M3U */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#059DFF] hover:bg-[#008be6] active:scale-[0.99] text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#059DFF]/30"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer la Playlist M3U</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: STALKER PORTAL (MAG) */}
      {activeTab === 'stalker' && (
        <form onSubmit={handleStalkerSubmit} className="w-full space-y-3.5 text-left">
          {/* Portal URL */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              URL du Portail Stalker
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <Radio className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={stalkerPortal}
                onChange={(e) => setStalkerPortal(e.target.value)}
                placeholder="http://portal.example.com/c/"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* MAC Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-semibold ${
                darkMode ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
                Adresse MAC (Format : 00:1A:79:XX:XX:XX)
              </label>
              <button
                type="button"
                onClick={() => setStalkerMac(generateRandomMac())}
                className="flex items-center gap-1 text-[11px] text-[#059DFF] hover:underline"
              >
                <Dice5 className="w-3 h-3" />
                <span>Générer</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <Fingerprint className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={stalkerMac}
                onChange={(e) => setStalkerMac(formatMacAddress(e.target.value))}
                placeholder="00:1A:79:00:00:00"
                maxLength={17}
                className={`w-full pl-10 pr-3.5 py-2.5 font-mono text-sm uppercase rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Stalker Title */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Nom du portail (Optionnel)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Edit3 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={stalkerTitle}
                onChange={(e) => setStalkerTitle(e.target.value)}
                placeholder="Mon Portail MAG"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Submit Stalker */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#059DFF] hover:bg-[#008be6] active:scale-[0.99] text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#059DFF]/30"
            >
              <Save className="w-4 h-4" />
              <span>Connecter Portail Stalker</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: FLUX DIRECT (Single Stream) */}
      {activeTab === 'direct' && (
        <form onSubmit={handleDirectSubmit} className="w-full space-y-3.5 text-left">
          {/* Title */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              Titre du flux
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <Edit3 className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={directTitle}
                onChange={(e) => setDirectTitle(e.target.value)}
                placeholder="Mon flux direct"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              URL de la vidéo / du flux
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#059DFF]">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://example.com/stream.m3u8"
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* User Agent */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${
              darkMode ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              User Agent (Optionnel)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Fingerprint className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={directUa}
                onChange={(e) => setDirectUa(e.target.value)}
                placeholder="Mozilla/5.0..."
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#059DFF]/20 focus:border-[#059DFF] ${
                  darkMode
                    ? 'bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Submit Direct Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#059DFF] hover:bg-[#008be6] active:scale-[0.99] text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#059DFF]/30"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Lancer la lecture</span>
            </button>
          </div>
        </form>
      )}

      {/* Quick Test Samples */}
      <div className="w-full mt-7 pt-5 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-left">
        <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-[#059DFF]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Exemples de flux de test</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_DIRECT_STREAMS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveTab('direct');
                setDirectTitle(s.title);
                setDirectUrl(s.url);
                setDirectUa(s.userAgent || '');
                setError(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                darkMode
                  ? 'border-zinc-700 bg-zinc-800 hover:border-[#059DFF] text-zinc-300'
                  : 'border-zinc-200 bg-zinc-50 hover:border-[#059DFF] text-zinc-700'
              }`}
            >
              {s.title}
            </button>
          ))}
          {SAMPLE_PLAYLISTS.map((p, idx) => (
            <button
              key={`pl-${idx}`}
              type="button"
              onClick={() => {
                setActiveTab('m3u');
                setM3uTitle(p.title);
                setM3uUrl(p.url);
                setM3uUserAgent(p.userAgent || '');
                setError(null);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border border-[#059DFF]/40 text-[#059DFF] transition-colors ${
                darkMode
                  ? 'bg-[#059DFF]/10 hover:bg-[#059DFF]/20'
                  : 'bg-[#059DFF]/5 hover:bg-[#059DFF]/15'
              }`}
            >
              IPTV: {p.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
