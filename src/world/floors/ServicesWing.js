import * as THREE from 'three';
import { Floor } from '../Floor.js';
import { room, spot, strip, pedestal, liftDoor, V, std, panel, dust, RovingSpots } from '../kit.js';
import { concreteTex, plasterTex, plaqueTex, textTex, SERIF, MONO } from '../textures.js';
import { SCULPTURES } from '../sculptures.js';
import { tplServicesIntro, tplService, tplServicesEnd } from '../../ui/templates.js';

/** Floor 1: a white-cube gallery, one sculpture per service. */
export class ServicesWing extends Floor {
  async build() {
    const g = this.group;
    const c = this.app.content;
    this.mood = { background: '#d9d4cc', fog: '#d9d4cc', fogNear: 22, fogFar: 70, exposure: 0.85, env: 0.5, bloom: 0.2, bloomThreshold: 1.3, bloomRadius: 0.4 };

    const n = c.services.length;
    const gap = 11;
    const W = 16;
    const H = 9;
    const z0 = 9;
    const D = z0 + 6 + (n - 1) * gap + 12;
    this.zEnd = z0 - D;

    const floorMat = std({ map: concreteTex(), roughness: 0.42, metalness: 0.02 });
    const wallTex = plasterTex();
    wallTex.repeat.set(D / 8, H / 8);
    const wallMat = std({ map: wallTex, roughness: 0.95 });
    const ceilMat = std({ color: '#e8e4de', roughness: 1 });
    g.add(room({ w: W, d: D, h: H, z0, floorMat, wallMat, ceilMat }));

    // Ceiling light troffers + skirting
    for (let z = z0 - 3; z > this.zEnd + 2; z -= 5.5) {
      const s = strip(1.2, 3.6, '#ffffff', 1.25);
      s.rotation.x = Math.PI / 2;
      s.position.set(0, H - 0.01, z);
      g.add(s);
    }
    const skirtMat = std({ color: '#2a2729', roughness: 0.6 });
    for (const sx of [-1, 1]) {
      const sk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, D), skirtMat);
      sk.position.set(sx * (W / 2 - 0.03), 0.09, z0 - D / 2);
      g.add(sk);
    }

    g.add(new THREE.HemisphereLight('#ffffff', '#8f887e', 1.0));
    const sun = new THREE.DirectionalLight('#fff6ea', 0.6);
    sun.position.set(4, 20, 10);
    g.add(sun);

    // Hanging sign at the entrance
    const sign = panel(
      9,
      1.7,
      textTex({
        w: 2048,
        h: 386,
        bg: '#141317',
        lines: [
          { text: 'FLOOR 1', font: MONO, size: 44, weight: 500, y: 110, color: '#ff6a3d', spacing: 10, align: 'center' },
          { text: 'The Services Wing', font: SERIF, size: 170, weight: 600, y: 300, color: '#f2f0e9', align: 'center' },
        ],
      }),
    );
    sign.position.set(0, 6.6, -7);
    g.add(sign);
    const sign2 = sign.clone();
    sign2.rotation.y = Math.PI;
    sign2.position.z = -7.02;
    g.add(sign2);
    for (const sx of [-1, 1]) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.9), skirtMat);
      wire.position.set(sx * 4, 8.1, -7);
      g.add(wire);
    }

    // Exhibits
    this.sculptures = [];
    const spotTargets = [];
    const keys = [{ pos: [0, 3.2, 7], look: [0, 3.0, -20], stop: { id: 'intro', label: 'Services', html: tplServicesIntro(c), align: 'left', mascot: c.floors[1].mascot } }];
    c.services.forEach((s, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const z = z0 - 15 - i * gap;
      const x = side * 4.6;
      const ped = pedestal({ h: 1.1 });
      ped.position.set(x, 0, z);
      g.add(ped);
      const camPos = V(-side * 1.4, 2.5, z + 4.8);
      const sc = SCULPTURES[s.art]();
      sc.object.position.set(x, 1.15 + 1.15, z);
      sc.object.rotation.y = Math.atan2(camPos.x - x, camPos.z - z);
      g.add(sc.object);
      this.sculptures.push(sc);

      // Wall plaque behind the exhibit
      const plaque = panel(3.4, 3.4, plaqueTex({ no: s.no, title: s.title.replace(/ (Design & Development|Development|Design|& Identity|Graphics|& AI|& Growth)$/, ''), sub: s.short }), { transparent: true });
      plaque.position.set(side * (W / 2 - 0.02), 4.7, z - 0.4);
      plaque.rotation.y = -side * Math.PI / 2;
      g.add(plaque);

      const from = V(x - side * 0.5, H - 0.1, z + 1.6);
      const to = V(x, 1.2, z);
      spot(g, { from, to, angle: 0.34, coneOpacity: 0.07, real: false });
      spotTargets.push({ from, to });

      this.interactive(ped, { label: s.title, onClick: () => this.app.goToStop(s.id) });
      this.interactive(sc.object, { label: s.title, onClick: () => this.app.goToStop(s.id) });

      keys.push({
        pos: camPos.toArray(),
        look: [x, 2.1, z],
        shift: side * 0.2,
        stop: { id: s.id, label: s.title, html: tplService(s), align: side > 0 ? 'left' : 'right', mascot: i === 0 ? 'Watch the cubes solve themselves.' : undefined },
      });
    });

    this.roving = new RovingSpots(g, spotTargets, { count: 2, intensity: 80, angle: 0.36, penumbra: 0.6 });

    // End wall: lift
    const lift = liftDoor();
    lift.position.set(0, 0, this.zEnd + 0.2);
    g.add(lift);
    this.lift = lift;
    this.interactive(lift, { label: 'Ride to Floor 2', onClick: () => this.app.goToFloor(2) });
    const endText = panel(
      8,
      1.6,
      textTex({ w: 2048, h: 410, lines: [{ text: 'Next floor: Case Study Hall', font: SERIF, size: 150, weight: 600, y: 230, color: '#1a181d', align: 'center' }, { text: 'KEEP SCROLLING TO RIDE UP', font: MONO, size: 44, weight: 500, y: 340, color: '#b5543a', spacing: 8, align: 'center' }] }),
      { transparent: true },
    );
    endText.position.set(0, 7.6, this.zEnd + 0.05);
    g.add(endText);
    keys.push({ pos: [0, 3.0, this.zEnd + 11], look: [0, 3.6, this.zEnd], shift: 0.15, stop: { id: 'next', label: 'Next floor', html: tplServicesEnd(c), align: 'left', mascot: 'Upstairs: the work itself.' } });
    this.setPath(keys);

    this.dust = dust({ count: 300, box: [14, 8, D], center: V(0, 4, z0 - D / 2), color: '#ffffff', opacity: 0.25 });
    g.add(this.dust);
    this.bounds = new THREE.Box3(V(-6.5, 1, this.zEnd + 1.5), V(6.5, 7, z0 - 0.5)).translate(V(0, this.y, 0));
  }

  update(dt, t) {
    this.dust.update(t);
    this.roving.update(dt, this.app.focus);
    // Only animate sculptures near the camera.
    const camZ = this.app.engine.camera.position.z;
    for (const s of this.sculptures) if (Math.abs(s.object.position.z - camZ) < 26) s.update(dt, t);
    this.lift.needle.rotation.z = -0.35 + Math.sin(t * 0.6) * 0.1;
  }
}
