import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import gsap from 'gsap';
import fontJson from '../assets/fonts/fraunces-800.typeface.json';
import { damp } from './kit.js';

let _font;
export const displayFont = () => (_font ||= new Font(fontJson));

/** Bounding box of a THREE.Shape's outline. */
function shapeBounds(shape) {
  const pts = shape.getPoints(8);
  const b = new THREE.Box2();
  pts.forEach((p) => b.expandByPoint(p));
  return b;
}

/**
 * "Pinnacle / Studios" sculpted in extruded Fraunces. Each letter is its own
 * mesh so it can rise, sway and react to the cursor. The dots of the i's
 * are removed: the mascot sits where the dot of "Pinnacle" would be.
 */
export class HeroTitle {
  constructor({ lines, faceMat, sideMat }) {
    this.group = new THREE.Group();
    this.letters = [];
    this.dots = []; // { center, radius, bottom }
    this.hovered = null;
    const font = displayFont();
    const res = font.data.resolution;

    lines.forEach((line, li) => {
      const row = new THREE.Group();
      row.position.y = line.y;
      this.group.add(row);
      const size = line.size;
      const depth = size * 0.34;
      let x = 0;
      const rowLetters = [];
      for (const ch of line.text) {
        const glyph = font.data.glyphs[ch];
        const adv = ((glyph?.ha ?? 300) * size) / res;
        if (ch === ' ' || !glyph) {
          x += adv;
          continue;
        }
        let shapes = font.generateShapes(ch, size);
        let dot = null;
        if (ch === 'i' && shapes.length > 1) {
          // Highest shape = the dot. Remove it; remember where it was.
          const withB = shapes.map((s) => ({ s, b: shapeBounds(s) }));
          withB.sort((a, b) => b.b.min.y - a.b.min.y);
          dot = withB[0].b;
          shapes = withB.slice(1).map((o) => o.s);
        }
        const geo = new THREE.ExtrudeGeometry(shapes, {
          depth,
          curveSegments: 7,
          bevelEnabled: true,
          bevelThickness: size * 0.05,
          bevelSize: size * 0.028,
          bevelSegments: 3,
        });
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        const cx = (bb.min.x + bb.max.x) / 2;
        geo.translate(-cx, 0, -depth / 2);
        const mesh = new THREE.Mesh(geo, [faceMat, sideMat]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const pivot = new THREE.Group();
        pivot.position.set(x + cx, 0, 0);
        pivot.add(mesh);
        row.add(pivot);
        const letter = { ch, pivot, mesh, row: li, baseX: x + cx, lift: 0, tilt: 0, hover: 0, phase: Math.random() * Math.PI * 2, intro: 0 };
        mesh.userData.letter = letter;
        rowLetters.push(letter);
        this.letters.push(letter);
        if (dot) {
          letter.dot = {
            x: (dot.min.x + dot.max.x) / 2 - cx,
            y: dot.min.y,
            r: Math.max(dot.max.x - dot.min.x, dot.max.y - dot.min.y) / 2,
          };
        }
        x += adv;
      }
      // centre the row
      const width = x;
      rowLetters.forEach((l) => {
        l.baseX -= width / 2;
        l.pivot.position.x = l.baseX;
      });
      row.userData.width = width;
    });
  }

  /** Live world-space perch points (bottom of where each i-dot was). Updated every frame. */
  perchPoints() {
    this.group.updateMatrixWorld(true);
    return this.letters
      .filter((l) => l.dot)
      .map((l) => {
        l.perch = new THREE.Vector3();
        this._updatePerch(l);
        return { point: l.perch, r: l.dot.r };
      });
  }

  _updatePerch(l) {
    const p = l.pivot.position;
    l.perch.set(p.x + l.dot.x, Math.max(0, p.y) + l.dot.y - l.dot.r * 0.1, 0);
    l.pivot.parent.localToWorld(l.perch);
  }

  intro(delay = 0) {
    const tl = gsap.timeline({ delay });
    this.letters.forEach((l, i) => {
      l.intro = 0;
      tl.to(l, { intro: 1, duration: 1.4, ease: 'expo.out' }, i * 0.06 + l.row * 0.25);
    });
    return tl;
  }

  setIntroHidden() {
    this.letters.forEach((l) => (l.intro = 0));
  }

  update(dt, t, hoveredMesh, reduced) {
    const hov = hoveredMesh?.userData?.letter ?? null;
    for (const l of this.letters) {
      l.hover = damp(l.hover, l === hov ? 1 : 0, 8, dt);
      const sway = reduced ? 0 : Math.sin(t * 0.8 + l.phase) * 0.05;
      const k = l.intro;
      const rise = (1 - k) * -3.2;
      l.pivot.position.y = rise + sway + l.hover * 0.35;
      l.pivot.rotation.x = (1 - k) * 1.2 - l.hover * 0.25;
      l.pivot.rotation.y = Math.sin(t * 0.5 + l.phase) * 0.03 + l.hover * 0.3;
      l.pivot.rotation.z = (1 - k) * 0.2 * (l.row ? -1 : 1);
      l.mesh.visible = k > 0.001;
      if (l.perch) this._updatePerch(l);
    }
  }
}
