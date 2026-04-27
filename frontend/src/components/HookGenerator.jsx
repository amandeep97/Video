import { useState } from 'react';
import { X, Zap, Loader2, Check } from 'lucide-react';
import { callAI } from '../services/api.js';

const HOOK_TYPES = [
  { id: 'shock',     emoji: '😱', label: 'Shock',    desc: '"99% of people do this wrong..."' },
  { id: 'question',  emoji: '🤔', label: 'Question', desc: '"Why are you still failing at X?"' },
  { id: 'story',     emoji: '📖', label: 'Story',    desc: '"Last year I had nothing. Today..."' },
  { id: 'number',    emoji: '🔢', label: 'Number',   desc: '"5 things that changed my life..."' },
  { id: 'curiosity', emoji: '🔮', label: 'Curiosity',desc: '"The secret nobody tells you..."' },
];

export default function HookGenerator({ script, onApply, onClose }) {
  const [loading, setLoading] = useState(false);
  const [hooks,   setHooks]   = useState([]);
  const [error,   setError]   = useState('');
  const [applied, setApplied] = useState(null);

  const handleGenerate = async () => {
    setLoading(true); setError(''); setHooks([]);
    try {
      const prompt = `Generate 5 powerful video hooks for this topic. Each hook is the FIRST 2-3 sentences of the video (the opening that stops people scrolling).

Video Title: "${script.title}"
Style: ${script.style}
Current opening: "${script.scenes?.[0]?.narration?.substring(0, 150)}"

Generate one hook for each type: shock, question, story, number, curiosity.

Return ONLY valid JSON, no markdown:
[
  { "type": "shock",     "hook": "full 2-3 sentence hook text", "why": "why this works" },
  { "type": "question",  "hook": "full 2-3 sentence hook text", "why": "why this works" },
  { "type": "story",     "hook": "full 2-3 sentence hook text", "why": "why this works" },
  { "type": "number",    "hook": "full 2-3 sentence hook text", "why": "why this works" },
  { "type": "curiosity", "hook": "full 2-3 sentence hook text", "why": "why this works" }
]`;

      const content = await callAI('You are a viral video hook writer. Write hooks that stop people from scrolling. Return only valid JSON.', prompt, 1500);
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse hooks');
      setHooks(JSON.parse(match[0]));
    } catch (e) {
      setError(e.message || 'Failed. Check your AI key in Settings.');
    }
    setLoading(false);
  };

  const handleApply = (hook) => {
    const updated = {
      ...script,
      scenes: script.scenes.map((s, i) =>
        i === 0 ? { ...s, narration: hook.hook + ' ' + s.narration } : s
      ),
    };
    onApply(updated);
    setApplied(hook.type);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Hook Generator</h3>
              <p className="text-xs text-white/40">5 hooks to stop people scrolling</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Hook type preview */}
          {hooks.length === 0 && (
            <div className="grid grid-cols-1 gap-2">
              {HOOK_TYPES.map(h => (
                <div key={h.id} className="flex items-center gap-3 glass p-3 rounded-xl">
                  <span className="text-xl">{h.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{h.label}</p>
                    <p className="text-[10px] text-white/35">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-500 text-white text-sm font-semibold hover:from-yellow-500 hover:to-orange-400 transition-all disabled:opacity-40">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating 5 hooks…</> : <><Zap className="w-4 h-4" /> Generate 5 Hooks</>}
          </button>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          {/* Hook results */}
          {hooks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/40">Click a hook to add it to Scene 1 →</p>
              {hooks.map((h, i) => {
                const type = HOOK_TYPES.find(t => t.id === h.type);
                return (
                  <button key={i} onClick={() => handleApply(h)}
                    className={`w-full text-left p-4 rounded-xl border transition-all group ${
                      applied === h.type
                        ? 'bg-green-500/20 border-green-500/40'
                        : 'glass border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/5'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{type?.emoji}</span>
                      <span className="text-xs font-bold text-white">{type?.label} Hook</span>
                      {applied === h.type
                        ? <Check className="w-3.5 h-3.5 text-green-400 ml-auto" />
                        : <Zap className="w-3.5 h-3.5 text-yellow-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">"{h.hook}"</p>
                    <p className="text-[10px] text-white/30 mt-2">💡 {h.why}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
