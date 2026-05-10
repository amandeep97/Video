import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, TrendingUp, Hash, Clock, Lightbulb,
  Copy, Check, RefreshCw, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Target, Flame, Eye, BarChart2
} from 'lucide-react';
import { callAI } from '../services/api.js';
import { getBackendUrl } from '../services/replicate.js';

const PLATFORMS = [
  { id: 'all',            label: 'All Platforms',  emoji: '🌐' },
  { id: 'tiktok',         label: 'TikTok',         emoji: '🎵' },
  { id: 'instagram',      label: 'Instagram',      emoji: '📸' },
  { id: 'youtube',        label: 'YouTube',        emoji: '▶️' },
  { id: 'youtube-shorts', label: 'YT Shorts',      emoji: '📱' },
  { id: 'facebook',       label: 'Facebook',       emoji: '📘' },
  { id: 'twitter',        label: 'X / Twitter',    emoji: '🐦' },
  { id: 'linkedin',       label: 'LinkedIn',       emoji: '💼' },
  { id: 'snapchat',       label: 'Snapchat',       emoji: '👻' },
  { id: 'pinterest',      label: 'Pinterest',      emoji: '📌' },
  { id: 'sharechat',      label: 'ShareChat 🇮🇳',   emoji: '🇮🇳' },
  { id: 'moj',            label: 'Moj',            emoji: '🎬' },
  { id: 'josh',           label: 'Josh',           emoji: '⚡' },
  { id: 'threads',        label: 'Threads',        emoji: '🧵' },
  { id: 'whatsapp',       label: 'WhatsApp',       emoji: '💬' },
];

const PLATFORM_EMOJI = {
  tiktok: '🎵', instagram: '📸', youtube: '▶️',
  'youtube-shorts': '📱', facebook: '📘', twitter: '🐦',
  linkedin: '💼', snapchat: '👻', pinterest: '📌',
  sharechat: '🇮🇳', moj: '🎬', josh: '⚡', threads: '🧵', whatsapp: '💬',
};

const NICHES = [
  'general', 'entertainment', 'education', 'fitness', 'food', 'travel',
  'tech', 'fashion', 'beauty', 'business', 'gaming', 'comedy', 'motivation',
  'finance', 'cooking', 'music', 'sports', 'pets', 'diy', 'parenting',
];

const TABS = [
  { id: 'overview',  label: 'Overview',   icon: BarChart2 },
  { id: 'hooks',     label: 'Hooks',      icon: Zap },
  { id: 'titles',    label: 'Titles',     icon: Eye },
  { id: 'hashtags',  label: 'Hashtags',   icon: Hash },
  { id: 'schedule',  label: 'Schedule',   icon: Clock },
  { id: 'ideas',     label: 'Ideas',      icon: Lightbulb },
];

const PLATFORM_COLORS = {
  tiktok:    'from-pink-500 to-rose-600',
  instagram: 'from-purple-500 to-pink-500',
  youtube:   'from-red-500 to-red-600',
};

function ScoreRing({ score, size = 80 }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ position: 'absolute' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <span className="text-xl font-black" style={{ color }}>{score}</span>
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy}
      className="w-7 h-7 rounded-lg glass glass-hover flex items-center justify-center flex-shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

function CopyAllBtn({ items, label = 'Copy All' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(items.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs font-medium text-white/60 hover:text-white transition-all">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

const VIRAL_SYSTEM = `You are an expert social media algorithm analyst and viral content strategist with deep knowledge of:
- TikTok FYP algorithm (watch time, completion rate, shares, rewatches)
- Instagram Reels algorithm (Explore page, saves, DM sends, non-follower reach)
- YouTube algorithm (CTR, watch time, session time, subscriber conversion)
- What makes content go viral vs get buried in each platform
Always respond with valid JSON only, no markdown, no extra text.`;

async function callViralAI(prompt) {
  const backendUrl = getBackendUrl();

  // Try backend first — but catch ALL errors so mobile never gets stuck
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/viral/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.analysis) return d;
      }
    } catch {
      // Network error, CORS, 404, etc. — fall through to direct AI call
    }
  }

  // Direct AI call using user's stored API key (works on mobile, no backend needed)
  const content = await callAI(VIRAL_SYSTEM, prompt.userPrompt, 2048);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid format. Try again.');
  return { success: true, analysis: JSON.parse(jsonMatch[0]) };
}

async function callViralEndpoint(endpoint, body) {
  const backendUrl = getBackendUrl();

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
    } catch {
      // fall through
    }
  }

  // Direct AI fallback
  const prompt = endpoint.includes('hooks')
    ? `Generate 10 viral opening hooks for this topic on ${body.platform || 'TikTok'}:\nTopic: "${body.topic}"\n\nEach hook must stop the scroll in the first 2 seconds. Mix different styles.\nRespond with ONLY JSON: { "hooks": [{ "type": "<style>", "text": "<hook text>" }] }`
    : `Generate 10 viral video titles for this topic optimized for ${body.platform || 'YouTube'} algorithm:\nTopic: "${body.topic}"\n\nTitles must maximize CTR. Use proven formulas: curiosity gaps, numbers, power words.\nRespond with ONLY JSON: { "titles": [{ "type": "<formula used>", "text": "<title>" }] }`;

  const content = await callAI(VIRAL_SYSTEM, prompt, 1024);
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned invalid format.');
  return JSON.parse(jsonMatch[0]);
}

export default function AlgorithmCracker() {
  const navigate = useNavigate();

  const [topic,     setTopic]     = useState('');
  const [platform,  setPlatform]  = useState('all');
  const [niche,     setNiche]     = useState('general');
  const [showNiche, setShowNiche] = useState(false);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [analysis,  setAnalysis]  = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // extra hooks/titles load
  const [loadingMore, setLoadingMore] = useState('');
  const [extraHooks,  setExtraHooks]  = useState([]);
  const [extraTitles, setExtraTitles] = useState([]);

  const getAnalyzePlatforms = () => {
    if (platform === 'all') return ['tiktok', 'instagram', 'youtube', 'facebook', 'twitter', 'linkedin'];
    // Focus on selected + 2 top platforms for comparison
    const tops = ['tiktok', 'instagram', 'youtube'];
    return [platform, ...tops.filter(p => p !== platform)].slice(0, 3);
  };

  const buildAnalyzePrompt = () => {
    const analyzePlatforms = getAnalyzePlatforms();
    const platformsJson = analyzePlatforms
      .map(p => `    "${p}": { "score": <0-100>, "tips": ["<tip1>","<tip2>","<tip3>"], "bestTime": "<e.g. 7-9pm>", "bestDays": ["<day1>","<day2>"] }`)
      .join(',\n');
    const hashtagsJson = analyzePlatforms
      .map(p => `    "${p}": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"]`)
      .join(',\n');

    return `Analyze this video topic for viral potential on social media:

Topic: "${topic.trim()}"
Target Platform: ${platform === 'all' ? 'All major platforms' : platform}
Niche: ${niche}

Give platform-specific advice tailored to each platform's algorithm.
For ShareChat/Moj/Josh: focus on Indian regional language audience.
For WhatsApp: focus on shareable, forward-worthy content.
For LinkedIn: focus on professional insight content.

Respond with ONLY this JSON:
{
  "viralScore": <0-100 integer>,
  "verdict": "<HIGH POTENTIAL|MEDIUM POTENTIAL|LOW POTENTIAL>",
  "viralReason": "<2-3 sentence explanation>",
  "platforms": {
${platformsJson}
  },
  "hooks": [
    { "type": "Curiosity",  "text": "<scroll-stopping opener>" },
    { "type": "Shock",      "text": "<shocking opener>" },
    { "type": "Question",   "text": "<question opener>" },
    { "type": "Story",      "text": "<story opener>" },
    { "type": "Challenge",  "text": "<challenge opener>" }
  ],
  "titles": [
    { "type": "Curiosity",   "text": "<title>" },
    { "type": "How-To",      "text": "<title>" },
    { "type": "List",        "text": "<title>" },
    { "type": "Story",       "text": "<title>" },
    { "type": "Controversy", "text": "<title>" }
  ],
  "hashtags": {
${hashtagsJson}
  },
  "contentAngles": ["<angle 1>","<angle 2>","<angle 3>","<angle 4>","<angle 5>"],
  "warnings": ["<warning if any, else empty string>"],
  "thumbnailText": { "headline": "<short punchy headline>", "subtext": "<supporting text>" },
  "postingSchedule": "<e.g. 3x per week>",
  "retentionTip": "<single most important retention tip>",
  "competitorInsight": "<what top creators do differently>"
}`;
  };

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setAnalysis(null);
    setExtraHooks([]);
    setExtraTitles([]);
    setActiveTab('overview');
    try {
      const data = await callViralAI({ topic: topic.trim(), platform, niche, userPrompt: buildAnalyzePrompt() });
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreHooks = async () => {
    setLoadingMore('hooks');
    try {
      const data = await callViralEndpoint('/api/viral/hooks', { topic: topic.trim(), platform, count: 10 });
      setExtraHooks(data.hooks || []);
    } catch {}
    setLoadingMore('');
  };

  const loadMoreTitles = async () => {
    setLoadingMore('titles');
    try {
      const data = await callViralEndpoint('/api/viral/titles', { topic: topic.trim(), platform, count: 10 });
      setExtraTitles(data.titles || []);
    } catch {}
    setLoadingMore('');
  };

  const verdictColor = (v) =>
    v?.includes('HIGH') ? 'text-green-400 border-green-500/30 bg-green-500/10' :
    v?.includes('MEDIUM') ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
    'text-red-400 border-red-500/30 bg-red-500/10';

  return (
    <div className="min-h-screen bg-dark-950 bg-grid">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white">Algorithm Cracker</span>
              <span className="text-xs text-white/40 ml-2">Beat the algorithm. Go viral.</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        {/* Input card */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-4">Analyze Your Topic</h2>
          <div className="space-y-3">
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAnalyze()}
              rows={2}
              placeholder="Enter your video topic or idea… e.g. 'How to make money with AI in 2025'"
              className="input-field resize-none text-sm"
            />

            {/* Platform selector */}
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    platform === p.id
                      ? 'bg-brand-500/20 border-brand-500/50 text-white'
                      : 'glass border-white/10 text-white/50 hover:text-white'
                  }`}>
                  <span>{p.emoji}</span> {p.label}
                </button>
              ))}
            </div>

            {/* Niche */}
            <div>
              <button onClick={() => setShowNiche(s => !s)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
                Niche: <span className="text-white/70 capitalize">{niche}</span>
                {showNiche ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showNiche && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NICHES.map(n => (
                    <button key={n} onClick={() => { setNiche(n); setShowNiche(false); }}
                      className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-all ${
                        niche === n ? 'bg-brand-500/30 text-brand-300 border border-brand-500/50' : 'glass text-white/40 hover:text-white'
                      }`}>{n}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleAnalyze} disabled={!topic.trim() || loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                : <><TrendingUp className="w-4 h-4" /> Analyze Viral Potential</>}
            </button>

            {error && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {analysis && (
          <div className="space-y-4">

            {/* Verdict banner */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${verdictColor(analysis.verdict)}`}>
              <ScoreRing score={analysis.viralScore} size={72} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-black">{analysis.verdict}</span>
                  {analysis.viralScore >= 75 && <Flame className="w-5 h-5 text-orange-400" />}
                </div>
                <p className="text-sm opacity-80 leading-relaxed">{analysis.viralReason}</p>
              </div>
            </div>

            {/* Warnings */}
            {analysis.warnings?.length > 0 && analysis.warnings[0] && (
              <div className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {analysis.warnings.map((w, i) => w && (
                    <p key={i} className="text-xs text-yellow-300">{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 glass rounded-xl p-1 overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === t.id ? 'bg-brand-500/30 text-white' : 'text-white/50 hover:text-white'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* ── Overview tab ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Platform scores */}
                <div className="grid grid-cols-3 gap-3">
                  {Object.keys(analysis.platforms || {}).map(p => {
                    const pd = analysis.platforms[p];
                    if (!pd) return null;
                    return (
                      <div key={p} className="card text-center">
                        <p className="text-xl mb-1">{PLATFORM_EMOJI[p] || '📱'}</p>
                        <ScoreRing score={pd.score} size={56} />
                        <p className="text-xs font-semibold capitalize mt-2">{p}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{pd.bestTime} · {pd.bestDays?.[0]}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Platform tips */}
                {Object.keys(analysis.platforms || {}).map(p => {
                  const pd = analysis.platforms[p];
                  if (!pd?.tips?.length) return null;
                  return (
                    <div key={p} className="card">
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span>{PLATFORM_EMOJI[p] || '📱'}</span>
                        <span className="capitalize">{p} Algorithm Tips</span>
                      </p>
                      <div className="space-y-2">
                        {pd.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                            <p className="text-xs text-white/70 leading-relaxed">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Retention tip + Competitor insight */}
                {analysis.retentionTip && (
                  <div className="card border border-green-500/20 bg-green-500/5">
                    <p className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Retention Secret
                    </p>
                    <p className="text-sm text-white/80">{analysis.retentionTip}</p>
                  </div>
                )}
                {analysis.competitorInsight && (
                  <div className="card border border-purple-500/20 bg-purple-500/5">
                    <p className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> What Top Creators Do Differently
                    </p>
                    <p className="text-sm text-white/80">{analysis.competitorInsight}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Hooks tab ────────────────────────────────────────────── */}
            {activeTab === 'hooks' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50">First 3 seconds that stop the scroll</p>
                  <button onClick={loadMoreHooks} disabled={loadingMore === 'hooks'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs font-medium text-white/60 disabled:opacity-40">
                    {loadingMore === 'hooks' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    More Hooks
                  </button>
                </div>
                {[...(analysis.hooks || []), ...extraHooks].map((h, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl border border-white/8">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 font-medium flex-shrink-0 mt-0.5">
                      {h.type}
                    </span>
                    <p className="text-sm text-white/80 flex-1 leading-relaxed">"{h.text}"</p>
                    <CopyBtn text={h.text} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Titles tab ───────────────────────────────────────────── */}
            {activeTab === 'titles' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/50">High CTR titles optimized per platform</p>
                  <button onClick={loadMoreTitles} disabled={loadingMore === 'titles'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass glass-hover text-xs font-medium text-white/60 disabled:opacity-40">
                    {loadingMore === 'titles' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    More Titles
                  </button>
                </div>
                {[...(analysis.titles || []), ...extraTitles].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 glass rounded-xl border border-white/8">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-medium flex-shrink-0">
                      {t.type}
                    </span>
                    <p className="text-sm text-white/80 flex-1">{t.text}</p>
                    <CopyBtn text={t.text} />
                  </div>
                ))}
                {analysis.thumbnailText && (
                  <div className="card border border-yellow-500/20 bg-yellow-500/5 mt-4">
                    <p className="text-xs font-semibold text-yellow-400 mb-2">Thumbnail Text</p>
                    <p className="text-lg font-black text-white">{analysis.thumbnailText.headline}</p>
                    <p className="text-sm text-white/50 mt-1">{analysis.thumbnailText.subtext}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Hashtags tab ─────────────────────────────────────────── */}
            {activeTab === 'hashtags' && (
              <div className="space-y-4">
                {Object.keys(analysis.hashtags || {}).map(p => {
                  const tags = analysis.hashtags[p];
                  if (!tags?.length) return null;
                  return (
                    <div key={p} className="card">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <span>{PLATFORM_EMOJI[p] || '📱'}</span>
                          <span className="capitalize">{p}</span>
                        </p>
                        <CopyAllBtn items={tags} label={`Copy ${tags.length} tags`} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                          <button key={i} onClick={() => navigator.clipboard.writeText(tag)}
                            className="px-2.5 py-1 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-medium hover:bg-brand-500/25 transition-all">
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-white/30 text-center">Click any tag to copy it individually</p>
              </div>
            )}

            {/* ── Schedule tab ─────────────────────────────────────────── */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {analysis.postingSchedule && (
                  <div className="card border border-brand-500/20 bg-brand-500/5">
                    <p className="text-xs font-semibold text-brand-400 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Recommended Posting Frequency
                    </p>
                    <p className="text-base font-bold text-white">{analysis.postingSchedule}</p>
                  </div>
                )}
                {Object.keys(analysis.platforms || {}).map(p => {
                  const pd = analysis.platforms[p];
                  if (!pd) return null;
                  return (
                    <div key={p} className="card">
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span>{PLATFORM_EMOJI[p] || '📱'}</span>
                        <span className="capitalize">{p} Best Times</span>
                      </p>
                      <div className="flex gap-3">
                        <div className="flex-1 p-3 glass rounded-xl text-center">
                          <p className="text-xs text-white/40 mb-1">Best Time</p>
                          <p className="text-base font-bold text-white">{pd.bestTime}</p>
                        </div>
                        <div className="flex-1 p-3 glass rounded-xl text-center">
                          <p className="text-xs text-white/40 mb-1">Best Days</p>
                          <p className="text-sm font-bold text-white">{pd.bestDays?.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Ideas tab ────────────────────────────────────────────── */}
            {activeTab === 'ideas' && (
              <div className="space-y-3">
                <p className="text-sm text-white/50">5 unique content angles to stand out</p>
                {analysis.contentAngles?.map((angle, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 glass rounded-xl border border-white/8">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-brand-300 flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed flex-1">{angle}</p>
                    <CopyBtn text={angle} />
                  </div>
                ))}

                {/* Use in Creator button */}
                <button
                  onClick={() => navigate(`/create?topic=${encodeURIComponent(topic)}`)}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Create Video with This Topic
                </button>
              </div>
            )}

          </div>
        )}

        {/* Empty state */}
        {!analysis && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-lg font-bold text-white/70 mb-2">Enter your topic to get started</h3>
            <p className="text-sm text-white/30 max-w-sm mx-auto leading-relaxed">
              Get viral score, platform-specific tips, scroll-stopping hooks, strategic hashtags, and the best time to post.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
