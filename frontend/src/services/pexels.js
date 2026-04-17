const BASE = 'https://api.pexels.com/videos/search';

export function getPexelsKey() {
  return localStorage.getItem('pexels_key') || '';
}

export function savePexelsKey(key) {
  localStorage.setItem('pexels_key', key.trim());
}

export async function fetchPexelsVideoUrl(query, apiKey) {
  if (!apiKey || !query) return null;
  try {
    const res = await fetch(
      `${BASE}?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape&size=medium`,
      { headers: { Authorization: apiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const videos = data.videos || [];
    if (!videos.length) return null;
    const pick = videos[Math.floor(Math.random() * Math.min(3, videos.length))];
    const files = (pick.video_files || [])
      .filter(f => f.file_type === 'video/mp4' && f.width <= 1280)
      .sort((a, b) => b.width - a.width);
    return files[0]?.link || pick.video_files?.[0]?.link || null;
  } catch {
    return null;
  }
}

export function makeVideoEl(url) {
  if (!url) return null;
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous';
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  return v;
}

export async function preloadSceneVideos(scenes, apiKey) {
  if (!apiKey) return {};
  const entries = await Promise.all(
    scenes.map(async (scene, i) => {
      const q = scene.videoKeyword || scene.visualDescription?.slice(0, 60) || scene.title;
      const url = await fetchPexelsVideoUrl(q, apiKey);
      return [i, url ? makeVideoEl(url) : null];
    })
  );
  return Object.fromEntries(entries.filter(([, v]) => v));
}
