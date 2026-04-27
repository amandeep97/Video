import { useState } from 'react';
import { X, Search, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { callAI } from '../services/api.js';

const CATEGORIES = [
  { id: 'cooking',     label: 'Cooking',      emoji: '🍳' },
  { id: 'motivation',  label: 'Motivation',   emoji: '🔥' },
  { id: 'business',    label: 'Business',     emoji: '💼' },
  { id: 'tech',        label: 'Technology',   emoji: '🤖' },
  { id: 'health',      label: 'Health',       emoji: '💪' },
  { id: 'travel',      label: 'Travel',       emoji: '✈️' },
  { id: 'finance',     label: 'Finance',      emoji: '💰' },
  { id: 'education',   label: 'Education',    emoji: '📚' },
  { id: 'social',      label: 'Social Media', emoji: '📱' },
  { id: 'fashion',     label: 'Fashion',      emoji: '👗' },
  { id: 'gaming',      label: 'Gaming',       emoji: '🎮' },
  { id: 'news',        label: 'News & Facts',  emoji: '📰' },
];

const REGIONS = [
  { id: 'global',  label: 'Global' },
  { id: 'india',   label: 'India 🇮🇳' },
  { id: 'us',      label: 'USA 🇺🇸' },
  { id: 'uk',      label: 'UK 🇬🇧' },
];

export default function TopicFinder({ onSelect, onClose }) {
  const [category,  setCategory]  = useState('cooking');
  const [region,    setRegion]    = useState('global');
  const [topics,    setTopics]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const handleFind = async () => {
    setLoading(true); setError(''); setTopics([]);
    try {
      const cat = CATEGORIES.find(c => c.id === category);
      const prompt = `Generate 8 trending, high-engagement video topic ideas for ${cat.label} content targeted at ${region} audience in 2025.

Each topic should be:
- Specific and clickable (not generic)
- Good for short videos (20-90 seconds)
- Currently trending or evergreen viral format

Respond ONLY with valid JSON array, no markdown:
[
  {
    "topic": "exact video title/topic",
    "why": "one sentence why it trends",
    "style": "professional|educational|social|motivational|cinematic|documentary",
    "duration": 60
  }
]`;

      const content = await callAI('You are a viral content strategist. Return only valid JSON.', prompt, 1024);
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse topics');
      setTopics(JSON.parse(match[0]));
    } catch (e) {
      setError(e.message || 'Failed to find topics. Check your AI key in Settings.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-teal-500/20 border border-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Topic Finder</h3>
              <p className="text-xs text-white/40">AI finds trending topics for your niche</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-medium">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                    category === c.id ? 'bg-green-500/20 border-green-500/40 text-white' : 'glass border-white/10 text-white/50 hover:text-white'
                  }`}>
                  <span className="text-base">{c.emoji}</span>
                  <span className="text-[9px] font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-medium">Region</label>
            <div className="flex gap-2">
              {REGIONS.map(r => (
                <button key={r.id} onClick={() => setRegion(r.id)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                    region === r.id ? 'bg-green-500/20 border-green-500/40 text-white' : 'glass border-white/10 text-white/50 hover:text-white'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Find button */}
          <button onClick={handleFind} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-500 text-white text-sm font-semibold hover:from-green-500 hover:to-teal-400 transition-all disabled:opacity-40">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Finding trending topics…</> : <><Search className="w-4 h-4" /> Find Trending Topics</>}
          </button>

          {/* Error */}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          {/* Results */}
          {topics.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/40 font-medium">Click a topic to use it →</p>
              {topics.map((t, i) => (
                <button key={i} onClick={() => { onSelect(t); onClose(); }}
                  className="w-full glass glass-hover p-3.5 rounded-xl text-left group border border-white/5 hover:border-green-500/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white group-hover:text-green-300 transition-colors leading-snug">
                      {t.topic}
                    </p>
                    <Sparkles className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] text-white/35 mt-1">{t.why}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize">{t.style}</span>
                    <span className="text-[9px] text-white/30">{t.duration}s</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
