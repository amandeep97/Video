import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ClipboardCopy, Check, Search } from 'lucide-react';
import { callAI } from '../services/api.js';

// ── Shared data ──────────────────────────────────────────────────────────────

const UPCOMING_EVENTS = [
  { name: 'Eid ul-Adha', date: '2026-05-27', category: 'Festival', angle: 'food, family, giving, sacrifice, community' },
  { name: 'World Environment Day', date: '2026-06-05', category: 'Global', angle: 'sustainability, eco-products, nature' },
  { name: "Father's Day", date: '2026-06-21', category: 'Occasion', angle: 'gratitude, gifts, relationships, money for family' },
  { name: 'International Yoga Day', date: '2026-06-21', category: 'Health', angle: 'fitness, wellness, mental health, morning routine' },
  { name: 'Independence Day', date: '2026-08-15', category: 'National', angle: 'patriotism, Made in India, history, freedom' },
  { name: 'Ganesh Chaturthi', date: '2026-08-20', category: 'Festival', angle: 'celebration, food, community, decoration, business' },
  { name: 'Navratri', date: '2026-09-25', category: 'Festival', angle: 'dance, fashion, fasting, devotion, shopping' },
  { name: 'Dussehra', date: '2026-10-02', category: 'Festival', angle: 'good vs evil, victory, new beginnings, burning bad habits' },
  { name: 'Diwali', date: '2026-10-20', category: 'Festival', angle: 'lights, gifts, money, sweets, family, investments' },
  { name: 'New Year 2027', date: '2027-01-01', category: 'Global', angle: 'resolutions, goals, reflection, habits, new start' },
];

const CONFESSION_SUBS = {
  'Personal Finance': ['personalfinanceindia', 'IndiaInvestments', 'india', 'povertyfinance'],
  'Fitness & Health': ['india', 'loseit', 'progresspics', 'fitness'],
  'Technology': ['india', 'indiantech', 'startups', 'cscareerquestions'],
  'Business': ['india', 'startups', 'entrepreneur', 'smallbusiness'],
  'Relationships': ['india', 'relationship_advice', 'AITA'],
  'Food & Cooking': ['india', 'IndianFood', 'EatCheapAndHealthy'],
  'Travel': ['india', 'solotravel', 'travel'],
  'Education': ['india', 'developersIndia', 'learnprogramming'],
};

async function fetchRedditStories(niche) {
  const subs = CONFESSION_SUBS[niche] || ['india'];
  const storyPosts = [];
  const allPosts = [];

  // Try Reddit without custom headers (reduces CORS preflight issues)
  for (const sub of subs.slice(0, 3)) {
    for (const url of [
      `https://www.reddit.com/r/${sub}/hot.json?limit=30`,
      `https://old.reddit.com/r/${sub}/hot.json?limit=30`,
    ]) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const posts = data?.data?.children || [];
        if (posts.length === 0) continue;
        posts.forEach(p => {
          const title = (p.data?.title || '').trim();
          if (title.length < 15) return;
          const lower = title.toLowerCase();
          const isPersonal =
            /\bi\b/.test(lower) || lower.startsWith('i ') ||
            lower.includes("i'm") || lower.includes('i was') ||
            lower.includes('my ') || lower.includes('how i') ||
            lower.includes('lost ') || lower.includes('saved ') ||
            lower.includes('failed') || lower.includes('story') ||
            lower.includes('advice') || lower.includes('should i') ||
            lower.includes('anyone else') || lower.includes('experience');
          if (isPersonal) storyPosts.push({ title, sub: `r/${sub}` });
          else allPosts.push({ title, sub: `r/${sub}` });
        });
        break; // this URL worked, skip the next one for this sub
      } catch {}
    }
    if (storyPosts.length >= 8) break;
  }

  // Fallback: Google News for real stories (always works via rss2json)
  if (storyPosts.length + allPosts.length < 4) {
    try {
      const q = encodeURIComponent(`${niche} personal story experience India`);
      const rssUrl = encodeURIComponent(`https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN`);
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
      const data = await res.json();
      (data.items || []).slice(0, 8).forEach(item => {
        if (item.title && item.title.length > 15) {
          allPosts.push({ title: item.title, sub: 'Google News' });
        }
      });
    } catch {}
  }

  return [...storyPosts, ...allPosts].slice(0, 10);
}

// ── Shared copy button ───────────────────────────────────────────────────────

function CopyBtn({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 transition-all ${className}`}>
      {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><ClipboardCopy className="w-3.5 h-3.5" /> Copy</>}
    </button>
  );
}

function ScriptBlock({ label, color, script }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-mono ${color}`}>{label}</span>
        <CopyBtn text={script} className={`py-1.5 px-3 rounded-lg text-xs border ${
          color.includes('amber') ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
          color.includes('cyan') ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' :
          color.includes('rose') ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' :
          'bg-purple-500/20 border-purple-500/30 text-purple-300'
        }`} />
      </div>
      <pre className="whitespace-pre-wrap text-xs text-white/70 leading-relaxed max-h-96 overflow-y-auto">{script}</pre>
    </div>
  );
}

// ── Tab 1: Viral DNA Cloner ──────────────────────────────────────────────────

const DNA_DURATIONS = [
  { id: '15s',  label: '15s',   scenes: 1, note: 'Story / TikTok' },
  { id: '30s',  label: '30s',   scenes: 2, note: 'Short Reel' },
  { id: '60s',  label: '60s',   scenes: 3, note: 'Standard Reel' },
  { id: '3min', label: '3 min', scenes: 6, note: 'YouTube Short-long' },
  { id: '10min',label: '10 min',scenes: 10,note: 'YouTube Long-form' },
];

function DNACloner() {
  const [videoUrl, setVideoUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [userTopic, setUserTopic] = useState('');
  const [duration, setDuration] = useState('60s');
  const [videoMeta, setVideoMeta] = useState(null);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchMeta = async () => {
    if (!videoUrl.trim()) return;
    setFetchingMeta(true);
    setVideoMeta(null);
    setMetaError('');
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVideoMeta({ title: data.title, author: data.author_name });
    } catch {
      setMetaError('Could not read video. Paste the title manually below.');
    } finally {
      setFetchingMeta(false);
    }
  };

  const generate = async () => {
    const title = videoMeta?.title || manualTitle;
    if (!title || !userTopic) return;
    setGenerating(true);
    setScript('');
    setError('');

    const dur = DNA_DURATIONS.find(d => d.id === duration) || DNA_DURATIONS[2];
    const totalSecs = duration === '3min' ? 180 : duration === '10min' ? 600 : parseInt(duration);
    const sceneLines = dur.scenes <= 1
      ? `【SCENE — 0:03 to ${totalSecs - 5}s】
SPEAK: "[main content using same delivery technique]"
TEXT ON SCREEN: "[key point]"
VISUAL: [b-roll suggestion]`
      : Array.from({ length: dur.scenes }, (_, i) => {
          const start = Math.round(3 + i * (totalSecs - 8) / dur.scenes);
          const end = Math.round(3 + (i + 1) * (totalSecs - 8) / dur.scenes);
          return `【SCENE ${i + 1} — ${start}s to ${end}s】
SPEAK: "[narration — same style as original]"
TEXT ON SCREEN: "[key point]"
VISUAL: [visual suggestion]`;
        }).join('\n\n');

    const prompt = `You are a viral content analyst and scriptwriter.

VIRAL VIDEO TITLE: "${title}"
${videoMeta?.author ? `CHANNEL: ${videoMeta.author}` : ''}
TARGET DURATION: ${duration} total

STEP 1 — Extract the psychological DNA of this video. Based on the title, infer:
- What hook type / technique grabs attention in the first 3 seconds
- What emotional journey the video takes the viewer on
- What structural beats make people keep watching
- Why people share or comment

STEP 2 — Write a brand new ${duration} script for MY TOPIC using the EXACT same structural DNA. Include exactly ${dur.scenes} scene(s) plus hook and CTA.

MY TOPIC: ${userTopic}

Output EXACTLY in this format:

🧬 VIRAL DNA EXTRACTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hook Type: [type]
0–3s: [psychological technique]
Why people share: [core psychological driver]
Emotional arc: [emotion → emotion → emotion]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 YOUR ${duration} SCRIPT — SAME DNA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎬 TITLE: [title using the same hook pattern]
⏱ DURATION: ${duration}

【HOOK — 0:00 to 0:03】
SPEAK: "[exact opening words — uses same hook type as original]"
TEXT ON SCREEN: "[3–5 word bold overlay]"
VISUAL: [describe what to show]

${sceneLines}

【CTA — last 5 seconds】
SPEAK: "[CTA using same urgency technique as original]"
TEXT ON SCREEN: "[CTA overlay]"

━━━ CAPTION ━━━
[Engaging caption]
[10 hashtags]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    try {
      const result = await callAI(prompt, 'Extract viral DNA and write the cloned script.', 2500);
      setScript(result);
    } catch {
      setError('Failed to generate. Check your API key in Settings.');
    } finally {
      setGenerating(false);
    }
  };

  const hasTitle = videoMeta?.title || manualTitle;

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div>
          <label className="text-xs text-white/40 mb-2 block">Paste a viral YouTube URL</label>
          <div className="flex gap-2">
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="input-field flex-1 text-sm" />
            <button onClick={fetchMeta} disabled={fetchingMeta || !videoUrl.trim()}
              className="btn-secondary px-4 shrink-0 disabled:opacity-40">
              {fetchingMeta ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {videoMeta && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <div className="text-xs text-green-400 mb-0.5">✓ Video found — AI will extract its viral structure</div>
            <p className="font-medium text-sm text-white">{videoMeta.title}</p>
            <p className="text-xs text-white/40">{videoMeta.author}</p>
          </div>
        )}

        {!videoMeta && (
          <div>
            <label className="text-xs text-white/40 mb-2 block">
              {metaError ? `⚠️ ${metaError}` : 'Or paste the video title manually (Instagram / TikTok / any platform):'}
            </label>
            <input value={manualTitle} onChange={e => setManualTitle(e.target.value)}
              placeholder="e.g. I invested ₹500/month for 3 years — here's what happened"
              className="input-field text-sm" />
          </div>
        )}

        <div className={videoMeta ? 'bg-brand-500/10 border border-brand-500/30 rounded-xl p-3' : ''}>
          {videoMeta && (
            <div className="text-xs text-brand-400 mb-2">
              ↓ Now enter YOUR topic — we'll write it using the same viral blueprint
            </div>
          )}
          <label className="text-xs text-white/40 mb-2 block">
            {videoMeta ? 'Your topic:' : 'Your topic (we\'ll write this using the same viral structure)'}
          </label>
          <input value={userTopic} onChange={e => setUserTopic(e.target.value)}
            placeholder="e.g. How I paid off my debt in 8 months"
            className="input-field text-sm" />
        </div>

        {/* Duration picker */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Script Duration</label>
          <div className="flex flex-wrap gap-2">
            {DNA_DURATIONS.map(d => (
              <button key={d.id} onClick={() => setDuration(d.id)}
                title={d.note}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                  duration === d.id
                    ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                    : 'glass glass-hover text-white/50 border border-transparent'
                }`}>
                {d.label}
                <span className="text-white/30 ml-1 hidden sm:inline">· {d.note}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={generating || !hasTitle || !userTopic}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          {generating
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Extracting DNA & writing {duration}...</>
            : <>🧬 Clone as {duration} Script</>}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {script && <ScriptBlock label="🧬 DNA + YOUR CLONED SCRIPT" color="text-purple-400" script={script} />}
    </div>
  );
}

// ── Tab 2: Trend Predictor ───────────────────────────────────────────────────

function TrendPredictor({ niche, setNiche }) {
  const [predictions, setPredictions] = useState([]);
  const [earlySignals, setEarlySignals] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();

  const upcoming = UPCOMING_EVENTS
    .filter(e => new Date(e.date) > today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 7)
    .map(e => {
      const eventDate = new Date(e.date);
      const daysUntil = Math.ceil((eventDate - today) / 86400000);
      const postDate = new Date(eventDate);
      postDate.setDate(postDate.getDate() - 7);
      const postDaysLeft = Math.ceil((postDate - today) / 86400000);
      return {
        ...e, daysUntil, postDaysLeft,
        postBy: postDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      };
    });

  const analyze = async () => {
    setLoading(true);
    setPredictions([]);
    setEarlySignals([]);

    try {
      const res = await fetch('https://www.reddit.com/r/india/rising.json?limit=10', {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      const signals = (data?.data?.children || [])
        .map(p => p.data?.title)
        .filter(Boolean)
        .slice(0, 5);
      setEarlySignals(signals);
    } catch {}

    const eventList = upcoming.map(e => `${e.name} on ${e.date} (${e.daysUntil} days away)`).join('; ');

    const prompt = `You are a content trend predictor for Indian social media creators.

NICHE: ${niche}
TODAY: ${today.toISOString().split('T')[0]}
UPCOMING EVENTS: ${eventList}

Give 5 specific content trend predictions — what will blow up, when, and exactly what angle to take. Be very specific, not generic.

Return ONLY valid JSON array:
[{
  "trend": "specific topic that will blow up",
  "peakDate": "YYYY-MM-DD",
  "postBy": "YYYY-MM-DD",
  "reason": "why this will trend — 15 words max",
  "angle": "the specific unique angle for ${niche} creators",
  "urgency": "high",
  "platform": "Instagram"
}]`;

    try {
      const raw = await callAI(prompt, 'Predict upcoming content trends.', 1200);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) setPredictions(JSON.parse(match[0]));
    } catch {}
    setLoading(false);
  };

  const niches = Object.keys(CONFESSION_SUBS);

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="text-xs text-white/40 font-mono mb-3">📅 POST BEFORE THESE DATES — don't be late</div>
        <div className="space-y-2">
          {upcoming.map(e => (
            <div key={e.name} className={`flex items-center justify-between p-3 rounded-xl border ${
              e.postDaysLeft <= 5 ? 'border-red-500/40 bg-red-500/5' :
              e.postDaysLeft <= 14 ? 'border-amber-500/30 bg-amber-500/5' :
              'border-white/10 glass'
            }`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    e.postDaysLeft <= 5 ? 'bg-red-500/20 text-red-400' :
                    e.postDaysLeft <= 14 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-white/10 text-white/40'
                  }`}>{e.category}</span>
                  <span className="font-medium text-sm text-white">{e.name}</span>
                </div>
                <p className="text-xs text-white/30 mt-0.5 truncate">{e.angle}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-xs text-white/30">Post by</div>
                <div className="font-bold text-amber-400 text-sm">{e.postBy}</div>
                <div className="text-xs text-white/30">{e.daysUntil}d away</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <label className="text-xs text-white/40 block">Your niche (for AI predictions)</label>
        <div className="flex flex-wrap gap-2">
          {niches.map(n => (
            <button key={n} onClick={() => setNiche(n)}
              className={`py-1.5 px-3 rounded-lg text-xs transition-all ${
                niche === n
                  ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300'
                  : 'glass glass-hover text-white/50 border border-transparent'
              }`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={analyze} disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing signals...</>
            : <>🔮 Predict Next 30 Days for {niche}</>}
        </button>
      </div>

      {earlySignals.length > 0 && (
        <div className="card">
          <div className="text-xs text-white/40 font-mono mb-2">📡 EARLY SIGNALS — rising on Reddit right now</div>
          <div className="space-y-1.5">
            {earlySignals.map((s, i) => (
              <div key={i} className="text-xs text-white/60 py-1.5 border-b border-white/5 last:border-0">{s}</div>
            ))}
          </div>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="space-y-3">
          {predictions.map((p, i) => (
            <div key={i} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-bold text-sm text-white">{p.trend}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                  p.urgency === 'high' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                  p.urgency === 'medium' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                  'bg-green-500/20 border-green-500/30 text-green-400'
                }`}>{p.urgency}</span>
              </div>
              <p className="text-xs text-white/50 mb-3">{p.reason}</p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-3">
                <div className="text-xs text-amber-400 mb-1">💡 Your Angle</div>
                <p className="text-sm text-white">{p.angle}</p>
              </div>
              <div className="flex gap-5 text-xs">
                <div><span className="text-white/30">Post by: </span><span className="text-amber-400 font-bold">{p.postBy}</span></div>
                <div><span className="text-white/30">Peak: </span><span className="text-white/60">{p.peakDate}</span></div>
                <div><span className="text-white/30">Platform: </span><span className="text-white/60">{p.platform}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Confession Engine ─────────────────────────────────────────────────

function ConfessionEngine({ niche, setNiche }) {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);
  const [selected, setSelected] = useState('');
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [manualStory, setManualStory] = useState('');

  const niches = Object.keys(CONFESSION_SUBS);

  const fetchPosts = async () => {
    setLoading(true);
    setConfessions([]);
    setSelected('');
    setScript('');
    setFetchDone(false);
    const results = await fetchRedditStories(niche);
    setConfessions(results);
    setFetchDone(true);
    setLoading(false);
  };

  const generate = async () => {
    const storyText = selected || manualStory.trim();
    if (!storyText) return;
    setGenerating(true);
    setScript('');
    setError('');

    const prompt = `You are a viral video scriptwriter who builds scripts around real human stories.

REAL STORY:
"${storyText}"

MY NICHE: ${niche}
MY CONTENT ANGLE: ${topic || niche}

Write a complete video script that opens with this real person's story (anonymize it — don't use any names) and builds into my content. This works because it's a REAL experience, not AI fiction. The audience immediately connects.

═══════════════════════════════════════
📋 AUTHENTIC STORY SCRIPT
═══════════════════════════════════════
🎬 TITLE: [title that hints at the real story]
📖 Based on: Real story (source anonymized)

【HOOK — 0:00 to 0:05】
SPEAK: "Someone shared this with me recently... [open with the real story, anonymized, make it emotional]"
TEXT ON SCREEN: [the most emotional line from the story]
VISUAL: [text on screen + person reacting / thinking]

【STORY BUILD — 0:05 to 0:20】
SPEAK: [continue the story — add context, build tension, make the audience feel it]
TEXT ON SCREEN: [key emotional line]
VISUAL: [relatable visual]

【THE PIVOT — 0:20 to 0:35】
SPEAK: ["Here's what nobody told them..." or "This happens because..." — bridge from story to insight]
TEXT ON SCREEN: [the key insight]
VISUAL: [visual showing the problem/solution]

【THE VALUE — 0:35 to 0:52】
SPEAK: [give real actionable value — what the viewer should do differently]
TEXT ON SCREEN: [3 key points or 1 big insight]
VISUAL: [visual suggestion]

【CTA — 0:52 to end】
SPEAK: ["Have you ever been in this situation? Tell me in the comments." — this triggers massive engagement]
TEXT ON SCREEN: [CTA text]

━━━ CAPTION ━━━
[2-3 sentences referencing the real story + ask if audience relates]
[10 hashtags]
═══════════════════════════════════════`;

    try {
      const result = await callAI(prompt, 'Write the authentic story-based script.', 2200);
      setScript(result);
    } catch {
      setError('Failed to generate. Check your API key.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <label className="text-xs text-white/40 block">Niche (to find relevant real stories)</label>
        <div className="flex flex-wrap gap-2">
          {niches.map(n => (
            <button key={n} onClick={() => setNiche(n)}
              className={`py-1.5 px-3 rounded-lg text-xs transition-all ${
                niche === n
                  ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                  : 'glass glass-hover text-white/50 border border-transparent'
              }`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={fetchPosts} disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Finding real stories...</>
            : <>💬 Find Real Confessions</>}
        </button>
      </div>

      {confessions.length > 0 && (
        <div className="card space-y-2">
          <div className="text-xs text-white/40 font-mono mb-1">🔍 REAL POSTS — tap one to build your script</div>
          {confessions.map((c, i) => (
            <button key={i} onClick={() => { setSelected(c.title); setManualStory(''); }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selected === c.title
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-white/10 glass glass-hover'
              }`}>
              <p className="text-sm text-white leading-snug">{c.title}</p>
              <p className="text-xs text-white/30 mt-1">{c.sub}</p>
            </button>
          ))}
        </div>
      )}

      {fetchDone && confessions.length === 0 && (
        <div className="card text-center py-6">
          <div className="text-2xl mb-2">🔌</div>
          <p className="text-white/50 text-sm mb-1">Reddit blocked this request</p>
          <p className="text-white/30 text-xs">Paste a real story manually below — from Reddit, news, or something you heard</p>
        </div>
      )}

      {(fetchDone || confessions.length > 0) && (
        <div className="card space-y-3">
          <div className="text-xs text-white/40 mb-1">Or paste any real story you found (Reddit, news, something someone told you):</div>
          <textarea
            value={manualStory}
            onChange={e => { setManualStory(e.target.value); setSelected(''); }}
            placeholder="e.g. Someone posted: 'I earned ₹80,000/month but had zero savings at 30. Here's what I was doing wrong...'"
            className="input-field text-sm resize-none h-20"
          />
        </div>
      )}

      {(selected || manualStory.trim()) && (
        <div className="card space-y-3">
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
            <div className="text-xs text-cyan-400 mb-1">Building script around this story</div>
            <p className="text-sm text-white">{selected || manualStory}</p>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-2 block">Your content angle (optional)</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Why most people never build savings"
              className="input-field text-sm" />
          </div>
          <button onClick={generate} disabled={generating}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Writing script...</>
              : <>✍️ Build Script Around This Story</>}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}

      {script && <ScriptBlock label="📋 AUTHENTIC STORY SCRIPT" color="text-cyan-400" script={script} />}
    </div>
  );
}

// ── Tab 4: Only You Angle ────────────────────────────────────────────────────

function OnlyYouAngle() {
  const [profile, setProfile] = useState({
    city: '', background: '', failure: '', uniqueKnowledge: '', niche: '', audience: '',
  });
  const [angles, setAngles] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandedAngle, setExpandedAngle] = useState(null);
  const [scriptLoading, setScriptLoading] = useState(null);
  const [scripts, setScripts] = useState({});

  const fields = [
    { key: 'city', label: 'Your city / region', placeholder: 'e.g. Ludhiana, Punjab' },
    { key: 'background', label: 'Your background or job', placeholder: 'e.g. Factory worker, Engineering student, Housewife, Shop owner' },
    { key: 'failure', label: 'One real thing you tried and failed at', placeholder: 'e.g. Tried dropshipping, lost ₹15,000. Tried gym for 2 months then quit.' },
    { key: 'uniqueKnowledge', label: 'One thing YOU know that most creators in your niche don\'t', placeholder: 'e.g. I know how textile suppliers in Ludhiana actually price things' },
    { key: 'niche', label: 'Your content niche', placeholder: 'e.g. Personal Finance, Fitness, Food, Business' },
    { key: 'audience', label: 'Who you want to reach', placeholder: 'e.g. Young Punjabi men 18-25 who want financial freedom' },
  ];

  const generate = async () => {
    setGenerating(true);
    setAngles([]);
    setError('');

    const prompt = `You are a personal brand strategist finding content angles ONLY this specific creator can make.

CREATOR PROFILE:
City/Region: ${profile.city}
Background: ${profile.background}
A real failure they had: ${profile.failure}
Unique knowledge they have: ${profile.uniqueKnowledge}
Content niche: ${profile.niche}
Target audience: ${profile.audience}

Find 5 content angles that NO OTHER CREATOR can authentically replicate. Each angle must come directly from the intersection of their background, location, failure, and unique knowledge. Generic angles are wrong — they must be hyper-specific to this person.

Return ONLY valid JSON array:
[{
  "angle": "the specific content angle",
  "whyOnlyYou": "why no other creator can make this authentically — 1 sentence, very specific",
  "hookLine": "exact opening spoken words for this video",
  "seriesPotential": "how this becomes a recurring content series — 1 sentence",
  "loyaltyFactor": "why this builds loyal audience vs just views — 1 sentence",
  "title": "exact video title"
}]`;

    try {
      const raw = await callAI(prompt, 'Find unique personal content angles.', 1400);
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) { setAngles(JSON.parse(match[0])); setExpandedAngle(0); }
      else throw new Error();
    } catch {
      setError('Failed to generate. Check your API key.');
    } finally {
      setGenerating(false);
    }
  };

  const generateScript = async (a, idx) => {
    setScriptLoading(idx);
    const prompt = `Write a complete viral video script for this angle that ONLY this creator can authentically make.

CREATOR: From ${profile.city}, background: ${profile.background}
FAILURE THEY HAD: ${profile.failure}
UNIQUE KNOWLEDGE: ${profile.uniqueKnowledge}
ANGLE: ${a.angle}
WHY ONLY THEM: ${a.whyOnlyYou}
TITLE: ${a.title}
HOOK: ${a.hookLine}
AUDIENCE: ${profile.audience}

Write in their authentic raw voice — NOT polished, NOT generic. Specific to their real life and location.

═══════════════════════════════════════
📋 YOUR AUTHENTIC SCRIPT
═══════════════════════════════════════
🎬 TITLE: ${a.title}
🎯 WHY ONLY YOU: ${a.whyOnlyYou}

【HOOK — 0:00 to 0:04】
SPEAK: "${a.hookLine}"
TEXT ON SCREEN: [bold overlay specific to their world]
VISUAL: [visual specific to their city/life — not generic stock footage]

【YOUR STORY — 0:04 to 0:20】
SPEAK: [personal story using their specific background, city, failure — raw and real]
TEXT ON SCREEN: [key emotional line]
VISUAL: [visual from their actual world]

【THE INSIGHT — 0:20 to 0:40】
SPEAK: [the unique knowledge only they have — specific details, not vague tips]
TEXT ON SCREEN: [the key insight]
VISUAL: [visual showing the insight]

【PROOF — 0:40 to 0:55】
SPEAK: [specific proof from their own experience — real numbers, real dates, real places]
TEXT ON SCREEN: [the proof]
VISUAL: [visual suggestion]

【CTA — 0:55 to end】
SPEAK: [CTA that connects to their specific community — local, relatable]
TEXT ON SCREEN: [CTA text]

━━━ CAPTION ━━━
[Authentic caption in their real voice — not corporate, not generic]
[10 hashtags — include local/regional tags]
═══════════════════════════════════════`;

    try {
      const result = await callAI(prompt, 'Write the authentic personal script.', 2000);
      setScripts(prev => ({ ...prev, [idx]: result }));
    } catch {}
    setScriptLoading(null);
  };

  const filled = profile.niche.trim() && profile.city.trim();

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <p className="text-xs text-white/40 leading-relaxed">
          The more specific and real your answers, the better. Generic answers = generic angles. Real details = content nobody can copy.
        </p>
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-xs text-white/40 mb-1.5 block">{f.label}</label>
            <input
              value={profile[f.key]}
              onChange={e => setProfile(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="input-field text-sm"
            />
          </div>
        ))}
        <button onClick={generate} disabled={generating || !filled}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          {generating
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Finding your angles...</>
            : <>🎯 Find My Unique Angles</>}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {angles.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-white/40 font-mono text-center">🎯 ANGLES ONLY YOU CAN MAKE</div>
          {angles.map((a, i) => (
            <div key={i} className={`rounded-2xl border overflow-hidden ${
              expandedAngle === i ? 'border-rose-500/40 ring-1 ring-rose-500/10' : 'border-white/10'
            }`}>
              <button className="w-full text-left p-4 glass glass-hover"
                onClick={() => setExpandedAngle(expandedAngle === i ? null : i)}>
                <p className="font-bold text-sm text-white mb-1">{a.title}</p>
                <p className="text-xs text-rose-400 leading-snug">{a.whyOnlyYou}</p>
              </button>
              {expandedAngle === i && (
                <div className="border-t border-white/10 p-4 space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <div className="text-xs text-amber-400 mb-1">🎬 Opening Hook</div>
                    <p className="text-sm text-white italic">"{a.hookLine}"</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="glass p-2.5 rounded-lg">
                      <div className="text-white/30 mb-0.5">Series Potential</div>
                      <p className="text-white/70">{a.seriesPotential}</p>
                    </div>
                    <div className="glass p-2.5 rounded-lg">
                      <div className="text-white/30 mb-0.5">Why it builds loyal audience</div>
                      <p className="text-white/70">{a.loyaltyFactor}</p>
                    </div>
                  </div>
                  <button onClick={() => generateScript(a, i)} disabled={scriptLoading === i}
                    className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                    {scriptLoading === i
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Writing...</>
                      : <>✍️ Write My Script for This Angle</>}
                  </button>
                  {scripts[i] && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-rose-400 font-mono">📋 AUTHENTIC SCRIPT</span>
                        <CopyBtn text={scripts[i]}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs" />
                      </div>
                      <pre className="whitespace-pre-wrap text-xs text-white/70 leading-relaxed max-h-80 overflow-y-auto bg-black/20 rounded-xl p-3">
                        {scripts[i]}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dna',     label: '🧬 DNA Cloner',    short: 'DNA',     desc: 'Clone the psychological structure of any viral video' },
  { id: 'predict', label: '🔮 Trend Predict',  short: 'Predict', desc: 'Post before the trend peaks — not after everyone else rushes in' },
  { id: 'confess', label: '💬 Real Stories',   short: 'Stories', desc: 'Scripts built from real human confessions — not AI fiction' },
  { id: 'onlyyou', label: '🎯 Only You',       short: 'Only You',desc: 'Find the angle that is impossible for any other creator to authentically copy' },
];

export default function ScriptLab() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dna');
  const [niche, setNiche] = useState('Personal Finance');

  const activeDesc = TABS.find(t => t.id === activeTab)?.desc || '';

  return (
    <div className="min-h-screen bg-dark-950 bg-grid overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-lg">
              🧬
            </div>
            <span className="text-xl font-bold gradient-text">Script Lab</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">

        {/* Tab bar */}
        <div className="flex gap-1 mb-2 glass rounded-xl p-1.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              }`}>
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-white/30 text-center mb-8">{activeDesc}</p>

        {activeTab === 'dna'     && <DNACloner />}
        {activeTab === 'predict' && <TrendPredictor niche={niche} setNiche={setNiche} />}
        {activeTab === 'confess' && <ConfessionEngine niche={niche} setNiche={setNiche} />}
        {activeTab === 'onlyyou' && <OnlyYouAngle />}
      </div>
    </div>
  );
}
