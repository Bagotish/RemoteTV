import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';

function macSystemControlPlugin(): Plugin {
  return {
    name: 'mac-system-control',
    configureServer(server) {
      server.middlewares.use('/api/mac-control', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { action } = JSON.parse(body || '{}');
              let script = '';
              switch (action) {
                case 'media_play_pause':
                  // Spacebar key code 49: toggles play/pause on Kshow123, YouTube, Netflix, etc.
                  script = `osascript -e 'tell application "System Events" to key code 49'`;
                  break;
                case 'dpad_right':
                  // Right Arrow key code 124: skips forward 5-10s
                  script = `osascript -e 'tell application "System Events" to key code 124'`;
                  break;
                case 'dpad_left':
                  // Left Arrow key code 123: rewinds 5-10s
                  script = `osascript -e 'tell application "System Events" to key code 123'`;
                  break;
                case 'vol_up':
                  // Increases Mac speaker volume
                  script = `osascript -e 'set volume output volume ((output volume of (get volume settings)) + 6)'`;
                  break;
                case 'vol_down':
                  // Decreases Mac speaker volume
                  script = `osascript -e 'set volume output volume ((output volume of (get volume settings)) - 6)'`;
                  break;
                case 'mute':
                  // Toggles Mac mute
                  script = `osascript -e 'set volume output muted (not (output muted of (get volume settings)))'`;
                  break;
                case 'fullscreen':
                  // 'f' key toggles Fullscreen in browser players
                  script = `osascript -e 'tell application "System Events" to keystroke "f"'`;
                  break;
              }
              if (script) {
                exec(script, (err) => {
                  res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                  });
                  res.end(JSON.stringify({ success: !err, action }));
                });
              } else {
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ success: true, action: 'none' }));
              }
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'invalid payload' }));
            }
          });
        } else if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end();
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), macSystemControlPlugin()],
  server: {
    host: '0.0.0.0', // Exposes to local Wi-Fi for iPhone access
    port: 3000
  }
});
