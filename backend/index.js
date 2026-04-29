import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Generate video script with scenes
app.post('/api/generate-script', async (req, res) => {
  const { topic, style, duration, audience, tone, language } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const sceneCount = Math.max(3, Math.min(10, Math.round(duration / 15)));

  const systemPrompt = `You are an expert video scriptwriter and content creator.
You create engaging, structured video scripts that are optimized for visual storytelling.
Always respond with valid JSON only, no markdown, no extra text.`;

  const userPrompt = `Create a complete video script for the following:
Topic: "${topic}"
Style: ${style || 'professional'}
Duration: ~${duration || 60} seconds
Target Audience: ${audience || 'general'}
Tone: ${tone || 'engaging'}
Language: ${language || 'English'}

Generate exactly ${sceneCount} scenes. Respond with this exact JSON structure:
{
  "title": "Video title",
  "description": "Brief description of the video",
  "totalDuration": ${duration || 60},
  "style": "${style || 'professional'}",
  "colorScheme": {
    "primary": "#hex",
    "secondary": "#hex",
    "background": "#hex",
    "text": "#hex",
    "accent": "#hex"
  },
  "scenes": [
    {
      "id": 1,
      "title": "Scene title",
      "duration": 15,
      "narration": "Full narration text for this scene (2-4 sentences)",
      "visualDescription": "What should be shown visually",
      "keyPoints": ["point 1", "point 2"],
      "background": "gradient or color description",
      "emoji": "relevant emoji for the scene",
      "transition": "fade|slide|zoom"
    }
  ],
  "callToAction": "Final call to action text",
  "tags": ["tag1", "tag2", "tag3"]
}

Make the narration natural, engaging, and conversational. Each scene should flow into the next.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content[0].text.trim();
    let scriptData;

    try {
      scriptData = JSON.parse(content);
    } catch {
      // Try to extract JSON if there's extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scriptData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    res.json({ success: true, script: scriptData });
  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate script' });
  }
});

// Regenerate a single scene
app.post('/api/regenerate-scene', async (req, res) => {
  const { scene, topic, style, feedback } = req.body;

  const prompt = `Rewrite this video scene${feedback ? ` with this feedback: "${feedback}"` : ' with fresh, improved content'}.
Topic: "${topic}"
Style: ${style || 'professional'}
Current scene: ${JSON.stringify(scene)}

Respond with ONLY valid JSON for the updated scene, same structure as input but with improved content:
{
  "id": ${scene.id},
  "title": "Scene title",
  "duration": ${scene.duration},
  "narration": "New engaging narration",
  "visualDescription": "Visual description",
  "keyPoints": ["point 1", "point 2"],
  "background": "background description",
  "emoji": "emoji",
  "transition": "${scene.transition || 'fade'}"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const updatedScene = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    res.json({ success: true, scene: updatedScene });
  } catch (error) {
    console.error('Scene regeneration error:', error);
    res.status(500).json({ error: error.message || 'Failed to regenerate scene' });
  }
});

// Generate video thumbnail/cover text
app.post('/api/generate-thumbnail', async (req, res) => {
  const { title, style } = req.body;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Create a catchy thumbnail text for a video titled "${title}" in ${style} style.
Respond with JSON only: {"headline": "short punchy headline", "subtext": "supporting text", "emoji": "relevant emoji"}`
      }],
    });

    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const thumbnailData = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    res.json({ success: true, thumbnail: thumbnailData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Replicate proxy routes ────────────────────────────────────────────────────
// These let you call Replicate with REPLICATE_API_TOKEN from .env instead of
// storing the key in the browser. Frontend can hit /api/generate-video instead
// of calling Replicate directly.

const REPLICATE_BASE = 'https://api.replicate.com/v1';

async function replicatePost(path, body, token) {
  const res = await fetch(`${REPLICATE_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=10' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Replicate ${res.status}`);
  }
  return res.json();
}

async function replicateGet(path, token) {
  const res = await fetch(`${REPLICATE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

// Create a prediction using latest model version — works even when
// POST /models/{owner}/{name}/predictions returns 404 (no deployment).
async function startPrediction(owner, name, input, token) {
  // Try the model-latest endpoint first
  const r1 = await fetch(`${REPLICATE_BASE}/models/${owner}/${name}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=10' },
    body: JSON.stringify({ input }),
  });
  if (r1.ok) return r1.json();

  // Fall back: look up the latest version hash and use /predictions
  const modelRes = await fetch(`${REPLICATE_BASE}/models/${owner}/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!modelRes.ok) {
    const err = await r1.json().catch(() => ({}));
    throw new Error(err.detail || `Model ${owner}/${name} not found on Replicate`);
  }
  const modelData = await modelRes.json();
  const version = modelData?.latest_version?.id;
  if (!version) throw new Error(`No published version found for ${owner}/${name}`);

  const r2 = await fetch(`${REPLICATE_BASE}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=10' },
    body: JSON.stringify({ version, input }),
  });
  if (!r2.ok) {
    const err = await r2.json().catch(() => ({}));
    throw new Error(err.detail || `Replicate ${r2.status}`);
  }
  return r2.json();
}

/**
 * POST /api/generate-video
 * Body: { prompt, model, aspectRatio }
 * model: 'wan22' | 'ltx' | 'mochi'
 * Returns: { id, status, output? }
 */
app.post('/api/generate-video', async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set in .env' });

  const { prompt, model = 'ltx', aspectRatio = '16:9' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const MODELS = {
    wan22: { owner: 'wavymulder', name: 'wan2.2',
      input: () => ({ prompt, num_frames: 81, fps: 16, aspect_ratio: aspectRatio, guidance_scale: 5.0, num_inference_steps: 30 }) },
    ltx:   { owner: 'lightricks', name: 'ltx-video',
      input: () => ({ prompt, num_frames: 49, frame_rate: 24,
        width: aspectRatio === '9:16' ? 480 : 704, height: aspectRatio === '9:16' ? 704 : 480 }) },
    mochi: { owner: 'genmo', name: 'mochi-1',
      input: () => ({ prompt, num_frames: 84, fps: 30 }) },
  };

  const m = MODELS[model] || MODELS.ltx;
  try {
    const prediction = await startPrediction(m.owner, m.name, m.input(), token);
    if (prediction.output) {
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return res.json({ id: prediction.id, status: 'succeeded', output: url });
    }
    res.json({ id: prediction.id, status: prediction.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/generate-video/:id
 * Poll for prediction status.
 * Returns: { id, status, output? }
 */
app.get('/api/generate-video/:id', async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set' });
  try {
    const data = await replicateGet(`/predictions/${req.params.id}`, token);
    const out = data.output;
    res.json({
      id: data.id,
      status: data.status,
      output: out ? (Array.isArray(out) ? out[0] : out) : null,
      error: data.error || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/generate-avatar
 * Body: { imageDataUrl, audioDataUrl?, script?, lang?, modelId? }
 * If audioDataUrl is missing, generates TTS from script+lang server-side.
 * Returns: { id, status, output? }
 */

const SE_VOICES = {
  'hi-IN': 'Aditi', 'pa-IN': 'Aditi', 'en-US': 'Joanna', 'en-GB': 'Amy',
  'es-ES': 'Conchita', 'fr-FR': 'Celine', 'de-DE': 'Marlene',
  'ja-JP': 'Mizuki', 'zh-CN': 'Zhiyu', 'ko-KR': 'Seoyeon',
  'pt-BR': 'Vitoria', 'ar-SA': 'Zeynep',
};

async function fetchTTSAudio(script, lang = 'en-US') {
  const voice = SE_VOICES[lang] || 'Joanna';
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(script)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TTS error ${res.status}`);
  const buf = await res.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');
  return `data:audio/mpeg;base64,${b64}`;
}

app.post('/api/generate-avatar', async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set in .env' });

  let { imageDataUrl, audioDataUrl, script, lang, modelId = 'sadtalker' } = req.body;
  if (!imageDataUrl) return res.status(400).json({ error: 'imageDataUrl is required' });
  if (!audioDataUrl) {
    if (!script) return res.status(400).json({ error: 'audioDataUrl or script is required' });
    try { audioDataUrl = await fetchTTSAudio(script, lang); }
    catch (e) { return res.status(500).json({ error: `TTS failed: ${e.message}` }); }
  }

  const AVATAR_MODELS = {
    sadtalker: () => startPrediction('cjwbw', 'sadtalker', {
      source_image: imageDataUrl, driven_audio: audioDataUrl,
      preprocess: 'crop', still_mode: false, use_enhancer: true,
      size_of_image: 256, pose_style: 0, expression_scale: 1.0,
    }, token),
    wav2lip: () => startPrediction('devxpy', 'cog-wav2lip', {
      face: imageDataUrl, audio: audioDataUrl, pads: '0 10 0 0', fps: 25, smooth: true,
    }, token),
    musetalk: () => startPrediction('camenduru', 'musetalk', {
      source_image: imageDataUrl, driven_audio: audioDataUrl,
    }, token),
    latentsync: () => startPrediction('bytedance', 'latentsync', {
      video: imageDataUrl, audio: audioDataUrl, guidance_scale: 1.5, inference_steps: 20,
    }, token),
  };

  const run = AVATAR_MODELS[modelId] || AVATAR_MODELS.sadtalker;
  try {
    const prediction = await run();
    if (prediction.output) {
      const out = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return res.json({ id: prediction.id, status: 'succeeded', output: out });
    }
    res.json({ id: prediction.id, status: prediction.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/generate-avatar/:id
 * Poll for avatar generation status.
 */
app.get('/api/generate-avatar/:id', async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(500).json({ error: 'REPLICATE_API_TOKEN not set' });
  try {
    const data = await replicateGet(`/predictions/${req.params.id}`, token);
    res.json({ id: data.id, status: data.status, output: data.output || null, error: data.error || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI Video Generator Backend running on http://localhost:${PORT}`);
  console.log(`API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No - set ANTHROPIC_API_KEY in .env'}`);
});
