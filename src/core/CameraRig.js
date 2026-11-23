import * as THREE from 'three';

const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/**
 * Smoothly follows a target pose (position + look-at) produced by the current
 * floor's camera path, and layers on cursor parallax, portrait framing and a
 * temporary "focus" pose (used when zooming into a case study frame).
 */
export class CameraRig {
  constructor(engine) {
    this.engine = engine;
    this.camera = engine.camera;
    this.pos = new THREE.Vector3(0, 3, 15);
    this.look = new THREE.Vector3(0, 3, 0);
    this.shift = 0;
    this.curPos = this.pos.clone();
    this.curLook = this.look.clone();
    this.pointer = new THREE.Vector2();
    this.pointerSmooth = new THREE.Vector2();
    this.focus = { amount: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.push = 0; // dolly offset used by elevator transitions
    this.lift = 0; // vertical settle offset when the cab arrives
    this.bounds = null;
    this._v = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._l = new THREE.Vector3();
  }

  setTarget(pos, look, shift = 0) {
    this.pos.copy(pos);
    this.look.copy(look);
    this.shift = shift;
  }

  snap() {
    this._compose(this._p, this._l);
    this.curPos.copy(this._p);
    this.curLook.copy(this._l);
    this._apply(1 / 60);
  }

  _compose(outPos, outLook) {
    const aspect = this.engine.aspect;
    outPos.copy(this.pos);
    outLook.copy(this.look);
    const dir = this._dir.subVectors(outLook, outPos);
    const dist = dir.length();
    dir.normalize();
    const right = this._right.crossVectors(dir, THREE.Object3D.DEFAULT_UP).normalize();

    if (aspect < 1) {
      // Portrait: pull back so the exhibit fits, and nudge it up above the bottom sheet.
      const pull = (1 - aspect) * 1.05;
      outPos.addScaledVector(dir, -dist * pull);
      outLook.y -= Math.min(4.5, dist * (0.12 + (1 - aspect) * 0.2));
    } else {
      // Landscape: slide the exhibit sideways so the placard has room.
      const halfW = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist * aspect;
      outLook.addScaledVector(right, -this.shift * halfW);
    }
    if (this.push) outPos.addScaledVector(dir, this.push);
    if (this.lift) {
      // cab settling on arrival
      outPos.y += this.lift;
      outLook.y += this.lift * 0.6;
    }

    if (this.bounds) {
      const b = this.bounds;
      outPos.x = THREE.MathUtils.clamp(outPos.x, b.min.x, b.max.x);
      outPos.y = THREE.MathUtils.clamp(outPos.y, b.min.y, b.max.y);
      outPos.z = THREE.MathUtils.clamp(outPos.z, b.min.z, b.max.z);
    }

    if (this.focus.amount > 0) {
      outPos.lerp(this.focus.pos, this.focus.amount);
      outLook.lerp(this.focus.look, this.focus.amount);
    }
  }

  update(dt) {
    this._apply(dt);
  }

  _apply(dt) {
    this._compose(this._p, this._l);
    const k = 5.5;
    this.curPos.set(damp(this.curPos.x, this._p.x, k, dt), damp(this.curPos.y, this._p.y, k, dt), damp(this.curPos.z, this._p.z, k, dt));
    this.curLook.set(damp(this.curLook.x, this._l.x, k, dt), damp(this.curLook.y, this._l.y, k, dt), damp(this.curLook.z, this._l.z, k, dt));

    // Cursor parallax: a gentle head-turn toward the pointer.
    this.pointerSmooth.x = damp(this.pointerSmooth.x, this.pointer.x, 3, dt);
    this.pointerSmooth.y = damp(this.pointerSmooth.y, this.pointer.y, 3, dt);
    const par = this.engine.isTouch ? 0 : 1 - this.focus.amount * 0.8;

    const cam = this.camera;
    cam.position.copy(this.curPos);
    const dir = this._dir.subVectors(this.curLook, this.curPos).normalize();
    const right = this._right.crossVectors(dir, THREE.Object3D.DEFAULT_UP).normalize();
    cam.position.addScaledVector(right, this.pointerSmooth.x * 0.25 * par);
    cam.position.y += this.pointerSmooth.y * 0.15 * par;
    this._v.copy(this.curLook).addScaledVector(right, this.pointerSmooth.x * 0.9 * par);
    this._v.y += this.pointerSmooth.y * 0.5 * par;
    cam.lookAt(this._v);
  }
}
