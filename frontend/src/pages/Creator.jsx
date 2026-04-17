import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, RefreshCw, Download, Copy, Check,
  Settings2, ChevronDown, ChevronUp, Wand2, FileText,
  Palette, Clock, Users, Mic, AlertCircle, Video, Key,
  Play, Layers
} from 'lucide-react';
import { generateScript, regenerateScene } from '../services/api.js';
import { hasValidKey, getSettings, PROVIDERS } from '../services/providers.js';
import VideoPreview from '../components/VideoPreview.jsx';
import SceneCard from '../components/SceneCard.jsx';
import SceneEditor from '../components/SceneEditor.jsx';
import ApiKeyModal from '../components/ApiKeyModal.jsx';

const STYLES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬' },
  { id: 'educational', label: 'Educational', emoji: '📚' },
  { id: 'social', label: 'Social Media', emoji: '📱' },
  { id: 'motivational', label: 'Motivational', emoji: '🔥' },
  { id: 'documentary', label: 'Documentary', emoji: '🎥' },
];

const TONES = ['engaging', 'professional', 'casual', 'inspirational', 'educational', 'humorous'];
const AUDIENCES = ['general', 'beginners', 'professionals', 'students', 'entrepreneurs', 'seniors'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Portuguese', 'Japanese', 'Chinese'];

const MOBILE_TABS = [
  { id: 'configure', label: 'Configure', icon: Settings2 },
  { id: 'preview', label: 'Preview', icon: Play },
  { id: 'scenes', label: 'Scenes', icon: Layers },
];

export default function Creator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form state
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [style, setStyle] = useState(searchParams.get('style') || 'professional');
  const [duration, setDuration] = useState(Number(searchParams.get('duration')) || 60);
  const [tone, setTone] = useState('engaging');
  const [audience, setAudience] = useState('general');
  const [language, setLanguage] = useState('English');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Output state
  const [script, setScript] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [currentScene, setCurrentScene] = useState(0);
  const [regeneratingScene, setRegeneratingScene] = useState(null);
  const [editingScene, setEditingScene] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [feedbackForScene, setFeedbackForScene] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(hasValidKey());
  const [mobileTab, setMobileTab] = useState('configure');

  const refreshKeyState = () => setHasApiKey(hasValidKey());

  const currentProviderName = () => {
    const { providerId } = getSettings();
    return PROVIDERS[providerId]?.name || 'AI';
  };

  useEffect(() => {
    if (searchParams.get('topic') && hasValidKey()) {
      handleGenerate();
    } else if (searchParams.get('topic') && !hasValidKey()) {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    if (!hasValidKey()) { setShowApiKeyModal(true); return; }
    setIsGenerating(true);
    setError('');
    setScript(null);
    setCurrentScene(0);
    setMobileTab('preview');
    try {
      const result = await generateScript({ topic, style, duration, tone, audience, language });
      setScript(result);
      setMobileTab('preview');
    } catch (err) {
      setError(err.message || 'Failed to generate. Check your API key in Settings.');
      setMobileTab('configure');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, style, duration, tone, audience, language]);

  const handleRegenerateScene = async (index, feedback = '') => {
    if (!script) return;
    setRegeneratingScene(index);
    try {
      const updated = await regenerateScene(script.scenes[index], topic, style, feedback);
      setScript(prev => ({
        ...prev,
        scenes: prev.scenes.map((s, i) => i === index ? { ...updated, id: s.id } : s),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRegeneratingScene(null);
      setFeedbackForScene(null);
      setRegenerateFeedback('');
    }
  };

  const handleSaveScene = (updatedScene) => {
    if (!script || editingScene === null) return;
    setScript(prev => ({
      ...prev,
      scenes: prev.scenes.map((s, i) => i === editingScene ? updatedScene : s),
    }));
  };

  const handleCopyScript = () => {
    if (!script) return;
    const text = [
      `# ${script.title}`,
      `\n${script.description}`,
      `\nDuration: ${script.totalDuration}s | Style: ${script.style}`,
      `\n${'='.repeat(50)}`,
      ...script.scenes.map(s => [
        `\n## Scene ${s.id}: ${s.title} (${s.duration}s)`,
        `\n**Narration:** ${s.narration}`,
        s.keyPoints?.length ? `\n**Key Points:**\n${s.keyPoints.map(p => `- ${p}`).join('\n')}` : '',
        `\n**Visual:** ${s.visualDescription}`,
      ].filter(Boolean).join('\n')),
      `\n${'='.repeat(50)}`,
      `\n**Call to Action:** ${script.callToAction}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!script) return;
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalDuration = script?.scenes?.reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

  // ── Shared configure panel ──────────────────────────────────────────────
  const ConfigurePanel = () => (
    <div className="space-y-5 pb-4">
      {!hasApiKey && (
        <button
          onClick={() => setShowApiKeyModal(true)}
          className="w-full flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/15 transition-colors text-left"
        >
          <Key className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-300">API Key Required</p>
            <p className="text-xs text-yellow-400/70">Tap to add your AI API key (Groq is free)</p>
          </div>
        </button>
      )}

      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Video Topic</label>
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. How to build a successful startup..."
          className="input-field resize-none h-24 text-sm"
        />
      </div>

      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium">Style</label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`py-3 px-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                style === s.id
                  ? 'bg-brand-500/25 border border-brand-500/60 text-white'
                  : 'glass glass-hover text-white/60 border border-transparent'
              }`}
            >
              <span className="text-lg">{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-white/50 mb-2 block font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Duration: <span className="text-white">{duration}s ({Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')})</span>
        </label>
        <input type="range" min={30} max={180} step={15} value={duration}
          onChange={e => setDuration(Number(e.target.value))} className="w-full accent-brand-500 h-2" />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>30s</span><span>1min</span><span>2min</span><span>3min</span>
        </div>
      </div>

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
              <label className="text-xs text-white/40 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <Mic className="w-3 h-3" /> Tone
              </label>
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
                <Palette className="w-3 h-3" /> Language
              </label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="input-field text-sm py-2">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
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
    </div>
  );

  // ── Shared preview panel ────────────────────────────────────────────────
  const PreviewPanel = () => (
    <div className="space-y-4">
      <VideoPreview script={script} currentScene={currentScene} onSceneChange={setCurrentScene} />
      {isGenerating && (
        <div className="glass rounded-xl p-5 text-center">
          <div className="animate-pulse space-y-3 mb-3">
            <div className="h-4 bg-white/10 rounded-full w-3/4 mx-auto" />
            <div className="h-3 bg-white/5 rounded-full w-full" />
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
    </div>
  );

  // ── Shared scenes panel ─────────────────────────────────────────────────
  const ScenesPanel = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white/80">Scenes {script ? `(${script.scenes?.length})` : ''}</h2>
        {script && <span className="text-xs text-white/30">{totalDuration}s total</span>}
      </div>

      {!script && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-white/30 text-sm">Generate a video to see scenes here</p>
        </div>
      )}

      {isGenerating && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg" />
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
                <div className="mt-1 flex gap-2 px-1">
                  <input type="text" value={regenerateFeedback}
                    onChange={e => setRegenerateFeedback(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRegenerateScene(index, regenerateFeedback);
                      if (e.key === 'Escape') setFeedbackForScene(null);
                    }}
                    placeholder="Feedback for AI... (Enter to regenerate)"
                    className="input-field text-xs py-2 flex-1" autoFocus
                  />
                  <button onClick={() => handleRegenerateScene(index, regenerateFeedback)}
                    className="btn-primary text-xs py-2 px-3">Go</button>
                </div>
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
          <button onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Video className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold gradient-text">VideoAI</span>
          </div>
          {script && (
            <span className="hidden sm:block text-white/40 text-xs truncate max-w-[140px]">{script.title}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {script && (
            <>
              <button onClick={handleCopyScript}
                className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center"
                title="Copy script">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={handleExport}
                className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center"
                title="Export JSON">
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

      {/* ── DESKTOP layout (lg+) ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-80 xl:w-96 flex-shrink-0 border-r border-white/5 overflow-y-auto p-5">
          <ConfigurePanel />
        </aside>
        {/* Preview */}
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
            <PreviewPanel />
          </div>
        </div>
        {/* Scenes */}
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-y-auto p-5">
          <ScenesPanel />
        </div>
      </div>

      {/* ── MOBILE layout (< lg) ─────────────────────────────────────── */}
      <div className="lg:hidden flex-1 overflow-y-auto">
        <div className="p-4 pb-24">
          {mobileTab === 'configure' && <ConfigurePanel />}
          {mobileTab === 'preview' && <PreviewPanel />}
          {mobileTab === 'scenes' && <ScenesPanel />}
        </div>
      </div>

      {/* ── MOBILE bottom tab bar ────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 px-2 py-2 safe-bottom">
        <div className="flex">
          {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = mobileTab === id;
            const hasNotif = id === 'preview' && isGenerating;
            return (
              <button key={id} onClick={() => setMobileTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all relative ${
                  isActive ? 'bg-brand-500/20 text-brand-400' : 'text-white/40 hover:text-white/70'
                }`}>
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
                {hasNotif && (
                  <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                )}
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
    </div>
  );
}
