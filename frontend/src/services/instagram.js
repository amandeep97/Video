// Instagram Graph API — reads YOUR OWN Business/Creator account insights.
// The app has no backend, so the long-lived token lives in localStorage,
// same pattern as the AI key and Pexels key.

const GRAPH = 'https://graph.facebook.com/v21.0';
const TOKEN_KEY = 'ig_token';
const ACCT_KEY = 'ig_account';

export function getIgToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function saveIgToken(t) {
  localStorage.setItem(TOKEN_KEY, (t || '').trim());
}
export function clearIg() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCT_KEY);
}
export function getCachedAccount() {
  try { return JSON.parse(localStorage.getItem(ACCT_KEY) || 'null'); } catch { return null; }
}
function cacheAccount(a) {
  try { localStorage.setItem(ACCT_KEY, JSON.stringify(a)); } catch {}
}

async function gget(path, params, token) {
  const url = new URL(`${GRAPH}/${path}`);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (data.error) {
    const e = data.error;
    throw new Error(e.message || `Instagram API error ${res.status}`);
  }
  if (!res.ok) throw new Error(`Instagram API error ${res.status}`);
  return data;
}

// Walk the user's Facebook Pages → find the connected IG Business account.
export async function discoverAccount(token) {
  const pages = await gget('me/accounts', { fields: 'name,instagram_business_account', limit: '50' }, token);
  const list = pages.data || [];
  for (const page of list) {
    const igRef = page.instagram_business_account;
    if (igRef?.id) {
      const ig = await gget(igRef.id, {
        fields: 'username,name,followers_count,media_count,profile_picture_url',
      }, token);
      const account = { id: igRef.id, page: page.name, ...ig };
      cacheAccount(account);
      return account;
    }
  }
  throw new Error(
    'No Instagram Business account found. Check that: (1) your IG account is set to Business or Creator, ' +
    '(2) it is linked to a Facebook Page, and (3) your token has the instagram_basic, instagram_manage_insights, ' +
    'pages_show_list and pages_read_engagement permissions.'
  );
}

export async function fetchMedia(igUserId, token, limit = 12) {
  const data = await gget(`${igUserId}/media`, {
    fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count',
    limit: String(limit),
  }, token);
  return data.data || [];
}

// Metric sets degrade gracefully — Graph rejects the whole call if one metric
// is unsupported for the media type / API version, so we retry with fewer.
const REEL_METRICS = ['reach', 'saved', 'shares', 'total_interactions', 'views', 'ig_reels_avg_watch_time'];
const POST_METRICS = ['reach', 'saved', 'shares', 'total_interactions', 'views'];
const MIN_METRICS  = ['reach', 'saved', 'shares'];

export async function fetchInsights(media, token) {
  const isReel = media.media_product_type === 'REELS' || media.media_type === 'VIDEO';
  const ladder = isReel ? [REEL_METRICS, POST_METRICS, MIN_METRICS] : [POST_METRICS, MIN_METRICS];
  for (const metrics of ladder) {
    try {
      const data = await gget(`${media.id}/insights`, { metric: metrics.join(',') }, token);
      const out = {};
      (data.data || []).forEach(m => { out[m.name] = m.values?.[0]?.value ?? 0; });
      return out;
    } catch { /* try a smaller metric set */ }
  }
  return null;
}

// Heuristic verdict tuned for a small/new account. Saves + shares relative to
// reach are what the algorithm rewards — likes barely matter.
export function verdictFor(media, ins) {
  if (!ins) return { tier: 'unknown', label: 'No data', color: 'slate', notes: ['Insights not available for this post yet.'] };

  const reach = ins.reach || 0;
  const saves = ins.saved || 0;
  const shares = ins.shares || 0;
  const views = ins.views || 0;
  const watch = ins.ig_reels_avg_watch_time ? ins.ig_reels_avg_watch_time / 1000 : 0; // ms → s

  const saveRate = reach ? (saves / reach) * 100 : 0;
  const shareRate = reach ? (shares / reach) * 100 : 0;
  const signal = saveRate + shareRate; // combined "worth-resharing" rate

  const notes = [];
  if (reach > 0) {
    notes.push(`Reached ${reach.toLocaleString()} accounts.`);
    notes.push(`${saveRate.toFixed(1)}% saved · ${shareRate.toFixed(1)}% shared.`);
  }
  if (watch) notes.push(`Avg watch time ${watch.toFixed(1)}s — ${watch >= 6 ? 'strong, the loop is holding people' : 'short, tighten the first 3 seconds'}.`);

  let tier, label, color;
  if (reach < 50) {
    tier = 'early'; label = 'Too early to judge'; color = 'slate';
    notes.push('Not enough reach yet — give it 24–48h before deciding.');
  } else if (signal >= 4) {
    tier = 'winner'; label = '🏆 Winner — make more like this'; color = 'green';
    notes.push('High save+share rate. Repeat this mood, hook style and song lane.');
  } else if (signal >= 1.5) {
    tier = 'solid'; label = '👍 Solid — worth iterating'; color = 'cyan';
    notes.push('Decent traction. Keep the format, sharpen the on-screen line.');
  } else {
    tier = 'weak'; label = '🔧 Weak — change the hook'; color = 'amber';
    notes.push('Low saves/shares. The first frame and first line aren\'t landing — make them more specific.');
  }

  return { tier, label, color, reach, saves, shares, views, watch, saveRate, shareRate, signal, notes };
}
