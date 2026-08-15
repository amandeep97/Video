import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyLine({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${c ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
      title="Copy">
      {c ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function Section({ title, copyAll, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">{title}</p>
        {copyAll && <CopyLine text={copyAll} />}
      </div>
      {children}
    </div>
  );
}

export default function KitDetail({ kit }) {
  if (!kit) return null;

  const overlayAll = (kit.overlays || []).map(o => o.pa).join('\n');
  const hashtagLine = (kit.hashtags || []).join(' ');
  const fullDesc = `${kit.description || ''}\n\n${hashtagLine}`;

  return (
    <div className="space-y-5">
      <Section title="First frame (stops the scroll)">
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 leading-relaxed">{kit.firstFrame}</div>
      </Section>

      <Section title="On-screen lines — one per clip, in order" copyAll={overlayAll}>
        <div className="space-y-2">
          {(kit.overlays || []).map((o, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white/40 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 leading-snug">{o.pa}</p>
                {o.translit && <p className="text-[10px] text-white/30 mt-0.5">{o.translit}</p>}
              </div>
              <CopyLine text={o.pa} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Footage — search these on Pexels/Pixabay" copyAll={(kit.footage || []).join('\n')}>
        <div className="space-y-1.5">
          {(kit.footage || []).map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="flex-1 text-sm text-white/70">{f}</span>
              <CopyLine text={f} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="YouTube title — pick one">
        <div className="space-y-2">
          {(kit.ytTitles || []).map((t, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
              <span className="flex-1 text-sm text-white/80">{t}</span>
              <CopyLine text={t} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="YouTube description — paste as-is" copyAll={fullDesc}>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{fullDesc}</div>
      </Section>

      <Section title="Instagram caption" copyAll={kit.igCaption}>
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{kit.igCaption}</div>
      </Section>

      <div className="flex gap-2 text-xs text-white/40 bg-white/5 border border-white/10 rounded-xl p-3">
        <span>🎬</span>
        <span>Build: CapCut → 4 clips → one line per clip → transition on the beat → export. Add the song <b className="text-white/60">inside Instagram/YouTube</b> when posting.</span>
      </div>
    </div>
  );
}
