import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Sparkles, Zap, Globe, Mic, Layers, ChevronRight, Play, Key, TrendingUp, MapPin, Scissors, FlaskConical, TestTube2, Rocket } from 'lucide-react';
import ApiKeyModal from '../components/ApiKeyModal.jsx';
import { hasValidKey, getSettings, PROVIDERS } from '../services/providers.js';

const EXAMPLE_PROMPTS = [
  'How to start a successful YouTube channel',
  'Top 5 productivity tips for remote workers',
  'The future of artificial intelligence',
  'How to learn a new language fast',
  'Best travel destinations for 2025',
  'Introduction to cryptocurrency investing',
];

const FEATURES = [
  { icon: Sparkles, title: 'AI Script Writing', desc: 'Claude AI generates a full video script with scenes, narration, and key points tailored to your topic.' },
  { icon: Mic, title: 'Auto Narration', desc: 'Built-in text-to-speech converts your script into natural voice narration instantly.' },
  { icon: Layers, title: 'Scene Editor', desc: 'Customize every scene — edit text, change styles, reorder or regenerate individual scenes.' },
  { icon: Globe, title: 'Multiple Styles', desc: 'Choose from professional, cinematic, educational, social media, and more visual styles.' },
  { icon: Zap, title: 'Instant Preview', desc: 'See your video come to life in real-time with animated scene previews and transitions.' },
  { icon: Video, title: 'Export Ready', desc: 'Download your video script and share it across any platform.' },
];

const STYLES = [
  { id: 'professional', label: 'Professional', emoji: '💼', color: 'from-blue-600 to-blue-800' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', color: 'from-purple-700 to-indigo-900' },
  { id: 'educational', label: 'Educational', emoji: '📚', color: 'from-green-600 to-teal-800' },
  { id: 'social', label: 'Social Media', emoji: '📱', color: 'from-pink-500 to-rose-700' },
  { id: 'motivational', label: 'Motivational', emoji: '🔥', color: 'from-orange-500 to-red-700' },
  { id: 'documentary', label: 'Documentary', emoji: '🎥', color: 'from-slate-600 to-slate-900' },
];

export default function Home() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [duration, setDuration] = useState(60);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const handleCreate = () => {
    if (!prompt.trim()) return;
    const params = new URLSearchParams({
      topic: prompt.trim(),
      style: selectedStyle,
      duration: duration.toString(),
    });
    navigate(`/create?${params}`);
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-grid overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">VideoAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/launch')}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-all text-sm font-medium">
              <Rocket className="w-4 h-4" />
              <span className="hidden sm:inline">Launch Kit</span>
            </button>
            <button onClick={() => navigate('/scriptlab')}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all text-sm font-medium">
              <TestTube2 className="w-4 h-4" />
              <span className="hidden sm:inline">Script Lab</span>
            </button>
            <button onClick={() => navigate('/editor')}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-all text-sm font-medium">
              <Scissors className="w-4 h-4" />
              <span className="hidden sm:inline">Video Editor</span>
            </button>
            <button onClick={() => navigate('/alchemy')}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all text-sm font-medium">
              <FlaskConical className="w-4 h-4" />
              <span className="hidden sm:inline">Alchemy Lab</span>
            </button>
            <button onClick={() => navigate('/trends')}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition-all text-sm font-medium">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Trend Intel</span>
            </button>
            <button onClick={() => navigate('/viral')}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl border border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-all text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Algorithm Cracker</span>
            </button>
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
              title="Set your Anthropic API key"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">{hasValidKey() ? `⚙ ${PROVIDERS[getSettings().providerId]?.name || 'AI'}` : 'Set API Key'}</span>
            </button>
            <button
              onClick={() => navigate('/create')}
              className="btn-primary py-2 px-5 text-sm"
            >
              Start Creating
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-brand-400 mb-8">
            <Sparkles className="w-4 h-4" />
            Powered by Claude AI
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Create{' '}
            <span className="gradient-text">AI Videos</span>
            <br />
            in Minutes
          </h1>

          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            Just describe what you want, and our AI generates a complete video — script, scenes,
            narration, and visuals — ready to present or export.
          </p>

          {/* Main Input Card */}
          <div className="card max-w-3xl mx-auto mb-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/50 mb-2 block text-left">What's your video about?</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreate()}
                  placeholder="e.g. How to start a successful YouTube channel..."
                  className="input-field resize-none h-24 text-lg"
                />
              </div>

              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPrompt(p)}
                    className="text-xs glass glass-hover rounded-full px-3 py-1.5 text-white/60 hover:text-white"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Style & Duration row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm text-white/50 mb-2 block text-left">Video Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLES.slice(0, 6).map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id)}
                        className={`py-2 px-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                          selectedStyle === s.id
                            ? 'bg-brand-500/30 border border-brand-500/60 text-white'
                            : 'glass glass-hover text-white/60 border border-transparent'
                        }`}
                      >
                        <span>{s.emoji}</span>
                        <span className="text-xs">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:w-52">
                  <label className="text-sm text-white/50 mb-2 block text-left">
                    Duration: <span className="text-white">{duration}s</span>
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={180}
                    step={15}
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full accent-brand-500 mt-3"
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>30s</span>
                    <span>3min</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!prompt.trim()}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Generate Video with AI
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Honest info strip */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-white/40 text-sm">
            <span className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full text-xs">
              ⚡ Free with Groq API
            </span>
            <span className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full text-xs">
              🔑 Your API key, your control
            </span>
            <span className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full text-xs">
              🚀 No signup needed
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything you need to{' '}
              <span className="gradient-text">create amazing videos</span>
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              From script to screen, our AI handles the heavy lifting so you can focus on your message.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card glass-hover group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center mb-4 group-hover:border-brand-500/40 transition-all">
                  <Icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How it works</h2>
            <p className="text-white/50 text-lg">Three simple steps to your AI video</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '✍️', title: 'Describe your video', desc: 'Enter your topic, choose a style, and set the duration. Our AI does the rest.' },
              { step: '02', icon: '🤖', title: 'AI generates everything', desc: 'Claude AI writes a full script with scenes, narration, and visual cues.' },
              { step: '03', icon: '🎬', title: 'Preview and customize', desc: 'Edit scenes, regenerate content, and preview your animated video in real-time.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center mx-auto mb-6 text-3xl">
                  {icon}
                </div>
                <div className="text-xs text-brand-400 font-mono mb-2">STEP {step}</div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card border border-brand-500/20 bg-gradient-to-br from-brand-500/10 to-purple-500/10">
            <div className="text-5xl mb-6">🎬</div>
            <h2 className="text-4xl font-bold mb-4">Ready to create your first AI video?</h2>
            <p className="text-white/50 mb-8 text-lg">
              Join thousands of creators making professional videos in minutes.
            </p>
            <button
              onClick={() => navigate('/create')}
              className="btn-primary text-lg px-10 py-4 flex items-center gap-3 mx-auto"
            >
              <Play className="w-5 h-5" />
              Start Creating for Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">VideoAI</span>
          </div>
          <p className="text-white/30 text-sm">Built with Claude AI · © 2025 VideoAI</p>
        </div>
      </footer>

      {showApiKeyModal && (
        <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />
      )}
    </div>
  );
}
