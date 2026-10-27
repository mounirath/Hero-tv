export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query?.url;
  const ua = req.query?.ua;

  if (!url) {
    return res.status(400).send('Missing url param');
  }

  try {
    const headers = {
      'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 HeroTv/1.0',
      'Accept': '*/*'
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });

    const contentType = response.headers.get('content-type') || 'text/plain; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(response.status);

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Proxy fetch failed:', error);
    return res.status(502).send(error?.message || 'Proxy request failed');
  }
}
