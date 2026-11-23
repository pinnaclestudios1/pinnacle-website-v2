/** Tiny synthesized sound kit (no audio files). Off until the visitor turns it on. */
export class Sound {
  constructor() {
    this.enabled = false;
    this.ctx = null;
  }

  _ctx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggle(on = !this.enabled) {
    this.enabled = on;
    if (on) {
      this._ctx();
      this.startAmbience();
      this.tick();
    } else this.stopAmbience();
    return on;
  }

  _tone(freq, { t = 0, dur = 1.2, type = 'sine', gain = 0.5 } = {}) {
    const ctx = this._ctx();
    if (!ctx) return;
    const now = ctx.currentTime + t;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + dur + 0.05);
  }

  ding() {
    if (!this.enabled) return;
    this._tone(1318.5, { dur: 1.6, gain: 0.25 });
    this._tone(2637, { dur: 0.8, gain: 0.05 });
    this._tone(1046.5, { t: 0.32, dur: 2.0, gain: 0.22 });
    this._tone(2093, { t: 0.32, dur: 0.9, gain: 0.04 });
  }

  tick() {
    if (!this.enabled) return;
    this._tone(880, { dur: 0.08, type: 'triangle', gain: 0.08 });
  }

  pop() {
    if (!this.enabled) return;
    const ctx = this._ctx();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(320, now);
    o.frequency.exponentialRampToValueAtTime(980, now + 0.12);
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + 0.25);
  }

  /** Doors meeting: a soft, low thud. */
  thud() {
    if (!this.enabled) return;
    const ctx = this._ctx();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, now);
    o.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + 0.3);
  }

  /** Lift motor hum whose pitch and level follow the cab's speed (0…1). */
  motor() {
    if (!this.enabled) return null;
    const ctx = this._ctx();
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.value = 0;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const a = ctx.createOscillator();
    const b = ctx.createOscillator();
    a.type = 'sawtooth';
    b.type = 'sine';
    a.frequency.value = 55;
    b.frequency.value = 110;
    a.connect(f);
    b.connect(f);
    f.connect(g).connect(this.master);
    a.start(now);
    b.start(now);
    return {
      set: (v) => {
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0.025 + v * 0.07, t, 0.05);
        a.frequency.setTargetAtTime(52 + v * 30, t, 0.05);
        b.frequency.setTargetAtTime(104 + v * 60, t, 0.05);
      },
      stop: () => {
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0, t, 0.08);
        a.stop(t + 0.5);
        b.stop(t + 0.5);
      },
    };
  }

  whoosh(dur = 1.2) {
    if (!this.enabled) return;
    const ctx = this._ctx();
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  startAmbience() {
    const ctx = this._ctx();
    if (!ctx || this.amb) return;
    // A soft, slowly beating room tone.
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const oscs = [110, 164.8, 220.5].map((fr) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr;
      o.connect(f);
      o.start();
      return o;
    });
    f.connect(g).connect(this.master);
    this.amb = { g, oscs };
  }

  stopAmbience() {
    if (!this.amb || !this.ctx) return;
    const { g, oscs } = this.amb;
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    setTimeout(() => oscs.forEach((o) => o.stop()), 600);
    this.amb = null;
  }
}
