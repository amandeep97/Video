import { useState } from 'react';
import { X, Download, Video, Loader2, CheckCircle, AlertCircle, Mic, MicOff, Film, Sparkles } from 'lucide-react';
import { getAudioBlob, getElevenLabsSettings, getVoiceSettings } from '../services/tts.js';
import { renderFrame } from '../services/videoRenderer.js';
import { preloadSceneVideos, getPexelsKey } from '../services/pexels.js';
import { preloadSceneImages } from '../services/pollinations.js';
import { startMusic } from '../services/musicGenerator.js';
import { FORMATS } from './VideoPreview.jsx';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateVideoBlob(script, onProgress, withAudio, videoEls, imageEls, opts = {}) {
  const fmt = FORMATS[opts.format || 'landscape'];
  const W = fmt.w, H = fmt.h, FPS = 30;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const videoStream = canvas.captureStream(FPS);
  let combinedStream = videoStream;
  let audioCtx = null, audioDest = null;

  const { apiKey: elKey, voiceId } = getElevenLabsSettings(); // eslint-disable-line no-unused-vars
  if (withAudio || opts.musicStyle !== 'none') {
    audioCtx  = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    audioDest = audioCtx.createMediaStreamDestination();
    combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      audioDest.stream.getAudioTracks()[0],
    ]);
  }
  // Start background music
  if (opts.musicStyle && opts.musicStyle !== 'none' && audioCtx && audioDest) {
    if (opts.musicStyle === 'custom' && opts.customMusicUrl) {
      // Decode uploaded song and loop it
      try {
        const res  = await fetch(opts.customMusicUrl);
        const buf  = await res.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buf);
        const src  = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        src.buffer = decoded;
        src.loop   = true;
        gain.gain.value = opts.musicVolume || 0.25;
        src.connect(gain);
        gain.connect(audioDest);
        src.start(0);
      } catch (e) { console.warn('Custom music failed', e.message); }
    } else {
      startMusic(audioCtx, opts.musicStyle === 'calm' ? script?.style || 'professional' : opts.musicStyle, audioDest, 0.10);
    }
  }

  // Try MP4 first — works on iOS Safari and is universally playable
  const mimeType = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp9',
    'video/webm',
  ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
  recorder.start(200);

  const scenes = script.scenes || [];
  for (let si = 0; si < scenes.length; si++) {
    const scene      = scenes[si];
    const durationMs = (scene.duration || 15) * 1000;
    const frames     = Math.round((durationMs / 1000) * FPS);
    const startTime  = performance.now();
    onProgress({ scene: si + 1, total: scenes.length, phase: 'rendering', pct: (si / scenes.length) * 100 });

    // Audio — uses HuggingFace / ElevenLabs / browser based on voice settings
    if (withAudio && audioDest && audioCtx) {
      try {
        const blob     = await getAudioBlob(scene.narration, opts.voiceLang || 'en-US');
        if (!blob) throw new Error('no blob');
        const arrayBuf = await blob.arrayBuffer();
        const decoded  = await audioCtx.decodeAudioData(arrayBuf);
        const src      = audioCtx.createBufferSource();
        src.buffer = decoded;
        src.connect(audioDest);
        src.connect(audioCtx.destination);
        src.start(audioCtx.currentTime);
      } catch (e) {
        console.warn('Audio failed for scene', si + 1, e.message);
      }
    }

    // Start background video / image
    const bgVideo = videoEls[si] || null;
    const bgImage = imageEls[si] || null;
    if (bgVideo) { bgVideo.currentTime = 0; bgVideo.play().catch(() => {}); }

    // Render frames
    const tsBase = performance.now();
    for (let f = 0; f < frames; f++) {
      const progress = f / frames;
      renderFrame(ctx, scene, script, si, scenes.length, progress, tsBase + (f / FPS) * 1000, bgVideo, bgImage, { captions: opts.captions, export: true, animStyle: opts.animStyle || 'slide' });
      const elapsed  = performance.now() - startTime;
      const expected = (f / FPS) * 1000;
      if (expected > elapsed) await sleep(expected - elapsed);
    }

    bgVideo?.pause();
    const elapsed = performance.now() - startTime;
    if (elapsed < durationMs) await sleep(durationMs - elapsed);
  }

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  await sleep(500);
  recorder.stop();
  if (audioCtx) await audioCtx.close();

  return new Promise(resolve => {
    recorder.onstop = () => resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType });
  });
}

export default function VideoExporter({ script, onClose, videoFormat = 'landscape', showCaptions = false, musicStyle = 'none', customMusicUrl = null, voiceLang = 'en-US', animStyle = 'slide' }) {
  const [status,    setStatus]   = useState('idle');
  const [progress,  setProgress] = useState({ scene: 0, total: 0, pct: 0 });
  const [videoUrl,  setVideoUrl] = useState('');
  const [videoMime, setVideoMime]= useState('');
  const [withAudio, setWithAudio]= useState(true);
  const [errMsg,    setErrMsg]   = useState('');
  const { apiKey: elKey } = getElevenLabsSettings();
  const pexelsKey = getPexelsKey();
  const { provider: voiceProvider } = getVoiceSettings();

  const handleGenerate = async () => {
    setStatus('generating'); setErrMsg('');
    try {
      let videoEls = {}, imageEls = {};
      if (pexelsKey) {
        setProgress({ scene: 0, total: script.scenes.length, pct: 0, phase: 'videos' });
        videoEls = await preloadSceneVideos(script.scenes, pexelsKey);
      } else {
        setProgress({ scene: 0, total: script.scenes.length, pct: 0, phase: 'ai-images' });
        imageEls = await preloadSceneImages(script.scenes, script.style, (done, total) => {
          setProgress(p => ({ ...p, scene: done, total, pct: (done / total) * 40 }));
        });
      }
      const { blob, mimeType } = await generateVideoBlob(script, setProgress, withAudio, videoEls, imageEls, { format: videoFormat, captions: showCaptions, musicStyle, customMusicUrl, voiceLang, animStyle });
      setVideoUrl(URL.createObjectURL(blob));
      setVideoMime(mimeType);
      setStatus('done');
    } catch (e) {
      setErrMsg(e.message); setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const ext  = videoMime.includes('mp4') ? 'mp4' : 'webm';
    const name = (script.title || 'video').replace(/\s+/g, '-').toLowerCase();
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${name}.${ext}`;
    a.click();
  };

  const estimatedTime = Math.round((script?.scenes || []).reduce((s, sc) => s + (sc.duration || 15), 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Export Video</h3>
              <p className="text-xs text-white/40">{pexelsKey ? 'Stock video backgrounds + text' : 'MP4 on iPhone · WebM on Android/Desktop'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'idle' && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Scenes</span>
                <span className="text-white">{script?.scenes?.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Duration</span>
                <span className="text-white">{estimatedTime}s (~{Math.ceil(estimatedTime / 60)} min to export)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Background</span>
                <span className={pexelsKey ? 'text-blue-400' : 'text-purple-400'}>
                  {pexelsKey ? '🎬 Stock video (Pexels)' : '✨ AI-generated images (free)'}
                </span>
              </div>
            </div>

            {/* Pexels notice */}
            {!pexelsKey && (
              <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Film className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">Add a free Pexels API key in Settings → Stock Video to use real video backgrounds</p>
              </div>
            )}

            {/* Audio toggle */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              withAudio ? 'bg-green-500/10 border-green-500/30' : 'glass border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                {withAudio ? <Mic className="w-5 h-5 text-green-400" /> : <MicOff className="w-5 h-5 text-white/40" />}
                <div>
                  <p className="text-sm font-medium">AI Voice Narration</p>
                  <p className="text-xs text-white/40">
                    {voiceProvider === 'hf' ? '🤗 HuggingFace AI (free, unlimited)' : voiceProvider === 'elevenlabs' ? '🎙️ ElevenLabs' : '📱 Device voice'}
                  </p>
                </div>
              </div>
              <button onClick={() => setWithAudio(a => !a)}
                className={`w-12 h-6 rounded-full transition-all ${withAudio ? 'bg-green-500' : 'bg-white/20'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${withAudio ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <p className="text-xs text-white/30 text-center">Export runs in real-time — keep this tab open.</p>
            <button onClick={handleGenerate} className="btn-primary w-full py-4 flex items-center justify-center gap-3">
              <Video className="w-5 h-5" /> Generate Video ({estimatedTime}s)
            </button>
          </div>
        )}

        {status === 'generating' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              {progress.phase === 'ai-images'
                ? <Sparkles className="w-12 h-12 text-purple-400 animate-pulse mx-auto mb-4" />
                : <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
              }
              <p className="text-lg font-semibold">
                {progress.phase === 'ai-images'
                  ? `Generating AI visuals… ${progress.scene}/${progress.total}`
                  : `Rendering Scene ${progress.scene} / ${progress.total}`}
              </p>
              <p className="text-sm text-white/40 mt-1">
                {progress.phase === 'ai-images' ? 'Creating unique images for each scene (free)' : 'Compositing video + text layers…'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/40">
                <span>Progress</span><span>{Math.round(progress.pct)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
            <p className="text-xs text-white/30 text-center">Keep this tab open while exporting</p>
          </div>
        )}

        {status === 'done' && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-400">Video Ready!</p>
            </div>
            <video src={videoUrl} controls className="w-full rounded-xl bg-black" />
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Close</button>
              <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download .{videoMime.includes('mp4') ? 'mp4' : 'webm'}
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Export Failed</p>
                <p className="text-xs text-red-400/70 mt-1">{errMsg}</p>
              </div>
            </div>
            <button onClick={() => setStatus('idle')} className="btn-primary w-full">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
