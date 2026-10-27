export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.query?.url;
  const ua = req.query?.ua;

  if (!rawUrl) {
    return res.status(400).send('Missing url param');
  }

  const targetUrl = typeof rawUrl === 'string' ? decodeURIComponent(rawUrl) : '';

  try {
    const headers = {
      'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 HeroTv/1.0',
      'Accept': '*/*'
    };

    const response = await fetch(targetUrl, {
      headers,
      signal: AbortSignal.timeout(18000),
      redirect: 'follow'
    });

    res.status(response.status);
    const contentType = response.headers.get('content-type') || '';

    // Check if response is an M3U8 / HLS playlist
    const isM3u8 =
      contentType.includes('mpegurl') ||
      targetUrl.toLowerCase().includes('.m3u8') ||
      targetUrl.toLowerCase().includes('output=m3u8');

    if (isM3u8) {
      const text = await response.text();
      // If it contains HLS tags, rewrite segment URLs to pass through proxy
      if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
        const lines = text.split(/\r?\n/);
        const rewrittenLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) {
            // Handle URI="..." inside #EXT-X-KEY or #EXT-X-MAP
            if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
              return trimmed.replace(/URI="(.*?)"/g, (_, uriMatch) => {
                try {
                  const resolvedUri = new URL(uriMatch, targetUrl).toString();
                  return `URI="/api/proxy?url=${encodeURIComponent(resolvedUri)}${ua ? `&ua=${encodeURIComponent(ua)}` : ''}"`;
                } catch {
                  return `URI="${uriMatch}"`;
                }
              });
            }
            return line;
          }
          // Segment URL or sub-playlist URL
          try {
            const resolved = new URL(trimmed, targetUrl).toString();
            return `/api/proxy?url=${encodeURIComponent(resolved)}${ua ? `&ua=${encodeURIComponent(ua)}` : ''}`;
          } catch {
            return line;
          }
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        return res.send(rewrittenLines.join('\n'));
      }

      res.setHeader('Content-Type', contentType || 'application/vnd.apple.mpegurl; charset=utf-8');
      return res.send(text);
    }

    // Binary / TS segment / Video stream
    if (contentType) res.setHeader('Content-Type', contentType);
    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Proxy fetch failed:', error);
    return res.status(502).send(error?.message || 'Proxy request failed');
  }
}
