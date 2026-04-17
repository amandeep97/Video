import { useState } from 'react';
import { X, Key, Eye, EyeOff, ExternalLink, Shield, Trash2, Check } from 'lucide-react';
import { saveApiKey, loadApiKey, clearApiKey } from '../services/api.js';

export default function ApiKeyModal({ onClose }) {
  const [key, setKey] = useState(loadApiKey());
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveApiKey(key.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const handleClear = () => {
    clearApiKey();
    setKey('');
  };

  const maskedKey = key.length > 8
    ? key.slice(0, 7) + '•'.repeat(Math.min(key.length - 10, 20)) + key.slice(-4)
    : key;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">API Key Settings</h3>
              <p className="text-xs text-white/40">Required to generate AI videos</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Info box */}
          <div className="flex gap-3 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl">
            <Shield className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/70 leading-relaxed">
              Your API key is stored <strong className="text-white">only in your browser</strong> (localStorage) and never sent to any server — it goes directly to Anthropic's API.
            </div>
          </div>

          {/* Key input */}
          <div>
            <label className="text-sm text-white/50 mb-2 block">Anthropic API Key</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="sk-ant-api03-..."
                className="input-field pr-24 font-mono text-sm"
                autoFocus
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {key && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Get key link */}
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>Don't have a key?</span>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              Get one free at console.anthropic.com
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-5 border-t border-white/10">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : (
              <><Key className="w-4 h-4" /> Save Key</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
