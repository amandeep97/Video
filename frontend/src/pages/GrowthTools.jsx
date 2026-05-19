import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronLeft, Copy, Check, RefreshCw, Play, Sparkles } from 'lucide-react';
import { callAI } from '../services/api.js';
import { hasValidKey } from '../services/providers.js';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'shorts', label: 'Shorts', emoji: '📱' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'reels', label: 'Reels', emoji: '📸' },
];

const SHORTS_PLATFORMS = [
  { id: 'shorts', label: 'YT Shorts', emoji: '▶️' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'reels', label: 'Reels', emoji: '📸' },
];

const SHORT_DURATIONS = [
  { id: '15s', label: '15s', seconds: 15 },
  { id: '30s', label: '30s', seconds: 30 },
  { id: '60s', label: '60s', seconds: 60 },
];

const SHORT_GOALS = [
  { id: 'subscribers', label: 'Get Subscribers', emoji: '📈' },
  { id: 'viral', label: 'Go Viral', emoji: '🔥' },
  { id: 'traffic', label: 'Drive to Long Video', emoji: '🔗' },
  { id: 'sales', label: 'Sell / Promote', emoji: '💰' },
];

function CopyBtn({ text, size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${size === 'sm' ? 'text-xs' : 'text-sm'} ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'}`}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function HookWriter() {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [hooks, setHooks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedHook, setExpandedHook] = useState(null);
  const [introScript, setIntroScript] = useState({});
  const [loadingIntro, setLoadingIntro] = useState({});

  const generate = async () => {
    if (!topic.trim()) return;
    if (!hasValidKey()) { alert('Set your API key first.'); return; }
    setLoading(true);
    setHooks(null);
    setExpandedHook(null);
    setIntroScript({});
    try {
      const raw = await callAI(
        `You are an expert YouTube hook writer who understands viewer psychology and what makes people stop scrolling.`,
        `Generate 5 powerful hooks for this video:

Topic: "${topic}"
Target Audience: "${audience || 'general audience'}"
Niche: "${niche || 'general'}"
Platform: ${platform}

Return ONLY a JSON array with exactly 5 hooks:
[
  {
    "type": "curiosity_gap",
    "label": "Curiosity Gap",
    "emoji": "🤔",
    "hook": "The actual opening line (1-2 sentences max, punchy, specific to this topic)",
    "why": "Why this hook works psychologically (1 sentence)",
    "trigger": "The psychological trigger used"
  },
  {
    "type": "result_first",
    "label": "Result First",
    "emoji": "🏆",
    "hook": "...",
    "why": "...",
    "trigger": "..."
  },
  {
    "type": "controversy",
    "label": "Controversy",
    "emoji": "🔥",
    "hook": "...",
    "why": "...",
    "trigger": "..."
  },
  {
    "type": "fear_pain",
    "label": "Fear / Pain",
    "emoji": "⚠️",
    "hook": "...",
    "why": "...",
    "trigger": "..."
  },
  {
    "type": "story",
    "label": "Story",
    "emoji": "📖",
    "hook": "...",
    "why": "...",
    "trigger": "..."
  }
]

Make hooks bold and specific. No generic filler. No "In today's video...". No "Hey guys".`,
        1400
      );
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) setHooks(JSON.parse(match[0]));
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const buildIntro = async (hook, idx) => {
    if (!hasValidKey()) { alert('Set your API key first.'); return; }
    setLoadingIntro(p => ({ ...p, [idx]: true }));
    try {
      const raw = await callAI(
        `You are a master video scriptwriter. You write the first 30 seconds of videos that keep people watching.`,
        `Write the first 30 seconds of a ${platform} video using this hook:

Hook: "${hook.hook}"
Topic: "${topic}"
Audience: "${audience || 'general audience'}"

Format each segment exactly like this:
[0-3s] HOOK: ${hook.hook}
VISUAL: (what's on screen)
TONE: (delivery style)

[3-8s] EXPAND: (deepen the hook — more detail, more tension)
VISUAL: ...
TONE: ...

[8-15s] CREDIBILITY: (why trust you — specific proof, result, or experience)
VISUAL: ...
TONE: ...

[15-25s] PROMISE: (exactly what they'll learn/get by watching the full video)
VISUAL: ...
TONE: ...

[25-30s] TRANSITION: (bridge into the main content, don't end here)
VISUAL: ...
TONE: ...

Be specific and punchy. No filler lines.`,
        900
      );
      setIntroScript(p => ({ ...p, [idx]: raw }));
      setExpandedHook(idx);
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoadingIntro(p => ({ ...p, [idx]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Hook Writer</h2>
          <p className="text-white/40 text-sm mt-1">The first 3 seconds decide your watch time. Generate 5 proven hook styles — then build the full 30s intro from any one.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Video Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. How to grow on YouTube from 0"
              className="input-field" />
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Target Audience</label>
            <input value={audience} onChange={e => setAudience(e.target.value)}
              placeholder="e.g. beginner creators, age 18-30"
              className="input-field" />
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Niche</label>
            <input value={niche} onChange={e => setNiche(e.target.value)}
              placeholder="e.g. YouTube growth, fitness, finance"
              className="input-field" />
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${platform === p.id ? 'bg-brand-500/30 border border-brand-500/60 text-white' : 'glass text-white/50 border border-transparent hover:text-white'}`}>
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={!topic.trim() || loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating hooks...</>
            : <><Zap className="w-4 h-4" /> Generate 5 Hooks</>}
        </button>
      </div>

      {hooks && (
        <div className="space-y-4">
          {hooks.map((hook, idx) => (
            <div key={idx} className="card border border-white/10">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{hook.emoji}</span>
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{hook.label}</span>
                </div>
                <CopyBtn text={hook.hook} />
              </div>

              <p className="text-white text-lg font-semibold leading-snug mb-4">"{hook.hook}"</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/40 border border-white/10">
                  💡 {hook.why}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  🧠 {hook.trigger}
                </span>
              </div>

              <button
                onClick={() => expandedHook === idx
                  ? setExpandedHook(null)
                  : (introScript[idx] ? setExpandedHook(idx) : buildIntro(hook, idx))}
                disabled={loadingIntro[idx]}
                className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                {loadingIntro[idx]
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Building 30s intro...</>
                  : expandedHook === idx
                    ? '▲ Hide intro script'
                    : <><Play className="w-3.5 h-3.5" /> Build 30s intro from this hook</>}
              </button>

              {expandedHook === idx && introScript[idx] && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">30-Second Intro Script</span>
                    <CopyBtn text={introScript[idx]} />
                  </div>
                  <pre className="text-sm text-white/70 whitespace-pre-wrap font-mono leading-relaxed bg-white/5 rounded-xl p-4">
                    {introScript[idx]}
                  </pre>
                </div>
              )}
            </div>
          ))}

          <button onClick={generate}
            className="w-full py-3 glass glass-hover rounded-xl text-white/50 hover:text-white text-sm flex items-center justify-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Regenerate all hooks
          </button>
        </div>
      )}
    </div>
  );
}

function ShortsEngine() {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('shorts');
  const [duration, setDuration] = useState('60s');
  const [goal, setGoal] = useState('subscribers');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) return;
    if (!hasValidKey()) { alert('Set your API key first.'); return; }
    setLoading(true);
    setResult(null);
    const secs = duration === '15s' ? 15 : duration === '30s' ? 30 : 60;
    try {
      const raw = await callAI(
        `You are a viral short-form video strategist. You write frame-by-frame scripts with precise timing that maximize watch time, rewatches, and shares.`,
        `Create a complete ${platform} script:

Topic: "${topic}"
Niche: "${niche || 'general'}"
Duration: ${secs} seconds
Goal: ${goal}

Return ONLY valid JSON:
{
  "title": "video title / caption headline",
  "hook": "The exact first line — no intro, no greeting, instant hook",
  "hookVisual": "What is on screen during the hook",
  "segments": [
    {
      "timeStart": 0,
      "timeEnd": 3,
      "spoken": "exact words spoken",
      "visual": "what is on screen — specific shot/angle/action",
      "textOverlay": "text shown on screen (empty string if none)",
      "energy": "calm|medium|high|intense"
    }
  ],
  "loopEnding": "Last spoken line that connects back to the hook (creates rewatch loop)",
  "loopEndingNote": "Why this creates a loop",
  "caption": "Full caption for posting (2-3 punchy sentences)",
  "hashtags": ["niche1", "niche2", "niche3", "niche4", "niche5", "trending1", "trending2", "trending3", "broad1", "broad2"],
  "thumbnailFrame": "Which second to screenshot for thumbnail and why",
  "proTip": "One specific tactic to boost this exact video's performance"
}

Critical rules:
- First word of hook is the hook — no "Hey", no "Today", no "Welcome"
- Segments must total exactly ${secs} seconds
- Loop ending is mandatory — it is what drives rewatches
- Visuals must be specific: exact shots, text positions, props, camera angles
- Energy must escalate toward the middle then resolve at the end`,
        2000
      );
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) setResult(JSON.parse(match[0]));
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const energyColor = e => ({
    calm: 'text-blue-400 bg-blue-500/10',
    medium: 'text-yellow-400 bg-yellow-500/10',
    high: 'text-orange-400 bg-orange-500/10',
    intense: 'text-red-400 bg-red-500/10',
  }[e] || 'text-white/50 bg-white/5');

  const fullScript = result
    ? `${result.title}\n\n` +
      `HOOK (0-3s): ${result.hook}\nVISUAL: ${result.hookVisual}\n\n` +
      (result.segments || []).map(s =>
        `[${s.timeStart}s–${s.timeEnd}s]\nSPOKEN: ${s.spoken}\nVISUAL: ${s.visual}` +
        (s.textOverlay ? `\nTEXT ON SCREEN: ${s.textOverlay}` : '') +
        `\nENERGY: ${s.energy}`
      ).join('\n\n') +
      `\n\nLOOP ENDING: ${result.loopEnding}\n(${result.loopEndingNote})\n\n` +
      `CAPTION:\n${result.caption}\n\n` +
      `HASHTAGS: ${(result.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}\n\n` +
      `THUMBNAIL FRAME: ${result.thumbnailFrame}\n\nPRO TIP: ${result.proTip}`
    : '';

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Shorts Engine</h2>
          <p className="text-white/40 text-sm mt-1">Frame-by-frame short-form scripts with loop endings. Built for the algorithm — rewatches are the signal.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 3 habits destroying your sleep"
              className="input-field" />
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Niche</label>
            <input value={niche} onChange={e => setNiche(e.target.value)}
              placeholder="e.g. health, finance, gaming"
              className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {SHORTS_PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${platform === p.id ? 'bg-brand-500/30 border border-brand-500/60 text-white' : 'glass text-white/50 border border-transparent hover:text-white'}`}>
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {SHORT_DURATIONS.map(d => (
                <button key={d.id} onClick={() => setDuration(d.id)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${duration === d.id ? 'bg-brand-500/30 border border-brand-500/60 text-white' : 'glass text-white/50 border border-transparent hover:text-white'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-white/50 mb-1.5 block">Goal</label>
            <div className="grid grid-cols-2 gap-2">
              {SHORT_GOALS.map(g => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  className={`py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1 ${goal === g.id ? 'bg-brand-500/30 border border-brand-500/60 text-white font-medium' : 'glass text-white/50 border border-transparent hover:text-white'}`}>
                  <span>{g.emoji}</span>
                  <span className="truncate">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={!topic.trim() || loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Building script...</>
            : <><Sparkles className="w-4 h-4" /> Generate Shorts Script</>}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg">{result.title}</h3>
            <CopyBtn text={fullScript} size="md" />
          </div>

          {/* Hook */}
          <div className="card border border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">⚡ Hook — 0 to 3s</span>
              <span className="text-xs text-white/30">NO INTRO — starts instantly</span>
            </div>
            <p className="text-white text-xl font-bold mb-2">"{result.hook}"</p>
            <p className="text-white/50 text-sm">📷 {result.hookVisual}</p>
          </div>

          {/* Frame-by-frame */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/70">Frame-by-Frame Script</span>
              <span className="text-xs text-white/30">{duration} total</span>
            </div>
            <div className="space-y-4">
              {(result.segments || []).map((seg, i) => (
                <div key={i} className="flex gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="flex-shrink-0 w-20 text-center pt-0.5">
                    <span className="text-xs text-brand-400 font-mono block">{seg.timeStart}s – {seg.timeEnd}s</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block ${energyColor(seg.energy)}`}>
                      {seg.energy}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium mb-1.5">"{seg.spoken}"</p>
                    <p className="text-white/40 text-xs mb-1">📷 {seg.visual}</p>
                    {seg.textOverlay && (
                      <p className="text-yellow-400/70 text-xs">💬 {seg.textOverlay}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loop ending */}
          <div className="card border border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">🔄 Loop Ending</span>
              <span className="text-xs text-white/30">rewatches = algorithm boost</span>
            </div>
            <p className="text-white font-bold text-lg mb-1">"{result.loopEnding}"</p>
            <p className="text-white/50 text-xs">{result.loopEndingNote}</p>
          </div>

          {/* Caption + Hashtags */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white/70">Caption & Hashtags</span>
              <CopyBtn text={`${result.caption}\n\n${(result.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}`} />
            </div>
            <p className="text-white/70 text-sm mb-3 leading-relaxed">{result.caption}</p>
            <div className="flex flex-wrap gap-1.5">
              {(result.hashtags || []).map((h, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  #{h.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>

          {/* Thumbnail + Pro Tip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border border-yellow-500/20 bg-yellow-500/5">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider block mb-2">📸 Best Thumbnail Frame</span>
              <p className="text-white/70 text-sm leading-relaxed">{result.thumbnailFrame}</p>
            </div>
            <div className="card border border-green-500/20 bg-green-500/5">
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-2">💡 Pro Tip</span>
              <p className="text-white/70 text-sm leading-relaxed">{result.proTip}</p>
            </div>
          </div>

          <button onClick={generate}
            className="w-full py-3 glass glass-hover rounded-xl text-white/50 hover:text-white text-sm flex items-center justify-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Regenerate script
          </button>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'hooks', label: 'Hook Writer', emoji: '⚡', desc: 'First 3 seconds that stop the scroll' },
  { id: 'shorts', label: 'Shorts Engine', emoji: '📱', desc: 'Frame-by-frame scripts with loop endings' },
];

export default function GrowthTools() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('hooks');

  return (
    <div className="min-h-screen bg-dark-950 bg-grid">
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Growth Tools</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Growth Tools</h1>
          <p className="text-white/50">The two things that move the algorithm: hooks and short-form.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${tab === t.id ? 'border-brand-500/60 bg-brand-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
              <div className="text-2xl mb-1">{t.emoji}</div>
              <div className={`font-bold text-sm ${tab === t.id ? 'text-white' : 'text-white/70'}`}>{t.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>

        {tab === 'hooks' && <HookWriter />}
        {tab === 'shorts' && <ShortsEngine />}
      </div>
    </div>
  );
}
