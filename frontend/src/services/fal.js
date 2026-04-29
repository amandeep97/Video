const FAL_BASE  = 'https://fal.run';
const FAL_QUEUE = 'https://queue.fal.run';

export function getFalKey() { return localStorage.getItem('fal_api_key') || ''; }
export function saveFalKey(key) { if (key !== undefined) localStorage.setItem('fal_api_key', key); }
export function getFalBackendUrl() { return localStorage.getItem('backend_url') || ''; }

// ── Model definitions ──────────────────────────────────────────────────────────

export const FAL_VIDEO_MODELS = [
  {
    id: 'kling-v2',
    label: 'Kling v2 Master',
    badge: '🔥 CapCut Quality',
    badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    cost: '~$0.28/clip',
    duration: '5s',
    modelId: 'fal-ai/kling-video/v2/master/text-to-video',
    imageToVideoId: 'fal-ai/kling-video/v2/master/image-to-video',
    desc: 'Closest to CapCut quality. Smooth motion, realistic.',
  },
  {
    id: 'kling-v1-pro',
    label: 'Kling v1.6 Pro',
    badge: 'High Quality',
    badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    cost: '~$0.14/clip',
    duration: '5s',
    modelId: 'fal-ai/kling-video/v1.6/pro/text-to-video',
    imageToVideoId: 'fal-ai/kling-video/v1.6/pro/image-to-video',
    desc: 'Great quality at half the cost.',
  },
  {
    id: 'kling-standard',
    label: 'Kling Standard',
    badge: 'Affordable',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    cost: '~$0.07/clip',
    duration: '5s',
    modelId: 'fal-ai/kling-video/v1.6/standard/text-to-video',
    imageToVideoId: 'fal-ai/kling-video/v1.6/standard/image-to-video',
    desc: 'Good quality, cheapest Kling option.',
  },
  {
    id: 'hailuo',
    label: 'Hailuo MiniMax',
    badge: '10s Clips',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    cost: '~$0.20/clip',
    duration: '10s',
    modelId: 'fal-ai/minimax-video-01',
    desc: 'Up to 10-second clips. Smooth, cinematic motion.',
  },
];

export const FAL_IMAGE_MODELS = [
  {
    id: 'flux-pro',
    label: 'Flux Pro',
    badge: 'Best',
    badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    cost: '~$0.05/image',
    modelId: 'fal-ai/flux-pro',
  },
  {
    id: 'flux-dev',
    label: 'Flux Dev',
    badge: 'Fast',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    cost: '~$0.02/image',
    modelId: 'fal-ai/flux/dev',
  },
];

export const ART_STYLES = [
  {
    id: 'pixar',
    label: 'Pixar 3D',
    emoji: '🎪',
    prompt: 'Pixar 3D animated style, high quality CGI, warm cinematic lighting, expressive eyes, adorable character design, smooth textures, Disney-Pixar quality',
  },
  {
    id: 'anime',
    label: 'Anime',
    emoji: '🌸',
    prompt: 'anime style, vibrant colors, large expressive eyes, clean line art, Studio Ghibli inspired, detailed background',
  },
  {
    id: 'realistic',
    label: 'Realistic',
    emoji: '📸',
    prompt: 'hyperrealistic, photorealistic, 8k resolution, dramatic cinematic lighting, detailed textures, professional photography',
  },
  {
    id: 'cartoon',
    label: 'Cartoon',
    emoji: '🎨',
    prompt: 'cute cartoon style, bold outlines, vibrant flat colors, friendly character design, 2D animation style',
  },
  {
    id: 'claymation',
    label: 'Claymation',
    emoji: '🏺',
    prompt: 'Aardman claymation style, clay texture, 3D clay figures, Wallace & Gromit inspired, warm colors',
  },
  {
    id: 'watercolor',
    label: 'Watercolor',
    emoji: '🖌️',
    prompt: 'watercolor painting style, soft dreamy edges, pastel colors, artistic brushstrokes, illustrated storybook',
  },
];

// ── Internal helpers ───────────────────────────────────────────────────────────

async function falPost(modelId, input, falKey) {
  const res = await fetch(`${FAL_BASE}/${modelId}`, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || err?.error || err?.message || `FAL error ${res.status}`);
  }
  return res.json();
}

async function pollFal(modelId, requestId, falKey, onStatus) {
  const url = `${FAL_QUEUE}/${modelId}/requests/${requestId}`;
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(url, { headers: { Authorization: `Key ${falKey}` } });
    const data = await res.json();
    onStatus?.('processing', Math.min(90, 10 + Math.round((i / 50) * 80)));
    if (data.video?.url) return { video: { url: data.video.url } };
    if (data.images?.[0]?.url) return { images: data.images };
    if (data.status === 'COMPLETED' && data.output) {
      const out = data.output;
      if (out?.video?.url) return { video: { url: out.video.url } };
      if (out?.images?.[0]?.url) return { images: out.images };
    }
    if (data.status === 'FAILED') throw new Error(data.error || 'FAL generation failed');
  }
  throw new Error('Timeout — fal.ai took too long (> 4 min)');
}

async function runFal(modelId, input, falKey, onStatus) {
  onStatus?.('starting', 5);
  const data = await falPost(modelId, input, falKey);

  // Sync result returned immediately
  if (data.video?.url) return data;
  if (data.images?.[0]?.url) return data;

  // Async: got request_id, need to poll
  const requestId = data.request_id;
  if (!requestId) throw new Error('No request_id from fal.ai');
  onStatus?.('processing', 10);
  return pollFal(modelId, requestId, falKey, onStatus);
}

// ── Backend proxy helpers ──────────────────────────────────────────────────────

async function runFalViaBackend(endpoint, input, backendUrl, onStatus) {
  onStatus?.('starting', 5);
  const res = await fetch(`${backendUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Backend ${res.status}`);
  }
  const data = await res.json();
  if (data.videoUrl) return { video: { url: data.videoUrl } };
  if (data.imageUrl) return { images: [{ url: data.imageUrl }] };
  // Async polling via backend
  const { id, modelId } = data;
  if (!id) throw new Error('No job ID from backend');
  onStatus?.('processing', 10);
  return pollBackendFal(id, modelId, backendUrl, onStatus);
}

async function pollBackendFal(id, modelId, backendUrl, onStatus) {
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${backendUrl}/api/fal/status/${encodeURIComponent(modelId)}/${id}`);
    const data = await res.json();
    onStatus?.('processing', Math.min(90, 10 + Math.round((i / 50) * 80)));
    if (data.videoUrl) return { video: { url: data.videoUrl } };
    if (data.imageUrl) return { images: [{ url: data.imageUrl }] };
    if (data.status === 'FAILED') throw new Error(data.error || 'Generation failed');
  }
  throw new Error('Timeout');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an AI video from text prompt using fal.ai.
 * modelId: one of FAL_VIDEO_MODELS[n].id
 */
export async function generateFalVideo(prompt, modelId, aspectRatio = '16:9', falKey, onStatus) {
  const backendUrl = getFalBackendUrl();
  const model = FAL_VIDEO_MODELS.find(m => m.id === modelId) || FAL_VIDEO_MODELS[0];

  const input = { prompt, duration: '5', aspect_ratio: aspectRatio };

  let result;
  if (backendUrl) {
    result = await runFalViaBackend('/api/fal/generate-video', { ...input, falModelId: model.modelId }, backendUrl, onStatus);
  } else {
    if (!falKey) throw new Error('No FAL.ai API key — add it in Settings → Video');
    result = await runFal(model.modelId, input, falKey, onStatus);
  }
  onStatus?.('succeeded', 100);
  return result.video?.url || null;
}

/**
 * Generate a still image with Flux, then animate it with Kling image-to-video.
 * This is the "cartoon character" workflow used by TikTok creators.
 */
export async function generateCartoonVideo({
  characterPrompt,
  motionPrompt,
  artStyle = 'pixar',
  aspectRatio = '9:16',
  videoModelId = 'kling-v2',
  imageModelId = 'flux-pro',
  falKey,
  onStep,   // fn(step: 'image'|'video'|'done', pct: number, data?: any)
}) {
  const backendUrl = getFalBackendUrl();
  if (!falKey && !backendUrl) throw new Error('No FAL.ai key — add it in Settings → Video');

  const style = ART_STYLES.find(s => s.id === artStyle) || ART_STYLES[0];
  const imgModel = FAL_IMAGE_MODELS.find(m => m.id === imageModelId) || FAL_IMAGE_MODELS[0];
  const vidModel = FAL_VIDEO_MODELS.find(m => m.id === videoModelId) || FAL_VIDEO_MODELS[0];

  const fullImagePrompt = `${characterPrompt}, ${style.prompt}, centered subject, clean background, high quality, masterpiece`;

  // ── Step 1: Generate image ────────────────────────────────────────────────
  onStep?.('image', 5);
  const imgAR = aspectRatio === '9:16' ? { width: 720, height: 1280 } : aspectRatio === '1:1' ? { width: 1024, height: 1024 } : { width: 1280, height: 720 };

  let imgResult;
  if (backendUrl) {
    imgResult = await runFalViaBackend('/api/fal/generate-image', {
      prompt: fullImagePrompt,
      falModelId: imgModel.modelId,
      ...imgAR,
    }, backendUrl, (s, p) => onStep?.('image', Math.round(p * 0.4)));
  } else {
    imgResult = await runFal(imgModel.modelId, {
      prompt: fullImagePrompt,
      image_size: { width: imgAR.width, height: imgAR.height },
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }, falKey, (s, p) => onStep?.('image', Math.round(p * 0.4)));
  }

  const imageUrl = imgResult.images?.[0]?.url;
  if (!imageUrl) throw new Error('Image generation failed — no URL returned');
  onStep?.('image', 40, { imageUrl });

  // ── Step 2: Animate image with Kling ─────────────────────────────────────
  onStep?.('video', 45);
  const fullMotionPrompt = motionPrompt || `${characterPrompt}, natural movement, talking, gesturing`;

  if (!vidModel.imageToVideoId) {
    throw new Error(`${vidModel.label} does not support image-to-video`);
  }

  let vidResult;
  if (backendUrl) {
    vidResult = await runFalViaBackend('/api/fal/image-to-video', {
      prompt: fullMotionPrompt,
      image_url: imageUrl,
      duration: '5',
      aspect_ratio: aspectRatio,
      falModelId: vidModel.imageToVideoId,
    }, backendUrl, (s, p) => onStep?.('video', 45 + Math.round(p * 0.5)));
  } else {
    vidResult = await runFal(vidModel.imageToVideoId, {
      prompt: fullMotionPrompt,
      image_url: imageUrl,
      duration: '5',
      aspect_ratio: aspectRatio,
    }, falKey, (s, p) => onStep?.('video', 45 + Math.round(p * 0.5)));
  }

  const videoUrl = vidResult.video?.url;
  if (!videoUrl) throw new Error('Video animation failed — no URL returned');

  onStep?.('done', 100, { imageUrl, videoUrl });
  return { imageUrl, videoUrl };
}

/**
 * Generate a Flux image (for custom scene backgrounds / character images).
 */
export async function generateFluxImage(prompt, imageModelId = 'flux-dev', aspectRatio = '16:9', falKey, onStatus) {
  const backendUrl = getFalBackendUrl();
  const model = FAL_IMAGE_MODELS.find(m => m.id === imageModelId) || FAL_IMAGE_MODELS[1];
  const dims = aspectRatio === '9:16' ? { width: 720, height: 1280 }
             : aspectRatio === '1:1'  ? { width: 1024, height: 1024 }
             :                          { width: 1280, height: 720 };

  let result;
  if (backendUrl) {
    result = await runFalViaBackend('/api/fal/generate-image', {
      prompt, falModelId: model.modelId, ...dims,
    }, backendUrl, onStatus);
  } else {
    if (!falKey) throw new Error('No FAL.ai API key — add it in Settings → Video');
    result = await runFal(model.modelId, {
      prompt,
      image_size: { width: dims.width, height: dims.height },
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }, falKey, onStatus);
  }
  const url = result.images?.[0]?.url;
  if (!url) throw new Error('No image URL returned');
  return url;
}

// Legacy export kept for backward compatibility
export async function generateSceneVideo(prompt, falKey, aspectRatio = '16:9') {
  return generateFalVideo(prompt, 'kling-standard', aspectRatio, falKey, () => {});
}
