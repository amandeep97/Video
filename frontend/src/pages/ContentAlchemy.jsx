import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Zap, ChevronRight, RefreshCw, Video, Sparkles, ArrowLeft, Star, Heart, ClipboardCopy, Check, X } from 'lucide-react';
import { callAI } from '../services/api.js';

const NICHES = [
  'Personal Finance', 'Fitness & Health', 'Food & Cooking', 'Travel',
  'Technology', 'Business & Startup', 'Education', 'Entertainment',
  'Fashion & Style', 'Mental Health', 'Gaming', 'Real Estate',
  'Relationships', 'Comedy', 'Spirituality',
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram Reels', emoji: '📸' },
  { id: 'youtube_short', label: 'YouTube Shorts', emoji: '▶️' },
  { id: 'youtube_long', label: 'YouTube Long', emoji: '🎬' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { id: 'twitter', label: 'Twitter/X', emoji: '🐦' },
];

const REGIONS = [
  { id: 'Punjab', label: 'Punjab' },
  { id: 'Delhi', label: 'Delhi' },
  { id: 'Mumbai', label: 'Mumbai' },
  { id: 'Bangalore', label: 'Bangalore' },
  { id: 'India', label: 'All India' },
  { id: 'Global', label: 'Global' },
];

const REGION_SUBS = {
  Punjab: ['punjab', 'india', 'cricket'],
  Delhi: ['delhi', 'india', 'IndianStreetFood'],
  Mumbai: ['mumbai', 'india', 'bollywood'],
  Bangalore: ['bangalore', 'india', 'indiantech'],
  India: ['india', 'cricket', 'bollywood', 'IndiaInvestments'],
  Global: ['worldnews', 'technology', 'entertainment'],
};

const FORMAT_COLORS = {
  'what-if': 'from-purple-500 to-violet-700',
  'challenge': 'from-orange-500 to-red-600',
  'expose': 'from-red-600 to-rose-800',
  'gap-fill': 'from-blue-500 to-cyan-700',
  'analogy': 'from-green-500 to-teal-700',
};

const FORMAT_LABELS = {
  'what-if': '💭 What If',
  'challenge': '🔥 Challenge',
  'expose': '🚨 Dark Truth',
  'gap-fill': '🕳️ Gap Fill',
  'analogy': '🔗 Analogy',
};

const EMOTION_EMOJI = {
  curiosity: '🤔', anger: '😤', inspiration: '💪',
  humor: '😂', nostalgia: '🥹', FOMO: '😰',
};

const DURATIONS = [
  { id: '5s',   label: '5s',   scenes: 0, desc: 'Ultra short — hook only' },
  { id: '15s',  label: '15s',  scenes: 1, desc: 'Instagram Story / TikTok' },
  { id: '30s',  label: '30s',  scenes: 2, desc: 'Short Reel' },
  { id: '60s',  label: '60s',  scenes: 3, desc: 'Standard Reel' },
  { id: '3min', label: '3 min', scenes: 6, desc: 'YouTube Short-long' },
  { id: '10min', label: '10 min', scenes: 10, desc: 'YouTube Long-form' },
];

const LANGUAGES = [
  { id: 'English',   label: 'English',   flag: '🇬🇧' },
  { id: 'Hindi',     label: 'Hindi',     flag: '🇮🇳' },
  { id: 'Hinglish',  label: 'Hinglish',  flag: '🔀' },
  { id: 'Punjabi',   label: 'Punjabi',   flag: '🌾' },
  { id: 'Tamil',     label: 'Tamil',     flag: '🎭' },
  { id: 'Bengali',   label: 'Bengali',   flag: '🐯' },
  { id: 'Marathi',   label: 'Marathi',   flag: '🏔️' },
  { id: 'Telugu',    label: 'Telugu',    flag: '⭐' },
];

const HOOK_STYLES = [
  { id: 'question',  label: '❓ Question',      prompt: 'Start with a direct question that makes the viewer feel personally called out' },
  { id: 'bold',      label: '💥 Bold Claim',    prompt: 'Start with a shocking bold statement or controversial claim' },
  { id: 'stat',      label: '📊 Shocking Stat', prompt: 'Start with a surprising statistic or little-known fact' },
  { id: 'story',     label: '📖 Story',         prompt: 'Start with "I was..." or "One day..." — a personal micro-story' },
  { id: 'contrast',  label: '⚡ Contrast',      prompt: 'Start with a sharp contrast — "Everyone thinks X... but actually Y"' },
];

const TONES = [
  { id: 'casual',       label: '😎 Casual',       prompt: 'casual, conversational, like talking to a friend' },
  { id: 'motivational', label: '💪 Motivational',  prompt: 'high-energy, motivational, inspirational' },
  { id: 'educational',  label: '🎓 Educational',   prompt: 'clear, informative, teacher-style — step by step' },
  { id: 'funny',        label: '😂 Funny',         prompt: 'humorous, witty, with jokes and relatable situations' },
  { id: 'controversial',label: '🔥 Controversial', prompt: 'bold, provocative, designed to spark debate and comments' },
  { id: 'storytelling', label: '🎭 Storytelling',  prompt: 'narrative-driven, emotional story arc, suspenseful' },
];

async function fetchTrending(region) {
  const subs = REGION_SUBS[region] || REGION_SUBS['India'];
  const results = [];

  for (const sub of subs.slice(0, 3)) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      (data?.data?.children || []).forEach(p => {
        const t = p.data?.title;
        if (t && t.length > 10) results.push({ title: t, source: `r/${sub}` });
      });
      if (results.length >= 8) break;
    } catch {}
  }

  try {
    const q = encodeURIComponent(`${region} trending news`);
    const rssUrl = encodeURIComponent(`https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN`);
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
    const data = await res.json();
    (data.items || []).slice(0, 5).forEach(item => {
      if (item.title) results.push({ title: item.title, source: 'Google News' });
    });
  } catch {}

  return results.slice(0, 12);
}

function ScriptModal({ script, title, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = script;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-dark-900 border border-white/10 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div>
            <div className="text-xs text-amber-400 font-mono mb-0.5">📋 PRODUCTION SCRIPT</div>
            <p className="font-bold text-sm text-white leading-tight">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
              }`}>
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><ClipboardCopy className="w-4 h-4" /> Copy All</>}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl glass glass-hover text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hint */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <p className="text-xs text-white/40 text-center">
            Paste this directly into <span className="text-white/60">HeyGen</span> · <span className="text-white/60">CapCut</span> · <span className="text-white/60">InVideo</span> · <span className="text-white/60">Pictory</span> or any AI video tool
          </p>
        </div>

        {/* Script body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <pre className="whitespace-pre-wrap font-mono text-xs text-white/80 leading-relaxed bg-black/30 rounded-xl p-4 border border-white/5 select-all">
            {script}
          </pre>
        </div>

        {/* Sticky copy at bottom */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button onClick={handleCopy}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                : 'btn-primary'
            }`}>
            {copied ? <><Check className="w-4 h-4" /> Copied to clipboard!</> : <><ClipboardCopy className="w-4 h-4" /> Copy Full Script</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentAlchemy() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [region, setRegion] = useState('India');
  const [trending, setTrending] = useState([]);
  const [selectedTrend, setSelectedTrend] = useState('');
  const [manualTrend, setManualTrend] = useState('');
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [results, setResults] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [scriptModal, setScriptModal] = useState(null);
  const [scriptLoadingIdx, setScriptLoadingIdx] = useState(null);
  const [scriptDuration, setScriptDuration] = useState('60s');
  const [scriptLanguage, setScriptLanguage] = useState('English');
  const [hookStyle, setHookStyle] = useState('bold');
  const [scriptTone, setScriptTone] = useState('casual');

  const actualNiche = niche === 'custom' ? customNiche : niche;
  const activeTrend = selectedTrend || manualTrend;

  const goToTrends = async () => {
    setStep(2);
    setLoadingTrends(true);
    const trends = await fetchTrending(region);
    setTrending(trends);
    setLoadingTrends(false);
  };

  const generate = async () => {
    if (!activeTrend) return;
    setGenerating(true);
    setError('');
    setResults([]);

    const prompt = `You are a viral content strategist. Create 5 unique content angle mashups.

Niche: ${actualNiche}
Platform: ${platform}
Trending Topic: ${activeTrend}
Target Region: ${region}

For each angle, use one of these proven viral formats:
1. what-if: "What if..." thought experiment
2. challenge: Personal challenge doing trend in niche style
3. expose: "The dark truth about..." controversy/expose
4. gap-fill: Untapped angle nobody is covering
5. analogy: Trend teaches something about niche (crossover)

Return ONLY valid JSON array with exactly 5 objects:
[{
  "format": "what-if",
  "title": "exact compelling video title",
  "hook": "first 3 seconds spoken script (punchy, 1-2 sentences max)",
  "whyViral": "psychological reason in 15 words",
  "bestPlatform": "Instagram Reels",
  "contentFormat": "60s Reel",
  "novelty": 8,
  "emotion": "curiosity",
  "difficulty": "easy"
}]

Make titles punchy and highly clickable. Hooks must grab instantly. Be creative and unexpected.`;

    try {
      const raw = await callAI(prompt, 'Generate 5 viral content angles.', 1400);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON found');
      const parsed = JSON.parse(match[0]);
      setResults(parsed);
      setExpandedCard(0);
      setStep(3);
    } catch {
      setError('Failed to generate angles. Make sure your AI API key is set.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyScript = async (r, idx) => {
    setScriptLoadingIdx(idx);

    const dur = DURATIONS.find(d => d.id === scriptDuration) || DURATIONS[3];
    const lang = LANGUAGES.find(l => l.id === scriptLanguage) || LANGUAGES[0];
    const hook = HOOK_STYLES.find(h => h.id === hookStyle) || HOOK_STYLES[1];
    const tone = TONES.find(t => t.id === scriptTone) || TONES[0];

    const sceneCount = dur.scenes;
    const isUltraShort = sceneCount === 0;

    const sceneBlocks = isUltraShort ? '' : Array.from({ length: sceneCount }, (_, i) => {
      const startSec = 3 + Math.floor(i * (parseInt(scriptDuration) || 60) / sceneCount);
      const endSec = 3 + Math.floor((i + 1) * (parseInt(scriptDuration) || 60) / sceneCount);
      return `【SCENE ${i + 1} — 0:${String(startSec).padStart(2,'0')} to 0:${String(endSec).padStart(2,'0')}】
SPEAK: "[narration in ${lang.id} — ${tone.prompt}]"
TEXT ON SCREEN: "[key point — 5 words max]"
VISUAL: [describe b-roll or stock footage]`;
    }).join('\n\n');

    const prompt = `You are a professional video scriptwriter. Write a complete, production-ready video script.

TITLE: ${r.title}
PLATFORM: ${r.bestPlatform}
TOTAL DURATION: ${scriptDuration}
LANGUAGE: Write ALL spoken parts (SPEAK lines) in ${lang.id}. Captions and hashtags also in ${lang.id}.
HOOK STYLE: ${hook.prompt}
TONE: ${tone.prompt}
NICHE: ${actualNiche}
TRENDING TOPIC: ${activeTrend}
${isUltraShort ? 'NOTE: This is a 5-second ultra-short video — write HOOK ONLY, no scenes.' : `NOTE: Write exactly ${sceneCount} scene(s) plus hook and CTA.`}

Fill in the script below — keep the exact format with ═══ dividers:

═══════════════════════════════════════
📋 VIDEO SCRIPT — PASTE READY
═══════════════════════════════════════
🎬 TITLE: ${r.title}
📱 PLATFORM: ${r.bestPlatform}
⏱ DURATION: ${scriptDuration}
🗣 LANGUAGE: ${lang.id}
🎭 TONE: ${tone.label}
🪝 HOOK STYLE: ${hook.label}
═══════════════════════════════════════

【HOOK — 0:00 to 0:03】
SPEAK: "${hook.prompt} — write the exact opening words in ${lang.id}"
TEXT ON SCREEN: "[bold 3-5 word overlay in ${lang.id}]"
VISUAL: [describe exactly what to show on screen]
${isUltraShort ? '' : `
${sceneBlocks}

【CALL TO ACTION — final 3 seconds】
SPEAK: "[compelling CTA in ${lang.id} — urgent, clear, tells viewer exactly what to do]"
TEXT ON SCREEN: "[CTA text]"
VISUAL: [visual suggestion]`}

═══════════════════════════════════════
📝 CAPTION (${lang.id} — copy-paste ready)
═══════════════════════════════════════
[Write 2-3 sentence engaging caption with emojis in ${lang.id}, optimized for ${r.bestPlatform}]

#️⃣ HASHTAGS (in ${lang.id} + English mix)
[Write 15 relevant hashtags]

═══════════════════════════════════════
⚙️ SETTINGS FOR ${r.bestPlatform}
═══════════════════════════════════════
• Aspect Ratio: [e.g. 9:16]
• Ideal Duration: ${scriptDuration}
• Best Post Time: [day + time in IST]
• Music Vibe: [describe audio style matching ${tone.label} tone]
• Thumbnail/Cover Text: [3-5 words in ${lang.id}]
• First Comment (pin this): [write in ${lang.id} — boosts engagement]
• Editing Tip: [one specific tip for ${r.bestPlatform} in ${scriptDuration} format]
═══════════════════════════════════════

Make SPEAK lines feel natural when spoken aloud in ${lang.id}. Every word counts.`;

    try {
      const script = await callAI(prompt, 'Write the complete video script.', 2400);
      setScriptModal({ title: r.title, script });
    } catch {
      setError('Could not generate script. Check your API key.');
    } finally {
      setScriptLoadingIdx(null);
    }
  };

  const handleCreateVideo = (r) => {
    const params = new URLSearchParams({ topic: r.title, style: 'cinematic', duration: '60' });
    navigate(`/create?${params}`);
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-grid overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Content Alchemy Lab</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {['Your Niche', 'Pick Trend', 'Viral Angles'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === i + 1 ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300' :
                step > i + 1 ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
                'glass text-white/30'
              }`}>
                <span>{step > i + 1 ? '✓' : i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-white/20" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Setup ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">⚗️</div>
              <h1 className="text-3xl font-black mb-2">Content Alchemy Lab</h1>
              <p className="text-white/50 max-w-lg mx-auto text-sm">
                Mix your niche with live trending topics → get 5 viral angles + full copy-ready scripts
              </p>
            </div>

            <div className="card space-y-6">
              <div>
                <label className="text-sm text-white/50 mb-3 block">What's your content niche?</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {NICHES.map(n => (
                    <button key={n} onClick={() => setNiche(n)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center leading-tight ${
                        niche === n
                          ? 'bg-amber-500/30 border border-amber-500/60 text-white'
                          : 'glass glass-hover text-white/50 border border-transparent'
                      }`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setNiche('custom')}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                      niche === 'custom'
                        ? 'bg-amber-500/30 border border-amber-500/60 text-white'
                        : 'glass glass-hover text-white/50 border border-transparent'
                    }`}>
                    + Custom
                  </button>
                </div>
                {niche === 'custom' && (
                  <input value={customNiche} onChange={e => setCustomNiche(e.target.value)}
                    placeholder="e.g. Ayurvedic cooking, Crypto trading, Dog training..."
                    className="input-field" />
                )}
              </div>

              <div>
                <label className="text-sm text-white/50 mb-3 block">Target platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm transition-all ${
                        platform === p.id
                          ? 'bg-amber-500/30 border border-amber-500/60 text-white'
                          : 'glass glass-hover text-white/50 border border-transparent'
                      }`}>
                      <span>{p.emoji}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/50 mb-3 block">Your region (for live trending topics)</label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map(r => (
                    <button key={r.id} onClick={() => setRegion(r.id)}
                      className={`py-2 px-3 rounded-lg text-sm transition-all ${
                        region === r.id
                          ? 'bg-amber-500/30 border border-amber-500/60 text-white'
                          : 'glass glass-hover text-white/50 border border-transparent'
                      }`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={goToTrends} disabled={!actualNiche.trim()}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-40">
                <Zap className="w-5 h-5" />
                Fetch Live Trends →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Pick trend ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black mb-2">Pick a trending topic</h2>
              <p className="text-white/50 text-sm">
                Live from <span className="text-amber-400">{region}</span> right now — mix with{' '}
                <span className="text-cyan-400">{actualNiche}</span>
              </p>
            </div>

            {loadingTrends ? (
              <div className="card text-center py-16">
                <div className="text-4xl mb-4 animate-bounce">📡</div>
                <p className="text-white/60">Fetching live trending topics...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2">
                  {trending.map((t, i) => (
                    <button key={i} onClick={() => { setSelectedTrend(t.title); setManualTrend(''); }}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedTrend === t.title
                          ? 'border-amber-500/60 bg-amber-500/10 text-white'
                          : 'border-white/10 glass glass-hover text-white/70'
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm leading-snug">{t.title}</span>
                        <span className="text-xs text-white/30 shrink-0 mt-0.5">{t.source}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="card">
                  <label className="text-xs text-white/40 mb-2 block">Or type your own trend:</label>
                  <input
                    value={manualTrend}
                    onChange={e => { setManualTrend(e.target.value); setSelectedTrend(''); }}
                    placeholder="e.g. IPL 2025, Budget 2025, AI replacing jobs..."
                    className="input-field text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary py-3 px-5 text-sm">← Back</button>
                  <button onClick={generate} disabled={!activeTrend || generating}
                    className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                    {generating
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating angles...</>
                      : <><Wand2 className="w-4 h-4" /> Generate 5 Viral Angles</>
                    }
                  </button>
                </div>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Results ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">✨</div>
              <h2 className="text-2xl font-black mb-1">5 Viral Angles Ready</h2>
              <p className="text-white/50 text-sm">
                <span className="text-amber-400">{actualNiche}</span>
                {' × '}
                <span className="text-cyan-400">"{(activeTrend || '').slice(0, 50)}{(activeTrend || '').length > 50 ? '…' : ''}"</span>
              </p>
              <p className="text-xs text-white/30 mt-1">Tap any card to expand → Copy full script for HeyGen / CapCut</p>
            </div>

            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className={`rounded-2xl border overflow-hidden transition-all ${
                  expandedCard === i ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-white/10'
                }`}>
                  {/* Header */}
                  <button className="w-full text-left p-4 glass glass-hover"
                    onClick={() => setExpandedCard(expandedCard === i ? null : i)}>
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${FORMAT_COLORS[r.format] || 'from-gray-600 to-gray-800'} flex items-center justify-center text-lg`}>
                        {FORMAT_LABELS[r.format]?.split(' ')[0] || '🎯'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-white/40">{FORMAT_LABELS[r.format] || r.format}</span>
                          <span className="text-xs glass px-2 py-0.5 rounded-full text-white/50">{r.contentFormat}</span>
                          <span className="text-xs">{EMOTION_EMOJI[r.emotion] || '🎯'} {r.emotion}</span>
                        </div>
                        <p className="font-bold text-sm leading-snug text-white">{r.title}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1 ml-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400 font-bold text-sm">{r.novelty}/10</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                          r.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {r.difficulty}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded */}
                  {expandedCard === i && (
                    <div className="border-t border-white/10 p-4 space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                        <div className="text-xs text-amber-400 font-mono mb-1.5">🎬 OPENING HOOK — first 3 seconds</div>
                        <p className="text-white font-medium text-sm italic">"{r.hook}"</p>
                      </div>

                      <div className="flex items-start gap-2">
                        <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs text-white/40 mb-0.5">Why this goes viral</div>
                          <p className="text-white/80 text-sm">{r.whyViral}</p>
                        </div>
                      </div>

                      <div className="flex gap-6">
                        <div>
                          <div className="text-xs text-white/40 mb-0.5">Best Platform</div>
                          <p className="text-white/80 text-sm">{r.bestPlatform}</p>
                        </div>
                        <div>
                          <div className="text-xs text-white/40 mb-0.5">Format</div>
                          <p className="text-white/80 text-sm">{r.contentFormat}</p>
                        </div>
                      </div>

                      {/* Script Options */}
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-3">
                        <div className="text-xs text-white/40 font-mono">⚙️ SCRIPT OPTIONS</div>

                        {/* Duration */}
                        <div>
                          <div className="text-xs text-white/30 mb-1.5">Duration</div>
                          <div className="flex flex-wrap gap-1.5">
                            {DURATIONS.map(d => (
                              <button key={d.id} onClick={() => setScriptDuration(d.id)}
                                title={d.desc}
                                className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
                                  scriptDuration === d.id
                                    ? 'bg-amber-500/30 border border-amber-500/50 text-amber-300'
                                    : 'glass glass-hover text-white/50 border border-transparent'
                                }`}>
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Language */}
                        <div>
                          <div className="text-xs text-white/30 mb-1.5">Language</div>
                          <div className="flex flex-wrap gap-1.5">
                            {LANGUAGES.map(l => (
                              <button key={l.id} onClick={() => setScriptLanguage(l.id)}
                                className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                  scriptLanguage === l.id
                                    ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                                    : 'glass glass-hover text-white/50 border border-transparent'
                                }`}>
                                <span>{l.flag}</span>
                                <span>{l.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Hook Style */}
                        <div>
                          <div className="text-xs text-white/30 mb-1.5">Hook Style</div>
                          <div className="flex flex-wrap gap-1.5">
                            {HOOK_STYLES.map(h => (
                              <button key={h.id} onClick={() => setHookStyle(h.id)}
                                className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
                                  hookStyle === h.id
                                    ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                                    : 'glass glass-hover text-white/50 border border-transparent'
                                }`}>
                                {h.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tone */}
                        <div>
                          <div className="text-xs text-white/30 mb-1.5">Tone</div>
                          <div className="flex flex-wrap gap-1.5">
                            {TONES.map(t => (
                              <button key={t.id} onClick={() => setScriptTone(t.id)}
                                className={`py-1 px-2.5 rounded-lg text-xs font-medium transition-all ${
                                  scriptTone === t.id
                                    ? 'bg-rose-500/30 border border-rose-500/50 text-rose-300'
                                    : 'glass glass-hover text-white/50 border border-transparent'
                                }`}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleCopyScript(r, i)}
                          disabled={scriptLoadingIdx === i}
                          className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all text-sm font-semibold disabled:opacity-60">
                          {scriptLoadingIdx === i
                            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Writing...</>
                            : <><ClipboardCopy className="w-4 h-4" /> Copy Script</>
                          }
                        </button>
                        <button onClick={() => handleCreateVideo(r)}
                          className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl glass glass-hover border border-white/10 text-white/70 hover:text-white transition-all text-sm">
                          <Video className="w-4 h-4" />
                          Use Creator
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStep(2); setResults([]); setExpandedCard(null); }}
                className="btn-secondary flex-1 py-3 text-sm">
                ← Different Trend
              </button>
              <button onClick={generate} disabled={generating}
                className="btn-secondary flex-1 py-3 text-sm flex items-center justify-center gap-2">
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Script Modal */}
      {scriptModal && (
        <ScriptModal
          title={scriptModal.title}
          script={scriptModal.script}
          onClose={() => setScriptModal(null)}
        />
      )}
    </div>
  );
}
