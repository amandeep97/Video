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
  // ── High Quality (CapCut-level) ───────────────────────────────────────────
  {
    id: 'seedance',
    label: 'Seedance 2.0',
    badge: '⚡ CapCut Model',
    badgeColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    replicateId: 'bytedance/seedance-2.0',
    cost: '~$0.50/clip',
    tier: 'premium',
    desc: 'Exact model CapCut uses. Best quality available.',
    input: (prompt, ar) => ({
      prompt,
      aspect_ratio: ar,
      duration: -1,
    }),
  },
  {
    id: 'hunyuan',
    label: 'HunyuanVideo',
    badge: '🔥 Cinema Quality',
    badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    replicateId: 'tencent/hunyuan-video',
    cost: '~$0.40/clip',
    tier: 'premium',
    desc: 'Tencent 13B model. Cinematic, smooth motion.',
    input: (prompt, ar) => ({
      prompt,
      width:  ar === '9:16' ? 544 : ar === '1:1' ? 544 : 960,
      height: ar === '9:16' ? 960 : ar === '1:1' ? 544 : 544,
      num_frames: 129,
      flow_shift: 7,
      num_inference_steps: 50,
    }),
  },
  // ── Good Quality (Better than old models) ────────────────────────────────
  {
    id: 'wan27',
    label: 'Wan 2.7',
    badge: 'High Quality',
    badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    replicateId: 'wan-video/wan-2.7-t2v',
    cost: '~$0.20/clip',
    tier: 'good',
    desc: 'Latest Wan model. Big upgrade from Wan 2.2.',
    input: (prompt, ar) => ({
      prompt,
      resolution: ar === '9:16' ? '480p' : '720p',
    }),
  },
  // ── Basic (Old models, cheap) ─────────────────────────────────────────────
  {
    id: 'wan22',
    label: 'Wan 2.2',
    badge: 'Basic',
    badgeColor: 'text-white/40 border-white/20 bg-white/5',
    replicateId: 'wavymulder/wan2.2',
    cost: '~$0.15/clip',
    tier: 'basic',
    desc: 'Older model. Cartoon-like quality.',
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
    tier: 'basic',
    desc: 'Fastest and cheapest. Low quality.',
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
    badge: 'Cheap',
    badgeColor: 'text-green-400 border-green-500/30 bg-green-500/10',
    replicateId: 'genmo/mochi-1',
    cost: '~$0.08/clip',
    tier: 'basic',
    desc: 'Decent motion, basic quality.',
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
