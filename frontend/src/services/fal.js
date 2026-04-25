export function getFalKey() {
  return localStorage.getItem('fal_api_key') || '';
}

export function saveFalKey(key) {
  if (key !== undefined) localStorage.setItem('fal_api_key', key);
}

export async function generateSceneVideo(prompt, falKey, aspectRatio = '16:9') {
  if (!falKey) throw new Error('No FAL.ai API key — add it in Settings');
  const endpoint = 'https://fal.run/fal-ai/kling-video/v1.6/standard/text-to-video';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration: '5', aspect_ratio: aspectRatio }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || err?.error || `FAL error ${res.status}`);
  }
  const data = await res.json();
  if (data.video?.url) return data.video.url;
  if (data.request_id) return await pollFal(data.request_id, falKey);
  throw new Error('No video URL returned');
}

async function pollFal(requestId, falKey) {
  const url = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(url, { headers: { 'Authorization': `Key ${falKey}` } });
    const data = await res.json();
    if (data.status === 'COMPLETED') return data.output?.video?.url || data.video?.url;
    if (data.status === 'FAILED') throw new Error('FAL video generation failed');
  }
  throw new Error('Timeout — FAL.ai took too long');
}
