// Free AI image generation — no API key needed
const BASE = 'https://image.pollinations.ai/prompt';

const STYLE_SUFFIXES = {
  professional:  'corporate photography, clean, professional, soft lighting',
  cinematic:     'cinematic lighting, dramatic, film still, widescreen',
  educational:   'bright, clean, educational illustration, vivid colors',
  social:        'vibrant, social media aesthetic, trendy, colorful',
  motivational:  'inspirational, energetic, sunrise, warm golden light',
  documentary:   'documentary photography, realistic, natural light',
};

export async function fetchAIImage(prompt, style = 'professional', sceneIndex = 0) {
  const suffix = STYLE_SUFFIXES[style] || STYLE_SUFFIXES.professional;
  const full   = `${prompt}, ${suffix}`;
  const seed   = 1000 + sceneIndex * 37; // deterministic seed per scene
  const url    = `${BASE}/${encodeURIComponent(full)}?width=1280&height=720&nologo=true&seed=${seed}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob   = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    return await loadImage(objUrl);
  } catch {
    return null;
  }
}

function loadImage(src) {
  return new Promise(resolve => {
    const img  = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src     = src;
  });
}

// Preload images for all scenes in parallel, calling onProgress as each finishes
export async function preloadSceneImages(scenes, style, onProgress) {
  const results = {};
  let done = 0;
  await Promise.all(
    scenes.map(async (scene, i) => {
      const prompt = scene.visualDescription || scene.videoKeyword || scene.title;
      const img = await fetchAIImage(prompt, style, i);
      if (img) results[i] = img;
      done++;
      onProgress?.(done, scenes.length);
    })
  );
  return results;
}
