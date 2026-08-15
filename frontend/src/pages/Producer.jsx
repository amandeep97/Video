import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Radar, Loader2, Sparkles, ExternalLink, AlertCircle,
  RefreshCw, Flame, Eye, Users, ChevronLeft, Youtube, Library as LibraryIcon,
  BookmarkPlus, Check, Layers,
} from 'lucide-react';
import { getYtKey, detectTrends, searchVideos } from '../services/youtube.js';
import { generateKit, generateBatch, saveKit, getStats } from '../services/kits.js';
import { hasValidKey } from '../services/api.js';
import KitDetail from '../components/KitDetail.jsx';

const SCAN_QUERIES = [
  'punjabi sad song status',
  'punjabi whatsapp status',
  'punjabi lyrics status',
  'punjabi love status',
];

function num(n) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n || 0);
}

// ── Trend card ───────────────────────────────────────────────────────────────
function TrendCard({ trend, rank, onMake, onBatch }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${rank === 1 ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-white/10'}`}>
          {rank === 1 ? <Flame className="w-5 h-5 text-white" /> : <span className="text-sm font-black text-white/50">{rank}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">{trend.song}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-white/50">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><b className="text-white">{trend.creators}</b> creators remaking it</span>
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /><b className="text-white">{num(trend.totalViews)}</b> views this week</span>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {trend.videos.slice(0, 3).map(v => (
          <a key={v.id} href={v.url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-all">
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate flex-1">{v.title}</span>
            <span className="text-white/30 flex-shrink-0">{num(v.views)}</span>
          </a>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onMake(trend)}
          className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" /> Make one
        </button>
        <button onClick={() => onBatch(trend)}
          className="px-3 py-2.5 rounded-2xl text-sm font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-all flex items-center gap-1.5"
          title="Generate a week of kits from this song">
          <Layers className="w-4 h-4" /> Week
        </button>
      </div>
    </div>
  );
}

// ── Kit view ─────────────────────────────────────────────────────────────────
function KitView({ trend, onBack }) {
  const navigate = useNavigate();
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const gen = async () => {
    setLoading(true); setError(''); setSaved(false);
    try {
      setKit(await generateKit(trend));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { gen(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = () => { saveKit({ trend, kit }); setSaved(true); };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/40 text-sm">
        <Loader2 className="w-6 h-6 animate-spin" />
        Writing your version of "{trend.song}"…
      </div>
    );
  }
  if (error || !kit) {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-xs text-red-400 flex items-center justify-center gap-1.5"><AlertCircle className="w-4 h-4" />{error || 'Something went wrong.'}</p>
        <button onClick={gen} className="btn-primary px-6 py-2.5 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-all">
        <ChevronLeft className="w-4 h-4" /> Back to trends
      </button>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="text-xs text-orange-300/80 font-bold uppercase tracking-widest mb-1">🔥 Riding a live trend</p>
        <p className="text-sm text-white font-bold">{trend.song}</p>
        <p className="text-xs text-white/50 mt-1">{trend.creators} creators · {num(trend.totalViews)} views this week · your angle: <span className="text-white/80">{kit.angle}</span></p>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saved}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${saved ? 'bg-green-500/15 border border-green-500/30 text-green-300' : 'btn-primary'}`}>
          {saved ? <><Check className="w-4 h-4" /> Saved to My Content</> : <><BookmarkPlus className="w-4 h-4" /> Save this kit</>}
        </button>
        {saved && (
          <button onClick={() => navigate('/library')}
            className="px-4 py-2.5 rounded-2xl text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
            Open
          </button>
        )}
      </div>

      <KitDetail kit={kit} />
    </div>
  );
}

// ── Batch view ───────────────────────────────────────────────────────────────
function BatchView({ trend, onBack }) {
  const navigate = useNavigate();
  const COUNT = 5;
  const [done, setDone] = useState(0);
  const [made, setMade] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const recs = await generateBatch(trend, COUNT, (n) => { if (alive) setDone(n); });
        if (alive) setMade(recs);
      } catch (e) { if (alive) setError(e.message); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="space-y-3 py-8 text-center">
        <p className="text-xs text-red-400 flex items-center justify-center gap-1.5"><AlertCircle className="w-4 h-4" />{error}</p>
        <button onClick={onBack} className="btn-primary px-6 py-2.5 text-sm">Back</button>
      </div>
    );
  }

  if (!made) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
        <div className="text-center">
          <p className="text-sm text-white/70 font-semibold">Writing {COUNT} different kits…</p>
          <p className="text-xs text-white/40 mt-1">{done} of {COUNT} done — each one takes a different emotional angle.</p>
        </div>
        <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${(done / COUNT) * 100}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
        <Check className="w-7 h-7 text-green-400" />
      </div>
      <div>
        <p className="text-lg font-black text-white">{made.length} kits saved</p>
        <p className="text-sm text-white/40 mt-1">That's your week of content — all in My Content, ready to make one at a time.</p>
      </div>
      <div className="flex gap-2 justify-center">
        <button onClick={() => navigate('/library')} className="btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2">
          <LibraryIcon className="w-4 h-4" /> Open My Content
        </button>
        <button onClick={onBack} className="px-5 py-2.5 rounded-2xl text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all">
          Back
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Producer() {
  const navigate = useNavigate();
  const [trends, setTrends] = useState([]);
  const [fallback, setFallback] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  const [active, setActive] = useState(null);   // { trend, mode: 'one' | 'week' }
  const ytKey = getYtKey();
  const stats = getStats();

  const scan = async () => {
    setScanning(true); setError(''); setTrends([]); setFallback([]);
    try {
      const found = await detectTrends(ytKey, SCAN_QUERIES, { days: 7, relevanceLanguage: 'pa' });
      setTrends(found);
      if (!found.length) {
        const publishedAfter = new Date(Date.now() - 7 * 86400000).toISOString();
        const top = await searchVideos('punjabi sad song status', ytKey, { shortsOnly: true, max: 8, publishedAfter, relevanceLanguage: 'pa' });
        setFallback(top.sort((a, b) => b.views - a.views).slice(0, 5));
      }
    } catch (e) { setError(e.message); }
    finally { setScanning(false); setScanned(true); }
  };

  useEffect(() => {
    if (ytKey && !scanned) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asTrend = (v) => ({
    song: v.title.split(/\|\|?|•|—|–/)[0].trim(),
    creators: 1,
    totalViews: v.views,
    videos: [v],
  });

  return (
    <div className="min-h-screen bg-dark-950 bg-grid">
      <nav className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
              <Radar className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-white">AI Producer</span>
          </div>
          <button onClick={() => navigate('/library')} title="My Content"
            className="relative w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <LibraryIcon className="w-4 h-4" />
            {stats.todo > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center">
                {stats.todo}
              </span>
            )}
          </button>
          {ytKey && !active && (
            <button onClick={scan} disabled={scanning} title="Rescan"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {!ytKey ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center space-y-3">
            <Youtube className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-sm text-white/70">The Producer scans YouTube to find songs blowing up this week. Add your free YouTube API key first.</p>
            <button onClick={() => navigate('/youtube')} className="btn-primary px-6 py-2.5 text-sm">Set up in YouTube Studio</button>
          </div>
        ) : active?.mode === 'week' ? (
          <BatchView trend={active.trend} onBack={() => setActive(null)} />
        ) : active ? (
          <KitView trend={active.trend} onBack={() => setActive(null)} />
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-white mb-1">What to make today</h1>
              <p className="text-sm text-white/40">Scans this week's Punjabi status reels and finds songs <b className="text-white/60">multiple creators</b> are remaking — proven waves you can still ride.</p>
            </div>

            {stats.todo > 0 && (
              <button onClick={() => navigate('/library')}
                className="w-full rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3 flex items-center gap-3 hover:bg-violet-500/15 transition-all text-left">
                <LibraryIcon className="w-5 h-5 text-violet-300 flex-shrink-0" />
                <span className="flex-1 text-sm text-white/80">
                  You have <b className="text-white">{stats.todo}</b> {stats.todo === 1 ? 'kit' : 'kits'} waiting to be made
                  {stats.streak > 0 && <span className="text-white/50"> · {stats.streak} day streak</span>}
                </span>
                <ChevronLeft className="w-4 h-4 text-white/30 rotate-180" />
              </button>
            )}

            {!hasValidKey() && (
              <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                ⚠ Set your AI key (⚙ on Home) too — it writes the kit after you pick a trend.
              </p>
            )}
            {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}

            {scanning ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/40 text-sm">
                <Loader2 className="w-6 h-6 animate-spin" />
                Scanning this week's winners…
              </div>
            ) : trends.length > 0 ? (
              <>
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">🔥 Live trends · this week</p>
                {trends.map((t, i) => (
                  <TrendCard key={t.signature} trend={t} rank={i + 1}
                    onMake={tr => setActive({ trend: tr, mode: 'one' })}
                    onBatch={tr => setActive({ trend: tr, mode: 'week' })} />
                ))}
              </>
            ) : scanned ? (
              <>
                <p className="text-xs text-white/40">No multi-creator wave detected this week — here are the week's top performers instead. Pick one to remake:</p>
                {fallback.map(v => (
                  <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm text-white/80 leading-snug">{v.title}</p>
                      <a href={v.url} target="_blank" rel="noreferrer" className="text-white/30 hover:text-white flex-shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-white/40 truncate">{num(v.views)} views · {v.channel}</span>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => setActive({ trend: asTrend(v), mode: 'one' })}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-300 hover:bg-brand-500/30 transition-all">
                          <Sparkles className="w-3 h-3 inline mr-1" />Make
                        </button>
                        <button onClick={() => setActive({ trend: asTrend(v), mode: 'week' })}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 transition-all">
                          <Layers className="w-3 h-3 inline mr-1" />Week
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
