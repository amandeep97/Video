import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { speakBrowser, fetchElevenLabsAudio, getElevenLabsSettings } from '../services/tts.js';
import { renderFrame } from '../services/videoRenderer.js';

export default function VideoPreview({ script, currentScene, onSceneChange, voiceLang = 'en-US' }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const progressRef = useRef(0);
  const startTimeRef = useRef(null);
  const sceneIndexRef = useRef(currentScene);

  const scene = script?.scenes?.[currentScene];
  const totalScenes = script?.scenes?.length || 1;

  useEffect(() => {
    sceneIndexRef.current = currentScene;
    progressRef.current = 0;
    setSceneProgress(0);
    startTimeRef.current = null;
  }, [currentScene]);

  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speakNarration = useCallback(async (text) => {
    if (isMuted) return;
    stopSpeech();
    const { apiKey: elKey, voiceId } = getElevenLabsSettings();
    if (elKey) {
      try {
        const blob = await fetchElevenLabsAudio(text, elKey, voiceId);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onplay  = () => setIsSpeaking(true);
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.play();
        return;
      } catch (e) {
        console.warn('ElevenLabs failed, falling back', e.message);
      }
    }
    setIsSpeaking(true);
    await speakBrowser(text, voiceLang, () => setIsSpeaking(false));
  }, [isMuted, stopSpeech, voiceLang]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const sceneDuration = scene?.duration || 15;
      const progress = Math.min(elapsed / sceneDuration, 1);

      if (isPlaying) {
        progressRef.current = progress;
        setSceneProgress(progress);
        if (progress >= 1) {
          const nextIdx = sceneIndexRef.current + 1;
          if (nextIdx < (script?.scenes?.length || 0)) {
            onSceneChange(nextIdx);
          } else {
            setIsPlaying(false);
            stopSpeech();
          }
          startTimeRef.current = null;
          return;
        }
      }

      const p = isPlaying ? progress : progressRef.current;

      if (scene) {
        renderFrame(ctx, scene, script, sceneIndexRef.current, totalScenes, p, timestamp);

        // Speaking indicator overlay
        if (isSpeaking) {
          ctx.save();
          const W = canvas.width;
          const H = canvas.height;
          for (let i = 0; i < 3; i++) {
            const barH = 6 + Math.sin(timestamp * 0.008 + i * 1.5) * 8;
            ctx.fillStyle = `rgba(255,255,255,0.5)`;
            ctx.fillRect(W - 50 + i * 10, H - 30 - barH / 2, 6, barH);
          }
          ctx.restore();
        }
      } else {
        // Empty state
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scene, isPlaying, isSpeaking, script, totalScenes, onSceneChange, stopSpeech]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSpeech();
    } else {
      setIsPlaying(true);
      startTimeRef.current = null;
      if (scene?.narration) speakNarration(scene.narration);
    }
  };

  const handlePrev = () => {
    stopSpeech(); setIsPlaying(false);
    if (currentScene > 0) onSceneChange(currentScene - 1);
  };

  const handleNext = () => {
    stopSpeech(); setIsPlaying(false);
    if (currentScene < totalScenes - 1) onSceneChange(currentScene + 1);
  };

  const handleMuteToggle = () => {
    setIsMuted(m => !m);
    if (!isMuted) stopSpeech();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-2xl overflow-hidden bg-dark-900 shadow-2xl shadow-black/50" style={{ aspectRatio: '16/9' }}>
        <canvas ref={canvasRef} width={800} height={450} className="w-full h-full" />
        {!scene && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
            <div className="text-6xl mb-4">🎬</div>
            <p>Generate a script to see preview</p>
          </div>
        )}
      </div>

      <div className="glass rounded-xl px-4 py-3 flex items-center gap-4">
        <button onClick={handlePrev} disabled={!scene || currentScene === 0} className="text-white/50 hover:text-white disabled:opacity-30 transition-colors">
          <SkipBack className="w-5 h-5" />
        </button>
        <button onClick={handlePlayPause} disabled={!scene} className="w-10 h-10 rounded-full bg-brand-500 hover:bg-brand-400 disabled:opacity-30 flex items-center justify-center transition-colors">
          {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
        </button>
        <button onClick={handleNext} disabled={!scene || currentScene >= totalScenes - 1} className="text-white/50 hover:text-white disabled:opacity-30 transition-colors">
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${sceneProgress * 100}%` }} />
        </div>

        <span className="text-xs text-white/40 font-mono">
          {currentScene + 1}/{totalScenes}
        </span>

        <button onClick={handleMuteToggle} className="text-white/50 hover:text-white transition-colors">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {scene?.narration && (
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-white/40 mb-1 uppercase tracking-wider font-medium">Narration</p>
          <p className="text-sm text-white/70 leading-relaxed">{scene.narration}</p>
        </div>
      )}
    </div>
  );
}
