// Content pipeline — saved kits, production status, and posting streak.
// Everything lives in localStorage; there is no backend.

import { callAI } from './api.js';

const KEY = 'reel_kits';

export const STATUS = { TODO: 'todo', MADE: 'made', POSTED: 'posted' };

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  return list;
}

export function getKits() {
  return read().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function saveKit({ trend, kit }) {
  const list = read();
  const record = {
    id: `k_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    status: STATUS.TODO,
    postedAt: null,
    song: trend?.song || kit?.mood || 'Untitled',
    creators: trend?.creators || 1,
    totalViews: trend?.totalViews || 0,
    kit,
  };
  write([record, ...list]);
  return record;
}

export function isSaved(song) {
  return read().some(k => k.song === song);
}

export function updateKit(id, patch) {
  const list = read().map(k => (k.id === id ? { ...k, ...patch } : k));
  return write(list);
}

export function setStatus(id, status) {
  return updateKit(id, {
    status,
    postedAt: status === STATUS.POSTED ? Date.now() : null,
  });
}

export function deleteKit(id) {
  return write(read().filter(k => k.id !== id));
}

// ── streak ──────────────────────────────────────────────────────────────────
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function getStats() {
  const list = read();
  const posted = list.filter(k => k.status === STATUS.POSTED && k.postedAt);
  const days = new Set(posted.map(k => dayKey(k.postedAt)));

  // Count back from today; allow the streak to survive until tomorrow so a
  // day isn't "lost" until it actually ends.
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    total: list.length,
    todo: list.filter(k => k.status === STATUS.TODO).length,
    made: list.filter(k => k.status === STATUS.MADE).length,
    posted: posted.length,
    streak,
    postedToday: days.has(dayKey(Date.now())),
  };
}

// ── AI kit generation (shared by single + batch) ────────────────────────────
const KIT_SYSTEM = `You write viral Punjabi song-status video kits. You specialise in micro-moment specificity — the tiny exact behaviours that make someone stop scrolling and think "this is literally me." You know "ਤੇਰੀ ਯਾਦ" gets ignored but "'ਕਿਵੇਂ ਹੋ?' — 14 ਵਾਰ type ਕੀਤਾ, 14 ਵਾਰ delete" gets screenshotted and shared. BANNED phrases: ਤੇਰੀ ਯਾਦ, dil toot gaya, missing you, yaad aa raha, ਦਿਲ ਟੁੱਟਿਆ, broken heart, tenu bhulna.
Respond with valid JSON only — no markdown, no code fences.`;

function kitPrompt(trend, variantNote = '') {
  const sample = (trend.videos || []).map(v => v.title).join(' | ');
  return `A song is trending on YouTube Shorts RIGHT NOW: ${trend.creators} different creators remade it this week for ${(trend.totalViews || 0).toLocaleString()} combined views.
Song (from the top video title): "${trend.song}"
${sample ? `Sample titles of the winning versions: ${sample}` : ''}
${variantNote}

Create my own version's complete kit. Return ONLY this JSON:
{
  "mood": "one word — the emotional lane of this song (sad/love/funny/attitude/devotional)",
  "angle": "one sentence: the specific emotional angle my version should take to stand out from the ${trend.creators} existing versions",
  "overlays": [
    {"pa": "on-screen line in Gurmukhi (mixing English words like type/delete/last seen is good)", "translit": "roman transliteration"}
  ],
  "footage": ["4 varied Pexels search terms, 3-5 words each, matching the mood — NO rain on window"],
  "firstFrame": "exactly what the first 1 second must show to stop the scroll",
  "ytTitles": ["3 title options: Song || descriptor || WhatsApp Status keyword, ending #Shorts, under 90 chars"],
  "description": "2-3 line YouTube description with searchable status phrases",
  "hashtags": ["7 hashtags starting with #, include #Shorts and #whatsappstatus"],
  "igCaption": "short emotional Instagram caption in Punjabi + 8-10 hashtags on a new line"
}
Give exactly 6 overlays. They must tell one story in sequence, and the last one must loop back to the first.`;
}

export async function generateKit(trend, variantNote = '') {
  const out = await callAI(KIT_SYSTEM, kitPrompt(trend, variantNote), 2000);
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI returned an unexpected format — tap retry.');
  return JSON.parse(m[0]);
}

// Distinct angles so a batch doesn't produce six near-identical kits.
const VARIANTS = [
  'Make this version about the exact moment you realised it was over.',
  'Make this version about pretending to be fine in front of everyone else.',
  'Make this version about a small object or place that still holds the memory.',
  'Make this version about the phone — messages, last seen, photos, blocking.',
  'Make this version about time passing and the habit that never left.',
  'Make this version about seeing them happy without you.',
];

export async function generateBatch(trend, count, onProgress) {
  const results = [];
  for (let i = 0; i < count; i++) {
    try {
      const kit = await generateKit(trend, VARIANTS[i % VARIANTS.length]);
      const rec = saveKit({ trend, kit });
      results.push(rec);
    } catch {
      // Skip a failed variant rather than aborting the whole batch.
    }
    onProgress?.(i + 1, count);
  }
  return results;
}
