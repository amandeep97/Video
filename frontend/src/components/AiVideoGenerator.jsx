import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { generateVideo, VIDEO_MODELS, getReplicateKey } from '../services/replicate.js';

const STATUS_LABELS = {
  starting: 'Starting GPU…',
  processing: 'Generating video…',
  succeeded: 'Done!',
};

export default function AiVideoGenerator({ scene, sceneIndex, videoFormat, onVideoReady, onClose }) {
  const [prompt,    setPrompt]    = useState(scene?.visualDescription || scene?.title || '');
  const [modelId,   setModelId]   = useState('ltx');
  const [status,    setStatus]    = useState('idle'); // idle | generating | done | error
  const [statusMsg, setStatusMsg] = useState('');
  const [pct,       setPct]       = useState(0);
  const [videoUrl,  setVideoUrl]  = useState('');
  const [errMsg,    setErrMsg]    = useState('');

  const key = getReplicateKey();
  const ar  = videoFormat === 'portrait' ? '9:16' : videoFormat === 'square' ? '1:1' : '16:9';
  const selectedModel = VIDEO_MODELS.find(m => m.id === modelId);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus('generating'); setErrMsg(''); setVideoUrl(''); setPct(0);
    try {
      const url = await generateVideo(prompt.trim(), modelId, ar, key, (s, p) => {
        setStatusMsg(STATUS_LABELS[s] || s);
        setPct(p);
      });
      setVideoUrl(url);
      setStatus('done');
      setPct(100);
    } catch (e) {
      setErrMsg(e.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI Video Generator</h3>
              <p className="text-xs text-white/40">Powered by Wan2.2 · LTX · Mochi via Replicate</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!key && (
          <div className="mb-4 flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-300">
              Replicate API key required.{' '}
              <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5">
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
              {' '}then add it in Settings → Video.
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <label className="text-sm text-white/50 mb-1.5 block font-medium">Video Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe the video you want to generate…"
              className="input-field resize-none text-sm"
              disabled={status === 'generating'}
            />
          </div>

          {/* Model selector */}
          <div>
            <label className="text-sm text-white/50 mb-1.5 block font-medium">Model</label>
            <div className="grid grid-cols-3 gap-2">
              {VIDEO_MODELS.map(m => (
                <button key={m.id} onClick={() => setModelId(m.id)}
                  disabled={status === 'generating'}
                  className={`p-2.5 rounded-xl border transition-all text-left ${
                    modelId === m.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10 hover:border-white/20'
                  }`}>
                  <p className="text-xs font-bold text-white">{m.label}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${m.badgeColor}`}>{m.badge}</span>
                  <p className="text-[10px] text-white/30 mt-1">{m.cost}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info row */}
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>Format: {ar} · Scene {sceneIndex + 1}</span>
            <span>{selectedModel?.cost}/generation</span>
          </div>

          {/* Progress */}
          {status === 'generating' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>{statusMsg || 'Connecting…'}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-white/30 text-center">
                Video generation takes 30–120 seconds depending on the model.
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
                <Sparkles className="w-4 h-4" /> Use as Background for Scene {sceneIndex + 1}
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

          {/* Generate button */}
          {status !== 'done' && (
            <button onClick={handleGenerate}
              disabled={!prompt.trim() || !key || status === 'generating'}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              {status === 'generating'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><Sparkles className="w-4 h-4" /> Generate Video</>
              }
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
