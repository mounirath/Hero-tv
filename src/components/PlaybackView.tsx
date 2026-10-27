import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Repeat,
  Crop,
  MoreVertical,
  Cast,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  X,
  AlertTriangle
} from 'lucide-react';
import { AspectRatioMode } from '../types';

interface PlaybackViewProps {
  url: string;
  title: string;
  userAgent?: string | null;
  subtitleUrl?: string | null;
  subtitleLang?: string | null;
  onClose: () => void;
  autoPlay?: boolean;
}

export const PlaybackView: React.FC<PlaybackViewProps> = ({
  url,
  title,
  userAgent,
  subtitleUrl,
  subtitleLang = 'en',
  onClose,
  autoPlay = true
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionSec, setPositionSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('FIT');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(1.0);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [overlayVisible, setOverlayVisible] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);

  // Setup auto-hide controls after 5 seconds of inactivity (matching PlaybackActivity.kt)
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

  // Video initialization with HLS.js or native HTML5
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setErrorMessage(null);
    setIsBuffering(true);

    const isHlsUrl = url.toLowerCase().includes('.m3u8') || url.toLowerCase().includes('m3u8');

    if (isHlsUrl && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        xhrSetup: (xhr, u) => {
          if (userAgent) {
            try {
              xhr.setRequestHeader('User-Agent', userAgent);
            } catch {
              // Browser may restrict forbidden headers
            }
          }
        }
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay with sound might be blocked, retry muted
            video.muted = true;
            setIsMuted(true);
            video.play().catch(e => console.warn('Autoplay failed', e));
          });
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        setIsLive(data.details.live);
        if (data.details.live) {
          setDurationSec(0);
        } else {
          setDurationSec(data.details.totalduration);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try proxy fallback if network or CORS failed
              if (!url.startsWith('/api/proxy') && !url.includes('allorigins')) {
                console.log('Falling back to proxy for HLS stream...');
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}${userAgent ? `&ua=${encodeURIComponent(userAgent)}` : ''}`;
                hls.loadSource(proxyUrl);
                hls.startLoad();
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setErrorMessage('Failed to play stream. The stream may be offline or restricted.');
              setIsBuffering(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = url;
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      }
    } else {
      // Standard video file (mp4, webm, etc.)
      video.src = url;
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
    const onPlaying = () => setIsBuffering(false);
    const onError = () => {
      setIsBuffering(false);
      setErrorMessage('Playback error. Please check your stream URL or connection.');
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
  }, [url, userAgent, autoPlay]);

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
        return 'w-full h-full object-contain';
    }
  };

  // Play / Pause toggle
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(e => console.warn(e));
    } else {
      video.pause();
    }
    resetHideTimer();
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setPositionSec(target);
    if (videoRef.current && isFinite(target)) {
      videoRef.current.currentTime = target;
    }
    resetHideTimer();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    resetHideTimer();
  };

  // Apply Quality Preset
  const handleApplyQuality = (choice: string) => {
    setSelectedQuality(choice);
    const hls = hlsRef.current;
    if (hls && hls.levels && hls.levels.length > 0) {
      if (choice === 'Auto') {
        hls.currentLevel = -1;
      } else if (choice === 'Medium') {
        const midIdx = Math.floor(hls.levels.length / 2);
        hls.currentLevel = midIdx;
      } else if (choice === 'Low') {
        hls.currentLevel = 0;
      }
    }
    resetHideTimer();
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

      {/* Error State Banner */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 px-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
          <h3 className="text-white text-base font-semibold mb-2">Stream Unavailable</h3>
          <p className="text-zinc-400 text-xs max-w-sm mb-6">{errorMessage}</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setErrorMessage(null);
                const video = videoRef.current;
                if (video) {
                  video.load();
                  video.play().catch(() => {});
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#059DFF] text-white text-xs font-medium"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:bg-zinc-700"
            >
              Back to Hero TV
            </button>
          </div>
        </div>
      )}

      {/* Overlay Controls */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 sm:p-6 transition-opacity duration-300 pointer-events-auto bg-gradient-to-t from-black/80 via-transparent to-black/70 ${
          overlayVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          // If clicking overlay background (not button), toggle overlay
          if (e.target === e.currentTarget) {
            setOverlayVisible(!overlayVisible);
          }
        }}
      >
        {/* TOP BAR: Back button, Stream Title, Cast/Fullscreen */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
            title="Exit Player"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h2 className="text-white text-base sm:text-lg font-semibold tracking-wide truncate max-w-md px-4 text-center">
            {title}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Browser Cast API or message
                alert("Chromecast is active on your network. Tap Cast in browser menu to send to TV.");
              }}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
              title="Cast to TV"
              aria-label="Cast"
            >
              <Cast className="w-5 h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              aria-label="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* CENTER: 88px Play / Pause Circular Button */}
        <div className="flex items-center justify-center my-auto">
          <button
            onClick={togglePlayPause}
            className="w-[88px] h-[88px] rounded-full bg-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 hover:scale-105"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-black fill-black" />
            ) : (
              <Play className="w-10 h-10 text-black fill-black ml-1" />
            )}
          </button>
        </div>

        {/* BOTTOM CONTROLS BAR */}
        <div className="w-full flex flex-col space-y-2">
          {/* Controls Top Row */}
          <div className="flex items-center justify-between text-white text-xs px-1">
            {/* Left controls */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-white/90">
                {formatTime(positionSec)}
              </span>

              {/* Loop / Repeat Toggle */}
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                className={`p-1.5 rounded-md transition-colors ${
                  loopEnabled ? 'text-[#059DFF]' : 'text-white hover:text-white/80'
                }`}
                title={loopEnabled ? "Repeat: On" : "Repeat: Off"}
                aria-label="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>

              {/* Volume toggle */}
              <button
                onClick={() => {
                  if (videoRef.current) {
                    const nextMute = !isMuted;
                    videoRef.current.muted = nextMute;
                    setIsMuted(nextMute);
                  }
                }}
                className="p-1.5 rounded-md text-white hover:text-white/80 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
                aria-label="Mute"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              {/* Aspect Ratio Mode (FIT, FILL, 16:9, 4:3) */}
              <button
                onClick={cycleAspectRatio}
                className="flex items-center gap-1 px-2 py-1 rounded bg-black/40 hover:bg-black/60 text-white text-[11px] font-medium backdrop-blur-sm transition-colors"
                title={`Aspect Ratio: ${aspectMode}`}
                aria-label="Aspect Ratio"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{aspectMode}</span>
              </button>

              {/* Playback Settings Modal Trigger */}
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

      {/* PLAYBACK SETTINGS MODAL (Matches Android PlaybackActivity.kt lines 500-600) */}
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
                Playback Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>

            {/* Speed Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">
                Speed
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0.5, 1.0, 1.25, 1.5, 2.0, 5.0].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      setSelectedSpeed(sp);
                      resetHideTimer();
                    }}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      selectedSpeed === sp
                        ? 'bg-[#059DFF] text-white border-[#059DFF]'
                        : 'bg-zinc-100 text-zinc-800 border-zinc-200 hover:border-[#059DFF]'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700">
                Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Auto', 'Medium', 'Low'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleApplyQuality(q)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      selectedQuality === q
                        ? 'bg-[#059DFF] text-white border-[#059DFF]'
                        : 'bg-zinc-100 text-zinc-800 border-zinc-200 hover:border-[#059DFF]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio section info */}
            <div className="space-y-1.5 pt-1 text-xs text-zinc-500 border-t border-zinc-100">
              <div className="flex justify-between">
                <span>Display Mode:</span>
                <span className="font-semibold text-zinc-800">{aspectMode}</span>
              </div>
              {userAgent && (
                <div className="flex justify-between truncate">
                  <span>User Agent:</span>
                  <span className="font-mono text-[10px] text-zinc-600 truncate max-w-[150px]">{userAgent}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
