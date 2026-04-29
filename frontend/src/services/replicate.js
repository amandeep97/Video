const BASE = 'https://api.replicate.com/v1';

export function getReplicateKey() { return localStorage.getItem('replicate_key') || ''; }
export function saveReplicateKey(k) { localStorage.setItem('replicate_key', k.trim()); }
export function getBackendUrl() { return localStorage.getItem('backend_url') || ''; }
export function saveBackendUrl(u) {
  let url = u.trim().replace(/\/$/, '');
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  if (url.startsWith('http://')) url = 'https://' + url.slice(7);
  localStorage.setItem('backend_url', url);
}

// ── Available models ──────────────────────────────────────────────────────────
export const VIDEO_MODELS = [
  {
    id: 'wan22',
    label: 'Wan2.2',
    badge: 'Best Quality',
    badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    // Replicate: update version hash from https://replicate.com/wavymulder/wan2.2
    replicateId: 'wavymulder/wan2.2',
    cost: '~$0.15/clip',
    input: (prompt, ar) => ({
      prompt,
      num_frames: 81,
      fps: 16,
      aspect_ratio: ar,
      guidance_scale: 5.0,
      num_inference_steps: 30,
    }),
  },
  {
    id: 'ltx',
    label: 'LTX Video',
    badge: 'Fast',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    replicateId: 'lightricks/ltx-video',
    cost: '~$0.05/clip',
    input: (prompt, ar) => ({
      prompt,
      num_frames: 49,
      frame_rate: 24,
      width:  ar === '9:16' ? 480 : ar === '1:1' ? 480 : 704,
      height: ar === '9:16' ? 704 : ar === '1:1' ? 480 : 480,
    }),
  },
  {
    id: 'mochi',
    label: 'Mochi 1',
    badge: 'Low VRAM',
    badgeColor: 'text-green-400 border-green-500/30 bg-green-500/10',
    replicateId: 'genmo/mochi-1',
    cost: '~$0.08/clip',
    input: (prompt) => ({ prompt, num_frames: 84, fps: 30 }),
  },
];

// ── Internal helpers ──────────────────────────────────────────────────────────
async function startPrediction(replicateId, input, key) {
  const [owner, name] = replicateId.split('/');
  const res = await fetch(`${BASE}/models/${owner}/${name}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=10',
    },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Replicate ${res.status}`);
  }
  return res.json();
}

async function poll(id, key, onStatus) {
  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await fetch(`${BASE}/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    const data = await res.json();
    onStatus?.(data.status, Math.min(95, Math.round((i / 45) * 100)));
    if (data.status === 'succeeded') {
      const out = data.output;
      return Array.isArray(out) ? out[0] : out;
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || 'Generation failed');
    }
  }
  throw new Error('Timeout — generation took too long');
}

// ── Avatar models ─────────────────────────────────────────────────────────────
export const AVATAR_MODELS = [
  {
    id: 'sadtalker',
    label: 'SadTalker',
    badge: 'Classic',
    badgeColor: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    cost: '~$0.15/video',
    desc: 'Natural head motion, good expression',
  },
  {
    id: 'wav2lip',
    label: 'Wav2Lip',
    badge: 'Sharp Sync',
    badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    cost: '~$0.10/video',
    desc: 'Sharper lip sync accuracy',
  },
  {
    id: 'musetalk',
    label: 'MuseTalk',
    badge: 'HeyGen-like',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    cost: '~$0.15/video',
    desc: 'Smooth real-time lip sync · Tencent',
  },
  {
    id: 'latentsync',
    label: 'LatentSync',
    badge: 'Best Quality',
    badgeColor: 'text-green-400 border-green-500/30 bg-green-500/10',
    cost: '~$0.15/video',
    desc: 'Most realistic lip sync · ByteDance',
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateVideo(prompt, modelId, aspectRatio, key, onStatus) {
  const backendUrl = getBackendUrl();
  if (backendUrl) return generateVideoViaBackend(prompt, modelId, aspectRatio, backendUrl, onStatus);
  if (!key) throw new Error('No Replicate API key — add it in Settings → Video');
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error('Unknown model');
  onStatus?.('starting', 2);
  const pred = await startPrediction(model.replicateId, model.input(prompt, aspectRatio), key);
  if (pred.output) return Array.isArray(pred.output) ? pred.output[0] : pred.output;
  onStatus?.('processing', 10);
  return poll(pred.id, key, onStatus);
}

async function generateVideoViaBackend(prompt, modelId, aspectRatio, backendUrl, onStatus) {
  onStatus?.('starting', 5);
  const res = await fetch(`${backendUrl}/api/generate-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model: modelId, aspectRatio }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Backend ${res.status}`); }
  const data = await res.json();
  if (data.output) return data.output;
  onStatus?.('processing', 15);
  return pollBackend(data.id, backendUrl, onStatus);
}

async function generateAvatarViaBackend(imageDataUrl, audioDataUrl, backendUrl, onStatus, modelId = 'sadtalker', script, lang) {
  onStatus?.('starting', 5);
  // Send script+lang so backend does TTS (avoids iOS Safari network restrictions)
  const body = audioDataUrl
    ? { imageDataUrl, audioDataUrl, modelId }
    : { imageDataUrl, script, lang, modelId };
  const res = await fetch(`${backendUrl}/api/generate-avatar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Backend ${res.status}`); }
  const data = await res.json();
  if (data.output) return Array.isArray(data.output) ? data.output[0] : data.output;
  onStatus?.('processing', 15);
  return pollBackend(data.id, backendUrl, onStatus);
}

async function pollBackend(id, backendUrl, onStatus) {
  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await fetch(`${backendUrl}/api/generate-video/${id}`);
    const data = await res.json();
    onStatus?.(data.status, Math.min(95, 15 + Math.round((i / 45) * 80)));
    if (data.status === 'succeeded') return data.output;
    if (data.status === 'failed' || data.status === 'canceled') throw new Error(data.error || 'Generation failed');
  }
  throw new Error('Timeout');
}

export async function generateAvatar(imageDataUrl, audioDataUrl, key, onStatus, modelId = 'sadtalker', script, lang) {
  const backendUrl = getBackendUrl();
  if (backendUrl) return generateAvatarViaBackend(imageDataUrl, audioDataUrl, backendUrl, onStatus, modelId, script, lang);
  if (!key) throw new Error('No Replicate API key — add it in Settings → Video');
  onStatus?.('starting', 2);
  let pred;
  if (modelId === 'wav2lip') {
    pred = await startPrediction('devxpy/cog-wav2lip', {
      face: imageDataUrl,
      audio: audioDataUrl,
      pads: '0 10 0 0',
      fps: 25,
      smooth: true,
    }, key);
  } else if (modelId === 'musetalk') {
    pred = await startPrediction('camenduru/musetalk', {
      source_image: imageDataUrl,
      driven_audio: audioDataUrl,
    }, key);
  } else if (modelId === 'latentsync') {
    pred = await startPrediction('bytedance/latentsync', {
      video: imageDataUrl,
      audio: audioDataUrl,
      guidance_scale: 1.5,
      inference_steps: 20,
    }, key);
  } else {
    pred = await startPrediction('cjwbw/sadtalker', {
      source_image: imageDataUrl,
      driven_audio: audioDataUrl,
      preprocess: 'crop',
      still_mode: false,
      use_enhancer: true,
      size_of_image: 256,
      pose_style: 0,
      expression_scale: 1.0,
    }, key);
  }
  if (pred.output) return Array.isArray(pred.output) ? pred.output[0] : pred.output;
  onStatus?.('processing', 10);
  return poll(pred.id, key, onStatus);
}

/** Convert a Blob to a base64 data URL. */
export async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
