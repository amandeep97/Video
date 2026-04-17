import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Check, Music, ChevronRight, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { MUSIC_CATEGORIES } from '../services/musicLibrary.js';
import { fetchJamendoTracks, searchJamendoTracks, getJamendoKey } from '../services/jamendo.js';
import { fetchFreesoundTracks, searchFreesoundTracks, getFreesoundKey } from '../services/freesound.js';

// Categories served by Freesound (has real Indian music)
const FREESOUND_CATS = new Set(['punjabi', 'bollywood']);

function AnimatedBars() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1 bg-brand-400 rounded-sm"
          style={{ height: '100%', animation: `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
      ))}
    </div>
  );
}

function SetupCard({ forIndian, onSaved }) {
  const [key, setKey] = useState('');
  const isIndian = forIndian;
  const link  = isIndian ? 'https://freesound.org/apiv2' : 'https://devportal.jamendo.com';
  const label = isIndian ? 'Freesound API Key' : 'Jamendo Client ID';
  const hint  = isIndian
    ? 'freesound.org has the largest library of Punjabi, Bhangra & Bollywood music — completely free.'
    : 'Jamendo has 600,000+ Western tracks (Hip-Hop, Calm, Cinematic, Energetic) — free to use.';

  const handleSave = () => {
    if (!key.trim()) return;
    if (isIndian) {
      localStorage.setItem('freesound_api_key', key.trim());
    } else {
      localStorage.setItem('jamendo_client_id', key.trim());
    }
    onSaved();
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 text-center gap-4 py-8">
      <div className="text-4xl">{isIndian ? '🥁' : '🎵'}</div>
      <div>
        <h3 className="text-base font-bold mb-1">{isIndian ? 'Add Punjabi & Bollywood Music' : 'Connect Music Library'}</h3>
        <p className="text-sm text-white/50 leading-relaxed">{hint}</p>
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-brand-400 text-sm font-medium hover:text-brand-300 transition-colors">
        <ExternalLink className="w-3.5 h-3.5" />
        Get free key →
      </a>
      <div className="w-full space-y-2">
        <input type="text" placeholder={`Paste your ${label} here…`} value={key}
          onChange={e => setKey(e.target.value)}
          className="input-field w-full text-sm" />
        <button onClick={handleSave} disabled={!key.trim()}
          className="btn-primary w-full py-3 disabled:opacity-40">
          Connect & Browse
        </button>
      </div>
      {isIndian && (
        <div className="text-xs text-white/30 space-y-0.5">
          <p>1. Go to freesound.org → sign up free</p>
          <p>2. Profile → API keys → Create key</p>
          <p>3. Paste it above</p>
        </div>
      )}
    </div>
  );
}

export default function MusicPicker({ selectedTrack, onSelect, onClose }) {
  const [category,  setCategory]  = useState('trending');
  const [query,     setQuery]     = useState('');
  const [tracks,    setTracks]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [keys, setKeys] = useState({ jamendo: !!getJamendoKey(), freesound: !!getFreesoundKey() });
  const audioRef    = useRef(null);
  const queryTimer  = useRef(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
    setPlayingId(null);
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const needsFreesound = FREESOUND_CATS.has(category) && !query;
  const needsJamendo   = !FREESOUND_CATS.has(category) && !query;
  const missingKey = needsFreesound ? !keys.freesound : !keys.jamendo;

  const loadTracks = useCallback(async (cat, q) => {
    setLoading(true); setError('');
    try {
      let results;
      if (q.trim()) {
        // Search: try both if available
        const [j, f] = await Promise.allSettled([
          keys.jamendo   ? searchJamendoTracks(q)   : Promise.reject(),
          keys.freesound ? searchFreesoundTracks(q) : Promise.reject(),
        ]);
        results = [
          ...(j.status === 'fulfilled' ? j.value : []),
          ...(f.status === 'fulfilled' ? f.value : []),
        ];
      } else if (FREESOUND_CATS.has(cat)) {
        results = await fetchFreesoundTracks(cat);
      } else {
        results = await fetchJamendoTracks(cat);
      }
      setTracks(results);
    } catch (e) {
      if (e.message === 'NO_KEY' || e.message === 'INVALID_KEY') {
        setError(e.message === 'INVALID_KEY' ? 'Invalid API key — check your key in Settings.' : '');
      } else {
        setError('Could not load tracks. Check your connection.');
      }
    } finally { setLoading(false); }
  }, [keys]);

  useEffect(() => {
    if (missingKey && !query) return;
    clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => loadTracks(category, query), query ? 400 : 0);
    return () => clearTimeout(queryTimer.current);
  }, [category, query, missingKey, loadTracks]);

  const handlePreview = (track) => {
    if (playingId === track.id) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(track.url);
    audio.volume = 0.6;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  const handleSelect = (track) => { stopAudio(); onSelect(track); onClose(); };

  const refreshKeys = () => setKeys({ jamendo: !!getJamendoKey(), freesound: !!getFreesoundKey() });

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass glass-hover">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold flex-1">Add Music</h2>
        {!missingKey && (
          <button onClick={() => loadTracks(category, query)} className="text-white/30 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {selectedTrack && (
          <button onClick={() => { stopAudio(); onClose(); }} className="text-xs text-brand-400 font-medium px-2">Done</button>
        )}
      </div>

      {/* Search — always visible */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input type="text" placeholder="Search songs, artists, bhangra…" value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" />
          {query && <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {MUSIC_CATEGORIES.map(cat => {
            const needsFs = FREESOUND_CATS.has(cat.id);
            const locked  = needsFs ? !keys.freesound : !keys.jamendo;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all relative ${
                  category === cat.id ? 'bg-brand-500 text-white' : 'glass text-white/60 hover:text-white'
                }`}>
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {locked && cat.id !== 'all' && (
                  <span className="text-[9px] opacity-50">🔑</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Setup screen when key missing */}
        {!query && missingKey ? (
          <SetupCard
            forIndian={needsFreesound}
            onSaved={refreshKeys}
          />
        ) : (
          <div className="px-4 pb-4 space-y-1">
            {loading && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-white/40">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                <p className="text-sm">Loading tracks…</p>
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={() => loadTracks(category, query)} className="text-xs text-brand-400 underline">Try again</button>
              </div>
            )}
            {!loading && !error && tracks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-white/30">
                <Music className="w-8 h-8 mb-2" />
                <p className="text-sm">No tracks found</p>
                {FREESOUND_CATS.has(category) && <p className="text-xs mt-1">Try searching "bhangra" or "dhol"</p>}
              </div>
            )}
            {!loading && !error && tracks.map(track => {
              const isPlaying  = playingId === track.id;
              const isSelected = selectedTrack?.id === track.id;
              return (
                <div key={track.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected ? 'bg-brand-500/15 border border-brand-500/30' : 'glass hover:bg-white/5'
                  }`}
                  onClick={() => handlePreview(track)}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
                    {isPlaying ? <AnimatedBars /> : <span>{track.emoji}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-300' : 'text-white'}`}>{track.title}</p>
                    <p className="text-xs text-white/40 truncate">{track.artist} · {track.duration}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleSelect(track); }}
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'bg-brand-500 text-white' : 'glass text-white/40 hover:text-white'
                    }`}>
                    {isSelected ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected bar */}
      {selectedTrack && (
        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3 bg-brand-500/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-base flex-shrink-0">
            {selectedTrack.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-brand-300 truncate">{selectedTrack.title}</p>
            <p className="text-xs text-white/40 truncate">{selectedTrack.artist}</p>
          </div>
          <button onClick={() => onSelect(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      )}

      <style>{`
        @keyframes musicBar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
}
