import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronLeft, Copy, Check, RefreshCw, Play, Sparkles, Trash2, Music, ExternalLink, TrendingUp, ChevronDown, Dice5 } from 'lucide-react';
import { callAI } from '../services/api.js';
import { hasValidKey } from '../services/providers.js';
import { HowTo } from '../components/HowTo.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

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

const cleanVisual = (v = '') => {
  const first = v.split(',')[0].trim();
  return first.length > 55 ? first.substring(0, 55) : first;
};

function StepBlock({ number, title, color, instruction, icon, text }) {
  const palette = {
    blue:   'text-blue-400 border-blue-500/30 bg-blue-500/5',
    green:  'text-green-400 border-green-500/30 bg-green-500/5',
    yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
  };
  const cls = palette[color];
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={`text-xs font-black uppercase tracking-wider ${cls.split(' ')[0]}`}>
            Step {number} — {title}
          </span>
        </div>
        <CopyBtn text={text} />
      </div>
      <p className="text-xs text-white/30 mb-3">{instruction}</p>
      <pre className="text-sm text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
    </div>
  );
}

function CapCutModal({ result, onClose }) {
  const segs = result.segments || [];

  const footageLines = [
    `Scene 1 (0–3s)  →  search: "${cleanVisual(result.hookVisual)}"`,
    ...segs.map((s, i) =>
      `Scene ${i + 2} (${s.timeStart}s–${s.timeEnd}s)  →  search: "${cleanVisual(s.visual)}"`
    ),
  ].join('\n');

  const voiceLines = [
    result.hook,
    ...segs.map(s => s.spoken),
    result.loopEnding,
  ].filter(Boolean).join('\n');

  const overlayLines = [
    `0–3s     →  "${result.hook.substring(0, 45).toUpperCase()}"  (large · centre · bold)`,
    ...segs.filter(s => s.textOverlay).map(s =>
      `${s.timeStart}s–${s.timeEnd}s  →  "${s.textOverlay}"`
    ),
    `Last 3s  →  "${result.loopEnding.substring(0, 45)}"  (centre)`,
  ].join('\n');

  const captionText = `${result.caption}\n\n${(result.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}`;

  const allSteps =
    `══ STEP 1 — ADD FOOTAGE ══\n${footageLines}\n\n` +
    `══ STEP 2 — AI VOICE ══\n${voiceLines}\n\n` +
    `══ STEP 3 — TEXT OVERLAYS ══\n${overlayLines}\n\n` +
    `══ STEP 4 — CAPTION & HASHTAGS ══\n${captionText}\n\n` +
    `LAST STEP: Enable Auto Captions → Export 1080×1920 → Post`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl my-8">
        <div className="card border border-green-500/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Export for CapCut</h2>
              <p className="text-white/40 text-sm mt-1">4 steps. Open CapCut, follow in order. Done in 20 minutes.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyBtn text={allSteps} size="md" />
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm">
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <StepBlock
              number="1" title="ADD FOOTAGE" color="blue" icon="🎬"
              instruction="CapCut → New Project → search each term in the stock library → drag clip onto timeline"
              text={footageLines}
            />
            <StepBlock
              number="2" title="AI VOICE" color="green" icon="🎙️"
              instruction="CapCut → Text → Text to Speech → paste this → pick a voice → Generate"
              text={voiceLines}
            />
            <StepBlock
              number="3" title="TEXT OVERLAYS" color="yellow" icon="💬"
              instruction="CapCut → Text → Add Text → type each line and drag it to the matching timestamp"
              text={overlayLines}
            />
            <StepBlock
              number="4" title="CAPTION & HASHTAGS" color="purple" icon="📋"
              instruction="Paste this into the caption field when you post the video"
              text={captionText}
            />
            <div className="bg-white/5 rounded-xl p-4 text-sm text-white/50 leading-relaxed">
              <span className="text-white font-semibold">Final step:</span> CapCut → Auto Captions (turn on) → Export → 1080 × 1920 · 30fps → Post
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [topic, setTopic] = useLocalStorage('hw_topic', '');
  const [audience, setAudience] = useLocalStorage('hw_audience', '');
  const [niche, setNiche] = useLocalStorage('hw_niche', '');
  const [platform, setPlatform] = useLocalStorage('hw_platform', 'youtube');
  const [hooks, setHooks] = useLocalStorage('hw_hooks', null);

  const clearAll = () => { setTopic(''); setAudience(''); setNiche(''); setPlatform('youtube'); setHooks(null); setExpandedHook(null); setIntroScript({}); };
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
      <HowTo
        when="you're about to film a video and don't know how to start it"
        steps={[
          'Enter your video topic, who it\'s for, and your niche',
          'Click Generate — you get 5 hook styles (curiosity, result, fear, story, controversy)',
          'Pick the one that feels right → click "Build 30s intro" → copy it into CapCut or your notes',
        ]}
      />
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Hook Writer</h2>
          <p className="text-white/40 text-sm mt-1">The first 3 seconds decide your watch time.</p>
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30">Saved — go back anytime, it'll still be here</span>
            <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear & start over
            </button>
          </div>
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
  const [topic, setTopic] = useLocalStorage('se_topic', '');
  const [niche, setNiche] = useLocalStorage('se_niche', '');
  const [platform, setPlatform] = useLocalStorage('se_platform', 'shorts');
  const [duration, setDuration] = useLocalStorage('se_duration', '60s');
  const [goal, setGoal] = useLocalStorage('se_goal', 'subscribers');
  const [result, setResult] = useLocalStorage('se_result', null);
  const [loading, setLoading] = useState(false);
  const [showCapCut, setShowCapCut] = useState(false);

  const clearAll = () => { setTopic(''); setNiche(''); setPlatform('shorts'); setDuration('60s'); setGoal('subscribers'); setResult(null); setShowCapCut(false); };

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
      <HowTo
        when="you want to make a YouTube Short, TikTok, or Instagram Reel"
        steps={[
          'Enter your topic, pick platform (Shorts / TikTok / Reels), duration, and your goal',
          'Click Generate — you get a full script with exact timing, visuals, text overlays, and a loop ending',
          'Click the green "Export for CapCut" button → follow the 4 steps inside → done in 20 minutes',
        ]}
      />
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Shorts Engine</h2>
          <p className="text-white/40 text-sm mt-1">Frame-by-frame scripts with loop endings. Built for the algorithm.</p>
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
            <div className="flex items-center gap-2">
              <CopyBtn text={fullScript} size="md" />
              <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>
          <p className="text-xs text-white/25">Saved — go back anytime, it'll still be here</p>

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

          <button onClick={() => setShowCapCut(true)}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
            🎬 Export for CapCut — Step-by-Step
          </button>

          <button onClick={generate}
            className="w-full py-3 glass glass-hover rounded-xl text-white/50 hover:text-white text-sm flex items-center justify-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Regenerate script
          </button>
        </div>
      )}

      {showCapCut && result && (
        <CapCutModal result={result} onClose={() => setShowCapCut(false)} />
      )}
    </div>
  );
}

// ─── Song Video ───────────────────────────────────────────────────────────────

const MOODS = [
  { id: 'sad',          label: 'Sad',          emoji: '💔', desc: 'Heartbreak & longing',     grad: 'from-blue-600 to-indigo-800' },
  { id: 'motivational', label: 'Motivational', emoji: '🔥', desc: 'Hustle & rise',             grad: 'from-orange-500 to-red-600' },
  { id: 'love',         label: 'Love',         emoji: '❤️', desc: 'Romance & feelings',        grad: 'from-pink-500 to-rose-600' },
  { id: 'betrayal',     label: 'Betrayal',     emoji: '🥀', desc: 'Cheating & broken trust',   grad: 'from-slate-600 to-gray-800' },
  { id: 'party',        label: 'Party',        emoji: '🎉', desc: 'Celebration & energy',      grad: 'from-yellow-500 to-orange-500' },
  { id: 'nostalgic',    label: 'Nostalgic',    emoji: '🌅', desc: 'Memories & old times',      grad: 'from-amber-500 to-yellow-600' },
];

const SONG_LANGS = [
  { id: 'punjabi',  label: 'Punjabi',  note: 'ਗੁਰਮੁਖੀ' },
  { id: 'hindi',    label: 'Hindi',    note: 'हिंदी' },
  { id: 'hinglish', label: 'Hinglish', note: 'Roman mix' },
  { id: 'english',  label: 'English',  note: 'English' },
];

function SongCapCutModal({ result, mood, onClose }) {
  const footageLines = (result.footage || []).map(f =>
    `${f.timeStart}s–${f.timeEnd}s  →  search: "${f.search}"`
  ).join('\n');

  const overlayLines = (result.overlays || []).map(o =>
    `${o.timeStart}s–${o.timeEnd}s  →  "${o.text}"  (${o.style})`
  ).join('\n');

  const captionText = `${result.caption}\n\n${(result.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}`;

  const allSteps =
    `══ STEP 1 — ADD FOOTAGE ══\n${footageLines}\n\n` +
    `══ STEP 2 — ADD YOUR SONG ══\nCapCut → tap + → Music → search your song OR My Music to import from phone\nDrag the song to the timeline\n\n` +
    `══ STEP 3 — BEAT SYNC ══\nCapCut → select all clips → Auto Beat Sync → ON\nClips will cut automatically to the beat\n\n` +
    `══ STEP 4 — TEXT OVERLAYS ══\n${overlayLines}\n\n` +
    `══ STEP 5 — CAPTION & HASHTAGS ══\n${captionText}\n\n` +
    `TIPS:\n${result.beatTip}\n${result.postingTip}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-start justify-center p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl my-8">
        <div className="card border border-pink-500/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Export for CapCut</h2>
              <p className="text-white/40 text-sm mt-1">5 steps. Song video done in 15 minutes.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyBtn text={allSteps} size="md" />
              <button onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-sm">✕</button>
            </div>
          </div>

          <div className="space-y-4">
            <StepBlock number="1" title="ADD FOOTAGE" color="blue" icon="🎬"
              instruction="CapCut → New Project → search each term in stock library → drag clip to timeline"
              text={footageLines} />

            <StepBlock number="2" title="ADD YOUR SONG" color="green" icon="🎵"
              instruction="CapCut → tap + at bottom → Music → My Music (import from phone) OR search song name"
              text={`Drag the song to the audio track\nTrim it to the part you want\nSet volume to 100%`} />

            <StepBlock number="3" title="BEAT SYNC" color="purple" icon="🥁"
              instruction="CapCut → select all video clips → tap 'Auto Beat Sync' → turn ON → clips cut to the beat automatically"
              text={result.beatTip || 'Use Auto Beat Sync for automatic cuts on every beat drop'} />

            <StepBlock number="4" title="TEXT OVERLAYS" color="yellow" icon="💬"
              instruction="CapCut → Text → Add Text → type each line and drag to the matching timestamp"
              text={overlayLines} />

            <StepBlock number="5" title="CAPTION & HASHTAGS" color="blue" icon="📋"
              instruction="Paste this when posting your video"
              text={captionText} />

            <div className="bg-white/5 rounded-xl p-4 text-sm text-white/50 leading-relaxed">
              <span className="text-white font-semibold">Final:</span> Export 1080×1920 · 30fps → Post to Shorts/Reels/TikTok
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TREND_COUNTRIES = [
  { id: 'IN', label: 'India' },
  { id: 'PK', label: 'Pakistan' },
  { id: 'GB', label: 'UK' },
  { id: 'CA', label: 'Canada' },
  { id: 'US', label: 'USA' },
  { id: 'AU', label: 'Australia' },
];

function TrendingSongs() {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useLocalStorage('ts_country', 'IN');

  // TikTok Creative Center — free official trending songs page
  const ccUrl = `https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en?region=${country}`;

  return (
    <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.06] overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Music className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Find a Trending Song first</p>
            <p className="text-xs text-white/40">Real data from TikTok — free & official</p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 animate-slide-down">
          <div className="h-px bg-white/10" />

          <p className="text-xs text-white/50 leading-relaxed">
            Reels & Shorts copy TikTok trends 1–2 weeks later. Pick a song that's <span className="text-fuchsia-300 font-semibold">rising</span> here,
            then add it in CapCut while it's still climbing.
          </p>

          {/* Country */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Your country</label>
            <div className="grid grid-cols-3 gap-2">
              {TREND_COUNTRIES.map(c => (
                <button key={c.id} onClick={() => setCountry(c.id)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    country === c.id ? 'bg-fuchsia-500/25 border border-fuchsia-500/50 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
                  }`}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* Open button */}
          <a href={ccUrl} target="_blank" rel="noopener noreferrer"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:opacity-90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all">
            <TrendingUp className="w-4 h-4" />
            Open TikTok Trending Songs
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* How to read it */}
          <div className="rounded-xl bg-black/20 border border-white/5 p-3.5">
            <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider mb-2.5">How to read it</p>
            <ol className="space-y-2">
              {[
                'Set the filter to "Last 7 days" at the top',
                'Look for a song with a graph going UP (rising) — not flat',
                'Pick a Punjabi / Hindi one that matches your mood',
                'Note the song name → search it in CapCut & Instagram music',
                'Make your video and post within 24–48 hrs while it\'s still rising',
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center font-bold text-[10px] mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <p className="text-xs text-white/25 leading-relaxed">
            Tip: TikTok may ask for a free account. Same trends hit Instagram Reels a week later — so you're early there.
          </p>
        </div>
      )}
    </div>
  );
}

function SongVideo() {
  const [mood, setMood] = useLocalStorage('sv_mood', 'sad');
  const [language, setLanguage] = useLocalStorage('sv_lang', 'punjabi');
  const [duration, setDuration] = useLocalStorage('sv_dur', '60s');
  const [platform, setPlatform] = useLocalStorage('sv_platform', 'shorts');
  const [songVibe, setSongVibe] = useLocalStorage('sv_vibe', '');
  const [result, setResult] = useLocalStorage('sv_result', null);
  const [loading, setLoading] = useState(false);
  const [showCapCut, setShowCapCut] = useState(false);

  const clearAll = () => { setMood('sad'); setLanguage('punjabi'); setSongVibe(''); setResult(null); setShowCapCut(false); };

  const generate = async () => {
    if (!hasValidKey()) { alert('Set your API key first.'); return; }
    setLoading(true);
    setResult(null);
    const secs = duration === '15s' ? 15 : duration === '30s' ? 30 : 60;
    const moodObj = MOODS.find(m => m.id === mood);
    const scriptNote = language === 'punjabi'
      ? 'Write ALL text overlays in Punjabi using Gurmukhi script (ਇਸ ਤਰ੍ਹਾਂ). Do NOT use Roman Punjabi.'
      : language === 'hindi'
      ? 'Write ALL text overlays in Hindi using Devanagari script (इस तरह).'
      : language === 'hinglish'
      ? 'Write ALL text overlays in Hinglish — Roman script mixing Hindi and English naturally (e.g. "Dil toot gaya yaar").'
      : 'Write ALL text overlays in English.';
    try {
      const raw = await callAI(
        `You are an expert at creating viral text overlay scripts for Indian song videos on YouTube Shorts, Instagram Reels, and TikTok. You understand Punjabi culture, emotions, and what makes song videos go viral.`,
        `Create a complete text overlay script for a ${mood} mood song video:

Mood: ${moodObj.label} — ${moodObj.desc}
Language: ${language}
Duration: ${secs} seconds
Platform: ${platform}
Song vibe: ${songVibe || `a ${mood} Punjabi song`}

${scriptNote}

Return ONLY valid JSON:
{
  "overlays": [
    {
      "timeStart": 0,
      "timeEnd": 4,
      "text": "text shown on screen — SHORT, max 6 words, emotionally powerful",
      "style": "how it looks in CapCut (e.g. centre white bold, fade in bottom, glitch top)"
    }
  ],
  "footage": [
    {
      "timeStart": 0,
      "timeEnd": 4,
      "search": "specific CapCut stock footage search term that matches the visual mood"
    }
  ],
  "caption": "emotional caption for posting — 2-3 sentences matching the mood, in ${language}",
  "hashtags": ["hashtag1", "hashtag2"],
  "beatTip": "One specific tip for syncing these overlays with the song beat in CapCut",
  "postingTip": "Best time and day to post this mood content for maximum reach on ${platform}"
}

Rules:
- Overlays must FEEL like they match the song emotion — poetic, not informational
- Each overlay MAX 6 words — punchy and visual
- Footage must be specific and cinematic (not generic)
- Total time must equal ${secs} seconds
- Hashtags: 5 mood-specific + 5 Punjabi/Indian music + 5 platform = 15 total
- Make the viewer FEEL the emotion just from the text overlays alone`,
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

  const selectedMood = MOODS.find(m => m.id === mood);

  return (
    <div className="space-y-6">
      <HowTo
        when="you want to make a Punjabi/Hindi song video with emotional text overlays synced to the beat"
        steps={[
          'Pick your mood, language, duration and describe the song vibe (optional)',
          'Generate — you get text overlays with exact timestamps, footage to search, and hashtags',
          'Click "Export for CapCut" → follow 5 steps → add your song → done',
        ]}
      />

      <TrendingSongs />

      <div className="card space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Song Video</h2>
          <p className="text-white/40 text-sm mt-1">Text overlays + footage + hashtags matched to your song mood. No voice needed.</p>
        </div>

        {/* Mood */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">Mood *</label>
          <div className="grid grid-cols-3 gap-2">
            {MOODS.map(m => (
              <button key={m.id} onClick={() => setMood(m.id)}
                className={`py-3 rounded-2xl text-sm font-semibold flex flex-col items-center gap-1 transition-all duration-200 ${
                  mood === m.id
                    ? `bg-gradient-to-br ${m.grad} text-white shadow-lg scale-[1.02]`
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}>
                <span className="text-xl">{m.emoji}</span>
                <span>{m.label}</span>
                <span className="text-xs opacity-60">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">Language</label>
          <div className="grid grid-cols-4 gap-2">
            {SONG_LANGS.map(l => (
              <button key={l.id} onClick={() => setLanguage(l.id)}
                className={`py-2.5 rounded-2xl text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                  language === l.id
                    ? 'bg-brand-500/30 border border-brand-500/60 text-white'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
                }`}>
                <span className="font-bold">{l.label}</span>
                <span className="text-white/30 text-[10px]">{l.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration + Platform */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-white/50 mb-2 block">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {SHORT_DURATIONS.map(d => (
                <button key={d.id} onClick={() => setDuration(d.id)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    duration === d.id ? 'bg-brand-500/30 border border-brand-500/60 text-white' : 'glass text-white/50 border border-transparent hover:text-white'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-white/50 mb-2 block">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {SHORTS_PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`py-2 rounded-xl text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${
                    platform === p.id ? 'bg-brand-500/30 border border-brand-500/60 text-white' : 'glass text-white/50 border border-transparent hover:text-white'
                  }`}>
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Song vibe */}
        <div>
          <label className="text-sm text-white/50 mb-1.5 block">Song name or vibe <span className="text-white/25">(optional)</span></label>
          <input value={songVibe} onChange={e => setSongVibe(e.target.value)}
            placeholder={`e.g. "Arjan Dhillon sad song" or "night drive lonely feeling"`}
            className="input-field" />
        </div>

        <button onClick={generate} disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all ${
            loading ? 'opacity-50 cursor-not-allowed bg-white/10' : `bg-gradient-to-r ${selectedMood?.grad} hover:opacity-90 hover:scale-[1.01] shadow-lg`
          }`}>
          {loading
            ? <><RefreshCw className="w-5 h-5 animate-spin" /> Generating overlays...</>
            : <><span className="text-xl">{selectedMood?.emoji}</span> Generate {selectedMood?.label} Video Script</>}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/25">Saved — go back anytime, it'll still be here</p>
            <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {/* Text Overlays */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/70">💬 Text Overlays</span>
              <CopyBtn text={(result.overlays || []).map(o => `${o.timeStart}s–${o.timeEnd}s → "${o.text}" (${o.style})`).join('\n')} />
            </div>
            <div className="space-y-3">
              {(result.overlays || []).map((o, i) => (
                <div key={i} className="flex gap-3 items-start py-3 border-b border-white/5 last:border-0 last:pb-0">
                  <span className="flex-shrink-0 text-xs text-brand-400 font-mono w-16">{o.timeStart}s–{o.timeEnd}s</span>
                  <div className="flex-1">
                    <p className="text-white font-bold text-base leading-snug">"{o.text}"</p>
                    <p className="text-white/30 text-xs mt-1">Style: {o.style}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footage */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/70">🎬 Footage to Search</span>
              <CopyBtn text={(result.footage || []).map(f => `${f.timeStart}s–${f.timeEnd}s → "${f.search}"`).join('\n')} />
            </div>
            <div className="space-y-2">
              {(result.footage || []).map((f, i) => (
                <div key={i} className="flex gap-3 items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs text-brand-400 font-mono w-16 flex-shrink-0">{f.timeStart}s–{f.timeEnd}s</span>
                  <span className="text-white/70 text-sm">"{f.search}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Caption + Hashtags */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white/70">📋 Caption & Hashtags</span>
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

          {/* Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card border border-purple-500/20 bg-purple-500/5">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-2">🥁 Beat Sync Tip</span>
              <p className="text-white/70 text-sm leading-relaxed">{result.beatTip}</p>
            </div>
            <div className="card border border-green-500/20 bg-green-500/5">
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider block mb-2">📅 Best Time to Post</span>
              <p className="text-white/70 text-sm leading-relaxed">{result.postingTip}</p>
            </div>
          </div>

          <button onClick={() => setShowCapCut(true)}
            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${selectedMood?.grad} text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90`}>
            🎬 Export for CapCut — 5 Steps
          </button>

          <button onClick={generate}
            className="w-full py-3 glass glass-hover rounded-xl text-white/50 hover:text-white text-sm flex items-center justify-center gap-2 transition-all">
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        </div>
      )}

      {showCapCut && result && (
        <SongCapCutModal result={result} mood={mood} onClose={() => setShowCapCut(false)} />
      )}
    </div>
  );
}

// ─── Today's Video (one-tap complete idea) ──────────────────────────────────────

function CopyLine({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
      title="Copy">
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function DailyVideo() {
  const [mood, setMood] = useLocalStorage('dv_mood', 'surprise');
  const [language, setLanguage] = useLocalStorage('dv_lang', 'punjabi');
  const [result, setResult] = useLocalStorage('dv_result', null);
  const [loading, setLoading] = useState(false);
  const [showCapCut, setShowCapCut] = useState(false);

  const clearAll = () => { setResult(null); setShowCapCut(false); };

  const generate = async () => {
    if (!hasValidKey()) { alert('Set your API key first.'); return; }
    setLoading(true);
    setResult(null);
    // Surprise = your niche strategy: ~80% Feelings lane, ~20% Motivation lane.
    const FEELINGS = ['sad', 'love', 'betrayal', 'nostalgic'];
    const MOTIVATION = ['motivational', 'party'];
    let pickedMood;
    if (mood === 'surprise') {
      const lane = Math.random() < 0.8 ? FEELINGS : MOTIVATION;
      const id = lane[Math.floor(Math.random() * lane.length)];
      pickedMood = MOODS.find(m => m.id === id);
    } else {
      pickedMood = MOODS.find(m => m.id === mood);
    }
    const langNote = language === 'punjabi'
      ? 'Write the overlay text in Punjabi using Gurmukhi script (ਇਸ ਤਰ੍ਹਾਂ). Not Roman.'
      : language === 'hindi'
      ? 'Write the overlay text in Hindi using Devanagari script (इस तरह).'
      : language === 'hinglish'
      ? 'Write the overlay text in Hinglish (Roman script mixing Hindi/English, e.g. "Dil toot gaya yaar").'
      : 'Write the overlay text in English.';
    try {
      const raw = await callAI(
        `You are a viral content director for Indian (Punjabi/Hindi) song videos on Reels, Shorts and TikTok. You hand a beginner creator ONE complete, ready-to-shoot video so they never have to think. Everything must be concrete and copy-paste ready.`,
        `Give me ONE complete song video to make RIGHT NOW.

Mood: ${pickedMood.label} — ${pickedMood.desc}
Language for on-screen text: ${language}
Format: 9:16 vertical, 20-35 seconds, for Reels/Shorts/TikTok.
${langNote}

This is for a beginner with 0 followers using CapCut free + a trending song. Make it SO clear they just open CapCut and build it.

Return ONLY valid JSON:
{
  "idea": "One punchy sentence: what this video IS (the concept)",
  "songSearch": "Exact text to type into Instagram/CapCut music search to find a fitting ${pickedMood.label.toLowerCase()} ${language} song (e.g. 'Arjan Dhillon slowed sad')",
  "firstSecond": "Exactly what happens in the FIRST 1 second to stop the scroll (the visual + the first overlay word)",
  "overlays": [
    { "at": "0-4s", "text": "on-screen line, MAX 6 words, emotional", "note": "where/how it appears on screen" }
  ],
  "footage": [
    { "at": "0-4s", "search": "exact CapCut stock search term — cinematic, matches mood, Indian context where relevant" }
  ],
  "caption": "Ready-to-paste caption in ${language}, 1-2 lines, emotional",
  "hashtags": ["10 mixed hashtags: mood + punjabi/hindi music + reels/shorts"],
  "why": "One sentence: why THIS video can get views/saves from strangers"
}

Rules:
- 4 to 6 overlays, 4 to 6 footage clips, timed to cover ~25-30s
- Overlays must hit the emotion HARD — poetic, not informational
- First second must be a genuine scroll-stopper
- Be specific everywhere — no vague placeholders`,
        1800
      );
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        parsed._mood = pickedMood.id;
        setResult(parsed);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // adapt result shape for the existing SongCapCutModal
  const capcutResult = result ? {
    footage: (result.footage || []).map(f => {
      const [a, b] = (f.at || '0-4s').replace(/s/g, '').split('-');
      return { timeStart: a || 0, timeEnd: b || 4, search: f.search };
    }),
    overlays: (result.overlays || []).map(o => {
      const [a, b] = (o.at || '0-4s').replace(/s/g, '').split('-');
      return { timeStart: a || 0, timeEnd: b || 4, text: o.text, style: o.note };
    }),
    caption: result.caption,
    hashtags: result.hashtags,
    beatTip: 'Use Auto Beat Sync so the clips cut on every beat. Drop your strongest overlay on the beat drop.',
    postingTip: 'Post between 7-10pm. Reels & Shorts both — same video, both apps.',
  } : null;

  const moodObj = result ? MOODS.find(m => m.id === result._mood) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] px-4 py-4">
        <p className="text-sm text-white font-bold mb-1">🎬 Never stare at a blank screen again</p>
        <p className="text-xs text-white/50 leading-relaxed">
          Pick a mood (or hit Surprise) → tap once → get ONE complete video to make right now:
          the idea, the song to search, the first second, every overlay line, the footage, and the caption.
          Copy each piece straight into CapCut.
        </p>
        <p className="text-xs text-cyan-300/70 leading-relaxed mt-2">
          🎯 Your niche: <span className="font-semibold">Feelings</span> (sad · love · nostalgic) with a little motivation now and then.
          Surprise keeps you ~80% feelings so your page stays focused — that's what grows it.
        </p>
      </div>

      <TrendingSongs />

      <div className="card space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Today's Video</h2>
          <p className="text-white/40 text-sm mt-1">One tap. One finished plan. Go make it.</p>
        </div>

        {/* Mood incl. Surprise */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">What mood today?</label>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setMood('surprise')}
              className={`py-3 rounded-2xl text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                mood === 'surprise' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}>
              <Dice5 className="w-5 h-5" />
              <span>Surprise</span>
              <span className="text-xs opacity-60">Mostly feelings</span>
            </button>
            {MOODS.map(m => (
              <button key={m.id} onClick={() => setMood(m.id)}
                className={`py-3 rounded-2xl text-sm font-semibold flex flex-col items-center gap-1 transition-all ${
                  mood === m.id ? `bg-gradient-to-br ${m.grad} text-white shadow-lg scale-[1.02]` : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}>
                <span className="text-xl">{m.emoji}</span>
                <span>{m.label}</span>
                <span className="text-xs opacity-60">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm text-white/50 mb-2 block">On-screen text language</label>
          <div className="grid grid-cols-4 gap-2">
            {SONG_LANGS.map(l => (
              <button key={l.id} onClick={() => setLanguage(l.id)}
                className={`py-2.5 rounded-2xl text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                  language === l.id ? 'bg-brand-500/30 border border-brand-500/60 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'
                }`}>
                <span className="font-bold">{l.label}</span>
                <span className="text-white/30 text-[10px]">{l.note}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all ${
            loading ? 'opacity-50 cursor-not-allowed bg-white/10' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 hover:scale-[1.01] shadow-lg'
          }`}>
          {loading
            ? <><RefreshCw className="w-5 h-5 animate-spin" /> Building your video...</>
            : <><Sparkles className="w-5 h-5" /> Give me today's video</>}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/25">Saved — go back anytime, it'll still be here</p>
            <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          {/* The idea */}
          <div className={`card bg-gradient-to-br ${moodObj?.grad || 'from-cyan-600 to-blue-700'} border-0`}>
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
              {moodObj?.emoji} {moodObj?.label} · Today's video
            </p>
            <p className="text-white text-xl font-black leading-snug">{result.idea}</p>
            {result.why && <p className="text-white/70 text-xs mt-3">✨ {result.why}</p>}
          </div>

          {/* Song to find */}
          <div className="card border border-fuchsia-500/25 bg-fuchsia-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Music className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider">Find this song</p>
                  <p className="text-white font-semibold text-sm truncate">"{result.songSearch}"</p>
                </div>
              </div>
              <CopyLine text={result.songSearch} />
            </div>
            <p className="text-white/40 text-xs mt-2">Search this in Instagram music or CapCut. Pick one with the trending ↗ arrow.</p>
          </div>

          {/* First second */}
          <div className="card border border-red-500/25 bg-red-500/5">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1.5">⚡ First 1 second (scroll-stopper)</p>
            <p className="text-white text-base font-semibold leading-snug">{result.firstSecond}</p>
          </div>

          {/* Overlays */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/70">💬 Text Overlays — copy each line</span>
              <CopyBtn text={(result.overlays || []).map(o => `${o.at} → "${o.text}"`).join('\n')} />
            </div>
            <div className="space-y-2.5">
              {(result.overlays || []).map((o, i) => (
                <div key={i} className="flex gap-3 items-center py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="flex-shrink-0 text-xs text-brand-400 font-mono w-14">{o.at}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base leading-snug">"{o.text}"</p>
                    {o.note && <p className="text-white/30 text-xs mt-0.5">{o.note}</p>}
                  </div>
                  <CopyLine text={o.text} />
                </div>
              ))}
            </div>
          </div>

          {/* Footage */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white/70">🎬 Footage to Search in CapCut</span>
              <CopyBtn text={(result.footage || []).map(f => `${f.at} → "${f.search}"`).join('\n')} />
            </div>
            <div className="space-y-2">
              {(result.footage || []).map((f, i) => (
                <div key={i} className="flex gap-3 items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs text-brand-400 font-mono w-14 flex-shrink-0">{f.at}</span>
                  <span className="text-white/70 text-sm flex-1">"{f.search}"</span>
                  <CopyLine text={f.search} />
                </div>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white/70">📋 Caption & Hashtags</span>
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

          <button onClick={() => setShowCapCut(true)}
            className={`w-full py-4 rounded-2xl bg-gradient-to-r ${moodObj?.grad || 'from-cyan-500 to-blue-600'} text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90`}>
            🎬 Build it in CapCut — Step-by-Step
          </button>

          <button onClick={generate}
            className="w-full py-3 glass glass-hover rounded-xl text-white/50 hover:text-white text-sm flex items-center justify-center gap-2 transition-all">
            <Dice5 className="w-4 h-4" /> Give me a different video
          </button>
        </div>
      )}

      {showCapCut && capcutResult && (
        <SongCapCutModal result={capcutResult} mood={result._mood} onClose={() => setShowCapCut(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'daily',  label: "Today's Video",  emoji: '🎬', desc: 'One tap → a complete video to make now' },
  { id: 'song',   label: 'Song Video',    emoji: '🎵', desc: 'Build a custom song video your way' },
  { id: 'hooks',  label: 'Hook Writer',   emoji: '⚡', desc: 'First 3 seconds that stop the scroll' },
  { id: 'shorts', label: 'Shorts Engine', emoji: '📱', desc: 'Frame-by-frame scripts with loop endings' },
];

export default function GrowthTools() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('daily');

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
          <p className="text-white/50">Stuck on what to post? Start with Today's Video — one tap, one finished plan.</p>
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

        {tab === 'daily' && <DailyVideo />}
        {tab === 'song' && <SongVideo />}
        {tab === 'hooks' && <HookWriter />}
        {tab === 'shorts' && <ShortsEngine />}
      </div>
    </div>
  );
}
