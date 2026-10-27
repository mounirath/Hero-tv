import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cors-proxy',
      configureServer(server) {
        server.middlewares.use('/api/proxy', async (req, res) => {
          try {
            const urlObj = new URL(req.url || '', 'http://localhost');
            const targetUrl = urlObj.searchParams.get('url');
            const customUa = urlObj.searchParams.get('ua');
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('Missing url param');
              return;
            }
            const headers: Record<string, string> = {
              'User-Agent': customUa || 'HeroTv/1.0 (Mozilla/5.0)',
              'Accept': '*/*'
            };
            const response = await fetch(targetUrl, { headers });
            res.statusCode = response.status;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            const contentType = response.headers.get('content-type') || '';
            const isM3u8 =
              contentType.includes('mpegurl') ||
              targetUrl.toLowerCase().includes('.m3u8') ||
              targetUrl.toLowerCase().includes('output=m3u8');

            if (isM3u8) {
              const text = await response.text();
              if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
                const lines = text.split(/\r?\n/);
                const rewritten = lines.map(line => {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith('#')) {
                    if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
                      return trimmed.replace(/URI="(.*?)"/g, (_, uriMatch) => {
                        try {
                          const resolvedUri = new URL(uriMatch, targetUrl).toString();
                          return `URI="/api/proxy?url=${encodeURIComponent(resolvedUri)}${customUa ? `&ua=${encodeURIComponent(customUa)}` : ''}"`;
                        } catch {
                          return `URI="${uriMatch}"`;
                        }
                      });
                    }
                    return line;
                  }
                  try {
                    const resolved = new URL(trimmed, targetUrl).toString();
                    return `/api/proxy?url=${encodeURIComponent(resolved)}${customUa ? `&ua=${encodeURIComponent(customUa)}` : ''}`;
                  } catch {
                    return line;
                  }
                });
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
                res.end(rewritten.join('\n'));
                return;
              }
              res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl; charset=utf-8');
              res.end(text);
              return;
            }

            if (contentType) res.setHeader('Content-Type', contentType);
            const arrayBuffer = await response.arrayBuffer();
            res.end(Buffer.from(arrayBuffer));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(err?.message || 'Proxy error');
          }
        });
      }
    }
  ],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
