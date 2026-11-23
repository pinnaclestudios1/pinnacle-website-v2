import * as THREE from 'three';
import { C, damp } from './kit.js';

/**
 * "Pinn", the Pinnacle mascot: a glossy ember ball with a snow-capped peak
 * for a hat. It lives as the dot of the "i" in the lobby, then follows
 * visitors around the gallery as a guide.
 */
export class Mascot {
  constructor(app) {
    this.app = app;
    this.root = new THREE.Group();
    this.root.name = 'mascot';
    this.rig = new THREE.Group(); // squash & stretch, pivot at the feet
    this.body = new THREE.Group(); // facing
    this.body.position.y = 1;
    this.root.add(this.rig);
    this.rig.add(this.body);

    const skin = new THREE.MeshPhysicalMaterial({
      color: C.ember,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: '#ff2a00',
      emissiveIntensity: 0.22,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffb08a'),
    });
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: '#141018', roughness: 0.15 });
    const snow = new THREE.MeshStandardMaterial({ color: '#fff6ee', roughness: 0.5 });
    const deep = new THREE.MeshStandardMaterial({ color: '#c73a14', roughness: 0.5 });

    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), skin);
    ball.castShadow = true;
    this.body.add(ball);

    // The pinnacle: two little peaks, the big one snow-capped.
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.8, 32), skin);
    peak.position.set(-0.1, 1.08, 0);
    peak.rotation.z = 0.12;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.155, 0.3, 32), snow);
    cap.position.set(0, 0.26, 0);
    peak.add(cap);
    const peak2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 32), skin);
    peak2.position.set(0.3, 0.95, 0.02);
    peak2.rotation.z = -0.38;
    this.peak = peak;
    this.body.add(peak, peak2);

    // Eyes
    this.eyes = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(s * 0.36, 0.2, 0.85);
      eye.lookAt(eye.position.clone().multiplyScalar(2));
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), white);
      ew.scale.set(1, 1.18, 0.5);
      const pupilG = new THREE.Group();
      pupilG.position.z = 0.09;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), black);
      pupil.scale.set(1, 1.1, 0.5);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      shine.position.set(0.05, 0.06, 0.06);
      pupilG.add(pupil, shine);
      eye.add(ew, pupilG);
      this.body.add(eye);
      this.eyes.push({ eye, pupilG });
    }

    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 8, 24, Math.PI), black);
    mouth.position.set(0, -0.1, 0.975);
    mouth.rotation.z = Math.PI;
    this.mouth = mouth;
    this.body.add(mouth);

    for (const s of [-1, 1]) {
      const cheek = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 24),
        new THREE.MeshBasicMaterial({ color: '#ff9b86', transparent: true, opacity: 0.75, depthWrite: false }),
      );
      cheek.position.set(s * 0.62, -0.08, 0.78);
      cheek.lookAt(cheek.position.clone().multiplyScalar(2));
      cheek.position.multiplyScalar(1.005);
      this.body.add(cheek);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), deep);
      foot.scale.set(1, 0.55, 1.3);
      foot.position.set(s * 0.38, -0.92, 0.2);
      this.body.add(foot);
    }


    // Behaviour state
    this.mode = 'perch';
    this.perches = [];
    this.perch = 0;
    this.size = 1;
    this.guideSide = 1;
    this.squash = 0;
    this.squashV = 0;
    this.hop = null;
    this.hopY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.spin = 0;
    this.timers = { blink: 2.5, idle: 2.2, travel: 7 };
    this.blink = 0;
    this.visible = true;
    this.excite = 0;
    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this._base = new THREE.Vector3();
    this.root.scale.setScalar(1);
  }

  setPerches(points, size) {
    this.perches = points;
    this.perchSize = size;
  }

  setMode(mode, instant = false) {
    this.mode = mode;
    this.hop = null;
    if (instant) {
      this._computeBase(this._base);
      this.root.position.copy(this._base);
      this.size = this._targetSize();
      this.root.scale.setScalar(this.size);
    }
  }

  _targetSize() {
    return this.mode === 'perch' ? this.perchSize : this.app.engine.aspect < 1 ? 0.17 : 0.2;
  }

  _computeBase(out) {
    if (this.mode === 'perch') return out.copy(this.perches[this.perch] || out);
    const cam = this.app.engine.camera;
    const d = 4.2;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * d;
    const halfW = halfH * cam.aspect;
    const portrait = cam.aspect < 1;
    out.set(portrait ? halfW * 0.62 : this.guideSide * halfW * 0.74, portrait ? halfH * 0.42 : -halfH * 0.5, -d);
    return cam.localToWorld(out);
  }

  /** Squash/stretch impulse: positive stretches, negative squashes. */
  kick(v) {
    this.squashV += v;
  }

  jump({ to, height = 1, dur = 0.7, spins = 0, drop = false }) {
    const from = this.root.position.clone();
    this.hop = { from, to: to ? to.clone() : null, height, dur, t: 0, spins, drop };
    if (!drop) this.kick(5);
    this.app.sound?.pop();
  }

  dropIn() {
    const home = this.perches[this.perch];
    this.root.position.copy(home).add(this._v.set(0, 9, 0));
    this.jump({ to: home, height: 0, dur: 0.75, drop: true });
  }

  celebrate() {
    this.excite = 1.2;
    if (this.mode === 'perch') this.jump({ to: this.perches[this.perch], height: this.size * 3.2, dur: 0.85, spins: 1 });
    else this.jump({ height: 0.5, dur: 0.6, spins: 1 });
  }

  update(dt, t) {
    const reduced = this.app.engine.reducedMotion;
    // Size easing between perch and guide modes
    this.size = damp(this.size, this._targetSize(), 5, dt);
    this.root.scale.setScalar(this.size);

    this._computeBase(this._base);

    if (this.hop) {
      const h = this.hop;
      h.t += dt / h.dur;
      const k = Math.min(1, h.t);
      if (h.drop) {
        const e = k * k; // gravity
        this.root.position.lerpVectors(h.from, h.to, e);
      } else if (h.to) {
        this.root.position.lerpVectors(h.from, h.to, k);
        this.root.position.y += 4 * k * (1 - k) * h.height;
      } else {
        // In-place hop (guide mode): follow base, add arc
        this.root.position.copy(this._base);
        this.hopY = 4 * k * (1 - k) * h.height * this.size;
        this.root.position.y += this.hopY;
      }
      this.spin = h.spins ? k * h.spins * Math.PI * 2 : this.spin;
      if (k >= 1) {
        this.hop = null;
        this.spin = 0;
        this.hopY = 0;
        this.kick(-7);
      }
    } else if (this.mode === 'perch') {
      this.root.position.copy(this._base);
      this.timers.idle -= dt;
      this.timers.travel -= dt;
      if (!reduced && this.timers.travel <= 0 && this.perches.length > 1) {
        this.timers.travel = 9 + Math.random() * 6;
        this.timers.idle = 3;
        this.perch = (this.perch + 1) % this.perches.length;
        this.jump({ to: this.perches[this.perch], height: this.size * 4.5, dur: 1.15, spins: 1 });
      } else if (!reduced && this.timers.idle <= 0) {
        this.timers.idle = 1.6 + Math.random() * 2.2;
        this.jump({ to: this._base, height: this.size * (0.6 + Math.random() * 0.6), dur: 0.5 });
      }
    } else {
      // Guide: float beside the visitor with a lazy follow.
      const lam = 3.2;
      const p = this.root.position;
      p.set(damp(p.x, this._base.x, lam, dt), damp(p.y, this._base.y, lam, dt), damp(p.z, this._base.z, lam, dt));
      p.y += Math.sin(t * 2.2) * 0.012;
      this.timers.idle -= dt;
      if (!reduced && this.timers.idle <= 0) {
        this.timers.idle = 3 + Math.random() * 3;
        this.jump({ height: 0.35, dur: 0.55 });
      }
    }

    // Spring squash
    const k = 160;
    const c = 11;
    this.squashV += (-k * this.squash - c * this.squashV) * dt;
    this.squash += this.squashV * dt;
    const s = THREE.MathUtils.clamp(this.squash * 0.12, -0.35, 0.35);
    this.rig.scale.set(1 - s * 0.55, 1 + s, 1 - s * 0.55);

    // Facing: guide faces the camera; perch faces forward. Both look toward the cursor.
    const cam = this.app.engine.camera;
    if (this.mode === 'guide') this.root.quaternion.slerp(cam.quaternion, 1 - Math.exp(-6 * dt));
    else this.root.quaternion.identity();

    const gaze = this.app.pointerWorld(this._w, this.mode === 'guide' ? 3 : 12);
    this.root.worldToLocal(this._v.copy(gaze));
    this._v.y -= 1;
    let yaw = Math.atan2(this._v.x, this._v.z);
    let pitch = -Math.atan2(this._v.y, Math.hypot(this._v.x, this._v.z));
    yaw = THREE.MathUtils.clamp(yaw, -0.8, 0.8);
    pitch = THREE.MathUtils.clamp(pitch, -0.45, 0.45);
    this.yaw = damp(this.yaw, yaw, 6, dt);
    this.pitch = damp(this.pitch, pitch, 6, dt);
    this.body.rotation.set(this.pitch * 0.7, this.yaw * 0.7 + this.spin, Math.sin(t * 1.7) * 0.05);

    for (const { pupilG } of this.eyes) {
      pupilG.position.x = damp(pupilG.position.x, this.yaw * 0.06, 10, dt);
      pupilG.position.y = damp(pupilG.position.y, -this.pitch * 0.07, 10, dt);
    }

    // Blink
    this.timers.blink -= dt;
    if (this.timers.blink <= 0) {
      this.blink = 1;
      this.timers.blink = 2.2 + Math.random() * 3.5;
      if (Math.random() < 0.2) this.timers.blink = 0.22; // double blink
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    const closed = this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0;
    const happy = Math.min(1, this.excite);
    for (const { eye } of this.eyes) eye.scale.y = Math.max(0.08, 1 - closed * 0.92 - happy * 0.5);
    this.excite = Math.max(0, this.excite - dt);
    this.mouth.scale.set(1 + happy * 0.6, 1 + happy, 1);

    this.peak.rotation.z = 0.12 + Math.sin(t * 3) * 0.04 + s * 0.4;
  }

  screenPosition(out = new THREE.Vector3()) {
    out.copy(this.root.position);
    out.y += this.size * 2.3;
    out.project(this.app.engine.camera);
    return { x: (out.x * 0.5 + 0.5) * this.app.engine.width, y: (-out.y * 0.5 + 0.5) * this.app.engine.height, behind: out.z > 1 };
  }
}
