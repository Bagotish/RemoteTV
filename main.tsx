import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { TVRemoteOverlay, RemoteCommand } from './TVRemoteOverlay';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type MediaType = 'youtube' | 'video' | 'audio' | 'webpage';

interface ActiveMedia {
  type: MediaType;
  source: string;
  url: string;
  title: string;
}

// Sample presets for quick testing
const QUICK_SAMPLES = [
  {
    label: 'Sample YouTube',
    url: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio'
  }
];

const MEDIA_CATALOG: any[] = [
];


function parseMediaUrl(raw: string): ActiveMedia | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      source: ytMatch[1],
      url: ytMatch[1],
      title: 'YouTube Video'
    };
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      type: 'youtube',
      source: trimmed,
      url: trimmed,
      title: 'YouTube Video'
    };
  }

  if (/\.(mp3|wav|ogg|aac|m4a)($|\?)/i.test(trimmed)) {
    return {
      type: 'audio',
      source: trimmed,
      url: trimmed,
      title: 'Audio Stream'
    };
  }

  if (/\.(mp4|webm|m3u8|ogv|mov)($|\?)/i.test(trimmed)) {
    return {
      type: 'video',
      source: trimmed,
      url: trimmed,
      title: 'Direct Video Stream'
    };
  }

  return {
    type: 'webpage',
    source: trimmed,
    url: trimmed,
    title: 'Web Stream Page'
  };
}

function App() {
  const [currentMedia, setCurrentMedia] = useState<ActiveMedia | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // References for Player engines
  const ytPlayerRef = useRef<any>(null);
  const html5VideoRef = useRef<HTMLVideoElement | null>(null);
  const html5AudioRef = useRef<HTMLAudioElement | null>(null);
  const [ytReady, setYtReady] = useState(false);

  // Filter items based on active category
  const handlePlaySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const media = parseMediaUrl(urlInput);
    if (!media) return;
    setCurrentMedia(media);
  };

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        setYtReady(true);
      };
      document.body.appendChild(tag);
    } else {
      setYtReady(true);
    }
  }, []);

  // Initialize or re-create YouTube player when currentMedia changes
  useEffect(() => {
    if (currentMedia?.type === 'youtube' && ytReady) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }

      ytPlayerRef.current = new window.YT.Player('yt-player-container', {
        height: '100%',
        width: '100%',
        videoId: currentMedia.url,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            if (isMuted) event.target.mute();
            event.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event: any) => {
            if (event.data === 1) setIsPlaying(true); // Playing
            if (event.data === 2) setIsPlaying(false); // Paused
          }
        }
      });
    }
  }, [currentMedia, ytReady]);

  // Sync Volume to HTML5 Audio/Video and YouTube
  useEffect(() => {
    if (html5VideoRef.current) {
      html5VideoRef.current.volume = volume / 100;
      html5VideoRef.current.muted = isMuted;
    }
    if (html5AudioRef.current) {
      html5AudioRef.current.volume = volume / 100;
      html5AudioRef.current.muted = isMuted;
    }
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      try {
        ytPlayerRef.current.setVolume(volume);
        if (isMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch (e) {
        // player might not be ready yet
      }
    }
  }, [volume, isMuted]);

  // Volume HUD auto-hide timer
  useEffect(() => {
    let timer: any;
    if (showVolumeHud) {
      timer = setTimeout(() => setShowVolumeHud(false), 1400);
    }
    return () => clearTimeout(timer);
  }, [showVolumeHud, volume, isMuted]);

  // Handle Play/Pause toggling
  const togglePlayPause = () => {
    if (!currentMedia) return;

    if (currentMedia.type === 'youtube' && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch (e) {
        // ignore
      }
    } else if (currentMedia.type === 'video' && html5VideoRef.current) {
      if (isPlaying) {
        html5VideoRef.current.pause();
        setIsPlaying(false);
      } else {
        html5VideoRef.current.play();
        setIsPlaying(true);
      }
    } else if (currentMedia.type === 'audio' && html5AudioRef.current) {
      if (isPlaying) {
        html5AudioRef.current.pause();
        setIsPlaying(false);
      } else {
        html5AudioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Skip / Seek by seconds
  const seekRelative = (seconds: number) => {
    if (!currentMedia) return;

    if (currentMedia.type === 'youtube' && ytPlayerRef.current) {
      try {
        const cur = ytPlayerRef.current.getCurrentTime() || 0;
        ytPlayerRef.current.seekTo(Math.max(0, cur + seconds), true);
      } catch (e) {
        // ignore
      }
    } else if (currentMedia.type === 'video' && html5VideoRef.current) {
      html5VideoRef.current.currentTime = Math.max(0, html5VideoRef.current.currentTime + seconds);
    } else if (currentMedia.type === 'gallery') {
      // Step gallery forward or backward
      const galleryItems = MEDIA_CATALOG.filter((i) => i.type === 'gallery');
      const curIdx = galleryItems.findIndex((i) => i.id === currentMedia.id);
      const nextIdx = (curIdx + (seconds > 0 ? 1 : -1) + galleryItems.length) % galleryItems.length;
      setCurrentMedia(galleryItems[nextIdx]);
    }
  };

  // Siri Remote Command Handler
  const handleRemoteCommand = (cmd: RemoteCommand) => {
    const { action } = cmd;

    try {
      fetch('/api/mac-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }).catch(() => {});
    } catch (e) {}

    switch (action) {
      case 'media_play_pause':
        togglePlayPause();
        break;

      case 'vol_up':
        setVolume((v) => Math.min(100, v + 5));
        setIsMuted(false);
        setShowVolumeHud(true);
        break;

      case 'vol_down':
        setVolume((v) => Math.max(0, v - 5));
        setIsMuted(false);
        setShowVolumeHud(true);
        break;

      case 'mute':
        setIsMuted((m) => !m);
        setShowVolumeHud(true);
        break;

      case 'dpad_right':
        if (currentMedia) {
          seekRelative(10);
        }
        break;

      case 'dpad_left':
        if (currentMedia) {
          seekRelative(-10);
        }
        break;

      case 'dpad_up':
      case 'dpad_down':
        break;

      case 'trackpad_tap':
        if (currentMedia) {
          togglePlayPause();
        } else if (urlInput.trim()) {
          handlePlaySubmit();
        }
        break;

      case 'home':
      case 'back':
        if (currentMedia) {
          // Pause and exit back to catalog
          if (ytPlayerRef.current) {
            try {
              ytPlayerRef.current.pauseVideo();
            } catch (e) {
              // ignore
            }
          }
          if (html5VideoRef.current) html5VideoRef.current.pause();
          if (html5AudioRef.current) html5AudioRef.current.pause();
          setCurrentMedia(null);
          setIsPlaying(false);
        }
        break;
    }
  };

  // Add custom URL
  const handleAddCustomMedia = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = customUrlInput.trim();
    if (!raw) return;

    let customItem: MediaItem;
    // Check if YouTube link or video ID
    if (raw.includes('youtube.com') || raw.includes('youtu.be') || raw.length === 11) {
      let videoId = raw;
      if (raw.includes('v=')) {
        videoId = raw.split('v=')[1].split('&')[0];
      } else if (raw.includes('youtu.be/')) {
        videoId = raw.split('youtu.be/')[1].split('?')[0];
      }
      customItem = {
        id: `custom-${Date.now()}`,
        type: 'youtube',
        title: 'Custom YouTube Video',
        subtitle: `ID: ${videoId}`,
        url: videoId
      };
    } else if (raw.endsWith('.mp3') || raw.includes('audio') || raw.includes('stream')) {
      customItem = {
        id: `custom-${Date.now()}`,
        type: 'audio',
        title: 'Custom Audio Stream',
        subtitle: 'Live Web Audio',
        url: raw
      };
    } else {
      customItem = {
        id: `custom-${Date.now()}`,
        type: 'video',
        title: 'Custom Web Video',
        subtitle: 'Direct Stream URL',
        url: raw
      };
    }

    setCurrentMedia(customItem);
    setIsCustomModalOpen(false);
    setCustomUrlInput('');
  };

  return (
    <div style={styles.container}>
      {/* Subtle ambient lighting */}
      <div style={styles.ambientGlow} />

      {/* Top Navigation Bar */}
      <header style={styles.header}>
        <div style={styles.brandGroup} onClick={() => setCurrentMedia(null)}>
          <div style={styles.logoBadge}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <span style={styles.brandTitle}>RemoteTV</span>
        </div>

        {currentMedia && (
          <button
            onClick={() => {
              if (ytPlayerRef.current) {
                try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
              }
              if (html5VideoRef.current) html5VideoRef.current.pause();
              if (html5AudioRef.current) html5AudioRef.current.pause();
              setCurrentMedia(null);
              setIsPlaying(false);
            }}
            style={styles.customUrlBtn}
          >
            <span>Paste New Link</span>
          </button>
        )}



      </header>

      {/* Floating Volume HUD Indicator */}
      {showVolumeHud && (
        <div style={styles.volumeHud}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {isMuted || volume === 0 ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            )}
          </svg>
          <div style={styles.volumeTrack}>
            <div
              style={{
                ...styles.volumeFill,
                width: isMuted ? '0%' : `${volume}%`
              }}
            />
          </div>
          <span style={styles.volumeNumber}>{isMuted ? 'Muted' : `${volume}%`}</span>
        </div>
      )}

      {/* Main View Area: Player or Channel Showcase */}
      <main style={styles.mainStage}>
        {currentMedia ? (
          <div style={styles.playerWrapper}>
            {/* 1. YouTube Engine */}
            {currentMedia.type === 'youtube' && (
              <div style={styles.videoSurface}>
                <div id="yt-player-container" style={{ width: '100%', height: '100%' }} />
              </div>
            )}

            {/* 2. Direct HTML5 Video Engine */}
            {currentMedia.type === 'video' && (
              <div style={styles.videoSurface}>
                <video
                  ref={html5VideoRef}
                  src={currentMedia.url}
                  autoPlay
                  controls
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}

            {/* 2b. Webpage Embed Engine */}
            {currentMedia.type === 'webpage' && (
              <div style={styles.videoSurface}>
                <iframe
                  src={currentMedia.url}
                  title={currentMedia.title}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                />
              </div>
            )}

            {/* 3. Audio / Radio Stream Engine */}
            {currentMedia.type === 'audio' && (
              <div style={styles.audioSurface}>
                <audio
                  ref={html5AudioRef}
                  src={currentMedia.url}
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div style={styles.audioVisualizer}>
                  <div style={styles.soundWavePill} />
                  <div style={{ ...styles.soundWavePill, height: 48 }} />
                  <div style={{ ...styles.soundWavePill, height: 64 }} />
                  <div style={{ ...styles.soundWavePill, height: 36 }} />
                  <div style={styles.soundWavePill} />
                </div>
                <h2 style={{ fontSize: '1.4rem', margin: '20px 0 6px 0' }}>{currentMedia.title}</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>{currentMedia.subtitle}</p>
              </div>
            )}

            {/* 4. Ambient Art Gallery Engine */}
            {currentMedia.type === 'gallery' && (
              <div style={styles.gallerySurface}>
                <img
                  src={currentMedia.url}
                  alt={currentMedia.title}
                  style={styles.galleryImage}
                />
              </div>
            )}

            {/* Floating Player Info Card Bar */}
            <div style={styles.playerControlBar}>
              <button
                onClick={() => {
                  setCurrentMedia(null);
                  setIsPlaying(false);
                }}
                style={styles.backButton}
                aria-label="Back to Channels"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Channels</span>
              </button>

              <div style={styles.playingMeta}>
                <div style={styles.nowPlayingTitle}>{currentMedia.title}</div>
                <div style={styles.nowPlayingSub}>Remote: Play/Pause · Skip 10s (◀ / ▶) · Volume (+ / –)</div>
              </div>

              <button
                onClick={togglePlayPause}
                style={styles.playPauseToggle}
                aria-label="Toggle Play Pause"
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Channel Shelf Grid */
          <div style={styles.centerCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIconBox}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <h1 style={styles.cardTitle}>Paste & Play</h1>
              <p style={styles.cardSubtitle}>
                Paste any video link below and control playback with your phone remote
              </p>
            </div>

            <form onSubmit={handlePlaySubmit} style={styles.inputForm}>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste YouTube or video link (e.g. https://youtu.be/...)"
                  autoFocus
                  style={styles.urlInput}
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  style={{
                    ...styles.submitUrlBtn,
                    opacity: urlInput.trim() ? 1 : 0.45,
                    width: 'auto',
                    padding: '0 24px',
                    margin: 0
                  }}
                >
                  Play
                </button>
              </div>
            </form>
            {/* Quick Test Samples */}
            <div style={styles.samplesRow}>
              <span style={styles.samplesLabel}>Quick Test:</span>
              {QUICK_SAMPLES.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => {
                    setUrlInput(sample.url);
                    const media = parseMediaUrl(sample.url);
                    if (media) {
                      media.title = sample.title;
                      setCurrentMedia(media);
                    }
                  }}
                  style={styles.sampleChip}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Custom Media URL Input Modal */}
      {isCustomModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <button
              onClick={() => setIsCustomModalOpen(false)}
              style={styles.closeBtn}
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 style={{ margin: '4px 0 6px 0', fontSize: '1.2rem', color: '#fff' }}>Load Any Media URL</h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
              Paste any YouTube video link, MP4 video stream, or audio radio URL
            </p>

            <form onSubmit={handleAddCustomMedia} style={{ width: '100%' }}>
              <input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or .mp4"
                autoFocus
                style={styles.urlInput}
              />

              <button
                type="submit"
                disabled={!customUrlInput.trim()}
                style={{
                  ...styles.submitUrlBtn,
                  opacity: customUrlInput.trim() ? 1 : 0.45
                }}
              >
                Play on Display
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TVRemote Overlay for WebRTC pairing and controller view */}
      <TVRemoteOverlay
        screenWidth={window.innerWidth}
        screenHeight={window.innerHeight}
        onCommand={handleRemoteCommand}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    minHeight: '100vh',
    background: '#090a0c',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif'
  },
  ambientGlow: {
    position: 'fixed',
    width: 650,
    height: 450,
    background: 'radial-gradient(circle, rgba(90, 105, 150, 0.12) 0%, rgba(9, 10, 12, 0) 70%)',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  header: {
    position: 'relative',
    zIndex: 10,
    padding: 'env(safe-area-inset-top, 16px) 24px 12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap'
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer'
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.04) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  },
  brandTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '-0.3px',
    color: '#ffffff'
  },
  categoryPills: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '4px 6px',
    borderRadius: 99,
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  catButton: {
    border: 'none',
    padding: '6px 14px',
    borderRadius: 99,
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  customUrlBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 99,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer'
  },
  volumeHud: {
    position: 'fixed',
    top: 64,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9990,
    background: 'rgba(24, 24, 28, 0.94)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    padding: '10px 18px',
    borderRadius: 99,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)'
  },
  volumeTrack: {
    width: 110,
    height: 5,
    borderRadius: 99,
    background: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden'
  },
  volumeFill: {
    height: '100%',
    background: '#007AFF',
    borderRadius: 99,
    transition: 'width 0.1s ease-out'
  },
  volumeNumber: {
    fontSize: '0.8rem',
    fontWeight: 600,
    minWidth: 44,
    textAlign: 'right',
    color: '#ffffff'
  },
  mainStage: {
    position: 'relative',
    zIndex: 5,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 24px 80px 24px',
    boxSizing: 'border-box'
  },
  playerWrapper: {
    width: '100%',
    maxWidth: 960,
    height: 'calc(100vh - 180px)',
    minHeight: 380,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 24,
    overflow: 'hidden',
    background: '#000000',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8)',
    position: 'relative'
  },
  videoSurface: {
    flex: 1,
    width: '100%',
    height: '100%',
    background: '#000000',
    position: 'relative'
  },
  audioSurface: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #16181f 0%, #0d0e12 100%)',
    textAlign: 'center',
    padding: 24
  },
  audioVisualizer: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    height: 70
  },
  soundWavePill: {
    width: 6,
    height: 24,
    borderRadius: 99,
    background: '#FA2D48'
  },
  gallerySurface: {
    flex: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000000'
  },
  galleryImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  },
  playerControlBar: {
    padding: '14px 20px',
    background: 'rgba(20, 20, 24, 0.9)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: 99,
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer'
  },
  playingMeta: {
    flex: 1,
    textAlign: 'center'
  },
  nowPlayingTitle: {
    fontSize: '0.94rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  nowPlayingSub: {
    fontSize: '0.74rem',
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2
  },
  playPauseToggle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#007AFF',
    border: 'none',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  shelfContainer: {
    maxWidth: 820,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  shelfHeader: {
    textAlign: 'center',
    marginBottom: 6
  },
  shelfTitle: {
    fontSize: '1.65rem',
    fontWeight: 600,
    letterSpacing: '-0.5px',
    margin: '0 0 6px 0',
    color: '#ffffff'
  },
  shelfSubtitle: {
    fontSize: '0.84rem',
    color: 'rgba(255, 255, 255, 0.55)',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    width: '100%'
  },
  mediaCard: {
    position: 'relative',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    border: '1.5px solid rgba(255, 255, 255, 0.08)',
    padding: '20px 18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.16s ease',
    minHeight: 130,
    boxSizing: 'border-box'
  },
  cardBadge: {
    alignSelf: 'flex-start',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: '0.66rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: 12
  },
  cardContent: {
    marginBottom: 12
  },
  cardTitle: {
    fontSize: '0.98rem',
    fontWeight: 600,
    color: '#ffffff',
    letterSpacing: '-0.2px',
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: '0.76rem',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.3
  },
  playHint: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(18px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16
  },
  modalCard: {
    background: 'rgba(26, 26, 30, 0.94)',
    backdropFilter: 'blur(40px)',
    borderRadius: 28,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '28px 24px',
    width: 380,
    maxWidth: '92vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8)',
    position: 'relative',
    boxSizing: 'border-box'
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  urlInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 16
  },
  submitUrlBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer'
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

