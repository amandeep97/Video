import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI Video Generator Backend running on http://localhost:${PORT}`);
  console.log(`API Key configured: ${process.env.ANTHROPIC_API_KEY ? 'Yes' : 'No - set ANTHROPIC_API_KEY in .env'}`);
});
