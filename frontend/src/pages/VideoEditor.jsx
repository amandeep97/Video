import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Play, Pause, Type, Palette, EyeOff, Download,
  Plus, Trash2, Loader2, Check, Layers, Sliders, Link, RefreshCw
} from 'lucide-react';

const FILTER_PRESETS = [
  { id: 'none',      label: 'Original',  css: '' },
  { id: 'cinematic', label: 'Cinematic', css: 'contrast(1.2) saturate(0.75) brightness(0.88)' },
  { id: 'warm',      label: 'Warm',      css: 'sepia(0.35) saturate(1.4) brightness(1.05)' },
  { id: 'cool',      label: 'Cool',      css: 'hue-rotate(20deg) saturate(1.15) brightness(1.05)' },
  { id: 'bw',        label: 'B&W',       css: 'grayscale(1) contrast(1.15)' },
  { id: 'vivid',     label: 'Vivid',     css: 'saturate(1.9) contrast(1.1)' },
  { id: 'vintage',   label: 'Vintage',   css: 'sepia(0.45) contrast(0.88) brightness(1.1)' },
  { id: 'dark',      label: 'Dark',      css: 'brightness(0.65) contrast(1.35) saturate(1.2)' },
  { id: 'golden',    label: 'Golden',    css: 'sepia(0.6) saturate(1.6) brightness(1.1) hue-rotate(-10deg)' },
];

const TEXT_POSITIONS = [
  { id: 'top',    label: 'Top',    x: 50, y: 8 },
  { id: 'mid',    label: 'Middle', x: 50, y: 50 },
  { id: 'bot',    label: 'Bottom', x: 50, y: 88 },
  { id: 'tl',     label: '↖',     x: 5,  y: 8 },
  { id: 'tr',     label: '↗',     x: 95, y: 8 },
  { id: 'bl',     label: '↙',     x: 5,  y: 88 },
  { id: 'br',     label: '↘',     x: 95, y: 88 },
];

const FONTS = ['Arial', 'Georgia', 'Impact', 'Courier New', 'Verdana'];
const ANIMS = ['None', 'Fade In', 'Slide Up'];

function uid() { return Math.random().toString(36).slice(2, 9); }

function buildFilter(preset, brightness, contrast, saturation) {
  const manual = `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
  return preset.css ? `${preset.css} ${manual}` : manual;
}

function drawText(ctx, overlay, cw, ch, currentTime) {
  const elapsed = currentTime - overlay.startTime;
  if (elapsed < 0 || elapsed > overlay.duration) return;

  let alpha = 1;
  if (overlay.anim === 'Fade In' && elapsed < 0.4) alpha = elapsed / 0.4;

  const x = (overlay.x / 100) * cw;
  const y = (overlay.y / 100) * ch;
  const slideOff = overlay.anim === 'Slide Up' && elapsed < 0.3 ? (1 - elapsed / 0.3) * 24 : 0;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.font = `${overlay.bold ? 'bold ' : ''}${overlay.size}px ${overlay.font}`;
  ctx.textAlign = overlay.x < 20 ? 'left' : overlay.x > 80 ? 'right' : 'center';
  ctx.textBaseline = 'middle';

  const lines = overlay.text.split('\n');
  const lineH = overlay.size * 1.3;
  const totalH = lines.length * lineH;
  const startY = y - totalH / 2 + lineH / 2 + slideOff;

  lines.forEach((line, li) => {
    const lx = x;
    const ly = startY + li * lineH;
    if (overlay.bg !== 'none') {
      const metrics = ctx.measureText(line);
      const pad = 8;
      ctx.fillStyle = overlay.bg === 'dark' ? 'rgba(0,0,0,0.65)' : overlay.bgColor;
      ctx.fillRect(
        (ctx.textAlign === 'left' ? lx : ctx.textAlign === 'right' ? lx - metrics.width : lx - metrics.width / 2) - pad,
        ly - overlay.size / 2 - pad / 2,
        metrics.width + pad * 2,
        overlay.size + pad
      );
    }
    if (overlay.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }
    ctx.fillStyle = overlay.color;
    ctx.fillText(line, lx, ly);
    ctx.shadowColor = 'transparent';
  });
  ctx.restore();
}

function drawCover(ctx, region, cw, ch, video, currentTime) {
  if (currentTime < region.startTime) return;
  if (region.endTime !== null && currentTime > region.endTime) return;

  const x = (region.x / 100) * cw;
  const y = (region.y / 100) * ch;
  const w = (region.w / 100) * cw;
  const h = (region.h / 100) * ch;

  if (region.type === 'blur') {
    const vx = (region.x / 100) * video.videoWidth;
    const vy = (region.y / 100) * video.videoHeight;
    const vw = (region.w / 100) * video.videoWidth;
    const vh = (region.h / 100) * video.videoHeight;
    ctx.save();
    ctx.filter = `blur(${region.blur || 12}px)`;
    ctx.drawImage(video, vx, vy, vw, vh, x, y, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = region.color || '#000000';
    ctx.fillRect(x, y, w, h);
  }
}

export default function VideoEditor() {
  const navigate = useNavigate();
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const audioCtxRef = useRef(null);

  const [videoSrc,  setVideoSrc]  = useState('');
  const [videoUrl,  setVideoUrl]  = useState('');
  const [loaded,    setLoaded]    = useState(false);
  const [loadError, setLoadError] = useState('');
  const [duration,  setDuration]  = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing,   setPlaying]   = useState(false);

  const [tool, setTool] = useState('text'); // text | style | cover | export

  // Overlays
  const [overlays, setOverlays] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // New text form
  const [nText,  setNText]  = useState('');
  const [nPos,   setNPos]   = useState('bot');
  const [nSize,  setNSize]  = useState(28);
  const [nColor, setNColor] = useState('#ffffff');
  const [nBg,    setNBg]    = useState('dark');
  const [nBgCol, setNBgCol] = useState('#000000');
  const [nFont,  setNFont]  = useState('Arial');
  const [nBold,  setNBold]  = useState(true);
  const [nShadow,setNShadow]= useState(true);
  const [nAnim,  setNAnim]  = useState('Fade In');
  const [nStart, setNStart] = useState(0);
  const [nDur,   setNDur]   = useState(4);

  // Cover regions
  const [covers, setCovers] = useState([]);
  const [cType,  setCType]  = useState('blur');
  const [cColor, setCColor] = useState('#000000');
  const [cBlur,  setCBlur]  = useState(14);
  const [cX, setCX] = useState(0);
  const [cY, setCY] = useState(80);
  const [cW, setCW] = useState(100);
  const [cH, setCH] = useState(15);
  const [cStart, setCStart] = useState(0);
  const [cEnd,   setCEnd]   = useState(null); // null = whole video

  // Style
  const [filterPreset, setFilterPreset] = useState(FILTER_PRESETS[0]);
  const [brightness, setBrightness] = useState(100);
  const [contrast,   setContrast]   = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);

  // ── Canvas render loop ─────────────────────────────────────────────────────
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const ctx = canvas.getContext('2d');
    const t   = video.currentTime;

    setCurrentTime(t);

    // Draw video with global filter
    ctx.filter = buildFilter(filterPreset, brightness, contrast, saturation);
    ctx.drawImage(video, 0, 0, cw, ch);
    ctx.filter = 'none';

    // Draw cover/blur regions
    covers.forEach(r => drawCover(ctx, r, cw, ch, video, t));

    // Draw text overlays
    overlays.forEach(o => drawText(ctx, o, cw, ch, t));

    rafRef.current = requestAnimationFrame(renderFrame);
  }, [filterPreset, brightness, contrast, saturation, overlays, covers]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderFrame]);

  // ── Video load ─────────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    setLoadError('');
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleVideoLoaded = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width  = v.videoWidth  || 1280;
    c.height = v.videoHeight || 720;
    setDuration(v.duration);
    setLoaded(true);
    setLoadError('');
    setNStart(0);
    setNDur(Math.min(4, v.duration));
    setCStart(0);
    setCEnd(null);
  };

  const handleVideoError = () => {
    setLoadError('Could not load this video. Try a different file (MP4 works best).');
    setVideoSrc('');
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = (Number(e.target.value) / 100) * duration;
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ── Add text overlay ───────────────────────────────────────────────────────
  const addOverlay = () => {
    if (!nText.trim()) return;
    const pos = TEXT_POSITIONS.find(p => p.id === nPos) || TEXT_POSITIONS[2];
    setOverlays(prev => [...prev, {
      id: uid(), text: nText.trim(),
      x: pos.x, y: pos.y, size: nSize,
      color: nColor, bg: nBg, bgColor: nBgCol,
      font: nFont, bold: nBold, shadow: nShadow,
      anim: nAnim, startTime: nStart, duration: nDur,
    }]);
    setNText('');
  };

  // ── Add cover region ───────────────────────────────────────────────────────
  const addCover = () => {
    setCovers(prev => [...prev, {
      id: uid(), type: cType, color: cColor, blur: cBlur,
      x: cX, y: cY, w: cW, h: cH,
      startTime: cStart, endTime: cEnd,
    }]);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportVideo = async () => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    setExporting(true);
    setExportPct(0);

    // Seek to start
    video.pause();
    setPlaying(false);
    video.currentTime = 0;
    await new Promise(r => video.addEventListener('seeked', r, { once: true }));

    // Set up audio capture (only once per element)
    let audioTrack = null;
    try {
      if (!audioCtxRef.current) {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const src = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        src.connect(dest);
        src.connect(audioCtx.destination);
        audioTrack = dest.stream.getAudioTracks()[0];
      }
    } catch { /* no audio */ }

    const tracks = [...canvas.captureStream(30).getVideoTracks()];
    if (audioTrack) tracks.push(audioTrack);
    const stream = new MediaStream(tracks);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'edited-video.webm';
      a.click();
      URL.revokeObjectURL(a.href);
      setExporting(false);
      setExportPct(0);
    };

    rec.start(200);
    video.play();
    setPlaying(true);

    const timer = setInterval(() => {
      setExportPct(Math.min(98, (video.currentTime / video.duration) * 100));
    }, 400);

    video.addEventListener('ended', () => {
      clearInterval(timer);
      video.pause();
      setPlaying(false);
      setExportPct(100);
      setTimeout(() => rec.stop(), 300);
    }, { once: true });
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 bg-grid">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/')}
            className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white">Video Editor</span>
              <span className="text-xs text-white/40 ml-2">Add text, effects, cover regions</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12 space-y-4">

        {/* Upload */}
        {!loaded && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="card border-2 border-dashed border-white/20 hover:border-brand-500/50 transition-all text-center py-16"
          >
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-lg font-bold text-white/80 mb-2">Upload your video</p>
            <p className="text-sm text-white/40 mb-6">Works with CapCut, HeyGen, or any video (MP4, MOV, WebM)</p>

            {loadError && (
              <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 max-w-sm mx-auto">
                {loadError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {/* Label-based file picker — most reliable on iOS */}
              <label className="btn-primary px-6 py-2.5 flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" /> Upload Video File
                <input type="file" accept="video/*,video/mp4,video/quicktime,video/webm"
                  className="absolute opacity-0 w-0 h-0"
                  onChange={e => handleFile(e.target.files[0])} />
              </label>
              <span className="text-white/30 text-sm">or</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="Paste video URL…"
                  className="input-field text-sm flex-1 sm:w-64"
                />
                <button
                  onClick={() => { if (videoUrl.trim()) { setLoadError(''); setVideoSrc(videoUrl.trim()); }}}
                  className="px-4 py-2 glass glass-hover rounded-xl text-sm flex items-center gap-1">
                  <Link className="w-4 h-4" /> Load
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video element — src bound as React prop so it always updates */}
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          className="hidden"
          playsInline
          onLoadedMetadata={handleVideoLoaded}
          onError={handleVideoError}
          onEnded={() => setPlaying(false)}
        />

        {/* Canvas Preview */}
        {loaded && (
          <div className="space-y-2">
            <canvas ref={canvasRef}
              className="w-full rounded-2xl border border-white/10 bg-black cursor-pointer"
              style={{ maxHeight: '55vw', objectFit: 'contain' }}
              onClick={togglePlay} />

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button onClick={togglePlay}
                className="w-10 h-10 rounded-xl glass glass-hover flex items-center justify-center flex-shrink-0">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <input type="range" min={0} max={100} step={0.1}
                value={duration > 0 ? (currentTime / duration) * 100 : 0}
                onChange={seek}
                className="flex-1 accent-violet-500" />
              <span className="text-xs text-white/40 tabular-nums flex-shrink-0">{fmt(currentTime)} / {fmt(duration)}</span>
              <button onClick={() => { setLoaded(false); setVideoSrc(''); setVideoUrl(''); setOverlays([]); setCovers([]); setPlaying(false); setFilterPreset(FILTER_PRESETS[0]); setBrightness(100); setContrast(100); setSaturation(100); setLoadError(''); }}
                className="w-8 h-8 rounded-lg glass glass-hover flex items-center justify-center flex-shrink-0" title="Load new video">
                <RefreshCw className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          </div>
        )}

        {/* Tool tabs */}
        {loaded && (
          <div className="flex gap-1 glass rounded-xl p-1">
            {[
              { id: 'text',   icon: Type,    label: 'Text / Hook' },
              { id: 'style',  icon: Palette, label: 'Style' },
              { id: 'cover',  icon: EyeOff,  label: 'Cover / Blur' },
              { id: 'export', icon: Download, label: 'Export' },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTool(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    tool === t.id ? 'bg-violet-500/30 text-white' : 'text-white/50 hover:text-white'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Text tool ───────────────────────────────────────────────── */}
        {loaded && tool === 'text' && (
          <div className="space-y-4">
            <div className="card space-y-3">
              <p className="text-sm font-semibold text-white/80">Add Text / Hook</p>

              <textarea rows={2} value={nText} onChange={e => setNText(e.target.value)}
                placeholder="Your hook text… e.g. 'Wait for it 👀'"
                className="input-field resize-none text-sm" />

              {/* Position */}
              <div>
                <p className="text-xs text-white/40 mb-1.5">Position</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_POSITIONS.map(p => (
                    <button key={p.id} onClick={() => setNPos(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        nPos === p.id ? 'bg-violet-500/30 border border-violet-500/50 text-violet-200' : 'glass text-white/40 hover:text-white'
                      }`}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Font */}
                <div>
                  <p className="text-xs text-white/40 mb-1">Font</p>
                  <select value={nFont} onChange={e => setNFont(e.target.value)}
                    className="input-field text-sm w-full">
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                {/* Size */}
                <div>
                  <p className="text-xs text-white/40 mb-1">Size: <span className="text-white">{nSize}px</span></p>
                  <input type="range" min={14} max={80} value={nSize} onChange={e => setNSize(Number(e.target.value))}
                    className="w-full accent-violet-500 mt-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Text color */}
                <div>
                  <p className="text-xs text-white/40 mb-1">Text Color</p>
                  <input type="color" value={nColor} onChange={e => setNColor(e.target.value)}
                    className="w-full h-9 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
                </div>
                {/* Background */}
                <div>
                  <p className="text-xs text-white/40 mb-1">Background</p>
                  <select value={nBg} onChange={e => setNBg(e.target.value)}
                    className="input-field text-sm w-full">
                    <option value="none">None</option>
                    <option value="dark">Dark semi-transparent</option>
                    <option value="custom">Custom color</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Animation */}
                <div>
                  <p className="text-white/40 mb-1">Animation</p>
                  <div className="flex flex-wrap gap-1">
                    {ANIMS.map(a => (
                      <button key={a} onClick={() => setNAnim(a)}
                        className={`px-2 py-1 rounded-lg transition-all ${nAnim === a ? 'bg-violet-500/30 text-violet-200 border border-violet-500/40' : 'glass text-white/40'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Options */}
                <div>
                  <p className="text-white/40 mb-1">Options</p>
                  <label className="flex items-center gap-2 cursor-pointer mb-1">
                    <input type="checkbox" checked={nBold} onChange={e => setNBold(e.target.checked)} className="accent-violet-500" />
                    <span className="text-white/60">Bold</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={nShadow} onChange={e => setNShadow(e.target.checked)} className="accent-violet-500" />
                    <span className="text-white/60">Shadow</span>
                  </label>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/40 mb-1">Start: <span className="text-white">{nStart}s</span></p>
                  <input type="range" min={0} max={Math.max(0, duration - 0.5)} step={0.5}
                    value={nStart} onChange={e => setNStart(Number(e.target.value))}
                    className="w-full accent-violet-500" />
                </div>
                <div>
                  <p className="text-white/40 mb-1">Duration: <span className="text-white">{nDur}s</span></p>
                  <input type="range" min={0.5} max={Math.max(0.5, duration)} step={0.5}
                    value={nDur} onChange={e => setNDur(Number(e.target.value))}
                    className="w-full accent-violet-500" />
                </div>
              </div>

              <button onClick={addOverlay} disabled={!nText.trim()}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" /> Add Text Layer
              </button>
            </div>

            {/* Layer list */}
            {overlays.length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Text Layers ({overlays.length})</p>
                {overlays.map((o, i) => (
                  <div key={o.id} className={`flex items-center gap-3 p-2.5 glass rounded-xl ${selectedId === o.id ? 'border border-violet-500/40' : ''}`}
                    onClick={() => setSelectedId(selectedId === o.id ? null : o.id)}>
                    <span className="w-6 h-6 rounded-md bg-violet-500/20 text-violet-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate" style={{ fontFamily: o.font }}>"{o.text}"</p>
                      <p className="text-[10px] text-white/30">{fmt(o.startTime)} – {fmt(o.startTime + o.duration)} · {o.anim}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setOverlays(prev => prev.filter(x => x.id !== o.id)); }}
                      className="w-6 h-6 rounded-lg glass-hover flex items-center justify-center text-red-400 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Style tool ──────────────────────────────────────────────── */}
        {loaded && tool === 'style' && (
          <div className="card space-y-4">
            <p className="text-sm font-semibold text-white/80">Color & Style</p>

            {/* Filter presets */}
            <div className="grid grid-cols-3 gap-2">
              {FILTER_PRESETS.map(f => (
                <button key={f.id} onClick={() => setFilterPreset(f)}
                  className={`py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    filterPreset.id === f.id
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                      : 'glass border-white/10 text-white/50 hover:text-white'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Manual sliders */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <p className="text-xs text-white/40">Fine Tune</p>
              {[
                { label: 'Brightness', val: brightness, set: setBrightness },
                { label: 'Contrast',   val: contrast,   set: setContrast },
                { label: 'Saturation', val: saturation, set: setSaturation },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-20 flex-shrink-0">{s.label}</span>
                  <input type="range" min={0} max={200} value={s.val}
                    onChange={e => s.set(Number(e.target.value))}
                    className="flex-1 accent-violet-500" />
                  <span className="text-xs text-white/50 w-10 text-right">{s.val}%</span>
                  <button onClick={() => s.set(100)} className="text-[10px] text-white/30 hover:text-white/60 flex-shrink-0">Reset</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Cover/Blur tool ─────────────────────────────────────────── */}
        {loaded && tool === 'cover' && (
          <div className="space-y-4">
            <div className="card space-y-4">
              <div>
                <p className="text-sm font-semibold text-white/80 mb-1">Cover / Blur Region</p>
                <p className="text-xs text-white/30">Use this to hide existing text, logos, or watermarks from your original video</p>
              </div>

              {/* Type */}
              <div className="flex gap-2">
                {[
                  { id: 'blur',  label: '🌫️ Blur' },
                  { id: 'solid', label: '⬛ Solid Color' },
                ].map(t => (
                  <button key={t.id} onClick={() => setCType(t.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                      cType === t.id ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'glass border-white/10 text-white/50'
                    }`}>{t.label}</button>
                ))}
              </div>

              {cType === 'blur' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-24 flex-shrink-0">Blur strength</span>
                  <input type="range" min={4} max={30} value={cBlur} onChange={e => setCBlur(Number(e.target.value))} className="flex-1 accent-violet-500" />
                  <span className="text-xs text-white/50 w-6">{cBlur}</span>
                </div>
              )}
              {cType === 'solid' && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Cover Color</p>
                  <input type="color" value={cColor} onChange={e => setCColor(e.target.value)}
                    className="w-full h-9 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
                </div>
              )}

              {/* Position sliders */}
              <div className="space-y-2 text-xs">
                <p className="text-white/40 font-medium">Region Position (% of video size)</p>
                {[
                  { label: 'Left %',   val: cX, set: setCX, max: 100 },
                  { label: 'Top %',    val: cY, set: setCY, max: 100 },
                  { label: 'Width %',  val: cW, set: setCW, max: 100 },
                  { label: 'Height %', val: cH, set: setCH, max: 100 },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-white/50 w-16 flex-shrink-0">{s.label}</span>
                    <input type="range" min={0} max={s.max} value={s.val}
                      onChange={e => s.set(Number(e.target.value))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-white/50 w-8 text-right">{s.val}</span>
                  </div>
                ))}
              </div>

              {/* Preset positions */}
              <div>
                <p className="text-xs text-white/40 mb-1.5">Quick Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Top strip',    x: 0, y: 0,  w: 100, h: 12 },
                    { label: 'Bottom strip', x: 0, y: 88, w: 100, h: 12 },
                    { label: 'Full screen',  x: 0, y: 0,  w: 100, h: 100 },
                    { label: 'Bottom-left',  x: 0, y: 80, w: 40,  h: 15 },
                    { label: 'Watermark ↘',  x: 65, y: 85, w: 35, h: 12 },
                  ].map(p => (
                    <button key={p.label} onClick={() => { setCX(p.x); setCY(p.y); setCW(p.w); setCH(p.h); }}
                      className="px-2.5 py-1 rounded-lg glass text-white/50 hover:text-white text-xs transition-all">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-white/40 mb-1">Start: <span className="text-white">{cStart}s</span></p>
                  <input type="range" min={0} max={Math.max(0, duration - 0.5)} step={0.5}
                    value={cStart} onChange={e => setCStart(Number(e.target.value))}
                    className="w-full accent-violet-500" />
                </div>
                <div>
                  <p className="text-white/40 mb-1">End: <span className="text-white">{cEnd === null ? 'End of video' : `${cEnd}s`}</span></p>
                  <div className="flex gap-2 mt-1">
                    <input type="range" min={0.5} max={duration} step={0.5}
                      value={cEnd ?? duration} onChange={e => setCEnd(Number(e.target.value))}
                      className="flex-1 accent-violet-500" />
                    <button onClick={() => setCEnd(null)} className="text-[10px] glass px-1.5 rounded text-white/40 hover:text-white">∞</button>
                  </div>
                </div>
              </div>

              <button onClick={addCover}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                <Plus className="w-4 h-4" /> Add Cover Region
              </button>
            </div>

            {/* Cover list */}
            {covers.length > 0 && (
              <div className="card space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Cover Regions ({covers.length})</p>
                {covers.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 glass rounded-xl">
                    <span className="w-6 h-6 rounded-md bg-red-500/20 text-red-300 text-[10px] flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white">{c.type === 'blur' ? '🌫️ Blur' : '⬛ Solid'} · {c.x},{c.y} → {c.w}×{c.h}%</p>
                      <p className="text-[10px] text-white/30">{fmt(c.startTime)} – {c.endTime === null ? 'End' : fmt(c.endTime)}</p>
                    </div>
                    <button onClick={() => setCovers(prev => prev.filter(x => x.id !== c.id))}
                      className="w-6 h-6 rounded-lg glass-hover flex items-center justify-center text-red-400 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Export tool ─────────────────────────────────────────────── */}
        {loaded && tool === 'export' && (
          <div className="card space-y-4">
            <p className="text-sm font-semibold text-white/80">Export Video</p>

            <div className="space-y-2 text-xs text-white/50">
              <p>✓ {overlays.length} text layer{overlays.length !== 1 ? 's' : ''}</p>
              <p>✓ {covers.length} cover/blur region{covers.length !== 1 ? 's' : ''}</p>
              <p>✓ Style: {filterPreset.label} · B{brightness} C{contrast} S{saturation}</p>
              <p>✓ Duration: {fmt(duration)}</p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-xs text-yellow-300 font-semibold mb-1">How export works</p>
              <p className="text-xs text-yellow-300/70">The video will play from start to finish while your edits are recorded. A {fmt(duration)} video takes {fmt(duration)} to export. Keep this tab open and active.</p>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-300 font-semibold mb-1">Output format</p>
              <p className="text-xs text-blue-300/70">Exports as WebM (supported everywhere). To convert to MP4, use CloudConvert or VLC — both free.</p>
            </div>

            {exporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50">
                  <span>Recording… keep tab active</span>
                  <span>{Math.round(exportPct)}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${exportPct}%` }} />
                </div>
              </div>
            )}

            <button onClick={exportVideo} disabled={exporting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity">
              {exporting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording {Math.round(exportPct)}%…</>
                : <><Download className="w-4 h-4" /> Export Edited Video</>}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
