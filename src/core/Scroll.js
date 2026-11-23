/**
 * Virtual scroll: wheel / touch / keyboard drive a 0→1 progress along the
 * current floor's camera path. It eases between "stops" (exhibits), and
 * pushing past either end of a floor charges an "overscroll" meter that
 * rides the lift to the next / previous floor.
 */
export class Scroll {
  constructor() {
    this.target = 0;
    this.current = 0;
    this.stops = [0];
    this.enabled = false;
    this.over = 0; // −1 … 1
    this.lastInput = 0;
    this.onNext = null;
    this.onPrev = null;
    this.onInput = null;
    this._touch = null;
    this._snapTimer = 0;
    this._bind();
  }

  setStops(stops) {
    this.stops = stops.length ? stops : [0];
  }

  set(p, instant = false) {
    this.target = Math.min(1, Math.max(0, p));
    if (instant) this.current = this.target;
    this.over = 0;
  }

  get stopIndex() {
    let best = 0;
    let bd = Infinity;
    this.stops.forEach((s, i) => {
      const d = Math.abs(s - this.current);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  /** Distance (in progress units) from current to the nearest stop, normalised by stop spacing. */
  get stopDistance() {
    const i = this.stopIndex;
    const spacing = this.stops.length > 1 ? 1 / (this.stops.length - 1) : 1;
    return Math.abs(this.stops[i] - this.current) / spacing;
  }

  goToStop(i) {
    const idx = Math.max(0, Math.min(this.stops.length - 1, i));
    this.target = this.stops[idx];
    this.over = 0;
  }

  step(dir) {
    const targetIdx = this._nearestTo(this.target);
    if (dir > 0 && targetIdx >= this.stops.length - 1) return this.onNext?.();
    if (dir < 0 && targetIdx <= 0) return this.onPrev?.();
    this.goToStop(targetIdx + dir);
    this.onInput?.();
  }

  _nearestTo(p) {
    let best = 0;
    let bd = Infinity;
    this.stops.forEach((s, i) => {
      const d = Math.abs(s - p);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }

  _feed(delta) {
    if (!this.enabled) return;
    this.lastInput = performance.now();
    this.onInput?.();
    const span = Math.max(1, this.stops.length - 1);
    const dp = delta / (650 * span);
    const atEnd = this.target >= 1 && this.current > 0.985;
    const atStart = this.target <= 0 && this.current < 0.015;
    if (delta > 0 && atEnd) {
      this.over = Math.min(1, Math.max(0, this.over) + delta / 620);
      if (this.over >= 1) {
        this.over = 0;
        this.onNext?.();
      }
      return;
    }
    if (delta < 0 && atStart) {
      this.over = Math.max(-1, Math.min(0, this.over) + delta / 620);
      if (this.over <= -1) {
        this.over = 0;
        this.onPrev?.();
      }
      return;
    }
    this.over = 0;
    this.target = Math.min(1, Math.max(0, this.target + dp));
  }

  _canScrollInside(el, dy) {
    const lock = el?.closest?.('[data-scroll-lock]');
    if (!lock) return false;
    let node = el;
    while (node && node !== lock.parentElement) {
      if (node.scrollHeight > node.clientHeight + 2) {
        const s = getComputedStyle(node).overflowY;
        if (s === 'auto' || s === 'scroll') return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  _bind() {
    window.addEventListener(
      'wheel',
      (e) => {
        if (!document.documentElement.classList.contains('gl')) return; // classic 2D view scrolls natively
        if (this._canScrollInside(e.target, e.deltaY)) return;
        if (document.documentElement.classList.contains('is-modal')) return;
        e.preventDefault();
        let d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (e.deltaMode === 1) d *= 16;
        if (e.deltaMode === 2) d *= window.innerHeight;
        this._feed(Math.max(-200, Math.min(200, d)));
      },
      { passive: false },
    );

    window.addEventListener(
      'touchstart',
      (e) => {
        if (!document.documentElement.classList.contains('gl') || this._canScrollInside(e.target, 0) || e.target.closest?.('input,textarea,select,button,a,label')) {
          this._touch = null;
          return;
        }
        const t = e.touches[0];
        this._touch = { x: t.clientX, y: t.clientY };
      },
      { passive: true },
    );
    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this._touch) return;
        const t = e.touches[0];
        const dx = this._touch.x - t.clientX;
        const dy = this._touch.y - t.clientY;
        this._touch = { x: t.clientX, y: t.clientY };
        this._feed((Math.abs(dy) > Math.abs(dx) ? dy : dx) * 2.4);
      },
      { passive: true },
    );
    window.addEventListener('touchend', () => (this._touch = null));

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || !document.documentElement.classList.contains('gl')) return;
      if (e.target.closest?.('input,textarea,select,[contenteditable]')) return;
      if (document.documentElement.classList.contains('is-modal')) return;
      const k = e.key;
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(k)) {
        if (k === ' ' && e.target.closest?.('button,a,summary')) return;
        e.preventDefault();
        this.step(1);
      } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(k)) {
        e.preventDefault();
        this.step(-1);
      } else if (k === 'Home') {
        this.goToStop(0);
      } else if (k === 'End') {
        this.goToStop(this.stops.length - 1);
      }
    });
  }

  update(dt) {
    const now = performance.now();
    // Magnetic stops: once input settles, glide to the nearest exhibit.
    if (this.enabled && now - this.lastInput > 420) {
      const near = this.stops[this._nearestTo(this.target)];
      this.target += (near - this.target) * (1 - Math.exp(-6 * dt));
    }
    if (now - this.lastInput > 450) this.over *= Math.exp(-3 * dt);
    this.current += (this.target - this.current) * (1 - Math.exp(-3.6 * dt));
    if (Math.abs(this.target - this.current) < 1e-5) this.current = this.target;
  }
}
