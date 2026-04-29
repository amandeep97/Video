import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { generateFalVideo, FAL_VIDEO_MODELS, getFalKey, getFalBackendUrl } from '../services/fal.js';
import { generateVideo, VIDEO_MODELS, getReplicateKey, getBackendUrl } from '../services/replicate.js';

const STATUS_LABELS = {
  starting:   'Starting GPU…',
  processing: 'Generating video…',
  succeeded:  'Done!',
};

const REPLICATE_TIERS = [
  { id: 'premium', label: '🔥 Premium — CapCut-level quality' },
  { id: 'good',    label: '✨ Good quality' },
  { id: 'basic',   label: '⚡ Basic — cheap & fast' },
];

export default function AiVideoGenerator({ scene, sceneIndex, videoFormat, onVideoReady, onClose }) {
  const [prompt,    setPrompt]    = useState(scene?.visualDescription || scene?.title || '');
  const [modelId,   setModelId]   = useState('seedance');
  const [provider,  setProvider]  = useState('replicate'); // 'replicate' | 'fal'
  const [status,    setStatus]    = useState('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [pct,       setPct]       = useState(0);
  const [videoUrl,  setVideoUrl]  = useState('');
  const [errMsg,    setErrMsg]    = useState('');

  const falKey       = getFalKey();
  const falBackend   = getFalBackendUrl();
  const replicateKey = getReplicateKey();
  const replicateBE  = getBackendUrl();

  const hasFal       = !!(falKey || falBackend);
  const hasReplicate = !!(replicateKey || replicateBE);

  const activeModel = provider === 'fal'
    ? FAL_VIDEO_MODELS.find(m => m.id === modelId)
    : VIDEO_MODELS.find(m => m.id === modelId);

  const canRun = provider === 'fal' ? hasFal : hasReplicate;
  const ar = videoFormat === 'portrait' ? '9:16' : videoFormat === 'square' ? '1:1' : '16:9';

  const selectModel = (id, prov) => { setModelId(id); setProvider(prov); };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus('generating'); setErrMsg(''); setVideoUrl(''); setPct(0);
    try {
      let url;
      if (provider === 'fal') {
        url = await generateFalVideo(prompt.trim(), modelId, ar, falKey, (s, p) => {
          setStatusMsg(STATUS_LABELS[s] || s); setPct(p);
        });
      } else {
        url = await generateVideo(prompt.trim(), modelId, ar, replicateKey, (s, p) => {
          setStatusMsg(STATUS_LABELS[s] || s); setPct(p);
        });
      }
      setVideoUrl(url); setStatus('done'); setPct(100);
    } catch (e) {
      setErrMsg(e.message); setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI Video Generator</h3>
              <p className="text-xs text-white/40">Scene {sceneIndex + 1} · {ar}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!hasFal && !hasReplicate && (
          <div className="mb-4 flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Add a Replicate key in Settings → Video to use Seedance (CapCut model) and other models.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <label className="text-sm text-white/50 mb-1.5 block font-medium">Video Prompt</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              placeholder="Describe the video scene…"
              className="input-field resize-none text-sm" disabled={status === 'generating'} />
          </div>

          {/* Replicate models — tiered */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/50 font-medium">Model</label>
              {hasReplicate && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              {!hasReplicate && (
                <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-400 underline flex items-center gap-1">
                  Get Replicate key <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {REPLICATE_TIERS.map(tier => {
              const tierModels = VIDEO_MODELS.filter(m => m.tier === tier.id);
              return (
                <div key={tier.id} className="mb-3">
                  <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1.5">{tier.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {tierModels.map(m => (
                      <button key={m.id}
                        onClick={() => selectModel(m.id, 'replicate')}
                        disabled={status === 'generating' || !hasReplicate}
                        className={`p-2.5 rounded-xl border transition-all text-left disabled:opacity-40 ${
                          provider === 'replicate' && modelId === m.id
                            ? tier.id === 'premium' ? 'bg-yellow-500/15 border-yellow-500/40'
                            : tier.id === 'good'    ? 'bg-purple-500/15 border-purple-500/40'
                            :                         'bg-brand-500/15 border-brand-500/40'
                            : 'glass border-white/10 hover:border-white/20'
                        }`}>
                        <p className="text-xs font-bold text-white leading-tight">{m.label}</p>
                        <span className={`text-[9px] px-1 py-0.5 rounded-full border ${m.badgeColor}`}>{m.badge}</span>
                        <p className="text-[10px] text-white/30 mt-0.5">{m.cost}</p>
                        {m.desc && <p className="text-[9px] text-white/20 mt-0.5 leading-tight line-clamp-2">{m.desc}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* fal.ai section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">fal.ai — Kling / Hailuo</p>
                {hasFal && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                {!hasFal && (
                  <a href="https://fal.ai" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-brand-400 underline flex items-center gap-0.5">
                    Get key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FAL_VIDEO_MODELS.map(m => (
                  <button key={m.id}
                    onClick={() => selectModel(m.id, 'fal')}
                    disabled={status === 'generating' || !hasFal}
                    className={`p-2.5 rounded-xl border transition-all text-left disabled:opacity-40 ${
                      provider === 'fal' && modelId === m.id
                        ? 'bg-cyan-500/15 border-cyan-500/40'
                        : 'glass border-white/10 hover:border-white/20'
                    }`}>
                    <p className="text-xs font-bold text-white leading-tight">{m.label}</p>
                    <span className={`text-[9px] px-1 py-0.5 rounded-full border ${m.badgeColor}`}>{m.badge}</span>
                    <p className="text-[10px] text-white/30 mt-0.5">{m.cost}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected model info */}
          <div className="flex items-center justify-between text-xs text-white/30 px-1">
            <span>Format: {ar}</span>
            <span>{activeModel?.cost || '?'}/clip</span>
          </div>

          {/* Progress */}
          {status === 'generating' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>{statusMsg || 'Starting…'}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-white/30 text-center">
                {modelId === 'seedance' ? 'Seedance: ~60-120 sec' :
                 modelId === 'hunyuan'  ? 'HunyuanVideo: ~90-180 sec' :
                 provider === 'fal'     ? 'Kling: ~60-90 sec' : '~30-90 sec'}
              </p>
            </div>
          )}

          {/* Result */}
          {status === 'done' && videoUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" /> Video ready!
              </div>
              <video src={videoUrl} controls loop className="w-full rounded-xl bg-black max-h-48 object-contain" />
              <button onClick={() => { onVideoReady(sceneIndex, videoUrl); onClose(); }}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> Use for Scene {sceneIndex + 1}
              </button>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-300 font-medium">Generation failed</p>
                <p className="text-[10px] text-red-400/70 mt-0.5">{errMsg}</p>
              </div>
            </div>
          )}

          {/* Generate / Retry buttons */}
          {status !== 'done' && (
            <button onClick={handleGenerate}
              disabled={!prompt.trim() || !canRun || status === 'generating'}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              {status === 'generating'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><Sparkles className="w-4 h-4" /> Generate Video</>}
            </button>
          )}
          {status === 'done' && (
            <button onClick={() => setStatus('idle')} className="btn-secondary w-full text-sm">
              Generate Another
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
