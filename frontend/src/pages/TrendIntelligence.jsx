import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, Flame, Loader2, Zap, Calendar, TrendingUp,
  ChevronDown, ChevronUp, Play, Hash, Clock, Sparkles, RefreshCw,
  Newspaper, MessageSquare, Search, Key, Languages, MapPin, X
} from 'lucide-react';
import { callAI } from '../services/api.js';
import { getBackendUrl } from '../services/replicate.js';

// ── Region config ──────────────────────────────────────────────────────────
const REGIONS = [
  { group: 'India – North', items: ['Punjab', 'Haryana', 'Delhi', 'Himachal Pradesh', 'Uttarakhand', 'Jammu & Kashmir', 'Uttar Pradesh'] },
  { group: 'India – West', items: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Mumbai', 'Pune', 'Ahmedabad'] },
  { group: 'India – South', items: ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Chennai', 'Bengaluru'] },
  { group: 'India – East', items: ['West Bengal', 'Bihar', 'Odisha', 'Jharkhand', 'Assam', 'Kolkata'] },
  { group: 'India – Broad', items: ['North India', 'South India', 'Rural India', 'Tier-2 Cities India', 'Metro Cities India'] },
  { group: 'South Asia', items: ['Pakistan', 'Bangladesh', 'Nepal', 'Sri Lanka'] },
  { group: 'Global', items: ['USA', 'UK', 'Canada', 'Australia', 'UAE', 'Saudi Arabia', 'Global'] },
];

const LANGUAGES = ['Hindi', 'Punjabi', 'Bhojpuri', 'Haryanvi', 'Bengali', 'Marathi', 'Gujarati',
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Urdu', 'English', 'Hinglish'];

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'youtube-shorts', label: 'YT Shorts', emoji: '📱' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'sharechat', label: 'ShareChat', emoji: '🇮🇳' },
  { id: 'facebook', label: 'Facebook', emoji: '📘' },
];

// Region → subreddits (most relevant first)
const REGION_SUBS = {
  Punjab: ['punjab', 'india', 'cricket'],
  Haryana: ['haryana', 'india', 'cricket'],
  Delhi: ['delhi', 'india', 'IndianStreetFood'],
  'Uttar Pradesh': ['india', 'cricket', 'bollywood'],
  Bihar: ['india', 'cricket', 'bollywood'],
  Maharashtra: ['mumbai', 'pune', 'india'],
  Mumbai: ['mumbai', 'india', 'bollywood'],
  Bengaluru: ['bangalore', 'india', 'tech'],
  'Tamil Nadu': ['Chennai', 'kollywood', 'india'],
  'West Bengal': ['kolkata', 'india', 'cricket'],
  Pakistan: ['pakistan', 'cricket', 'PakistanPolitics'],
  USA: ['worldnews', 'news', 'AskReddit'],
  UK: ['unitedkingdom', 'worldnews', 'news'],
  default: ['india', 'bollywood', 'cricket'],
};
const getSubs = r => REGION_SUBS[r] || REGION_SUBS.default;

// Region → Google News search term
const REGION_NEWS = {
  Punjab: 'punjab india news', Haryana: 'haryana india news',
  Delhi: 'delhi news india', 'Uttar Pradesh': 'uttar pradesh news',
  Maharashtra: 'maharashtra mumbai news', 'Tamil Nadu': 'tamil nadu news',
  Karnataka: 'karnataka bangalore news', 'West Bengal': 'west bengal kolkata',
  Pakistan: 'pakistan news trending', USA: 'usa trending news',
  UK: 'uk trending news today', Global: 'world trending news',
  default: 'india trending viral today',
};
const getNewsQuery = r => REGION_NEWS[r] || REGION_NEWS.default;

// Upcoming Indian events for content calendar
const EVENTS = [
  { name: 'Eid ul-Adha', date: '2025-06-07', emoji: '🌙', type: 'Festival' },
  { name: 'Independence Day', date: '2025-08-15', emoji: '🇮🇳', type: 'National' },
  { name: 'Janmashtami', date: '2025-08-16', emoji: '🦚', type: 'Festival' },
  { name: 'Onam', date: '2025-09-05', emoji: '🌸', type: 'Festival' },
  { name: 'Navratri', date: '2025-09-22', emoji: '🕺', type: 'Festival' },
  { name: 'Dussehra', date: '2025-10-02', emoji: '🏹', type: 'Festival' },
  { name: 'Diwali', date: '2025-10-20', emoji: '🪔', type: 'Festival' },
  { name: 'Guru Nanak Jayanti', date: '2025-11-05', emoji: '🙏', type: 'Festival' },
  { name: 'Christmas', date: '2025-12-25', emoji: '🎄', type: 'Festival' },
  { name: 'New Year 2026', date: '2026-01-01', emoji: '🎆', type: 'Celebration' },
  { name: 'Republic Day', date: '2026-01-26', emoji: '🇮🇳', type: 'National' },
  { name: 'Holi', date: '2026-03-04', emoji: '🎨', type: 'Festival' },
];

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const TREND_SYSTEM = `You are a viral content strategist specializing in regional Indian and South Asian content.
You understand what makes content go viral in different Indian states and languages.
Always respond with valid JSON only — no markdown, no extra text.`;

// ── Fetch helpers ──────────────────────────────────────────────────────────
async function fetchReddit(region) {
  const subs = getSubs(region);
  for (const sub of subs) {
    try {
      const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=15`);
      const d = await r.json();
      const posts = (d?.data?.children || [])
        .map(c => c.data)
        .filter(p => !p.stickied && p.title.length > 20)
        .slice(0, 8)
        .map(p => ({
          id: p.id, title: p.title, score: p.score,
          comments: p.num_comments, sub: p.subreddit,
          type: 'reddit', heat: Math.min(3, Math.ceil(Math.log10(Math.max(p.score, 10)) - 1)),
        }));
      if (posts.length >= 4) return posts;
    } catch { /* try next */ }
  }
  return [];
}

async function fetchGoogleNews(region) {
  try {
    const query = getNewsQuery(region);
    const rssUrl = encodeURIComponent(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`);
    const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
    const d = await r.json();
    return (d.items || []).slice(0, 8).map((item, i) => ({
      id: `news-${i}`, title: item.title.replace(/ - [^-]+$/, ''), // strip source suffix
      source: item.author || 'News', date: item.pubDate,
      link: item.link, type: 'news', heat: 2,
    }));
  } catch { return []; }
}

// Quick AI insight for a single topic (fast, ~600 tokens)
async function getQuickInsight(topic, region, language, platform) {
  const prompt = `A content creator in ${region} makes ${language} content for ${platform}.
This topic is trending right now: "${topic}"

Give instant content intelligence. Respond ONLY with this JSON:
{
  "potential": "HIGH|MEDIUM|LOW",
  "potentialReason": "<one sentence why>",
  "hook": "<scroll-stopping opening line in ${language} or Hinglish>",
  "angle": "<unique content angle nobody else is doing>",
  "format": "<Shorts|Long-form|Reel|Live|Explainer>",
  "postTime": "<best time to post today>",
  "warningOrTip": "<one critical tip or warning>"
}`;
  const content = await callAI(TREND_SYSTEM, prompt, 600);
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('parse error');
  return JSON.parse(match[0]);
}

// ── Small components ───────────────────────────────────────────────────────
function HeatBadge({ heat }) {
  const flames = ['🔥', '🔥🔥', '🔥🔥🔥'];
  const colors = ['text-yellow-400', 'text-orange-400', 'text-red-400'];
  return <span className={`text-sm ${colors[Math.min(2, heat || 0)]}`}>{flames[Math.min(2, heat || 0)]}</span>;
}

function PotentialBadge({ p }) {
  const cfg = { HIGH: 'text-green-300 bg-green-500/15 border-green-500/30', MEDIUM: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30', LOW: 'text-red-300 bg-red-500/15 border-red-500/30' };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${cfg[p] || cfg.MEDIUM}`}>{p}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TrendIntelligence() {
  const navigate = useNavigate();

  const [region,     setRegion]     = useState('Punjab');
  const [language,   setLanguage]   = useState('Punjabi');
  const [platform,   setPlatform]   = useState('youtube-shorts');
  const [customReg,  setCustomReg]  = useState('');
  const [showFilters,setShowFilters]= useState(false);

  const effectiveRegion = customReg.trim() || region;

  // Live feed
  const [redditPosts, setRedditPosts] = useState([]);
  const [newsPosts,   setNewsPosts]   = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedTab,     setFeedTab]     = useState('all'); // all | news | social

  // Selected topic & quick insight
  const [selected,        setSelected]        = useState(null);
  const [insight,         setInsight]         = useState(null);
  const [insightLoading,  setInsightLoading]  = useState(false);
  const [insightError,    setInsightError]    = useState('');

  // Deep AI analysis (existing)
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiResult,   setAiResult]   = useState(null);
  const [aiError,    setAiError]    = useState('');
  const [aiTab,      setAiTab]      = useState('trending');

  // YouTube optional
  const [ytKey,      setYtKey]      = useState('');
  const [showYtKey,  setShowYtKey]  = useState(false);
  const [ytVideos,   setYtVideos]   = useState([]);
  const [ytLoading,  setYtLoading]  = useState(false);

  // ── Fetch live feed ────────────────────────────────────────────────────
  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setRedditPosts([]);
    setNewsPosts([]);
    setSelected(null);
    setInsight(null);
    const [reddit, news] = await Promise.allSettled([
      fetchReddit(effectiveRegion),
      fetchGoogleNews(effectiveRegion),
    ]);
    if (reddit.status === 'fulfilled') setRedditPosts(reddit.value);
    if (news.status === 'fulfilled')   setNewsPosts(news.value);
    setFeedLoading(false);
  }, [effectiveRegion]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // ── Tap a trending topic ───────────────────────────────────────────────
  const handleSelect = async (item) => {
    if (selected?.id === item.id) { setSelected(null); setInsight(null); return; }
    setSelected(item);
    setInsight(null);
    setInsightError('');
    setInsightLoading(true);
    try {
      const data = await getQuickInsight(item.title, effectiveRegion, language, platform);
      setInsight(data);
    } catch { setInsightError('Could not analyze. Tap again to retry.'); }
    setInsightLoading(false);
  };

  // ── Deep AI analysis ───────────────────────────────────────────────────
  const buildDeepPrompt = () => `Analyze regional content trends for ${effectiveRegion} in ${language} for ${platform}:
Current Month: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}

Return ONLY this JSON:
{
  "trending": [{ "topic":"", "reason":"", "potential":8, "format":"Shorts" }],
  "contentGaps": [{ "topic":"", "demand":"", "competition":"Low", "opportunity":"" }],
  "bestFormats": [{ "format":"", "why":"", "example":"", "score":8 }],
  "languageTips": { "hookPhrases":[], "titleFormulas":[], "powerWords":[], "thumbnailStyle":"", "avoidWords":[] },
  "seasonal": [{ "event":"", "timing":"", "contentIdea":"", "urgency":"" }],
  "competitors": { "topCreators":[], "gaps":[], "winStrategy":"" },
  "quickWins": []
}`;

  const handleDeepAnalyze = async () => {
    setAiLoading(true); setAiError(''); setAiResult(null); setAiTab('trending');
    try {
      const content = await callAI(TREND_SYSTEM, buildDeepPrompt(), 3000);
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Invalid response');
      setAiResult(JSON.parse(match[0]));
    } catch (e) { setAiError(e.message); }
    setAiLoading(false);
  };

  // ── YouTube ────────────────────────────────────────────────────────────
  const fetchYT = async () => {
    const backendUrl = getBackendUrl();
    if (!backendUrl || !ytKey.trim()) return;
    setYtLoading(true); setYtVideos([]);
    const geo = { India: 'IN', Pakistan: 'PK', USA: 'US', UK: 'GB', Global: 'US' }[effectiveRegion] || 'IN';
    try {
      const r = await fetch(`${backendUrl}/api/trends/youtube?regionCode=${geo}&apiKey=${ytKey.trim()}`);
      const d = await r.json();
      if (d.videos) setYtVideos(d.videos);
    } catch {}
    setYtLoading(false);
  };

  // ── Merged feed ────────────────────────────────────────────────────────
  const allItems = feedTab === 'news'   ? newsPosts
                 : feedTab === 'social' ? redditPosts
                 : [...newsPosts.slice(0, 4), ...redditPosts.slice(0, 4)]
                     .sort((a, b) => (b.heat || 0) - (a.heat || 0));

  // ── Upcoming events ────────────────────────────────────────────────────
  const upcomingEvents = EVENTS
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days > 0 && e.days <= 90)
    .slice(0, 5);

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 bg-grid">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-white text-sm">Trend Intelligence</span>
            <span className="text-[10px] text-white/40 ml-2">{effectiveRegion} · {language}</span>
          </div>
          <button onClick={() => setShowFilters(s => !s)}
            className="flex items-center gap-1 px-3 py-1.5 glass glass-hover rounded-xl text-xs text-white/60">
            <MapPin className="w-3 h-3" />
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={() => navigate('/viral')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 text-xs">
            <TrendingUp className="w-3 h-3" /> Cracker
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 space-y-4">

        {/* ── Filters (collapsed by default) ──────────────────────────── */}
        {showFilters && (
          <div className="card space-y-4 mt-2">
            {/* Region */}
            <div>
              <p className="text-xs text-white/40 mb-2">Region</p>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <input value={customReg} onChange={e => setCustomReg(e.target.value)}
                    placeholder={region} className="input-field pl-8 text-sm" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {REGIONS.flatMap(g => g.items).map(r => (
                  <button key={r} onClick={() => { setRegion(r); setCustomReg(''); }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all ${region === r && !customReg ? 'bg-orange-500/30 text-orange-200 border border-orange-500/40' : 'glass text-white/40 hover:text-white'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* Language */}
            <div>
              <p className="text-xs text-white/40 mb-2">Language</p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(l => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-all ${language === l ? 'bg-orange-500/30 text-orange-200 border border-orange-500/40' : 'glass text-white/40 hover:text-white'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Platform */}
            <div>
              <p className="text-xs text-white/40 mb-2">Primary Platform</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${platform === p.id ? 'bg-orange-500/20 border-orange-500/40 text-orange-200' : 'glass border-white/10 text-white/50'}`}>
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Live Pulse ────────────────────────────────────────────────── */}
        <div className="card space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-white">Live Pulse · {effectiveRegion}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30">Tap any topic for instant insight</span>
              <button onClick={loadFeed} className="w-7 h-7 glass glass-hover rounded-lg flex items-center justify-center" title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${feedLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Source tabs */}
          <div className="flex gap-1 glass rounded-xl p-1">
            {[
              { id: 'all',    icon: Globe,          label: 'All' },
              { id: 'news',   icon: Newspaper,      label: `News (${newsPosts.length})` },
              { id: 'social', icon: MessageSquare,  label: `Social (${redditPosts.length})` },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setFeedTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${feedTab === t.id ? 'bg-orange-500/25 text-white' : 'text-white/40 hover:text-white'}`}>
                  <Icon className="w-3 h-3" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Feed items */}
          {feedLoading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          )}

          {!feedLoading && allItems.length === 0 && (
            <p className="text-xs text-white/30 text-center py-4">No live data loaded. Tap refresh.</p>
          )}

          {!feedLoading && allItems.map((item) => {
            const isSelected = selected?.id === item.id;
            return (
              <div key={item.id} className="space-y-0">
                <button onClick={() => handleSelect(item)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${isSelected ? 'bg-orange-500/10 border-orange-500/30' : 'glass border-white/5 hover:border-orange-500/20 hover:bg-orange-500/5'}`}>
                  <HeatBadge heat={item.heat} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white leading-snug line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.type === 'news' ? (
                        <span className="text-[10px] text-blue-400 flex items-center gap-1">
                          <Newspaper className="w-2.5 h-2.5" /> {item.source}
                        </span>
                      ) : (
                        <span className="text-[10px] text-orange-400 flex items-center gap-1">
                          <MessageSquare className="w-2.5 h-2.5" /> r/{item.sub} · ▲{item.score?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-[10px] text-white/30 font-medium">
                    {isSelected ? '▲ Hide' : 'Tap →'}
                  </div>
                </button>

                {/* ── Inline Quick Insight ───────────────────────────── */}
                {isSelected && (
                  <div className="mx-1 mb-2 p-3 rounded-b-xl bg-dark-900 border border-orange-500/20 border-t-0">
                    {insightLoading && (
                      <div className="flex items-center gap-2 py-3 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                        <span className="text-xs text-white/50">Analyzing for {effectiveRegion} {language} audience…</span>
                      </div>
                    )}
                    {insightError && <p className="text-xs text-red-400 py-2">{insightError}</p>}
                    {insight && !insightLoading && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PotentialBadge p={insight.potential} />
                          <span className="text-xs text-white/50">{insight.potentialReason}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white/5 space-y-1">
                            <p className="text-white/30 flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Hook</p>
                            <p className="text-white font-medium leading-snug">"{insight.hook}"</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 space-y-1">
                            <p className="text-white/30 flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> Angle</p>
                            <p className="text-white/80 text-[11px] leading-snug">{insight.angle}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 space-y-1">
                            <p className="text-white/30 flex items-center gap-1"><Play className="w-3 h-3 text-green-400" /> Format</p>
                            <p className="text-white font-medium">{insight.format}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/5 space-y-1">
                            <p className="text-white/30 flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" /> Post at</p>
                            <p className="text-white font-medium">{insight.postTime}</p>
                          </div>
                        </div>

                        {insight.warningOrTip && (
                          <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-[10px] text-yellow-300">💡 {insight.warningOrTip}</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button onClick={() => navigate(`/create?topic=${encodeURIComponent(item.title)}`)}
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                            <Play className="w-3 h-3" /> Create Video
                          </button>
                          <button onClick={() => navigate(`/viral?topic=${encodeURIComponent(item.title)}`)}
                            className="flex-1 py-2 rounded-xl glass border border-green-500/30 text-green-300 text-xs font-medium flex items-center justify-center gap-1.5">
                            <TrendingUp className="w-3 h-3" /> Full Analysis
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Content Calendar ─────────────────────────────────────────── */}
        {upcomingEvents.length > 0 && (
          <div className="card">
            <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" /> Content Calendar
              <span className="text-[10px] text-white/30 font-normal">— plan ahead</span>
            </p>
            <div className="space-y-2">
              {upcomingEvents.map(e => (
                <div key={e.name} className="flex items-center gap-3 p-2.5 glass rounded-xl">
                  <span className="text-xl flex-shrink-0">{e.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{e.name}</p>
                    <p className="text-[10px] text-white/30">{e.type}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-black ${e.days <= 7 ? 'text-red-400' : e.days <= 14 ? 'text-yellow-400' : 'text-white/60'}`}>
                      {e.days}d
                    </p>
                    <p className="text-[10px] text-white/30">away</p>
                  </div>
                  <button onClick={() => navigate(`/create?topic=${encodeURIComponent(e.name + ' ' + language + ' video')}`)}
                    className="ml-1 px-2.5 py-1.5 glass glass-hover rounded-lg text-[10px] text-purple-300 flex-shrink-0">
                    Plan →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── YouTube Trending ─────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              ▶️ YouTube Trending
              <span className="text-[10px] text-white/30 font-normal">free API key needed</span>
            </p>
            <button onClick={() => setShowYtKey(s => !s)}
              className="text-[10px] glass glass-hover px-2.5 py-1 rounded-lg text-white/40 flex items-center gap-1">
              <Key className="w-3 h-3" /> {showYtKey ? 'Hide' : 'Add Key'}
            </button>
          </div>
          {showYtKey && (
            <div className="flex gap-2 mb-3">
              <input value={ytKey} onChange={e => setYtKey(e.target.value)}
                placeholder="YouTube Data API v3 key (console.cloud.google.com → free)"
                className="input-field text-xs flex-1" />
              <button onClick={fetchYT} disabled={!ytKey.trim() || ytLoading}
                className="px-3 glass glass-hover rounded-xl text-xs text-orange-300 disabled:opacity-40">
                {ytLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
              </button>
            </div>
          )}
          {ytVideos.length > 0 ? (
            <div className="space-y-2">
              {ytVideos.slice(0, 6).map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 p-2.5 glass rounded-xl">
                  <span className="text-[10px] text-white/25 w-4 flex-shrink-0">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{v.title}</p>
                    <p className="text-[10px] text-white/30">{Number(v.views).toLocaleString()} views · {v.channel}</p>
                  </div>
                  <button onClick={() => handleSelect({ id: `yt-${i}`, title: v.title, type: 'youtube', heat: 3 })}
                    className="text-[10px] px-2 py-1 glass glass-hover rounded-lg text-orange-300 flex-shrink-0">
                    Insight
                  </button>
                </div>
              ))}
            </div>
          ) : !showYtKey ? (
            <p className="text-[10px] text-white/20">Get actual #1 trending YouTube videos for India. No billing, 10,000 free requests/day.</p>
          ) : null}
        </div>

        {/* ── Deep AI Analysis ─────────────────────────────────────────── */}
        <div className="card space-y-3">
          <div>
            <p className="text-sm font-bold text-white">Deep AI Strategy</p>
            <p className="text-xs text-white/30 mt-0.5">Full content strategy for {effectiveRegion} in {language} — not live data but very detailed</p>
          </div>
          <button onClick={handleDeepAnalyze} disabled={aiLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity">
            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating strategy…</>
                       : <><Sparkles className="w-4 h-4" /> Generate {effectiveRegion} Content Strategy</>}
          </button>
          {aiError && <p className="text-xs text-red-400">{aiError}</p>}
        </div>

        {/* AI Result tabs */}
        {aiResult && (
          <div className="space-y-4">
            <div className="flex gap-1 glass rounded-xl p-1 overflow-x-auto">
              {[
                { id: 'trending',   label: '🔥 Topics' },
                { id: 'gaps',       label: '🎯 Gaps' },
                { id: 'formats',    label: '📊 Formats' },
                { id: 'language',   label: '🗣️ Language' },
                { id: 'seasonal',   label: '📅 Events' },
                { id: 'competitor', label: '🏆 Compete' },
              ].map(t => (
                <button key={t.id} onClick={() => setAiTab(t.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${aiTab === t.id ? 'bg-orange-500/30 text-white' : 'text-white/50 hover:text-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {aiTab === 'trending' && aiResult.quickWins?.length > 0 && (
              <div className="card border border-orange-500/20 bg-orange-500/5 space-y-2">
                <p className="text-xs font-bold text-orange-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Quick Wins</p>
                {aiResult.quickWins.map((w, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                    <p className="text-xs text-white/80">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {aiTab === 'trending' && (
              <div className="space-y-3">
                {aiResult.trending?.map((item, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-black flex items-center justify-center">{i+1}</span>
                      <p className="text-sm font-bold text-white flex-1">{item.topic}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 text-yellow-300">🤖 AI</span>
                      <span className="text-[10px] text-white/40">{item.format}</span>
                    </div>
                    <p className="text-xs text-white/50 mb-3">{item.reason}</p>
                    <button onClick={() => navigate(`/create?topic=${encodeURIComponent(item.topic)}`)}
                      className="w-full text-xs py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 transition-all">
                      Create Video →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {aiTab === 'gaps' && (
              <div className="space-y-3">
                {aiResult.contentGaps?.map((g, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-white">{g.topic}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${g.competition === 'Low' ? 'bg-green-500/15 border-green-500/30 text-green-300' : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'}`}>
                        {g.competition} Competition
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-1">{g.demand}</p>
                    <p className="text-xs text-brand-300">→ {g.opportunity}</p>
                  </div>
                ))}
              </div>
            )}

            {aiTab === 'formats' && (
              <div className="space-y-3">
                {aiResult.bestFormats?.sort((a, b) => b.score - a.score).map((f, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-white">{f.format}</p>
                          <span className="text-[10px] text-white/40">{f.score}/10</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${f.score * 10}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-white/50 mb-1">{f.why}</p>
                    <p className="text-xs text-white/70 italic">"{f.example}"</p>
                  </div>
                ))}
              </div>
            )}

            {aiTab === 'language' && aiResult.languageTips && (
              <div className="space-y-3">
                <div className="card">
                  <p className="text-xs font-bold text-orange-400 mb-3">🎣 Hooks in {language}</p>
                  {aiResult.languageTips.hookPhrases?.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 glass rounded-lg mb-1.5">
                      <p className="text-sm text-white flex-1">"{h}"</p>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <p className="text-xs font-bold text-brand-400 mb-3">Power Words</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.languageTips.powerWords?.map((w, i) => (
                      <button key={i} onClick={() => navigator.clipboard.writeText(w)}
                        className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 text-sm font-semibold">
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                {aiResult.languageTips.thumbnailStyle && (
                  <div className="card border border-yellow-500/20 bg-yellow-500/5">
                    <p className="text-xs font-bold text-yellow-400 mb-1">Thumbnail Style</p>
                    <p className="text-sm text-white/80">{aiResult.languageTips.thumbnailStyle}</p>
                  </div>
                )}
                {aiResult.languageTips.avoidWords?.length > 0 && (
                  <div className="card border border-red-500/20 bg-red-500/5">
                    <p className="text-xs font-bold text-red-400 mb-2">Avoid These</p>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.languageTips.avoidWords.map((w, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">✕ {w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {aiTab === 'seasonal' && (
              <div className="space-y-3">
                {aiResult.seasonal?.map((s, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white">{s.event}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300">{s.timing}</span>
                      {s.urgency && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300">{s.urgency}</span>}
                    </div>
                    <p className="text-xs text-white/60">💡 {s.contentIdea}</p>
                    <button onClick={() => navigate(`/create?topic=${encodeURIComponent(s.contentIdea)}`)}
                      className="mt-2 w-full text-xs py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300">
                      Create →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {aiTab === 'competitor' && aiResult.competitors && (
              <div className="space-y-3">
                <div className="card">
                  <p className="text-xs font-bold text-white/60 mb-3">Top Creator Types</p>
                  {aiResult.competitors.topCreators?.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 glass rounded-lg mb-1.5">
                      <span className="text-[10px] text-brand-400 mt-0.5">{i+1}.</span>
                      <p className="text-xs text-white/70">{c}</p>
                    </div>
                  ))}
                </div>
                <div className="card border border-green-500/20 bg-green-500/5">
                  <p className="text-xs font-bold text-green-400 mb-2">Gaps Nobody Is Filling</p>
                  {aiResult.competitors.gaps?.map((g, i) => (
                    <p key={i} className="text-xs text-white/70 mb-1">→ {g}</p>
                  ))}
                </div>
                {aiResult.competitors.winStrategy && (
                  <div className="card border border-orange-500/20 bg-orange-500/5">
                    <p className="text-xs font-bold text-orange-400 mb-1">🏆 Your Winning Strategy</p>
                    <p className="text-sm text-white/80">{aiResult.competitors.winStrategy}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
