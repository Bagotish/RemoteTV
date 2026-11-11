import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { TVRemoteBridge, AdbTouchInjector } from './TVRemoteBridge';
import { RemoteControllerView } from './RemoteControllerView';

declare const Peer: any;

interface TVRemoteOverlayProps {
  adbClient?: AdbTouchInjector;
  screenWidth?: number;
  screenHeight?: number;
}

export const TVRemoteOverlay: React.FC<TVRemoteOverlayProps> = ({
  adbClient = {},
  screenWidth = 1080,
  screenHeight = 2340
}) => {
  const [isOpen, setIsOpen] = useState(false);
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
        QRCode.toDataURL(fullUrl, { width: 190, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, (err, url) => {
          if (!err) setQrCodeUrl(url);
        });
      });

      peer.on('connection', (conn: any) => {
        connRef.current = conn;

        conn.on('open', () => {
          setPeerConnected(true);
          showOSD('Siri Remote Connected');
        });

        conn.on('data', (data: any) => {
          if (bridgeRef.current) {
            bridgeRef.current.handleCommand(data);
            const pos = bridgeRef.current.getCursorPosition();
            setCursorPos({ percentX: pos.percentX, percentY: pos.percentY });
            
            if (data.action) {
              const label = data.action.replace('media_', '').replace('dpad_', '').replace('_', ' ');
              showOSD(label.charAt(0).toUpperCase() + label.slice(1));
            }
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

  if (isRemoteClientMode) {
    return <RemoteControllerView roomCode={roomCode} />;
  }

  return (
    <>
      {/* Minimalist iOS Floating Glass Button */}
      <button
        onClick={startHost}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 8888,
          background: 'rgba(255, 255, 255, 0.14)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          color: '#ffffff',
          border: '0.5px solid rgba(255, 255, 255, 0.25)',
          padding: '10px 18px',
          borderRadius: 30,
          fontWeight: 500,
          fontSize: '0.88rem',
          letterSpacing: '-0.2px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="2" width="10" height="20" rx="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span>Remote</span>
      </button>

      {/* Virtual Cursor */}
      {peerConnected && (
        <div
          style={{
            position: 'fixed',
            left: `${cursorPos.percentX}%`,
            top: `${cursorPos.percentY}%`,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            boxShadow: '0 0 16px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
            zIndex: 9998,
            transition: 'left 0.05s ease-out, top 0.05s ease-out'
          }}
        />
      )}

      {/* iOS OSD Pill Notification */}
      {osdText && (
        <div
          style={{
            position: 'fixed',
            top: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30, 30, 30, 0.75)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '0.5px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            padding: '8px 20px',
            borderRadius: 24,
            fontSize: '0.85rem',
            fontWeight: 500,
            letterSpacing: '-0.2px',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
          }}
        >
          {osdText}
        </div>
      )}

      {/* Minimal iOS Pairing Card */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: 'rgba(28, 28, 30, 0.85)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: 32,
              border: '0.5px solid rgba(255, 255, 255, 0.18)',
              padding: '28px 24px',
              width: 290,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
              position: 'relative',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 18,
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#8e8e93',
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ margin: '4px 0 4px 0', color: '#ffffff', fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.3px' }}>
              Connect Remote
            </h3>
            <p style={{ margin: '0 0 18px 0', color: '#8e8e93', fontSize: '0.8rem', textAlign: 'center' }}>
              Point iPhone or Android camera at code
            </p>

            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Scan to Pair"
                style={{ width: 170, height: 170, borderRadius: 20, background: '#ffffff', padding: 8 }}
              />
            ) : (
              <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8e8e93' }}>
                Connecting...
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <div style={{ fontSize: '0.7rem', color: '#8e8e93', letterSpacing: '0.8px', textTransform: 'uppercase' }}>PIN</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 700, color: '#ffffff', letterSpacing: 5 }}>
                {roomCode}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: '5px 12px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.06)',
                fontSize: '0.75rem',
                color: peerConnected ? '#34C759' : '#8e8e93',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: peerConnected ? '#34C759' : '#FF9500'
                }}
              />
              {peerConnected ? 'Connected' : 'Waiting...'}
            </div>
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
