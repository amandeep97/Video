import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Sparkles, Film } from 'lucide-react';
import { speakBrowser, fetchElevenLabsAudio, getElevenLabsSettings } from '../services/tts.js';
import { renderFrame } from '../services/videoRenderer.js';
import { preloadSceneVideos, getPexelsKey } from '../services/pexels.js';
import { preloadSceneImages } from '../services/pollinations.js';

export default function VideoPreview({ script, currentScene, onSceneChange, voiceLang = 'en-US' }) {
  const canvasRef     = useRef(null);
  const animFrameRef  = useRef(null);
  const videoEls      = useRef({});
  const imageEls      = useRef({});
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [sceneProgress,setSceneProgress]= useState(0);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [loadState,    setLoadState]    = useState({ type: 'idle', done: 0, total: 0 });
  const progressRef   = useRef(0);
  const startTimeRef  = useRef(null);
  const sceneIndexRef = useRef(currentScene);

  const scene       = script?.scenes?.[currentScene];
  const totalScenes = script?.scenes?.length || 1;

  // Load backgrounds when script changes
  useEffect(() => {
    if (!script?.scenes) return;
    videoEls.current = {};
    imageEls.current = {};
    setLoadState({ type: 'idle', done: 0, total: 0 });

    const pexelsKey = getPexelsKey();

    if (pexelsKey) {
      // Use Pexels stock videos
      setLoadState({ type: 'video', done: 0, total: script.scenes.length });
      preloadSceneVideos(script.scenes, pexelsKey).then(els => {
        videoEls.current = els;
        setLoadState({ type: 'video', done: script.scenes.length, total: script.scenes.length });
      });
    } else {
      // Use free Pollinations AI images
      setLoadState({ type: 'ai', done: 0, total: script.scenes.length });
      preloadSceneImages(script.scenes, script.style, (done, total) => {
        setLoadState({ type: 'ai', done, total });
      }).then(imgs => {
        imageEls.current = imgs;
      });
    }
  }, [script]);

  useEffect(() => {
    Object.entries(videoEls.current).forEach(([i, v]) => {
      if (Number(i) !== currentScene) v.pause();
    });
    sceneIndexRef.current = currentScene;
    progressRef.current   = 0;
    setSceneProgress(0);
    startTimeRef.current  = null;
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
        const blob  = await fetchElevenLabsAudio(text, elKey, voiceId);
        const url   = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onplay  = () => setIsSpeaking(true);
        audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
        audio.play();
        return;
      } catch (e) { console.warn('ElevenLabs failed', e.message); }
    }
    setIsSpeaking(true);
    await speakBrowser(text, voiceLang, () => setIsSpeaking(false));
  }, [isMuted, stopSpeech, voiceLang]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed      = (timestamp - startTimeRef.current) / 1000;
      const sceneDuration = scene?.duration || 15;
      const progress     = Math.min(elapsed / sceneDuration, 1);

      if (isPlaying) {
        progressRef.current = progress;
        setSceneProgress(progress);
        if (progress >= 1) {
          const next = sceneIndexRef.current + 1;
          if (next < (script?.scenes?.length || 0)) {
            onSceneChange(next);
          } else {
            setIsPlaying(false);
            stopSpeech();
          }
          startTimeRef.current = null;
          return;
        }
      }

      const p       = isPlaying ? progress : progressRef.current;
      const bgVideo = videoEls.current[sceneIndexRef.current] || null;
      const bgImage = imageEls.current[sceneIndexRef.current] || null;

      if (scene) {
        renderFrame(ctx, scene, script, sceneIndexRef.current, totalScenes, p, timestamp, bgVideo, bgImage);
        // Speaking waveform indicator
        if (isSpeaking) {
          const W = canvas.width, H = canvas.height;
          ctx.save();
          for (let i = 0; i < 3; i++) {
            const bh = 6 + Math.sin(timestamp * 0.008 + i * 1.5) * 8;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(W - 50 + i * 10, H - 30 - bh / 2, 6, bh);
          }
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [scene, isPlaying, isSpeaking, script, totalScenes, onSceneChange, stopSpeech, loadState]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopSpeech();
      videoEls.current[currentScene]?.pause();
    } else {
      setIsPlaying(true);
      startTimeRef.current = null;
      const v = videoEls.current[currentScene];
      if (v) { v.currentTime = 0; v.play().catch(() => {}); }
      if (scene?.narration) speakNarration(scene.narration);
    }
  };

  const handlePrev = () => {
    stopSpeech(); setIsPlaying(false);
    videoEls.current[currentScene]?.pause();
    if (currentScene > 0) onSceneChange(currentScene - 1);
  };

  const handleNext = () => {
    stopSpeech(); setIsPlaying(false);
    videoEls.current[currentScene]?.pause();
    if (currentScene < totalScenes - 1) onSceneChange(currentScene + 1);
  };

  const handleMuteToggle = () => {
    setIsMuted(m => !m);
    if (!isMuted) stopSpeech();
  };

  const pct        = loadState.total > 0 ? (loadState.done / loadState.total) * 100 : 0;
  const isLoading  = loadState.total > 0 && loadState.done < loadState.total;
  const isAI       = loadState.type === 'ai';

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

        {/* Loading badge */}
        {script && isLoading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl bg-black/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white text-xs font-medium">
              {isAI
                ? <><Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Generating AI visuals… {loadState.done}/{loadState.total}</>
                : <><Film className="w-3.5 h-3.5 text-blue-400 animate-pulse" /> Loading videos… {loadState.done}/{loadState.total}</>
              }
            </div>
            <div className="w-36 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Ready badge */}
        {script && !isLoading && loadState.total > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-xs">
            {isAI
              ? <><Sparkles className="w-3 h-3 text-purple-400" /><span className="text-purple-300">AI visuals</span></>
              : <><Film className="w-3 h-3 text-blue-400" /><span className="text-blue-300">Stock video</span></>
            }
          </div>
        )}
      </div>

      {/* Controls */}
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
        <span className="text-xs text-white/40 font-mono">{currentScene + 1}/{totalScenes}</span>
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
