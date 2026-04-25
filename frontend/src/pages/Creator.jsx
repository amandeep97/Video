import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, RefreshCw, Download, Copy, Check,
  Settings2, ChevronDown, ChevronUp, Wand2, FileText,
  Palette, Clock, Users, Mic, AlertCircle, Video, Key, Play, Layers,
  Captions, Music, Smartphone, Monitor, Square
} from 'lucide-react';
import { generateScript, regenerateScene } from '../services/api.js';
import { hasValidKey, getSettings, PROVIDERS } from '../services/providers.js';
import { VOICE_LANGUAGES, getElevenLabsSettings, saveVoiceLang } from '../services/tts.js';
import { getFalKey, generateSceneVideo } from '../services/fal.js';
import VideoPreview from '../components/VideoPreview.jsx';
import SceneCard from '../components/SceneCard.jsx';
import SceneEditor from '../components/SceneEditor.jsx';
import ApiKeyModal from '../components/ApiKeyModal.jsx';
import VideoExporter from '../components/VideoExporter.jsx';
import MusicPicker from '../components/MusicPicker.jsx';
import VoiceCustomizer from '../components/VoiceCustomizer.jsx';

// ── Stable components defined OUTSIDE Creator to prevent remount on re-render ──

const TopicInput = memo(({ value, onChange }) => (
  <div>
    <label className="text-sm text-white/50 mb-2 block font-medium">Video Topic</label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder="e.g. How to build a successful startup in 2025..."
      className="input-field resize-none h-24 text-sm"
    />
  </div>
));
TopicInput.displayName = 'TopicInput';

const FeedbackInput = memo(({ value, onChange, onSubmit, onCancel }) => (
  <div className="mt-1 flex gap-2 px-1">
    <input
      type="text" value={value} onChange={onChange} autoFocus
      onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel(); }}
      placeholder="Feedback for AI... (Enter to regenerate)"
      className="input-field text-xs py-2 flex-1"
    />
    <button onClick={onSubmit} className="btn-primary text-xs py-2 px-3">Go</button>
  </div>
));
FeedbackInput.displayName = 'FeedbackInput';

// ─────────────────────────────────────────────────────────────────────────────

const STYLES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'cinematic',    label: 'Cinematic',     emoji: '🎬' },
  { id: 'educational',  label: 'Educational',   emoji: '📚' },
  { id: 'social',       label: 'Social Media',  emoji: '📱' },
  { id: 'motivational', label: 'Motivational',  emoji: '🔥' },
  { id: 'documentary',  label: 'Documentary',   emoji: '🎥' },
];

const TONES     = ['engaging', 'professional', 'casual', 'inspirational', 'educational', 'humorous'];
const AUDIENCES = ['general', 'beginners', 'professionals', 'students', 'entrepreneurs', 'seniors'];
const SCRIPT_LANGS = ['English', 'Hindi', 'Punjabi', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese'];

const MOBILE_TABS = [
  { id: 'configure', label: 'Configure', icon: Settings2 },
  { id: 'preview',   label: 'Preview',   icon: Play },
  { id: 'scenes',    label: 'Scenes',    icon: Layers },
];

export default function Creator() {
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();

  // Form state
  const [topic,    setTopic]    = useState(searchParams.get('topic') || '');
  const [style,    setStyle]    = useState(searchParams.get('style') || 'professional');
  const [duration, setDuration] = useState(Number(searchParams.get('duration')) || 60);
  const [tone,     setTone]     = useState('engaging');
  const [audience, setAudience] = useState('general');
  const [scriptLang, setScriptLang] = useState('English');
  const [voiceLang,  setVoiceLang]  = useState(getElevenLabsSettings().langCode || 'en-US');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output state
  const [script,             setScript]             = useState(null);
  const [isGenerating,       setIsGenerating]       = useState(false);
  const [error,              setError]              = useState('');
  const [currentScene,       setCurrentScene]       = useState(0);
  const [regeneratingScene,  setRegeneratingScene]  = useState(null);
  const [editingScene,       setEditingScene]       = useState(null);
  const [feedbackForScene,   setFeedbackForScene]   = useState(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [copied,             setCopied]             = useState(false);
  const [mobileTab,          setMobileTab]          = useState('configure');
  const [videoFormat,        setVideoFormat]        = useState('landscape');
  const [showCaptions,       setShowCaptions]       = useState(true);
  const [musicStyle,         setMusicStyle]         = useState('none');
  const [customMusicUrl,     setCustomMusicUrl]     = useState(null);
  const [customMusicName,    setCustomMusicName]    = useState('');
  const [selectedTrack,      setSelectedTrack]      = useState(null);
  const [showMusicPicker,      setShowMusicPicker]      = useState(false);
  const [showVoiceCustomizer,  setShowVoiceCustomizer]  = useState(false);
  const [animStyle,            setAnimStyle]            = useState('slide');
  const [filterStyle,          setFilterStyle]          = useState('none');
  const [styleEffect,          setStyleEffect]          = useState('none');
  const [motionTracking,       setMotionTracking]       = useState(false);
  const [watermark,            setWatermark]            = useState('');
  const [falVideoUrls,         setFalVideoUrls]         = useState(null);
  const [isGeneratingFal,      setIsGeneratingFal]      = useState(false);
  const [falProgress,          setFalProgress]          = useState({ done: 0, total: 0 });
  const [falError,             setFalError]             = useState('');

  // Modal state
  const [showApiKeyModal,    setShowApiKeyModal]    = useState(false);
  const [showExporter,       setShowExporter]       = useState(false);
  const [hasApiKey,          setHasApiKey]          = useState(hasValidKey());

  const refreshKeyState = () => setHasApiKey(hasValidKey());

  const handleGenerateFalVideos = async () => {
    const falKey = getFalKey();
    if (!falKey || !script) return;
    setIsGeneratingFal(true);
    setFalError('');
    setFalVideoUrls(null);
    const ar = videoFormat === 'portrait' ? '9:16' : videoFormat === 'square' ? '1:1' : '16:9';
    const urls = [];
    for (let i = 0; i < script.scenes.length; i++) {
      setFalProgress({ done: i, total: script.scenes.length });
      try {
        const prompt = script.scenes[i].visualDescription || script.scenes[i].title;
        urls.push(await generateSceneVideo(prompt, falKey, ar));
      } catch (e) {
        urls.push(null);
        setFalError(`Scene ${i + 1} failed: ${e.message}`);
      }
    }
    setFalProgress({ done: script.scenes.length, total: script.scenes.length });
    setFalVideoUrls(urls);
    setIsGeneratingFal(false);
  };

  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
    if (track) {
      setMusicStyle('custom');
      setCustomMusicUrl(track.url);
      setCustomMusicName(track.title);
    } else {
      setMusicStyle('none');
      setCustomMusicUrl(null);
      setCustomMusicName('');
    }
  };

  const currentProviderName = () => PROVIDERS[getSettings().providerId]?.name || 'AI';

  useEffect(() => {
    if (searchParams.get('topic') && hasValidKey()) handleGenerate();
    else if (searchParams.get('topic') && !hasValidKey()) setShowApiKeyModal(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim())   { setError('Please enter a topic'); return; }
    if (!hasValidKey())  { setShowApiKeyModal(true); return; }
    setIsGenerating(true);
    setError('');
    setScript(null);
    setCurrentScene(0);
    setMobileTab('preview');
    try {
      const result = await generateScript({ topic, style, duration, tone, audience, language: scriptLang });
      setScript(result);
    } catch (err) {
      setError(err.message || 'Failed to generate. Check your API key in Settings.');
      setMobileTab('configure');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, style, duration, tone, audience, scriptLang]);

  const handleRegenerateScene = async (index, feedback = '') => {
    setRegeneratingScene(index);
    try {
      const updated = await regenerateScene(script.scenes[index], topic, style, feedback);
      setScript(prev => ({
        ...prev,
        scenes: prev.scenes.map((s, i) => i === index ? { ...updated, id: s.id } : s),
      }));
    } catch (err) { setError(err.message); }
    finally {
      setRegeneratingScene(null);
      setFeedbackForScene(null);
      setRegenerateFeedback('');
    }
  };

  const handleSaveScene = (updated) => {
    if (!script || editingScene === null) return;
    setScript(prev => ({ ...prev, scenes: prev.scenes.map((s, i) => i === editingScene ? updated : s) }));
  };

  const handleCopyScript = () => {
    if (!script) return;
    const text = [
      `# ${script.title}\n${script.description}`,
      `Duration: ${script.totalDuration}s | Style: ${script.style}`,
      '='.repeat(50),
      ...script.scenes.map(s =>
        `\n## Scene ${s.id}: ${s.title} (${s.duration}s)\n**Narration:** ${s.narration}` +
        (s.keyPoints?.length ? `\n**Key Points:**\n${s.keyPoints.map(p => `- ${p}`).join('\n')}` : '') +
        `\n**Visual:** ${s.visualDescription}`
      ),
      `\n**CTA:** ${script.callToAction}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalDuration = script?.scenes?.reduce((s, sc) => s + (sc.duration || 0), 0) || 0;

  // ── Configure panel JSX (uses TopicInput memo component for stable textarea) ──
  const configurePanel = (
    <div className="space-y-5 pb-4">
      {!hasApiKey && (
        <button onClick={() => setShowApiKeyModal(true)}
          className="w-full flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/15 transition-colors text-left">
          <Key className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-300">API Key Required</p>
            <p className="text-xs text-yellow-400/70">Tap to add your AI API key (Groq is free)</p>
          </div>
        </button>
      )}

      {/* Stable memo component — won't remount on re-render */}
      <TopicInput value={topic} onChange={e => setTopic(e.target.value)} />

      {/* Style */}
      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Style</label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(s => (
            <button key={s.id} onClick={() => setStyle(s.id)}
              className={`py-3 px-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                style === s.id
                  ? 'bg-brand-500/25 border border-brand-500/60 text-white'
                  : 'glass glass-hover text-white/60 border border-transparent'
              }`}>
              <span className="text-lg">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Style */}
      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Animation Style</label>
        <div className="grid grid-cols-5 gap-2">
          {[
            { id: 'slide',      icon: '✨', label: 'Slide' },
            { id: 'bounce',     icon: '🏀', label: 'Bounce' },
            { id: 'typewriter', icon: '⌨️', label: 'Type' },
            { id: 'zoom',       icon: '🔍', label: 'Zoom' },
            { id: 'neon',       icon: '💡', label: 'Neon' },
          ].map(a => (
            <button key={a.id} onClick={() => setAnimStyle(a.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-center ${
                animStyle === a.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10 hover:border-white/20'
              }`}>
              <span className="text-lg">{a.icon}</span>
              <span className="text-[10px] text-white/70">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Filter */}
      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Color Filter</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'none',      icon: '⬜', label: 'Normal' },
            { id: 'cinematic', icon: '🎬', label: 'Cinematic' },
            { id: 'vintage',   icon: '📷', label: 'Vintage' },
            { id: 'warm',      icon: '🌅', label: 'Warm' },
            { id: 'cool',      icon: '❄️', label: 'Cool' },
            { id: 'bw',        icon: '⬛', label: 'B&W' },
            { id: 'vivid',     icon: '🌈', label: 'Vivid' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterStyle(f.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                filterStyle === f.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10'
              }`}>
              <span className="text-base">{f.icon}</span>
              <span className="text-[10px] text-white/60">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Effect */}
      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Style Effect</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'none',    icon: '✨', label: 'None' },
            { id: 'cartoon', icon: '🎨', label: 'Cartoon' },
            { id: 'sketch',  icon: '✏️', label: 'Sketch' },
            { id: 'neon',    icon: '💡', label: 'Neon' },
            { id: 'oil',     icon: '🖌️', label: 'Oil' },
            { id: 'retro',   icon: '📺', label: 'Retro' },
          ].map(e => (
            <button key={e.id} onClick={() => setStyleEffect(e.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                styleEffect === e.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10'
              }`}>
              <span className="text-base">{e.icon}</span>
              <span className="text-[10px] text-white/60">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Motion Tracking FX */}
      <div className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
        motionTracking ? 'bg-green-500/10 border-green-500/30' : 'glass border-white/10'
      }`} onClick={() => setMotionTracking(m => !m)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div>
            <p className="text-sm font-medium">Motion Tracking FX</p>
            <p className="text-xs text-white/40">Animated tracking reticle overlay</p>
          </div>
        </div>
        <div className={`w-10 h-5 rounded-full transition-all ${motionTracking ? 'bg-green-500' : 'bg-white/20'}`}>
          <div className={`w-4 h-4 rounded-full bg-white shadow mt-0.5 transition-transform ${motionTracking ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Duration: <span className="text-white">{duration}s ({Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')})</span>
        </label>
        {/* Quick presets */}
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {[
            { label: '15s',  val: 15,  hint: 'Story' },
            { label: '30s',  val: 30,  hint: 'Reel' },
            { label: '60s',  val: 60,  hint: '1 min' },
            { label: '90s',  val: 90,  hint: '1.5m' },
            { label: '3min', val: 180, hint: 'Long' },
          ].map(p => (
            <button key={p.val} onClick={() => setDuration(p.val)}
              className={`flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-all border ${
                duration === p.val
                  ? 'bg-brand-500/25 border-brand-500/60 text-white'
                  : 'glass border-transparent text-white/50 hover:text-white'
              }`}>
              <span className="font-bold">{p.label}</span>
              <span className="text-[9px] opacity-60 mt-0.5">{p.hint}</span>
            </button>
          ))}
        </div>
        <input type="range" min={15} max={180} step={15} value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full accent-brand-500 h-2" />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>15s</span><span>1min</span><span>2min</span><span>3min</span>
        </div>
      </div>

      {/* Platform selector */}
      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Platform</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'instagram-reel', label: 'Reels',   emoji: '📸', format: 'portrait',  bg: 'from-pink-500 to-orange-400',  captions: true,  music: 'motivational' },
            { id: 'tiktok',         label: 'TikTok',  emoji: '🎵', format: 'portrait',  bg: 'from-gray-900 to-gray-700',    captions: true,  music: 'motivational' },
            { id: 'yt-shorts',      label: 'Shorts',  emoji: '▶️', format: 'portrait',  bg: 'from-red-600 to-red-500',      captions: true,  music: 'none' },
            { id: 'youtube',        label: 'YouTube', emoji: '📺', format: 'landscape', bg: 'from-red-600 to-red-700',      captions: false, music: 'professional' },
            { id: 'facebook',       label: 'Facebook',emoji: '📘', format: 'landscape', bg: 'from-blue-600 to-blue-500',    captions: false, music: 'professional' },
            { id: 'instagram-feed', label: 'Insta',   emoji: '🟣', format: 'square',   bg: 'from-purple-500 to-pink-500',  captions: false, music: 'none' },
            { id: 'twitter',        label: 'X/Twitter',emoji: '🐦',format: 'landscape', bg: 'from-gray-800 to-gray-900',   captions: false, music: 'none' },
            { id: 'custom',         label: 'Custom',  emoji: '⚙️', format: videoFormat, bg: 'from-brand-600 to-purple-600', captions: showCaptions, music: musicStyle },
          ].map(p => {
            const isActive = (() => {
              if (p.id === 'custom') return false;
              return videoFormat === p.format;
            })();
            return (
              <button key={p.id} onClick={() => {
                if (p.id !== 'custom') {
                  setVideoFormat(p.format);
                  setShowCaptions(p.captions);
                  setMusicStyle(p.music);
                  setSelectedTrack(null);
                  setCustomMusicUrl(null);
                  setCustomMusicName('');
                }
              }}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-center transition-all border ${
                  isActive ? 'border-white/40 bg-white/10' : 'glass border-white/10 hover:border-white/20'
                }`}>
                <span className="text-xl">{p.emoji}</span>
                <span className="text-[10px] font-medium text-white/70 leading-tight">{p.label}</span>
                {isActive && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400" />}
              </button>
            );
          })}

        </div>
        {/* Format pills */}
        <div className="flex gap-1.5 mt-2">
          {[
            { id: 'landscape', label: '16:9 Landscape' },
            { id: 'portrait',  label: '9:16 Portrait' },
            { id: 'square',    label: '1:1 Square' },
          ].map(f => (
            <button key={f.id} onClick={() => setVideoFormat(f.id)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                videoFormat === f.id ? 'bg-brand-500/30 text-brand-300 border border-brand-500/50' : 'glass text-white/40 hover:text-white'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Captions + Music */}
      <div className="space-y-2">
        <div className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
          showCaptions ? 'bg-brand-500/15 border-brand-500/40' : 'glass border-transparent'
        }`} onClick={() => setShowCaptions(c => !c)}>
          <Captions className={`w-4 h-4 ${showCaptions ? 'text-brand-400' : 'text-white/40'}`} />
          <div className="flex-1">
            <p className="text-xs font-medium text-white">Captions</p>
            <p className="text-[10px] text-white/30">{showCaptions ? 'ON — word-by-word subtitles' : 'OFF'}</p>
          </div>
        </div>

        {/* Music row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMusicPicker(true)}
            className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
              selectedTrack
                ? 'bg-brand-500/15 border-brand-500/40'
                : 'glass border-transparent hover:border-white/20'
            }`}
          >
            <Music className={`w-4 h-4 flex-shrink-0 ${selectedTrack ? 'text-brand-400' : 'text-white/40'}`} />
            <div className="flex-1 min-w-0 text-left">
              {selectedTrack ? (
                <>
                  <p className="text-xs font-medium text-brand-300 truncate">{selectedTrack.title}</p>
                  <p className="text-[10px] text-white/40 truncate">{selectedTrack.artist}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-white">Add Music</p>
                  <p className="text-[10px] text-white/30">Browse library</p>
                </>
              )}
            </div>
            {!selectedTrack && <span className="text-white/30 text-xs">+</span>}
          </button>
          {selectedTrack && (
            <button
              onClick={() => { setSelectedTrack(null); setMusicStyle('none'); setCustomMusicUrl(null); setCustomMusicName(''); }}
              className="w-9 h-9 glass glass-hover rounded-xl flex items-center justify-center text-white/40 hover:text-red-400 text-sm"
            >✕</button>
          )}
        </div>

        {/* Upload your own song */}
        <label className="block cursor-pointer">
          <div className={`flex items-center gap-2.5 p-3 rounded-xl border-2 border-dashed transition-all ${
            musicStyle === 'custom' && customMusicUrl
              ? 'border-green-500/40 bg-green-500/8'
              : 'border-white/10 hover:border-white/20'
          }`}>
            <span className="text-base">{musicStyle === 'custom' && customMusicUrl ? '✅' : '🎶'}</span>
            <div className="flex-1 min-w-0">
              {musicStyle === 'custom' && customMusicUrl ? (
                <>
                  <p className="text-xs font-medium text-green-400">Your song uploaded</p>
                  <p className="text-[10px] text-white/40 truncate">{customMusicName}</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-white/60">Upload your own song</p>
                  <p className="text-[10px] text-white/30">MP3, WAV, OGG</p>
                </>
              )}
            </div>
            {musicStyle === 'custom' && customMusicUrl && (
              <button type="button" onClick={e => { e.preventDefault(); URL.revokeObjectURL(customMusicUrl); setCustomMusicUrl(null); setCustomMusicName(''); setMusicStyle('none'); }}
                className="text-white/30 hover:text-red-400 text-xs px-1">✕</button>
            )}
          </div>
          <input type="file" accept="audio/*" className="hidden" onChange={e => {
            const file = e.target.files[0];
            if (!file) return;
            if (customMusicUrl) URL.revokeObjectURL(customMusicUrl);
            setSelectedTrack(null);
            setMusicStyle('custom');
            setCustomMusicUrl(URL.createObjectURL(file));
            setCustomMusicName(file.name);
          }} />
        </label>

        {(selectedTrack || (musicStyle === 'custom' && customMusicUrl)) && (
          <div className="flex items-center gap-2 px-1">
            <Music className="w-3 h-3 text-white/30" />
            <input type="range" min={0} max={100} defaultValue={25} className="flex-1 accent-brand-500 h-1.5"
              onChange={e => document.dispatchEvent(new CustomEvent('music-volume', { detail: e.target.value / 100 }))} />
            <span className="text-[10px] text-white/30">Vol</span>
          </div>
        )}
      </div>

      {/* Voice language + customizer */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-white/50 font-medium flex items-center gap-2">
            <Mic className="w-4 h-4" /> Voice Language
          </label>
          <button onClick={() => setShowVoiceCustomizer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 border border-brand-500/40 text-xs font-medium text-brand-300 hover:bg-brand-500/30 transition-all">
            🎙️ Customize Voice
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {VOICE_LANGUAGES.map(l => (
            <button key={l.id} onClick={() => { setVoiceLang(l.id); saveVoiceLang(l.id); }}
              className={`py-2 px-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                voiceLang === l.id
                  ? 'bg-brand-500/25 border border-brand-500/50 text-white'
                  : 'glass text-white/50 hover:text-white border border-transparent'
              }`}>
              <span>{l.flag}</span>
              <span className="truncate">{l.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-2">
          🤗 <button onClick={() => setShowVoiceCustomizer(true)} className="text-brand-400 underline">Use free HuggingFace AI voice</button> — unlimited Hindi, Punjabi, English &amp; more
        </p>
      </div>

      {/* Advanced */}
      <div>
        <button onClick={() => setShowAdvanced(a => !a)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors py-1">
          <Settings2 className="w-4 h-4" />
          Advanced Options
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-4 pl-1">
            <div>
              <label className="text-xs text-white/40 mb-2 flex items-center gap-1.5 uppercase tracking-wider">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                      tone === t ? 'bg-brand-500/30 text-brand-300 border border-brand-500/50' : 'glass text-white/50 hover:text-white'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-3 h-3" /> Audience
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCES.map(a => (
                  <button key={a} onClick={() => setAudience(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${
                      audience === a ? 'bg-brand-500/30 text-brand-300 border border-brand-500/50' : 'glass text-white/50 hover:text-white'
                    }`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Palette className="w-3 h-3" /> Script Language
              </label>
              <select value={scriptLang} onChange={e => setScriptLang(e.target.value)} className="input-field text-sm py-2">
                {SCRIPT_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Watermark (optional)</label>
              <input type="text" value={watermark} onChange={e => setWatermark(e.target.value)}
                placeholder="@yourhandle or brand name"
                className="input-field text-sm" />
            </div>
            <div className="flex items-center justify-between p-3 glass rounded-xl border border-white/10">
              <div>
                <p className="text-sm font-medium">🎙️ Voice Isolation</p>
                <p className="text-xs text-white/40">Remove background noise from narration</p>
              </div>
              <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">Coming Soon</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {script && !isGenerating && (
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">{script.title}</p>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">{script.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-xs glass px-2 py-1 rounded-full text-white/50">{script.scenes?.length} scenes</span>
            <span className="text-xs glass px-2 py-1 rounded-full text-white/50">{totalDuration}s total</span>
            {script.tags?.map(tag => (
              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">#{tag}</span>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleGenerate} disabled={isGenerating || !topic.trim()}
        className="btn-primary w-full flex items-center justify-center gap-3 py-4 text-base">
        {isGenerating
          ? <><RefreshCw className="w-5 h-5 animate-spin" /><span>Generating...</span></>
          : <><Sparkles className="w-5 h-5" /><span>{script ? 'Regenerate' : 'Generate'} Video</span></>
        }
      </button>

      {script && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setShowExporter(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 transition-all text-sm font-medium">
              <Video className="w-4 h-4" />
              Export as Video File
            </button>
            <button onClick={() => { const c = document.querySelector('canvas'); if(!c) return; const a = document.createElement('a'); a.href=c.toDataURL('image/png'); a.download=`${(script?.title||'frame').replace(/\s+/g,'-').toLowerCase()}.png`; a.click(); }}
              className="btn-secondary flex items-center gap-2 px-3 text-sm">
              📸
            </button>
          </div>
          {getFalKey() && (
            <div className="space-y-1">
              <button onClick={handleGenerateFalVideos} disabled={isGeneratingFal}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${
                  falVideoUrls ? 'bg-green-500/15 border-green-500/40 text-green-300' : 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                } disabled:opacity-50`}>
                {isGeneratingFal
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> AI Video {falProgress.done}/{falProgress.total} scenes…</>
                  : falVideoUrls
                    ? <><Sparkles className="w-4 h-4" /> ✅ AI Backgrounds Ready — Regenerate</>
                    : <><Sparkles className="w-4 h-4" /> Generate AI Video Backgrounds (FAL.ai)</>
                }
              </button>
              {falError && <p className="text-[10px] text-red-400 text-center">{falError}</p>}
              {falVideoUrls && !isGeneratingFal && (
                <p className="text-[10px] text-green-400/70 text-center">Real AI video clips are now playing in the preview</p>
              )}
            </div>
          )}
          {!getFalKey() && (
            <button onClick={() => setShowApiKeyModal(true)}
              className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-1">
              🎬 Add FAL.ai key to generate real AI video backgrounds (~$0.05/scene)
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ── Preview panel ─────────────────────────────────────────────────────────
  const previewPanel = (
    <div className="space-y-4">
      <VideoPreview script={script} currentScene={currentScene} onSceneChange={setCurrentScene} voiceLang={voiceLang} videoFormat={videoFormat} showCaptions={showCaptions} musicStyle={musicStyle} customMusicUrl={customMusicUrl} animStyle={animStyle} filterStyle={filterStyle} styleEffect={styleEffect} motionTracking={motionTracking} watermark={watermark} falVideoUrls={falVideoUrls} />
      {isGenerating && (
        <div className="glass rounded-xl p-5 text-center">
          <div className="animate-pulse space-y-3 mb-3">
            <div className="h-4 bg-white/10 rounded-full w-3/4 mx-auto" />
            <div className="h-3 bg-white/5 rounded-full" />
            <div className="h-3 bg-white/5 rounded-full w-5/6 mx-auto" />
          </div>
          <p className="text-xs text-white/30">AI is writing your video script...</p>
        </div>
      )}
      {script?.callToAction && (
        <div className="glass rounded-xl p-4 border border-brand-500/20 bg-brand-500/5">
          <p className="text-xs text-brand-400 uppercase tracking-wider mb-1 font-medium">Call to Action</p>
          <p className="text-sm text-white/80">{script.callToAction}</p>
        </div>
      )}
      {script?.colorScheme && (
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Color Scheme</p>
          <div className="flex gap-2">
            {Object.entries(script.colorScheme).map(([key, color]) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-6 rounded-md border border-white/10" style={{ backgroundColor: color }} />
                <span className="text-xs text-white/20 truncate w-full text-center">{key.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {script && (
        <div className="flex gap-2">
          <button onClick={() => setShowExporter(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 transition-all text-sm font-medium">
            <Video className="w-4 h-4" />
            Export as Video File
          </button>
          <button onClick={() => { const c = document.querySelector('canvas'); if(!c) return; const a = document.createElement('a'); a.href=c.toDataURL('image/png'); a.download=`${(script?.title||'frame').replace(/\s+/g,'-').toLowerCase()}.png`; a.click(); }}
            disabled={!script}
            className="btn-secondary flex items-center gap-2 disabled:opacity-30 px-3">
            📸 Thumbnail
          </button>
        </div>
      )}
    </div>
  );

  // ── Scenes panel ──────────────────────────────────────────────────────────
  const scenesPanel = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white/80">Scenes {script ? `(${script.scenes?.length})` : ''}</h2>
        {script && <span className="text-xs text-white/30">{totalDuration}s total</span>}
      </div>

      {!script && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-white/30 text-sm">Generate a video to see scenes</p>
        </div>
      )}

      {isGenerating && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded-full w-3/4" />
                  <div className="h-2.5 bg-white/5 rounded-full" />
                  <div className="h-2.5 bg-white/5 rounded-full w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {script?.scenes && !isGenerating && (
        <div className="space-y-2 pb-4">
          {script.scenes.map((scene, index) => (
            <div key={scene.id}>
              <SceneCard
                scene={scene} index={index}
                isActive={currentScene === index}
                isRegenerating={regeneratingScene === index}
                onClick={() => { setCurrentScene(index); setMobileTab('preview'); }}
                onRegenerate={() => {
                  if (feedbackForScene === index) handleRegenerateScene(index, regenerateFeedback);
                  else { setFeedbackForScene(index); setRegenerateFeedback(''); }
                }}
                onEdit={() => setEditingScene(index)}
                onDelete={() => {
                  if (script.scenes.length <= 1) return;
                  setScript(prev => ({ ...prev, scenes: prev.scenes.filter((_, i) => i !== index) }));
                  if (currentScene >= index && currentScene > 0) setCurrentScene(c => c - 1);
                }}
              />
              {feedbackForScene === index && (
                <FeedbackInput
                  value={regenerateFeedback}
                  onChange={e => setRegenerateFeedback(e.target.value)}
                  onSubmit={() => handleRegenerateScene(index, regenerateFeedback)}
                  onCancel={() => setFeedbackForScene(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950 bg-grid flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Video className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold gradient-text">VideoAI</span>
          </div>
          {script && <span className="hidden sm:block text-white/40 text-xs truncate max-w-[140px]">{script.title}</span>}
        </div>

        <div className="flex items-center gap-2">
          {script && (
            <>
              <button onClick={handleCopyScript} className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center" title="Copy script">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowExporter(true)} className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center" title="Export Video">
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => setShowApiKeyModal(true)}
            className={`w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center ${!hasApiKey ? 'border-yellow-500/40 text-yellow-400' : ''}`}
            title="AI Provider Settings">
            <Key className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <aside className="w-80 xl:w-96 flex-shrink-0 border-r border-white/5 overflow-y-auto p-5">
          {configurePanel}
        </aside>
        <div className="flex-1 border-r border-white/5 overflow-y-auto p-5">
          <div className="sticky top-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white/80">Preview</h2>
              {script && (
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <Wand2 className="w-3.5 h-3.5 text-brand-400" />
                  Click play to preview with narration
                </div>
              )}
            </div>
            {previewPanel}
          </div>
        </div>
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-y-auto p-5">
          {scenesPanel}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex-1 overflow-y-auto">
        <div className="p-4 pb-24">
          {mobileTab === 'configure' && configurePanel}
          {mobileTab === 'preview'   && previewPanel}
          {mobileTab === 'scenes'    && scenesPanel}
        </div>
      </div>

      {/* Mobile tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 px-2 py-2 safe-bottom">
        <div className="flex">
          {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
            const isActive  = mobileTab === id;
            const hasNotif  = id === 'preview' && isGenerating;
            return (
              <button key={id} onClick={() => setMobileTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all relative ${
                  isActive ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/70'
                }`}>
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
                {hasNotif && <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
                {id === 'scenes' && script?.scenes?.length > 0 && (
                  <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-brand-500/60 text-white text-[10px] flex items-center justify-center">
                    {script.scenes.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      {editingScene !== null && script?.scenes?.[editingScene] && (
        <SceneEditor scene={script.scenes[editingScene]} onSave={handleSaveScene} onClose={() => setEditingScene(null)} />
      )}
      {showApiKeyModal && (
        <ApiKeyModal onClose={() => { setShowApiKeyModal(false); refreshKeyState(); }} />
      )}
      {showExporter && script && (
        <VideoExporter script={script} onClose={() => setShowExporter(false)} videoFormat={videoFormat} showCaptions={showCaptions} musicStyle={musicStyle} customMusicUrl={customMusicUrl} voiceLang={voiceLang} animStyle={animStyle} filterStyle={filterStyle} styleEffect={styleEffect} motionTracking={motionTracking} watermark={watermark} falVideoUrls={falVideoUrls} />
      )}
      {showMusicPicker && (
        <MusicPicker selectedTrack={selectedTrack} onSelect={handleTrackSelect} onClose={() => setShowMusicPicker(false)} />
      )}
      {showVoiceCustomizer && (
        <VoiceCustomizer voiceLang={voiceLang} onClose={() => setShowVoiceCustomizer(false)} onLangChange={lang => { setVoiceLang(lang); saveVoiceLang(lang); }} />
      )}
    </div>
  );
}
