import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Sparkles, Zap, Globe, Mic, Layers, ChevronRight,
  Play, Key, TrendingUp, MapPin, Scissors, FlaskConical,
  TestTube2, Rocket, Menu, X, ArrowRight,
} from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal.jsx';
import { hasValidKey, getSettings, PROVIDERS } from '../services/providers.js';

const TOOLS = [
  { icon: Zap,          label: 'Growth Tools',    desc: 'Hooks & Shorts scripts',   route: '/tools',     grad: 'from-cyan-400 to-blue-500',    ring: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' },
  { icon: Rocket,       label: 'Launch Kit',       desc: 'Keywords & 30-day plan',   route: '/launch',    grad: 'from-sky-400 to-indigo-500',   ring: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  { icon: TestTube2,    label: 'Script Lab',       desc: 'DNA clone & angles',       route: '/scriptlab', grad: 'from-rose-400 to-pink-600',    ring: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  { icon: FlaskConical, label: 'Alchemy Lab',      desc: 'Viral content angles',     route: '/alchemy',   grad: 'from-amber-400 to-orange-500', ring: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  { icon: MapPin,       label: 'Trend Intel',      desc: 'Live trending topics',     route: '/trends',    grad: 'from-orange-400 to-red-500',   ring: 'border-orange-500/30 bg-orange-500/10 text-orange-300' },
  { icon: TrendingUp,   label: 'Algorithm Cracker',desc: 'Beat the algorithm',       route: '/viral',     grad: 'from-green-400 to-emerald-600',ring: 'border-green-500/30 bg-green-500/10 text-green-300' },
  { icon: Scissors,     label: 'Video Editor',     desc: 'Edit your videos',         route: '/editor',    grad: 'from-violet-400 to-purple-600',ring: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
];

const EXAMPLE_PROMPTS = [
  'How to start a YouTube channel',
  'Top 5 productivity tips',
  'Future of artificial intelligence',
  'Learn a language fast',
  'Best travel destinations 2025',
  'Crypto investing basics',
];

const STYLES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'cinematic',    label: 'Cinematic',    emoji: '🎬' },
  { id: 'educational',  label: 'Educational',  emoji: '📚' },
  { id: 'social',       label: 'Social Media', emoji: '📱' },
  { id: 'motivational', label: 'Motivational', emoji: '🔥' },
  { id: 'documentary',  label: 'Documentary',  emoji: '🎥' },
];

const FEATURES = [
  { icon: Sparkles, title: 'AI Script Writing',  desc: 'Claude AI generates a full script with scenes, narration, and key points for your topic.' },
  { icon: Mic,      title: 'Auto Narration',      desc: 'Built-in text-to-speech converts your script into natural voice narration instantly.' },
  { icon: Layers,   title: 'Scene Editor',        desc: 'Customize every scene — edit text, change styles, reorder or regenerate individual scenes.' },
  { icon: Globe,    title: 'Multiple Styles',     desc: 'Professional, cinematic, educational, social media, and more visual styles to choose from.' },
  { icon: Zap,      title: 'Instant Preview',     desc: 'See your video come to life in real-time with animated scene previews and transitions.' },
  { icon: Video,    title: 'Export Ready',        desc: 'Download your video script and share it across any platform.' },
];

function ToolsMenu({ onClose }) {
  const navigate = useNavigate();
  const go = route => { navigate(route); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/95 backdrop-blur-xl" />

      {/* Panel */}
      <div className="relative flex flex-col h-full max-w-lg w-full mx-auto px-5 pt-5 pb-8"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-0.5">All Tools</p>
            <h2 className="text-2xl font-black text-white">What do you need?</h2>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto animate-slide-down">
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.route} onClick={() => go(t.route)} className="tool-card">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.grad} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{t.label}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-tight">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom tip */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/20">New to VideoAI? Start with <span className="text-brand-400">Launch Kit</span></p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [duration, setDuration] = useState(60);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreate = () => {
    if (!prompt.trim()) return;
    navigate(`/create?${new URLSearchParams({ topic: prompt.trim(), style: selectedStyle, duration: duration.toString() })}`);
  };

  const apiLabel = hasValidKey()
    ? `${PROVIDERS[getSettings().providerId]?.name || 'AI'} ✓`
    : 'Set API Key';

  return (
    <div className="min-h-screen bg-dark-950 bg-grid overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-dark-950/80 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black gradient-text tracking-tight">VideoAI</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* API key — hidden on very small screens */}
            <button onClick={() => setShowApiKeyModal(true)}
              className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-medium">
              <Key className="w-3.5 h-3.5" />
              {apiLabel}
            </button>

            {/* Tools hamburger */}
            <button onClick={() => setMenuOpen(true)}
              className="flex items-center gap-2 py-2.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold">
              <Menu className="w-4 h-4" />
              <span>Tools</span>
            </button>

            {/* Primary CTA */}
            <button onClick={() => navigate('/create')} className="btn-primary py-2.5 px-5 text-sm">
              Create
            </button>
          </div>
        </div>
      </nav>

      {/* Tools overlay */}
      {menuOpen && <ToolsMenu onClose={() => setMenuOpen(false)} />}

      {/* ───── Hero ───── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative">
        {/* Background glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-brand-500/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8
                          bg-white/5 border border-white/10 backdrop-blur-md text-sm text-brand-400 font-medium">
            <Sparkles className="w-4 h-4" />
            Powered by Claude AI
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
            Create{' '}
            <span className="gradient-text">AI Videos</span>
            <br />
            <span className="text-white/90">in Minutes</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            Describe your idea. Get a complete video — script, scenes,
            narration, and visuals — ready to use in CapCut or any editor.
          </p>

          {/* ── Main Card ── */}
          <div className="max-w-3xl mx-auto mb-6
                          rounded-3xl border border-white/10
                          bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                          backdrop-blur-md p-6 sm:p-8">
            <div className="space-y-5">

              {/* Topic input */}
              <div className="text-left">
                <label className="text-sm text-white/40 mb-2 block font-medium">What's your video about?</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreate()}
                  placeholder="e.g. How to start a YouTube channel from 0..."
                  className="input-field resize-none h-24 text-base"
                />
              </div>

              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map(p => (
                  <button key={p} onClick={() => setPrompt(p)}
                    className="text-xs rounded-full px-3 py-1.5 bg-white/5 border border-white/10
                               text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20
                               transition-all duration-200">
                    {p}
                  </button>
                ))}
              </div>

              {/* Style + Duration */}
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Style picker */}
                <div className="flex-1 text-left">
                  <label className="text-sm text-white/40 mb-2 block font-medium">Video Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLES.map(s => (
                      <button key={s.id} onClick={() => setSelectedStyle(s.id)}
                        className={`py-2.5 px-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                          selectedStyle === s.id
                            ? 'bg-brand-500/20 border border-brand-500/50 text-white shadow-[0_0_16px_rgba(79,110,247,0.2)]'
                            : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                        }`}>
                        <span>{s.emoji}</span>
                        <span className="truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="sm:w-52 text-left">
                  <label className="text-sm text-white/40 mb-2 block font-medium">
                    Duration: <span className="text-white font-bold">{duration}s</span>
                  </label>
                  <input type="range" min={30} max={180} step={15} value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full accent-brand-500 mt-3" />
                  <div className="flex justify-between text-xs text-white/25 mt-1.5">
                    <span>30s</span><span>3 min</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button onClick={handleCreate} disabled={!prompt.trim()}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3">
                <Sparkles className="w-5 h-5" />
                Generate Video with AI
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {['⚡ Free with Groq API', '🔑 Your key, your control', '🚀 No signup needed'].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-white/40">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Tool Cards Strip ───── */}
      <section className="py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-white/30 text-xs uppercase tracking-widest font-semibold mb-6">All Tools</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {TOOLS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.route} onClick={() => navigate(t.route)}
                  className="tool-card group">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.grad} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              Everything you need to{' '}
              <span className="gradient-text">create amazing videos</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              From script to screen, AI handles the heavy lifting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="card group hover:border-white/20 hover:bg-white/[0.07] transition-all duration-300">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20
                                border border-brand-500/20 flex items-center justify-center mb-4
                                group-hover:border-brand-500/40 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">How it works</h2>
            <p className="text-white/40 text-lg">Three steps to your AI video</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '✍️', title: 'Describe your video', desc: 'Enter your topic, choose a style, and set the duration.' },
              { step: '02', icon: '🤖', title: 'AI generates everything', desc: 'Claude AI writes a full script with scenes, narration, and visuals.' },
              { step: '03', icon: '🎬', title: 'Export to CapCut', desc: 'Get a step-by-step CapCut guide — footage, voice, overlays, done.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500/15 to-purple-500/15
                                border border-brand-500/20 flex items-center justify-center mx-auto mb-6 text-3xl
                                shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  {icon}
                </div>
                <div className="text-xs text-brand-400 font-mono font-bold mb-2 tracking-widest">STEP {step}</div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-3xl border border-brand-500/20
                          bg-gradient-to-br from-brand-500/10 to-purple-500/10
                          shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
                          backdrop-blur-md p-10 sm:p-14">
            <div className="text-5xl mb-6">🎬</div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Ready to create?</h2>
            <p className="text-white/40 mb-8 text-lg">
              Free with your Groq or Claude API key. No signup.
            </p>
            <button onClick={() => navigate('/create')}
              className="btn-primary text-base px-10 py-4 flex items-center gap-3 mx-auto">
              <Play className="w-5 h-5" />
              Start Creating for Free
            </button>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-black gradient-text">VideoAI</span>
          </div>
          <p className="text-white/20 text-sm">Built with Claude AI · © 2025 VideoAI</p>
        </div>
      </footer>

      {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />}
    </div>
  );
}
