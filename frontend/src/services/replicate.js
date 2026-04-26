const BASE = 'https://api.replicate.com/v1';

export function getReplicateKey() { return localStorage.getItem('replicate_key') || ''; }
export function saveReplicateKey(k) { localStorage.setItem('replicate_key', k.trim()); }

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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a video clip from a text prompt.
 * @param {string} prompt
 * @param {string} modelId  one of VIDEO_MODELS[].id
 * @param {string} aspectRatio  '16:9' | '9:16' | '1:1'
 * @param {string} key  Replicate API key
 * @param {(status:string, pct:number) => void} onStatus
 * @returns {Promise<string>}  URL of generated video
 */
export async function generateVideo(prompt, modelId, aspectRatio, key, onStatus) {
  if (!key) throw new Error('No Replicate API key — add it in Settings → Video');
  const model = VIDEO_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error('Unknown model');
  onStatus?.('starting', 2);
  const pred = await startPrediction(model.replicateId, model.input(prompt, aspectRatio), key);
  if (pred.output) return Array.isArray(pred.output) ? pred.output[0] : pred.output;
  onStatus?.('processing', 10);
  return poll(pred.id, key, onStatus);
}

/**
 * Generate a talking-head video from a portrait photo + script audio.
 * Uses SadTalker on Replicate.
 * @param {string} imageDataUrl  data:image/...;base64,...
 * @param {string} audioDataUrl  data:audio/...;base64,...
 * @param {string} key
 * @param {(status:string, pct:number) => void} onStatus
 * @returns {Promise<string>}  URL of generated video
 */
export async function generateAvatar(imageDataUrl, audioDataUrl, key, onStatus) {
  if (!key) throw new Error('No Replicate API key — add it in Settings → Video');
  onStatus?.('starting', 2);
  const pred = await startPrediction('cjwbw/sadtalker', {
    source_image: imageDataUrl,
    driven_audio: audioDataUrl,
    preprocess: 'crop',
    still_mode: false,
    use_enhancer: true,
    size_of_image: 256,
    pose_style: 0,
    expression_scale: 1.0,
  }, key);
  if (pred.output) return pred.output;
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
