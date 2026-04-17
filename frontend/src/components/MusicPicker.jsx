import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Play, Pause, Check, Music, ChevronRight } from 'lucide-react';
import { MUSIC_CATEGORIES, MUSIC_TRACKS, searchTracks } from '../services/musicLibrary.js';

function AnimatedBars() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1 bg-brand-400 rounded-sm"
          style={{
            height: '100%',
            animation: `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export default function MusicPicker({ selectedTrack, onSelect, onClose }) {
  const [category,    setCategory]    = useState('trending');
  const [query,       setQuery]       = useState('');
  const [playingId,   setPlayingId]   = useState(null);
  const audioRef = useRef(null);

  const tracks = searchTracks(query, query ? 'all' : category);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setPlayingId(null);
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  const handlePreview = (track) => {
    if (playingId === track.id) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(track.url);
    audio.volume = 0.6;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.id);
  };

  const handleSelect = (track) => {
    stopAudio();
    onSelect(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-950" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-white/10">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full glass glass-hover">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-base font-semibold flex-1">Add Music</h2>
        {selectedTrack && (
          <button
            onClick={() => { stopAudio(); onClose(); }}
            className="text-xs text-brand-400 font-medium"
          >
            Done
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search songs, artists…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/60">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {MUSIC_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                category === cat.id
                  ? 'bg-brand-500 text-white'
                  : 'glass text-white/60 hover:text-white'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Track list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-white/30">
            <Music className="w-8 h-8 mb-2" />
            <p className="text-sm">No tracks found</p>
          </div>
        )}
        {tracks.map(track => {
          const isPlaying  = playingId === track.id;
          const isSelected = selectedTrack?.id === track.id;
          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                isSelected ? 'bg-brand-500/15 border border-brand-500/30' : 'glass hover:bg-white/8'
              }`}
              onClick={() => handlePreview(track)}
            >
              {/* Play / animated bars */}
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
                {isPlaying ? <AnimatedBars /> : <span>{track.emoji}</span>}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isSelected ? 'text-brand-300' : 'text-white'}`}>
                  {track.title}
                </p>
                <p className="text-xs text-white/40 truncate">{track.artist} • {track.duration}</p>
              </div>

              {/* Select / check */}
              <button
                onClick={e => { e.stopPropagation(); handleSelect(track); }}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-white'
                    : 'glass text-white/40 hover:text-white'
                }`}
              >
                {isSelected ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Currently selected bar */}
      {selectedTrack && (
        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3 bg-brand-500/10">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-base flex-shrink-0">
            {selectedTrack.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-brand-300 truncate">{selectedTrack.title}</p>
            <p className="text-xs text-white/40 truncate">{selectedTrack.artist}</p>
          </div>
          <button
            onClick={() => { onSelect(null); }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      )}

      <style>{`
        @keyframes musicBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
