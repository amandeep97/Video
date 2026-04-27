import { PROVIDERS, getSettings } from './providers.js';

// ─── Provider-specific call implementations ────────────────────────────────

async function callOpenAICompat(provider, model, apiKey, system, userMessage, maxTokens) {
  const res = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(provider.extraHeaders || {}),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `${provider.name} API error ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, model, system, userMessage, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callGemini(apiKey, model, system, userMessage, maxTokens) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ─── Unified caller ────────────────────────────────────────────────────────

export async function callAI(system, userMessage, maxTokens = 4096) {
  const { providerId, modelId, apiKey } = getSettings();
  if (!apiKey) throw new Error('No API key set. Click the ⚙ Settings button to add one.');
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);

  if (provider.type === 'anthropic') return callAnthropic(apiKey, modelId, system, userMessage, maxTokens);
  if (provider.type === 'gemini') return callGemini(apiKey, modelId, system, userMessage, maxTokens);
  if (provider.type === 'openai-compat') return callOpenAICompat(provider, modelId, apiKey, system, userMessage, maxTokens);
  throw new Error(`Unknown provider type: ${provider.type}`);
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function generateScript({ topic, style, duration, tone, audience, language }) {
  const sceneCount = Math.max(3, Math.min(10, Math.round(duration / 15)));

  const system = `You are an expert video scriptwriter and content creator.
You create engaging, structured video scripts optimized for visual storytelling.
Always respond with valid JSON only — no markdown, no extra text, no code fences.`;

  const userMessage = `Create a complete video script:
Topic: "${topic}"
Style: ${style || 'professional'}
Duration: ~${duration || 60} seconds
Audience: ${audience || 'general'}
Tone: ${tone || 'engaging'}
Language: ${language || 'English'}

Generate exactly ${sceneCount} scenes. Return ONLY this JSON (no markdown):
{
  "title": "Video title",
  "description": "Brief description",
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
      "narration": "Full narration (2-4 sentences)",
      "visualDescription": "What to show visually",
      "videoKeyword": "2-3 word stock footage search term (e.g. 'city skyline night')",
      "keyPoints": ["point 1", "point 2"],
      "emoji": "relevant emoji",
      "transition": "fade"
    }
  ],
  "callToAction": "Final CTA text",
  "tags": ["tag1", "tag2"]
}`;

  const content = await callAI(system, userMessage, 4096);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid format. Try again.');
  return JSON.parse(jsonMatch[0]);
}

export async function regenerateScene(scene, topic, style, feedback) {
  const system = 'You are a video scriptwriter. Respond with valid JSON only, no markdown, no code fences.';
  const userMessage = `Rewrite this video scene${feedback ? ` with feedback: "${feedback}"` : ' with improved content'}.
Topic: "${topic}", Style: ${style || 'professional'}
Current scene: ${JSON.stringify(scene)}

Return ONLY this JSON:
{
  "id": ${scene.id},
  "title": "Scene title",
  "duration": ${scene.duration},
  "narration": "New narration",
  "visualDescription": "Visual description",
  "keyPoints": ["point 1", "point 2"],
  "emoji": "emoji",
  "transition": "${scene.transition || 'fade'}"
}`;

  const content = await callAI(system, userMessage, 1024);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid format. Try again.');
  return JSON.parse(jsonMatch[0]);
}

export { getSettings, hasValidKey, saveSettings } from './providers.js';
export { PROVIDERS, PROVIDER_LIST } from './providers.js';
