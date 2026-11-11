import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { TVRemoteBridge, AdbTouchInjector } from './TVRemoteBridge';
import { RemoteControllerView } from './RemoteControllerView';

declare const Peer: any;

export interface RemoteCommand {
  action: string;
  payload?: any;
}

export interface TVRemoteOverlayProps {
  adbClient?: AdbTouchInjector;
  screenWidth?: number;
  screenHeight?: number;
  onCommand?: (cmd: RemoteCommand) => void;
}

export const TVRemoteOverlay: React.FC<TVRemoteOverlayProps> = ({
  adbClient = {},
  screenWidth = 1080,
  screenHeight = 2340,
  onCommand
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInputValue, setPinInputValue] = useState('');
  const [isRemoteClientMode, setIsRemoteClientMode] = useState(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [peerConnected, setPeerConnected] = useState(false);
  const [cursorPos, setCursorPos] = useState({ percentX: 50, percentY: 50 });
  const [osdText, setOsdText] = useState('');

  const bridgeRef = useRef<TVRemoteBridge | null>(null);
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);

  useEffect(() => {
    bridgeRef.current = new TVRemoteBridge(adbClient, screenWidth, screenHeight);
  }, [adbClient, screenWidth, screenHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const code = params.get('code');

    if (role === 'remote' && code) {
      setIsRemoteClientMode(true);
      setRoomCode(code);
    }
  }, []);

  const startHost = () => {
    setIsOpen(true);
    if (peerRef.current) return;

    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setRoomCode(randomPin);
    const peerId = `webscrcpy-${randomPin}`;

    loadPeerJS(() => {
      const peer = new Peer(peerId);
      peerRef.current = peer;

      peer.on('open', () => {
        const fullUrl = `${window.location.origin}${window.location.pathname}?role=remote&code=${randomPin}`;
        QRCode.toDataURL(
          fullUrl,
          {
            width: 180,
            margin: 1,
            color: { dark: '#111216', light: '#ffffff' }
          },
          (err, url) => {
            if (!err) setQrCodeUrl(url);
          }
        );
      });

      peer.on('connection', (conn: any) => {
        connRef.current = conn;

        conn.on('open', () => {
          setPeerConnected(true);
          showOSD('Remote Connected');
        });

        conn.on('data', (data: any) => {
          if (bridgeRef.current) {
            bridgeRef.current.handleCommand(data);
            const pos = bridgeRef.current.getCursorPosition();
            setCursorPos({ percentX: pos.percentX, percentY: pos.percentY });

            if (data.action) {
              const label = data.action
                .replace('media_', '')
                .replace('dpad_', '')
                .replace('trackpad_', '')
                .replace('_', ' ');
              showOSD(label.charAt(0).toUpperCase() + label.slice(1));
            }
          }
          if (onCommand) {
            onCommand(data);
          }
        });

        conn.on('close', () => {
          setPeerConnected(false);
          showOSD('Remote Disconnected');
        });
      });
    });
  };

  const showOSD = (msg: string) => {
    setOsdText(msg);
    setTimeout(() => setOsdText(''), 1200);
  };

  const handleConnectWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInputValue.trim();
    if (cleanPin.length === 4) {
      setRoomCode(cleanPin);
      setIsRemoteClientMode(true);
      setIsPinModalOpen(false);
    }
  };

  if (isRemoteClientMode) {
    return <RemoteControllerView roomCode={roomCode} />;
  }

  return (
    <>
      {/* Floating Control Buttons Bottom-Right */}
      <div style={styles.floatingBar}>
        <button
          onClick={() => setIsPinModalOpen(true)}
          style={styles.floatingSecondaryButton}
          aria-label="Enter PIN"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Use as Remote</span>
        </button>

        <button
          onClick={startHost}
          style={styles.floatingButton}
          aria-label="Open Remote Pairing"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="7" y="2" width="10" height="20" rx="3" />
            <circle cx="12" cy="7" r="1.2" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          <span>Pairing Code</span>
        </button>
      </div>

      {/* Virtual Cursor */}
      {peerConnected && (
        <div
          style={{
            ...styles.cursor,
            left: `${cursorPos.percentX}%`,
            top: `${cursorPos.percentY}%`
          }}
        />
      )}

      {/* tvOS-inspired OSD Notification Pill */}
      {osdText && (
        <div style={styles.osdPill}>
          <div style={styles.osdDot} />
          <span>{osdText}</span>
        </div>
      )}

      {/* Pairing Host Card Modal */}
      {isOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeBtn}
              aria-label="Close"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 style={styles.modalTitle}>Pair Second Phone</h3>
            <p style={styles.modalSubtitle}>
              Scan with your second phone camera or open this page on it and enter this PIN
            </p>

            <div style={styles.qrWrapper}>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Scan to Pair"
                  style={styles.qrImage}
                />
              ) : (
                <div style={styles.qrPlaceholder}>
                  <div style={styles.spinner} />
                  <span style={{ fontSize: '0.8rem', marginTop: 10 }}>Generating Code...</span>
                </div>
              )}
            </div>

            {/* Segmented PIN Code Display */}
            <div style={styles.pinSection}>
              <div style={styles.pinLabel}>PAIRING PIN</div>
              <div style={styles.pinDigitsRow}>
                {roomCode ? (
                  roomCode.split('').map((char, idx) => (
                    <div key={idx} style={styles.pinDigitBox}>
                      {char}
                    </div>
                  ))
                ) : (
                  <div style={styles.pinDigitBox}>-</div>
                )}
              </div>
            </div>

            {/* Status Footer */}
            <div style={styles.statusFooter}>
              <div
                style={{
                  ...styles.statusIndicatorDot,
                  background: peerConnected ? '#34C759' : '#FF9500',
                  boxShadow: peerConnected ? '0 0 8px rgba(52,199,89,0.8)' : 'none'
                }}
              />
              <span style={{ color: peerConnected ? '#34C759' : 'rgba(255, 255, 255, 0.65)' }}>
                {peerConnected ? 'Connected & Ready' : 'Waiting for controller...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Enter PIN Modal (To turn this device into the Remote) */}
      {isPinModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <button
              onClick={() => setIsPinModalOpen(false)}
              style={styles.closeBtn}
              aria-label="Close"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h3 style={styles.modalTitle}>Enter 4-Digit PIN</h3>
            <p style={styles.modalSubtitle}>
              Look at the pairing code shown on your host phone or screen
            </p>

            <form onSubmit={handleConnectWithPin} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinInputValue}
                onChange={(e) => setPinInputValue(e.target.value)}
                placeholder="0000"
                autoFocus
                style={styles.pinInput}
              />

              <button
                type="submit"
                disabled={pinInputValue.trim().length !== 4}
                style={{
                  ...styles.submitBtn,
                  opacity: pinInputValue.trim().length === 4 ? 1 : 0.45,
                  cursor: pinInputValue.trim().length === 4 ? 'pointer' : 'not-allowed'
                }}
              >
                Connect Remote
              </button>
            </form>
          </div>
        </div>
      )}
    </>
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
  floatingBar: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 8888,
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  floatingSecondaryButton: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    color: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '8px 14px',
    borderRadius: 99,
    fontWeight: 500,
    fontSize: '0.82rem',
    letterSpacing: '-0.2px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    transition: 'all 0.15s ease'
  },
  floatingButton: {
    background: 'rgba(28, 28, 32, 0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    padding: '8px 16px',
    borderRadius: 99,
    fontWeight: 500,
    fontSize: '0.82rem',
    letterSpacing: '-0.2px',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s ease'
  },
  cursor: {
    position: 'fixed',
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    border: '1.5px solid rgba(255, 255, 255, 0.95)',
    boxShadow: '0 0 16px rgba(255, 255, 255, 0.6), 0 3px 8px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
    zIndex: 9998,
    transition: 'left 0.05s ease-out, top 0.05s ease-out'
  },
  osdPill: {
    position: 'fixed',
    top: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(20, 20, 24, 0.88)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    padding: '7px 18px',
    borderRadius: 99,
    fontSize: '0.82rem',
    fontWeight: 500,
    letterSpacing: '-0.1px',
    zIndex: 9999,
    pointerEvents: 'none',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  osdDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#34C759'
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16
  },
  modalCard: {
    background: 'rgba(26, 26, 30, 0.94)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    borderRadius: 28,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '28px 24px',
    width: 310,
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
    cursor: 'pointer',
    transition: 'background-color 0.12s ease'
  },
  modalTitle: {
    margin: '4px 0 6px 0',
    color: '#ffffff',
    fontSize: '1.15rem',
    fontWeight: 600,
    letterSpacing: '-0.3px',
    textAlign: 'center'
  },
  modalSubtitle: {
    margin: '0 0 20px 0',
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: '0.78rem',
    lineHeight: 1.4,
    textAlign: 'center',
    maxWidth: 240
  },
  qrWrapper: {
    width: 180,
    height: 180,
    borderRadius: 20,
    background: '#ffffff',
    padding: 8,
    boxSizing: 'border-box',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qrImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    display: 'block'
  },
  qrPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#636366'
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(0, 0, 0, 0.1)',
    borderTopColor: '#007AFF',
    borderRadius: '50%'
  },
  pinSection: {
    width: '100%',
    marginTop: 18,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  pinLabel: {
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '1px',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 8
  },
  pinDigitsRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center'
  },
  pinDigitBox: {
    width: 42,
    height: 48,
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '1.4rem',
    fontWeight: 600,
    letterSpacing: '-0.5px'
  },
  pinInput: {
    width: '100%',
    maxWidth: 200,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#ffffff',
    fontSize: '1.8rem',
    fontWeight: 700,
    textAlign: 'center',
    letterSpacing: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 18
  },
  submitBtn: {
    width: '100%',
    maxWidth: 200,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'all 0.15s ease'
  },
  statusFooter: {
    marginTop: 18,
    padding: '6px 14px',
    borderRadius: 99,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '0.74rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: '50%'
  }
};
