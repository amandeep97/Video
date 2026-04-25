export function getDidKey() {
  return localStorage.getItem('did_api_key') || '';
}
export function saveDidKey(key) {
  if (key !== undefined) localStorage.setItem('did_api_key', key);
}

// Generate a talking avatar video from an image + audio URL
// Returns video URL
export async function generateTalkingAvatar(imageUrl, audioUrl, didKey) {
  if (!didKey) throw new Error('No D-ID API key — add it in Settings');

  const res = await fetch('https://api.d-id.com/talks', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${didKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_url: imageUrl,
      script: {
        type: 'audio',
        audio_url: audioUrl,
      },
      config: { fluent: true },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.description || `D-ID error ${res.status}`);
  }
  const data = await res.json();
  const talkId = data.id;
  // Poll for result
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://api.d-id.com/talks/${talkId}`, {
      headers: { 'Authorization': `Basic ${didKey}` },
    });
    const result = await poll.json();
    if (result.status === 'done') return result.result_url;
    if (result.status === 'error') throw new Error('D-ID generation failed');
  }
  throw new Error('D-ID timeout');
}
