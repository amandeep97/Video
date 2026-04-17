export const VOICE_LANGUAGES = [
  { id: 'en-US',    label: 'English (US)',  flag: '🇺🇸', elCode: 'en' },
  { id: 'en-GB',    label: 'English (UK)',  flag: '🇬🇧', elCode: 'en' },
  { id: 'hi-IN',    label: 'Hindi',         flag: '🇮🇳', elCode: 'hi' },
  { id: 'pa-IN',    label: 'Punjabi',       flag: '🇮🇳', elCode: 'pa' },
  { id: 'es-ES',    label: 'Spanish',       flag: '🇪🇸', elCode: 'es' },
  { id: 'fr-FR',    label: 'French',        flag: '🇫🇷', elCode: 'fr' },
  { id: 'de-DE',    label: 'German',        flag: '🇩🇪', elCode: 'de' },
  { id: 'pt-BR',    label: 'Portuguese',    flag: '🇧🇷', elCode: 'pt' },
  { id: 'ar-SA',    label: 'Arabic',        flag: '🇸🇦', elCode: 'ar' },
  { id: 'ja-JP',    label: 'Japanese',      flag: '🇯🇵', elCode: 'ja' },
  { id: 'zh-CN',    label: 'Chinese',       flag: '🇨🇳', elCode: 'zh' },
  { id: 'ko-KR',    label: 'Korean',        flag: '🇰🇷', elCode: 'ko' },
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

function waitForVoices() {
  return new Promise(resolve => {
    const voices = window.speechSynthesis?.getVoices();
    if (voices?.length) return resolve(voices);
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(window.speechSynthesis.getVoices());
    // fallback timeout
    setTimeout(() => resolve(window.speechSynthesis?.getVoices() || []), 1500);
  });
}

export async function getBestBrowserVoice(langCode) {
  const voices = await waitForVoices();
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
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = langCode;
  utt.rate = 0.88;
  utt.pitch = 1;
  const voice = await getBestBrowserVoice(langCode);
  if (voice) utt.voice = voice;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
  return utt;
}

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
    apiKey: localStorage.getItem('elevenlabs_key') || '',
    voiceId: localStorage.getItem('elevenlabs_voice') || '21m00Tcm4TlvDq8ikWAM',
    langCode: localStorage.getItem('voice_lang') || 'en-US',
  };
}

export function saveVoiceLang(langCode) {
  localStorage.setItem('voice_lang', langCode);
}

export function saveElevenLabsSettings(apiKey, voiceId) {
  if (apiKey !== undefined) localStorage.setItem('elevenlabs_key', apiKey);
  if (voiceId !== undefined) localStorage.setItem('elevenlabs_voice', voiceId);
}
