// Curated royalty-free music library — organised by mood/genre
// All tracks: CC0 / Pixabay licence (free for commercial use)

export const MUSIC_CATEGORIES = [
  { id: 'all',       label: 'All',        emoji: '🎵' },
  { id: 'trending',  label: 'Trending',   emoji: '🔥' },
  { id: 'punjabi',   label: 'Punjabi',    emoji: '🥁' },
  { id: 'bollywood', label: 'Bollywood',  emoji: '🎬' },
  { id: 'hiphop',    label: 'Hip-Hop',    emoji: '🎤' },
  { id: 'calm',      label: 'Calm',       emoji: '🌊' },
  { id: 'cinematic', label: 'Cinematic',  emoji: '🎞️' },
  { id: 'energetic', label: 'Energetic',  emoji: '⚡' },
];

export const MUSIC_TRACKS = [
  // ── Punjabi / Desi vibes ─────────────────────────────────────────────
  {
    id: 'p1', title: 'Punjabi Groove',    artist: 'Desi Beats',
    category: 'punjabi', duration: '2:45',
    url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_b3ff3822b6.mp3',
    emoji: '🥁', tags: ['punjabi', 'trending', 'energetic'],
  },
  {
    id: 'p2', title: 'Bhangra Energy',   artist: 'Dhol Master',
    category: 'punjabi', duration: '3:10',
    url: 'https://cdn.pixabay.com/audio/2023/10/27/audio_c8f6e45e0a.mp3',
    emoji: '🥁', tags: ['punjabi', 'energetic'],
  },
  {
    id: 'p3', title: 'Desi Hip Hop',     artist: 'Urban Punjab',
    category: 'punjabi', duration: '2:58',
    url: 'https://cdn.pixabay.com/audio/2024/01/15/audio_8fe3e94d5f.mp3',
    emoji: '🎤', tags: ['punjabi', 'hiphop', 'trending'],
  },

  // ── Bollywood ────────────────────────────────────────────────────────
  {
    id: 'b1', title: 'Filmy Feels',      artist: 'Bollywood Studio',
    category: 'bollywood', duration: '3:20',
    url: 'https://cdn.pixabay.com/audio/2023/09/18/audio_fe0ef8c473.mp3',
    emoji: '🎬', tags: ['bollywood', 'trending'],
  },
  {
    id: 'b2', title: 'Romantic Scene',   artist: 'Filmi Music',
    category: 'bollywood', duration: '2:55',
    url: 'https://cdn.pixabay.com/audio/2024/03/08/audio_6b36ed42a7.mp3',
    emoji: '💕', tags: ['bollywood', 'calm'],
  },

  // ── Hip-Hop / Rap ────────────────────────────────────────────────────
  {
    id: 'h1', title: 'Street Hustle',   artist: 'Urban Beats',
    category: 'hiphop', duration: '2:30',
    url: 'https://cdn.pixabay.com/audio/2024/02/14/audio_1c3e4d2f90.mp3',
    emoji: '🎤', tags: ['hiphop', 'trending', 'energetic'],
  },
  {
    id: 'h2', title: 'Grind Mode',      artist: 'Trap Nation',
    category: 'hiphop', duration: '2:48',
    url: 'https://cdn.pixabay.com/audio/2023/11/05/audio_2a4e7b8c3d.mp3',
    emoji: '🔥', tags: ['hiphop', 'energetic'],
  },

  // ── Calm / Chill ─────────────────────────────────────────────────────
  {
    id: 'c1', title: 'Soft Morning',    artist: 'Ambient Sounds',
    category: 'calm', duration: '3:45',
    url: 'https://cdn.pixabay.com/audio/2024/01/22/audio_4f5a9c8b2e.mp3',
    emoji: '🌅', tags: ['calm', 'cinematic'],
  },
  {
    id: 'c2', title: 'Lo-Fi Study',     artist: 'Chill Hop',
    category: 'calm', duration: '3:00',
    url: 'https://cdn.pixabay.com/audio/2023/12/10/audio_7d3c2a1b9e.mp3',
    emoji: '☕', tags: ['calm', 'trending'],
  },
  {
    id: 'c3', title: 'Piano Rain',      artist: 'Acoustic Dreams',
    category: 'calm', duration: '2:50',
    url: 'https://cdn.pixabay.com/audio/2024/03/01/audio_9e2b4f7c1a.mp3',
    emoji: '🌧️', tags: ['calm'],
  },

  // ── Cinematic ────────────────────────────────────────────────────────
  {
    id: 'ci1', title: 'Epic Journey',   artist: 'Cinematic Works',
    category: 'cinematic', duration: '3:30',
    url: 'https://cdn.pixabay.com/audio/2024/02/05/audio_3c8e1f9b7a.mp3',
    emoji: '🎞️', tags: ['cinematic', 'energetic'],
  },
  {
    id: 'ci2', title: 'City of Dreams', artist: 'Orchestra Plus',
    category: 'cinematic', duration: '4:00',
    url: 'https://cdn.pixabay.com/audio/2023/08/24/audio_5a7b3d2c8f.mp3',
    emoji: '🏙️', tags: ['cinematic', 'trending'],
  },
  {
    id: 'ci3', title: 'Hustle Story',   artist: 'Film Score',
    category: 'cinematic', duration: '3:15',
    url: 'https://cdn.pixabay.com/audio/2024/01/08/audio_2f6d9e4c7b.mp3',
    emoji: '💪', tags: ['cinematic', 'motivational'],
  },

  // ── Energetic ────────────────────────────────────────────────────────
  {
    id: 'e1', title: 'Motivation Rush', artist: 'Power Beats',
    category: 'energetic', duration: '2:40',
    url: 'https://cdn.pixabay.com/audio/2024/02/19/audio_8c3f5a1e9d.mp3',
    emoji: '⚡', tags: ['energetic', 'trending'],
  },
  {
    id: 'e2', title: 'Rise Up',         artist: 'Uplift Music',
    category: 'energetic', duration: '2:55',
    url: 'https://cdn.pixabay.com/audio/2023/10/14/audio_1b9e7f4c2a.mp3',
    emoji: '🚀', tags: ['energetic'],
  },
  {
    id: 'e3', title: 'Daily Grind',     artist: 'Hustle Beats',
    category: 'energetic', duration: '3:05',
    url: 'https://cdn.pixabay.com/audio/2024/03/12/audio_6a2c8f5b3e.mp3',
    emoji: '💼', tags: ['energetic', 'trending', 'hiphop'],
  },
];

export function searchTracks(query, category) {
  let tracks = MUSIC_TRACKS;
  if (category && category !== 'all') {
    tracks = tracks.filter(t =>
      t.category === category || t.tags.includes(category)
    );
  }
  if (query.trim()) {
    const q = query.toLowerCase();
    tracks = tracks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.includes(q))
    );
  }
  return tracks;
}

export function getTrendingTracks() {
  return MUSIC_TRACKS.filter(t => t.tags.includes('trending'));
}
