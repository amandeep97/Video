import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Globe, MapPin, Loader2, AlertTriangle, Copy, Check,
  TrendingUp, Lightbulb, Users, Languages, Calendar, Flame,
  ChevronDown, ChevronUp, Zap, BarChart2, Target, Wifi, WifiOff, Key
} from 'lucide-react';
import { callAI } from '../services/api.js';
import { getBackendUrl } from '../services/replicate.js';

// Map region names → ISO country code for Google Trends / YouTube
const GEO_CODES = {
  default: 'IN',
  Pakistan: 'PK', Bangladesh: 'BD', Nepal: 'NP', 'Sri Lanka': 'LK',
  USA: 'US', UK: 'GB', Canada: 'CA', Australia: 'AU',
  UAE: 'AE', 'Saudi Arabia': 'SA', Global: 'US',
};
function getGeoCode(region) { return GEO_CODES[region] || GEO_CODES.default; }

// Reddit subreddits for live trending topics — works without any backend/API key
const REGION_SUBREDDITS = {
  Punjab:           ['punjab', 'india', 'bollywood'],
  Haryana:          ['india', 'bollywood', 'cricket'],
  Delhi:            ['delhi', 'india', 'IndianStreetFood'],
  'Uttar Pradesh':  ['india', 'cricket', 'bollywood'],
  Bihar:            ['india', 'cricket', 'bollywood'],
  Maharashtra:      ['mumbai', 'pune', 'india'],
  Gujarat:          ['india', 'cricket', 'bollywood'],
  'Tamil Nadu':     ['Chennai', 'kollywood', 'india'],
  Karnataka:        ['bangalore', 'india', 'cricket'],
  'West Bengal':    ['kolkata', 'india', 'cricket'],
  Mumbai:           ['mumbai', 'india', 'bollywood'],
  Bengaluru:        ['bangalore', 'india', 'tech'],
  Pakistan:         ['pakistan', 'cricket', 'PakistanPolitics'],
  USA:              ['worldnews', 'news', 'AskReddit'],
  UK:               ['unitedkingdom', 'worldnews', 'news'],
  Global:           ['worldnews', 'AskReddit', 'technology'],
  default:          ['india', 'bollywood', 'cricket'],
};
function getSubreddits(region) { return REGION_SUBREDDITS[region] || REGION_SUBREDDITS.default; }

const REGIONS = [
  { group: 'India – States', items: ['Punjab', 'Haryana', 'Delhi', 'Uttar Pradesh', 'Bihar', 'Rajasthan', 'Maharashtra', 'Gujarat', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Karnataka', 'Kerala', 'West Bengal', 'Odisha', 'Jharkhand', 'Himachal Pradesh', 'Uttarakhand', 'Madhya Pradesh', 'Chhattisgarh', 'Assam', 'Jammu & Kashmir'] },
  { group: 'India – Cities', items: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Jaipur', 'Lucknow', 'Chandigarh', 'Surat', 'Patna', 'Bhopal', 'Amritsar', 'Ludhiana'] },
  { group: 'India – Tier', items: ['Rural India', 'Semi-urban India', 'Tier-2 Cities India', 'Tier-3 Cities India', 'Metro Cities India', 'North India', 'South India', 'East India', 'West India'] },
  { group: 'South Asia', items: ['Pakistan', 'Bangladesh', 'Nepal', 'Sri Lanka'] },
  { group: 'Global', items: ['USA', 'UK', 'Canada', 'Australia', 'UAE', 'Saudi Arabia', 'Global'] },
];

const LANGUAGES = [
  'Hindi', 'Punjabi', 'Bhojpuri', 'Haryanvi', 'Rajasthani', 'Maithili',
  'Bengali', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Odia', 'Assamese', 'Urdu', 'English', 'Hinglish',
];

const AGE_GROUPS = [
  { id: '13-17', label: 'Gen Z (13-17)' },
  { id: '18-24', label: 'Young Adults (18-24)' },
  { id: '25-35', label: 'Millennials (25-35)' },
  { id: '35-50', label: 'Gen X (35-50)' },
  { id: '50+',   label: 'Seniors (50+)' },
  { id: 'all',   label: 'All Ages' },
];

const PLATFORMS = [
  { id: 'youtube',   label: 'YouTube',   emoji: '▶️' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok',   label: 'TikTok',    emoji: '🎵' },
  { id: 'sharechat', label: 'ShareChat', emoji: '🇮🇳' },
  { id: 'moj',      label: 'Moj',       emoji: '🎬' },
  { id: 'josh',     label: 'Josh',      emoji: '⚡' },
  { id: 'facebook', label: 'Facebook',  emoji: '📘' },
];

const NICHES = [
  'general', 'entertainment', 'comedy', 'education', 'fitness', 'food',
  'travel', 'tech', 'fashion', 'beauty', 'motivation', 'business',
  'gaming', 'music', 'sports', 'devotional', 'politics', 'farming',
];

const TABS = [
  { id: 'trending',    label: 'Trending Now',   icon: Flame },
  { id: 'gaps',        label: 'Content Gaps',   icon: Target },
  { id: 'formats',     label: 'Best Formats',   icon: BarChart2 },
  { id: 'language',    label: 'Language Tips',  icon: Languages },
  { id: 'seasonal',    label: 'Seasonal',       icon: Calendar },
  { id: 'competitor',  label: 'Competitors',    icon: Users },
];

const TREND_SYSTEM = `You are an expert in regional content trends, especially for Indian and South Asian audiences.
You have deep knowledge of what content goes viral in each Indian state, language community, age group, and platform.
You know about Indian culture, festivals, regional slang, trending topics, and what formats perform best.
Always respond with valid JSON only, no markdown, no extra text.`;

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handle}
      className="w-7 h-7 rounded-lg glass glass-hover flex items-center justify-center flex-shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

function Tag({ children, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-500/15 border-brand-500/30 text-brand-300',
    green:  'bg-green-500/15 border-green-500/30 text-green-300',
    yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
    purple: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    red:    'bg-red-500/15 border-red-500/30 text-red-300',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[color] || colors.brand}`}>
      {children}
    </span>
  );
}

export default function TrendIntelligence() {
  const navigate = useNavigate();

  const [region,    setRegion]    = useState('Punjab');
  const [language,  setLanguage]  = useState('Punjabi');
  const [ageGroup,  setAgeGroup]  = useState('18-24');
  const [platform,  setPlatform]  = useState('youtube');
  const [niche,     setNiche]     = useState('general');
  const [customReg, setCustomReg] = useState('');

  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showLangPicker,   setShowLangPicker]   = useState(false);
  const [showNiche,        setShowNiche]         = useState(false);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [result,   setResult]   = useState(null);
  const [activeTab, setActiveTab] = useState('trending');

  // Live trends state
  const [redditPosts,  setRedditPosts]  = useState([]);
  const [redditLoading,setRedditLoading]= useState(false);
  const [ytApiKey,     setYtApiKey]     = useState('');
  const [showYtKey,    setShowYtKey]    = useState(false);
  const [ytTrending,   setYtTrending]   = useState([]);
  const [ytLoading,    setYtLoading]    = useState(false);
  // Google Trends (needs backend)
  const [gTrends,      setGTrends]      = useState([]);
  const [gTrendsErr,   setGTrendsErr]   = useState('');

  const effectiveRegion = customReg.trim() || region;
  const geo = getGeoCode(effectiveRegion);

  // Auto-fetch Reddit hot posts — works without any backend or API key
  useEffect(() => {
    setRedditLoading(true);
    setRedditPosts([]);
    const subs = getSubreddits(effectiveRegion);

    // Try subreddits in order, stop when we get enough posts
    const tryFetch = async () => {
      for (const sub of subs) {
        try {
          const r = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=20`);
          const d = await r.json();
          const posts = (d?.data?.children || [])
            .map(c => c.data)
            .filter(p => !p.stickied)
            .slice(0, 10)
            .map(p => ({ title: p.title, score: p.score, comments: p.num_comments, sub: p.subreddit }));
          if (posts.length >= 5) {
            setRedditPosts(posts);
            return;
          }
        } catch { /* try next */ }
      }
    };

    tryFetch().finally(() => setRedditLoading(false));

    // Also try Google Trends via backend if available
    const backendUrl = getBackendUrl();
    if (backendUrl) {
      setGTrends([]);
      setGTrendsErr('');
      fetch(`${backendUrl}/api/trends/google?geo=${geo}`)
        .then(r => r.json())
        .then(d => { if (d.trends) setGTrends(d.trends); else setGTrendsErr('unavailable'); })
        .catch(() => setGTrendsErr('unavailable'));
    } else {
      setGTrendsErr('no-backend');
    }
  }, [effectiveRegion, geo]);

  const fetchYouTubeTrending = () => {
    const backendUrl = getBackendUrl();
    if (!backendUrl || !ytApiKey.trim()) return;
    setYtLoading(true);
    setYtTrending([]);
    fetch(`${backendUrl}/api/trends/youtube?regionCode=${geo}&apiKey=${ytApiKey.trim()}`)
      .then(r => r.json())
      .then(d => { if (d.videos) setYtTrending(d.videos); })
      .catch(() => {})
      .finally(() => setYtLoading(false));
  };

  const buildPrompt = () => `Analyze content trends for this specific regional audience:

Region: ${effectiveRegion}
Language: ${language}
Age Group: ${ageGroup}
Primary Platform: ${platform}
Niche Focus: ${niche}
Current Month: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}

Give hyper-specific, actionable insights based on real cultural knowledge of this region.

Respond with ONLY this JSON:
{
  "trending": [
    { "topic": "<topic>", "reason": "<why it's trending>", "potential": <1-10>, "format": "<Shorts|Long|Reel|etc>" }
  ],
  "contentGaps": [
    { "topic": "<underserved topic>", "demand": "<why people want it>", "competition": "<Low|Medium>", "opportunity": "<specific angle>" }
  ],
  "bestFormats": [
    { "format": "<Comedy|Educational|Emotional|etc>", "why": "<why it works here>", "example": "<example video idea>", "score": <1-10> }
  ],
  "languageTips": {
    "hookPhrases": ["<attention-grabbing opener in ${language} or transliterated>"],
    "titleFormulas": ["<title formula that works in ${language}>"],
    "powerWords": ["<word1>", "<word2>", "<word3>", "<word4>", "<word5>"],
    "thumbnailStyle": "<describe what thumbnail style works for this audience>",
    "avoidWords": ["<word or phrase that turns this audience off>"]
  },
  "seasonal": [
    { "event": "<festival/event>", "timing": "<when>", "contentIdea": "<specific video idea>", "urgency": "<weeks away>" }
  ],
  "competitors": {
    "topCreators": ["<creator type/name> — <what they do>"],
    "gaps": ["<content gap — nobody is making X but people want it>"],
    "winStrategy": "<how to beat established creators in this region>"
  },
  "quickWins": ["<immediate action to take>", "<another quick win>", "<third quick win>"]
}`;

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setActiveTab('trending');
    try {
      const content = await callAI(TREND_SYSTEM, buildPrompt(), 3000);
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI returned invalid format. Try again.');
      setResult(JSON.parse(match[0]));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white">Trend Intelligence</span>
              <span className="text-xs text-white/40 ml-2">Regional content strategy</span>
            </div>
          </div>
          <button onClick={() => navigate('/viral')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 text-xs font-medium hover:bg-green-500/20 transition-all">
            <TrendingUp className="w-3.5 h-3.5" />
            Algorithm Cracker
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        {/* Input card */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-1">Regional Trend Intelligence</h2>
          <p className="text-xs text-white/40 mb-4">Find what your specific regional audience is watching, searching, and sharing right now</p>

          <div className="space-y-4">

            {/* Region */}
            <div>
              <label className="text-xs text-white/50 mb-2 block">Region / Location</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    value={customReg}
                    onChange={e => setCustomReg(e.target.value)}
                    placeholder={`Using: ${region}`}
                    className="input-field pl-9 text-sm"
                  />
                </div>
                <button onClick={() => setShowRegionPicker(s => !s)}
                  className="px-3 py-2 glass glass-hover rounded-xl text-xs text-white/60 flex items-center gap-1">
                  Browse {showRegionPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              {showRegionPicker && (
                <div className="card bg-dark-900 max-h-56 overflow-y-auto space-y-3">
                  {REGIONS.map(g => (
                    <div key={g.group}>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">{g.group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map(r => (
                          <button key={r} onClick={() => { setRegion(r); setCustomReg(''); setShowRegionPicker(false); }}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                              region === r && !customReg ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' : 'glass text-white/50 hover:text-white'
                            }`}>{r}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="text-xs text-white/50 mb-2 block">Content Language</label>
              <button onClick={() => setShowLangPicker(s => !s)}
                className="flex items-center gap-2 px-3 py-2 glass glass-hover rounded-xl text-sm w-full text-left">
                <Languages className="w-4 h-4 text-white/40" />
                <span className="flex-1 text-white">{language}</span>
                {showLangPicker ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </button>
              {showLangPicker && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => { setLanguage(l); setShowLangPicker(false); }}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        language === l ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' : 'glass text-white/50 hover:text-white'
                      }`}>{l}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Age Group */}
            <div>
              <label className="text-xs text-white/50 mb-2 block">Target Age Group</label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map(a => (
                  <button key={a.id} onClick={() => setAgeGroup(a.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      ageGroup === a.id
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-200'
                        : 'glass border-white/10 text-white/50 hover:text-white'
                    }`}>{a.label}</button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs text-white/50 mb-2 block">Primary Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      platform === p.id
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-200'
                        : 'glass border-white/10 text-white/50 hover:text-white'
                    }`}>
                    <span>{p.emoji}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Niche */}
            <div>
              <button onClick={() => setShowNiche(s => !s)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70">
                Niche: <span className="text-white/70 capitalize">{niche}</span>
                {showNiche ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showNiche && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NICHES.map(n => (
                    <button key={n} onClick={() => { setNiche(n); setShowNiche(false); }}
                      className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-all ${
                        niche === n ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' : 'glass text-white/40 hover:text-white'
                      }`}>{n}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleAnalyze} disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing {effectiveRegion}…</>
                : <><Globe className="w-4 h-4" /> Analyze {effectiveRegion} Trends</>}
            </button>

            {error && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Live Trending Data ─────────────────────────────────────────── */}
        <div className="card mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-white">Live Trending Now</span>
              <p className="text-[10px] text-white/30 mt-0.5">Real posts from Reddit — not AI guesses</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-300">LIVE</span>
          </div>

          {/* Reddit hot posts — works on any device, no API key */}
          <div>
            <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
              {redditLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flame className="w-3 h-3 text-orange-400" />}
              Hot on r/{getSubreddits(effectiveRegion)[0]} right now
            </p>
            {redditLoading && (
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-7 w-32 rounded-full bg-white/5 animate-pulse" />)}
              </div>
            )}
            {!redditLoading && redditPosts.length > 0 && (
              <div className="space-y-1.5">
                {redditPosts.map((p, i) => (
                  <button key={i}
                    onClick={() => navigate(`/viral?topic=${encodeURIComponent(p.title)}`)}
                    className="w-full flex items-center gap-3 p-2.5 glass rounded-xl border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all text-left group">
                    <span className="text-[10px] text-white/25 w-5 flex-shrink-0 font-mono">{i+1}</span>
                    <p className="text-xs text-white/80 flex-1 leading-snug group-hover:text-white line-clamp-2">{p.title}</p>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[10px] text-orange-300">▲ {p.score.toLocaleString()}</p>
                      <p className="text-[9px] text-white/20">Analyze →</p>
                    </div>
                  </button>
                ))}
                <p className="text-[10px] text-white/20 pt-1">Tap any topic → get full viral analysis in Algorithm Cracker</p>
              </div>
            )}
          </div>

          {/* Google Trends (needs backend) */}
          {gTrends.length > 0 && (
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-green-400" /> Google Trending Searches in {geo}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {gTrends.slice(0, 12).map((t, i) => (
                  <button key={i}
                    onClick={() => navigate(`/viral?topic=${encodeURIComponent(t.title)}`)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full glass border border-white/10 hover:border-green-500/30 text-xs text-white/70 hover:text-white transition-all">
                    {t.title} {t.traffic && <span className="text-[9px] text-green-400">{t.traffic}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {gTrendsErr === 'no-backend' && (
            <p className="text-[10px] text-white/20 pt-2 border-t border-white/5">
              + Google Trends live data available after deploying backend
            </p>
          )}

          {/* YouTube Trending */}
          <div className="pt-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 flex items-center gap-1.5">▶️ YouTube Trending in {geo}</span>
              <button onClick={() => setShowYtKey(s => !s)}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60">
                <Key className="w-3 h-3" /> {showYtKey ? 'Hide' : 'Add free API key'}
              </button>
            </div>
            {showYtKey && (
              <div className="flex gap-2">
                <input value={ytApiKey} onChange={e => setYtApiKey(e.target.value)}
                  placeholder="YouTube Data API v3 key — free from console.cloud.google.com"
                  className="input-field text-xs flex-1" />
                <button onClick={fetchYouTubeTrending} disabled={!ytApiKey.trim() || ytLoading}
                  className="px-3 py-2 glass glass-hover rounded-xl text-xs text-orange-300 disabled:opacity-40 flex items-center gap-1">
                  {ytLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load'}
                </button>
              </div>
            )}
            {ytTrending.length > 0 && (
              <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                {ytTrending.slice(0, 8).map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 glass rounded-xl">
                    <span className="text-[10px] text-white/25 w-4">#{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{v.title}</p>
                      <p className="text-[10px] text-white/30">{Number(v.views).toLocaleString()} views · {v.channel}</p>
                    </div>
                    <button onClick={() => navigate(`/viral?topic=${encodeURIComponent(v.title)}`)}
                      className="text-[10px] glass px-2 py-1 rounded text-orange-300 flex-shrink-0">Analyze</button>
                  </div>
                ))}
              </div>
            )}
            {!showYtKey && !ytTrending.length && (
              <p className="text-[10px] text-white/20">Free quota: 10,000 requests/day · no billing needed</p>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">

            {/* Quick wins banner */}
            {result.quickWins?.length > 0 && (
              <div className="card border border-orange-500/20 bg-orange-500/5">
                <p className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Quick Wins for {effectiveRegion}
                </p>
                <div className="space-y-1.5">
                  {result.quickWins.map((w, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                      <p className="text-xs text-white/80">{w}</p>
                    </div>
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
                      activeTab === t.id ? 'bg-orange-500/30 text-white' : 'text-white/50 hover:text-white'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Trending Now */}
            {activeTab === 'trending' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white/40 flex-1">What {effectiveRegion} audiences are watching right now on {platform}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 text-yellow-400 flex-shrink-0">🤖 AI Predicted</span>
                </div>
                {result.trending?.map((item, i) => (
                  <div key={i} className="card glass-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-sm font-black text-orange-300 flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold text-white">{item.topic}</p>
                          <Tag color="yellow">{item.format}</Tag>
                          <Tag color={item.potential >= 8 ? 'green' : 'brand'}>🔥 {item.potential}/10</Tag>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed">{item.reason}</p>
                      </div>
                      <CopyBtn text={item.topic} />
                    </div>
                    <button
                      onClick={() => navigate(`/create?topic=${encodeURIComponent(item.topic)}&style=professional`)}
                      className="mt-3 w-full text-xs py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 transition-all">
                      Create Video →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Content Gaps */}
            {activeTab === 'gaps' && (
              <div className="space-y-3">
                <p className="text-xs text-white/40">Underserved topics with high demand — nobody is making these but people want them</p>
                {result.contentGaps?.map((gap, i) => (
                  <div key={i} className="card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-white flex-1">{gap.topic}</p>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Tag color={gap.competition === 'Low' ? 'green' : 'yellow'}>
                          {gap.competition} Competition
                        </Tag>
                      </div>
                    </div>
                    <p className="text-xs text-white/50 mb-1.5"><span className="text-white/70">Why people want it:</span> {gap.demand}</p>
                    <p className="text-xs text-white/50"><span className="text-brand-300">Your angle:</span> {gap.opportunity}</p>
                    <button
                      onClick={() => navigate(`/viral?topic=${encodeURIComponent(gap.topic)}`)}
                      className="mt-3 w-full text-xs py-1.5 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 hover:bg-brand-500/25 transition-all">
                      Analyze Viral Potential →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Best Formats */}
            {activeTab === 'formats' && (
              <div className="space-y-3">
                <p className="text-xs text-white/40">Content formats ranked by performance for {effectiveRegion} {language} audience</p>
                {result.bestFormats?.sort((a, b) => b.score - a.score).map((fmt, i) => (
                  <div key={i} className="card">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-white">{fmt.format}</p>
                          <Tag color={fmt.score >= 8 ? 'green' : fmt.score >= 6 ? 'yellow' : 'brand'}>
                            {fmt.score}/10
                          </Tag>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                            style={{ width: `${fmt.score * 10}%`, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-white/50 mb-1.5">{fmt.why}</p>
                    <p className="text-xs text-white/70 italic">Example: "{fmt.example}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Language Tips */}
            {activeTab === 'language' && result.languageTips && (
              <div className="space-y-4">
                <p className="text-xs text-white/40">Content strategy specific to {language} audience</p>

                {/* Hook phrases */}
                <div className="card">
                  <p className="text-xs font-semibold text-orange-400 mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Scroll-Stopping Hook Phrases in {language}
                  </p>
                  <div className="space-y-2">
                    {result.languageTips.hookPhrases?.map((hook, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 glass rounded-xl">
                        <p className="text-sm text-white flex-1">"{hook}"</p>
                        <CopyBtn text={hook} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title formulas */}
                <div className="card">
                  <p className="text-xs font-semibold text-brand-400 mb-3">High-CTR Title Formulas</p>
                  <div className="space-y-2">
                    {result.languageTips.titleFormulas?.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 glass rounded-xl">
                        <p className="text-sm text-white/80 flex-1">{t}</p>
                        <CopyBtn text={t} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Power words */}
                {result.languageTips.powerWords?.length > 0 && (
                  <div className="card">
                    <p className="text-xs font-semibold text-green-400 mb-3">Power Words That Get Clicks</p>
                    <div className="flex flex-wrap gap-2">
                      {result.languageTips.powerWords.map((w, i) => (
                        <button key={i} onClick={() => navigator.clipboard.writeText(w)}
                          className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 text-sm font-semibold hover:bg-green-500/25 transition-all">
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thumbnail style */}
                {result.languageTips.thumbnailStyle && (
                  <div className="card border border-yellow-500/20 bg-yellow-500/5">
                    <p className="text-xs font-semibold text-yellow-400 mb-2">Thumbnail Style for {language} Audience</p>
                    <p className="text-sm text-white/80">{result.languageTips.thumbnailStyle}</p>
                  </div>
                )}

                {/* Words to avoid */}
                {result.languageTips.avoidWords?.length > 0 && (
                  <div className="card border border-red-500/20 bg-red-500/5">
                    <p className="text-xs font-semibold text-red-400 mb-2">Words/Phrases to Avoid</p>
                    <div className="flex flex-wrap gap-2">
                      {result.languageTips.avoidWords.map((w, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
                          ✕ {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seasonal */}
            {activeTab === 'seasonal' && (
              <div className="space-y-3">
                <p className="text-xs text-white/40">Upcoming events, festivals, and seasonal opportunities in {effectiveRegion}</p>
                {result.seasonal?.map((s, i) => (
                  <div key={i} className="card">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-bold text-white">{s.event}</p>
                          <Tag color="purple">{s.timing}</Tag>
                          {s.urgency && <Tag color="red">{s.urgency}</Tag>}
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">💡 {s.contentIdea}</p>
                      </div>
                      <CopyBtn text={s.contentIdea} />
                    </div>
                    <button
                      onClick={() => navigate(`/create?topic=${encodeURIComponent(s.contentIdea)}`)}
                      className="mt-3 w-full text-xs py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all">
                      Create This Video →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Competitor Research */}
            {activeTab === 'competitor' && result.competitors && (
              <div className="space-y-4">
                <p className="text-xs text-white/40">Who's winning in {effectiveRegion} and how to beat them</p>

                <div className="card">
                  <p className="text-xs font-semibold text-white/70 mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Top Creator Types in This Space
                  </p>
                  <div className="space-y-2">
                    {result.competitors.topCreators?.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 glass rounded-xl">
                        <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                        <p className="text-xs text-white/70">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card border border-green-500/20 bg-green-500/5">
                  <p className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Content Gaps Nobody Is Filling
                  </p>
                  <div className="space-y-2">
                    {result.competitors.gaps?.map((g, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-green-400 text-xs mt-0.5">→</span>
                        <p className="text-xs text-white/70">{g}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.competitors.winStrategy && (
                  <div className="card border border-orange-500/20 bg-orange-500/5">
                    <p className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Your Winning Strategy
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed">{result.competitors.winStrategy}</p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-bold text-white/70 mb-2">Regional intelligence, not generic advice</h3>
            <p className="text-sm text-white/30 max-w-sm mx-auto leading-relaxed">
              Select your region, language, and audience — get hyper-local content strategy that tools targeting only English audiences completely miss.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['Punjab', 'Delhi', 'Mumbai', 'Bihar', 'Rural India'].map(r => (
                <button key={r} onClick={() => { setRegion(r); setCustomReg(''); }}
                  className={`px-3 py-1.5 rounded-xl text-xs glass glass-hover transition-all ${region === r ? 'text-orange-300 border border-orange-500/40' : 'text-white/40'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
