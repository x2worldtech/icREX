import type { SfxName } from "./types";

// Fully procedural audio. No asset files required: every effect is synthesised
// with the Web Audio API, which keeps the canister tiny and avoids missing-file
// fallbacks. The context is created lazily and resumed on the first user
// gesture to satisfy browser autoplay policies.

type AudioCtx = AudioContext;

export class AudioManager {
  private ctx: AudioCtx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = false;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  private ensure(): AudioCtx | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.9;
      master.connect(ctx.destination);
      const music = ctx.createGain();
      music.gain.value = 0.0;
      music.connect(master);
      this.ctx = ctx;
      this.master = master;
      this.musicGain = music;
      return ctx;
    } catch {
      return null;
    }
  }

  // Call from a user gesture (start button / first key) to unlock audio.
  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.05);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, freqEnd),
      now + duration,
    );
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private noiseBurst(duration: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  play(name: SfxName): void {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    if (ctx.state === "suspended") void ctx.resume();
    switch (name) {
      case "jump":
        this.tone(420, 720, 0.16, "square", 0.18);
        break;
      case "doubleJump":
        this.tone(620, 980, 0.16, "square", 0.18);
        break;
      case "coin":
        this.tone(988, 1319, 0.13, "square", 0.22);
        break;
      case "milestone":
        this.tone(660, 990, 0.18, "triangle", 0.22);
        this.tone(880, 1320, 0.22, "triangle", 0.16);
        break;
      case "select":
        this.tone(520, 660, 0.1, "triangle", 0.16);
        break;
      case "powerup":
        this.tone(523, 784, 0.12, "triangle", 0.2);
        this.tone(659, 988, 0.18, "triangle", 0.18);
        break;
      case "shieldBreak":
        this.noiseBurst(0.18, 0.35);
        this.tone(880, 220, 0.22, "square", 0.18);
        break;
      case "nearMiss":
        this.tone(720, 1040, 0.09, "sine", 0.12);
        break;
      case "golden":
        this.tone(784, 1175, 0.12, "triangle", 0.2);
        this.tone(988, 1568, 0.2, "sine", 0.16);
        break;
      case "mission":
        this.tone(659, 988, 0.12, "triangle", 0.2);
        this.tone(784, 1318, 0.22, "triangle", 0.18);
        break;
      case "hit":
        this.noiseBurst(0.3, 0.5);
        this.tone(220, 60, 0.35, "sawtooth", 0.25);
        break;
    }
  }

  // Coin pickup whose pitch rises with the current combo for satisfying feel.
  coinPitched(combo: number): void {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    if (ctx.state === "suspended") void ctx.resume();
    const semis = Math.min(12, Math.max(0, combo - 1));
    const mult = 2 ** (semis / 12);
    this.tone(988 * mult, 1319 * mult, 0.13, "square", 0.22);
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (!on) this.stopMusic();
  }

  // A light, optional desert arpeggio that loops while playing.
  startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null || !this.musicGain || !this.musicEnabled)
      return;
    this.musicGain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.4);
    const scale = [196, 233.08, 261.63, 293.66, 349.23, 392];
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.muted) return;
      const now = this.ctx.currentTime;
      const note = scale[this.musicStep % scale.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = this.musicStep % 4 === 0 ? note / 2 : note;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.5);
      this.musicStep++;
    }, 230);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }
  }

  dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
