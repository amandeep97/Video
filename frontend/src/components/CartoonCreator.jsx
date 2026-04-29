import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle, AlertCircle, RefreshCw, Image, Video, ChevronRight } from 'lucide-react';
import { generateCartoonVideo, FAL_VIDEO_MODELS, FAL_IMAGE_MODELS, ART_STYLES, getFalKey, getFalBackendUrl } from '../services/fal.js';

const CHARACTER_EXAMPLES = [
  'cute Pixar-style cartoon monkey wearing a chef hat',
  'adorable cartoon dog acting as a waiter, holding a serving tray',
  'funny cartoon vegetable (carrot) with a crying face and tears',
  'chubby cartoon cat sitting at a desk, looking surprised',
  'cartoon baby elephant wearing sunglasses, dancing',
  'friendly cartoon bear cooking in a kitchen',
];

export default function CartoonCreator({ scene, sceneIndex, videoFormat, onVideoReady, onClose }) {
  const [characterDesc, setCharacterDesc] = useState(
    scene?.visualDescription || ''
  );
  const [motionDesc, setMotionDesc] = useState('talking, head moving naturally, gesturing with hands');
  const [artStyle, setArtStyle] = useState('pixar');
  const [videoModel, setVideoModel] = useState('kling-v2');
  const [imageModel, setImageModel] = useState('flux-pro');

  const [step, setStep] = useState('idle'); // idle | generating | image_ready | video_ready | error
  const [pct, setPct] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(''); // 'image' | 'video'
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const falKey = getFalKey();
  const backendUrl = getFalBackendUrl();
  const canRun = !!(falKey || backendUrl);

  const ar = videoFormat === 'portrait' ? '9:16' : videoFormat === 'square' ? '1:1' : '16:9';
  const selectedStyle = ART_STYLES.find(s => s.id === artStyle) || ART_STYLES[0];
  const selectedVidModel = FAL_VIDEO_MODELS.find(m => m.id === videoModel) || FAL_VIDEO_MODELS[0];

  const handleGenerate = async () => {
    if (!characterDesc.trim()) return;
    setStep('generating');
    setErrorMsg('');
    setPreviewImageUrl('');
    setPreviewVideoUrl('');
    setPct(0);
    setCurrentPhase('image');

    try {
      await generateCartoonVideo({
        characterPrompt: characterDesc.trim(),
        motionPrompt: motionDesc.trim() || undefined,
        artStyle,
        aspectRatio: ar,
        videoModelId: videoModel,
        imageModelId: imageModel,
        falKey,
        onStep: (phase, percent, data) => {
          setPct(percent);
          setCurrentPhase(phase);
          if (data?.imageUrl) setPreviewImageUrl(data.imageUrl);
          if (data?.videoUrl) setPreviewVideoUrl(data.videoUrl);
          if (phase === 'done') setStep('done');
        },
      });
    } catch (e) {
      setErrorMsg(e.message);
      setStep('error');
    }
  };

  const handleUseVideo = () => {
    if (previewVideoUrl) {
      onVideoReady(sceneIndex, previewVideoUrl);
      onClose();
    }
  };

  const costEstimate = () => {
    const imgCost = parseFloat((FAL_IMAGE_MODELS.find(m => m.id === imageModel)?.cost || '$0.02').replace(/[^0-9.]/g, ''));
    const vidCost = parseFloat((selectedVidModel.cost || '$0.28').replace(/[^0-9.]/g, ''));
    return (imgCost + vidCost).toFixed(2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 flex items-center justify-center text-xl">
              🎪
            </div>
            <div>
              <h3 className="text-lg font-bold">Character Video Creator</h3>
              <p className="text-xs text-white/40">Pixar cartoon → AI animation (like CapCut/TikTok)</p>
            </div>
          </div>
          <button onClick={onClose} disabled={step === 'generating'}
            className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center disabled:opacity-30">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!canRun && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs text-yellow-300">Add your FAL.ai API key in Settings → Video to create cartoon videos.</p>
          </div>
        )}

        {/* How it works */}
        {step === 'idle' && (
          <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-3 text-xs text-white/50">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-[10px]">1</div>
                <Image className="w-3 h-3" /> Flux generates character image
              </div>
              <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-300 font-bold text-[10px]">2</div>
                <Video className="w-3 h-3" /> Kling animates it talking
              </div>
              <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-400" /> Done!
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">

          {/* Art Style */}
          {step === 'idle' && (
            <div>
              <label className="text-sm text-white/50 mb-2 block font-medium">Art Style</label>
              <div className="grid grid-cols-3 gap-2">
                {ART_STYLES.map(s => (
                  <button key={s.id} onClick={() => setArtStyle(s.id)}
                    className={`p-2.5 rounded-xl border transition-all text-left ${
                      artStyle === s.id ? 'bg-yellow-500/15 border-yellow-500/40' : 'glass border-white/10 hover:border-white/20'
                    }`}>
                    <div className="text-lg mb-0.5">{s.emoji}</div>
                    <p className="text-xs font-medium text-white">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Character description */}
          {step === 'idle' && (
            <div>
              <label className="text-sm text-white/50 mb-1.5 block font-medium">Character Description</label>
              <textarea
                value={characterDesc}
                onChange={e => setCharacterDesc(e.target.value)}
                rows={3}
                placeholder="e.g. cute Pixar cartoon monkey wearing a chef hat, big expressive eyes, smiling…"
                className="input-field resize-none text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CHARACTER_EXAMPLES.slice(0, 3).map((ex, i) => (
                  <button key={i} onClick={() => setCharacterDesc(ex)}
                    className="text-[10px] px-2 py-1 glass rounded-lg text-white/40 hover:text-white/70 transition-colors text-left">
                    {ex.slice(0, 40)}…
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Motion description */}
          {step === 'idle' && (
            <div>
              <label className="text-sm text-white/50 mb-1.5 block font-medium">Motion / Action</label>
              <input
                value={motionDesc}
                onChange={e => setMotionDesc(e.target.value)}
                placeholder="e.g. talking to camera, nodding, happy expression…"
                className="input-field text-sm"
              />
            </div>
          )}

          {/* Model pickers */}
          {step === 'idle' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Image Model</label>
                {FAL_IMAGE_MODELS.map(m => (
                  <button key={m.id} onClick={() => setImageModel(m.id)}
                    className={`w-full p-2 rounded-xl border text-left mb-1 transition-all ${
                      imageModel === m.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10 hover:border-white/20'
                    }`}>
                    <p className="text-xs font-bold text-white">{m.label}</p>
                    <p className="text-[10px] text-white/30">{m.cost}</p>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Video Model</label>
                {FAL_VIDEO_MODELS.filter(m => m.imageToVideoId).map(m => (
                  <button key={m.id} onClick={() => setVideoModel(m.id)}
                    className={`w-full p-2 rounded-xl border text-left mb-1 transition-all ${
                      videoModel === m.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10 hover:border-white/20'
                    }`}>
                    <p className="text-xs font-bold text-white">{m.label}</p>
                    <span className={`text-[9px] px-1 py-0.5 rounded-full border ${m.badgeColor}`}>{m.badge.replace('🔥 ','')}</span>
                    <p className="text-[10px] text-white/30">{m.cost}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'idle' && (
            <p className="text-[10px] text-white/30 text-center">
              Estimated cost: ~${costEstimate()} per video · 60–120 seconds generation time
            </p>
          )}

          {/* Generation progress */}
          {step === 'generating' && (
            <div className="space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 flex-1 p-2.5 rounded-xl border ${
                  currentPhase === 'image' ? 'bg-purple-500/10 border-purple-500/30' :
                  currentPhase === 'video' || currentPhase === 'done' ? 'bg-green-500/10 border-green-500/20' :
                  'bg-white/5 border-white/10'
                }`}>
                  {currentPhase === 'image' ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" /> :
                   <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-medium">Step 1: Character Image</p>
                    <p className="text-[10px] text-white/40">Flux {imageModel === 'flux-pro' ? 'Pro' : 'Dev'} generating…</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                <div className={`flex items-center gap-2 flex-1 p-2.5 rounded-xl border ${
                  currentPhase === 'video' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  currentPhase === 'done' ? 'bg-green-500/10 border-green-500/20' :
                  'bg-white/5 border-white/10'
                }`}>
                  {currentPhase === 'video' ? <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" /> :
                   currentPhase === 'done' ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" /> :
                   <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-medium">Step 2: Animation</p>
                    <p className="text-[10px] text-white/40">Kling animating…</p>
                  </div>
                </div>
              </div>

              {/* Image preview (shown when ready) */}
              {previewImageUrl && (
                <div>
                  <p className="text-xs text-white/40 mb-1.5">Character image generated:</p>
                  <img src={previewImageUrl} alt="Generated character"
                    className="w-full rounded-xl bg-black object-contain max-h-48" />
                </div>
              )}

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{currentPhase === 'image' ? 'Generating character image…' : currentPhase === 'video' ? 'Animating with Kling…' : 'Done!'}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-white/30 text-center mt-1">
                  {currentPhase === 'image' ? 'Flux image: ~15-30 seconds' : 'Kling animation: ~60-90 seconds'}
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {step === 'done' && previewVideoUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" /> Character video ready!
              </div>
              <video src={previewVideoUrl} controls loop autoPlay muted
                className="w-full rounded-xl bg-black max-h-64 object-contain" />
              {previewImageUrl && (
                <div className="flex items-center gap-2">
                  <img src={previewImageUrl} alt="Character" className="w-12 h-12 rounded-lg object-cover" />
                  <p className="text-xs text-white/40">Character image used as base</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setStep('idle'); setPreviewVideoUrl(''); setPreviewImageUrl(''); }}
                  className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
                <button onClick={handleUseVideo}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> Use for Scene {sceneIndex + 1}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-red-300 font-medium">Generation failed</p>
                  <p className="text-[10px] text-red-400/70 mt-0.5">{errorMsg}</p>
                </div>
              </div>
              <button onClick={() => setStep('idle')}
                className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}

          {/* Action button */}
          {step === 'idle' && (
            <button onClick={handleGenerate}
              disabled={!canRun || !characterDesc.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
              <Sparkles className="w-4 h-4" />
              Create Character Video (~${costEstimate()})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
