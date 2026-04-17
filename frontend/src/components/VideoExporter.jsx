import { useState } from 'react';
import { X, Download, Video, Loader2, CheckCircle, AlertCircle, Mic, MicOff } from 'lucide-react';
import { fetchElevenLabsAudio, getElevenLabsSettings } from '../services/tts.js';
import { renderFrame } from '../services/videoRenderer.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateVideoBlob(script, onProgress, withAudio) {
  const W = 720, H = 405;
  const FPS = 30;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const videoStream = canvas.captureStream(FPS);
  let combinedStream = videoStream;
  let audioCtx = null, audioDest = null;

  const { apiKey: elKey, voiceId } = getElevenLabsSettings();

  if (withAudio && elKey) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    audioDest = audioCtx.createMediaStreamDestination();
    combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      audioDest.stream.getAudioTracks()[0],
    ]);
  }

  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm', 'video/mp4']
    .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 3_000_000 });
  const chunks = [];
  recorder.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
  recorder.start(200);

  const scenes = script.scenes || [];
  const totalScenes = scenes.length;

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const durationMs = (scene.duration || 15) * 1000;
    const frames = Math.round((durationMs / 1000) * FPS);
    const startTime = performance.now();

    onProgress({ scene: si + 1, total: totalScenes, phase: 'rendering', pct: (si / totalScenes) * 100 });

    // Pre-fetch audio
    let audioBlob = null;
    if (withAudio && elKey && audioDest && audioCtx) {
      try {
        audioBlob = await fetchElevenLabsAudio(scene.narration, elKey, voiceId);
      } catch (e) {
        console.warn('ElevenLabs audio failed for scene', si + 1, e.message);
      }
    }

    if (audioBlob && audioCtx && audioDest) {
      const arrayBuf = await audioBlob.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      const src = audioCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(audioDest);
      src.connect(audioCtx.destination);
      src.start(audioCtx.currentTime);
    }

    // Render frames
    const sceneStartTs = performance.now();
    for (let f = 0; f < frames; f++) {
      const progress = f / frames;
      const fakeTimestamp = sceneStartTs + (f / FPS) * 1000;
      renderFrame(ctx, scene, script, si, totalScenes, progress, fakeTimestamp);
      const elapsed = performance.now() - startTime;
      const expected = (f / FPS) * 1000;
      if (expected > elapsed) await sleep(expected - elapsed);
    }

    const elapsed = performance.now() - startTime;
    if (elapsed < durationMs) await sleep(durationMs - elapsed);
  }

  // Outro black frame
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  await sleep(500);

  recorder.stop();
  if (audioCtx) await audioCtx.close();

  return new Promise(resolve => {
    recorder.onstop = () => resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType });
  });
}

export default function VideoExporter({ script, onClose }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ scene: 0, total: 0, pct: 0, phase: '' });
  const [videoUrl, setVideoUrl] = useState('');
  const [withAudio, setWithAudio] = useState(!!getElevenLabsSettings().apiKey);
  const [errMsg, setErrMsg] = useState('');
  const { apiKey: elKey } = getElevenLabsSettings();

  const handleGenerate = async () => {
    setStatus('generating'); setErrMsg('');
    try {
      const { blob, mimeType } = await generateVideoBlob(script, setProgress, withAudio);
      setVideoUrl(URL.createObjectURL(blob));
      setStatus('done');
    } catch (e) {
      setErrMsg(e.message);
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${(script.title || 'video').replace(/\s+/g, '-').toLowerCase()}.webm`;
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
              <h3 className="text-lg font-bold">Export Video File</h3>
              <p className="text-xs text-white/40">Motion graphics → WebM video</p>
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
                <span className="text-white/50">Format</span>
                <span className="text-white">WebM (Chrome, Edge, Firefox)</span>
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              withAudio && elKey ? 'bg-green-500/10 border-green-500/30' : 'glass border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                {withAudio && elKey ? <Mic className="w-5 h-5 text-green-400" /> : <MicOff className="w-5 h-5 text-white/40" />}
                <div>
                  <p className="text-sm font-medium">{elKey ? 'AI Voice Narration' : 'Silent Video'}</p>
                  <p className="text-xs text-white/40">
                    {elKey ? 'ElevenLabs voice will be mixed in' : 'Add ElevenLabs key in Settings for voice'}
                  </p>
                </div>
              </div>
              {elKey && (
                <button onClick={() => setWithAudio(a => !a)}
                  className={`w-12 h-6 rounded-full transition-all ${withAudio ? 'bg-green-500' : 'bg-white/20'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${withAudio ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              )}
            </div>

            <p className="text-xs text-white/30 text-center">Export runs in real-time — keep this tab open.</p>

            <button onClick={handleGenerate} className="btn-primary w-full py-4 flex items-center justify-center gap-3">
              <Video className="w-5 h-5" />
              Generate Video ({estimatedTime}s)
            </button>
          </div>
        )}

        {status === 'generating' && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold">Rendering Scene {progress.scene} / {progress.total}</p>
              <p className="text-sm text-white/40 mt-1">Animating frames...</p>
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
              <p className="text-sm text-white/40 mt-1">Your motion graphics video is ready</p>
            </div>
            <video src={videoUrl} controls className="w-full rounded-xl bg-black" />
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Close</button>
              <button onClick={handleDownload} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download .webm
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
