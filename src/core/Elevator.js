import gsap from 'gsap';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The art-deco lift: brass doors, floor dial and a rolling floor counter.
 * Doubles as the loading screen.
 *
 * A ride:  doors close (rebound + thud) → cab travels (counter rolls, shaft
 * lights sweep, doors vibrate with speed, needle follows) → ding → a light leak
 * through the seam → doors part while the doorway frame drifts past the camera.
 */
export class Elevator {
  constructor(root, levels, names, sound) {
    this.root = root;
    this.sound = sound;
    this.levels = levels;
    this.names = names;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.needle = root.querySelector('[data-dial-needle]');
    this.fill = root.querySelector('[data-dial-fill]');
    this.status = root.querySelector('[data-elevator-status]');
    this.enterBtn = root.querySelector('[data-action="enter"]');
    this.marks = root.querySelector('[data-dial-marks]');
    this.reel = root.querySelector('[data-elevator-reel]');
    this.dest = root.querySelector('[data-elevator-dest]');
    this.bands = root.querySelector('[data-elevator-bands]');
    this.angle = { v: -70 };
    this.pos = 0; // current floor position (fractional while travelling)
    this._len = this.fill.getTotalLength();
    this.fill.style.strokeDasharray = `${this._len}`;
    this.fill.style.strokeDashoffset = `${this._len}`;

    const ns = 'http://www.w3.org/2000/svg';
    levels.forEach((lvl, i) => {
      const a = this._angleFor(i);
      const rad = ((a - 90) * Math.PI) / 180;
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', (100 + Math.cos(rad) * 62).toFixed(1));
      t.setAttribute('y', (100 + Math.sin(rad) * 62 + 4).toFixed(1));
      t.setAttribute('text-anchor', 'middle');
      t.textContent = lvl;
      t.dataset.i = i;
      this.marks.appendChild(t);
    });
    this.reel.innerHTML = levels.map((l) => `<span>${l}</span>`).join('');
    this._setNeedle(-70);
  }

  _angleFor(i) {
    const n = this.levels.length - 1;
    return -60 + (120 * i) / n;
  }

  _setNeedle(a) {
    this.angle.v = a;
    this.needle.setAttribute('transform', `rotate(${a.toFixed(2)} 100 100)`);
  }

  _lightMark(i) {
    this.marks.querySelectorAll('text').forEach((t) => t.classList.toggle('is-on', Number(t.dataset.i) === i));
  }

  _setPos(p) {
    this.pos = p;
    this.reel.style.transform = `translateY(${(-p).toFixed(4)}em)`;
    this._setNeedle(this._angleFor(0) + (this._angleFor(this.levels.length - 1) - this._angleFor(0)) * (p / (this.levels.length - 1)));
  }

  setLoad(p) {
    this.fill.style.strokeDashoffset = `${this._len * (1 - p)}`;
    this._setNeedle(-70 + 140 * p);
  }

  async ready(floorIndex, label) {
    this.status.textContent = label;
    this.fill.style.transition = 'stroke-dashoffset .6s ease, opacity .6s ease';
    this.fill.style.opacity = '0';
    await this.needleTo(floorIndex, 0.9);
    this._setPos(floorIndex);
    this.enterBtn.hidden = false;
    this.root.classList.add('is-ready');
    requestAnimationFrame(() => this.enterBtn.focus({ preventScroll: true }));
  }

  needleTo(i, dur = 0.8) {
    this._lightMark(-1);
    return new Promise((res) =>
      gsap.to(this.angle, {
        v: this._angleFor(i),
        duration: dur,
        ease: 'power2.inOut',
        onUpdate: () => this._setNeedle(this.angle.v),
        onComplete: () => {
          this._lightMark(i);
          res();
        },
      }),
    );
  }

  /** Light leak through the seam, then the doors part. `onOpening` fires as they start moving. */
  async open(onOpening) {
    const r = this.root;
    this.enterBtn.hidden = true;
    r.classList.remove('is-ready', 'is-riding', 'is-arrived');
    r.classList.add('is-leak');
    this.sound?.whoosh(1.1);
    await wait(this.reduced ? 60 : 280);
    onOpening?.();
    r.classList.add('is-opening', 'is-stepping');
    r.classList.remove('is-closed');
    await wait(1250);
    r.classList.remove('is-opening', 'is-leak');
    r.classList.add('is-open');
    await wait(400);
    r.classList.remove('is-stepping');
  }

  /** Doors slide shut, rebound slightly and land with a soft thud. */
  async close() {
    const r = this.root;
    r.classList.remove('is-open', 'is-stepping');
    r.classList.add('is-closed');
    this.sound?.whoosh(0.8);
    await wait(820);
    r.classList.add('is-thunk');
    this.sound?.thud();
    await wait(260);
    r.classList.remove('is-thunk');
  }

  /** The cab travels: rolling counter, sweeping shaft lights, speed-driven vibration. */
  travel(from, to) {
    const n = Math.abs(to - from);
    const dir = Math.sign(to - from) || 1;
    const dur = this.reduced ? 0.5 : 0.95 + 0.38 * (n - 1);
    const motor = this.sound?.motor();
    const state = { k: 0 };
    let last = 0;
    let lastT = performance.now();
    let lastFloor = from;
    this.root.style.setProperty('--dir', dir);
    return new Promise((res) =>
      gsap.to(state, {
        k: 1,
        duration: dur,
        ease: 'sine.inOut',
        onUpdate: () => {
          const now = performance.now();
          const p = from + (to - from) * state.k;
          // speed in floors per second, normalised to the ride's peak speed
          const v = Math.abs(state.k - last) / Math.max(1e-3, (now - lastT) / 1000);
          const vn = Math.min(1, v / ((Math.PI / 2) * (1 / dur)));
          last = state.k;
          lastT = now;
          this._setPos(p);
          const floor = Math.round(p);
          if (floor !== lastFloor) {
            lastFloor = floor;
            this._lightMark(floor);
            this.sound?.tick();
          }
          if (!this.reduced) {
            // Going up, the shaft lights slide down past the doors (one band per floor).
            this.bands.style.backgroundPosition = `0 ${(dir * (p - from) * 100).toFixed(2)}vh`;
            this.bands.style.opacity = (0.15 + vn * 0.85).toFixed(3);
            const amp = vn * 1.4;
            this.root.style.setProperty('--sx', `${((Math.random() - 0.5) * amp).toFixed(2)}px`);
            this.root.style.setProperty('--sy', `${((Math.random() - 0.5) * amp * 0.6).toFixed(2)}px`);
          }
          motor?.set(vn);
        },
        onComplete: () => {
          this.root.style.setProperty('--sx', '0px');
          this.root.style.setProperty('--sy', '0px');
          this.bands.style.opacity = '0';
          this._setPos(to);
          this._lightMark(to);
          motor?.stop();
          res();
        },
      }),
    );
  }

  /** Full ride. `onSwap` runs while the doors are shut; `onOpening` as they part. */
  async ride(from, to, label, { onSwap, onOpening } = {}) {
    const r = this.root;
    this.status.textContent = label;
    this.dest.textContent = this.names[to];
    this._setPos(from);
    r.classList.toggle('is-down', to < from);
    await this.close();
    r.classList.add('is-riding');
    const swap = Promise.resolve(onSwap?.());
    await wait(this.reduced ? 0 : 220);
    await Promise.all([this.travel(from, to), swap]);
    r.classList.add('is-arrived');
    this.sound?.ding();
    await wait(this.reduced ? 150 : 520);
    await this.open(onOpening);
  }
}
