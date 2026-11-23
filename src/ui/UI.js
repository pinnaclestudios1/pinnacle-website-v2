import { Sound } from '../core/Sound.js';
import { esc } from './templates.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const LEGAL = {
  privacy: `<article class="case"><p class="kicker">Legal</p><h2 class="case__client">Privacy</h2>
    <p>We only collect what you send us through the contact form (name, email, company and project details) to reply to your enquiry. We don’t sell personal data or use advertising trackers on this site. To have your data deleted, email us.</p>
    <p class="placard__body--sm">Template copy: have this reviewed for your jurisdiction before launch.</p></article>`,
  terms: `<article class="case"><p class="kicker">Legal</p><h2 class="case__client">Terms</h2>
    <p>All work shown is the property of its respective owners and is displayed for portfolio purposes. Project engagements are governed by a separate statement of work.</p>
    <p class="placard__body--sm">Template copy: have this reviewed for your jurisdiction before launch.</p></article>`,
};

/**
 * All DOM-side behaviour: header, lift panel, placards, progress, modals,
 * cursor, mascot speech bubble, contact form and the classic 2D view.
 */
export class UI {
  constructor(content) {
    this.content = content;
    this.sound = new Sound();
    this.handlers = {};
    this.formDraft = {};
    this.el = {
      slot: $('[data-placard-slot]'),
      lift: $('[data-lift]'),
      lvl: $('[data-floor-level]'),
      name: $('[data-floor-name]'),
      progress: $('[data-progress]'),
      fill: $('[data-progress-fill]'),
      stops: $('[data-progress-stops]'),
      over: $('[data-overscroll]'),
      overText: $('[data-overscroll-text]'),
      hint: $('[data-scroll-hint]'),
      bubble: $('[data-bubble]'),
      hover: $('[data-hover-label]'),
      modal: $('[data-modal]'),
      modalBody: $('[data-modal-body]'),
      legal: $('[data-legal-modal]'),
      legalBody: $('[data-legal-body]'),
      dir: $('[data-directory]'),
      dirList: $('[data-directory-list]'),
      announcer: $('[data-announcer]'),
    };
    this._placardToken = 0;
    this._bubbleTimer = 0;
    this._bindGlobal();
    this._initCursor();
    this._initForms(document);
  }

  /* ───────────── Global delegation ───────────── */

  _bindGlobal() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link && document.documentElement.classList.contains('gl') && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        this.closeDirectory();
        this.handlers.navigate?.(link.getAttribute('href'));
        return;
      }
      const gs = e.target.closest('[data-goto-stop]');
      if (gs) return this.handlers.goToStop?.(gs.dataset.gotoStop);
      const q = e.target.closest('[data-quote]');
      if (q) return this._showQuote(q.closest('.placard'), Number(q.dataset.quote));
      const lg = e.target.closest('[data-legal]');
      if (lg) {
        e.preventDefault();
        return this.openLegal(lg.dataset.legal);
      }
      const car = e.target.closest('[data-careers]');
      if (car) {
        e.preventDefault();
        return this.openCareers();
      }
      const act = e.target.closest('[data-action]');
      if (!act) return;
      const a = act.dataset.action;
      if (a === 'next') this.handlers.next?.();
      else if (a === 'sound') this.toggleSound(act);
      else if (a === 'toggle-classic') {
        e.preventDefault();
        this.toggleClassic();
      } else if (a === 'directory') this.toggleDirectory();
      else if (a === 'close-modal') this.handlers.closeCase?.();
      else if (a === 'close-legal') this.closeLegal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!this.el.legal.hidden) this.closeLegal();
      else if (!this.el.modal.hidden) this.handlers.closeCase?.();
      else if (!this.el.dir.hidden) this.closeDirectory();
    });
  }

  toggleSound(btn = $('[data-action="sound"]')) {
    const on = this.sound.toggle();
    $$('[data-action="sound"]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
    btn?.classList.toggle('is-on', on);
  }

  toggleClassic() {
    const html = document.documentElement;
    const toClassic = html.classList.contains('gl');
    try {
      localStorage.setItem('pinnacle:view', toClassic ? 'classic' : 'gl');
    } catch (e) {}
    if (toClassic) {
      html.classList.remove('gl');
      this.handlers.pause?.();
      window.scrollTo(0, 0);
    } else if (this.handlers.resume) {
      html.classList.add('gl');
      this.handlers.resume();
    } else {
      location.reload();
    }
  }

  announce(text) {
    this.el.announcer.textContent = text;
  }

  /* ───────────── Lift & directory ───────────── */

  buildLift(floors) {
    this.el.lift.innerHTML = floors
      .map((f, i) => ({ f, i }))
      .reverse()
      .map(({ f, i }) => `<li><button data-floor="${i}" aria-label="${esc(f.level === 'G' ? 'Ground floor' : f.level === 'R' ? 'Rooftop' : 'Floor ' + f.level)}: ${esc(f.name)}"><span>${esc(f.level)}</span><em>${esc(f.nav)}</em></button></li>`)
      .join('');
    this.el.lift.addEventListener('click', (e) => {
      const b = e.target.closest('[data-floor]');
      if (b) this.handlers.navigate?.(floors[Number(b.dataset.floor)].path);
    });
  }

  buildDirectory(floors, stops) {
    this.el.dirList.innerHTML = floors
      .map(
        (f, i) => `<li class="directory__floor">
          <a href="${f.path}" data-link class="directory__main"><span class="directory__lvl">${esc(f.level)}</span><span class="directory__name">${esc(f.name)}</span></a>
          <ul>${stops[i].map((s) => `<li><button data-dir-floor="${i}" data-dir-stop="${esc(s.id)}">${esc(s.label)}</button></li>`).join('')}</ul>
        </li>`,
      )
      .reverse()
      .join('');
    if (this._dirBound) return;
    this._dirBound = true;
    this.el.dirList.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dir-stop]');
      if (!b) return;
      this.closeDirectory();
      this.handlers.goTo?.(Number(b.dataset.dirFloor), b.dataset.dirStop);
    });
  }

  toggleDirectory() {
    this.el.dir.hidden ? this.openDirectory() : this.closeDirectory();
  }

  openDirectory() {
    this.el.dir.hidden = false;
    document.documentElement.classList.add('is-modal');
    requestAnimationFrame(() => this.el.dir.classList.add('is-in'));
    $('button', this.el.dir)?.focus();
  }

  closeDirectory() {
    if (this.el.dir.hidden) return;
    this.el.dir.classList.remove('is-in');
    if (this.el.modal.hidden) document.documentElement.classList.remove('is-modal');
    setTimeout(() => (this.el.dir.hidden = true), 300);
  }

  /* ───────────── Floor state ───────────── */

  setFloor(i, floor) {
    const f = floor.def;
    this.el.lvl.textContent = f.level;
    this.el.name.textContent = f.name;
    $$('[data-floor]', this.el.lift).forEach((b) => b.classList.toggle('is-active', Number(b.dataset.floor) === i));
    this.el.stops.innerHTML = floor.stops
      .map((s, k) => `<button style="left:${(s.p * 100).toFixed(2)}%" data-stop-index="${k}" aria-label="${esc(s.label)}"><span>${esc(s.label)}</span></button>`)
      .join('');
    this.el.stops.onclick = (e) => {
      const b = e.target.closest('[data-stop-index]');
      if (b) this.handlers.goToStopIndex?.(Number(b.dataset.stopIndex));
    };
    document.documentElement.dataset.floor = f.id;
    this._prog = null;
  }

  /** Called every frame: touches the DOM only when something actually changed. */
  updateProgress(p, over, nextName, prevName, stopIndex) {
    const c = (this._prog ||= {});
    const pr = Math.round(p * 500) / 500;
    if (pr !== c.p) {
      c.p = pr;
      this.el.fill.style.transform = `scaleX(${pr})`;
    }
    if (stopIndex !== c.stop) {
      c.stop = stopIndex;
      $$('[data-stop-index]', this.el.stops).forEach((b) => b.classList.toggle('is-active', Number(b.dataset.stopIndex) === stopIndex));
    }
    const showUp = !!(p > 0.985 && nextName);
    const showDown = !!(over < -0.02 && prevName);
    const on = showUp || showDown;
    const o = this.el.over;
    if (on !== c.on || showDown !== c.down) {
      c.on = on;
      c.down = showDown;
      o.classList.toggle('is-on', on);
      o.classList.toggle('is-down', showDown && !showUp);
      if (on) this.el.overText.textContent = showDown ? `Keep scrolling to ride down to ${prevName}` : `Keep scrolling to ride up to ${nextName}`;
    }
    const ov = on ? Math.round(Math.abs(over) * 50) / 50 : 0;
    if (ov !== c.over) {
      c.over = ov;
      o.style.setProperty('--over', ov);
    }
  }

  hideHint() {
    this.el.hint.classList.add('is-gone');
  }

  /* ───────────── Placards ───────────── */

  showPlacard(stop) {
    const token = ++this._placardToken;
    const slot = this.el.slot;
    slot.classList.remove('is-in');
    const delay = slot.innerHTML ? 260 : 0;
    clearTimeout(this._placardTimer);
    this._placardTimer = setTimeout(() => {
      if (token !== this._placardToken) return;
      if (!stop) {
        slot.innerHTML = '';
        return;
      }
      slot.dataset.align = stop.align || 'left';
      slot.innerHTML = stop.html;
      this._hydrate(slot);
      this._collapseForPhone(slot, stop.align);
      this._regionDirty = true;
      requestAnimationFrame(() => token === this._placardToken && slot.classList.add('is-in'));
    }, delay);
  }

  /**
   * On phones, exhibit panels open as a short summary (label, title, main
   * button) with a "More" toggle, so the 3D scene stays visible. Once the
   * visitor expands one, the rest open expanded too.
   */
  _collapseForPhone(slot, align) {
    if (!matchMedia('(max-width: 760px)').matches) return;
    if (align === 'hero' || align === 'panel') return;
    const card = slot.querySelector('.placard');
    if (!card || !card.querySelector('.placard__title')) return;
    const btn = document.createElement('button');
    btn.className = 'placard__more';
    btn.type = 'button';
    const set = (collapsed) => {
      card.classList.toggle('is-collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.textContent = collapsed ? 'More' : 'Less';
      this._regionDirty = true;
    };
    btn.addEventListener('click', () => {
      const collapse = !card.classList.contains('is-collapsed');
      this._phoneExpanded = !collapse;
      set(collapse);
    });
    card.querySelector('.placard__title').after(btn);
    set(!this._phoneExpanded);
  }

  /** Small dismissible notice at the top of the screen. */
  toast(text, ms = 12000) {
    const t = document.querySelector('[data-toast]');
    if (!t || this._toastDismissed?.has(text)) return;
    t.querySelector('[data-toast-text]').textContent = text;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-on'));
    const close = () => {
      t.classList.remove('is-on');
      setTimeout(() => (t.hidden = true), 400);
    };
    t.querySelector('[data-toast-close]').onclick = () => {
      (this._toastDismissed ||= new Set()).add(text);
      close();
    };
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(close, ms);
  }

  /** `?debug` readout: frame rate, resolution and GPU, updated every second. */
  debug(read) {
    const el = document.querySelector('[data-debug]');
    if (!el) return;
    el.hidden = false;
    setInterval(() => (el.textContent = read()), 1000);
  }

  /**
   * Free screen band (px) above the hero text and below the header, where the
   * 3D title should sit. Measured only when the layout changes.
   */
  heroRegion() {
    if (!this._regionBound) {
      this._regionBound = true;
      this._regionDirty = true;
      window.addEventListener('resize', () => (this._regionDirty = true));
    }
    if (this._regionDirty) {
      this._regionDirty = false;
      const header = document.querySelector('.hud-header');
      this._region = this._region || {};
      this._region.top = (header ? header.offsetTop + header.offsetHeight : 70) + 4;
      const slot = this.el.slot;
      if (slot.dataset.align === 'hero' && slot.firstElementChild) this._heroTop = slot.offsetTop;
      this._region.bottom = (this._heroTop ?? window.innerHeight * 0.55) - 12;
    }
    return this._region;
  }

  _hydrate(root) {
    // Count-up stats
    $$('[data-count]', root).forEach((dd) => {
      const raw = dd.dataset.count;
      const m = raw.match(/^([^\d]*)(\d+)(.*)$/);
      if (!m) return;
      const target = Number(m[2]);
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / 1200);
        dd.textContent = `${m[1]}${Math.round(target * (1 - Math.pow(1 - k, 3)))}${m[3]}`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    // Rotating testimonials
    const quotes = $('[data-quotes]', root);
    if (quotes) {
      clearInterval(this._quoteTimer);
      let i = 0;
      const n = quotes.children.length;
      this._quoteTimer = setInterval(() => {
        if (!root.contains(quotes)) return clearInterval(this._quoteTimer);
        i = (i + 1) % n;
        this._showQuote(root, i);
      }, 5200);
    }
    this._initForms(root);
  }

  _showQuote(root, i) {
    if (!root) return;
    $$('[data-quotes] blockquote', root).forEach((b, k) => b.classList.toggle('is-active', k === i));
    $$('[data-quote]', root).forEach((b, k) => b.classList.toggle('is-active', k === i));
  }

  /* ───────────── Mascot speech + hover ───────────── */

  say(text, ms = 4200) {
    if (!text) return;
    const b = this.el.bubble;
    b.textContent = text;
    b.classList.add('is-on');
    clearTimeout(this._bubbleTimer);
    this._bubbleTimer = setTimeout(() => b.classList.remove('is-on'), ms);
  }

  placeBubble(pos, side) {
    const b = this.el.bubble;
    if (!b.classList.contains('is-on')) return;
    if (pos.behind) return b.classList.remove('is-on');
    b.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`;
    b.dataset.side = side;
  }

  setHover(entry) {
    const on = !!entry;
    document.documentElement.classList.toggle('is-hovering', on);
    // Plain system cursor: a hand over clickable things in the 3D scene.
    const canvas = document.getElementById('gl');
    if (canvas) canvas.style.cursor = !entry ? '' : entry.onClick || entry.label ? 'pointer' : entry.cursor === 'grab' ? 'grab' : '';
    this.el.hover.textContent = entry?.label || '';
    this.el.hover.classList.toggle('is-on', !!entry?.label);
  }

  /** Small label that sits beside the (normal) cursor when hovering an exhibit. */
  _initCursor() {
    if (matchMedia('(pointer: coarse)').matches) return;
    const h = this.el.hover;
    window.addEventListener('pointermove', (e) => {
      h.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`;
    });
  }

  /* ───────────── Modals ───────────── */

  openModal(html) {
    const m = this.el.modal;
    this.el.modalBody.innerHTML = html;
    m.hidden = false;
    document.documentElement.classList.add('is-modal');
    requestAnimationFrame(() => m.classList.add('is-in'));
    $('.modal__sheet', m).scrollTop = 0;
    setTimeout(() => $('.modal__close', m).focus({ preventScroll: true }), 50);
  }

  closeModal() {
    const m = this.el.modal;
    if (m.hidden) return;
    m.classList.remove('is-in');
    document.documentElement.classList.remove('is-modal');
    setTimeout(() => (m.hidden = true), 450);
  }

  get modalOpen() {
    return !this.el.modal.hidden;
  }

  openLegal(kind) {
    this.el.legalBody.innerHTML = LEGAL[kind] || '';
    this.el.legal.hidden = false;
    document.documentElement.classList.add('is-modal');
    requestAnimationFrame(() => this.el.legal.classList.add('is-in'));
  }

  closeLegal() {
    this.el.legal.classList.remove('is-in');
    if (this.el.modal.hidden) document.documentElement.classList.remove('is-modal');
    setTimeout(() => (this.el.legal.hidden = true), 400);
  }

  openCareers() {
    const { site, studio } = this.content;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(studio.careers.cta + ' — Pinnacle Studios')}`;
  }

  /* ───────────── Contact form ───────────── */

  _initForms(root) {
    $$('[data-contact-form]', root).forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = '1';
      // Restore draft (placards are re-rendered as you walk)
      for (const [k, v] of Object.entries(this.formDraft)) {
        const fields = $$(`[name="${k}"]`, form);
        fields.forEach((f) => {
          if (f.type === 'checkbox' || f.type === 'radio') f.checked = [].concat(v).includes(f.value);
          else f.value = v;
        });
      }
      form.addEventListener('input', () => {
        const fd = new FormData(form);
        this.formDraft = { ...Object.fromEntries(fd), services: fd.getAll('services') };
      });
      form.addEventListener('submit', (e) => this._submit(e, form));
    });
  }

  async _submit(e, form) {
    e.preventDefault();
    const status = $('.form__status', form);
    const fd = new FormData(form);
    const data = { ...Object.fromEntries(fd), services: fd.getAll('services') };
    $$('.is-invalid', form).forEach((n) => n.classList.remove('is-invalid'));
    const bad = [];
    if (!data.name?.trim()) bad.push('name');
    if (!/^\S+@\S+\.\S+$/.test(data.email || '')) bad.push('email');
    if (!data.message?.trim()) bad.push('message');
    if (bad.length) {
      bad.forEach((n) => $(`[name="${n}"]`, form)?.closest('label')?.classList.add('is-invalid'));
      status.textContent = 'Please fill in your name, a valid email and a short message.';
      status.dataset.state = 'error';
      $(`[name="${bad[0]}"]`, form)?.focus();
      return;
    }
    const { site } = this.content;
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    try {
      if (site.formEndpoint) {
        const res = await fetch(site.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.statusText);
        status.textContent = 'Thank you! Your brief is in. We’ll reply within one business day.';
      } else {
        const body = `Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company || '-'}\nServices: ${data.services.join(', ') || '-'}\nBudget: ${data.budget || '-'}\n\n${data.message}`;
        window.location.href = `mailto:${site.email}?subject=${encodeURIComponent('New project brief from ' + data.name)}&body=${encodeURIComponent(body)}`;
        status.textContent = 'Opening your email app with the brief ready to send…';
      }
      status.dataset.state = 'ok';
      this.formDraft = {};
      this.handlers.formSent?.();
    } catch (err) {
      status.textContent = `Something went wrong. Please email us at ${site.email}.`;
      status.dataset.state = 'error';
    } finally {
      btn.disabled = false;
    }
  }
}
