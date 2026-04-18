import { useState, useEffect, useRef } from 'react';
import { X, Play, Loader2, Check, Mic, ExternalLink } from 'lucide-react';
import {
  VOICE_LANGUAGES,
  getVoiceSettings, saveVoiceSettings,
  getElevenLabsSettings, saveElevenLabsSettings,
  fetchHuggingFaceTTS, speakBrowser,
  getAllVoices, saveVoiceLang,
} from '../services/tts.js';

const SAMPLE_TEXTS = {
  'hi-IN': 'नमस्ते! यह एक परीक्षण आवाज़ है। मैं आपके वीडियो के लिए बोलूंगा।',
  'pa-IN': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਇਹ ਇੱਕ ਟੈਸਟ ਆਵਾਜ਼ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਵੀਡੀਓ ਲਈ ਬੋਲਾਂਗਾ।',
  'en-US': 'Hello! This is a test voice. I will narrate your video.',
  'en-GB': 'Hello! This is a test voice. I will narrate your video.',
  'es-ES': '¡Hola! Esta es una voz de prueba para tu vídeo.',
  'fr-FR': 'Bonjour! Ceci est une voix de test pour votre vidéo.',
  'de-DE': 'Hallo! Dies ist eine Teststimme für Ihr Video.',
  'ar-SA': 'مرحبا! هذا اختبار للصوت لمقطع الفيديو الخاص بك.',
  'ja-JP': 'こんにちは！これはビデオのテスト音声です。',
  'zh-CN': '你好！这是您视频的测试声音。',
  'ko-KR': '안녕하세요! 이것은 동영상의 테스트 음성입니다.',
  default: 'Hello! This is a test of the selected AI voice.',
};

const HF_LANGS = ['hi-IN', 'pa-IN', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'ar-SA', 'ja-JP', 'zh-CN', 'ko-KR', 'pt-BR'];

// Play audio blob via AudioContext (handles FLAC/WAV on all devices)
async function playAudioBlob(blob, onEnd) {
  const arrayBuf = await blob.arrayBuffer();
  const actx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await actx.decodeAudioData(arrayBuf);
  const src = actx.createBufferSource();
  src.buffer = decoded;
  src.connect(actx.destination);
  src.onended = () => { actx.close(); onEnd?.(); };
  src.start(0);
  return () => { src.stop(); actx.close(); };
}

export default function VoiceCustomizer({ onClose, voiceLang = 'en-US', onLangChange }) {
  const settings   = getVoiceSettings();
  const elSettings = getElevenLabsSettings();

  const [provider,    setProvider]    = useState(settings.provider);
  const [rate,        setRate]        = useState(settings.rate);
  const [pitch,       setPitch]       = useState(settings.pitch);
  const [hfToken,     setHfToken]     = useState(settings.hfToken);
  const [voiceURI,    setVoiceURI]    = useState(settings.voiceURI);
  const [selectedLang,setSelectedLang]= useState(voiceLang);
  const [voices,      setVoices]      = useState([]);
  const [langFilter,  setLangFilter]  = useState(voiceLang);
  const [testing,     setTesting]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [testError,   setTestError]   = useState('');
  const stopAudioRef = useRef(null);

  useEffect(() => { getAllVoices().then(setVoices); }, []);

  const filteredVoices = (() => {
    const base  = langFilter.split('-')[0];
    const exact = voices.filter(v => v.lang === langFilter);
    const near  = voices.filter(v => v.lang.startsWith(base) && v.lang !== langFilter);
    return [...exact, ...near].slice(0, 20);
  })();

  const sampleText = SAMPLE_TEXTS[selectedLang] || SAMPLE_TEXTS.default;

  const handleTest = async () => {
    setTesting(true); setTestError('');
    if (stopAudioRef.current) { stopAudioRef.current(); stopAudioRef.current = null; }
    window.speechSynthesis?.cancel();

    try {
      if (provider === 'hf') {
        const blob = await fetchHuggingFaceTTS(sampleText, selectedLang);
        stopAudioRef.current = await playAudioBlob(blob, () => setTesting(false));
        return;
      }
      if (provider === 'browser') {
        const utt = await speakBrowser(sampleText, selectedLang, () => setTesting(false));
        if (!utt) setTesting(false);
        return;
      }
      // ElevenLabs — just inform user
      setTestError('ElevenLabs preview: press Play in the video preview.');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('503') || msg.includes('loading')) {
        setTestError('Model loading on HuggingFace servers — wait 20s and try again.');
      } else if (msg.includes('429') || msg.includes('rate')) {
        setTestError('Rate limited — add a free HuggingFace token for more requests.');
      } else if (msg.includes('401') || msg.includes('403')) {
        setTestError('Invalid token — check your HuggingFace token.');
      } else {
        setTestError(`Error: ${msg || 'Could not load voice. Check your connection.'}`);
      }
    }
    setTesting(false);
  };

  const handleSave = () => {
    saveVoiceSettings({ provider, rate, pitch, voiceURI, hfToken });
    saveVoiceLang(selectedLang);
    onLangChange?.(selectedLang);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass glass-hover">
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Voice Customizer</h2>
          <p className="text-[10px] text-white/40">Choose your AI voice source</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Provider selector */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'hf',         icon: '🤗', title: 'HuggingFace AI', sub: 'Free · Hindi · Punjabi', color: 'from-yellow-500/20 to-orange-500/20', border: 'border-yellow-500/40' },
            { id: 'browser',    icon: '📱', title: 'Device Voice',   sub: 'Unlimited · On-device',  color: 'from-blue-500/20 to-cyan-500/20',    border: 'border-blue-500/40' },
            { id: 'elevenlabs', icon: '🎙️', title: 'ElevenLabs',    sub: 'Premium · Realistic',    color: 'from-purple-500/20 to-pink-500/20',  border: 'border-purple-500/40' },
          ].map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                provider === p.id
                  ? `bg-gradient-to-br ${p.color} ${p.border}`
                  : 'glass border-white/10 hover:border-white/20'
              }`}>
              <span className="text-2xl">{p.icon}</span>
              <p className="text-xs font-semibold text-white leading-tight text-center">{p.title}</p>
              <p className="text-[9px] text-white/40 text-center leading-tight">{p.sub}</p>
              {provider === p.id && <Check className="w-3 h-3 text-white/70" />}
            </button>
          ))}
        </div>

        {/* HuggingFace settings */}
        {provider === 'hf' && (
          <div className="space-y-3">
            <div className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <span className="text-lg flex-shrink-0">🤗</span>
              <p className="text-xs text-white/70 leading-relaxed">
                <strong className="text-white">HuggingFace MMS</strong> — Meta's free AI TTS. Tap a language below to select it, then tap Test Voice.
              </p>
            </div>

            {/* Optional token */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-white/50">Token (optional — for higher limits)</label>
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-400 flex items-center gap-1">
                  Get free <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input type="text" value={hfToken} onChange={e => setHfToken(e.target.value)}
                placeholder="hf_... (leave blank to use without token)"
                className="input-field text-xs font-mono" />
            </div>

            {/* Clickable language selector */}
            <div>
              <p className="text-xs text-white/50 mb-2">👇 Tap to select your language</p>
              <div className="grid grid-cols-3 gap-2">
                {HF_LANGS.map(l => {
                  const lang = VOICE_LANGUAGES.find(v => v.id === l);
                  if (!lang) return null;
                  const isSelected = selectedLang === l;
                  return (
                    <button key={l}
                      onClick={() => setSelectedLang(l)}
                      className={`rounded-xl p-2.5 text-center transition-all border-2 ${
                        isSelected
                          ? 'bg-brand-500/25 border-brand-500/60'
                          : 'glass border-transparent hover:border-white/20'
                      }`}>
                      <p className="text-xl mb-0.5">{lang.flag}</p>
                      <p className="text-[10px] text-white font-medium">{lang.label}</p>
                      {isSelected
                        ? <p className="text-[9px] text-brand-400 font-semibold mt-0.5">✓ Selected</p>
                        : <p className="text-[9px] text-green-400/70 mt-0.5">AI voice</p>
                      }
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Browser voice settings */}
        {provider === 'browser' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-2 block">Filter by Language</label>
              <div className="flex gap-1.5 flex-wrap">
                {VOICE_LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setLangFilter(l.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                      langFilter === l.id ? 'bg-brand-500/30 text-brand-300 border border-brand-500/50' : 'glass text-white/50 hover:text-white'
                    }`}>
                    <span>{l.flag}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {filteredVoices.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-sm text-white/40">No voices for this language on your device.</p>
                <p className="text-xs text-white/30 mt-1">Try English or install the language pack in device Settings.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredVoices.map(v => (
                  <button key={v.voiceURI} onClick={() => setVoiceURI(v.voiceURI)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      voiceURI === v.voiceURI ? 'bg-brand-500/15 border border-brand-500/30' : 'glass hover:bg-white/5'
                    }`}>
                    <Mic className={`w-4 h-4 flex-shrink-0 ${voiceURI === v.voiceURI ? 'text-brand-400' : 'text-white/30'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{v.name}</p>
                      <p className="text-[10px] text-white/40">{v.lang}{v.localService ? ' · On-device' : ' · Network'}</p>
                    </div>
                    {voiceURI === v.voiceURI && <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ElevenLabs */}
        {provider === 'elevenlabs' && (
          <div className="glass rounded-xl p-4 text-center space-y-2">
            <p className="text-sm text-white/60">Uses your ElevenLabs key from <strong className="text-white">Settings → Voice</strong></p>
            <p className="text-xs text-white/40">Premium quality · 10,000 chars/month free · Realistic emotion</p>
          </div>
        )}

        {/* Speed */}
        {provider !== 'elevenlabs' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-white/50">Speaking Speed</label>
                <span className="text-xs text-white font-mono">{rate.toFixed(1)}x</span>
              </div>
              <input type="range" min={0.5} max={2.0} step={0.1} value={rate}
                onChange={e => setRate(parseFloat(e.target.value))}
                className="w-full accent-brand-500 h-2" />
              <div className="flex justify-between text-[10px] text-white/25 mt-1">
                <span>Slow 0.5x</span><span>Normal 1.0x</span><span>Fast 2.0x</span>
              </div>
            </div>
            {provider === 'browser' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-white/50">Pitch</label>
                  <span className="text-xs text-white font-mono">{pitch.toFixed(1)}</span>
                </div>
                <input type="range" min={0.5} max={2.0} step={0.1} value={pitch}
                  onChange={e => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-brand-500 h-2" />
                <div className="flex justify-between text-[10px] text-white/25 mt-1">
                  <span>Deep 0.5</span><span>Normal 1.0</span><span>High 2.0</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test */}
        <div className="space-y-1.5">
          <button onClick={handleTest} disabled={testing}
            className="w-full flex items-center justify-center gap-2 py-3 glass glass-hover rounded-xl text-sm font-medium disabled:opacity-40 transition-all border border-white/10">
            {testing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</>
              : <><Play className="w-4 h-4" /> Test Voice</>
            }
          </button>
          {testError && <p className="text-xs text-red-400 text-center px-2">{testError}</p>}
          {provider === 'hf' && !testError && (
            <p className="text-[10px] text-white/30 text-center">First test may take ~20s while model loads</p>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="px-4 pb-6 pt-3 border-t border-white/10 flex-shrink-0">
        <button onClick={handleSave}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Voice Settings'}
        </button>
      </div>
    </div>
  );
}
