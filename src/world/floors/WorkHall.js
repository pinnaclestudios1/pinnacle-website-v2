import * as THREE from 'three';
import { Floor } from '../Floor.js';
import { room, spot, strip, frame, liftDoor, V, std, panel, brassMat, contactShadow, dust, RovingSpots } from '../kit.js';
import { herringboneTex, plasterTex, caseArtTex, textTex, SERIF, MONO, SANS } from '../textures.js';
import { tplWorkIntro, tplCase, tplWorkEnd } from '../../ui/templates.js';

/** Floor 2: a salon-style hall of gilded frames, one per case study. */
export class WorkHall extends Floor {
  async build() {
    const g = this.group;
    const c = this.app.content;
    this.mood = { background: '#0e1512', fogNear: 26, fogFar: 75, exposure: 1.0, env: 0.3, bloom: 0.5, bloomThreshold: 0.9, bloomRadius: 0.5 };

    const n = c.caseStudies.length;
    const gap = 12;
    const W = 18;
    const H = 10;
    const z0 = 8;
    const D = z0 + 8 + (n - 1) * gap + 14;
    this.zEnd = z0 - D;

    const floorMat = std({ map: herringboneTex(), roughness: 0.38, metalness: 0.05 });
    const wallTex = plasterTex('#2b4a3f', 13);
    wallTex.repeat.set(D / 8, H / 8);
    const wallMat = std({ map: wallTex, roughness: 0.95 });
    const ceilMat = std({ color: '#121a17', roughness: 1 });
    g.add(room({ w: W, d: D, h: H, z0, floorMat, wallMat, ceilMat }));

    // Wainscot + picture rail
    const wains = std({ color: '#1c3029', roughness: 0.7 });
    const brass = brassMat();
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, D), wains);
      p.position.set(sx * (W / 2 - 0.04), 0.65, z0 - D / 2);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, D), brass);
      rail.position.set(sx * (W / 2 - 0.05), 1.32, z0 - D / 2);
      const rail2 = rail.clone();
      rail2.position.y = 7.4;
      g.add(p, rail, rail2);
    }
    // Skylight lanterns
    for (let z = z0 - 5; z > this.zEnd + 4; z -= 8) {
      const s = strip(4, 5, '#ffe7c4', 0.55);
      s.rotation.x = Math.PI / 2;
      s.position.set(0, H - 0.01, z);
      g.add(s);
    }

    g.add(new THREE.HemisphereLight('#ffe9cf', '#1b120b', 0.55));

    const sign = panel(
      8.5,
      1.6,
      textTex({ w: 2048, h: 386, bg: '#0f1613', lines: [{ text: 'FLOOR 2', font: MONO, size: 44, weight: 500, y: 110, color: '#d9b26a', spacing: 10, align: 'center' }, { text: 'The Case Study Hall', font: SERIF, size: 170, weight: 600, y: 300, color: '#f2f0e9', align: 'center' }] }),
    );
    sign.position.set(0, 6.8, -8);
    g.add(sign);
    const back = sign.clone();
    back.rotation.y = Math.PI;
    back.position.z = -8.02;
    g.add(back);

    this.frames = [];
    const spotTargets = [];
    const keys = [{ pos: [0, 3.3, 6], look: [0, 3.2, -24], stop: { id: 'intro', label: 'Selected work', html: tplWorkIntro(c), align: 'left', mascot: c.floors[2].mascot } }];
    for (const [i, cs] of c.caseStudies.entries()) {
      await this.pause();
      const side = i % 2 === 0 ? -1 : 1;
      const z = z0 - 16 - i * gap;
      const f = frame({ w: 4.6, h: 3.34, map: caseArtTex(cs, i), border: 0.34, thick: 0.26, frameMat: brass });
      f.position.set(side * (W / 2 - 0.12), 3.75, z);
      f.rotation.y = -side * Math.PI / 2;
      g.add(f);
      this.frames.push(f);

      // Picture light
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 16), brass);
      bar.rotation.set(Math.PI / 2, 0, 0);
      bar.position.set(side * (W / 2 - 0.55), 6.2, z);
      g.add(bar);
      const from = V(side * (W / 2 - 2.4), H - 0.2, z);
      const to = V(side * (W / 2), 3.75, z);
      spot(g, { from, to, angle: 0.48, coneOpacity: 0.06, pool: false, real: false });
      spotTargets.push({ from, to });

      // Wall label
      const label = panel(
        0.9,
        0.6,
        textTex({ w: 384, h: 256, bg: '#f2ebdf', lines: [{ text: cs.client, font: SERIF, size: 40, weight: 600, y: 74, color: '#1a181d' }, { text: `${cs.industry}, ${cs.year}`, font: SANS, size: 24, y: 120, color: '#5e5850' }, { text: cs.services.join(' · '), font: MONO, size: 15, y: 200, color: '#7a6f62' }], pad: 26 }),
      );
      label.position.set(side * (W / 2 - 0.03), 2.0, z + side * -3.4);
      label.rotation.y = -side * Math.PI / 2;
      g.add(label);

      // Bench facing the frame
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.8), std({ color: '#3a2a1d', roughness: 0.6 }));
      bench.position.set(side * -1.6, 0.42, z);
      bench.rotation.y = Math.PI / 2;
      bench.castShadow = true;
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.72), std({ color: '#6d2e24', roughness: 0.9 }));
      cushion.position.set(side * -1.6, 0.7, z);
      cushion.rotation.y = Math.PI / 2;
      const sh = contactShadow(3.2, 0.5);
      sh.position.set(side * -1.6, 0.012, z);
      g.add(bench, cushion, sh);

      this.interactive(f, { label: 'Open case study', onClick: () => this.app.openCase(cs.slug) });
      keys.push({
        pos: [-side * 1.2, 3.35, z],
        look: [side * (W / 2), 3.6, z],
        shift: side * 0.24,
        stop: { id: cs.slug, label: cs.client, html: tplCase(cs, i), align: side < 0 ? 'right' : 'left' },
      });
    }

    // End: the empty frame
    const emptyArt = textTex({ w: 1280, h: 930, bg: '#16201c', lines: [{ text: 'Your project', font: SERIF, size: 150, weight: 600, y: 470, color: '#f2f0e9', align: 'center' }, { text: 'COULD HANG HERE', font: MONO, size: 46, weight: 500, y: 560, color: '#d9b26a', spacing: 12, align: 'center' }] });
    const empty = frame({ w: 4.4, h: 3.2, map: emptyArt, frameMat: brass });
    empty.position.set(-4.4, 3.8, this.zEnd + 0.15);
    g.add(empty);
    this.interactive(empty, { label: 'Start a project', onClick: () => this.app.navigate('/contact') });
    const endFrom = V(-4.4, H - 0.2, this.zEnd + 3);
    const endTo = V(-4.4, 3.8, this.zEnd);
    spot(g, { from: endFrom, to: endTo, angle: 0.45, coneOpacity: 0.06, pool: false, real: false });
    spotTargets.push({ from: endFrom, to: endTo });
    this.roving = new RovingSpots(g, spotTargets, { count: 2, intensity: 80, angle: 0.48, penumbra: 0.7 });
    const lift = liftDoor();
    lift.position.set(4.6, 0, this.zEnd + 0.2);
    g.add(lift);
    this.lift = lift;
    this.interactive(lift, { label: 'Ride to Floor 3', onClick: () => this.app.goToFloor(3) });
    keys.push({ pos: [0, 3.3, this.zEnd + 11], look: [0, 3.6, this.zEnd], shift: 0, stop: { id: 'next', label: 'Next floor', html: tplWorkEnd(c), align: 'left', mascot: 'That empty frame? It’s for you.' } });
    this.setPath(keys);

    this.dust = dust({ count: 260, box: [16, 8, D], center: V(0, 4, z0 - D / 2), opacity: 0.35 });
    g.add(this.dust);
    this.bounds = new THREE.Box3(V(-7, 1, this.zEnd + 1.5), V(7, 7, z0 - 0.5)).translate(V(0, this.y, 0));
  }

  /** Camera pose for a close look at a case frame (used by the case-study viewer). */
  focusPose(slug, pos, look) {
    const i = this.app.content.caseStudies.findIndex((c) => c.slug === slug);
    const f = this.frames[i];
    if (!f) return false;
    f.getWorldPosition(look);
    const side = i % 2 === 0 ? -1 : 1;
    pos.copy(look).add(V(-side * 6.4, -0.1, 0));
    // Pan so the frame sits beside the case-study sheet (right) or above it (mobile).
    const pan = this.app.engine.aspect < 1 ? V(0, -1.6, 0) : V(0, 0, side * 2.0);
    pos.add(pan);
    look.add(pan);
    return true;
  }

  update(dt, t) {
    this.dust.update(t);
    this.roving.update(dt, this.app.focus);
    this.lift.needle.rotation.z = Math.sin(t * 0.6) * 0.1;
  }
}
