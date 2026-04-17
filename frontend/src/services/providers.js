export const PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    tagline: 'FREE — Best to start',
    emoji: '⚡',
    badge: 'FREE',
    badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', tag: 'Recommended' },
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', tag: '' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', tag: '' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', tag: 'Fastest' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    pricing: 'Free tier (rate limited)',
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    description: 'Free API key, ultra-fast inference with open-source models',
    type: 'openai-compat',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'FREE tier available',
    emoji: '✨',
    badge: 'FREE TIER',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tag: 'Free quota' },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', tag: 'Fastest free' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tag: 'Best quality' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tag: 'Newest' },
    ],
    defaultModel: 'gemini-1.5-flash',
    pricing: 'Free quota (15 req/min)',
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    description: 'Google AI — generous free tier with Gemini Flash',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    tagline: 'Many FREE models',
    emoji: '🌐',
    badge: 'FREE MODELS',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    models: [
      { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B', tag: 'FREE' },
      { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', tag: 'FREE' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', tag: 'FREE' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', tag: 'Paid' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', tag: 'Paid' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', tag: 'Paid' },
    ],
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    pricing: 'Free models available',
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    description: 'Access 100+ models. Many are completely free.',
    type: 'openai-compat',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: { 'HTTP-Referer': 'https://amandeep97.github.io/Video/', 'X-Title': 'VideoAI' },
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    tagline: '$5 free credits on signup',
    emoji: '🤖',
    badge: '$5 FREE',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', tag: 'Best quality' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', tag: 'Cheapest' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', tag: 'Most powerful' },
    ],
    defaultModel: 'claude-haiku-4-5-20251001',
    pricing: '~$0.002–0.05/video',
    keyPlaceholder: 'sk-ant-api03-...',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Best script quality. New accounts get $5 free credits.',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI ChatGPT',
    tagline: 'GPT-4o Mini is very cheap',
    emoji: '💚',
    badge: 'PAID',
    badgeColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tag: 'Cheapest' },
      { id: 'gpt-4o', name: 'GPT-4o', tag: 'Best' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tag: 'Old but cheap' },
    ],
    defaultModel: 'gpt-4o-mini',
    pricing: '~$0.01–0.03/video',
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'Reliable GPT models. GPT-4o Mini is very affordable.',
    type: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    tagline: 'Affordable European AI',
    emoji: '🌪️',
    badge: 'PAID',
    badgeColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small', tag: 'Cheapest' },
      { id: 'mistral-large-latest', name: 'Mistral Large', tag: 'Best' },
      { id: 'open-mistral-7b', name: 'Open Mistral 7B', tag: 'Budget' },
    ],
    defaultModel: 'mistral-small-latest',
    pricing: '~$0.01–0.02/video',
    keyPlaceholder: '...',
    keyUrl: 'https://console.mistral.ai/api-keys/',
    description: 'Privacy-focused European AI, affordable pricing.',
    type: 'openai-compat',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export function getSettings() {
  return {
    providerId: localStorage.getItem('ai_provider') || 'groq',
    modelId: localStorage.getItem('ai_model') || PROVIDERS.groq.defaultModel,
    apiKey: localStorage.getItem(`ai_key_${localStorage.getItem('ai_provider') || 'groq'}`) || '',
  };
}

export function saveSettings({ providerId, modelId, apiKey }) {
  localStorage.setItem('ai_provider', providerId);
  localStorage.setItem('ai_model', modelId);
  localStorage.setItem(`ai_key_${providerId}`, apiKey);
}

export function hasValidKey() {
  const { providerId, apiKey } = getSettings();
  return !!apiKey && !!providerId;
}
