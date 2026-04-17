const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

function getApiKey() {
  return localStorage.getItem('anthropic_api_key') || '';
}

async function callClaude(system, userMessage, maxTokens = 4096) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key set. Please add your Anthropic API key in Settings.');

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

export async function generateScript({ topic, style, duration, tone, audience, language }) {
  const sceneCount = Math.max(3, Math.min(10, Math.round(duration / 15)));

  const system = `You are an expert video scriptwriter and content creator.
You create engaging, structured video scripts that are optimized for visual storytelling.
Always respond with valid JSON only, no markdown, no extra text.`;

  const userMessage = `Create a complete video script for the following:
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

  const content = await callClaude(system, userMessage, 4096);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : content);
}

export async function regenerateScene(scene, topic, style, feedback) {
  const prompt = `Rewrite this video scene${feedback ? ` with this feedback: "${feedback}"` : ' with fresh, improved content'}.
Topic: "${topic}"
Style: ${style || 'professional'}
Current scene: ${JSON.stringify(scene)}

Respond with ONLY valid JSON for the updated scene:
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

  const content = await callClaude('You are a video scriptwriter. Respond with valid JSON only.', prompt, 1024);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : content);
}

export function saveApiKey(key) {
  localStorage.setItem('anthropic_api_key', key);
}

export function loadApiKey() {
  return localStorage.getItem('anthropic_api_key') || '';
}

export function clearApiKey() {
  localStorage.removeItem('anthropic_api_key');
}
