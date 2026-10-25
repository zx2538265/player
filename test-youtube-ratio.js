/* Test player only. oEmbed gives embed geometry, not original media dimensions. */
(function (root) {
  function createYouTubeRatioLookup(options = {}) {
    const request = options.fetch || root.fetch.bind(root);
    const cache = new Map();
    const pending = new Map();
    const now = options.now || Date.now;
    const ttl = 24 * 60 * 60 * 1000;
    let verifiedRequest;

    async function verifiedGeometry() {
      if (options.verifiedGeometry) return options.verifiedGeometry;
      if (!verifiedRequest) verifiedRequest = (async () => {
        try {
          const response = await request('test-video-geometry.json', { cache: 'no-cache', signal: AbortSignal.timeout(3000) });
          if (!response.ok) return {};
          const data = await response.json();
          return data.version === 1 && data.videos && typeof data.videos === 'object' ? data.videos : {};
        } catch { return {}; }
      })();
      return verifiedRequest;
    }

    function parse(data) {
      const width = Number(data?.width), height = Number(data?.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
      const ratio = width / height;
      if (ratio < 0.1 || ratio > 10) return null;
      return { width, height, ratio,
        orientation: Math.abs(ratio - 1) <= 0.02 ? 'square' : ratio > 1 ? 'landscape' : 'portrait' };
    }

    async function get(videoId) {
      if (!/^[\w-]{11}$/.test(videoId)) return null;
      const saved = cache.get(videoId);
      if (saved && now() - saved.time < ttl) return saved.value;
      if (pending.has(videoId)) return pending.get(videoId);
      // The watch URL can report a landscape embed even for Shorts.
      const url = new URL('https://www.youtube.com/oembed');
      url.searchParams.set('url', `https://www.youtube.com/shorts/${videoId}`);
      url.searchParams.set('format', 'json');
      const task = (async () => {
        try {
          const records = options.verifiedGeometry || await verifiedGeometry();
          const verified = parse(records[videoId]);
          if (verified) {
            const value = { ...verified, source: 'verified' };
            cache.set(videoId, { value, time: now() });
            return value;
          }
          const response = await request(url.href, { signal: AbortSignal.timeout(5000) });
          if (!response.ok) return null;
          const geometry = parse(await response.json());
          const value = geometry ? { ...geometry, source: 'embed' } : null;
          if (value) cache.set(videoId, { value, time: now() });
          return value;
        } catch {
          return null;
        } finally {
          pending.delete(videoId);
        }
      })();
      pending.set(videoId, task);
      return task;
    }
    return { get };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createYouTubeRatioLookup };
  else root.createYouTubeRatioLookup = createYouTubeRatioLookup;
})(typeof window === 'undefined' ? globalThis : window);
