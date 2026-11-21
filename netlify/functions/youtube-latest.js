const PLAYLIST_ID = 'PLOY8p_48uzHc';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function textOf(block, tag) {
  const escaped = tag.replace(':', '\\:');
  const match = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : '';
}

exports.handler = async function handler() {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ImpoRinaWebsite/1.0',
        'Accept': 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube feed HTTP ${response.status}`);
    }

    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);

    const videos = entries
      .map(entry => {
        const videoId = textOf(entry, 'yt:videoId');
        const title = textOf(entry, 'title');
        const published = textOf(entry, 'published');
        if (!videoId || !title) return null;
        return {
          videoId,
          title,
          published,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}&list=${PLAYLIST_ID}`
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.published) - new Date(a.published))
      .slice(0, 3);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=900',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ playlistId: PLAYLIST_ID, videos })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({ error: 'Tidak dapat mengambil playlist YouTube saat ini.' })
    };
  }
};

