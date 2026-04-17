const BASE_URL = '/api';

export async function generateScript(options) {
  const res = await fetch(`${BASE_URL}/generate-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate script');
  return data.script;
}

export async function regenerateScene(scene, topic, style, feedback) {
  const res = await fetch(`${BASE_URL}/regenerate-scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, topic, style, feedback }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to regenerate scene');
  return data.scene;
}

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}
