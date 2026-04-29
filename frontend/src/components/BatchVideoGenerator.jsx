import { useState, useRef } from 'react';
import { X, Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { generateFalVideo, FAL_VIDEO_MODELS, getFalKey, getFalBackendUrl } from '../services/fal.js';
import { generateVideo, VIDEO_MODELS, getReplicateKey, getBackendUrl } from '../services/replicate.js';

// Unified model list for batch: fal.ai first
const BATCH_MODELS = [
  ...FAL_VIDEO_MODELS.map(m => ({ ...m, provider: 'fal' })),
  ...VIDEO_MODELS.map(m => ({ ...m, provider: 'replicate' })),
];

export default function BatchVideoGenerator({ script, videoFormat, onVideoReady, onClose }) {
  const [modelId,  setModelId]  = useState('kling-v2');
  const [status,   setStatus]   = useState('idle');
  const [results,  setResults]  = useState([]);
  const [current,  setCurrent]  = useState(-1);
  const abortRef = useRef(false);

  const falKey       = getFalKey();
  const falBackend   = getFalBackendUrl();
  const replicateKey = getReplicateKey();
  const replicateBE  = getBackendUrl();

  const hasFal       = !!(falKey || falBackend);
  const hasReplicate = !!(replicateKey || replicateBE);

  const selectedModel = BATCH_MODELS.find(m => m.id === modelId) || BATCH_MODELS[0];
  const canRun = selectedModel.provider === 'fal' ? hasFal : hasReplicate;

  const ar     = videoFormat === 'portrait' ? '9:16' : videoFormat === 'square' ? '1:1' : '16:9';
  const scenes = script?.scenes || [];

  const handleStart = async () => {
    abortRef.current = false;
    setStatus('running');
    const init = scenes.map(() => ({ status: 'pending', url: null, error: null }));
    setResults(init);

    for (let i = 0; i < scenes.length; i++) {
      if (abortRef.current) break;
      setCurrent(i);
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'generating' } : r));

      const prompt = scenes[i].visualDescription || scenes[i].title || `Scene ${i + 1}`;
      try {
        let url;
        if (selectedModel.provider === 'fal') {
          url = await generateFalVideo(prompt, modelId, ar, falKey, () => {});
        } else {
          url = await generateVideo(prompt, modelId, ar, replicateKey, () => {});
        }
        setResults(prev => prev.map((r, idx) => idx === i ? { status: 'done', url, error: null } : r));
        onVideoReady(i, url);
      } catch (e) {
        setResults(prev => prev.map((r, idx) => idx === i ? { status: 'error', url: null, error: e.message } : r));
      }

      if (i < scenes.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setCurrent(-1);
    setStatus('done');
  };

  const handleStop = () => { abortRef.current = true; };

  const doneCount  = results.filter(r => r.status === 'done').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  const totalCost = () => {
    const cost = parseFloat((selectedModel.cost || '$0.05').replace(/[^0-9.]/g, ''));
    return (scenes.length * cost).toFixed(2);
  };

  const falModels = BATCH_MODELS.filter(m => m.provider === 'fal');
  const repModels = BATCH_MODELS.filter(m => m.provider === 'replicate');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Generate All Scenes</h3>
              <p className="text-xs text-white/40">{scenes.length} scenes · AI video for each</p>
            </div>
          </div>
          <button onClick={onClose} disabled={status === 'running'}
            className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center disabled:opacity-30">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!canRun && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-300">
              {selectedModel.provider === 'fal'
                ? 'Add your FAL.ai API key in Settings → Video for high-quality Kling videos.'
                : 'Add your Replicate API key or Backend URL in Settings → Video.'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Model picker */}
          {status === 'idle' && (
            <div>
              <label className="text-sm text-white/50 mb-1.5 block font-medium">Model for all scenes</label>

              <div className="mb-2">
                <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mb-1.5">fal.ai — High Quality</p>
                <div className="grid grid-cols-2 gap-2">
                  {falModels.map(m => (
                    <button key={m.id} onClick={() => setModelId(m.id)}
                      disabled={!hasFal}
                      className={`p-2.5 rounded-xl border transition-all text-left disabled:opacity-40 ${
                        modelId === m.id ? 'bg-yellow-500/15 border-yellow-500/40' : 'glass border-white/10 hover:border-white/20'
                      }`}>
                      <p className="text-xs font-bold text-white">{m.label}</p>
                      <span className={`text-[9px] px-1 py-0.5 rounded-full border ${m.badgeColor}`}>{m.badge}</span>
                      <p className="text-[10px] text-white/30 mt-0.5">{m.cost}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Replicate — Basic</p>
                <div className="grid grid-cols-3 gap-2">
                  {repModels.map(m => (
                    <button key={m.id} onClick={() => setModelId(m.id)}
                      disabled={!hasReplicate}
                      className={`p-2.5 rounded-xl border transition-all text-left disabled:opacity-40 ${
                        modelId === m.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10 hover:border-white/20'
                      }`}>
                      <p className="text-xs font-bold text-white">{m.label}</p>
                      <span className={`text-[9px] px-1 py-0.5 rounded-full border ${m.badgeColor}`}>{m.badge}</span>
                      <p className="text-[10px] text-white/30 mt-0.5">{m.cost}</p>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-white/30 mt-2 text-center">
                Estimated total cost: {scenes.length} × {selectedModel.cost} = ~${totalCost()}
              </p>
            </div>
          )}

          {/* Scene progress list */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {scenes.map((scene, i) => {
                const r = results[i] || {};
                return (
                  <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    r.status === 'done'       ? 'bg-green-500/10 border-green-500/20' :
                    r.status === 'error'      ? 'bg-red-500/10 border-red-500/20' :
                    r.status === 'generating' ? 'bg-purple-500/10 border-purple-500/30' :
                    'bg-white/3 border-white/8'
                  }`}>
                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                      {r.status === 'done'       && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {r.status === 'error'      && <XCircle className="w-4 h-4 text-red-400" />}
                      {r.status === 'generating' && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                      {r.status === 'pending'    && <span className="text-xs text-white/20">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">Scene {i + 1}: {scene.title}</p>
                      {r.error && <p className="text-[10px] text-red-400/70 truncate">{r.error}</p>}
                      {r.status === 'generating' && <p className="text-[10px] text-purple-400/70">Generating…</p>}
                      {r.status === 'done'       && <p className="text-[10px] text-green-400/70">Ready</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress bar */}
          {status === 'running' && (
            <div>
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>{doneCount + errorCount} / {scenes.length} scenes</span>
                <span>{current >= 0 ? `Generating scene ${current + 1}…` : 'Starting…'}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${((doneCount + errorCount) / scenes.length) * 100}%` }} />
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              errorCount === 0 ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
            }`}>
              <CheckCircle className="w-4 h-4" />
              {errorCount === 0
                ? `All ${doneCount} scenes generated!`
                : `${doneCount} done, ${errorCount} failed — check errors above`}
            </div>
          )}

          {/* Action buttons */}
          {status === 'idle' && (
            <button onClick={handleStart} disabled={!canRun || scenes.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              <Sparkles className="w-4 h-4" /> Generate All {scenes.length} Scenes (~${totalCost()})
            </button>
          )}
          {status === 'running' && (
            <button onClick={handleStop}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all">
              <X className="w-4 h-4" /> Stop Generation
            </button>
          )}
          {status === 'done' && (
            <button onClick={onClose} className="btn-primary w-full">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
