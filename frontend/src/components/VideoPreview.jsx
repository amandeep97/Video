import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { speakBrowser, fetchElevenLabsAudio, getElevenLabsSettings } from '../services/tts.js';

const GRADIENT_PRESETS = {
  professional: ['#1e3a5f', '#0d2137'],
  cinematic: ['#1a0533', '#0a0015'],
  educational: ['#0d3d2e', '#041a12'],
  social: ['#3d0d2e', '#1a0415'],
  motivational: ['#3d1a0d', '#1a0804'],
  documentary: ['#1a1a2e', '#0d0d1a'],
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export default function VideoPreview({ script, currentScene, onSceneChange, voiceLang = 'en-US' }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const synthRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const progressRef = useRef(0);
  const startTimeRef = useRef(null);
  const sceneIndexRef = useRef(currentScene);

  const scene = script?.scenes?.[currentScene];
  const colors = script?.colorScheme || {};

  useEffect(() => {
    sceneIndexRef.current = currentScene;
    progressRef.current = 0;
    setSceneProgress(0);
    startTimeRef.current = null;
  }, [currentScene]);

  const stopSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakNarration = useCallback(async (text) => {
    if (isMuted) return;
    stopSpeech();
    const { apiKey: elKey, voiceId } = getElevenLabsSettings();

    // Try ElevenLabs realistic voice first
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
        console.warn('ElevenLabs failed, falling back to browser TTS', e.message);
      }
    }

    // Fallback: browser SpeechSynthesis with correct language
    setIsSpeaking(true);
    await speakBrowser(text, voiceLang, () => setIsSpeaking(false));
  }, [isMuted, stopSpeech, voiceLang]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');

    const draw = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const sceneDuration = scene.duration || 15;
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

      // Background gradient
      const bg1 = colors.background || GRADIENT_PRESETS[script?.style || 'professional'][0] || '#1e3a5f';
      const bg2 = '#080d1a';
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, bg1);
      grad.addColorStop(1, bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated particles
      ctx.save();
      for (let i = 0; i < 12; i++) {
        const x = ((i * 137 + timestamp * 0.02) % canvas.width);
        const y = ((i * 97 + timestamp * 0.015) % canvas.height);
        const opacity = 0.05 + Math.sin(timestamp * 0.001 + i) * 0.03;
        const r = hexToRgb(colors.accent || colors.primary || '#4f6ef7');
        ctx.fillStyle = `rgba(${r.r},${r.g},${r.b},${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + Math.sin(timestamp * 0.002 + i) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Scene number badge
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(20, 20, 70, 28, 14);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${sceneIndexRef.current + 1} / ${script?.scenes?.length}`, 55, 38);
      ctx.restore();

      // Progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, canvas.height - 4, canvas.width, 4);
      const accentRgb = hexToRgb(colors.accent || colors.primary || '#4f6ef7');
      const barGrad = ctx.createLinearGradient(0, 0, canvas.width * p, 0);
      barGrad.addColorStop(0, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8)`);
      barGrad.addColorStop(1, `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},1)`);
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, canvas.height - 4, canvas.width * p, 4);

      // Emoji (centered, animated)
      if (scene.emoji) {
        const emojiScale = 1 + Math.sin(timestamp * 0.002) * 0.05;
        ctx.save();
        ctx.font = `${64 * emojiScale}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.9;
        ctx.fillText(scene.emoji, canvas.width / 2, canvas.height * 0.28);
        ctx.restore();
      }

      // Title
      const titleY = canvas.height * 0.48;
      const titleOpacity = p < 0.1 ? p / 0.1 : p > 0.85 ? (1 - p) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = titleOpacity;
      ctx.font = `bold 28px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.text || '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      const titleText = scene.title || '';
      wrapText(ctx, titleText, canvas.width / 2, titleY, canvas.width - 80, 36);
      ctx.restore();

      // Key points (animated in one by one)
      const keyPoints = scene.keyPoints || [];
      keyPoints.forEach((point, i) => {
        const pointDelay = 0.3 + i * 0.15;
        const pointOpacity = Math.max(0, Math.min(1, (p - pointDelay) / 0.1));
        if (pointOpacity <= 0) return;

        const py = canvas.height * 0.62 + i * 34;
        ctx.save();
        ctx.globalAlpha = pointOpacity;

        // Bullet
        ctx.fillStyle = colors.accent || colors.primary || '#4f6ef7';
        ctx.beginPath();
        ctx.arc(canvas.width / 2 - (canvas.width * 0.35) + 6, py + 1, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '14px -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(point, canvas.width / 2 - (canvas.width * 0.35) + 20, py + 6);
        ctx.restore();
      });

      // Speaking indicator
      if (isSpeaking) {
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const barH = 6 + Math.sin(timestamp * 0.008 + i * 1.5) * 8;
          ctx.fillStyle = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7)`;
          ctx.fillRect(canvas.width - 50 + i * 10, canvas.height - 30 - barH / 2, 6, barH);
        }
        ctx.restore();
      }

      if (isPlaying || true) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scene, isPlaying, isSpeaking, colors, script, onSceneChange, stopSpeech]);

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
    stopSpeech();
    setIsPlaying(false);
    if (currentScene > 0) onSceneChange(currentScene - 1);
  };

  const handleNext = () => {
    stopSpeech();
    setIsPlaying(false);
    if (currentScene < (script?.scenes?.length || 1) - 1) onSceneChange(currentScene + 1);
  };

  const handleMuteToggle = () => {
    setIsMuted(m => !m);
    if (!isMuted) stopSpeech();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-dark-900 shadow-2xl shadow-black/50" style={{ aspectRatio: '16/9' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-full"
        />
        {!scene && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
            <div className="text-6xl mb-4">🎬</div>
            <p>Generate a script to see preview</p>
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
        <button onClick={handleNext} disabled={!scene || currentScene >= (script?.scenes?.length || 1) - 1} className="text-white/50 hover:text-white disabled:opacity-30 transition-colors">
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Progress */}
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${sceneProgress * 100}%` }}
          />
        </div>

        <span className="text-xs text-white/40 font-mono">
          Scene {currentScene + 1}/{script?.scenes?.length || '-'}
        </span>

        <button onClick={handleMuteToggle} className="text-white/50 hover:text-white transition-colors">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Current narration */}
      {scene?.narration && (
        <div className="glass rounded-xl px-4 py-3">
          <p className="text-xs text-white/40 mb-1 uppercase tracking-wider font-medium">Narration</p>
          <p className="text-sm text-white/70 leading-relaxed">{scene.narration}</p>
        </div>
      )}
    </div>
  );
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, lineY);
      line = words[i] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, lineY);
}
