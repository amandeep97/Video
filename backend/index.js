import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import gtts from 'node-gtts';

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

// Cache model version hashes so we only look them up once per server restart.
// This prevents wasting rate-limited API calls on repeated model lookups.
const versionCache = new Map();

async function getModelVersion(owner, name, token) {
  const key = `${owner}/${name}`;
  if (versionCache.has(key)) return versionCache.get(key);
  const res = await fetch(`${REPLICATE_BASE}/models/${owner}/${name}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Model ${key} not found on Replicate`);
  const data = await res.json();
  const version = data?.latest_version?.id;
  if (!version) throw new Error(`No published version for ${key}`);
  versionCache.set(key, version);
  return version;
}

// Create a prediction. Uses cached version hash when available (1 API call),
// falls back to version lookup on first use (2 API calls), avoids 3-call pattern
// that was exhausting the burst rate limit on low-credit accounts.
async function startPrediction(owner, name, input, token) {
  const key = `${owner}/${name}`;

  // If we already know the version, go straight to /predictions (1 API call)
  if (versionCache.has(key)) {
    const version = versionCache.get(key);
    const res = await fetch(`${REPLICATE_BASE}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=10' },
      body: JSON.stringify({ version, input }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Replicate ${res.status}`); }
    return res.json();
  }

  // First time: try model-latest endpoint (1 call). If it works, great.
  const r1 = await fetch(`${REPLICATE_BASE}/models/${owner}/${name}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=10' },
    body: JSON.stringify({ input }),
  });
  if (r1.ok) return r1.json();

  // Model endpoint returned 404 — look up version hash and cache it (2nd call)
  const version = await getModelVersion(owner, name, token);

  // Create prediction with version hash (3rd call — only happens once per model)
  const r2 = await fetch(`${REPLICATE_BASE}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait=10' },
    body: JSON.stringify({ version, input }),
  });
  if (!r2.ok) { const err = await r2.json().catch(() => ({})); throw new Error(err.detail || `Replicate ${r2.status}`); }
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
    // ── Premium (CapCut-level quality) ────────────────────────────────────
    seedance: { owner: 'bytedance', name: 'seedance-2.0',
      input: () => ({ prompt, aspect_ratio: aspectRatio, duration: -1 }) },
    hunyuan:  { owner: 'tencent', name: 'hunyuan-video',
      input: () => ({
        prompt,
        width:  aspectRatio === '9:16' ? 544 : aspectRatio === '1:1' ? 544 : 960,
        height: aspectRatio === '9:16' ? 960 : aspectRatio === '1:1' ? 544 : 544,
        num_frames: 129, flow_shift: 7, num_inference_steps: 50,
      }) },
    // ── Good quality ──────────────────────────────────────────────────────
    wan27:  { owner: 'wan-video', name: 'wan-2.7-t2v',
      input: () => ({ prompt, resolution: aspectRatio === '9:16' ? '480p' : '720p' }) },
    // ── Basic (old models) ────────────────────────────────────────────────
    wan22:  { owner: 'wavymulder', name: 'wan2.2',
      input: () => ({ prompt, num_frames: 81, fps: 16, aspect_ratio: aspectRatio, guidance_scale: 5.0, num_inference_steps: 30 }) },
    ltx:    { owner: 'lightricks', name: 'ltx-video',
      input: () => ({ prompt, num_frames: 49, frame_rate: 24,
        width: aspectRatio === '9:16' ? 480 : 704, height: aspectRatio === '9:16' ? 704 : 480 }) },
    mochi:  { owner: 'genmo', name: 'mochi-1',
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

const GTTS_LANG = {
  'en-US': 'en', 'en-GB': 'en', 'hi-IN': 'hi', 'pa-IN': 'pa',
  'es-ES': 'es', 'fr-FR': 'fr', 'de-DE': 'de', 'pt-BR': 'pt',
  'ar-SA': 'ar', 'ja-JP': 'ja', 'zh-CN': 'zh-cn', 'ko-KR': 'ko',
};

function fetchTTSAudio(script, lang = 'en-US') {
  const langCode = GTTS_LANG[lang] || 'en';
  const tts = gtts(langCode);
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => reject(new Error('TTS timeout')), 30000);
    const stream = tts.stream(script);
    stream.on('data', c => chunks.push(c));
    stream.on('end', () => {
      clearTimeout(timer);
      const b64 = Buffer.concat(chunks).toString('base64');
      resolve(`data:audio/mpeg;base64,${b64}`);
    });
    stream.on('error', e => { clearTimeout(timer); reject(new Error(`TTS failed: ${e.message}`)); });
  });
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

// ── Viral / Algorithm Cracker routes ─────────────────────────────────────────

const VIRAL_SYSTEM = `You are an expert social media algorithm analyst and viral content strategist with deep knowledge of:
- TikTok FYP algorithm (watch time, completion rate, shares, rewatches)
- Instagram Reels algorithm (Explore page, saves, DM sends, non-follower reach)
- YouTube algorithm (CTR, watch time, session time, subscriber conversion)
- What makes content go viral vs get buried in each platform
Always respond with valid JSON only, no markdown, no extra text.`;

/**
 * POST /api/viral/analyze
 * Full viral potential analysis for a topic across platforms.
 */
app.post('/api/viral/analyze', async (req, res) => {
  const { topic, platform = 'all', niche = 'general' } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const prompt = `Analyze this video topic for viral potential across social media platforms:

Topic: "${topic}"
Target Platform: ${platform}
Niche: ${niche}

Respond with ONLY this JSON structure:
{
  "viralScore": <0-100 integer>,
  "verdict": "<HIGH POTENTIAL|MEDIUM POTENTIAL|LOW POTENTIAL>",
  "viralReason": "<2-3 sentence explanation of why this topic has this viral potential>",
  "platforms": {
    "tiktok": {
      "score": <0-100>,
      "tips": ["<specific actionable tip 1>", "<tip 2>", "<tip 3>"],
      "bestTime": "<e.g. 7-9pm>",
      "bestDays": ["<day1>", "<day2>"]
    },
    "instagram": {
      "score": <0-100>,
      "tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
      "bestTime": "<time>",
      "bestDays": ["<day1>", "<day2>"]
    },
    "youtube": {
      "score": <0-100>,
      "tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
      "bestTime": "<time>",
      "bestDays": ["<day1>", "<day2>"]
    }
  },
  "hooks": [
    { "type": "Curiosity", "text": "<scroll-stopping opening line>" },
    { "type": "Shock", "text": "<shocking stat or fact opener>" },
    { "type": "Question", "text": "<question that makes viewer stop>" },
    { "type": "Story", "text": "<personal story opener>" },
    { "type": "Challenge", "text": "<challenge or dare opener>" }
  ],
  "titles": [
    { "type": "Curiosity", "text": "<title>" },
    { "type": "How-To", "text": "<title>" },
    { "type": "List", "text": "<title>" },
    { "type": "Story", "text": "<title>" },
    { "type": "Controversy", "text": "<title>" }
  ],
  "hashtags": {
    "tiktok": ["<#tag1>", "<#tag2>", "<#tag3>", "<#tag4>", "<#tag5>", "<#tag6>", "<#tag7>", "<#tag8>"],
    "instagram": ["<#tag1>", "<#tag2>", "<#tag3>", "<#tag4>", "<#tag5>", "<#tag6>", "<#tag7>", "<#tag8>", "<#tag9>", "<#tag10>"],
    "youtube": ["<#tag1>", "<#tag2>", "<#tag3>", "<#tag4>", "<#tag5>"]
  },
  "contentAngles": [
    "<Unique angle 1 with brief description>",
    "<Unique angle 2>",
    "<Unique angle 3>",
    "<Unique angle 4>",
    "<Unique angle 5>"
  ],
  "warnings": ["<warning about oversaturation, controversy risk, etc. if any>"],
  "thumbnailText": {
    "headline": "<short punchy thumbnail headline>",
    "subtext": "<supporting thumbnail text>"
  },
  "postingSchedule": "<optimal posting frequency e.g. 3x per week>",
  "retentionTip": "<single most important tip to keep viewers watching>",
  "competitorInsight": "<what top creators in this niche do differently to get more reach>"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: VIRAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    res.json({ success: true, analysis: data });
  } catch (error) {
    console.error('Viral analysis error:', error);
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

/**
 * POST /api/viral/hooks
 * Generate more hook variations for a topic.
 */
app.post('/api/viral/hooks', async (req, res) => {
  const { topic, platform = 'tiktok', count = 10 } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const prompt = `Generate ${count} viral opening hooks for this topic on ${platform}:
Topic: "${topic}"

Each hook must stop the scroll in the first 2 seconds. Mix different styles.
Respond with ONLY JSON: { "hooks": [{ "type": "<style>", "text": "<hook text>" }] }`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: VIRAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/viral/titles
 * Generate viral title variations.
 */
app.post('/api/viral/titles', async (req, res) => {
  const { topic, platform = 'youtube', count = 10 } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  const prompt = `Generate ${count} viral video titles for this topic optimized for ${platform} algorithm:
Topic: "${topic}"

Titles must maximize CTR (click-through rate). Use proven formulas: curiosity gaps, numbers, power words.
Respond with ONLY JSON: { "titles": [{ "type": "<formula used>", "text": "<title>" }] }`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: VIRAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/viral/competitor
 * Analyze what works in a niche.
 */
app.post('/api/viral/competitor', async (req, res) => {
  const { niche, platform = 'all' } = req.body;
  if (!niche) return res.status(400).json({ error: 'niche is required' });

  const prompt = `Analyze the "${niche}" niche on ${platform} social media.
What are the top creators doing to dominate the algorithm? What content patterns work?

Respond with ONLY JSON:
{
  "patterns": ["<pattern 1>", "<pattern 2>", "<pattern 3>", "<pattern 4>", "<pattern 5>"],
  "contentGaps": ["<underserved topic 1>", "<topic 2>", "<topic 3>"],
  "formats": ["<video format that works>", "<format 2>", "<format 3>"],
  "mistakes": ["<common mistake to avoid>", "<mistake 2>", "<mistake 3>"],
  "growthhack": "<single best strategy to grow fast in this niche right now>"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: VIRAL_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = message.content[0].text.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── fal.ai proxy routes ───────────────────────────────────────────────────────
// These proxy fal.ai requests through the backend so mobile (iOS Safari) can
// use Kling/Flux without CORS issues. Requires FAL_API_KEY in .env.

const FAL_BASE  = 'https://fal.run';
const FAL_QUEUE = 'https://queue.fal.run';

async function falPost(modelId, input, token) {
  const res = await fetch(`${FAL_BASE}/${modelId}`, {
    method: 'POST',
    headers: { Authorization: `Key ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || err?.error || err?.message || `FAL ${res.status}`);
  }
  return res.json();
}

async function falPoll(modelId, requestId, token) {
  const url = `${FAL_QUEUE}/${modelId}/requests/${requestId}`;
  for (let i = 0; i < 80; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(url, { headers: { Authorization: `Key ${token}` } });
    const data = await res.json();
    if (data.video?.url) return { videoUrl: data.video.url };
    if (data.images?.[0]?.url) return { imageUrl: data.images[0].url };
    if (data.status === 'COMPLETED' && data.output) {
      const out = data.output;
      if (out?.video?.url) return { videoUrl: out.video.url };
      if (out?.images?.[0]?.url) return { imageUrl: out.images[0].url };
    }
    if (data.status === 'FAILED') throw new Error(data.error || 'FAL generation failed');
  }
  throw new Error('Timeout — fal.ai took too long');
}

async function runFalJob(modelId, input, token) {
  const data = await falPost(modelId, input, token);
  if (data.video?.url) return { videoUrl: data.video.url };
  if (data.images?.[0]?.url) return { imageUrl: data.images[0].url };
  const requestId = data.request_id;
  if (!requestId) throw new Error('No request_id from fal.ai');
  return falPoll(modelId, requestId, token);
}

/**
 * POST /api/fal/generate-video
 * Body: { prompt, falModelId, duration?, aspect_ratio? }
 */
app.post('/api/fal/generate-video', async (req, res) => {
  const token = process.env.FAL_API_KEY;
  if (!token) return res.status(500).json({ error: 'FAL_API_KEY not set in .env' });
  const { prompt, falModelId, duration = '5', aspect_ratio = '16:9' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const result = await runFalJob(falModelId, { prompt, duration, aspect_ratio }, token);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/fal/generate-image
 * Body: { prompt, falModelId, width?, height? }
 */
app.post('/api/fal/generate-image', async (req, res) => {
  const token = process.env.FAL_API_KEY;
  if (!token) return res.status(500).json({ error: 'FAL_API_KEY not set in .env' });
  const { prompt, falModelId, width = 1024, height = 1024 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const result = await runFalJob(falModelId, {
      prompt,
      image_size: { width, height },
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }, token);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/fal/image-to-video
 * Body: { prompt, image_url, falModelId, duration?, aspect_ratio? }
 */
app.post('/api/fal/image-to-video', async (req, res) => {
  const token = process.env.FAL_API_KEY;
  if (!token) return res.status(500).json({ error: 'FAL_API_KEY not set in .env' });
  const { prompt, image_url, falModelId, duration = '5', aspect_ratio = '9:16' } = req.body;
  if (!prompt || !image_url) return res.status(400).json({ error: 'prompt and image_url required' });
  try {
    const result = await runFalJob(falModelId, { prompt, image_url, duration, aspect_ratio }, token);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Real Trending Data ────────────────────────────────────────────────────────

/**
 * GET /api/trends/google?geo=IN
 * Proxies Google Trends daily trending searches RSS for a country.
 * No API key needed — uses the public RSS feed.
 */
app.get('/api/trends/google', async (req, res) => {
  const geo = (req.query.geo || 'IN').toUpperCase();
  try {
    const response = await fetch(
      `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!response.ok) throw new Error(`Google Trends returned ${response.status}`);
    const xml = await response.text();

    // Parse RSS XML — extract <title> and <ht:approx_traffic> from <item> blocks
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20).map(m => {
      const block = m[1];
      const title = (block.match(/<title>(.*?)<\/title>/) || [])[1] || '';
      const traffic = (block.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/) || [])[1] || '';
      const news = [...block.matchAll(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/g)]
        .slice(0, 1).map(n => n[1]);
      return { title, traffic, news };
    }).filter(i => i.title);

    res.json({ success: true, geo, trends: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/trends/youtube?regionCode=IN&categoryId=0&apiKey=...
 * Returns top trending YouTube videos for a country using YouTube Data API v3.
 * apiKey: user's own YouTube Data API key (free — 10,000 quota/day).
 */
app.get('/api/trends/youtube', async (req, res) => {
  const { regionCode = 'IN', categoryId = '0', apiKey } = req.query;
  if (!apiKey && !process.env.YOUTUBE_API_KEY) {
    return res.status(400).json({ error: 'YouTube API key required. Pass ?apiKey=YOUR_KEY or set YOUTUBE_API_KEY in .env' });
  }
  const key = apiKey || process.env.YOUTUBE_API_KEY;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&videoCategoryId=${categoryId}&maxResults=20&key=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const videos = data.items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      views: parseInt(v.statistics.viewCount || 0),
      likes: parseInt(v.statistics.likeCount || 0),
      thumbnail: v.snippet.thumbnails.medium?.url,
      publishedAt: v.snippet.publishedAt,
      tags: v.snippet.tags?.slice(0, 5) || [],
    }));
    res.json({ success: true, regionCode, videos });
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
