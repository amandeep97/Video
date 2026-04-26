import { useState, useRef } from 'react';
import { X, User, Loader2, CheckCircle, AlertCircle, Upload, ExternalLink } from 'lucide-react';
import { generateAvatar, getReplicateKey, blobToDataUrl } from '../services/replicate.js';
import { getAudioBlob } from '../services/tts.js';
import { VOICE_LANGUAGES } from '../services/tts.js';

const STATUS_LABELS = {
  starting:   'Starting GPU…',
  tts:        'Generating voice audio…',
  processing: 'Animating face…',
};

export default function AiAvatarGenerator({ scene, sceneIndex, voiceLang, onVideoReady, onClose }) {
  const [photoUrl,   setPhotoUrl]   = useState(null); // data URL
  const [photoName,  setPhotoName]  = useState('');
  const [script,     setScript]     = useState(scene?.narration || '');
  const [lang,       setLang]       = useState(voiceLang || 'en-US');
  const [status,     setStatus]     = useState('idle');
  const [statusMsg,  setStatusMsg]  = useState('');
  const [pct,        setPct]        = useState(0);
  const [videoUrl,   setVideoUrl]   = useState('');
  const [errMsg,     setErrMsg]     = useState('');
  const fileRef = useRef();

  const key = getReplicateKey();

  const handlePhoto = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { setPhotoUrl(reader.result); setPhotoName(file.name); };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!photoUrl || !script.trim()) return;
    setStatus('generating'); setErrMsg(''); setVideoUrl(''); setPct(0);
    try {
      // Step 1: generate TTS audio
      setStatusMsg(STATUS_LABELS.tts); setPct(10);
      const audioBlob = await getAudioBlob(script.trim(), lang);
      if (!audioBlob) throw new Error('Could not generate voice audio. Check your voice settings.');
      const audioDataUrl = await blobToDataUrl(audioBlob);

      // Step 2: send photo + audio to SadTalker
      setStatusMsg(STATUS_LABELS.starting); setPct(20);
      const url = await generateAvatar(photoUrl, audioDataUrl, key, (s, p) => {
        setStatusMsg(STATUS_LABELS[s] || s);
        setPct(20 + Math.round(p * 0.78));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg my-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">AI Avatar</h3>
              <p className="text-xs text-white/40">Photo → Talking Video · SadTalker via Replicate</p>
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
          {/* Photo upload */}
          <div>
            <label className="text-sm text-white/50 mb-1.5 block font-medium">Portrait Photo</label>
            <div
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                photoUrl ? 'border-green-500/40 bg-green-500/5' : 'border-white/15 hover:border-white/30'
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handlePhoto(e.dataTransfer.files[0]); }}>
              {photoUrl ? (
                <div className="flex items-center gap-3 w-full">
                  <img src={photoUrl} alt="portrait" className="w-14 h-14 rounded-xl object-cover border border-white/20" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-400">Photo ready</p>
                    <p className="text-[10px] text-white/40 truncate">{photoName}</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setPhotoUrl(null); }}
                    className="text-white/30 hover:text-red-400 text-sm px-1">✕</button>
                </div>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-white/20" />
                  <p className="text-xs text-white/40 text-center">
                    Drop a portrait photo here<br />
                    <span className="text-white/25 text-[10px]">JPG, PNG · face clearly visible · front-facing works best</span>
                  </p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => handlePhoto(e.target.files[0])} />
            </div>
          </div>

          {/* Script */}
          <div>
            <label className="text-sm text-white/50 mb-1.5 block font-medium">Script (what the avatar will say)</label>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              rows={3}
              placeholder="Type what the avatar should speak…"
              className="input-field resize-none text-sm"
              disabled={status === 'generating'}
            />
            <p className="text-[10px] text-white/25 mt-1">{script.length} chars · ~{Math.round(script.split(/\s+/).length / 2.5)}s audio</p>
          </div>

          {/* Language */}
          <div>
            <label className="text-sm text-white/50 mb-1.5 block font-medium">Voice Language</label>
            <div className="grid grid-cols-3 gap-1.5">
              {VOICE_LANGUAGES.slice(0, 9).map(l => (
                <button key={l.id} onClick={() => setLang(l.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    lang === l.id ? 'bg-brand-500/25 border border-brand-500/50 text-white' : 'glass text-white/50 border border-transparent hover:text-white'
                  }`}>
                  <span>{l.flag}</span>
                  <span className="truncate">{l.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {status === 'generating' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                <span>{statusMsg || 'Starting…'}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-white/30 text-center">Avatar generation takes 1–3 minutes.</p>
            </div>
          )}

          {/* Result */}
          {status === 'done' && videoUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" /> Avatar video ready!
              </div>
              <video src={videoUrl} controls loop className="w-full rounded-xl bg-black max-h-48 object-contain" />
              <button onClick={() => { onVideoReady(sceneIndex, videoUrl); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-pink-500/30 text-pink-300 text-sm font-medium hover:from-pink-500/30 hover:to-orange-500/30 transition-all">
                <User className="w-4 h-4" /> Use Avatar for Scene {sceneIndex + 1}
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

          {/* Action button */}
          {status !== 'done' && (
            <button onClick={handleGenerate}
              disabled={!photoUrl || !script.trim() || !key || status === 'generating'}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-orange-500 text-white text-sm font-semibold hover:from-pink-500 hover:to-orange-400 transition-all disabled:opacity-40">
              {status === 'generating'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><User className="w-4 h-4" /> Generate Talking Avatar</>
              }
            </button>
          )}
          {status === 'done' && (
            <button onClick={() => { setStatus('idle'); setVideoUrl(''); }} className="btn-secondary w-full text-sm">
              Generate Another
            </button>
          )}

          <p className="text-[10px] text-white/20 text-center leading-relaxed">
            Uses SadTalker on Replicate (~$0.10–0.30/video). For HeyGem quality,
            self-host the model on RunPod with a GPU.
          </p>
        </div>
      </div>
    </div>
  );
}
