export function getPixabayKey() { return localStorage.getItem('pixabay_key') || ''; }
export function savePixabayKey(k) { localStorage.setItem('pixabay_key', k.trim()); }

async function pixabayFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function pick(arr, n = 3) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * Math.min(n, arr.length))];
}

export async function fetchPixabayVideoUrl(query, key) {
  if (!key || !query) return null;
  const data = await pixabayFetch(
    `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=10&video_type=film`
  );
  const hit = pick(data?.hits);
  return hit?.videos?.medium?.url || hit?.videos?.small?.url || null;
}

export async function fetchPixabayImageUrl(query, key) {
  if (!key || !query) return null;
  const data = await pixabayFetch(
    `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&per_page=10&image_type=photo&orientation=horizontal&min_width=640&safesearch=true`
  );
  const hit = pick(data?.hits, 5);
  return hit?.largeImageURL || hit?.webformatURL || null;
}

import { makeVideoEl } from './pexels.js';

export async function preloadSceneVideosPixabay(scenes, key) {
  if (!key) return {};
  const entries = await Promise.all(
    scenes.map(async (scene, i) => {
      const q = scene.videoKeyword || scene.visualDescription?.slice(0, 60) || scene.title;
      const url = await fetchPixabayVideoUrl(q, key);
      return [i, url ? makeVideoEl(url) : null];
    })
  );
  return Object.fromEntries(entries.filter(([, v]) => v));
}

export async function preloadSceneImagesPixabay(scenes, key, onProgress) {
  if (!key) return {};
  const results = {};
  for (let i = 0; i < scenes.length; i++) {
    const q = scenes[i].videoKeyword || scenes[i].visualDescription?.slice(0, 60) || scenes[i].title;
    const url = await fetchPixabayImageUrl(q, key);
    if (url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      results[i] = img;
    }
    onProgress?.(i + 1, scenes.length);
  }
  return results;
}
