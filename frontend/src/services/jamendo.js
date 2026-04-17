// Jamendo free music API — https://devportal.jamendo.com (free client_id)
const BASE = 'https://api.jamendo.com/v3.0';

const KEY_NAME = 'jamendo_client_id';
export const getJamendoKey  = () => localStorage.getItem(KEY_NAME) || '';
export const saveJamendoKey = v => localStorage.setItem(KEY_NAME, v.trim());

// Mood → Jamendo tags mapping
const MOOD_TAGS = {
  trending:  'pop',
  punjabi:   'world',
  bollywood: 'world',
  hiphop:    'hiphop',
  calm:      'relaxing',
  cinematic: 'cinematic',
  energetic: 'energetic',
  all:       '',
};

export async function fetchJamendoTracks(category = 'all', limit = 30) {
  const clientId = getJamendoKey();
  if (!clientId) throw new Error('NO_KEY');

  const tag = MOOD_TAGS[category] || '';
  const params = new URLSearchParams({
    client_id:     clientId,
    format:        'json',
    limit:         String(limit),
    audiodlformat: 'mp31',
    ...(tag ? { tags: tag } : {}),
  });

  const res = await fetch(`${BASE}/tracks/?${params}`);
  if (!res.ok) throw new Error(`Jamendo API error ${res.status}`);
  const data = await res.json();

  return (data.results || []).map(t => ({
    id:       `j_${t.id}`,
    title:    t.name,
    artist:   t.artist_name,
    duration: formatDuration(t.duration),
    url:      t.audio,               // direct streamable MP3
    category,
    tags:     [category],
    emoji:    categoryEmoji(category),
  }));
}

export async function searchJamendoTracks(query, limit = 20) {
  const clientId = getJamendoKey();
  if (!clientId) throw new Error('NO_KEY');

  const params = new URLSearchParams({
    client_id:     clientId,
    format:        'json',
    limit:         String(limit),
    audiodlformat: 'mp31',
    namesearch:    query,
  });

  const res = await fetch(`${BASE}/tracks/?${params}`);
  if (!res.ok) throw new Error(`Jamendo API error ${res.status}`);
  const data = await res.json();

  return (data.results || []).map(t => ({
    id:       `j_${t.id}`,
    title:    t.name,
    artist:   t.artist_name,
    duration: formatDuration(t.duration),
    url:      t.audio,
    category: 'all',
    tags:     ['all'],
    emoji:    '🎵',
  }));
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function categoryEmoji(cat) {
  const map = { trending:'🔥', punjabi:'🥁', bollywood:'🎬', hiphop:'🎤', calm:'🌊', cinematic:'🎞️', energetic:'⚡', all:'🎵' };
  return map[cat] || '🎵';
}
