import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';

const TRANSITIONS = ['fade', 'slide', 'zoom'];
const EMOJIS = ['🎬', '📱', '💡', '🚀', '🌟', '💼', '📊', '🎯', '🔥', '✨', '🎉', '🤖', '🌍', '💪', '🎵'];

export default function SceneEditor({ scene, onSave, onClose }) {
  const [edited, setEdited] = useState({ ...scene });

  useEffect(() => {
    setEdited({ ...scene });
  }, [scene]);

  const update = (key, value) => setEdited(prev => ({ ...prev, [key]: value }));

  const addKeyPoint = () => update('keyPoints', [...(edited.keyPoints || []), '']);

  const updateKeyPoint = (i, val) => {
    const kp = [...(edited.keyPoints || [])];
    kp[i] = val;
    update('keyPoints', kp);
  };

  const removeKeyPoint = (i) => {
    update('keyPoints', (edited.keyPoints || []).filter((_, idx) => idx !== i));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Edit Scene {scene.id}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Emoji & Title */}
          <div className="flex gap-3">
            <div>
              <label className="text-sm text-white/50 mb-2 block">Emoji</label>
              <div className="relative">
                <select
                  value={edited.emoji}
                  onChange={e => update('emoji', e.target.value)}
                  className="input-field w-20 text-2xl text-center appearance-none"
                >
                  {EMOJIS.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm text-white/50 mb-2 block">Scene Title</label>
              <input
                type="text"
                value={edited.title || ''}
                onChange={e => update('title', e.target.value)}
                className="input-field"
                placeholder="Scene title"
              />
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className="text-sm text-white/50 mb-2 block">Narration</label>
            <textarea
              value={edited.narration || ''}
              onChange={e => update('narration', e.target.value)}
              className="input-field resize-none h-28"
              placeholder="Enter narration text..."
            />
          </div>

          {/* Visual Description */}
          <div>
            <label className="text-sm text-white/50 mb-2 block">Visual Description</label>
            <input
              type="text"
              value={edited.visualDescription || ''}
              onChange={e => update('visualDescription', e.target.value)}
              className="input-field"
              placeholder="What should be shown visually?"
            />
          </div>

          {/* Key Points */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/50">Key Points</label>
              <button onClick={addKeyPoint} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Point
              </button>
            </div>
            <div className="space-y-2">
              {(edited.keyPoints || []).map((point, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={e => updateKeyPoint(i, e.target.value)}
                    className="input-field flex-1 py-2"
                    placeholder={`Key point ${i + 1}`}
                  />
                  <button onClick={() => removeKeyPoint(i)} className="w-9 h-9 rounded-lg glass glass-hover flex items-center justify-center text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Duration & Transition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/50 mb-2 block">
                Duration: <span className="text-white">{edited.duration}s</span>
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={edited.duration || 15}
                onChange={e => update('duration', Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="text-sm text-white/50 mb-2 block">Transition</label>
              <div className="flex gap-2">
                {TRANSITIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => update('transition', t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      edited.transition === t
                        ? 'bg-brand-500/30 border border-brand-500/60 text-brand-300'
                        : 'glass text-white/50 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-white/10">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => { onSave(edited); onClose(); }}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
