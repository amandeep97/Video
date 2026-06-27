import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Youtube, Loader2, Search, Eye, ThumbsUp, MessageCircle,
  RefreshCw, LogOut, Sparkles, ExternalLink, AlertCircle, Copy, Check, KeyRound,
} from 'lucide-react';
import {
  getYtKey, saveYtKey, getCachedChannel, cacheChannel, clearYtChannel,
  resolveChannel, fetchChannelVideos, searchVideos,
  verdictForOwn, engagementRate, median,
} from '../services/youtube.js';
import { callAI, hasValidKey } from '../services/api.js';

const COLORS = {
  green: 'border-green-500/30 bg-green-500/10 text-green-300',
  cyan:  'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  slate: 'border-white/10 bg-white/5 text-white/50',
};

const TABS = [
  { id: 'mine',   label: 'My Channel',     icon: Youtube },
  { id: 'spy',    label: 'Competitor Spy', icon: Search },
  { id: 'titles', label: 'Title Maker',    icon: Sparkles },
];

function num(n) { return (n || 0).toLocaleString(); }

function Stat({ icon: Icon, value }) {
  return (
    <span className="flex items-center gap-1 text-xs text-white/60">
      <Icon className="w-3.5 h-3.5 text-white/40" />
      <span className="font-bold text-white">{value}</span>
    </span>
  );
}

function VideoRow({ v, badge, badgeColor, notes, rank }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex gap-3 p-3">
        {rank != null && (
          <div className="flex-shrink-0 w-6 text-center text-sm font-black text-white/30 pt-1">{rank}</div>
        )}
        {v.thumb
          ? <img src={v.thumb} alt="" className="w-24 h-14 rounded-lg object-cover flex-shrink-0 bg-black/30" />
          : <div className="w-24 h-14 rounded-lg bg-black/30 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-white font-medium leading-snug line-clamp-2">{v.title}</p>
            <a href={v.url} target="_blank" rel="noreferrer" className="text-white/30 hover:text-white flex-shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {v.channel && <p className="text-xs text-white/30 mt-0.5 truncate">{v.channel}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
            <Stat icon={Eye} value={num(v.views)} />
            <Stat icon={ThumbsUp} value={num(v.likes)} />
            <Stat icon={MessageCircle} value={num(v.comments)} />
            {v.isShort && <span className="text-xs text-pink-300/70">Short</span>}
          </div>
          {badge && <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg border mt-2 ${COLORS[badgeColor]}`}>{badge}</span>}
        </div>
      </div>
      {notes && notes.length > 0 && (
        <ul className="px-3 pb-3 space-y-1 border-t border-white/5 pt-2">
          {notes.map((n, i) => (
            <li key={i} className="text-xs text-white/55 flex gap-1.5"><span className="text-white/25">•</span><span>{n}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── My Channel tab ──────────────────────────────────────────────────────────
function MyChannel({ apiKey }) {
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState(getCachedChannel());
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (chan) => {
    setLoading(true); setError('');
    try {
      const c = chan || await resolveChannel(input, apiKey);
      cacheChannel(c); setChannel(c);
      const vids = await fetchChannelVideos(c.uploads, apiKey, 15);
      setVideos(vids);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (channel && videos.length === 0) load(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = () => { clearYtChannel(); setChannel(null); setVideos([]); setInput(''); };

  const baseline = median(videos.map(v => v.views));
  const ranked = videos.map(v => verdictForOwn(v, baseline));

  if (!channel) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-white/50">Enter your channel — handle (@yourname), URL, or channel name.</p>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="@yourchannel"
          className="input-field text-sm" />
        {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
        <button onClick={() => load()} disabled={loading || !input.trim()}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
          {loading ? 'Loading…' : 'Load my channel'}
        </button>
        <p className="text-xs text-white/30">Note: this reads public view/like/comment counts. Private metrics like watch time live in YouTube Studio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
        {channel.thumb && <img src={channel.thumb} alt="" className="w-12 h-12 rounded-full object-cover" />}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate">{channel.title}</p>
          <p className="text-xs text-white/40">{num(channel.subscribers)} subscribers · {num(channel.videoCount)} videos</p>
        </div>
        <button onClick={() => load(channel)} disabled={loading} title="Refresh"
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={disconnect} title="Switch channel"
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-all">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
      {loading && videos.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm"><Loader2 className="w-5 h-5 animate-spin" /> Loading videos…</div>
      ) : ranked.length === 0 ? (
        <p className="text-center text-white/40 text-sm py-10">No videos found. Post a few Shorts, then come back.</p>
      ) : (
        <>
          <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Your last {ranked.length} videos · vs your {num(Math.round(baseline))}-view norm</p>
          {ranked.map(v => <VideoRow key={v.id} v={v} badge={v.label} badgeColor={v.color} notes={v.notes} />)}
        </>
      )}
    </div>
  );
}

// ── Competitor Spy tab ──────────────────────────────────────────────────────
const SPY_PRESETS = ['sad punjabi song status', 'punjabi breakup shayari', 'sad punjabi shorts', 'heart broken punjabi song', 'punjabi sad status'];

function CompetitorSpy({ apiKey }) {
  const [q, setQ] = useState('');
  const [shortsOnly, setShortsOnly] = useState(true);
  const [range, setRange] = useState(30); // days; null = all time
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const run = async (query, days = range) => {
    const term = (query ?? q).trim();
    if (!term) return;
    setQ(term); setLoading(true); setError(''); setSearched(true);
    try {
      const publishedAfter = days ? new Date(Date.now() - days * 86400000).toISOString() : undefined;
      const r = await searchVideos(term, apiKey, { shortsOnly, max: 15, publishedAfter });
      setResults(r);
    } catch (e) { setError(e.message); setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50">Search any topic to see top-performing videos. Tip: use <b className="text-white/70">This week / This month</b> to find small creators blowing up now — not famous old songs.</p>
      <div className="flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
          placeholder="e.g. sad punjabi song status" className="input-field text-sm flex-1" />
        <button onClick={() => run()} disabled={loading || !q.trim()}
          className="btn-primary px-4 flex items-center justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SPY_PRESETS.map(p => (
          <button key={p} onClick={() => run(p)}
            className="text-xs rounded-full px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">{p}</button>
        ))}
      </div>
      <div>
        <p className="text-xs text-white/40 mb-1.5">Time range — recent shows what's winning <span className="text-white/60">now</span>, not famous old songs</p>
        <div className="flex flex-wrap gap-1.5">
          {[{ label: 'This week', d: 7 }, { label: 'This month', d: 30 }, { label: 'Last 3 months', d: 90 }, { label: 'All time', d: null }].map(r => (
            <button key={r.label} onClick={() => { setRange(r.d); if (searched) run(undefined, r.d); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${range === r.d ? 'bg-brand-500/20 border-brand-500/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>{r.label}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/50">
        <input type="checkbox" checked={shortsOnly} onChange={e => setShortsOnly(e.target.checked)} className="accent-brand-500" />
        Shorts only (under 4 min)
      </label>
      {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm"><Loader2 className="w-5 h-5 animate-spin" /> Searching…</div>
      ) : searched && results.length === 0 && !error ? (
        <p className="text-center text-white/40 text-sm py-10">No results. Try another search term.</p>
      ) : results.length > 0 ? (
        <>
          <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Top {results.length} by views{range ? ` · ${range === 7 ? 'this week' : range === 30 ? 'this month' : 'last 3 months'}` : ' · all time'}</p>
          {results.map((v, i) => (
            <VideoRow key={v.id} v={v} rank={i + 1}
              notes={[`Engagement ${engagementRate(v).toFixed(1)}% — ${engagementRate(v) >= 3 ? 'high, the format resonates' : 'study the title + first frame'}.`]} />
          ))}
        </>
      ) : null}
    </div>
  );
}

// ── Title Maker tab ─────────────────────────────────────────────────────────
const MOODS = ['Sad', 'Breakup', 'Love', 'Nostalgic', 'Betrayal', 'Motivational'];
const LANGS = ['Hinglish', 'Punjabi', 'Hindi', 'English'];

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${c ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
      {c ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TitleMaker() {
  const [topic, setTopic] = useState('');
  const [mood, setMood] = useState('Sad');
  const [lang, setLang] = useState('Hinglish');
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gen = async () => {
    if (!hasValidKey()) { setError('Set your AI API key first (⚙ on the Home page).'); return; }
    setLoading(true); setError(''); setTitles([]);
    try {
      const out = await callAI(
        'You write YouTube Shorts titles for a Punjabi/Hindi sad-song reels channel. People SEARCH on YouTube, so titles must contain words people actually type, plus an emotional hook and one emoji. Keep each under 70 characters.',
        `Write 8 YouTube Shorts titles.
Mood: ${mood}
Language for the title: ${lang}
${topic ? `About: ${topic}` : ''}
Rules: include searchable keywords (e.g. "sad punjabi song status", "breakup shayari"), one emotional hook, exactly one emoji each, under 70 chars. Mix some search-heavy and some hook-heavy.
Return ONLY the 8 titles, one per line, no numbering, no quotes.`,
        600,
      );
      const lines = out.split('\n').map(l => l.replace(/^[\d.\-)\s"']+/, '').trim()).filter(Boolean).slice(0, 8);
      setTitles(lines);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/50">YouTube is search-driven. These titles help the same video you post to Instagram get found on YouTube.</p>
      <input value={topic} onChange={e => setTopic(e.target.value)}
        placeholder="Optional: what's the video about? (e.g. waiting for a reply)"
        className="input-field text-sm" />
      <div>
        <p className="text-xs text-white/40 mb-1.5">Mood</p>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map(m => (
            <button key={m} onClick={() => setMood(m)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${mood === m ? 'bg-brand-500/20 border-brand-500/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>{m}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-white/40 mb-1.5">Title language</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${lang === l ? 'bg-brand-500/20 border-brand-500/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
      <button onClick={gen} disabled={loading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Writing…' : 'Generate titles'}
      </button>
      {titles.length > 0 && (
        <div className="space-y-2">
          {titles.map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="flex-1 text-sm text-white/80">{t}</span>
              <CopyBtn text={t} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page shell ──────────────────────────────────────────────────────────────
export default function YouTubeStudio() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [apiKey, setApiKey] = useState(getYtKey());
  const [keyInput, setKeyInput] = useState('');

  const saveKey = () => { saveYtKey(keyInput); setApiKey(keyInput.trim()); };

  return (
    <div className="min-h-screen bg-dark-950 bg-grid">
      <nav className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <Youtube className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-white">YouTube Studio</span>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {!apiKey ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-brand-400" />
              <p className="font-bold text-white">Add your free YouTube API key</p>
            </div>
            <ol className="space-y-2 text-xs text-white/50">
              <li>1. Go to <b className="text-white/70">console.cloud.google.com</b> → create a project (free)</li>
              <li>2. APIs &amp; Services → Library → enable <b className="text-white/70">YouTube Data API v3</b></li>
              <li>3. Credentials → Create credentials → <b className="text-white/70">API key</b> → copy it</li>
            </ol>
            <input value={keyInput} onChange={e => setKeyInput(e.target.value)}
              placeholder="Paste your YouTube Data API key…"
              className="input-field text-xs font-mono" />
            <button onClick={saveKey} disabled={!keyInput.trim()} className="btn-primary w-full py-3">Save key</button>
            <p className="text-xs text-white/30">Free quota: ~100 competitor searches a day. Stored in this browser only.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${tab === t.id ? 'bg-brand-500/20 border-brand-500/50 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {tab === 'mine'   && <MyChannel apiKey={apiKey} />}
            {tab === 'spy'    && <CompetitorSpy apiKey={apiKey} />}
            {tab === 'titles' && <TitleMaker />}

            <button onClick={() => { setApiKey(''); setKeyInput(''); }}
              className="text-xs text-white/30 hover:text-white/60 transition-all">Change API key</button>
          </>
        )}
      </div>
    </div>
  );
}
