import React, { useState, useEffect, useRef } from 'react';

declare const Peer: any;

interface RemoteControllerViewProps {
  roomCode: string;
}

export const RemoteControllerView: React.FC<RemoteControllerViewProps> = ({ roomCode }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    loadPeerJS(() => {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', () => {
        const targetPeerId = `webscrcpy-${roomCode}`;
        const conn = peer.connect(targetPeerId);
        connRef.current = conn;

        conn.on('open', () => setStatus('connected'));
        conn.on('close', () => setStatus('disconnected'));
      });

      peer.on('error', () => setStatus('disconnected'));
    });

    return () => {
      peerRef.current?.destroy();
    };
  }, [roomCode]);

  const send = (action: string, payload: any = null) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18);
    }
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ action, payload });
    }
    try {
      fetch('/api/mac-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      }).catch(() => {});
    } catch (e) {
      // ignore
    }
  };

  // Clickpad / Touch Surface Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;

      send('trackpad_move', { dx, dy });

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  return (
    <div style={styles.page}>
      {/* iOS Dynamic Island Style Status Pill */}
      <div style={styles.statusBar}>
        <div style={styles.statusPill}>
          <div
            style={{
              ...styles.statusDot,
              background: status === 'connected' ? '#34C759' : '#FF9500',
              boxShadow: status === 'connected' ? '0 0 8px rgba(52,199,89,0.8)' : 'none'
            }}
          />
          <span>{status === 'connected' ? `Connected · PIN ${roomCode}` : 'Connecting...'}</span>
        </div>
      </div>

      {/* Physical Apple Siri Remote Aluminum Unibody */}
      <div style={styles.remoteChassis}>
        {/* Top Section: Microphone Pinhole & Power Button */}
        <div style={styles.topRow}>
          <div style={styles.micHole} />
          <button
            style={styles.powerBtn}
            onClick={() => send('power')}
            aria-label="Power"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 2v10M18.36 6.64a9 9 0 1 1-12.73 0" />
            </svg>
          </button>
        </div>

        {/* Circular Clickpad (Touch surface + 4 direction clicks + Center Select) */}
        <div style={styles.clickpadOuter}>
          {/* North Direction */}
          <button
            style={{ ...styles.clickpadNav, top: 4, left: '50%', transform: 'translateX(-50%)' }}
            onClick={() => send('dpad_up')}
            aria-label="Navigate Up"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {/* South Direction */}
          <button
            style={{ ...styles.clickpadNav, bottom: 4, left: '50%', transform: 'translateX(-50%)' }}
            onClick={() => send('dpad_down')}
            aria-label="Navigate Down"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* West Direction */}
          <button
            style={{ ...styles.clickpadNav, left: 4, top: '50%', transform: 'translateY(-50%)' }}
            onClick={() => send('dpad_left')}
            aria-label="Navigate Left"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* East Direction */}
          <button
            style={{ ...styles.clickpadNav, right: 4, top: '50%', transform: 'translateY(-50%)' }}
            onClick={() => send('dpad_right')}
            aria-label="Navigate Right"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Center Smooth Touch Surface & Select Click */}
          <div
            style={styles.clickpadCenter}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => send('trackpad_tap')}
            aria-label="Touch Surface and Select"
          />
        </div>

        {/* Button Section: 2 Columns */}
        <div style={styles.buttonMatrix}>
          {/* Row 1: Back (<) and TV/Home */}
          <button style={styles.circleBtn} onClick={() => send('back')} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button style={styles.circleBtn} onClick={() => send('home')} aria-label="TV / Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="13" rx="2.5" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </button>

          {/* Row 2: Play/Pause and Vertical Volume Pill */}
          <button style={styles.circleBtn} onClick={() => send('media_play_pause')} aria-label="Play / Pause">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 14 12 5 20" />
              <rect x="16" y="5" width="3" height="14" rx="1" />
            </svg>
          </button>

          {/* Siri Remote Signature Vertical Volume Rocker */}
          <div style={styles.volumeRocker}>
            <button style={styles.volumeBtn} onClick={() => send('vol_up')} aria-label="Volume Up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div style={styles.volumeDivider} />
            <button style={styles.volumeBtn} onClick={() => send('vol_down')} aria-label="Volume Down">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Row 3: Mute button (aligned under Play/Pause) */}
          <button style={styles.circleBtn} onClick={() => send('mute')} aria-label="Mute">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

function loadPeerJS(callback: () => void) {
  if (typeof window === 'undefined') return;
  if ((window as any).Peer) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  script.onload = () => callback();
  document.body.appendChild(script);
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: '#090a0c',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 20px) 16px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    userSelect: 'none',
    WebkitUserSelect: 'none'
  },
  statusBar: {
    marginBottom: 18
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '0.5px solid rgba(255, 255, 255, 0.12)',
    padding: '6px 14px',
    borderRadius: 99,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '0.78rem',
    fontWeight: 500,
    letterSpacing: '-0.2px'
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%'
  },
  // Apple Aluminum Siri Remote Body
  remoteChassis: {
    width: 250,
    height: 520,
    background: 'linear-gradient(180deg, #eff0f2 0%, #dbdde0 48%, #c5c8cc 100%)',
    borderRadius: 44,
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.25)',
    padding: '24px 22px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    boxSizing: 'border-box'
  },
  topRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  micHole: {
    width: 9,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#1b1c1e',
    marginLeft: 8,
    opacity: 0.9
  },
  powerBtn: {
    background: 'transparent',
    border: 'none',
    color: '#1c1c1e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 6,
    borderRadius: '50%',
    marginRight: 4,
    transition: 'transform 0.08s ease'
  },
  // Clickpad
  clickpadOuter: {
    width: 172,
    height: 172,
    borderRadius: '50%',
    backgroundColor: '#1c1d20',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.15)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    touchAction: 'none'
  },
  clickpadNav: {
    position: 'absolute',
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    width: 44,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2,
    padding: 0
  },
  clickpadCenter: {
    width: 98,
    height: 98,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 50% 45%, #2a2c30 0%, #202124 100%)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), 0 3px 8px rgba(0,0,0,0.35)',
    cursor: 'crosshair',
    zIndex: 3
  },
  // Button Grid
  buttonMatrix: {
    display: 'grid',
    gridTemplateColumns: '54px 54px',
    gridTemplateRows: '54px 54px 54px',
    gap: '16px 26px',
    alignItems: 'center',
    justifyContent: 'center'
  },
  circleBtn: {
    width: 54,
    height: 54,
    borderRadius: '50%',
    backgroundColor: '#1c1d20',
    color: '#f2f2f7',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 3px 6px rgba(0,0,0,0.22), inset 0 0.5px 0.5px rgba(255,255,255,0.12)',
    transition: 'transform 0.08s ease, background-color 0.08s ease',
    WebkitTapHighlightColor: 'transparent'
  },
  // Vertical Volume Rocker Pill
  volumeRocker: {
    gridColumn: '2',
    gridRow: '2 / span 2',
    width: 54,
    height: 124,
    borderRadius: 27,
    backgroundColor: '#1c1d20',
    boxShadow: '0 3px 8px rgba(0,0,0,0.25), inset 0 0.5px 0.5px rgba(255,255,255,0.12)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    boxSizing: 'border-box'
  },
  volumeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    width: '100%',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0
  },
  volumeDivider: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  }
};
