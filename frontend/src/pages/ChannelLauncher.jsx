import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ClipboardCopy, Check, ChevronRight, Search } from 'lucide-react';
import { callAI } from '../services/api.js';
import { HowTo } from '../components/HowTo.jsx';

// ── Constants ────────────────────────────────────────────────────────────────

const NICHES = [
  'Personal Finance', 'Fitness & Health', 'Food & Cooking', 'Travel',
  'Technology', 'Business & Startup', 'Education', 'Comedy & Entertainment',
  'Fashion & Style', 'Motivation', 'Gaming', 'Cooking',
  'Relationships', 'Spirituality', 'Real Estate',
];

const REGIONS = ['Punjab', 'Delhi', 'Mumbai', 'Bangalore', 'Gujarat', 'All India', 'Global'];

const LANGUAGES = [
  { id: 'Hindi', flag: '🇮🇳' },
  { id: 'English', flag: '🇬🇧' },
  { id: 'Hinglish', flag: '🔀' },
  { id: 'Punjabi', flag: '🌾' },
  { id: 'Tamil', flag: '🎭' },
  { id: 'Telugu', flag: '⭐' },
  { id: 'Bengali', flag: '🐯' },
];

const FREQ = ['1 video/week', '2 videos/week', '3 videos/week', 'Daily'];

// ── Shared ───────────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el);
      el.select(); document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 transition-all ${className}`}>
      {copied
        ? <><Check className="w-3.5 h-3.5" /> Copied!</>
        : <><ClipboardCopy className="w-3.5 h-3.5" /> {label}</>}
    </button>
  );
}

function CompBadge({ level }) {
  const map = {
    low:    'bg-green-500/20 border-green-500/30 text-green-400',
    medium: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    high:   'bg-red-500/20 border-red-500/30 text-red-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[level] || map.medium}`}>
      {level === 'low' ? '✅ Low comp' : level === 'medium' ? '⚠️ Medium' : '🔴 High'}
    </span>
  );
}

// ── Tab 1: Keyword Hunter ─────────────────────────────────────────────────────

function KeywordHunter({ onUseKeyword }) {
  const [niche, setNiche] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const [region, setRegion] = useState('All India');
  const [language, setLanguage] = useState('Hindi');
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const actualNiche = niche === 'custom' ? customNiche : niche;

  const hunt = async () => {
    if (!actualNiche) return;
    setLoading(true);
    setKeywords([]);
    setError('');

    const prompt = `You are a YouTube SEO expert helping a brand new channel (0 subscribers) find keywords they can rank #1 for.

NICHE: ${actualNiche}
REGION: ${region}
LANGUAGE: ${language}

Find 12 YouTube search keywords that a NEW channel can realistically rank for. The strategy:
- AVOID broad keywords (too much competition)
- FIND long-tail, specific, regional, or question-based keywords
- Keywords that real people type when they have a problem/question
- Where the top results are weak, old, or in wrong language

Examples of good keywords for a new channel:
- "SIP investment kaise kare beginners ke liye" (specific + Hindi)
- "how to save money on 15000 salary in India" (specific + regional)
- "gym workout at home without equipment for skinny guys India" (hyper-specific)

Return ONLY valid JSON array:
[{
  "keyword": "exact search phrase people type",
  "competition": "low",
  "monthlySearches": "~5K",
  "intent": "problem-solving",
  "why": "why a new channel can rank for this in 15 words",
  "videoIdea": "one-line video concept using this keyword",
  "titleIdea": "exact clickable YouTube title for this keyword"
}]

competition must be: low / medium / high
Make keywords in ${language} language mix where appropriate.`;

    try {
      const raw = await callAI(prompt, 'Find low-competition YouTube keywords.', 2000);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error();
      setKeywords(JSON.parse(match[0]));
    } catch {
      setError('Failed to generate. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <HowTo
        when="you have 0 subscribers and don't know what videos to make first"
        steps={[
          'Select your niche (topic your channel is about) and your region',
          'Click Find Keywords — AI finds 12 low-competition topics people actually search for',
          'Pick a keyword with green (Low) competition → click "Use This Keyword" to jump to the SEO tab',
        ]}
      />
      <div className="card space-y-4">
        {/* Niche */}
        <div>
          <label className="text-xs text-white/40 mb-2 block">Your channel niche</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
            {NICHES.map(n => (
              <button key={n} onClick={() => setNiche(n)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center leading-tight ${
                  niche === n
                    ? 'bg-green-500/30 border border-green-500/50 text-white'
                    : 'glass glass-hover text-white/50 border border-transparent'
                }`}>{n}</button>
            ))}
            <button onClick={() => setNiche('custom')}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                niche === 'custom'
                  ? 'bg-green-500/30 border border-green-500/50 text-white'
                  : 'glass glass-hover text-white/50 border border-transparent'
              }`}>+ Custom</button>
          </div>
          {niche === 'custom' && (
            <input value={customNiche} onChange={e => setCustomNiche(e.target.value)}
              placeholder="e.g. Dhol music, Hand embroidery, Truck driving tips"
              className="input-field text-sm" />
          )}
        </div>

        {/* Region + Language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 mb-2 block">Region</label>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`py-1 px-2.5 rounded-lg text-xs transition-all ${
                    region === r
                      ? 'bg-green-500/30 border border-green-500/40 text-green-300'
                      : 'glass glass-hover text-white/40 border border-transparent'
                  }`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-2 block">Language</label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(l => (
                <button key={l.id} onClick={() => setLanguage(l.id)}
                  className={`py-1 px-2.5 rounded-lg text-xs transition-all ${
                    language === l.id
                      ? 'bg-green-500/30 border border-green-500/40 text-green-300'
                      : 'glass glass-hover text-white/40 border border-transparent'
                  }`}>{l.flag} {l.id}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={hunt} disabled={loading || !actualNiche}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Hunting keywords...</>
            : <><Search className="w-4 h-4" /> Find Keywords I Can Rank #1 For</>}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {keywords.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-white/40 font-mono text-center">
            🎯 {keywords.filter(k => k.competition === 'low').length} LOW COMPETITION keywords found — these you can rank for NOW
          </div>
          {keywords.map((k, i) => (
            <div key={i} className={`card border ${
              k.competition === 'low' ? 'border-green-500/20' : 'border-white/10'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <CompBadge level={k.competition} />
                    <span className="text-xs text-white/30">{k.monthlySearches} searches/mo</span>
                    <span className="text-xs text-white/30">{k.intent}</span>
                  </div>
                  <p className="font-bold text-sm text-white">🔍 "{k.keyword}"</p>
                </div>
              </div>

              <p className="text-xs text-white/50 mb-2">{k.why}</p>

              <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-2.5 mb-3">
                <div className="text-xs text-green-400 mb-0.5">💡 Video Idea</div>
                <p className="text-xs text-white/70">{k.videoIdea}</p>
                <div className="text-xs text-white/30 mt-1.5 mb-0.5">🎬 Title Idea</div>
                <p className="text-xs text-white/80 font-medium">{k.titleIdea}</p>
              </div>

              <button
                onClick={() => onUseKeyword(k)}
                className="w-full py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-medium hover:bg-green-500/30 transition-all flex items-center justify-center gap-1.5">
                Use This Keyword → Get Full SEO Package
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: SEO Package ───────────────────────────────────────────────────────

function SEOPackage({ prefill }) {
  const [keyword, setKeyword] = useState(prefill?.keyword || '');
  const [channelName, setChannelName] = useState('');
  const [niche, setNiche] = useState(prefill?.niche || '');
  const [language, setLanguage] = useState('Hindi');
  const [city, setCity] = useState('');
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update keyword when prefill changes
  if (prefill?.keyword && keyword !== prefill.keyword && !pkg) {
    setKeyword(prefill.keyword);
    if (prefill.niche) setNiche(prefill.niche);
  }

  const generate = async () => {
    if (!keyword) return;
    setLoading(true);
    setPkg(null);
    setError('');

    const prompt = `You are a YouTube SEO expert. Create a complete launch package for a new creator's video.

TARGET KEYWORD: "${keyword}"
CHANNEL NAME: ${channelName || 'new channel'}
NICHE: ${niche || 'general'}
LANGUAGE: ${language}
CREATOR CITY: ${city || 'India'}

Generate a complete SEO package. Return ONLY valid JSON:
{
  "titles": [
    "title option 1 — searchable + clickable, includes keyword naturally",
    "title option 2 — slightly different angle",
    "title option 3 — question format",
    "title option 4 — number/list format",
    "title option 5 — emotional/curiosity format"
  ],
  "description": "Full YouTube description — first 150 chars are critical (show in search). Include: hook sentence, what video covers, 3 timestamps placeholder, about creator, 5 keywords naturally. Make it 200-250 words total.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15"],
  "thumbnail": {
    "mainText": "3-5 word bold text for thumbnail",
    "subText": "secondary text if needed",
    "emotion": "what face expression or visual to show",
    "colors": "background color scheme",
    "style": "describe the thumbnail layout"
  },
  "endScreen": "30-second spoken script to convert viewers to subscribers — specific, not generic",
  "postTime": "best day and time to post for this niche and region",
  "firstComment": "pin this comment immediately after posting — boosts early engagement",
  "communityPost": "first community post to create on channel launch day"
}`;

    try {
      const raw = await callAI(prompt, 'Generate complete YouTube SEO package.', 2500);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error();
      setPkg(JSON.parse(match[0]));
    } catch {
      setError('Failed to generate. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <HowTo
        when="you have a keyword and need to optimize your video before uploading"
        steps={[
          'Enter the keyword (or it auto-fills from Keyword Hunter), your channel name, and niche',
          'Click Generate — you get 5 title options, full description, 15 tags, thumbnail idea, and best posting time',
          'Copy each section directly into YouTube Studio when you upload your video',
        ]}
      />
      <div className="card space-y-4">
        {prefill?.keyword && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <div className="text-xs text-green-400 mb-0.5">✓ Keyword from hunter</div>
            <p className="font-medium text-sm text-white">{prefill.keyword}</p>
          </div>
        )}

        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Target keyword / topic</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="e.g. SIP investment kaise kare beginners ke liye"
            className="input-field text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Channel name</label>
            <input value={channelName} onChange={e => setChannelName(e.target.value)}
              placeholder="e.g. Paisa Talks" className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Your city</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="e.g. Ludhiana" className="input-field text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Niche</label>
            <input value={niche} onChange={e => setNiche(e.target.value)}
              placeholder="e.g. Personal Finance" className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Language</label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.slice(0, 4).map(l => (
                <button key={l.id} onClick={() => setLanguage(l.id)}
                  className={`py-1 px-2 rounded-lg text-xs transition-all ${
                    language === l.id
                      ? 'bg-blue-500/30 border border-blue-500/40 text-blue-300'
                      : 'glass glass-hover text-white/40 border border-transparent'
                  }`}>{l.flag} {l.id}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading || !keyword}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Building SEO package...</>
            : <>📦 Generate Full SEO Package</>}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {pkg && (
        <div className="space-y-4">
          {/* Titles */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-blue-400 font-mono">🎬 5 TITLE OPTIONS</span>
              <CopyBtn text={pkg.titles?.join('\n')} label="Copy All"
                className="py-1.5 px-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs" />
            </div>
            <div className="space-y-2">
              {pkg.titles?.map((t, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 glass rounded-xl">
                  <span className="text-xs text-white/30 shrink-0 mt-0.5">#{i + 1}</span>
                  <p className="text-sm text-white flex-1">{t}</p>
                  <CopyBtn text={t}
                    className="shrink-0 text-xs text-white/40 hover:text-white py-1 px-2 glass rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-blue-400 font-mono">📝 FULL DESCRIPTION</span>
              <CopyBtn text={pkg.description}
                className="py-1.5 px-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs" />
            </div>
            <pre className="whitespace-pre-wrap text-xs text-white/70 leading-relaxed max-h-48 overflow-y-auto bg-black/20 rounded-xl p-3">
              {pkg.description}
            </pre>
          </div>

          {/* Tags */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-blue-400 font-mono"># TAGS (15)</span>
              <CopyBtn text={pkg.tags?.join(', ')}
                className="py-1.5 px-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pkg.tags?.map((t, i) => (
                <span key={i} className="text-xs glass px-2.5 py-1 rounded-full text-white/60">{t}</span>
              ))}
            </div>
          </div>

          {/* Thumbnail */}
          <div className="card">
            <div className="text-xs text-blue-400 font-mono mb-3">🖼️ THUMBNAIL CONCEPT</div>
            <div className="bg-black/30 rounded-xl p-4 space-y-2 border border-white/5">
              <div className="text-center py-4 px-3 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10">
                <p className="text-xl font-black text-white leading-tight">{pkg.thumbnail?.mainText}</p>
                {pkg.thumbnail?.subText && (
                  <p className="text-sm text-yellow-400 mt-1">{pkg.thumbnail?.subText}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass p-2 rounded-lg">
                  <div className="text-white/30 mb-0.5">Expression</div>
                  <p className="text-white/70">{pkg.thumbnail?.emotion}</p>
                </div>
                <div className="glass p-2 rounded-lg">
                  <div className="text-white/30 mb-0.5">Colors</div>
                  <p className="text-white/70">{pkg.thumbnail?.colors}</p>
                </div>
              </div>
              <p className="text-xs text-white/40">{pkg.thumbnail?.style}</p>
            </div>
          </div>

          {/* End screen + Post time */}
          <div className="grid grid-cols-1 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-blue-400 font-mono">📢 END SCREEN SCRIPT</span>
                <CopyBtn text={pkg.endScreen}
                  className="py-1.5 px-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs" />
              </div>
              <p className="text-sm text-white/80 italic leading-relaxed">"{pkg.endScreen}"</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="card">
                <div className="text-xs text-white/30 mb-1">⏰ Best Post Time</div>
                <p className="text-sm font-medium text-amber-400">{pkg.postTime}</p>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/30">📌 Pin This Comment</span>
                  <CopyBtn text={pkg.firstComment}
                    className="text-xs text-white/40 hover:text-white py-1 px-2 glass rounded-lg" />
                </div>
                <p className="text-sm text-white/70 italic">"{pkg.firstComment}"</p>
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/30">📣 Community Post</span>
                  <CopyBtn text={pkg.communityPost}
                    className="text-xs text-white/40 hover:text-white py-1 px-2 glass rounded-lg" />
                </div>
                <p className="text-sm text-white/70 italic">"{pkg.communityPost}"</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: 30-Day Launch Plan ────────────────────────────────────────────────

function LaunchPlan() {
  const [niche, setNiche] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const [language, setLanguage] = useState('Hindi');
  const [region, setRegion] = useState('All India');
  const [freq, setFreq] = useState('2 videos/week');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const actualNiche = niche === 'custom' ? customNiche : niche;

  const generate = async () => {
    if (!actualNiche) return;
    setLoading(true);
    setPlan(null);
    setError('');

    const videosPerWeek = freq.startsWith('1') ? 1 : freq.startsWith('2') ? 2 : freq.startsWith('3') ? 3 : 7;
    const totalVideos = videosPerWeek * 4;

    const prompt = `You are a YouTube growth strategist for new channels (0 subscribers).

NICHE: ${actualNiche}
LANGUAGE: ${language}
REGION: ${region}
POSTING: ${freq} for 4 weeks = ${totalVideos} total videos

Create a strategic 30-day launch plan. Each video must:
- Be specific (real title, not "video about X")
- Target a low-competition keyword a new channel can rank for
- Build on the previous video (logical progression)
- Follow this weekly strategy:
  Week 1: Foundation — 2 evergreen SEO videos (get found by search)
  Week 2: Authority — slightly broader topics + 1 trending angle
  Week 3: Community — answer audience questions, relatable content
  Week 4: Growth — best performing topic variation + collaboration hook

Return ONLY valid JSON:
{
  "strategy": "2-sentence overall channel strategy for first 30 days",
  "weeks": [
    {
      "week": 1,
      "theme": "week theme",
      "goal": "what this week achieves",
      "videos": [
        {
          "day": 3,
          "title": "exact YouTube title",
          "keyword": "target keyword",
          "competition": "low",
          "why": "why this video at this point — 10 words",
          "hook": "opening line for this video"
        }
      ]
    }
  ],
  "milestones": [
    { "week": 1, "target": "realistic milestone for week 1" },
    { "week": 2, "target": "week 2 milestone" },
    { "week": 3, "target": "week 3 milestone" },
    { "week": 4, "target": "week 4 milestone" }
  ],
  "growthTip": "one specific tip for this niche + region combination that most new creators miss"
}`;

    try {
      const raw = await callAI(prompt, 'Generate 30-day YouTube launch plan.', 2500);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error();
      setPlan(JSON.parse(match[0]));
    } catch {
      setError('Failed to generate. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const compColor = (c) => c === 'low' ? 'text-green-400' : c === 'medium' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-5">
      <HowTo
        when="you just started your channel and don't know what to post for the first month"
        steps={[
          'Enter your niche, how often you can post per week, and your region',
          'Click Generate — you get a week-by-week plan with specific video titles, keywords, and hooks',
          'Follow it week by week — each video has a reason why it\'s ordered that way for algorithm growth',
        ]}
      />
      <div className="card space-y-4">
        <div>
          <label className="text-xs text-white/40 mb-2 block">Your niche</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
            {NICHES.slice(0, 10).map(n => (
              <button key={n} onClick={() => setNiche(n)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-all text-center leading-tight ${
                  niche === n
                    ? 'bg-violet-500/30 border border-violet-500/50 text-white'
                    : 'glass glass-hover text-white/50 border border-transparent'
                }`}>{n}</button>
            ))}
            <button onClick={() => setNiche('custom')}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                niche === 'custom'
                  ? 'bg-violet-500/30 border border-violet-500/50 text-white'
                  : 'glass glass-hover text-white/50 border border-transparent'
              }`}>+ Custom</button>
          </div>
          {niche === 'custom' && (
            <input value={customNiche} onChange={e => setCustomNiche(e.target.value)}
              placeholder="e.g. Astrology in Hindi" className="input-field text-sm" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 mb-2 block">Language</label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.slice(0, 4).map(l => (
                <button key={l.id} onClick={() => setLanguage(l.id)}
                  className={`py-1 px-2 rounded-lg text-xs transition-all ${
                    language === l.id
                      ? 'bg-violet-500/30 border border-violet-500/40 text-violet-300'
                      : 'glass glass-hover text-white/40 border border-transparent'
                  }`}>{l.flag} {l.id}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-2 block">Region</label>
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.slice(0, 4).map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`py-1 px-2.5 rounded-lg text-xs transition-all ${
                    region === r
                      ? 'bg-violet-500/30 border border-violet-500/40 text-violet-300'
                      : 'glass glass-hover text-white/40 border border-transparent'
                  }`}>{r}</button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 mb-2 block">How often can you post?</label>
          <div className="flex flex-wrap gap-2">
            {FREQ.map(f => (
              <button key={f} onClick={() => setFreq(f)}
                className={`py-2 px-3 rounded-lg text-xs transition-all ${
                  freq === f
                    ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300'
                    : 'glass glass-hover text-white/50 border border-transparent'
                }`}>{f}</button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading || !actualNiche}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Building your launch plan...</>
            : <>📅 Generate My 30-Day Launch Plan</>}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {plan && (
        <div className="space-y-4">
          {/* Strategy */}
          <div className="card bg-violet-500/5 border border-violet-500/20">
            <div className="text-xs text-violet-400 font-mono mb-2">🎯 YOUR 30-DAY STRATEGY</div>
            <p className="text-sm text-white/80 leading-relaxed">{plan.strategy}</p>
          </div>

          {/* Milestones */}
          <div className="card">
            <div className="text-xs text-white/40 font-mono mb-3">📈 WEEKLY MILESTONES</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {plan.milestones?.map((m, i) => (
                <div key={i} className="glass rounded-xl p-2.5 text-center">
                  <div className="text-xs text-white/30 mb-1">Week {m.week}</div>
                  <p className="text-xs text-white/70 leading-tight">{m.target}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Week-by-week */}
          {plan.weeks?.map((week, wi) => (
            <div key={wi} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-violet-400 font-mono">WEEK {week.week} — {week.theme}</div>
                  <p className="text-xs text-white/40 mt-0.5">{week.goal}</p>
                </div>
              </div>
              <div className="space-y-2">
                {week.videos?.map((v, vi) => (
                  <div key={vi} className="border border-white/10 rounded-xl p-3 glass">
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-xs text-violet-400 font-bold">
                        {vi + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white leading-snug mb-1">{v.title}</p>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-white/30">🔍 {v.keyword}</span>
                          <span className={`text-xs font-medium ${compColor(v.competition)}`}>
                            {v.competition === 'low' ? '✅ low comp' : v.competition === 'medium' ? '⚠️ medium' : '🔴 high'}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mb-1">{v.why}</p>
                        <div className="bg-amber-500/10 border border-amber-500/15 rounded-lg px-2.5 py-1.5">
                          <span className="text-xs text-amber-400">Hook: </span>
                          <span className="text-xs text-white/70 italic">"{v.hook}"</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Growth tip */}
          {plan.growthTip && (
            <div className="card bg-amber-500/5 border border-amber-500/20">
              <div className="text-xs text-amber-400 font-mono mb-2">💡 PRO TIP FOR YOUR NICHE</div>
              <p className="text-sm text-white/80 leading-relaxed">{plan.growthTip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'keywords', label: '🔍 Keyword Hunter', short: 'Keywords', desc: 'Find topics you can rank #1 for this week — even at 0 subscribers' },
  { id: 'seo',      label: '📦 SEO Package',    short: 'SEO',      desc: 'Titles, description, tags, thumbnail, end screen — all in one click' },
  { id: 'plan',     label: '📅 30-Day Plan',    short: 'Plan',     desc: 'Your first 30 days mapped video by video with specific topics' },
];

export default function ChannelLauncher() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('keywords');
  const [seoKwPrefill, setSeoKwPrefill] = useState(null);

  const handleUseKeyword = (kw) => {
    setSeoKwPrefill(kw);
    setActiveTab('seo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-lg">
              🚀
            </div>
            <span className="text-xl font-bold gradient-text">Channel Launcher</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-white/40 text-xs">For new channels · 0 subscribers · first 30 days</p>
        </div>

        {/* Tabs */}
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
        <p className="text-xs text-white/30 text-center mb-8">
          {TABS.find(t => t.id === activeTab)?.desc}
        </p>

        {activeTab === 'keywords' && <KeywordHunter onUseKeyword={handleUseKeyword} />}
        {activeTab === 'seo'      && <SEOPackage prefill={seoKwPrefill} />}
        {activeTab === 'plan'     && <LaunchPlan />}
      </div>
    </div>
  );
}
