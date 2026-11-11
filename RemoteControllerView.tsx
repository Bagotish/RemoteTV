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
      navigator.vibrate(18); // iOS subtle taptic click simulation
    }
    if (connRef.current && connRef.current.open) {
      connRef.current.send({ action, payload });
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
      {/* iOS Status Pill */}
      <div style={styles.statusBar}>
        <div style={styles.statusPill}>
          <div
            style={{
              ...styles.statusDot,
              background: status === 'connected' ? '#34C759' : '#FF9500',
              boxShadow: status === 'connected' ? '0 0 8px rgba(52,199,89,0.8)' : 'none'
            }}
          />
          <span>{status === 'connected' ? `Connected · ${roomCode}` : 'Connecting...'}</span>
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 2v10M18.36 6.64a9 9 0 1 1-12.73 0" />
            </svg>
          </button>
        </div>

        {/* Circular Clickpad (Touch surface + 4 direction clicks + Center Select) */}
        <div style={styles.clickpadOuter}>
          {/* North */}
          <button style={{ ...styles.clickpadNav, top: 4, left: '50%', transform: 'translateX(-50%)' }} onClick={() => send('dpad_up')}>
            <span style={styles.dpadDot} />
          </button>
          {/* South */}
          <button style={{ ...styles.clickpadNav, bottom: 4, left: '50%', transform: 'translateX(-50%)' }} onClick={() => send('dpad_down')}>
            <span style={styles.dpadDot} />
          </button>
          {/* West */}
          <button style={{ ...styles.clickpadNav, left: 4, top: '50%', transform: 'translateY(-50%)' }} onClick={() => send('dpad_left')}>
            <span style={styles.dpadDot} />
          </button>
          {/* East */}
          <button style={{ ...styles.clickpadNav, right: 4, top: '50%', transform: 'translateY(-50%)' }} onClick={() => send('dpad_right')}>
            <span style={styles.dpadDot} />
          </button>

          {/* Center Smooth Touch Surface & Select Click */}
          <div
            style={styles.clickpadCenter}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => send('trackpad_tap')}
          />
        </div>

        {/* Button Section: 2 Columns */}
        <div style={styles.buttonMatrix}>
          {/* Row 1: Back (<) and TV/Control Center */}
          <button style={styles.circleBtn} onClick={() => send('back')} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button style={styles.circleBtn} onClick={() => send('home')} aria-label="TV / Home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="13" rx="2" />
              <polyline points="17 2 12 7 7 2" />
            </svg>
          </button>

          {/* Row 2: Play/Pause and Vertical Volume Pill */}
          <button style={styles.circleBtn} onClick={() => send('media_play_pause')} aria-label="Play / Pause">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" fill="currentColor" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          {/* Siri Remote Signature Vertical Volume Rocker */}
          <div style={styles.volumeRocker}>
            <button style={styles.volumeBtn} onClick={() => send('vol_up')} aria-label="Volume Up">
              +
            </button>
            <div style={styles.volumeDivider} />
            <button style={styles.volumeBtn} onClick={() => send('vol_down')} aria-label="Volume Down">
              –
            </button>
          </div>

          {/* Row 3: Mute button (aligned under Play/Pause) */}
          <button style={styles.circleBtn} onClick={() => send('mute')} aria-label="Mute">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
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
    backgroundColor: '#000000',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 24px) 16px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    userSelect: 'none',
    WebkitUserSelect: 'none'
  },
  statusBar: {
    marginBottom: 20
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
    borderRadius: 24,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '0.8rem',
    fontWeight: 500,
    letterSpacing: '-0.2px'
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%'
  },
  // Apple Aluminum Siri Remote Body
  remoteChassis: {
    width: 250,
    height: 520,
    background: 'linear-gradient(178deg, #e3e4e6 0%, #c4c6ca 55%, #b5b7bc 100%)',
    borderRadius: 44,
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -1px 2px rgba(0, 0, 0, 0.25)',
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
    width: 10,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#1c1c1e',
    marginLeft: 8
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
    marginRight: 4
  },
  // Clickpad
  clickpadOuter: {
    width: 172,
    height: 172,
    borderRadius: '50%',
    backgroundColor: '#1b1c1e',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.15)',
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
    width: 44,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2
  },
  dpadDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)'
  },
  clickpadCenter: {
    width: 98,
    height: 98,
    borderRadius: '50%',
    backgroundColor: '#26282b',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), 0 3px 8px rgba(0,0,0,0.3)',
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
    backgroundColor: '#1b1c1e',
    color: '#f2f2f7',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 3px 6px rgba(0,0,0,0.2), inset 0 0.5px 0.5px rgba(255,255,255,0.12)',
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
    backgroundColor: '#1b1c1e',
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
    fontSize: '1.45rem',
    fontWeight: 300,
    width: '100%',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  volumeDivider: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  }
};
