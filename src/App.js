import * as THREE from 'three';
import gsap from 'gsap';
import { Engine } from './core/Engine.js';
import { CameraRig } from './core/CameraRig.js';
import { Scroll } from './core/Scroll.js';
import { Elevator } from './core/Elevator.js';
import { Mascot } from './world/Mascot.js';
import { Lobby } from './world/floors/Lobby.js';
import { ServicesWing } from './world/floors/ServicesWing.js';
import { WorkHall } from './world/floors/WorkHall.js';
import { StudioRotunda } from './world/floors/StudioRotunda.js';
import { Rooftop } from './world/floors/Rooftop.js';
import { tplCaseDetail } from './ui/templates.js';
import { grainDone } from './world/textures.js';

const FLOOR_CLASSES = [Lobby, ServicesWing, WorkHall, StudioRotunda, Rooftop];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The gallery: owns the 3D world and routes between floors. */
export class App {
  constructor(content, ui) {
    this.content = content;
    this.ui = ui;
    this.sound = ui.sound;
    this.current = -1;
    this.activeStop = -2;
    this.hovered = null;
    this.hoverEntry = null;
    this.busy = false;
    this.caseOpen = null;
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this.ndc = new THREE.Vector2(0, 0);
    this.focus = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._frame = 0;
    this.raycaster = new THREE.Raycaster();
    this._moved = true;
  }

  /* ───────────── Boot ───────────── */

  async init() {
    const c = this.content;
    if (import.meta.env.DEV) window.__app = this;
    this.engine = new Engine(document.getElementById('gl'));
    this.rig = new CameraRig(this.engine);
    this.scroll = new Scroll();
    this.elevator = new Elevator(
      document.querySelector('[data-elevator]'),
      c.floors.map((f) => f.level),
      c.floors.map((f) => f.name),
      this.sound,
    );
    this.elevator.setLoad(0.04);

    // Canvas textures need the web fonts first.
    const faces = ['800 40px Fraunces', '600 40px Fraunces', '700 40px Fraunces', 'italic 700 40px Fraunces', '400 40px "Manrope Variable"', '700 40px "Manrope Variable"', '500 40px "JetBrains Mono"'];
    await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), wait(3000)]);
    this.elevator.setLoad(0.12);

    this.mascot = new Mascot(this);
    this.mascot.root.visible = false;
    this.engine.scene.add(this.mascot.root);

    this.floors = FLOOR_CLASSES.map((F, i) => new F(this, c.floors[i], i));
    this.interactiveMeshes = this.floors.map(() => []);
    const route = this.parse(location.pathname);

    // Build only the floor the visitor lands on. The others are prepared in
    // the background once they're inside (see _prepareRest).
    this._loadProgress = (p) => this.elevator.setLoad(0.12 + p * 0.88);
    await this.ensureFloor(route.floor);
    this._loadProgress = null;

    this.ui.buildLift(c.floors);
    this._refreshDirectory();
    this._bindUI();
    this._environmentChecks();
    this._bindPointer();

    this.activate(route.floor, { stopId: route.stop });
    if (route.floor === 0) this.floors[0].title.setIntroHidden();
    this.engine.add((dt, t) => this.update(dt, t));
    this.engine.start();
    this.elevator.setLoad(1);
    await wait(250);
    const f = c.floors[route.floor];
    await this.elevator.ready(route.floor, route.floor === 0 ? 'Welcome to the gallery' : `Floor ${f.level} · ${f.name}`);

    await this._waitForEnter();
    document.documentElement.classList.add('is-entered');
    this.entered = route.floor !== 0;
    this.mascot.root.visible = this.entered;
    this.rig.push = -3;
    await this.elevator.open(() => gsap.to(this.rig, { push: 0, duration: 2.6, ease: 'power3.out' }));
    if (route.floor === 0) await this.lobbyIntro();
    this.scroll.enabled = true;
    this.activeStop = -2;
    if (route.caseSlug) this.openCase(route.caseSlug, { push: false });
    this._prepareRest(route.floor);
  }

  /* ───────────── On-demand floors ───────────── */

  /**
   * Yield to the browser between slices of build work. While floors are being
   * prepared in the background, also wait for a calm moment (camera at rest,
   * no scrolling, mouse still) or for the lift doors to be closed, so any
   * short pause lands when nothing on screen is moving.
   */
  async _yield() {
    if (this._backgroundPrep) {
      const t0 = performance.now();
      while (!this._isCalm() && performance.now() - t0 < 8000) await wait(150);
    }
    this.engine?.settle(700); // don't let build work look like a slow GPU
    if (import.meta.env.DEV && this._chunkT) (window.__chunks ||= []).push(Math.round(performance.now() - this._chunkT));
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 100 }) : setTimeout(r, 16)));
    if (import.meta.env.DEV) this._chunkT = performance.now();
  }

  _isCalm() {
    if (this.busy) return true; // doors are shut during a ride: nobody can see a pause
    const now = performance.now();
    const s = this.scroll;
    return (
      !this.ui.modalOpen &&
      now - s.lastInput > 1200 &&
      Math.abs(s.target - s.current) < 0.002 &&
      now - (this._lastPointer || 0) > 500 &&
      this.mascot?.hop == null
    );
  }

  /** Build (once) and warm up a floor: geometry, textures on the GPU, shaders. */
  ensureFloor(i) {
    const f = this.floors[i];
    f._ready ||= (async () => {
      this._loadProgress?.(0.1);
      this._chunkT = performance.now();
      await f.build();
      await grainDone(); // textures finish their grain pass off-thread
      this.engine.scene.add(f.group);
      const list = [];
      f.interactives.forEach((e) => e.object.traverse((o) => o.isMesh && list.push(o)));
      this.interactiveMeshes[i] = list;
      this._loadProgress?.(0.6);
      await this._warmFloor(f);
      this._loadProgress?.(1);
      f.built = true;
      this._refreshDirectory();
    })();
    return f._ready;
  }

  async _warmFloor(f) {
    const r = this.engine.renderer;
    // Upload textures to the GPU a few at a time…
    const maps = new Set();
    f.group.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) for (const k of ['map', 'emissiveMap', 'roughnessMap', 'normalMap']) if (m[k]?.isTexture) maps.add(m[k]);
    });
    for (const t of maps) {
      r.initTexture(t);
      await this._yield();
    }
    // …then compile its shaders for this floor's exact lights, in one
    // synchronous block so no frame is ever drawn with the wrong floor showing.
    const vis = this.floors.map((x) => x.group.visible);
    this.floors.forEach((x) => (x.group.visible = x === f));
    try {
      r.compile(this.engine.scene, this.engine.camera);
    } catch (e) {}
    this.floors.forEach((x, k) => (x.group.visible = vis[k]));
    await this._yield();
  }

  /** After entering: prepare the remaining floors, nearest first, in idle time. */
  async _prepareRest(from) {
    const order = this.floors.map((_, i) => i).filter((i) => i !== from).sort((a, b) => Math.abs(a - from) - Math.abs(b - from));
    this._backgroundPrep = true;
    for (const i of order) {
      await wait(500);
      await this.ensureFloor(i);
    }
    this._backgroundPrep = false;
  }

  _refreshDirectory() {
    this.ui.buildDirectory(
      this.content.floors,
      this.floors.map((f) => (f.built ? f.stops : [])),
    );
  }

  /** Tell visitors when their browser, not their device, is what's holding the 3D back. */
  _environmentChecks() {
    const e = this.engine;
    if (/swiftshader|basic render|llvmpipe|software/i.test(e.gpu)) {
      setTimeout(
        () =>
          this.ui.toast('Your browser is drawing 3D without graphics acceleration, so it will be slow. In Chrome, turn on Settings › System › “Use graphics acceleration when available”, or switch to the 2D view.', 20000),
        2500,
      );
    }
    e.onCapped = (fps) => {
      if (fps <= 35)
        this.ui.toast(`Your browser is limiting animations to about ${fps} fps, usually Chrome’s Energy Saver or a battery-saver mode. For smooth motion, plug in or turn off Energy Saver (Settings › Performance).`, 16000);
    };
    if (new URLSearchParams(location.search).has('debug')) {
      this.ui.debug(
        () =>
          `fps      ${e.fps ? e.fps.toFixed(0) : '…'}${e.capped ? `  (capped ~${e.capped})` : ''}\n` +
          `render   ${Math.round(e.width * e.pixelRatio)}×${Math.round(e.height * e.pixelRatio)}  (scale ${e.scale.toFixed(2)}, dpr ${window.devicePixelRatio})\n` +
          `tier     ${e.tier}  bloom ${e.bloom.enabled ? 'on' : 'off'}\n` +
          `gpu      ${e.gpu.replace(/^ANGLE \(|\)$/g, '').slice(0, 70)}`,
      );
    }
  }

  _waitForEnter() {
    return new Promise((res) => {
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('enter')) return res();
      const btn = document.querySelector('[data-action="enter"]');
      const go = () => {
        btn.removeEventListener('click', go);
        res();
      };
      btn.addEventListener('click', go);
    });
  }

  async lobbyIntro() {
    const lobby = this.floors[0];
    this.mascot.root.visible = false;
    lobby.title.intro(0.1);
    await wait(1500);
    this.entered = true;
    this.mascot.root.visible = true;
    if (this.current !== 0) return; // visitor already took the lift
    this.mascot.setMode('perch', true);
    this.mascot.dropIn();
    await wait(800);
    if (this.current === 0) this.ui.say(this.content.floors[0].mascot, 5200);
  }

  /* ───────────── Routing ───────────── */

  parse(pathname) {
    const p = pathname.replace(/\/+$/, '') || '/';
    const m = p.match(/^\/work\/([\w-]+)/);
    if (m && this.content.caseStudies.some((c) => c.slug === m[1])) return { floor: 2, stop: m[1], caseSlug: m[1] };
    const idx = this.content.floors.findIndex((f) => f.path === p);
    return { floor: idx < 0 ? 0 : idx };
  }

  navigate(path, { push = true } = {}) {
    let url;
    try {
      url = new URL(path, location.href);
    } catch (e) {
      return;
    }
    if (url.origin !== location.origin) return (location.href = path);
    const route = this.parse(url.pathname);
    if (push && url.pathname !== location.pathname) history.pushState({}, '', url.pathname);
    if (route.caseSlug) {
      if (this.current !== 2) this.goToFloor(2, { stopId: route.caseSlug, push: false }).then(() => this.openCase(route.caseSlug, { push: false }));
      else {
        this.goToStop(route.caseSlug);
        this.openCase(route.caseSlug, { push: false });
      }
      return;
    }
    if (this.caseOpen) this.closeCase({ push: false });
    if (route.floor === this.current) {
      if (route.floor === 4 && this.current === 4) this.goToStop('hello');
      return;
    }
    this.goToFloor(route.floor, { push: false });
  }

  _setMeta(i, caseStudy) {
    const f = this.content.floors[i];
    document.title = caseStudy ? `${caseStudy.client}: ${caseStudy.title} | Case Study | ${this.content.site.name}` : f.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', caseStudy ? caseStudy.summary : f.description);
  }

  /* ───────────── Floors ───────────── */

  activate(i, { stopId, fromEnd } = {}) {
    const prev = this.floors[this.current];
    if (prev) {
      prev.group.visible = false;
      prev.leave();
    }
    this.current = i;
    const f = this.floors[i];
    f.group.visible = true;
    this.engine.setMood(f.mood);
    this.rig.bounds = f.bounds;
    this.scroll.setStops(f.stops.map((s) => s.p));
    let p = 0;
    if (stopId) {
      const k = f.stopIndexById(stopId);
      if (k >= 0) p = f.stops[k].p;
    } else if (fromEnd) p = 1;
    this.scroll.set(p, true);
    const shift = f.pose(p, this._pos, this._look);
    this.rig.setTarget(this._pos, this._look, shift);
    this.rig.focus.amount = 0;
    this.rig.snap();
    this.engine.camera.updateMatrixWorld();
    f.enter();
    if (f.guide) this.mascot.setMode('guide', true);
    this.mascot.root.visible = !!this.entered;
    this.activeStop = -2;
    this.ui.setFloor(i, f);
    this._setMeta(i);
    this.ui.announce(`${f.def.level === 'G' ? 'Ground floor' : f.def.level === 'R' ? 'Rooftop' : 'Floor ' + f.def.level}: ${f.def.name}`);
  }

  async goToFloor(i, opts = {}) {
    if (i < 0 || i >= this.floors.length) return;
    if (this.busy) return;
    if (i === this.current) {
      if (opts.stopId) this.goToStop(opts.stopId);
      return;
    }
    this.busy = true;
    this.scroll.enabled = false;
    this.ui.showPlacard(null);
    this.ui.setHover(null);
    if (this.caseOpen) this.closeCase({ push: false });
    const from = this.current;
    const f = this.content.floors[i];
    if (opts.push !== false) {
      const path = f.path;
      if (location.pathname !== path) history.pushState({}, '', path);
    }
    const dir = Math.sign(i - from);
    await this.elevator.ride(from, i, `${f.level === 'G' ? 'Ground floor' : f.level === 'R' ? 'Rooftop' : 'Floor ' + f.level} · ${f.name}`, {
      onSwap: async () => {
        await wait(120);
        await this.ensureFloor(i); // usually ready already; otherwise finishes behind the doors
        this.activate(i, opts);
        this.rig.push = -2.8;
        // The cab arrives with a little overshoot and settles back.
        this.rig.lift = dir * 0.45;
        await nextFrame();
      },
      onOpening: () => {
        gsap.to(this.rig, { push: 0, duration: 2.3, ease: 'power3.out' });
        gsap.to(this.rig, { lift: 0, duration: 1.4, ease: 'back.out(2.2)' });
        if (this.floors[i].guide) setTimeout(() => this.mascot.jump({ height: 0.6, dur: 0.6, spins: 1 }), 500);
      },
    });
    this.scroll.lastInput = performance.now();
    this.scroll.enabled = true;
    this.busy = false;
  }

  goToStop(id) {
    const f = this.floors[this.current];
    const k = f.stopIndexById(id);
    if (k >= 0) this.scroll.goToStop(k);
  }

  /* ───────────── Case study viewer ───────────── */

  openCase(slug, { push = true } = {}) {
    const cases = this.content.caseStudies;
    const i = cases.findIndex((c) => c.slug === slug);
    if (i < 0) return;
    if (this.current !== 2) return this.navigate(`/work/${slug}`);
    const cs = cases[i];
    this.caseOpen = slug;
    this.goToStop(slug);
    const work = this.floors[2];
    if (work.focusPose(slug, this.rig.focus.pos, this.rig.focus.look)) {
      gsap.to(this.rig.focus, { amount: 1, duration: 1.4, ease: 'power3.inOut' });
    }
    this.scroll.enabled = false;
    this.ui.openModal(tplCaseDetail(cs, { next: cases[(i + 1) % cases.length] }));
    if (push && location.pathname !== `/work/${slug}`) history.pushState({}, '', `/work/${slug}`);
    this._setMeta(2, cs);
    this.sound.tick();
  }

  closeCase({ push = true } = {}) {
    if (!this.caseOpen) return;
    this.caseOpen = null;
    this.ui.closeModal();
    gsap.to(this.rig.focus, { amount: 0, duration: 1.1, ease: 'power3.inOut' });
    if (!this.busy) this.scroll.enabled = true;
    if (push && location.pathname !== '/work') history.pushState({}, '', '/work');
    this._setMeta(this.current);
  }

  /* ───────────── Input ───────────── */

  _bindUI() {
    const ui = this.ui;
    ui.handlers = {
      navigate: (p) => this.navigate(p),
      next: () => this.scroll.step(1),
      goToStop: (id) => this.goToStop(id),
      goToStopIndex: (k) => this.scroll.goToStop(k),
      goTo: (floor, stopId) => (floor === this.current ? this.goToStop(stopId) : this.goToFloor(floor, { stopId })),
      closeCase: () => this.closeCase(),
      pause: () => this.engine.stop(),
      resume: () => this.engine.start(),
      formSent: () => this.mascot.celebrate(),
    };
    this.scroll.onNext = () => this.current < this.floors.length - 1 && this.goToFloor(this.current + 1);
    this.scroll.onPrev = () => this.current > 0 && this.goToFloor(this.current - 1, { fromEnd: true });
    this.scroll.onInput = () => ui.hideHint();
    window.addEventListener('popstate', () => this.navigate(location.pathname, { push: false }));
  }

  _bindPointer() {
    let down = null;
    window.addEventListener('pointermove', (e) => {
      this._lastPointer = performance.now();
      this.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.rig.pointer.copy(this.ndc);
      this._moved = true;
      this._overUI = e.target !== this.engine.canvas;
    });
    this.engine.canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    this.engine.canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      down = null;
      this.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      const hit = this._pick();
      if (hit?.mascot) {
        this.mascot.celebrate();
        const lines = ['Hehe, that tickles!', 'I’m Pinn, the studio’s mascot.', 'Psst… the lift buttons are on the right.', 'Want to build something? Rooftop!', 'Wheee!'];
        this.ui.say(lines[Math.floor(Math.random() * lines.length)], 2800);
      } else if (hit?.entry?.onClick && !this.busy) {
        this.sound.tick();
        hit.entry.onClick();
      }
    });
  }

  _pick() {
    if (this.current < 0) return null;
    this.raycaster.setFromCamera(this.ndc, this.engine.camera);
    if (this.mascot.root.visible) {
      const mh = this.raycaster.intersectObject(this.mascot.root, true);
      if (mh.length) return { mascot: true, cursor: 'grab', label: 'Say hi to Pinn' };
    }
    const hits = this.raycaster.intersectObjects(this.interactiveMeshes[this.current], false);
    if (!hits.length) return null;
    return { entry: hits[0].object.userData.interactive, object: hits[0].object };
  }

  pointerWorld(out, dist) {
    this.raycaster.setFromCamera(this.ndc, this.engine.camera);
    return out.copy(this.raycaster.ray.origin).addScaledVector(this.raycaster.ray.direction, dist);
  }

  /**
   * Hero framing: measure where the 3D title lands on screen and where the
   * hero text begins, then shift (and if needed shrink) the projection so the
   * title sits in the free space above the text. Works for any window size.
   * Uses a view offset, so the camera itself doesn't move.
   */
  _frameHero(dt) {
    const cam = this.engine.camera;
    const lobby = this.floors[0];
    let target = 0;
    if (this.current === 0 && lobby.heroBox && lobby.stops.length > 1) {
      const spacing = 1 / (lobby.stops.length - 1);
      target = THREE.MathUtils.clamp(1 - Math.abs(this.scroll.current - lobby.stops[0].p) / (spacing * 0.75), 0, 1);
    }
    this._heroW = (this._heroW ?? 0) + (target - (this._heroW ?? 0)) * (1 - Math.exp(-6 * dt));
    if (cam.view?.enabled) cam.clearViewOffset();
    if (this._heroW < 0.002) return;

    const W = this.engine.width;
    const H = this.engine.height;
    cam.updateMatrixWorld();
    const b = lobby.heroBox;
    const v = (this._hv ||= new THREE.Vector3());
    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(cam);
      const x = ((v.x + 1) / 2) * W;
      const y = ((1 - v.y) / 2) * H;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    const region = this.ui.heroRegion();
    const rH = Math.max(60, region.bottom - region.top);
    const rC = (region.top + region.bottom) / 2;
    // Fit both height (above the text) and width (inside the screen edges).
    let s = Math.min(1, (rH * 0.94) / (bottom - top), (W * 0.92) / (right - left));
    let y0 = rC - ((top + bottom) / 2 - H / 2) * s;
    let x0 = W / 2 - ((left + right) / 2 - W / 2) * s;
    const w = this._heroW;
    s = 1 + (s - 1) * w;
    y0 = H / 2 + (y0 - H / 2) * w;
    x0 = W / 2 + (x0 - W / 2) * w;
    cam.setViewOffset(W * s, H * s, (W * s) / 2 - x0, (H * s) / 2 - y0, W, H);
  }

  /* ───────────── Frame loop ───────────── */

  update(dt, t) {
    const f = this.floors[this.current];
    if (!f) return;
    this.scroll.update(dt);
    const shift = f.pose(this.scroll.current, this._pos, this._look);
    this.rig.setTarget(this._pos, this._look, shift);
    this.rig.update(dt);
    const cam = this.engine.camera;
    this._frameHero(dt);
    this.focus.copy(cam.position).addScaledVector(cam.getWorldDirection(this._fwd), 8);
    f.update(dt, t);
    this.mascot.update(dt, t);

    // Hover: raycast only after the pointer moved, at most every third frame.
    this._frame++;
    if (this._moved && this._frame % 3 === 0 && !this.ui.modalOpen && !this._overUI) {
      this._moved = false;
      const hit = this._pick();
      this.hovered = hit?.object || null;
      const entry = hit?.mascot ? { cursor: 'grab', label: 'Say hi to Pinn' } : hit?.entry || null;
      if (entry !== this.hoverEntry) {
        this.hoverEntry = entry;
        this.ui.setHover(entry);
      }
    } else if (this._overUI && this.hoverEntry) {
      this.hoverEntry = null;
      this.hovered = null;
      this.ui.setHover(null);
    }

    // Placards follow the nearest exhibit.
    if (!this.busy) {
      const idx = this.scroll.stopIndex;
      const want = this.scroll.stopDistance < 0.3 ? idx : -1;
      if (want !== this.activeStop) {
        this.activeStop = want;
        const stop = f.stops[want];
        this.ui.showPlacard(stop || null);
        if (stop) {
          this.mascot.guideSide = stop.align === 'right' || stop.align === 'panel' ? -1 : 1;
          if (stop.mascot && this.mascot.root.visible) this.ui.say(stop.mascot);
        }
      }
    }
    const next = this.content.floors[this.current + 1];
    const prev = this.content.floors[this.current - 1];
    this.ui.updateProgress(this.scroll.current, this.scroll.over, next?.name, prev?.name, this.activeStop);
    this.ui.placeBubble(this.mascot.screenPosition(), this.mascot.mode === 'guide' ? this.mascot.guideSide : 0);
  }
}
