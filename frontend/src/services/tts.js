export const VOICE_LANGUAGES = [
  { id: 'en-US',    label: 'English (US)',  flag: '🇺🇸', elCode: 'en', hfModel: 'facebook/mms-tts-eng' },
  { id: 'en-GB',    label: 'English (UK)',  flag: '🇬🇧', elCode: 'en', hfModel: 'facebook/mms-tts-eng' },
  { id: 'hi-IN',    label: 'Hindi',         flag: '🇮🇳', elCode: 'hi', hfModel: 'facebook/mms-tts-hin' },
  { id: 'pa-IN',    label: 'Punjabi',       flag: '🇮🇳', elCode: 'pa', hfModel: 'facebook/mms-tts-pan' },
  { id: 'es-ES',    label: 'Spanish',       flag: '🇪🇸', elCode: 'es', hfModel: 'facebook/mms-tts-spa' },
  { id: 'fr-FR',    label: 'French',        flag: '🇫🇷', elCode: 'fr', hfModel: 'facebook/mms-tts-fra' },
  { id: 'de-DE',    label: 'German',        flag: '🇩🇪', elCode: 'de', hfModel: 'facebook/mms-tts-deu' },
  { id: 'pt-BR',    label: 'Portuguese',    flag: '🇧🇷', elCode: 'pt', hfModel: 'facebook/mms-tts-por' },
  { id: 'ar-SA',    label: 'Arabic',        flag: '🇸🇦', elCode: 'ar', hfModel: 'facebook/mms-tts-ara' },
  { id: 'ja-JP',    label: 'Japanese',      flag: '🇯🇵', elCode: 'ja', hfModel: 'facebook/mms-tts-jpn' },
  { id: 'zh-CN',    label: 'Chinese',       flag: '🇨🇳', elCode: 'zh', hfModel: 'facebook/mms-tts-cmn' },
  { id: 'ko-KR',    label: 'Korean',        flag: '🇰🇷', elCode: 'ko', hfModel: 'facebook/mms-tts-kor' },
];

// Popular ElevenLabs voice IDs (eleven_multilingual_v2 model)
export const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Calm, female' },
  { id: 'ErXwobaYiN019PkySvjV',  name: 'Antoni', desc: 'Well-rounded, male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',  desc: 'Soft, female' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', desc: 'Crisp, male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   desc: 'Deep, male' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',    desc: 'Raspy, male' },
];

// ── Voice settings ────────────────────────────────────────────────────────────

export function getVoiceSettings() {
  return {
    provider:  localStorage.getItem('voice_provider')  || 'browser', // 'browser' | 'hf' | 'elevenlabs'
    rate:      parseFloat(localStorage.getItem('voice_rate')  || '0.9'),
    pitch:     parseFloat(localStorage.getItem('voice_pitch') || '1.0'),
    voiceURI:  localStorage.getItem('voice_uri')       || '',
    hfToken:   localStorage.getItem('hf_token')        || '',
  };
}

export function saveVoiceSettings({ provider, rate, pitch, voiceURI, hfToken } = {}) {
  if (provider  !== undefined) localStorage.setItem('voice_provider',  provider);
  if (rate      !== undefined) localStorage.setItem('voice_rate',      String(rate));
  if (pitch     !== undefined) localStorage.setItem('voice_pitch',     String(pitch));
  if (voiceURI  !== undefined) localStorage.setItem('voice_uri',       voiceURI);
  if (hfToken   !== undefined) localStorage.setItem('hf_token',        hfToken);
}

// ── HuggingFace free TTS ──────────────────────────────────────────────────────

export async function fetchHuggingFaceTTS(text, langCode = 'en-US') {
  const { hfToken } = getVoiceSettings();
  const lang = VOICE_LANGUAGES.find(l => l.id === langCode);
  const model = lang?.hfModel || 'facebook/mms-tts-eng';

  const headers = { 'Content-Type': 'application/json' };
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ inputs: text }),
  });
  if (res.status === 503) throw new Error('Model loading, please try again in 20s');
  if (!res.ok) throw new Error(`HF TTS error ${res.status}`);
  return await res.blob(); // returns audio/flac
}

// ── Browser TTS ───────────────────────────────────────────────────────────────

function waitForVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis?.getVoices();
    if (voices?.length) return resolve(voices);
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(window.speechSynthesis.getVoices());
    setTimeout(() => resolve(window.speechSynthesis?.getVoices() || []), 1500);
  });
}

export async function getAvailableVoices(langCode) {
  const voices = await waitForVoices();
  const base = langCode?.split('-')[0] || 'en';
  const langMatch = voices.filter(v => v.lang === langCode);
  const baseMatch = voices.filter(v => v.lang.startsWith(base) && !langMatch.includes(v));
  return [...langMatch, ...baseMatch];
}

export async function getAllVoices() {
  return waitForVoices();
}

export async function getBestBrowserVoice(langCode) {
  const { voiceURI } = getVoiceSettings();
  const voices = await waitForVoices();
  if (voiceURI) {
    const saved = voices.find(v => v.voiceURI === voiceURI);
    if (saved) return saved;
  }
  const base = langCode.split('-')[0];
  return (
    voices.find(v => v.lang === langCode) ||
    voices.find(v => v.lang.startsWith(base)) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

export async function speakBrowser(text, langCode = 'en-US', onEnd) {
  if (!window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const { rate, pitch } = getVoiceSettings();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang  = langCode;
  utt.rate  = rate;
  utt.pitch = pitch;
  const voice = await getBestBrowserVoice(langCode);
  if (voice) utt.voice = voice;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
  return utt;
}

// ── Unified TTS (picks best available source) ─────────────────────────────────

export async function getAudioBlob(text, langCode = 'en-US') {
  const { provider, hfToken } = getVoiceSettings();
  const { apiKey: elKey, voiceId } = getElevenLabsSettings();

  if (provider === 'elevenlabs' && elKey) {
    return fetchElevenLabsAudio(text, elKey, voiceId);
  }
  if (provider === 'hf' || hfToken) {
    return fetchHuggingFaceTTS(text, langCode);
  }
  return null; // caller falls back to browser speech
}

// ── ElevenLabs ────────────────────────────────────────────────────────────────

export async function fetchElevenLabsAudio(text, apiKey, voiceId = '21m00Tcm4TlvDq8ikWAM') {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || `ElevenLabs error ${res.status}`);
  }
  return await res.blob();
}

export function getElevenLabsSettings() {
  return {
    apiKey:   localStorage.getItem('elevenlabs_key')   || '',
    voiceId:  localStorage.getItem('elevenlabs_voice') || '21m00Tcm4TlvDq8ikWAM',
    langCode: localStorage.getItem('voice_lang')       || 'en-US',
  };
}

export function saveVoiceLang(langCode) {
  localStorage.setItem('voice_lang', langCode);
}

export function saveElevenLabsSettings(apiKey, voiceId) {
  if (apiKey   !== undefined) localStorage.setItem('elevenlabs_key',   apiKey);
  if (voiceId  !== undefined) localStorage.setItem('elevenlabs_voice', voiceId);
}
