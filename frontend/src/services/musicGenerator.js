// Procedural ambient background music — no audio files needed

const CHORD_SETS = {
  professional: { notes: [[130.81, 164.81, 196.00], [146.83, 185.00, 220.00]], tempo: 8000 },
  cinematic:    { notes: [[110.00, 138.59, 164.81], [98.00,  123.47, 146.83]], tempo: 10000 },
  educational:  { notes: [[130.81, 164.81, 196.00], [146.83, 184.99, 220.00]], tempo: 7000 },
  social:       { notes: [[146.83, 185.00, 220.00], [164.81, 207.65, 246.94]], tempo: 6000 },
  motivational: { notes: [[146.83, 185.00, 220.00], [130.81, 164.81, 196.00]], tempo: 5000 },
  documentary:  { notes: [[110.00, 130.81, 164.81], [98.00,  123.47, 155.56]], tempo: 9000 },
};

function makeReverb(ctx) {
  const convolver = ctx.createConvolver();
  const length = ctx.sampleRate * 2.5;
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
  }
  convolver.buffer = buf;
  return convolver;
}

export function startMusic(audioCtx, style = 'professional', destination, volume = 0.10) {
  const config = CHORD_SETS[style] || CHORD_SETS.professional;
  const master  = audioCtx.createGain();
  master.gain.value = volume;
  master.connect(destination);

  const reverb = makeReverb(audioCtx);
  reverb.connect(master);
  const dry = audioCtx.createGain(); dry.gain.value = 0.55; dry.connect(master);
  const wet = audioCtx.createGain(); wet.gain.value = 0.45; wet.connect(reverb);

  let chordIdx = 0, stopped = false;

  function playChord() {
    if (stopped) return;
    const notes = config.notes[chordIdx++ % config.notes.length];
    const dur = config.tempo / 1000;
    notes.forEach((freq, i) => {
      const osc    = audioCtx.createOscillator();
      const gain   = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = 500 + i * 80;
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 1.2);
      gain.gain.setValueAtTime(0.18, now + dur - 1.5);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(filter); filter.connect(gain);
      gain.connect(dry); gain.connect(wet);
      osc.start(now); osc.stop(now + dur + 0.1);
    });
    setTimeout(playChord, config.tempo - 300);
  }

  playChord();
  return () => { stopped = true; try { master.disconnect(); } catch {} };
}
