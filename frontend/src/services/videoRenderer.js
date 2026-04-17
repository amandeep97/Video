// Professional motion graphics renderer — InVideo/Canva-style text-based video

const STYLE_THEMES = {
  professional: {
    bg1: '#0f172a', bg2: '#1e293b',
    accent: '#3b82f6', accent2: '#6366f1',
    text: '#f1f5f9', sub: '#94a3b8',
    shape: '#1d4ed8',
  },
  cinematic: {
    bg1: '#0c0c0c', bg2: '#1a0a2e',
    accent: '#a855f7', accent2: '#ec4899',
    text: '#faf5ff', sub: '#c4b5fd',
    shape: '#7c3aed',
  },
  educational: {
    bg1: '#042f2e', bg2: '#0d4f4c',
    accent: '#10b981', accent2: '#06b6d4',
    text: '#ecfdf5', sub: '#6ee7b7',
    shape: '#059669',
  },
  social: {
    bg1: '#1e0a3c', bg2: '#3b0764',
    accent: '#f97316', accent2: '#fb923c',
    text: '#fff7ed', sub: '#fdba74',
    shape: '#c2410c',
  },
  motivational: {
    bg1: '#1c0a00', bg2: '#431407',
    accent: '#f59e0b', accent2: '#ef4444',
    text: '#fffbeb', sub: '#fcd34d',
    shape: '#b45309',
  },
  documentary: {
    bg1: '#111827', bg2: '#1f2937',
    accent: '#6b7280', accent2: '#9ca3af',
    text: '#f9fafb', sub: '#d1d5db',
    shape: '#4b5563',
  },
};

function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function hexToRgb(hex) {
  const v = parseInt(hex.replace('#', ''), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Animated background with moving gradient blobs
function drawBackground(ctx, theme, W, H, t) {
  // Base gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Animated blob 1 (top-left area)
  const bx1 = W * 0.15 + Math.sin(t * 0.4) * W * 0.08;
  const by1 = H * 0.2 + Math.cos(t * 0.3) * H * 0.06;
  const blob1 = ctx.createRadialGradient(bx1, by1, 0, bx1, by1, W * 0.35);
  blob1.addColorStop(0, rgba(theme.accent, 0.18));
  blob1.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = blob1;
  ctx.fillRect(0, 0, W, H);

  // Animated blob 2 (bottom-right area)
  const bx2 = W * 0.8 + Math.sin(t * 0.25 + 2) * W * 0.07;
  const by2 = H * 0.75 + Math.cos(t * 0.35 + 1) * H * 0.07;
  const blob2 = ctx.createRadialGradient(bx2, by2, 0, bx2, by2, W * 0.3);
  blob2.addColorStop(0, rgba(theme.accent2, 0.15));
  blob2.addColorStop(1, rgba(theme.accent2, 0));
  ctx.fillStyle = blob2;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.save();
  ctx.strokeStyle = rgba(theme.text, 0.025);
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();
}

// Floating particles
function drawParticles(ctx, theme, W, H, t) {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const speed = 0.012 + (i % 3) * 0.006;
    const x = ((i * 173.7 + t * speed * W) % W + W) % W;
    const y = ((i * 97.3 + t * (speed * 0.7) * H) % H + H) % H;
    const alpha = 0.06 + Math.sin(t * 1.2 + i * 0.8) * 0.04;
    const radius = 1.5 + Math.sin(t * 0.9 + i) * 0.8;
    ctx.fillStyle = i % 2 === 0 ? rgba(theme.accent, alpha) : rgba(theme.accent2, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Decorative geometric accents
function drawAccents(ctx, theme, W, H, t, sceneType) {
  ctx.save();

  if (sceneType === 'intro' || sceneType === 'outro') {
    // Corner accent lines
    const lineAlpha = 0.35 + Math.sin(t * 1.5) * 0.08;
    ctx.strokeStyle = rgba(theme.accent, lineAlpha);
    ctx.lineWidth = 2;
    // Top-left bracket
    ctx.beginPath(); ctx.moveTo(24, 24 + 30); ctx.lineTo(24, 24); ctx.lineTo(24 + 30, 24); ctx.stroke();
    // Bottom-right bracket
    ctx.beginPath(); ctx.moveTo(W - 24, H - 24 - 30); ctx.lineTo(W - 24, H - 24); ctx.lineTo(W - 24 - 30, H - 24); ctx.stroke();
  }

  if (sceneType === 'content' || sceneType === 'list') {
    // Left vertical accent bar
    const barAlpha = 0.6 + Math.sin(t * 1.2) * 0.1;
    const barGrad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.85);
    barGrad.addColorStop(0, rgba(theme.accent, 0));
    barGrad.addColorStop(0.3, rgba(theme.accent, barAlpha));
    barGrad.addColorStop(0.7, rgba(theme.accent, barAlpha));
    barGrad.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = barGrad;
    ctx.fillRect(20, H * 0.3, 3, H * 0.55);
  }

  if (sceneType === 'highlight') {
    // Horizontal glow lines top and bottom
    const glowAlpha = 0.25 + Math.sin(t * 1.8) * 0.08;
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, rgba(theme.accent, 0));
    topGrad.addColorStop(0.5, rgba(theme.accent, glowAlpha));
    topGrad.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, H * 0.28, W, 2);
    ctx.fillRect(0, H * 0.72, W, 2);
  }

  ctx.restore();
}

// Scene number pill (top-left)
function drawScenePill(ctx, theme, sceneNum, totalScenes, W, t) {
  ctx.save();
  const pillAlpha = 0.7 + Math.sin(t * 0.8) * 0.1;
  ctx.fillStyle = rgba(theme.accent, 0.15);
  ctx.strokeStyle = rgba(theme.accent, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(16, 16, 80, 26, 13);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = rgba(theme.text, pillAlpha);
  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`SCENE ${sceneNum} / ${totalScenes}`, 56, 33);
  ctx.restore();
}

// Progress bar (bottom)
function drawProgressBar(ctx, theme, W, H, progress) {
  ctx.save();
  ctx.fillStyle = rgba(theme.text, 0.08);
  ctx.fillRect(0, H - 4, W, 4);
  const barGrad = ctx.createLinearGradient(0, 0, W * progress, 0);
  barGrad.addColorStop(0, rgba(theme.accent, 0.9));
  barGrad.addColorStop(1, rgba(theme.accent2, 1));
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, H - 4, W * progress, 4);
  ctx.restore();
}

// Wrapped text helper with max-lines truncation
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Animated text with slide-up + fade effect
function drawAnimatedText(ctx, text, x, y, font, color, alpha, slideProgress, textAlign = 'center') {
  if (alpha <= 0) return;
  const slideOffset = (1 - easeOut(clamp(slideProgress, 0, 1))) * 22;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 14;
  ctx.fillText(text, x, y + slideOffset);
  ctx.restore();
}

// ── Layout renderers ──────────────────────────────────────────────────────────

function renderIntro(ctx, scene, theme, W, H, p, t) {
  // Large emoji centered high
  if (scene.emoji) {
    const scale = 1 + Math.sin(t * 1.5) * 0.04;
    ctx.save();
    ctx.font = `${72 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = clamp(p / 0.15, 0, 1);
    ctx.fillText(scene.emoji, W / 2, H * 0.3);
    ctx.restore();
  }

  // Title — big, centered
  const titleAlpha = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;
  ctx.save();
  ctx.font = `bold 32px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleLines = wrapLines(ctx, scene.title || '', W - 100);
  const startY = H * 0.54;
  titleLines.slice(0, 3).forEach((line, i) => {
    drawAnimatedText(ctx, line, W / 2, startY + i * 42, `bold 32px -apple-system, BlinkMacSystemFont, sans-serif`, theme.text, titleAlpha, p - i * 0.06);
  });
  ctx.restore();

  // Subtitle / description line
  if (scene.narration) {
    const subAlpha = p < 0.2 ? (p - 0.08) / 0.12 : p > 0.85 ? (1 - p) / 0.15 : 1;
    ctx.save();
    ctx.font = `15px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    const subLines = wrapLines(ctx, scene.narration.slice(0, 90), W - 140);
    subLines.slice(0, 2).forEach((line, i) => {
      drawAnimatedText(ctx, line, W / 2, H * 0.72 + i * 24, `15px -apple-system, sans-serif`, theme.sub, subAlpha * 0.8, p - 0.1 - i * 0.05);
    });
    ctx.restore();
  }

  // Animated underline accent below title
  const ulAlpha = clamp((p - 0.15) / 0.1, 0, 1);
  if (ulAlpha > 0) {
    const ulW = Math.min(180, (scene.title || '').length * 10) * ulAlpha;
    const ulGrad = ctx.createLinearGradient(W / 2 - ulW / 2, 0, W / 2 + ulW / 2, 0);
    ulGrad.addColorStop(0, rgba(theme.accent, 0));
    ulGrad.addColorStop(0.5, rgba(theme.accent, 0.9));
    ulGrad.addColorStop(1, rgba(theme.accent, 0));
    ctx.fillStyle = ulGrad;
    ctx.fillRect(W / 2 - ulW / 2, H * 0.67 - 8, ulW, 2);
  }
}

function renderContent(ctx, scene, theme, W, H, p, t) {
  // Emoji top-left accent
  if (scene.emoji) {
    const emojiAlpha = clamp(p / 0.12, 0, 0.8);
    ctx.save();
    ctx.font = `40px serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = emojiAlpha;
    ctx.fillText(scene.emoji, 36, H * 0.22);
    ctx.restore();
  }

  // Title — left-aligned, medium size
  const titleAlpha = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
  ctx.save();
  ctx.font = `bold 24px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'left';
  const titleLines = wrapLines(ctx, scene.title || '', W - 60);
  titleLines.slice(0, 2).forEach((line, i) => {
    drawAnimatedText(ctx, line, 36, H * 0.34 + i * 34, `bold 24px -apple-system, BlinkMacSystemFont, sans-serif`, theme.text, titleAlpha, p - i * 0.04, 'left');
  });
  ctx.restore();

  // Accent divider line
  const divAlpha = clamp((p - 0.08) / 0.08, 0, 1);
  if (divAlpha > 0) {
    const divW = (W - 60) * easeOut(divAlpha);
    const divGrad = ctx.createLinearGradient(36, 0, 36 + divW, 0);
    divGrad.addColorStop(0, rgba(theme.accent, 0.9));
    divGrad.addColorStop(1, rgba(theme.accent, 0.1));
    ctx.fillStyle = divGrad;
    ctx.fillRect(36, H * 0.44, divW, 2);
  }

  // Key points
  const keyPoints = scene.keyPoints || [];
  keyPoints.slice(0, 4).forEach((point, i) => {
    const delay = 0.2 + i * 0.12;
    const ptAlpha = clamp((p - delay) / 0.1, 0, 1) * (p > 0.9 ? (1 - p) / 0.1 : 1);
    if (ptAlpha <= 0) return;

    const py = H * 0.52 + i * 38;
    const slideIn = easeOut(clamp((p - delay) / 0.12, 0, 1));

    ctx.save();
    ctx.globalAlpha = ptAlpha;

    // Bullet dot
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(36 + (1 - slideIn) * 15, py, 4, 0, Math.PI * 2);
    ctx.fill();

    // Point text
    ctx.font = `14px -apple-system, sans-serif`;
    ctx.fillStyle = rgba(theme.text, 0.88);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    const ptLines = wrapLines(ctx, point, W - 80);
    ptLines.slice(0, 2).forEach((line, li) => {
      ctx.fillText(line, 52 + (1 - slideIn) * 15, py + li * 20);
    });
    ctx.restore();
  });
}

function renderList(ctx, scene, theme, W, H, p, t) {
  // Header bar
  const headerAlpha = clamp(p / 0.1, 0, 1);
  if (headerAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = headerAlpha * 0.12;
    ctx.fillStyle = theme.accent;
    ctx.roundRect(20, H * 0.12, W - 40, 44, 8);
    ctx.fill();
    ctx.restore();
  }

  // Title in header
  const titleAlpha = p < 0.1 ? p / 0.1 : p > 0.9 ? (1 - p) / 0.1 : 1;
  drawAnimatedText(ctx, scene.title || '', W / 2, H * 0.14 + 22, `bold 20px -apple-system, BlinkMacSystemFont, sans-serif`, theme.text, titleAlpha, p, 'center');

  // Numbered items
  const items = scene.keyPoints || [];
  items.slice(0, 5).forEach((item, i) => {
    const delay = 0.15 + i * 0.13;
    const itemAlpha = clamp((p - delay) / 0.1, 0, 1) * (p > 0.88 ? (1 - p) / 0.12 : 1);
    if (itemAlpha <= 0) return;

    const iy = H * 0.3 + i * 44;
    const slideIn = easeOut(clamp((p - delay) / 0.12, 0, 1));

    ctx.save();
    ctx.globalAlpha = itemAlpha;

    // Number circle
    const numX = 40 + (1 - slideIn) * 20;
    ctx.fillStyle = rgba(theme.accent, 0.25);
    ctx.beginPath();
    ctx.arc(numX, iy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.font = `bold 12px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), numX, iy);

    // Item text
    ctx.font = `14px -apple-system, sans-serif`;
    ctx.fillStyle = rgba(theme.text, 0.9);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    const lines = wrapLines(ctx, item, W - 80);
    lines.slice(0, 2).forEach((line, li) => {
      ctx.fillText(line, numX + 22, iy - 8 + li * 19);
    });

    ctx.restore();
  });
}

function renderHighlight(ctx, scene, theme, W, H, p, t) {
  // Big centered quote / statement
  const titleAlpha = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;

  // Quote marks
  if (titleAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = titleAlpha * 0.15;
    ctx.font = `bold 120px serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = theme.accent;
    ctx.fillText('"', 20, H * 0.18);
    ctx.restore();
  }

  // Main statement text
  ctx.save();
  ctx.font = `bold 26px -apple-system, BlinkMacSystemFont, sans-serif`;
  const lines = wrapLines(ctx, scene.title || '', W - 80);
  const totalH = lines.length * 38;
  const startY = H / 2 - totalH / 2;
  lines.slice(0, 4).forEach((line, i) => {
    drawAnimatedText(ctx, line, W / 2, startY + i * 38, `bold 26px -apple-system, BlinkMacSystemFont, sans-serif`, theme.text, titleAlpha, p - i * 0.06, 'center');
  });
  ctx.restore();

  // Emoji (bottom-right accent)
  if (scene.emoji) {
    const scale = 1 + Math.sin(t * 1.8) * 0.05;
    ctx.save();
    ctx.font = `${44 * scale}px serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = clamp(p / 0.15, 0, 0.7);
    ctx.fillText(scene.emoji, W - 28, H - 32);
    ctx.restore();
  }
}

function renderOutro(ctx, scene, theme, W, H, p, t) {
  // CTA pill background
  const ctaAlpha = clamp((p - 0.1) / 0.15, 0, 1) * (p > 0.9 ? (1 - p) / 0.1 : 1);
  if (ctaAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = ctaAlpha * 0.18;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 100, H * 0.62, 200, 38, 19);
    ctx.fill();
    ctx.restore();
  }

  // Emoji
  if (scene.emoji) {
    const scale = 1 + Math.sin(t * 1.4) * 0.05;
    ctx.save();
    ctx.font = `${68 * scale}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = clamp(p / 0.12, 0, 0.95);
    ctx.fillText(scene.emoji, W / 2, H * 0.3);
    ctx.restore();
  }

  // Title
  const titleAlpha = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;
  ctx.save();
  ctx.font = `bold 28px -apple-system, BlinkMacSystemFont, sans-serif`;
  const tlines = wrapLines(ctx, scene.title || '', W - 100);
  tlines.slice(0, 2).forEach((line, i) => {
    drawAnimatedText(ctx, line, W / 2, H * 0.5 + i * 38, `bold 28px -apple-system, BlinkMacSystemFont, sans-serif`, theme.text, titleAlpha, p - i * 0.06, 'center');
  });
  ctx.restore();

  // CTA label
  drawAnimatedText(ctx, 'Subscribe & Share', W / 2, H * 0.67, `bold 14px -apple-system, sans-serif`, theme.accent, ctaAlpha, p - 0.15, 'center');

  // Pulsing dot below CTA
  if (ctaAlpha > 0) {
    const dotScale = 1 + Math.sin(t * 3) * 0.3;
    ctx.save();
    ctx.globalAlpha = ctaAlpha * 0.6;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.76, 4 * dotScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Detect scene layout from its properties ───────────────────────────────────
function detectLayout(scene, sceneIndex, totalScenes) {
  if (sceneIndex === 0) return 'intro';
  if (sceneIndex === totalScenes - 1) return 'outro';
  const hasMany = (scene.keyPoints || []).length >= 4;
  if (hasMany) return 'list';
  if (scene.keyPoints?.length === 0 && scene.title?.length > 40) return 'highlight';
  return 'content';
}

// ── Draw video background with cinematic overlay ─────────────────────────────
function drawVideoBackground(ctx, bgVideo, theme, W, H) {
  try {
    const vw = bgVideo.videoWidth || W;
    const vh = bgVideo.videoHeight || H;
    const scale = Math.max(W / vw, H / vh);
    const sw = vw * scale, sh = vh * scale;
    ctx.drawImage(bgVideo, (W - sw) / 2, (H - sh) / 2, sw, sh);
  } catch {
    drawBackground(ctx, theme, W, H, 0);
    return;
  }
  // Cinematic vignette overlay — dark top/bottom, lighter middle
  const overlay = ctx.createLinearGradient(0, 0, 0, H);
  overlay.addColorStop(0,    'rgba(0,0,0,0.60)');
  overlay.addColorStop(0.35, 'rgba(0,0,0,0.28)');
  overlay.addColorStop(0.65, 'rgba(0,0,0,0.32)');
  overlay.addColorStop(1,    'rgba(0,0,0,0.68)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);
  // Subtle accent tint
  ctx.fillStyle = rgba(theme.accent, 0.07);
  ctx.fillRect(0, 0, W, H);
}

// ── Main public render function ───────────────────────────────────────────────
export function renderFrame(ctx, scene, script, sceneIndex, totalScenes, progress, timestamp, bgVideo = null) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const style = script?.style || 'professional';
  const theme = { ...STYLE_THEMES[style] || STYLE_THEMES.professional };

  if (script?.colorScheme?.accent) theme.accent = script.colorScheme.accent;
  if (script?.colorScheme?.background) theme.bg1 = script.colorScheme.background;
  if (script?.colorScheme?.text) theme.text = script.colorScheme.text;

  const t = timestamp / 1000;
  const p = clamp(progress, 0, 1);
  const layout = detectLayout(scene, sceneIndex, totalScenes);
  const hasVideo = bgVideo && bgVideo.readyState >= 2;

  // Layer 1: background (video or gradient)
  if (hasVideo) {
    drawVideoBackground(ctx, bgVideo, theme, W, H);
  } else {
    drawBackground(ctx, theme, W, H, t);
    drawParticles(ctx, theme, W, H, t);
  }

  // Layer 2: geometric accents
  drawAccents(ctx, theme, W, H, t, layout);

  // Layer 3: scene content
  ctx.save();
  switch (layout) {
    case 'intro':      renderIntro(ctx, scene, theme, W, H, p, t);     break;
    case 'outro':      renderOutro(ctx, scene, theme, W, H, p, t);     break;
    case 'highlight':  renderHighlight(ctx, scene, theme, W, H, p, t); break;
    case 'list':       renderList(ctx, scene, theme, W, H, p, t);      break;
    default:           renderContent(ctx, scene, theme, W, H, p, t);   break;
  }
  ctx.restore();

  // Layer 4: HUD
  drawScenePill(ctx, theme, sceneIndex + 1, totalScenes, W, t);
  drawProgressBar(ctx, theme, W, H, p);
}
