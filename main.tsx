import React from 'react';
import ReactDOM from 'react-dom/client';
import { TVRemoteOverlay } from './TVRemoteOverlay';

function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0a0a0c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff', fontFamily: '-apple-system, sans-serif' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>📺 RemoteTV Display</h1>
        <p style={{ color: '#888', margin: 0 }}>Tap "Remote" bottom-right to pair an iPhone</p>
      </div>

      <TVRemoteOverlay
        screenWidth={window.innerWidth}
        screenHeight={window.innerHeight}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
