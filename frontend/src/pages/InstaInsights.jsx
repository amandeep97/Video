import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Instagram, Loader2, RefreshCw, LogOut, Eye, Bookmark,
  Send, Clock, Sparkles, ChevronDown, ChevronUp, ExternalLink, AlertCircle,
} from 'lucide-react';
import {
  getIgToken, saveIgToken, clearIg, getCachedAccount,
  discoverAccount, fetchMedia, fetchInsights, verdictFor,
} from '../services/instagram.js';
import { callAI, hasValidKey } from '../services/api.js';

const COLORS = {
  green: 'border-green-500/30 bg-green-500/10 text-green-300',
  cyan:  'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  slate: 'border-white/10 bg-white/5 text-white/50',
};

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-white/60">
      <Icon className="w-3.5 h-3.5 text-white/40" />
      <span className="font-bold text-white">{value}</span>
      <span className="text-white/30">{label}</span>
    </div>
  );
}

function ReelCard({ media }) {
  const [ins, setIns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await fetchInsights(media, getIgToken());
      if (alive) { setIns(data); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [media.id]);

  const v = verdictFor(media, ins);
  const caption = (media.caption || '').slice(0, 80);
  const thumb = media.thumbnail_url || media.media_url;

  const getAdvice = async () => {
    if (!hasValidKey()) { setAdvice('⚠ Set your AI API key first (⚙ on the Home page) to get tailored advice.'); return; }
    setAdviceLoading(true);
    try {
      const out = await callAI(
        'You are a short-form video growth coach for a Punjabi/Hindi sad-song reels creator growing from 0 followers. Be blunt, specific, and practical. No fluff.',
        `Here are the real numbers for one of my Instagram reels:
Reach: ${v.reach ?? 0}
Saves: ${v.saves ?? 0} (${(v.saveRate ?? 0).toFixed(1)}% of reach)
Shares: ${v.shares ?? 0} (${(v.shareRate ?? 0).toFixed(1)}% of reach)
Avg watch time: ${(v.watch ?? 0).toFixed(1)}s
Likes: ${media.like_count ?? 0}, Comments: ${media.comments_count ?? 0}
Caption: "${media.caption || '(none)'}"

In 3–4 short bullet points tell me: (1) was this a winner or not and why, (2) the ONE biggest thing to change next time, (3) whether to repeat this exact mood/format. Keep each bullet one line.`,
        700,
      );
      setAdvice(out.trim());
    } catch (e) {
      setAdvice(`⚠ ${e.message}`);
    } finally {
      setAdviceLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex gap-3 p-3">
        {thumb
          ? <img src={thumb} alt="" className="w-16 h-20 rounded-xl object-cover flex-shrink-0 bg-black/30" />
          : <div className="w-16 h-20 rounded-xl bg-black/30 flex-shrink-0 flex items-center justify-center"><Instagram className="w-5 h-5 text-white/20" /></div>}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${COLORS[v.color]}`}>{v.label}</span>
            {media.permalink && (
              <a href={media.permalink} target="_blank" rel="noreferrer" className="text-white/30 hover:text-white">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-white/40 mt-1.5 truncate">{caption || '(no caption)'}</p>

          {loading ? (
            <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading insights…
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              <Stat icon={Eye} label="reach" value={(v.reach ?? 0).toLocaleString()} />
              <Stat icon={Bookmark} label="saves" value={v.saves ?? 0} />
              <Stat icon={Send} label="shares" value={v.shares ?? 0} />
              {v.watch ? <Stat icon={Clock} label="s watch" value={v.watch.toFixed(1)} /> : null}
            </div>
          )}
        </div>
      </div>

      {!loading && (
        <div className="border-t border-white/5">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all">
            <span>What this means + what to do</span>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {open && (
            <div className="px-3 pb-3 space-y-2">
              <ul className="space-y-1">
                {v.notes.map((n, i) => (
                  <li key={i} className="text-xs text-white/60 flex gap-1.5">
                    <span className="text-white/30">•</span><span>{n}</span>
                  </li>
                ))}
              </ul>
              {!advice && (
                <button onClick={getAdvice} disabled={adviceLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-500/20 border border-brand-500/30 text-brand-300 hover:bg-brand-500/30 transition-all disabled:opacity-50">
                  {adviceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {adviceLoading ? 'Thinking…' : 'Get AI advice'}
                </button>
              )}
              {advice && (
                <div className="text-xs text-white/70 whitespace-pre-wrap rounded-xl bg-black/30 border border-white/10 p-3 leading-relaxed">
                  {advice}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SetupGuide() {
  const steps = [
    ['Make sure your IG is a Business or Creator account', 'In Instagram: Settings → Account type → switch to Business or Creator (free).'],
    ['Link it to a Facebook Page', 'Instagram Settings → linked accounts / Meta Accounts Center. Create a Page if you don\'t have one.'],
    ['Open the Graph API Explorer', 'Go to developers.facebook.com/tools/explorer and create a quick app (type: Business) if prompted.'],
    ['Add permissions', 'In the Explorer, add these permissions, then click "Generate Access Token":  instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement.'],
    ['Copy the token', 'Paste the generated access token below and hit Connect. (Explorer tokens last ~1 hour — fine for an analysis session.)'],
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-bold text-white mb-3">How to get your token (one time, ~5 min)</p>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li key={i} className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <div>
              <p className="text-sm text-white/80 font-medium leading-snug">{t}</p>
              <p className="text-xs text-white/40 mt-0.5 leading-snug">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex gap-2 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>This only ever reads <b>your own</b> account — Instagram never allows reading competitors. Your token stays in this browser only.</span>
      </div>
    </div>
  );
}

export default function InstaInsights() {
  const navigate = useNavigate();
  const [token, setToken] = useState(getIgToken());
  const [account, setAccount] = useState(getCachedAccount());
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connect = async (tok) => {
    const t = (tok ?? token).trim();
    if (!t) { setError('Paste your access token first.'); return; }
    setLoading(true); setError('');
    try {
      saveIgToken(t);
      const acct = await discoverAccount(t);
      setAccount(acct);
      const m = await fetchMedia(acct.id, t, 12);
      setMedia(m);
    } catch (e) {
      setError(e.message);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!account) return;
    setLoading(true); setError('');
    try {
      const m = await fetchMedia(account.id, getIgToken(), 12);
      setMedia(m);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const disconnect = () => {
    clearIg(); setToken(''); setAccount(null); setMedia([]); setError('');
  };

  // Auto-load media if we have a cached account + token on mount.
  useEffect(() => {
    if (account && getIgToken() && media.length === 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-dark-950 bg-grid">
      <nav className="sticky top-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
              <Instagram className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-white">Reel Insights</span>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {!account && (
          <>
            <div>
              <h1 className="text-2xl font-black text-white mb-1">Analyze your reels</h1>
              <p className="text-sm text-white/40">Connect your Instagram Business account to see real reach, saves, shares and watch time — and what to do next.</p>
            </div>
            <SetupGuide />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <label className="text-sm text-white/60 font-medium">Access token</label>
              <textarea
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste your Instagram Graph API access token…"
                className="input-field resize-none h-20 text-xs font-mono"
              />
              {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}
              <button onClick={() => connect()} disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
                {loading ? 'Connecting…' : 'Connect & Analyze'}
              </button>
            </div>
          </>
        )}

        {account && (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
              {account.profile_picture_url
                ? <img src={account.profile_picture_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center"><Instagram className="w-6 h-6 text-white" /></div>}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">@{account.username}</p>
                <p className="text-xs text-white/40">
                  {(account.followers_count ?? 0).toLocaleString()} followers · {account.media_count ?? 0} posts
                </p>
              </div>
              <button onClick={refresh} disabled={loading} title="Refresh"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={disconnect} title="Disconnect"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-red-400 transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {error && <p className="text-xs text-red-400 flex gap-1.5"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</p>}

            {loading && media.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 text-white/40 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading your reels…
              </div>
            ) : media.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-12">No posts found yet. Post a few reels, then come back to see what's working.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Your last {media.length} posts</p>
                {media.map(m => <ReelCard key={m.id} media={m} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
