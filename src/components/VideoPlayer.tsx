import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Hls from 'hls.js';
import { Maximize, Minimize, Pause, Play, Volume2, Volume1, VolumeX, AlertTriangle, Crown } from 'lucide-react';
import type { ChannelSource } from '../types';

interface Props {
  src: string;
  poster?: string;
  premiumLocked?: boolean;
  streamError?: string;
  sources?: ChannelSource[];
  selectedSourceId?: string;
  onChangeSource?: (id: string) => void;
  onError?: (msg: string) => void;
  adOverlay?: React.ReactNode;
  channelName?: string;
  channelLogo?: string;
}

export default function VideoPlayer({ src, poster, premiumLocked, streamError, sources = [], selectedSourceId, onChangeSource, onError, adOverlay, channelName, channelLogo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // désactivé — la plupart des CDN IPTV ne supportent pas LL-HLS
        // ── Fast startup: buffer just enough to start playing quickly ──
        maxBufferLength: 10,            // start playback after ~10s of buffer
        maxMaxBufferLength: 30,         // don't over-buffer (was 60)
        maxBufferSize: 30 * 1024 * 1024,  // 30 MB cap
        maxBufferHole: 0.5,
        // ── Faster ABR switching ──
        abrEwmaDefaultEstimate: 2_000_000,  // assume 2 Mbps initially
        startLevel: -1,                     // auto-pick quality from bandwidth estimate
        // ── Retry: fail fast on 403 (expired segment hash) so manifest reloads quickly ──
        fragLoadingMaxRetry: 1,        // 1 retry only — expired hashes won't heal with more retries
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 4000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 15000,
        levelLoadingMaxRetry: 3,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 10000,
        // ── Back-buffer: free memory for already-played segments ──
        backBufferLength: 30,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));

      let recoveryAttempts = 0;
      let manifestReloads = 0;
      const MAX_RECOVERY = 5;
      const MAX_MANIFEST_RELOADS = 8;

      hls.on(Hls.Events.ERROR, (_event: string, data: any) => {
        // ── Handle expired segment hash (403, even if non-fatal) ──
        // CDN IPTV segment URLs use short-lived tokens (~30s). Retrying the same
        // expired URL is pointless — reload the manifest to get fresh CDN tokens.
        if (
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
           data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR) &&
          (data.response?.code === 403 || data.response?.status === 403)
        ) {
          if (manifestReloads < MAX_MANIFEST_RELOADS) {
            manifestReloads++;
            console.warn(`[HLS] 403 sur segment — rechargement manifest (${manifestReloads}/${MAX_MANIFEST_RELOADS})`);
            hls!.stopLoad();
            setTimeout(() => { if (hls) hls.loadSource(src); }, 500);
          }
          return; // don't propagate to fatal handler
        }

        if (!data.fatal) return;

        // Attempt automatic recovery before reporting an error
        if (recoveryAttempts < MAX_RECOVERY) {
          recoveryAttempts++;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if ((data.response?.code === 403 || data.response?.status === 403) && manifestReloads < MAX_MANIFEST_RELOADS) {
              manifestReloads++;
              console.warn(`[HLS] Fatal 403 — rechargement manifest (${manifestReloads}/${MAX_MANIFEST_RELOADS})`);
              setTimeout(() => { if (hls) hls.loadSource(src); }, 800);
              return;
            }
            console.warn(`[HLS] Network error recovery attempt ${recoveryAttempts}/${MAX_RECOVERY}`);
            hls!.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn(`[HLS] Media error recovery attempt ${recoveryAttempts}/${MAX_RECOVERY}`);
            hls!.recoverMediaError();
            return;
          }
        }

        let msg = 'Impossible de lire la chaîne';
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const status = (data.response as any)?.code;
          if (status === 403) msg = 'Accès refusé au flux (403)';
          else if (status === 404) msg = 'Flux introuvable (404)';
          else msg = 'Erreur réseau — vérifiez votre connexion';
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          msg = 'Erreur de décodage — essayez une autre source';
        }
        onError?.(msg);
      });

      // Reset recovery counter on successful load
      hls.on(Hls.Events.FRAG_LOADED, () => { recoveryAttempts = 0; manifestReloads = 0; });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => {
    const handleFSChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  // ── Media Session API: show channel info on device OS media controls ──
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const artwork: MediaImage[] = channelLogo
      ? [
          { src: channelLogo, sizes: '96x96',  type: 'image/png' },
          { src: channelLogo, sizes: '128x128', type: 'image/png' },
          { src: channelLogo, sizes: '256x256', type: 'image/png' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  channelName ?? 'Chaîne en direct',
      artist: 'Xonaris',
      album:  'TV en direct',
      artwork,
    });

    navigator.mediaSession.setActionHandler('play', () => {
      videoRef.current?.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      videoRef.current?.pause();
    });

    return () => {
      navigator.mediaSession.setActionHandler('play',  null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  }, [channelName, channelLogo]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && volume === 0) {
      setVolume(1);
      v.volume = 1;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const newVolume = parseFloat(e.target.value);
    v.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      v.muted = true;
      setMuted(true);
    } else if (v.muted) {
      v.muted = false;
      setMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const v = videoRef.current;
      if (!v) return;

      switch (e.key) {
        case ' ': // Spacebar
        case 'k':
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          break;
        case 'm': // Mute
          e.preventDefault();
          v.muted = !v.muted;
          setMuted(v.muted);
          if (!v.muted && v.volume === 0) {
            v.volume = 1;
            setVolume(1);
          }
          break;
        case 'f': // Fullscreen
          e.preventDefault();
          if (!containerRef.current) return;
          if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
        case 'ArrowUp': // Volume Up
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.min(1, prev + 0.05);
            v.volume = nextVol;
            if (nextVol > 0 && v.muted) {
              v.muted = false;
              setMuted(false);
            }
            return nextVol;
          });
          break;
        case 'ArrowDown': // Volume Down
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.max(0, prev - 0.05);
            v.volume = nextVol;
            if (nextVol === 0) {
              v.muted = true;
              setMuted(true);
            }
            return nextVol;
          });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isErrorOrPremium = premiumLocked || !!streamError;
  const hasAdOverlay = !!adOverlay;

  const handleMouseMove = () => {
    if (isErrorOrPremium || hasAdOverlay) return; // Keep controls visible
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  };

  useEffect(() => {
    if (isErrorOrPremium) setShowControls(true);
  }, [isErrorOrPremium]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden group ring-1 ring-white/5 shadow-2xl ${
        fullscreen ? 'rounded-none h-screen w-screen bg-black flex flex-col items-center justify-center' : 'bg-[#050505] rounded-none sm:rounded-xl aspect-video'
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => !hasAdOverlay && setShowControls(false)}
      onDoubleClick={!premiumLocked && !streamError && !hasAdOverlay ? toggleFullscreen : undefined}
    >
      {/* Ad overlay — rendered inside the fullscreen container so it shows in fullscreen too */}
      {adOverlay}
      {premiumLocked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-950/90 backdrop-blur-md z-20 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-amber-500/20 shadow-lg">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-black text-white mb-2 sm:mb-3">Chaîne Premium</h3>
          <p className="text-xs sm:text-base text-navy-300 text-center mb-6 sm:mb-8 max-w-sm">
            Cette source est réservée aux abonnés Premium. Passez Premium pour accéder à ce contenu en haute qualité.
          </p>
          <Link to="/premium" className="btn-primary shadow-lg border border-amber-500/30 text-xs sm:text-base px-4 py-2 sm:px-6 sm:py-3 inline-flex items-center gap-2">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            Devenir Premium
          </Link>
        </div>
      ) : streamError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-950/90 backdrop-blur-md z-20 px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-red-500/20 shadow-lg">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-black text-white mb-2 sm:mb-3">Erreur de lecture</h3>
          <p className="text-xs sm:text-base text-navy-300 text-center max-w-sm">
            {streamError}
          </p>
        </div>
      ) : (
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          onClick={togglePlay}
        />
      )}

      {/* Play button overlay when paused — hidden during ad */}
      {!playing && !premiumLocked && !streamError && !hasAdOverlay && (
        <button
          className="absolute inset-0 flex items-center justify-center cursor-pointer group bg-black/50 transition-all duration-300 z-10"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-90 group-hover:scale-100 group-hover:bg-brand-400 transition-all duration-300">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1.5 sm:ml-2 fill-current" />
          </div>
        </button>
      )}

      {/* Xonaris branding watermark — always visible during playback */}
      <div className={`absolute z-[15] pointer-events-none transition-all duration-300 ${
        fullscreen
          ? 'bottom-16 right-6 sm:bottom-20 sm:right-8'
          : 'bottom-2 right-2 sm:bottom-3 sm:right-4'
      }`}>
        <img
          src="/branding/xonaris-full-no-bg-white.png"
          alt=""
          className={`object-contain opacity-40 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] ${
            fullscreen ? 'h-7 sm:h-9' : 'h-5 sm:h-6'
          }`}
        />
      </div>

      {/* Controls Overlay — hidden during ad */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-500 ease-out pointer-events-none z-30 ${
          showControls && !hasAdOverlay ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

        {/* Channel name & logo — top-left, visible with controls */}
        {(channelName || channelLogo) && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2 z-40 pointer-events-none">
            {channelLogo && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-black/50 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10 p-1.5 shrink-0">
                <img src={channelLogo} alt="" className="w-full h-full object-contain" />
              </div>
            )}
            {channelName && (
              <span className="text-white font-bold text-xs sm:text-sm drop-shadow-lg bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 line-clamp-1 max-w-[180px] sm:max-w-[260px]">{channelName}</span>
            )}
          </div>
        )}

        {/* Bottom Controls */}
        {!isErrorOrPremium && (
          <div className="px-4 sm:px-6 pb-3 sm:pb-6 pt-6 sm:pt-12 relative z-40 pointer-events-auto flex flex-col gap-2 sm:gap-3">
            {/* Fake progress bar / Live indicator line */}
            <div className="w-full h-1 bg-white/20 rounded-full flex items-center cursor-pointer group/progress relative">
               <div className="h-full bg-brand-500 w-full" />
               <div className="absolute right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-brand-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            </div>

            <div className="flex items-center justify-between mt-1 sm:mt-2">
              <div className="flex items-center gap-3 sm:gap-6">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-brand-400 transition-colors drop-shadow-md p-1"
                >
                  {playing ? <Pause className="w-5 h-5 sm:w-7 sm:h-7 fill-current" /> : <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />}
                </button>
                
                <div className="flex items-center gap-2 sm:gap-3 group/volume relative">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-brand-400 transition-colors drop-shadow-md p-1"
                  >
                    {muted || volume === 0 ? <VolumeX className="w-5 h-5 sm:w-7 sm:h-7" /> : volume < 0.5 ? <Volume1 className="w-5 h-5 sm:w-7 sm:h-7" /> : <Volume2 className="w-5 h-5 sm:w-7 sm:h-7" />}
                  </button>
                  <div className="w-0 overflow-hidden group-hover/volume:w-16 sm:group-hover/volume:w-24 transition-all duration-300 ease-in-out flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-14 sm:w-20 h-1.5 accent-brand-500 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 sm:[&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3 sm:[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    />
                  </div>
                </div>


              </div>
              
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-brand-400 transition-colors drop-shadow-md p-1"
              >
                {fullscreen ? <Minimize className="w-5 h-5 sm:w-7 sm:h-7" /> : <Maximize className="w-5 h-5 sm:w-7 sm:h-7" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
