import { useState } from 'react';
import { X, Key, Eye, EyeOff, ExternalLink, Shield, Check, ChevronDown, Mic } from 'lucide-react';
import { PROVIDER_LIST, PROVIDERS, getSettings, saveSettings } from '../services/providers.js';
import { getElevenLabsSettings, saveElevenLabsSettings, ELEVENLABS_VOICES } from '../services/tts.js';

export default function ApiKeyModal({ onClose }) {
  const current = getSettings();
  const elSettings = getElevenLabsSettings();

  const [selectedProvider, setSelectedProvider] = useState(current.providerId || 'groq');
  const [selectedModel, setSelectedModel] = useState(current.modelId || PROVIDERS.groq.defaultModel);
  const [apiKey, setApiKey] = useState(localStorage.getItem(`ai_key_${current.providerId || 'groq'}`) || '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'voice'
  const [elKey, setElKey] = useState(elSettings.apiKey);
  const [elVoice, setElVoice] = useState(elSettings.voiceId);
  const [showEl, setShowEl] = useState(false);

  const provider = PROVIDERS[selectedProvider];

  const handleProviderChange = (pid) => {
    setSelectedProvider(pid);
    setSelectedModel(PROVIDERS[pid].defaultModel);
    setApiKey(localStorage.getItem(`ai_key_${pid}`) || '');
    setShow(false);
  };

  const handleSave = () => {
    saveSettings({ providerId: selectedProvider, modelId: selectedModel, apiKey: apiKey.trim() });
    saveElevenLabsSettings(elKey.trim(), elVoice);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">Settings</h3>
            <p className="text-sm text-white/40 mt-0.5">AI Provider & Voice</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 glass rounded-xl p-1 mb-5">
          <button onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              activeTab === 'ai' ? 'bg-brand-500/30 text-white' : 'text-white/50 hover:text-white'
            }`}>
            <Key className="w-4 h-4" /> AI Provider
          </button>
          <button onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              activeTab === 'voice' ? 'bg-brand-500/30 text-white' : 'text-white/50 hover:text-white'
            }`}>
            <Mic className="w-4 h-4" /> Realistic Voice
            {elKey && <span className="w-2 h-2 rounded-full bg-green-400" />}
          </button>
        </div>

        {activeTab === 'voice' && (
          <div className="space-y-4 mb-4">
            <div className="flex gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <Mic className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/70 leading-relaxed">
                <strong className="text-white">ElevenLabs</strong> gives you realistic human-like voices in
                Hindi, Punjabi, English, Spanish and 25+ more languages.{' '}
                <span className="text-green-400">Free tier: 10,000 chars/month.</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/50">ElevenLabs API Key</label>
                <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  Get free key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input type={showEl ? 'text' : 'password'} value={elKey} onChange={e => setElKey(e.target.value)}
                  placeholder="sk_..." className="input-field pr-10 font-mono text-sm" />
                <button type="button" onClick={() => setShowEl(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  {showEl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-white/50 mb-2 block">Voice Character</label>
              <div className="grid grid-cols-2 gap-2">
                {ELEVENLABS_VOICES.map(v => (
                  <button key={v.id} onClick={() => setElVoice(v.id)}
                    className={`py-2.5 px-3 rounded-xl text-left text-sm transition-all border ${
                      elVoice === v.id ? 'bg-brand-500/20 border-brand-500/50' : 'glass border-white/10 hover:border-white/20'
                    }`}>
                    <p className="font-medium text-white">{v.name}</p>
                    <p className="text-xs text-white/40">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-white/30 leading-relaxed">
              Without ElevenLabs, browser voices are used (quality depends on your device). iOS has Hindi voice "Lekha".
            </p>
          </div>
        )}

        {/* Provider Grid — only shown on AI tab */}
        {activeTab === 'ai' && <div className="mb-5">
          <label className="text-sm text-white/50 mb-3 block font-medium">Choose AI Provider</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDER_LIST.map(p => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`relative p-3 rounded-xl text-left transition-all border ${
                  selectedProvider === p.id
                    ? 'bg-brand-500/15 border-brand-500/50'
                    : 'glass border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-bold text-white leading-tight">{p.name}</span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${p.badgeColor}`}>
                  {p.badge}
                </span>
                {selectedProvider === p.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Selected provider detail */}
        {provider && (
          <div className="space-y-4">
            <div className="flex gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
              <span className="text-2xl">{provider.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-white">{provider.name}</p>
                <p className="text-xs text-white/50 mt-0.5">{provider.description}</p>
                <p className="text-xs text-green-400 mt-1 font-medium">{provider.pricing}</p>
              </div>
            </div>

            {/* Model selector */}
            <div>
              <label className="text-sm text-white/50 mb-2 block">Model</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="input-field pr-8 appearance-none"
                >
                  {provider.models.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.tag ? ` — ${m.tag}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>

            {/* API Key input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/50">API Key</label>
                <a
                  href={provider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                >
                  Get free key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && apiKey.trim() && handleSave()}
                  placeholder={provider.keyPlaceholder}
                  className="input-field pr-12 font-mono text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security note */}
            <div className="flex gap-2 p-3 bg-white/5 rounded-xl">
              <Shield className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/40 leading-relaxed">
                Your key is stored <strong className="text-white/60">only in this browser</strong> (localStorage) and sent directly to {provider.name}'s API — never to any server.
              </p>
            </div>
          </div>
        )}

        {/* Quick guide for free providers */}
        {activeTab === 'ai' && (selectedProvider === 'groq' || selectedProvider === 'gemini' || selectedProvider === 'openrouter') && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-xs font-semibold text-green-400 mb-1">
              {selectedProvider === 'groq' && '⚡ Groq is completely FREE — just sign up and create a key!'}
              {selectedProvider === 'gemini' && '✨ Gemini Flash has a free quota — 15 requests/min, no billing needed!'}
              {selectedProvider === 'openrouter' && '🌐 OpenRouter free models need only an account — no credit card!'}
            </p>
            <p className="text-xs text-green-400/70">
              Click "Get free key" above → sign up → copy the key → paste here.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-5 border-t border-white/10">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : (
              <><Key className="w-4 h-4" /> Save & Use {provider?.name}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
