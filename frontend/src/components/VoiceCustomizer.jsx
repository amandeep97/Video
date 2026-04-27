import { useState, useEffect, useRef } from 'react';
import { X, Play, Loader2, Check, Mic, ExternalLink } from 'lucide-react';
import {
  VOICE_LANGUAGES,
  getVoiceSettings, saveVoiceSettings,
  getElevenLabsSettings, saveElevenLabsSettings,
  fetchHuggingFaceTTS, fetchCloudTTS, speakBrowser,
  getAllVoices, saveVoiceLang,
} from '../services/tts.js';

const EL_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',  desc: 'Calm · Female · English' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',    desc: 'Strong · Female · English' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',   desc: 'Soft · Female · English' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',  desc: 'Warm · Male · English' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',    desc: 'Deep · Male · English' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',    desc: 'Narration · Male · English' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',     desc: 'News · Male · English' },
];

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

// Play audio blob — accepts a pre-unlocked AudioContext (required for iOS)
async function playAudioBlob(blob, actx, onEnd) {
  // Try AudioContext decode (Chrome, Firefox, modern Safari)
  try {
    const arrayBuf = await blob.arrayBuffer();
    const decoded = await actx.decodeAudioData(arrayBuf);
    const src = actx.createBufferSource();
    src.buffer = decoded;
    src.connect(actx.destination);
    src.onended = () => { actx.close(); onEnd?.(); };
    src.start(0);
    return () => { try { src.stop(); } catch {} actx.close(); };
  } catch {
    actx.close().catch(() => {});
  }
  // Fallback: native <audio> element (handles FLAC on iOS Safari)
  const url = URL.createObjectURL(blob);
  const audio = document.createElement('audio');
  audio.src = url;
  document.body.appendChild(audio);
  audio.onended = () => { URL.revokeObjectURL(url); audio.remove(); onEnd?.(); };
  audio.onerror = () => { URL.revokeObjectURL(url); audio.remove(); onEnd?.(); };
  audio.play().catch(() => onEnd?.());
  return () => { audio.pause(); URL.revokeObjectURL(url); try { audio.remove(); } catch {} };
}

export default function VoiceCustomizer({ onClose, voiceLang = 'en-US', onLangChange }) {
  const settings   = getVoiceSettings();
  const elSettings = getElevenLabsSettings();

  const [elVoiceId,   setElVoiceId]   = useState(elSettings.voiceId || '21m00Tcm4TlvDq8ikWAM');
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

    // ── iOS audio unlock: create & resume AudioContext synchronously
    // before any await, so iOS Safari doesn't block playback ──────────
    let actx = null;
    if (provider === 'hf') {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        // play a silent 1-sample buffer to fully unlock iOS audio session
        const silent = actx.createBuffer(1, 1, 22050);
        const silSrc = actx.createBufferSource();
        silSrc.buffer = silent;
        silSrc.connect(actx.destination);
        silSrc.start(0);
      } catch {}
    }

    try {
      if (provider === 'cloud') {
        const blob = await fetchCloudTTS(sampleText, selectedLang);
        stopAudioRef.current = await playAudioBlob(blob, actx, () => setTesting(false));
        return;
      }
      if (provider === 'hf') {
        const blob = await fetchHuggingFaceTTS(sampleText, selectedLang);
        stopAudioRef.current = await playAudioBlob(blob, actx, () => setTesting(false));
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
      actx?.close().catch(() => {});
      const msg = e.message || '';
      if (msg === 'loading' || msg.includes('503')) {
        setTestError('Model is starting up — wait 20–30 seconds and tap Test Voice again.');
      } else if (msg === 'timeout') {
        setTestError('HuggingFace took too long. The model is loading — wait 30s and try again.');
      } else if (msg === 'ratelimit' || msg.includes('429')) {
        setTestError('Too many requests — add a free HuggingFace token to get more.');
      } else if (msg === 'network' || msg.toLowerCase().includes('load') || msg.toLowerCase().includes('network')) {
        setTestError('Connection failed. Check your internet and try again.');
      } else if (msg.includes('401') || msg.includes('403')) {
        setTestError('Invalid token — check your HuggingFace token.');
      } else {
        setTestError(`Error: ${msg || 'Check your internet connection and try again.'}`);
      }
    }
    setTesting(false);
  };

  const handleSave = () => {
    saveVoiceSettings({ provider, rate, pitch, voiceURI, hfToken });
    saveElevenLabsSettings(undefined, elVoiceId);
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
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'cloud',      icon: '☁️', title: 'Cloud Voice',    sub: '✅ Free · iPhone · Hindi',   color: 'from-green-500/20 to-teal-500/20',   border: 'border-green-500/40',  badge: 'RECOMMENDED' },
            { id: 'elevenlabs', icon: '🎙️', title: 'ElevenLabs',    sub: 'Best quality · Free tier',   color: 'from-purple-500/20 to-pink-500/20',  border: 'border-purple-500/40', badge: null },
            { id: 'browser',    icon: '📱', title: 'Device Voice',   sub: 'On-device · No internet',    color: 'from-blue-500/20 to-cyan-500/20',    border: 'border-blue-500/40',   badge: null },
            { id: 'hf',         icon: '🤗', title: 'HuggingFace',   sub: 'AI · needs token + wifi',    color: 'from-yellow-500/20 to-orange-500/20',border: 'border-yellow-500/40', badge: null },
          ].map(p => (
            <button key={p.id} onClick={() => setProvider(p.id)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                provider === p.id
                  ? `bg-gradient-to-br ${p.color} ${p.border}`
                  : 'glass border-white/10 hover:border-white/20'
              }`}>
              {p.badge && <span className="absolute top-1.5 right-1.5 text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">{p.badge}</span>}
              <span className="text-2xl">{p.icon}</span>
              <p className="text-xs font-semibold text-white leading-tight text-center">{p.title}</p>
              <p className="text-[9px] text-white/40 text-center leading-tight">{p.sub}</p>
              {provider === p.id && <Check className="w-3 h-3 text-white/70" />}
            </button>
          ))}
        </div>

        {/* Cloud Voice info */}
        {provider === 'cloud' && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl space-y-1.5">
            <p className="text-xs text-white/80 font-semibold">☁️ Cloud Voice — Free, works on iPhone</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Uses Amazon Polly voices via StreamElements. <strong className="text-white">No sign-up needed.</strong> Returns MP3 which plays on every device.
            </p>
            <p className="text-xs text-white/50">Hindi 🇮🇳 and Punjabi 🇮🇳 voices available. Tap a language below then Test Voice.</p>
          </div>
        )}

        {/* HuggingFace settings */}
        {provider === 'hf' && (
          <div className="space-y-3">
            <div className="space-y-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-xs text-white/80 font-semibold">🤗 HuggingFace AI — Setup Steps</p>
              <ol className="text-xs text-white/60 space-y-1 list-none">
                <li>1️⃣ Go to <strong className="text-white">huggingface.co</strong> → Sign up free</li>
                <li>2️⃣ Settings → Access Tokens → <strong className="text-white">New Token</strong> (type: Read)</li>
                <li>3️⃣ Copy the token (starts with <code className="text-yellow-300">hf_</code>)</li>
                <li>4️⃣ Paste it in the field below, then Test Voice</li>
              </ol>
              <p className="text-[10px] text-yellow-400/60">Token fixes "Connection failed" errors on iPhone</p>
            </div>

            {/* Token field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-white/50">HuggingFace Token <span className="text-yellow-400">*required on iPhone</span></label>
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-400 flex items-center gap-1">
                  Get free <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input type="text" value={hfToken} onChange={e => setHfToken(e.target.value)}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
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

        {/* Language picker for Cloud Voice */}
        {provider === 'cloud' && (
          <div>
            <p className="text-xs text-white/50 mb-2">👇 Tap to select your language</p>
            <div className="grid grid-cols-3 gap-2">
              {HF_LANGS.map(l => {
                const lang = VOICE_LANGUAGES.find(v => v.id === l);
                if (!lang) return null;
                const isSelected = selectedLang === l;
                return (
                  <button key={l} onClick={() => setSelectedLang(l)}
                    className={`rounded-xl p-2.5 text-center transition-all border-2 ${
                      isSelected ? 'bg-brand-500/25 border-brand-500/60' : 'glass border-transparent hover:border-white/20'
                    }`}>
                    <p className="text-xl mb-0.5">{lang.flag}</p>
                    <p className="text-[10px] text-white font-medium">{lang.label}</p>
                    {isSelected
                      ? <p className="text-[9px] text-brand-400 font-semibold mt-0.5">✓ Selected</p>
                      : <p className="text-[9px] text-green-400/70 mt-0.5">Cloud voice</p>
                    }
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Browser voice settings */}
        {provider === 'browser' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5">
              <p className="text-xs text-white/80 font-semibold">📱 Add Hindi/Punjabi on iPhone</p>
              <ol className="text-xs text-white/60 space-y-1 list-none">
                <li>1️⃣ iPhone <strong className="text-white">Settings</strong> → Accessibility</li>
                <li>2️⃣ <strong className="text-white">Spoken Content</strong> → Voices</li>
                <li>3️⃣ Tap <strong className="text-white">Hindi</strong> or <strong className="text-white">Punjabi</strong> → download a voice</li>
                <li>4️⃣ Come back here and select it below</li>
              </ol>
            </div>
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
          <div className="space-y-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1.5">
              <p className="text-xs text-white/80 font-semibold">🎙️ ElevenLabs Setup</p>
              <ol className="text-xs text-white/60 space-y-1 list-none">
                <li>1️⃣ Go to <strong className="text-white">elevenlabs.io</strong> → Sign up free</li>
                <li>2️⃣ Add your API key in <strong className="text-white">Settings → Voice</strong></li>
                <li>3️⃣ Pick a voice below (or paste your own cloned voice ID)</li>
              </ol>
              <p className="text-[10px] text-purple-300/60">Free: 10,000 chars/month · Realistic emotion · Multilingual</p>
            </div>

            {/* Preset voices */}
            <div>
              <label className="text-xs text-white/50 mb-2 block">Choose Voice</label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {EL_VOICES.map(v => (
                  <button key={v.id} onClick={() => setElVoiceId(v.id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all ${
                      elVoiceId === v.id ? 'bg-purple-500/15 border border-purple-500/30' : 'glass hover:bg-white/5'
                    }`}>
                    <div>
                      <p className="text-sm font-medium text-white">{v.name}</p>
                      <p className="text-[10px] text-white/40">{v.desc}</p>
                    </div>
                    {elVoiceId === v.id && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom cloned voice ID */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Or paste your Cloned Voice ID</label>
              <input type="text" value={elVoiceId} onChange={e => setElVoiceId(e.target.value)}
                placeholder="e.g. pNInz6obpgDQGcFmaJgB"
                className="input-field text-xs font-mono" />
              <p className="text-[10px] text-white/25 mt-1">
                ElevenLabs → Voice Lab → Instant Voice Clone → copy the ID
              </p>
            </div>
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
          {testError && (
            <div className="space-y-1">
              <p className="text-xs text-red-400 text-center px-2">{testError}</p>
              {provider === 'hf' && (
                <p className="text-[10px] text-yellow-400/70 text-center px-2">
                  📱 On iPhone? Tap <strong>Device Voice</strong> above — it works great for Hindi &amp; Punjabi with no internet needed.
                </p>
              )}
            </div>
          )}
          {provider === 'hf' && !testError && (
            <p className="text-[10px] text-white/30 text-center">First test takes ~20–30s while model loads on HuggingFace</p>
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
