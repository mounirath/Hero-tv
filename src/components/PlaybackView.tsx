import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  ArrowLeft,
  Settings,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
  MoreVertical,
  Cast,
  Tv,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { AspectRatioMode } from '../types';

interface PlaybackViewProps {
  url: string;
  title: string;
  userAgent?: string | null;
  subtitleUrl?: string | null;
  subtitleLang?: string | null;
  autoPlay?: boolean;
  onClose: () => void;
}

export const PlaybackView: React.FC<PlaybackViewProps> = ({
  url,
  title,
  userAgent,
  subtitleUrl,
  subtitleLang,
  autoPlay = true,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [positionSec, setPositionSec] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Playback options (matching PlaybackActivity.kt)
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('FIT');
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');

  // Track retry attempt mode
  // 'auto' -> 'proxy' -> 'direct'
  const [playbackAttempt, setPlaybackAttempt] = useState<number>(0);
  const [forcedMode, setForcedMode] = useState<'auto' | 'proxy' | 'direct'>('auto');

  // Setup auto-hide controls after 5 seconds of inactivity
  const resetHideTimer = () => {
    setOverlayVisible(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    if (!showSettings) {
      hideTimerRef.current = window.setTimeout(() => {
        setOverlayVisible(false);
      }, 5000);
    }
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [showSettings]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSec: number): string => {
    if (isNaN(totalSec) || totalSec < 0 || !isFinite(totalSec)) return '00:00';
    const total = Math.floor(totalSec);
    const s = total % 60;
    const m = Math.floor(total / 60) % 60;
    const h = Math.floor(total / 3600);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // Convert raw stream url to appropriate format based on environment
  const resolveTargetStreamUrl = (raw: string, mode: 'auto' | 'proxy' | 'direct'): { streamUrl: string; isProxied: boolean } => {
    let clean = raw.trim();

    // If it's an Xtream live stream ending in .ts, rewrite to .m3u8 for Hls.js
    if (clean.includes('/live/') && clean.endsWith('.ts')) {
      clean = clean.replace(/\.ts$/, '.m3u8');
    }

    const isHttpsOrigin = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpStream = clean.startsWith('http://');

    // If forced to proxy OR on HTTPS and stream is HTTP, proxy through serverless function
    const shouldProxy = mode === 'proxy' || (mode === 'auto' && (isHttpsOrigin || !!userAgent));

    if (shouldProxy && !clean.startsWith('/api/proxy')) {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(clean)}${userAgent ? `&ua=${encodeURIComponent(userAgent)}` : ''}`;
      return { streamUrl: proxyUrl, isProxied: true };
    }

    return { streamUrl: clean, isProxied: false };
  };

  // Video initialization with HLS.js or native HTML5
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setErrorMessage(null);
    setErrorDetails(null);
    setIsBuffering(true);

    const { streamUrl, isProxied } = resolveTargetStreamUrl(url, forcedMode);

    console.log(`[Hero TV] Initializing playback for:`, {
      originalUrl: url,
      effectiveUrl: streamUrl,
      forcedMode,
      isProxied
    });

    const isHls =
      streamUrl.toLowerCase().includes('.m3u8') ||
      streamUrl.toLowerCase().includes('m3u8') ||
      streamUrl.includes('/live/') ||
      streamUrl.includes('output=m3u8') ||
      isProxied;

    let hlsInstance: Hls | null = null;

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 20000,
        xhrSetup: (xhr) => {
          if (userAgent && !isProxied) {
            try {
              xhr.setRequestHeader('User-Agent', userAgent);
            } catch {}
          }
        }
      });

      hlsRef.current = hlsInstance;

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(e => console.warn('Autoplay failed', e));
          });
        }
      });

      hlsInstance.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        setIsLive(data.details.live);
        if (data.details.live) {
          setDurationSec(0);
        } else {
          setDurationSec(data.details.totalduration);
        }
      });

      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        console.warn('[Hero TV] HLS event error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If failed on direct attempt, auto-retry with proxy
              if (forcedMode === 'direct') {
                console.log('[Hero TV] Direct mode failed, auto-retrying via proxy...');
                setForcedMode('proxy');
                return;
              }
              hlsInstance?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance?.recoverMediaError();
              break;
            default:
              hlsInstance?.destroy();
              setIsBuffering(false);
              setErrorMessage('Playback error. Please check your stream URL or connection.');
              setErrorDetails(
                isProxied
                  ? 'Le serveur IPTV ne répond pas ou a rejeté la requête du proxy.'
                  : 'Requête bloquée par le navigateur (CORS / Mixed Content). Essayez le proxy sécurisé.'
              );
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari iOS/macOS)
      video.src = streamUrl;
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    } else {
      // Direct video container (mp4, webm, or direct browser stream)
      video.src = streamUrl;
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setPositionSec(video.currentTime);
      if (!isLive && video.duration && isFinite(video.duration)) {
        setDurationSec(video.duration);
      }
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setErrorMessage(null);
    };
    const onError = () => {
      setIsBuffering(false);
      // If direct mode failed on video element, auto-retry with proxy
      if (forcedMode === 'auto') {
        console.log('[Hero TV] Native error, retrying via proxy...');
        setForcedMode('proxy');
        return;
      }
      setErrorMessage('Playback error. Please check your stream URL or connection.');
      setErrorDetails(
        'Le flux n’a pas pu être décodé par le navigateur. Certains serveurs IPTV requièrent un lecteur natif (VLC / MX Player).'
      );
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
    };
  }, [url, userAgent, autoPlay, forcedMode, playbackAttempt]);

  // Loop mode effect
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.loop = loopEnabled;
    }
  }, [loopEnabled]);

  // Speed effect
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = selectedSpeed;
    }
  }, [selectedSpeed]);

  // Aspect ratio modes: FIT (contain), FILL (cover/zoom), 16:9, 4:3
  const cycleAspectRatio = () => {
    const modes: AspectRatioMode[] = ['FIT', 'FILL', '16:9', '4:3'];
    const nextIndex = (modes.indexOf(aspectMode) + 1) % modes.length;
    setAspectMode(modes[nextIndex]);
    resetHideTimer();
  };

  const getVideoContainerClass = (): string => {
    switch (aspectMode) {
      case 'FILL':
        return 'w-full h-full object-cover';
      case '16:9':
        return 'aspect-video max-h-full max-w-full object-contain';
      case '4:3':
        return 'aspect-[4/3] max-h-full max-w-full object-contain';
      case 'FIT':
      default:
        return 'max-h-full max-w-full object-contain';
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetHideTimer();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      video.volume = 1;
      setVolume(1);
    }
    resetHideTimer();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || isLive) return;
    const targetTime = parseFloat(e.target.value);
    video.currentTime = targetTime;
    setPositionSec(targetTime);
    resetHideTimer();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed', e);
    }
    resetHideTimer();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenVlc = () => {
    // VLC protocol URL: vlc://http://... or direct intent on Android
    const vlcUrl = `vlc://${url.replace(/^https?:\/\//i, '')}`;
    window.location.href = vlcUrl;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        className={`${getVideoContainerClass()} transition-all duration-200`}
        crossOrigin="anonymous"
      >
        {subtitleUrl && (
          <track
            src={subtitleUrl}
            kind="subtitles"
            srcLang={subtitleLang || 'en'}
            label={(subtitleLang || 'en').toUpperCase()}
            default
          />
        )}
      </video>

      {/* Buffering Spinner */}
      {isBuffering && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-14 h-14 rounded-full border-4 border-[#059DFF]/30 border-t-[#059DFF] animate-spin" />
        </div>
      )}

      {/* Advanced In-Player Error Screen */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 px-4 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-3.5 border border-red-500/20">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h3 className="text-white text-base font-bold mb-1.5">
            Playback error. Please check your stream URL or connection.
          </h3>

          <p className="text-zinc-400 text-xs mb-5 leading-relaxed">
            {errorDetails ||
              "Ce flux n'a pas pu être chargé directement. Les navigateurs bloquent souvent les flux IPTV HTTP sur les sites HTTPS."}
          </p>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {/* Action 1: Force Secure Proxy */}
            <button
              onClick={() => {
                setErrorMessage(null);
                setForcedMode('proxy');
                setPlaybackAttempt(prev => prev + 1);
              }}
              className="w-full h-10 px-4 rounded-xl bg-[#059DFF] hover:bg-[#008be6] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Lire via le Proxy Sécurisé</span>
            </button>

            {/* Action 2: Direct Mode */}
            <button
              onClick={() => {
                setErrorMessage(null);
                setForcedMode('direct');
                setPlaybackAttempt(prev => prev + 1);
              }}
              className="w-full h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tester en Mode Direct</span>
            </button>

            {/* Action 3: Open in External VLC / Android Player */}
            <button
              onClick={handleOpenVlc}
              className="w-full h-10 px-4 rounded-xl border border-zinc-700 hover:border-[#059DFF] text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Ouvrir dans VLC (Android / PC)</span>
            </button>

            {/* Action 4: Copy link & Back */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="flex-1 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Lien copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier l’URL</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="flex-1 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] font-medium flex items-center justify-center transition-colors"
              >
                Retour à Hero TV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Controls */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-black/80 via-transparent to-black/80 transition-opacity duration-300 pointer-events-none ${
          overlayVisible && !errorMessage ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* TOP CONTROLS BAR */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-xs transition-colors"
              title="Retour"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-white text-sm font-semibold tracking-wide drop-shadow-md truncate max-w-[200px] sm:max-w-md">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Cast button */}
            <button
              onClick={() => {
                if ('presentation' in navigator) {
                  alert('Scanning for Cast displays…');
                } else {
                  alert('Cast API is ready for connected displays.');
                }
              }}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-xs transition-colors"
              title="Cast to TV"
              aria-label="Cast"
            >
              <Cast className="w-4 h-4" />
            </button>

            {/* Loop button */}
            <button
              onClick={() => {
                setLoopEnabled(!loopEnabled);
                resetHideTimer();
              }}
              className={`p-2 rounded-full backdrop-blur-xs transition-colors ${
                loopEnabled ? 'bg-[#059DFF] text-white' : 'bg-black/40 text-white/80 hover:bg-black/70'
              }`}
              title={loopEnabled ? 'Repeat On' : 'Repeat Off'}
              aria-label="Loop"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Aspect Ratio Cycler */}
            <button
              onClick={cycleAspectRatio}
              className="px-2.5 py-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-xs text-xs font-bold tracking-wider transition-colors"
              title="Aspect ratio (FIT / FILL / 16:9 / 4:3)"
            >
              {aspectMode}
            </button>
          </div>
        </div>

        {/* CENTER PLAY/PAUSE BIG BUTTON */}
        <div className="flex items-center justify-center w-full pointer-events-auto">
          <button
            onClick={togglePlay}
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white text-zinc-900 shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-9 h-9 sm:w-10 sm:h-10 fill-current text-zinc-900" />
            ) : (
              <Play className="w-9 h-9 sm:w-10 sm:h-10 fill-current text-zinc-900 ml-1" />
            )}
          </button>
        </div>

        {/* BOTTOM CONTROLS BAR */}
        <div className="flex flex-col gap-2 w-full pointer-events-auto">
          <div className="flex items-center justify-between">
            {/* Left bottom controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-md text-white hover:text-white/80 transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label="Mute"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-md text-white hover:text-white/80 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                aria-label="Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>

            {/* Right bottom controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setShowSettings(true);
                  setOverlayVisible(true);
                }}
                className="p-1.5 rounded-md text-white hover:text-white/80 transition-colors"
                title="Playback Settings"
                aria-label="Settings"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Duration / LIVE */}
              <span className="font-mono text-xs text-white/90">
                {isLive ? (
                  <span className="flex items-center gap-1.5 text-red-500 font-bold tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  formatTime(durationSec)
                )}
              </span>
            </div>
          </div>

          {/* Progress / Seek Slider */}
          <div className="w-full py-1">
            <input
              type="range"
              min={0}
              max={durationSec > 0 ? durationSec : 100}
              step={0.1}
              value={positionSec}
              disabled={isLive}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#059DFF] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* PLAYBACK SETTINGS MODAL */}
      {showSettings && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white text-zinc-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm tracking-wide text-zinc-900">
                Paramètres de lecture
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded"
              >
                Fermer
              </button>
            </div>

            {/* Speed Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">
                Vitesse
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0.5, 1.0, 1.25, 1.5, 2.0, 5.0].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => {
                      setSelectedSpeed(sp);
                      setShowSettings(false);
                    }}
                    className={`py-2 text-xs rounded-xl border font-semibold transition-all ${
                      selectedSpeed === sp
                        ? 'border-[#059DFF] bg-[#059DFF] text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {sp === 1.0 ? 'Normale' : `${sp}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Section */}
            <div className="space-y-2 pt-2 border-t">
              <label className="block text-xs font-bold text-zinc-700">
                Qualité du flux
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Auto', 'Moyenne', 'Basse'].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setSelectedQuality(q);
                      setShowSettings(false);
                    }}
                    className={`py-2 text-xs rounded-xl border font-semibold transition-all ${
                      selectedQuality === q
                        ? 'border-[#059DFF] bg-[#059DFF] text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Streaming Mode Toggle */}
            <div className="space-y-2 pt-2 border-t">
              <label className="block text-xs font-bold text-zinc-700">
                Mode de connexion
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setForcedMode('proxy');
                    setPlaybackAttempt(prev => prev + 1);
                    setShowSettings(false);
                  }}
                  className={`py-2 text-xs rounded-xl border font-semibold transition-all ${
                    forcedMode === 'proxy'
                      ? 'border-[#059DFF] bg-[#059DFF] text-white'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                  }`}
                >
                  Proxy Sécurisé (HTTPS)
                </button>
                <button
                  onClick={() => {
                    setForcedMode('direct');
                    setPlaybackAttempt(prev => prev + 1);
                    setShowSettings(false);
                  }}
                  className={`py-2 text-xs rounded-xl border font-semibold transition-all ${
                    forcedMode === 'direct'
                      ? 'border-[#059DFF] bg-[#059DFF] text-white'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                  }`}
                >
                  Direct (Non-proxifié)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
