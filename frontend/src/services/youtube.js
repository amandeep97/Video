// YouTube Data API v3 — read-only public data with just an API key (no OAuth).
// Unlike Instagram, this can read ANY public channel/video, so competitor
// analysis is possible. Key stored in localStorage like the other keys.
//
// Free quota: 10,000 units/day. search.list = 100 units (~100 searches/day),
// videos.list & playlistItems = 1 unit each. Plenty for solo use.

const BASE = 'https://www.googleapis.com/youtube/v3';
const KEY_KEY = 'yt_key';
const CHAN_KEY = 'yt_channel';

export function getYtKey() { return localStorage.getItem(KEY_KEY) || ''; }
export function saveYtKey(k) { localStorage.setItem(KEY_KEY, (k || '').trim()); }
export function getCachedChannel() {
  try { return JSON.parse(localStorage.getItem(CHAN_KEY) || 'null'); } catch { return null; }
}
export function cacheChannel(c) { try { localStorage.setItem(CHAN_KEY, JSON.stringify(c)); } catch {} }
export function clearYtChannel() { localStorage.removeItem(CHAN_KEY); }

async function yget(path, params, key) {
  const url = new URL(`${BASE}/${path}`);
  Object.entries(params || {}).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  url.searchParams.set('key', key);
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(data.error.message || `YouTube API error ${res.status}`);
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  return data;
}

// ── duration helpers ────────────────────────────────────────────────────────
export function parseDuration(iso) {
  const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

function mapVideo(item) {
  const s = item.statistics || {};
  const dur = parseDuration(item.contentDetails?.duration);
  return {
    id: item.id?.videoId || item.id,
    title: item.snippet?.title || '',
    channel: item.snippet?.channelTitle || '',
    channelId: item.snippet?.channelId || '',
    thumb: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
    publishedAt: item.snippet?.publishedAt || '',
    views: +s.viewCount || 0,
    likes: +s.likeCount || 0,
    comments: +s.commentCount || 0,
    duration: dur,
    isShort: dur > 0 && dur <= 60,
    url: `https://youtube.com/watch?v=${item.id?.videoId || item.id}`,
  };
}

// ── channel resolution (handle / URL / ID / search) ─────────────────────────
function mapChannel(item) {
  const s = item.statistics || {};
  return {
    id: item.id,
    title: item.snippet?.title || '',
    handle: item.snippet?.customUrl || '',
    thumb: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
    subscribers: +s.subscriberCount || 0,
    totalViews: +s.viewCount || 0,
    videoCount: +s.videoCount || 0,
    uploads: item.contentDetails?.relatedPlaylists?.uploads || '',
  };
}

const CHANNEL_FIELDS = 'snippet,statistics,contentDetails';

async function getChannelById(id, key) {
  const data = await yget('channels', { part: CHANNEL_FIELDS, id }, key);
  if (!data.items?.length) throw new Error('Channel not found.');
  return mapChannel(data.items[0]);
}
async function getChannelByHandle(handle, key) {
  const data = await yget('channels', { part: CHANNEL_FIELDS, forHandle: handle.replace(/^@/, '') }, key);
  if (!data.items?.length) throw new Error('Channel not found for that handle.');
  return mapChannel(data.items[0]);
}
async function searchChannel(q, key) {
  const s = await yget('search', { part: 'snippet', q, type: 'channel', maxResults: '1' }, key);
  const cid = s.items?.[0]?.snippet?.channelId || s.items?.[0]?.id?.channelId;
  if (!cid) throw new Error('No channel found for that name.');
  return getChannelById(cid, key);
}

export async function resolveChannel(input, key) {
  let h = (input || '').trim();
  const urlHandle = h.match(/youtube\.com\/(@[\w.\-]+)/i);
  if (urlHandle) h = urlHandle[1];
  const urlId = h.match(/channel\/(UC[\w-]{22})/);
  if (urlId) return getChannelById(urlId[1], key);
  if (/^UC[\w-]{22}$/.test(h)) return getChannelById(h, key);
  if (h.startsWith('@')) return getChannelByHandle(h, key);
  return searchChannel(h, key);
}

// ── recent videos from a channel's uploads playlist ─────────────────────────
export async function fetchChannelVideos(uploadsPlaylistId, key, max = 15) {
  if (!uploadsPlaylistId) return [];
  const pl = await yget('playlistItems', {
    part: 'contentDetails', playlistId: uploadsPlaylistId, maxResults: String(max),
  }, key);
  const ids = (pl.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const vids = await yget('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') }, key);
  return (vids.items || []).map(mapVideo);
}

// ── trending (most popular) for a region ────────────────────────────────────
export async function fetchTrending(regionCode, key, max = 20) {
  const data = await yget('videos', {
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode: regionCode || 'IN',
    maxResults: String(max),
  }, key);
  return (data.items || []).map(mapVideo);
}

// ── competitor search ───────────────────────────────────────────────────────
export async function searchVideos(query, key, { shortsOnly = true, max = 20, order = 'relevance', publishedAfter, relevanceLanguage, regionCode = 'IN' } = {}) {
  const s = await yget('search', {
    part: 'snippet', q: query, type: 'video',
    order, maxResults: String(max),
    videoDuration: shortsOnly ? 'short' : undefined,
    publishedAfter, relevanceLanguage, regionCode,
  }, key);
  const ids = (s.items || []).map(i => i.id?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const vids = await yget('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') }, key);
  return (vids.items || []).map(mapVideo).sort((a, b) => b.views - a.views);
}

// ── verdict (public-data heuristic) ─────────────────────────────────────────
export function engagementRate(v) {
  return v.views ? ((v.likes + v.comments) / v.views) * 100 : 0;
}

// For your own channel: a video is a "winner" if it beats your channel's
// typical performance. Pass the median views of the set as the baseline.
export function verdictForOwn(v, baselineViews) {
  const er = engagementRate(v);
  const ratio = baselineViews ? v.views / baselineViews : 1;
  const notes = [
    `${v.views.toLocaleString()} views · ${v.likes.toLocaleString()} likes · ${v.comments.toLocaleString()} comments`,
    `Engagement ${er.toFixed(1)}% — ${er >= 4 ? 'strong' : er >= 1.5 ? 'okay' : 'weak, the hook/title isn\'t landing'}.`,
  ];
  let tier, label, color;
  if (v.views < 100) { tier = 'early'; label = 'Too early'; color = 'slate'; notes.push('Give it a few days.'); }
  else if (ratio >= 2 && er >= 2) { tier = 'winner'; label = '🏆 Breakout — repeat this'; color = 'green'; notes.push(`${ratio.toFixed(1)}× your usual views. Copy this title style + mood.`); }
  else if (ratio >= 0.8) { tier = 'solid'; label = '👍 Solid'; color = 'cyan'; notes.push('Around your normal. Sharpen the title to push it.'); }
  else { tier = 'weak'; label = '🔧 Underperformed'; color = 'amber'; notes.push('Below your usual. Rework the first frame and title.'); }
  return { ...v, er, ratio, tier, label, color, notes };
}

export function median(nums) {
  const a = [...nums].sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
