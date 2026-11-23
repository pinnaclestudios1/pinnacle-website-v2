import * as THREE from 'three';

export const FLOOR_GAP = 80;

/**
 * Base class for a gallery floor. Each floor:
 *  - builds its own Group of meshes/lights
 *  - defines a camera path as keyframes; keys with `stop` become exhibits
 *  - exposes interactive objects for hover / click
 */
export class Floor {
  constructor(app, def, index) {
    this.app = app;
    this.def = def;
    this.index = index;
    this.group = new THREE.Group();
    this.group.name = `floor-${def.id}`;
    this.group.position.y = index * FLOOR_GAP;
    this.group.visible = false;
    this.interactives = [];
    this.stops = [];
    this.mood = {};
    this.bounds = null;
    this.guide = true; // mascot follows the camera on this floor
  }

  get y() {
    return this.group.position.y;
  }

  /** keys: [{ pos:[x,y,z], look:[x,y,z], shift?, stop?: { id, label, html, align, mascot } }] */
  setPath(keys) {
    const y = this.y;
    const toV = (a) => new THREE.Vector3(a[0], a[1] + y, a[2]);
    this.keys = keys;
    this.posCurve = new THREE.CatmullRomCurve3(keys.map((k) => toV(k.pos)), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => toV(k.look)), false, 'centripetal');
    const n = keys.length - 1;
    this.stops = keys.map((k, i) => (k.stop ? { ...k.stop, p: i / n, key: i } : null)).filter(Boolean);
  }

  stopIndexById(id) {
    return this.stops.findIndex((s) => s.id === id);
  }

  pose(p, outPos, outLook) {
    this.posCurve.getPoint(p, outPos);
    this.lookCurve.getPoint(p, outLook);
    const n = this.keys.length - 1;
    const f = p * n;
    const i = Math.min(n - 1, Math.floor(f));
    const a = this.keys[i].shift ?? 0;
    const b = this.keys[i + 1]?.shift ?? a;
    const k = f - i;
    return a + (b - a) * (k * k * (3 - 2 * k));
  }

  /** Register a clickable / hoverable object. */
  interactive(object, { label, onClick, onHover, cursor = 'view' } = {}) {
    const entry = { object, label, onClick, onHover, cursor };
    object.traverse((o) => (o.userData.interactive = entry));
    this.interactives.push(entry);
    return entry;
  }

  /** Let the browser breathe between chunks of build work (keeps frames smooth). */
  pause() {
    return this.app._yield ? this.app._yield() : Promise.resolve();
  }

  async build() {}
  update() {}
  enter() {}
  leave() {}
}
