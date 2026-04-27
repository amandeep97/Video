import { useState } from 'react';
import { X, Languages, Loader2, Check } from 'lucide-react';
import { callAI } from '../services/api.js';

const LANGUAGES = [
  { id: 'Hindi',      flag: '🇮🇳', label: 'Hindi' },
  { id: 'Punjabi',    flag: '🇮🇳', label: 'Punjabi' },
  { id: 'Spanish',    flag: '🇪🇸', label: 'Spanish' },
  { id: 'French',     flag: '🇫🇷', label: 'French' },
  { id: 'Arabic',     flag: '🇸🇦', label: 'Arabic' },
  { id: 'Portuguese', flag: '🇧🇷', label: 'Portuguese' },
  { id: 'German',     flag: '🇩🇪', label: 'German' },
  { id: 'Japanese',   flag: '🇯🇵', label: 'Japanese' },
  { id: 'Chinese',    flag: '🇨🇳', label: 'Chinese' },
  { id: 'Korean',     flag: '🇰🇷', label: 'Korean' },
  { id: 'Urdu',       flag: '🇵🇰', label: 'Urdu' },
  { id: 'Bengali',    flag: '🇧🇩', label: 'Bengali' },
];

export default function ScriptTranslator({ script, onApply, onClose }) {
  const [lang,    setLang]    = useState('Hindi');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error,   setError]   = useState('');

  const handleTranslate = async () => {
    setLoading(true); setError(''); setPreview(null);
    try {
      const prompt = `Translate this video script to ${lang}. Keep the same structure, energy and style. Make it natural, not robotic.

Title: "${script.title}"
Description: "${script.description}"
Call to Action: "${script.callToAction}"
Scenes:
${script.scenes.map((s, i) => `Scene ${i+1} title: "${s.title}"
Scene ${i+1} narration: "${s.narration}"
Scene ${i+1} keyPoints: ${JSON.stringify(s.keyPoints)}`).join('\n\n')}

Return ONLY valid JSON, no markdown:
{
  "title": "translated title",
  "description": "translated description",
  "callToAction": "translated CTA",
  "scenes": [
    {
      "id": 1,
      "title": "translated scene title",
      "narration": "translated narration",
      "keyPoints": ["translated point 1", "translated point 2"]
    }
  ]
}`;

      const content = await callAI(`You are a professional translator. Translate to ${lang} naturally. Return only valid JSON.`, prompt, 3000);
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse translation');
      setPreview(JSON.parse(match[0]));
    } catch (e) {
      setError(e.message || 'Translation failed. Check your AI key in Settings.');
    }
    setLoading(false);
  };

  const handleApply = () => {
    const updated = {
      ...script,
      title: preview.title,
      description: preview.description,
      callToAction: preview.callToAction,
      scenes: script.scenes.map((s, i) => ({
        ...s,
        title: preview.scenes[i]?.title || s.title,
        narration: preview.scenes[i]?.narration || s.narration,
        keyPoints: preview.scenes[i]?.keyPoints || s.keyPoints,
      })),
    };
    onApply(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/20 flex items-center justify-center">
              <Languages className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Script Translator</h3>
              <p className="text-xs text-white/40">Translate your entire script</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Language grid */}
          <div>
            <label className="text-xs text-white/50 mb-2 block font-medium">Translate to</label>
            <div className="grid grid-cols-4 gap-1.5">
              {LANGUAGES.map(l => (
                <button key={l.id} onClick={() => setLang(l.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                    lang === l.id ? 'bg-indigo-500/20 border-indigo-500/40 text-white' : 'glass border-white/10 text-white/50 hover:text-white'
                  }`}>
                  <span className="text-base">{l.flag}</span>
                  <span className="text-[9px] font-medium">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleTranslate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-semibold hover:from-indigo-500 hover:to-blue-400 transition-all disabled:opacity-40">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Translating {script.scenes?.length} scenes…</> : <><Languages className="w-4 h-4" /> Translate to {lang}</>}
          </button>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          {preview && (
            <div className="space-y-3">
              <div className="glass rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-sm font-bold text-white">{preview.title}</p>
                {preview.scenes?.map((s, i) => (
                  <div key={i} className="border-t border-white/5 pt-2">
                    <p className="text-xs font-medium text-white/60">Scene {i+1}: {s.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{s.narration?.substring(0, 100)}…</p>
                  </div>
                ))}
              </div>
              <button onClick={handleApply}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-500 transition-all">
                <Check className="w-4 h-4" /> Apply Translation to Script
              </button>
              <button onClick={() => setPreview(null)} className="btn-secondary w-full text-sm">
                Translate Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
