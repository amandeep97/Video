import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Radar, Loader2, Sparkles, ExternalLink, AlertCircle,
  Copy, Check, RefreshCw, Flame, Eye, Users, ChevronLeft, Youtube,
} from 'lucide-react';
import { getYtKey, detectTrends, searchVideos } from '../services/youtube.js';
import { callAI, hasValidKey } from '../services/api.js';

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

function CopyLine({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${c ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
      {c ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Section({ title, copyAll, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">{title}</p>
        {copyAll && <CopyLine text={copyAll} />}
      </div>
      {children}
    </div>
  );
}

// ── Trend card ───────────────────────────────────────────────────────────────
function TrendCard({ trend, rank, onMake }) {
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
      <button onClick={() => onMake(trend)}
        className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4" /> Make this — full kit
      </button>
    </div>
  );
}

// ── Kit view ─────────────────────────────────────────────────────────────────
function KitView({ trend, onBack }) {
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const gen = async () => {
    setLoading(true); setError('');
    try {
      const sample = trend.videos.map(v => v.title).join(' | ');
      const out = await callAI(
        `You write viral Punjabi song-status video kits. You specialise in micro-moment specificity — the tiny exact behaviours that make someone stop scrolling and think "this is literally me." You know "ਤੇਰੀ ਯਾਦ" gets ignored but "'ਕਿਵੇਂ ਹੋ?' — 14 ਵਾਰ type ਕੀਤਾ, 14 ਵਾਰ delete" gets screenshotted and shared. BANNED phrases: ਤੇਰੀ ਯਾਦ, dil toot gaya, missing you, yaad aa raha, ਦਿਲ ਟੁੱਟਿਆ, broken heart, tenu bhulna.
Respond with valid JSON only — no markdown, no code fences.`,
        `A song is trending on YouTube Shorts RIGHT NOW: ${trend.creators} different creators remade it this week for ${trend.totalViews.toLocaleString()} combined views.
Song (from the top video title): "${trend.song}"
Sample titles of the winning versions: ${sample}

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
Give exactly 6 overlays. They must tell one story in sequence, and the last one must loop back to the first.`,
        2000,
      );
      const m = out.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('AI returned an unexpected format — tap retry.');
      setKit(JSON.parse(m[0]));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { gen(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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

  const overlayAll = (kit.overlays || []).map(o => o.pa).join('\n');
  const hashtagLine = (kit.hashtags || []).join(' ');
  const fullDesc = `${kit.description || ''}\n\n${hashtagLine}`;

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

      <Section title="First frame (stops the scroll)">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 leading-relaxed">{kit.firstFrame}</div>
      </Section>

      <Section title="On-screen lines — one per clip, in order" copyAll={overlayAll}>
        <div className="space-y-2">
          {(kit.overlays || []).map((o, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white/40 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 leading-snug">{o.pa}</p>
                {o.translit && <p className="text-[10px] text-white/30 mt-0.5">{o.translit}</p>}
              </div>
              <CopyLine text={o.pa} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Footage — search these on Pexels/Pixabay" copyAll={(kit.footage || []).join('\n')}>
        <div className="space-y-1.5">
          {(kit.footage || []).map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="flex-1 text-sm text-white/70">{f}</span>
              <CopyLine text={f} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="YouTube title — pick one">
        <div className="space-y-2">
          {(kit.ytTitles || []).map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="flex-1 text-sm text-white/80">{t}</span>
              <CopyLine text={t} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="YouTube description — paste as-is" copyAll={fullDesc}>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{fullDesc}</div>
      </Section>

      <Section title="Instagram caption" copyAll={kit.igCaption}>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{kit.igCaption}</div>
      </Section>

      <div className="flex gap-2 text-xs text-white/40 bg-white/5 border border-white/10 rounded-xl p-3">
        <span>🎬</span>
        <span>Build: CapCut → 4 clips → one line per clip → transition on the beat → export. Add the song <b className="text-white/60">inside Instagram/YouTube</b> when posting.</span>
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
  const [active, setActive] = useState(null); // trend being made
  const ytKey = getYtKey();

  const scan = async () => {
    setScanning(true); setError(''); setTrends([]); setFallback([]);
    try {
      const found = await detectTrends(ytKey, SCAN_QUERIES, { days: 7, relevanceLanguage: 'pa' });
      setTrends(found);
      if (!found.length) {
        // No multi-creator cluster this week — fall back to the top videos so
        // there is always something to make.
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

  const makeFromVideo = (v) => setActive({
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
        ) : active ? (
          <KitView trend={active} onBack={() => setActive(null)} />
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-white mb-1">What to make today</h1>
              <p className="text-sm text-white/40">Scans this week's Punjabi status reels and finds songs <b className="text-white/60">multiple creators</b> are remaking — proven waves you can still ride.</p>
            </div>

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
                {trends.map((t, i) => <TrendCard key={t.signature} trend={t} rank={i + 1} onMake={setActive} />)}
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
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{num(v.views)} views · {v.channel}</span>
                      <button onClick={() => makeFromVideo(v)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-300 hover:bg-brand-500/30 transition-all">
                        <Sparkles className="w-3 h-3 inline mr-1" />Make this
                      </button>
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
