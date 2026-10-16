/**
 * Procedural audio for Git Quest. Everything is synthesised with the Web Audio API, so there are no audio
 * files to license or download. Music is a generative ambient score (pads, plucks, bass) whose key, scale
 * and tempo change per map; a "battle" mood adds drums and a faster pulse. Sound effects are short synths.
 *
 * Browsers only allow audio after a user gesture, so nothing plays until `unlock()` is called from one.
 */

export type SfxName =
  | 'hit' | 'miss' | 'hurt' | 'xp' | 'gem' | 'victory' | 'levelup' | 'defeat' | 'engage' | 'blocked' | 'click' | 'step' | 'restart'
  | 'jump' | 'land' | 'plank' | 'shield' | 'heal';
export type Mood = 'menu' | 'explore' | 'battle';

export interface AudioSettings {
  musicOn: boolean;
  sfxOn: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

const DEFAULTS: AudioSettings = { musicOn: true, sfxOn: true, musicVolume: 0.55, sfxVolume: 0.75 };
const STORAGE_KEY = 'gitquest:audio'; // device-level preference, not game progress

interface ThemeSpec {
  root: number; // MIDI note of the tonic
  scale: number[]; // semitone offsets
  bpm: number;
  chords: number[][]; // scale-degree triads, one per 8 beats
  pad: OscillatorType;
  bright: number; // 0..1 filter openness
  wet: number; // reverb amount
}

const PENTA_MAJOR = [0, 2, 4, 7, 9];
const PENTA_MINOR = [0, 3, 5, 7, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const THEMES: Record<string, ThemeSpec> = {
  menu: { root: 62, scale: DORIAN, bpm: 62, chords: [[0, 2, 4], [3, 5, 7], [1, 3, 5], [4, 6, 8]], pad: 'triangle', bright: 0.7, wet: 0.5 },
  '1': { root: 67, scale: PENTA_MAJOR, bpm: 72, chords: [[0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 2, 4]], pad: 'triangle', bright: 0.85, wet: 0.4 },
  '2': { root: 50, scale: PENTA_MINOR, bpm: 54, chords: [[0, 2, 4], [2, 4, 6], [1, 3, 5], [0, 2, 4]], pad: 'sine', bright: 0.35, wet: 0.85 },
  '3': { root: 57, scale: DORIAN, bpm: 66, chords: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [0, 2, 4]], pad: 'triangle', bright: 0.7, wet: 0.5 },
  '4': { root: 52, scale: PHRYGIAN, bpm: 82, chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [6, 8, 10]], pad: 'sawtooth', bright: 0.4, wet: 0.45 },
  '5': { root: 65, scale: LYDIAN, bpm: 76, chords: [[0, 2, 4], [1, 3, 5], [4, 6, 8], [3, 5, 7]], pad: 'triangle', bright: 0.95, wet: 0.5 },
  '6': { root: 60, scale: PENTA_MAJOR, bpm: 86, chords: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [0, 2, 4]], pad: 'triangle', bright: 0.9, wet: 0.3 },
  '7': { root: 59, scale: PENTA_MINOR, bpm: 58, chords: [[0, 2, 4], [3, 5, 7], [2, 4, 6], [1, 3, 5]], pad: 'sine', bright: 0.6, wet: 0.9 },
  '8': { root: 49, scale: MINOR, bpm: 90, chords: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]], pad: 'sawtooth', bright: 0.3, wet: 0.5 },
  // Secret maps
  '101': { root: 55, scale: PENTA_MINOR, bpm: 50, chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [3, 5, 7]], pad: 'sine', bright: 0.4, wet: 0.95 },
  '102': { root: 57, scale: DORIAN, bpm: 56, chords: [[0, 2, 4], [4, 6, 8], [3, 5, 7], [0, 2, 4]], pad: 'triangle', bright: 0.5, wet: 0.8 },
  '103': { root: 53, scale: PHRYGIAN, bpm: 74, chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [5, 7, 9]], pad: 'sawtooth', bright: 0.35, wet: 0.6 },
  '104': { root: 62, scale: LYDIAN, bpm: 64, chords: [[0, 2, 4], [2, 4, 6], [1, 3, 5], [4, 6, 8]], pad: 'sine', bright: 0.8, wet: 0.85 },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private themeBus: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private settings: AudioSettings = { ...DEFAULTS };
  private listeners = new Set<() => void>();
  private themeKey = 'menu';
  private mood: Mood = 'menu';
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private lastStepSfx = 0;

  constructor() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) this.settings = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AudioSettings>) };
    } catch {
      /* storage unavailable: defaults apply */
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else if (this.settings.musicOn || this.settings.sfxOn) void this.ctx.resume();
      });
    }
  }

  /* ------------------------------------------------------------ settings store (for React) */

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  };
  getSettings = (): AudioSettings => this.settings;

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
    this.applyVolumes();
    this.syncScheduler();
    this.listeners.forEach((l) => l());
  }

  setMuted(muted: boolean): void {
    this.update({ musicOn: !muted, sfxOn: !muted });
  }

  /* ------------------------------------------------------------ lifecycle */

  /** Call from a user gesture (click/key). Safe to call repeatedly. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
      this.build();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncScheduler();
  }

  private build(): void {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicGain = ctx.createGain();
    this.musicGain.connect(this.master);
    this.themeBus = ctx.createGain();
    this.themeBus.connect(this.musicGain);

    this.sfxGain = ctx.createGain();
    this.sfxGain.connect(this.master);

    // Reverb: a generated noise tail
    const convolver = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    convolver.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.5;
    this.reverbSend.connect(convolver);
    convolver.connect(this.themeBus);

    // One second of white noise, reused by every percussive sound
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;

    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.settings.musicOn ? this.settings.musicVolume * 0.42 : 0, t, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxOn ? this.settings.sfxVolume : 0, t, 0.05);
  }

  /* ------------------------------------------------------------ music */

  setTheme(id: number | 'menu'): void {
    const key = String(id);
    const next = THEMES[key] ? key : THEMES['1'] ? '1' : 'menu';
    if (next === this.themeKey) return;
    if (!this.ctx || !this.themeBus) { this.themeKey = next; return; }
    const t = this.ctx.currentTime;
    this.themeBus.gain.cancelScheduledValues(t);
    this.themeBus.gain.setValueAtTime(this.themeBus.gain.value, t);
    this.themeBus.gain.linearRampToValueAtTime(0, t + 0.5);
    setTimeout(() => {
      if (!this.ctx || !this.themeBus) return;
      this.themeKey = next;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.05;
      const n = this.ctx.currentTime;
      this.themeBus.gain.cancelScheduledValues(n);
      this.themeBus.gain.setValueAtTime(0, n);
      this.themeBus.gain.linearRampToValueAtTime(1, n + 1.8);
    }, 520);
  }

  setMood(mood: Mood): void {
    this.mood = mood;
  }

  private syncScheduler(): void {
    const want = !!this.ctx && this.settings.musicOn;
    if (want && !this.timer) {
      this.nextTime = this.ctx!.currentTime + 0.1;
      if (this.themeBus) this.themeBus.gain.setValueAtTime(1, this.ctx!.currentTime);
      this.timer = setInterval(() => this.tick(), 120);
    } else if (!want && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const theme = THEMES[this.themeKey] ?? THEMES.menu;
    const battle = this.mood === 'battle';
    const bpm = theme.bpm * (battle ? 1.28 : this.mood === 'menu' ? 0.9 : 1);
    const stepDur = 60 / bpm / 2;
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.5) {
      this.scheduleStep(theme, this.step, this.nextTime, stepDur, battle);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private degree(theme: ThemeSpec, deg: number): number {
    const n = theme.scale.length;
    const oct = Math.floor(deg / n);
    return theme.root + theme.scale[((deg % n) + n) % n] + 12 * oct;
  }

  private scheduleStep(theme: ThemeSpec, i: number, t: number, stepDur: number, battle: boolean): void {
    const chord = theme.chords[Math.floor(i / 16) % theme.chords.length];
    if (i % 16 === 0) for (const d of chord) this.pad(theme, mtof(this.degree(theme, d)), t, stepDur * 16);
    if (i % 8 === 0) this.tone(mtof(this.degree(theme, chord[0]) - 12), t, stepDur * 6, 'sine', 0.3, { bus: 'theme' });
    const density = battle ? 0.8 : this.mood === 'menu' ? 0.35 : 0.5;
    if (Math.random() < density) {
      const pool = [...chord, chord[0] + 7, chord[1] + 7, chord[2] + 7, chord[0] + 5];
      const note = this.degree(theme, pool[Math.floor(Math.random() * pool.length)]) + 12;
      this.tone(mtof(note), t, stepDur * 4, 'triangle', battle ? 0.2 : 0.16, { bus: 'theme', send: theme.wet, attack: 0.008 });
    }
    if (battle) {
      if (i % 4 === 0) this.tone(130, t, 0.22, 'sine', 0.55, { bus: 'theme', slideTo: 42 });
      if (i % 8 === 4) this.hitNoise(t, 0.12, 0.3, 'bandpass', 1800);
      if (i % 2 === 1) this.hitNoise(t, 0.04, 0.07, 'highpass', 6000);
    }
  }

  private pad(theme: ThemeSpec, f: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500 + theme.bright * 2200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 1.6);
    g.gain.setValueAtTime(0.1, t + dur - 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.8);
    filter.connect(g);
    g.connect(this.themeBus!);
    const send = ctx.createGain();
    send.gain.value = theme.wet;
    g.connect(send);
    send.connect(this.reverbSend!);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = theme.pad;
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 2);
    }
  }

  /* ------------------------------------------------------------ synth helpers */

  private tone(
    f: number, t: number, dur: number, type: OscillatorType, gain: number,
    o: { bus?: 'sfx' | 'theme'; slideTo?: number; attack?: number; send?: number } = {}
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t + dur);
    const a = o.attack ?? 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect((o.bus === 'theme' ? this.themeBus : this.sfxGain)!);
    if (o.send && this.reverbSend) {
      const s = ctx.createGain();
      s.gain.value = o.send;
      g.connect(s);
      s.connect(this.reverbSend);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private hitNoise(t: number, dur: number, gain: number, type: BiquadFilterType, freq: number, sweepTo?: number, bus: 'sfx' | 'theme' = 'theme'): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect((bus === 'theme' ? this.themeBus : this.sfxGain)!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /* ------------------------------------------------------------ sound effects */

  playSfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.settings.sfxOn) return;
    const t = ctx.currentTime + 0.005;
    const n = (f: number, at: number, d: number, type: OscillatorType, g: number, o: { slideTo?: number; attack?: number; send?: number } = {}) =>
      this.tone(f, t + at, d, type, g, { bus: 'sfx', ...o });
    switch (name) {
      case 'hit': // sword slash + impact
        this.hitNoise(t, 0.16, 0.5, 'bandpass', 700, 4200, 'sfx');
        n(190, 0.09, 0.2, 'sine', 0.8, { slideTo: 55 });
        n(1250, 0.09, 0.14, 'triangle', 0.25);
        this.hitNoise(t + 0.09, 0.08, 0.4, 'highpass', 2500, undefined, 'sfx');
        break;
      case 'miss':
        n(320, 0, 0.09, 'triangle', 0.25);
        this.hitNoise(t, 0.12, 0.12, 'lowpass', 600, undefined, 'sfx');
        break;
      case 'hurt': // wrong command: the monster strikes back
        n(150, 0, 0.35, 'sawtooth', 0.55, { slideTo: 45 });
        n(98, 0.02, 0.3, 'square', 0.3, { slideTo: 60 });
        this.hitNoise(t, 0.25, 0.5, 'lowpass', 1800, 200, 'sfx');
        break;
      case 'xp':
        [880, 1109, 1319, 1760].forEach((f, i) => n(f, i * 0.06, 0.28, 'triangle', 0.28, { send: 0.4 }));
        break;
      case 'gem':
        n(1568, 0, 0.35, 'sine', 0.35, { send: 0.5 });
        n(2093, 0.07, 0.45, 'sine', 0.3, { send: 0.5 });
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => n(f, i * 0.12, 0.5, 'triangle', 0.4, { send: 0.5 }));
        n(1319, 0.5, 0.9, 'triangle', 0.35, { send: 0.6 });
        n(130, 0, 0.4, 'sine', 0.7, { slideTo: 50 });
        break;
      case 'levelup':
        [392, 494, 587, 784, 988, 1175].forEach((f, i) => n(f, i * 0.09, 0.55, 'square', 0.18, { send: 0.5 }));
        n(1568, 0.6, 1.0, 'sine', 0.3, { send: 0.7 });
        break;
      case 'defeat':
        [440, 392, 349, 294, 220].forEach((f, i) => n(f, i * 0.22, 0.6, 'sawtooth', 0.3, { slideTo: f * 0.8 }));
        n(55, 0, 1.4, 'sine', 0.7);
        break;
      case 'engage': // battle horn + drum
        n(196, 0, 0.9, 'sawtooth', 0.35, { attack: 0.18, send: 0.4 });
        n(294, 0.05, 0.9, 'sawtooth', 0.25, { attack: 0.18, send: 0.4 });
        n(100, 0.3, 0.3, 'sine', 0.8, { slideTo: 38 });
        break;
      case 'blocked':
        n(96, 0, 0.14, 'square', 0.35, { slideTo: 60 });
        this.hitNoise(t, 0.1, 0.25, 'lowpass', 500, undefined, 'sfx');
        break;
      case 'click':
        n(640, 0, 0.04, 'square', 0.12);
        break;
      case 'step': {
        const now = performance.now();
        if (now - this.lastStepSfx < 180) return;
        this.lastStepSfx = now;
        this.hitNoise(t, 0.05, 0.08 + Math.random() * 0.03, 'lowpass', 500 + Math.random() * 400, undefined, 'sfx');
        break;
      }
      case 'shield':
        n(880, 0, 0.25, 'square', 0.18, { slideTo: 1320 });
        n(1760, 0.02, 0.4, 'triangle', 0.22, { send: 0.5 });
        this.hitNoise(t, 0.08, 0.25, 'highpass', 3000, undefined, 'sfx');
        break;
      case 'heal':
        [523, 659, 784, 1047].forEach((f, i) => n(f, i * 0.08, 0.45, 'sine', 0.26, { send: 0.6 }));
        break;
      case 'jump':
        n(300, 0, 0.2, 'triangle', 0.28, { slideTo: 640 });
        this.hitNoise(t, 0.1, 0.1, 'highpass', 2000, undefined, 'sfx');
        break;
      case 'land':
        n(130, 0, 0.16, 'sine', 0.5, { slideTo: 60 });
        this.hitNoise(t, 0.09, 0.2, 'lowpass', 700, undefined, 'sfx');
        break;
      case 'plank': { // footstep on a wooden bridge
        const now = performance.now();
        if (now - this.lastStepSfx < 180) return;
        this.lastStepSfx = now;
        n(200 + Math.random() * 40, 0, 0.08, 'sine', 0.3, { slideTo: 130 });
        this.hitNoise(t, 0.05, 0.1, 'lowpass', 1100, undefined, 'sfx');
        break;
      }
      case 'restart':
        this.hitNoise(t, 0.5, 0.35, 'bandpass', 300, 3000, 'sfx');
        n(262, 0.15, 0.5, 'triangle', 0.3, { send: 0.5 });
        n(392, 0.3, 0.6, 'triangle', 0.3, { send: 0.5 });
        break;
    }
  }
}

export const gameAudio = new GameAudio();
