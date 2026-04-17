// Freesound.org API — free at freesound.org/apiv2
// Preview MP3s stream directly without auth once URL is obtained
const BASE = 'https://freesound.org/apiv2';

const KEY_NAME = 'freesound_api_key';
export const getFreesoundKey  = () => localStorage.getItem(KEY_NAME) || '';
export const saveFreesoundKey = v => localStorage.setItem(KEY_NAME, v.trim());

// Category → search query mapping (Freesound has real Indian music)
const CATEGORY_QUERIES = {
  punjabi:   'bhangra dhol punjabi',
  bollywood: 'bollywood hindi indian film music',
  hiphop:    'hiphop beat rap instrumental',
  calm:      'ambient relaxing calm meditation',
  cinematic: 'cinematic epic orchestral dramatic',
  energetic: 'energetic upbeat fast electronic',
  trending:  'popular music beat instrumental',
  all:       'music instrumental',
};

function mapTrack(t, category) {
  const preview = t.previews?.['preview-hq-mp3'] || t.previews?.['preview-lq-mp3'] || '';
  const secs    = Math.round(t.duration || 0);
  const m = Math.floor(secs / 60), s = secs % 60;
  return {
    id:       `fs_${t.id}`,
    title:    t.name?.replace(/\.(mp3|wav|ogg|aif)$/i, '') || 'Unknown',
    artist:   t.username || 'Freesound',
    duration: `${m}:${String(s).padStart(2, '0')}`,
    url:      preview,
    category,
    tags:     [category],
    emoji:    categoryEmoji(category),
  };
}

function categoryEmoji(cat) {
  const map = { punjabi:'🥁', bollywood:'🎬', hiphop:'🎤', calm:'🌊', cinematic:'🎞️', energetic:'⚡', trending:'🔥', all:'🎵' };
  return map[cat] || '🎵';
}

export async function fetchFreesoundTracks(category = 'all', limit = 30) {
  const token = getFreesoundKey();
  if (!token) throw new Error('NO_KEY');

  const query = CATEGORY_QUERIES[category] || 'music';
  const params = new URLSearchParams({
    query,
    fields:     'id,name,username,duration,previews',
    filter:     'duration:[30 TO 300] type:mp3',
    sort:       'downloads_desc',
    page_size:  String(limit),
    token,
  });

  const res = await fetch(`${BASE}/search/text/?${params}`);
  if (res.status === 401) throw new Error('INVALID_KEY');
  if (!res.ok) throw new Error(`Freesound error ${res.status}`);
  const data = await res.json();

  return (data.results || [])
    .filter(t => t.previews?.['preview-hq-mp3'])
    .map(t => mapTrack(t, category));
}

export async function searchFreesoundTracks(query, limit = 20) {
  const token = getFreesoundKey();
  if (!token) throw new Error('NO_KEY');

  const params = new URLSearchParams({
    query,
    fields:    'id,name,username,duration,previews',
    filter:    'duration:[30 TO 300]',
    sort:      'downloads_desc',
    page_size: String(limit),
    token,
  });

  const res = await fetch(`${BASE}/search/text/?${params}`);
  if (res.status === 401) throw new Error('INVALID_KEY');
  if (!res.ok) throw new Error(`Freesound error ${res.status}`);
  const data = await res.json();

  return (data.results || [])
    .filter(t => t.previews?.['preview-hq-mp3'])
    .map(t => mapTrack(t, 'all'));
}
