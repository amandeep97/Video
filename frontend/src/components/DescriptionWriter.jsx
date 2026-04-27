import { useState } from 'react';
import { X, FileText, Loader2, Copy, Check } from 'lucide-react';
import { callAI } from '../services/api.js';

const PLATFORMS = [
  { id: 'youtube',   label: 'YouTube',   emoji: '▶️' },
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { id: 'twitter',   label: 'Twitter/X', emoji: '✖️' },
];

export default function DescriptionWriter({ script, onClose }) {
  const [platform,  setPlatform]  = useState('youtube');
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState('');

  const handleGenerate = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const prompt = `Write a ${platform} description and hashtags for this video:

Title: "${script.title}"
Topic: ${script.scenes?.[0]?.narration?.substring(0, 200)}
Style: ${script.style}
Duration: ${script.totalDuration}s
Tags: ${script.tags?.join(', ')}

Return ONLY valid JSON, no markdown:
{
  "description": "full ${platform} description (2-4 paragraphs, include keywords naturally, add call to action at end)",
  "hashtags": ["hashtag1", "hashtag2"],
  "title_suggestions": ["alternative title 1", "alternative title 2", "alternative title 3"]
}

For YouTube: 200-300 words, SEO optimized, include timestamps placeholder
For Instagram: 150 words max, conversational, emojis
For TikTok: 50 words max, punchy, trending phrases
For Twitter: 2-3 sentences max, engaging`;

      const content = await callAI('You are a social media content writer. Return only valid JSON.', prompt, 1500);
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse result');
      setResult(JSON.parse(match[0]));
    } catch (e) {
      setError(e.message || 'Failed. Check your AI key in Settings.');
    }
    setLoading(false);
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)}
      className="flex items-center gap-1 px-2 py-1 rounded-lg glass glass-hover text-xs text-white/50 hover:text-white transition-all">
      {copied === id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied === id ? 'Copied!' : 'Copy'}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Description + Hashtags</h3>
              <p className="text-xs text-white/40">AI writes your post description</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Platform */}
          <div className="grid grid-cols-4 gap-2">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setPlatform(p.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                  platform === p.id ? 'bg-orange-500/20 border-orange-500/40 text-white' : 'glass border-white/10 text-white/50 hover:text-white'
                }`}>
                <span className="text-lg">{p.emoji}</span>
                <span className="text-[10px] font-medium">{p.label}</span>
              </button>
            ))}
          </div>

          <button onClick={handleGenerate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white text-sm font-semibold hover:from-orange-500 hover:to-red-400 transition-all disabled:opacity-40">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing…</> : <><FileText className="w-4 h-4" /> Generate Description</>}
          </button>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          {result && (
            <div className="space-y-4">
              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white/60">Description</p>
                  <CopyBtn text={result.description} id="desc" />
                </div>
                <div className="glass rounded-xl p-3 text-xs text-white/70 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {result.description}
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white/60">Hashtags ({result.hashtags?.length})</p>
                  <CopyBtn text={result.hashtags?.map(h => `#${h.replace('#','')}`).join(' ')} id="tags" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.hashtags?.map((h, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300">
                      #{h.replace('#', '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Title suggestions */}
              {result.title_suggestions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-white/60 mb-2">Alternative Titles</p>
                  <div className="space-y-1.5">
                    {result.title_suggestions.map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 glass p-2.5 rounded-xl">
                        <p className="text-xs text-white/70 flex-1">{t}</p>
                        <CopyBtn text={t} id={`title-${i}`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
